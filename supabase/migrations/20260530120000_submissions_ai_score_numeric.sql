-- AI assistant returns fractional scores (e.g. 6.5). Store as double precision, not integer.
ALTER TABLE public.submissions
  ALTER COLUMN ai_score TYPE double precision
  USING ai_score::double precision;
