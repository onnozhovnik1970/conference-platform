-- Plenary session start (datetime); replaces legacy column start_time if it exists.
ALTER TABLE public.conference_settings
  ADD COLUMN IF NOT EXISTS plenary_start_time timestamptz;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'conference_settings'
      AND column_name = 'start_time'
  ) THEN
    UPDATE public.conference_settings
    SET plenary_start_time = COALESCE(plenary_start_time, start_time)
    WHERE id = 1;

    ALTER TABLE public.conference_settings DROP COLUMN start_time;
  END IF;
END $$;

COMMENT ON COLUMN public.conference_settings.plenary_start_time IS 'Plenary session start instant (admin datetime-local; shown under Join Plenary on homepage).';
