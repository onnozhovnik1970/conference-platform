ALTER TABLE public.conference_settings
  ADD COLUMN IF NOT EXISTS hero_type text NOT NULL DEFAULT 'image';

ALTER TABLE public.conference_settings
  DROP CONSTRAINT IF EXISTS conference_settings_hero_type_check;

ALTER TABLE public.conference_settings
  ADD CONSTRAINT conference_settings_hero_type_check
  CHECK (hero_type IN ('image', 'particles'));

COMMENT ON COLUMN public.conference_settings.hero_type IS 'Home hero background mode: image (hero_image_url) or particles animation.';
