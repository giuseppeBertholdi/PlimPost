alter table public.onboarding_profiles
  add column if not exists primary_offer text,
  add column if not exists audience_pain_points text,
  add column if not exists content_topics text,
  add column if not exists preferred_cta text;

alter table public.onboarding_profiles
  alter column brand_color_primary drop not null,
  alter column brand_color_secondary drop not null,
  alter column brand_color_text drop not null;
