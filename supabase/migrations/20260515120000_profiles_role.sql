-- App role for dashboard / admin access (used with optional ALLOWED_ADMIN_EMAILS bootstrap in code).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin'));

COMMENT ON COLUMN public.profiles.role IS 'Access level: user (default) or admin (full admin panel).';

-- Optional: grant admin in SQL after deploy (replace email):
-- UPDATE public.profiles p
-- SET role = 'admin'
-- FROM auth.users u
-- WHERE u.id = p.id AND lower(u.email) = 'o.n.nozhovnik@gmail.com';
