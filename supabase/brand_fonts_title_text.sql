-- Fontes separadas em título e texto
alter table public.onboarding_profiles
  add column if not exists brand_font_title text;
alter table public.onboarding_profiles
  add column if not exists brand_font_text text;

-- Migrar brand_font antigo para título (quem já tinha)
update public.onboarding_profiles
set brand_font_title = coalesce(brand_font_title, brand_font),
    brand_font_text = coalesce(brand_font_text, brand_font)
where brand_font is not null;
