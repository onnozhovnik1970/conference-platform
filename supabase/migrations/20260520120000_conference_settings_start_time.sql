ALTER TABLE public.conference_settings
  ADD COLUMN IF NOT EXISTS start_time timestamptz;

COMMENT ON COLUMN public.conference_settings.start_time IS 'Plenary / main conference session start (shown under Join Plenary on homepage).';
