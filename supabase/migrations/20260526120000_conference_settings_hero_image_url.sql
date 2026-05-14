ALTER TABLE public.conference_settings
  ADD COLUMN IF NOT EXISTS hero_image_url text;

COMMENT ON COLUMN public.conference_settings.hero_image_url IS 'Full URL for home hero background image; empty uses gradient fallback.';
