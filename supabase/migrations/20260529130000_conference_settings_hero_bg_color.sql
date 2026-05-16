ALTER TABLE public.conference_settings
  ADD COLUMN IF NOT EXISTS hero_bg_color text;

COMMENT ON COLUMN public.conference_settings.hero_bg_color IS 'Particles hero background color as hex (e.g. #3aacaa).';
