-- 0014_evidence_photos_bucket.sql
-- Fase 6: storage bucket for before/after condition photos
-- (public.photo_evidence already exists with working RLS in the base
-- schema — this was the "create the bucket" step the schema file
-- flagged as pending).
--
-- Private bucket (unlike item-photos): only the reservation's renter
-- and owner should ever see condition evidence, so this is public=false
-- and read through a signed URL, not getPublicUrl.
--
-- Path convention: {reservation_id}/{stage}-{timestamp}.{ext} —
-- policies below authorize by resolving the reservation from the first
-- path segment, same pattern as {auth.uid()}/... on item-photos.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidence-photos',
  'evidence-photos',
  false,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "evidence_photos_bucket_insert_involved"
  on storage.objects for insert
  with check (
    bucket_id = 'evidence-photos'
    and exists (
      select 1 from public.reservations r
      join public.items i on i.id = r.item_id
      where r.id = (storage.foldername(name))[1]::uuid
        and (r.renter_id = auth.uid() or i.owner_id = auth.uid())
    )
  );

create policy "evidence_photos_bucket_select_involved"
  on storage.objects for select
  using (
    bucket_id = 'evidence-photos'
    and exists (
      select 1 from public.reservations r
      join public.items i on i.id = r.item_id
      where r.id = (storage.foldername(name))[1]::uuid
        and (r.renter_id = auth.uid() or i.owner_id = auth.uid())
    )
  );

-- No update/delete policies on purpose — condition evidence should be
-- immutable once uploaded (integrity for damage disputes).
