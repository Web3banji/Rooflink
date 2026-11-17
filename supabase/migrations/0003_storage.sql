-- Storage bucket and policies for property images
-- Run via Supabase SQL editor or migration tooling

insert into storage.buckets (id, name, public)
values ('property-images', 'property-images', true)
on conflict (id) do nothing;

-- Storage policies (on storage.objects)
-- Public read for files under approved properties is handled by public bucket + app-level path discipline;
-- for tighter control use private bucket + signed URLs (recommended in production).
create policy "property_images_storage_read" on storage.objects
  for select using (bucket_id = 'property-images');

create policy "property_images_storage_insert_owner" on storage.objects
  for insert with check (
    bucket_id = 'property-images'
    and auth.role() = 'authenticated'
  );

create policy "property_images_storage_delete_owner" on storage.objects
  for delete using (
    bucket_id = 'property-images'
    and auth.role() = 'authenticated'
  );
