-- Optional columns for organizer review (used by admin API). Safe if already present.
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS reviewer_comment TEXT,
  ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP WITH TIME ZONE;
