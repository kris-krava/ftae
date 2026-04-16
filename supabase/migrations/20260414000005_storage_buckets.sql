-- Create storage buckets (idempotent)
insert into storage.buckets (id, name, public)
values
  ('avatars',        'avatars',        true),
  ('artwork-photos', 'artwork-photos', true)
on conflict (id) do nothing;

-- Storage RLS: anyone can read public buckets
create policy "avatars: public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars: owner upload"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatars: owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "artwork-photos: public read"
  on storage.objects for select
  using (bucket_id = 'artwork-photos');

create policy "artwork-photos: owner upload"
  on storage.objects for insert
  with check (
    bucket_id = 'artwork-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "artwork-photos: owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'artwork-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
