-- Adicionar campo para fonte da marca
alter table public.onboarding_profiles
  add column if not exists brand_font text;
