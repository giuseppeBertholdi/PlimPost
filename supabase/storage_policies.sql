drop policy if exists "Users can upload their own brand assets" on storage.objects;
drop policy if exists "Users can update their own brand assets" on storage.objects;
drop policy if exists "Users can read their own brand assets" on storage.objects;

create policy "Users can upload their own brand assets"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'brand-assets' and
    (auth.uid()::text = split_part(name, '/', 1) or auth.uid() = owner)
  );

create policy "Users can update their own brand assets"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'brand-assets' and
    (auth.uid()::text = split_part(name, '/', 1) or auth.uid() = owner)
  );

create policy "Users can read their own brand assets"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'brand-assets' and
    (auth.uid()::text = split_part(name, '/', 1) or auth.uid() = owner)
  );

-- Políticas para bucket 'logos'
drop policy if exists "Users can upload their own logos" on storage.objects;
drop policy if exists "Users can update their own logos" on storage.objects;
drop policy if exists "Users can read their own logos" on storage.objects;

create policy "Users can upload their own logos"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'logos' and
    (auth.uid()::text = split_part(name, '/', 1) or auth.uid() = owner)
  );

create policy "Users can update their own logos"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'logos' and
    (auth.uid()::text = split_part(name, '/', 1) or auth.uid() = owner)
  );

create policy "Users can read their own logos"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'logos' and
    (auth.uid()::text = split_part(name, '/', 1) or auth.uid() = owner)
  );

-- Políticas para bucket 'posts'
drop policy if exists "Users can upload their own posts" on storage.objects;
drop policy if exists "Users can update their own posts" on storage.objects;
drop policy if exists "Users can read their own posts" on storage.objects;
drop policy if exists "Users can delete their own posts" on storage.objects;

create policy "Users can upload their own posts"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'posts' and
    (auth.uid()::text = split_part(name, '/', 1) or auth.uid() = owner)
  );

create policy "Users can update their own posts"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'posts' and
    (auth.uid()::text = split_part(name, '/', 1) or auth.uid() = owner)
  );

create policy "Users can read their own posts"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'posts' and
    (auth.uid()::text = split_part(name, '/', 1) or auth.uid() = owner)
  );

create policy "Users can delete their own posts"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'posts' and
    (auth.uid()::text = split_part(name, '/', 1) or auth.uid() = owner)
  );
