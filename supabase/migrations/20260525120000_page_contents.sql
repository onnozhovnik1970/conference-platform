CREATE TABLE IF NOT EXISTS public.page_contents (
  id text PRIMARY KEY,
  title_ua text,
  title_en text,
  content_ua text,
  content_en text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.page_contents IS 'Localized static page copy edited in admin (id = URL slug).';

CREATE OR REPLACE FUNCTION public.set_page_contents_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS page_contents_set_updated_at ON public.page_contents;
CREATE TRIGGER page_contents_set_updated_at
  BEFORE UPDATE ON public.page_contents
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_page_contents_updated_at();

GRANT SELECT, INSERT, UPDATE ON public.page_contents TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.page_contents TO service_role;

ALTER TABLE public.page_contents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS page_contents_select_authenticated ON public.page_contents;
CREATE POLICY page_contents_select_authenticated
  ON public.page_contents
  FOR SELECT
  TO authenticated
  USING (true);

-- Writes use the service role from Next.js admin API (browser clients do not insert/update).

INSERT INTO public.page_contents (id) VALUES
  ('for-authors'),
  ('conference-program'),
  ('academic-integrity-policy'),
  ('ai-use-policy'),
  ('privacy-policy'),
  ('terms-of-use'),
  ('contact')
ON CONFLICT (id) DO NOTHING;
