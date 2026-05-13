ALTER TABLE public.conference_sections
  ADD COLUMN IF NOT EXISTS zoom_link text,
  ADD COLUMN IF NOT EXISTS zoom_meeting_id text,
  ADD COLUMN IF NOT EXISTS zoom_password text,
  ADD COLUMN IF NOT EXISTS start_time timestamptz;

COMMENT ON COLUMN public.conference_sections.zoom_link IS 'Public Zoom join URL for this section.';
COMMENT ON COLUMN public.conference_sections.zoom_meeting_id IS 'Zoom meeting ID (admin reference; may be shown on site later).';
COMMENT ON COLUMN public.conference_sections.zoom_password IS 'Meeting passcode (admin reference).';
COMMENT ON COLUMN public.conference_sections.start_time IS 'Scheduled start for this section room.';
