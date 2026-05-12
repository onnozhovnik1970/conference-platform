ALTER TABLE public.conference_settings
  ADD COLUMN IF NOT EXISTS zoom_link text,
  ADD COLUMN IF NOT EXISTS zoom_details text;

COMMENT ON COLUMN public.conference_settings.zoom_link IS 'Public Zoom join URL.';
COMMENT ON COLUMN public.conference_settings.zoom_details IS 'Meeting ID, passcode, and other Zoom join instructions.';

UPDATE public.conference_settings
SET
  zoom_details = '341 095 4568' || E'\n' || '166231'
WHERE id = 1
  AND zoom_details IS NULL;
