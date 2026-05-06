CREATE TABLE abstracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  abstract_title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  abstract_text TEXT NOT NULL,
  ai_review TEXT NOT NULL,
  ai_score TEXT NOT NULL CHECK (ai_score IN ('accepted', 'needs_revision', 'rejected')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'accepted', 'rejected'))
);
