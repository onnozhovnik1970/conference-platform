-- Language of the submitted abstract (dashboard values: english, german, polish, czech, …)
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS abstract_language TEXT;

COMMENT ON COLUMN public.submissions.abstract_language IS 'Abstract language selected at submission (e.g. english, german); used for certificate chrome.';
