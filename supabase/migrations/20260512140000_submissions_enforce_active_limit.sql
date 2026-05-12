-- Enforce: a user may INSERT a new submission only if they have no prior rows,
-- or their latest row (by created_at desc, id desc) has status needs_revision or rejected.
-- Matches dashboard logic. SECURITY DEFINER so the check works under RLS.

CREATE OR REPLACE FUNCTION public.enforce_submission_insert_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  latest_status text;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT s.status
  INTO latest_status
  FROM public.submissions AS s
  WHERE s.user_id = NEW.user_id
  ORDER BY s.created_at DESC NULLS LAST, s.id DESC
  LIMIT 1;

  IF latest_status IS NULL THEN
    RETURN NEW;
  END IF;

  IF latest_status IN ('needs_revision', 'rejected') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION
    USING MESSAGE = 'A new submission is not allowed until the latest submission is reviewed (status must be needs_revision or rejected).',
    ERRCODE = '23514';
END;
$$;

DROP TRIGGER IF EXISTS submissions_enforce_active_limit_before_insert ON public.submissions;

CREATE TRIGGER submissions_enforce_active_limit_before_insert
  BEFORE INSERT ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_submission_insert_limit();

COMMENT ON FUNCTION public.enforce_submission_insert_limit() IS
  'Blocks INSERT when the inserting user already has a latest submission whose status is not needs_revision or rejected.';
