ALTER TABLE public.conference_settings
  ADD COLUMN IF NOT EXISTS hero_subtitle text;

ALTER TABLE public.conference_settings
  ADD COLUMN IF NOT EXISTS hero_subtitle_ua text;

COMMENT ON COLUMN public.conference_settings.hero_subtitle IS 'Secondary line under hero H1 (English); optional.';
COMMENT ON COLUMN public.conference_settings.hero_subtitle_ua IS 'Secondary line under hero H1 (Ukrainian); optional.';
