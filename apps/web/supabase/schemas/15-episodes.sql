-- Episodes system database schema
-- Real-time AI-driven podcast episode creation with choose-your-own-adventure gameplay

-- Episodes table - stores main episode data
CREATE TABLE IF NOT EXISTS episodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  title text NOT NULL,
  premise text NOT NULL,
  state_card jsonb NOT NULL DEFAULT '{
    "storySoFar": "",
    "keyFacts": [],
    "themes": [],
    "anchors": []
  }'::jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at timestamp with time zone,
  total_scenes integer DEFAULT 0,
  total_choices integer DEFAULT 0
);

-- Episode scenes table - tracks story progression scene by scene
CREATE TABLE IF NOT EXISTS episode_scenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id uuid NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  scene_number integer NOT NULL,
  narration text NOT NULL,
  choice_a text NOT NULL,
  choice_b text NOT NULL,
  chosen_option text CHECK (chosen_option IN ('A', 'B')),
  state_update jsonb DEFAULT '{}'::jsonb,
  audio_cues jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(episode_id, scene_number)
);

-- Episode audio table - ElevenLabs integration for music and SFX
CREATE TABLE IF NOT EXISTS episode_audio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id uuid NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  scene_id uuid REFERENCES episode_scenes(id) ON DELETE CASCADE,
  audio_type text NOT NULL CHECK (audio_type IN ('music', 'sfx')),
  trigger_text text,
  audio_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'ready', 'failed')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS episodes_account_id_idx ON episodes(account_id);
CREATE INDEX IF NOT EXISTS episodes_created_by_idx ON episodes(created_by);
CREATE INDEX IF NOT EXISTS episodes_status_idx ON episodes(status);
CREATE INDEX IF NOT EXISTS episode_scenes_episode_id_idx ON episode_scenes(episode_id);
CREATE INDEX IF NOT EXISTS episode_scenes_scene_number_idx ON episode_scenes(episode_id, scene_number);
CREATE INDEX IF NOT EXISTS episode_audio_episode_id_idx ON episode_audio(episode_id);
CREATE INDEX IF NOT EXISTS episode_audio_scene_id_idx ON episode_audio(scene_id);
CREATE INDEX IF NOT EXISTS episode_audio_status_idx ON episode_audio(status);

-- Row Level Security (RLS) policies
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE episode_scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE episode_audio ENABLE ROW LEVEL SECURITY;

-- Episodes policies - users can only access episodes from their accounts
CREATE POLICY "Users can view episodes from their accounts" ON episodes
  FOR SELECT USING (
    account_id IN (
      SELECT account_id FROM accounts_memberships 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create episodes in their accounts" ON episodes
  FOR INSERT WITH CHECK (
    account_id IN (
      SELECT account_id FROM accounts_memberships 
      WHERE user_id = auth.uid()
    ) AND created_by = auth.uid()
  );

CREATE POLICY "Users can update episodes they created" ON episodes
  FOR UPDATE USING (created_by = auth.uid());

-- Episode scenes policies
CREATE POLICY "Users can view scenes from their episodes" ON episode_scenes
  FOR SELECT USING (
    episode_id IN (
      SELECT id FROM episodes WHERE account_id IN (
        SELECT account_id FROM accounts_memberships 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create scenes in their episodes" ON episode_scenes
  FOR INSERT WITH CHECK (
    episode_id IN (
      SELECT id FROM episodes WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update scenes in their episodes" ON episode_scenes
  FOR UPDATE USING (
    episode_id IN (
      SELECT id FROM episodes WHERE created_by = auth.uid()
    )
  );

-- Episode audio policies
CREATE POLICY "Users can view audio from their episodes" ON episode_audio
  FOR SELECT USING (
    episode_id IN (
      SELECT id FROM episodes WHERE account_id IN (
        SELECT account_id FROM accounts_memberships 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create audio for their episodes" ON episode_audio
  FOR INSERT WITH CHECK (
    episode_id IN (
      SELECT id FROM episodes WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update audio in their episodes" ON episode_audio
  FOR UPDATE USING (
    episode_id IN (
      SELECT id FROM episodes WHERE created_by = auth.uid()
    )
  );