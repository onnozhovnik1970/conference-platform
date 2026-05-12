-- Thematic sections (panels): managed in admin, labels EN + UA; optional slug for legacy thematic_panel values (panel1..panel6).
CREATE TABLE IF NOT EXISTS public.conference_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sort_order integer NOT NULL DEFAULT 0,
  slug text UNIQUE,
  label_en text NOT NULL,
  label_ua text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS conference_sections_sort_order_idx ON public.conference_sections (sort_order);

COMMENT ON TABLE public.conference_sections IS 'Conference thematic sections; public read; admin writes via service role.';

ALTER TABLE public.conference_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS conference_sections_select_public ON public.conference_sections;
CREATE POLICY conference_sections_select_public
  ON public.conference_sections
  FOR SELECT
  TO anon, authenticated
  USING (true);

ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS section_id uuid REFERENCES public.conference_sections (id) ON DELETE RESTRICT;

COMMENT ON COLUMN public.submissions.section_id IS 'FK to conference_sections; thematic_panel may duplicate label_en for legacy exports.';

-- Seed default six panels (slugs match prior dashboard values panel1..panel6)
INSERT INTO public.conference_sections (sort_order, slug, label_en, label_ua)
VALUES
  (1, 'panel1', 'Economics, Finance and Audit', 'Економіка, фінанси та аудит'),
  (2, 'panel2', 'Information Technologies', 'Інформаційні технології'),
  (3, 'panel3', 'Philological Sciences', 'Філологічні науки'),
  (4, 'panel4', 'International Trade and Law', 'Міжнародна торгівля і право'),
  (5, 'panel5', 'Management, Marketing and Advertising', 'Менеджмент, маркетинг і реклама'),
  (6, 'panel6', 'Psychology', 'Психологія')
ON CONFLICT (slug) DO NOTHING;

-- Backfill section_id from legacy thematic_panel slug
UPDATE public.submissions AS s
SET section_id = cs.id
FROM public.conference_sections AS cs
WHERE s.section_id IS NULL
  AND s.thematic_panel IS NOT NULL
  AND trim(s.thematic_panel) = cs.slug;
