create table if not exists public.onboarding_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  business_name text not null,
  business_description text not null,
  business_differential text not null,
  logo_url text,
  brand_color_primary text not null,
  brand_color_secondary text not null,
  brand_color_text text not null,
  tone_tags text[] not null,
  target_audience text not null,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_onboarding_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_onboarding_updated_at on public.onboarding_profiles;
create trigger set_onboarding_updated_at
before update on public.onboarding_profiles
for each row execute function public.set_onboarding_updated_at();

alter table public.onboarding_profiles enable row level security;

create policy "Users can read their onboarding profile"
  on public.onboarding_profiles
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their onboarding profile"
  on public.onboarding_profiles
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their onboarding profile"
  on public.onboarding_profiles
  for update
  using (auth.uid() = user_id);
