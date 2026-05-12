-- Singleton conference metadata (id must be 1). Column "date" is quoted because date is a reserved word.
CREATE TABLE IF NOT EXISTS public.conference_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  title text NOT NULL DEFAULT '',
  "date" date,
  deadline date,
  location text,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.conference_settings IS 'Single-row site-wide conference info (id = 1).';
COMMENT ON COLUMN public.conference_settings."date" IS 'Conference day.';
COMMENT ON COLUMN public.conference_settings.deadline IS 'Registration / submission deadline.';

CREATE OR REPLACE FUNCTION public.set_conference_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS conference_settings_set_updated_at ON public.conference_settings;
CREATE TRIGGER conference_settings_set_updated_at
  BEFORE UPDATE ON public.conference_settings
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_conference_settings_updated_at();

ALTER TABLE public.conference_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS conference_settings_select_public ON public.conference_settings;
CREATE POLICY conference_settings_select_public
  ON public.conference_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Writes go through service role (Next.js admin API), not the browser client.

INSERT INTO public.conference_settings (id, title, "date", deadline, location, description)
VALUES (
  1,
  'IX All-Ukrainian Student Scientific-Practical Conference in Foreign Languages "SCIENCE OF THE 21st CENTURY: CHALLENGES OF TODAY"',
  '2026-05-14',
  '2026-04-26',
  'Online via Zoom',
  'Discussion of student research on modern science trends and improving foreign language skills. Organizer: Department of Modern European Languages, State University of Trade and Economics (SUTE).'
)
ON CONFLICT (id) DO NOTHING;

-- Admin "Archive" view: optional timestamp when moved to archive
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

COMMENT ON COLUMN public.submissions.archived_at IS 'When set, submission appears in Admin Archive and is hidden from active pipeline tabs.';
