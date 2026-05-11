-- Align legacy values with the new workflow before replacing the CHECK constraint.
UPDATE abstracts
SET status = 'under_review'
WHERE status = 'submitted';

ALTER TABLE abstracts DROP CONSTRAINT IF EXISTS abstracts_status_check;

ALTER TABLE abstracts
  ADD COLUMN reviewer_comment TEXT,
  ADD COLUMN status_updated_at TIMESTAMP WITH TIME ZONE;

UPDATE abstracts
SET status_updated_at = created_at
WHERE status_updated_at IS NULL;

ALTER TABLE abstracts
  ADD CONSTRAINT abstracts_status_check CHECK (
    status IN (
      'pending',
      'under_review',
      'accepted',
      'rejected',
      'needs_revision'
    )
  );
