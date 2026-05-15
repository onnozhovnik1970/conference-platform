ALTER TABLE public.conference_settings
  ADD COLUMN IF NOT EXISTS certificate_template_url text;

COMMENT ON COLUMN public.conference_settings.certificate_template_url IS 'PNG/SVG path or URL for certificate PDF background; empty uses bundled template.';
