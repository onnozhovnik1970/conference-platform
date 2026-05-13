ALTER TABLE public.conference_settings
  ADD COLUMN IF NOT EXISTS description_ua text;

COMMENT ON COLUMN public.conference_settings.description IS 'About text shown on the public homepage (English).';
COMMENT ON COLUMN public.conference_settings.description_ua IS 'About text shown on the public homepage (Ukrainian).';
