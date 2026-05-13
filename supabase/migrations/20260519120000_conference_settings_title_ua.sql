ALTER TABLE public.conference_settings
  ADD COLUMN IF NOT EXISTS title_ua text;

COMMENT ON COLUMN public.conference_settings.title IS 'Conference title shown on the public site (English).';
COMMENT ON COLUMN public.conference_settings.title_ua IS 'Conference title shown on the public site (Ukrainian).';
