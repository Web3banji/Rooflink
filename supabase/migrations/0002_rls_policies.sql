-- RLS policies for RoofLink

alter table public.universities enable row level security;
alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.property_images enable row level security;
alter table public.saved_properties enable row level security;
alter table public.enquiries enable row level security;
alter table public.reports enable row level security;
alter table public.admin_audit_records enable row level security;

-- Helper: is admin
create or replace function public.is_admin(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p where p.id = uid and p.role = 'admin' and p.is_active
  );
$$;

-- Universities: readable by anyone (active), writable by admin
create policy "universities_select_active" on public.universities
  for select using (is_active = true or public.is_admin(auth.uid()));
create policy "universities_admin_write" on public.universities
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Profiles
create policy "profiles_select_self_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin(auth.uid()));
create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));
create policy "profiles_insert_self" on public.profiles
  for insert with check (id = auth.uid());

-- Properties
-- Public can read approved
create policy "properties_select_approved_public" on public.properties
  for select using (status = 'approved');
-- Owners can read own
create policy "properties_select_owner" on public.properties
  for select using (owner_profile_id = auth.uid());
-- Admin can read all
create policy "properties_select_admin" on public.properties
  for select using (public.is_admin(auth.uid()));

-- Owner insert (agent/landlord) as draft
create policy "properties_insert_owner" on public.properties
  for insert with check (
    owner_profile_id = auth.uid()
    and lister_role in ('agent','landlord')
    and status = 'draft'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('agent','landlord') and p.is_active)
  );

-- Owner update: cannot approve/reject/review fields; can set draft/pending_review/archived
create policy "properties_update_owner" on public.properties
  for update using (owner_profile_id = auth.uid())
  with check (
    owner_profile_id = auth.uid()
    and status in ('draft','pending_review','archived','rejected')
    and reviewed_by is null
    and reviewed_at is null
  );

-- Admin can update for review (approve/reject) - enforced in app + audited; policy allows admin
create policy "properties_update_admin" on public.properties
  for update using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "properties_delete_owner_draft" on public.properties
  for delete using (owner_profile_id = auth.uid() and status = 'draft');

-- Property images
create policy "property_images_select_public_approved" on public.property_images
  for select using (
    exists (select 1 from public.properties pr where pr.id = property_id and pr.status = 'approved')
  );
create policy "property_images_select_owner" on public.property_images
  for select using (
    exists (select 1 from public.properties pr where pr.id = property_id and pr.owner_profile_id = auth.uid())
  );
create policy "property_images_select_admin" on public.property_images
  for select using (public.is_admin(auth.uid()));

create policy "property_images_insert_owner" on public.property_images
  for insert with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.properties pr
      where pr.id = property_id and pr.owner_profile_id = auth.uid() and pr.status in ('draft','pending_review','rejected')
    )
  );
create policy "property_images_delete_owner" on public.property_images
  for delete using (
    exists (select 1 from public.properties pr where pr.id = property_id and pr.owner_profile_id = auth.uid())
  );

-- Saved properties (student only, own)
create policy "saved_select_own" on public.saved_properties
  for select using (student_profile_id = auth.uid() or public.is_admin(auth.uid()));
create policy "saved_insert_student" on public.saved_properties
  for insert with check (
    student_profile_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'student')
  );
create policy "saved_delete_own" on public.saved_properties
  for delete using (student_profile_id = auth.uid());

-- Enquiries
create policy "enquiries_select_parties" on public.enquiries
  for select using (
    sender_profile_id = auth.uid() or recipient_profile_id = auth.uid() or public.is_admin(auth.uid())
  );
create policy "enquiries_insert_student" on public.enquiries
  for insert with check (
    sender_profile_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'student' and p.is_active)
  );
create policy "enquiries_update_recipient" on public.enquiries
  for update using (recipient_profile_id = auth.uid() or public.is_admin(auth.uid()))
  with check (recipient_profile_id = auth.uid() or public.is_admin(auth.uid()));

-- Reports
create policy "reports_insert_auth" on public.reports
  for insert with check (reporter_profile_id = auth.uid());
create policy "reports_select_own_or_admin" on public.reports
  for select using (reporter_profile_id = auth.uid() or public.is_admin(auth.uid()));
create policy "reports_update_admin" on public.reports
  for update using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Audit: admin insert/select only, no update/delete
create policy "audit_insert_admin" on public.admin_audit_records
  for insert with check (public.is_admin(auth.uid()) and actor_profile_id = auth.uid());
create policy "audit_select_admin" on public.admin_audit_records
  for select using (public.is_admin(auth.uid()));
