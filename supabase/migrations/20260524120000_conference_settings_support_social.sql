ALTER TABLE public.conference_settings
  ADD COLUMN IF NOT EXISTS support_phone TEXT,
  ADD COLUMN IF NOT EXISTS support_email TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS telegram_url TEXT;

COMMENT ON COLUMN public.conference_settings.support_phone IS 'Public support phone (display; used for tel: links).';
COMMENT ON COLUMN public.conference_settings.support_email IS 'Public support email (mailto).';
COMMENT ON COLUMN public.conference_settings.facebook_url IS 'Facebook page URL (footer icon).';
COMMENT ON COLUMN public.conference_settings.instagram_url IS 'Instagram profile URL (footer icon).';
COMMENT ON COLUMN public.conference_settings.telegram_url IS 'Telegram channel or contact URL (footer icon).';
