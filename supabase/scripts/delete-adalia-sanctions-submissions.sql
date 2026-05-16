-- Remove blocked test submissions (Adalia / Sanctions).
-- Run in Supabase SQL Editor. `submissions` has abstract_title, not title; author is on profiles.

DELETE FROM public.submissions AS s
WHERE s.abstract_title ILIKE '%Sanctions%'
   OR EXISTS (
     SELECT 1
     FROM public.profiles AS p
     WHERE p.id = s.user_id
       AND (
         p.first_name ILIKE '%Adalia%'
         OR p.last_name ILIKE '%Adalia%'
         OR p.middle_name ILIKE '%Adalia%'
       )
   );
