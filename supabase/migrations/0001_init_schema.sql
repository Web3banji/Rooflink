-- RoofLink initial schema
-- Assumes Supabase (auth.users exists)

create extension if not exists "pgcrypto";

-- Enums
do $$ begin
  create type user_role as enum ('student', 'agent', 'landlord', 'admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create type listing_status as enum ('draft', 'pending_review', 'approved', 'rejected', 'archived');
exception when duplicate_object then null; end $$;
do $$ begin
  create type enquiry_status as enum ('open', 'responded', 'closed');
exception when duplicate_object then null; end $$;
do $$ begin
  create type report_status as enum ('open', 'in_review', 'resolved', 'dismissed');
exception when duplicate_object then null; end $$;

-- updated_at trigger helper
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Universities
create table if not exists public.universities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  city text,
  region text,
  country text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger universities_updated_at before update on public.universities
  for each row execute function public.set_updated_at();

-- Profiles (1:1 auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'student',
  full_name text,
  phone text,
  avatar_url text,
  university_id uuid references public.universities(id),
  is_active boolean not null default true,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (role in ('student','agent','landlord','admin'))
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create profile on signup (default student; admin must be provisioned separately)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'student'),
    new.raw_user_meta_data->>'full_name'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Properties
create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles(id) on delete cascade,
  lister_role user_role not null check (lister_role in ('agent','landlord')),
  university_id uuid not null references public.universities(id),
  title text not null,
  description text not null,
  property_type text not null,
  address_text text not null,
  price_amount numeric(12,2) not null check (price_amount >= 0),
  price_period text not null default 'yearly',
  currency text not null default 'NGN',
  bedrooms int,
  bathrooms int,
  amenities text[] not null default '{}',
  availability_status text not null default 'available',
  status listing_status not null default 'draft',
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists properties_university_status_idx on public.properties (university_id, status);
create index if not exists properties_owner_idx on public.properties (owner_profile_id);
create trigger properties_updated_at before update on public.properties
  for each row execute function public.set_updated_at();

-- Property images
create table if not exists public.property_images (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  storage_path text not null,
  sort_order int not null default 0,
  is_cover boolean not null default false,
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists property_images_property_idx on public.property_images (property_id);

-- Saved properties
create table if not exists public.saved_properties (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (student_profile_id, property_id)
);

-- Enquiries
create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  sender_profile_id uuid not null references public.profiles(id) on delete cascade,
  recipient_profile_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  status enquiry_status not null default 'open',
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists enquiries_property_idx on public.enquiries (property_id);
create index if not exists enquiries_sender_idx on public.enquiries (sender_profile_id);
create index if not exists enquiries_recipient_idx on public.enquiries (recipient_profile_id);
create trigger enquiries_updated_at before update on public.enquiries
  for each row execute function public.set_updated_at();

-- Reports
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_profile_id uuid references public.profiles(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  target_profile_id uuid references public.profiles(id) on delete set null,
  reason text not null,
  details text,
  status report_status not null default 'open',
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reports_target_check check (property_id is not null or target_profile_id is not null)
);
create trigger reports_updated_at before update on public.reports
  for each row execute function public.set_updated_at();

-- Admin audit records (append-only via RLS)
create table if not exists public.admin_audit_records (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid not null references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_actor_idx on public.admin_audit_records (actor_profile_id);
create index if not exists audit_entity_idx on public.admin_audit_records (entity_type, entity_id);
