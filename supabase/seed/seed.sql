-- Optional dev-only seed (do NOT run in production)
-- Creates a default university for initial single-university release.
-- Replace values as needed for your target university.

insert into public.universities (name, slug, city, region, country, is_active)
values ('Default University', 'default-university', 'City', 'State', 'Country', true)
on conflict (slug) do nothing;

-- To bootstrap first admin securely:
-- 1) Create a user via Supabase Auth (dashboard or API)
-- 2) Run: update public.profiles set role = 'admin' where id = '<user-uuid>';
-- This must be done with service/admin privileges, never via public client.
