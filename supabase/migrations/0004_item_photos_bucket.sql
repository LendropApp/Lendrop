-- item_photos_bucket.sql
-- Storage bucket for item listing photos (Fase 1, PLAN_MVP_70.md).
-- Public read (item photos are shown on public listings), owner-only write.
-- Path convention: {auth.uid()}/{filename} — enforced by the policies below.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'item-photos',
  'item-photos',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "item_photos_bucket_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'item-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "item_photos_bucket_update_own"
  on storage.objects for update
  using (
    bucket_id = 'item-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "item_photos_bucket_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'item-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "item_photos_bucket_select_all"
  on storage.objects for select
  using (bucket_id = 'item-photos');
