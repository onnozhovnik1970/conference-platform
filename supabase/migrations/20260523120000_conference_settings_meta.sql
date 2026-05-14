ALTER TABLE public.conference_settings
  ADD COLUMN IF NOT EXISTS meta_title TEXT,
  ADD COLUMN IF NOT EXISTS meta_description TEXT;

COMMENT ON COLUMN public.conference_settings.meta_title IS 'HTML document title (<title>); falls back to site default when empty.';
COMMENT ON COLUMN public.conference_settings.meta_description IS 'Meta description for SEO; falls back to site default when empty.';
