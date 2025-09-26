-- Episode Audio Storage Schema
-- Supabase Storage buckets and RLS policies for ElevenLabs-generated audio files

-- Create storage bucket for episode audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('episode-audio', 'episode-audio', false)
ON CONFLICT (id) DO NOTHING;

-- Update episode_audio table to include storage metadata
ALTER TABLE episode_audio 
ADD COLUMN IF NOT EXISTS storage_bucket text DEFAULT 'episode-audio',
ADD COLUMN IF NOT EXISTS storage_path text,
ADD COLUMN IF NOT EXISTS file_size bigint,
ADD COLUMN IF NOT EXISTS mime_type text,
ADD COLUMN IF NOT EXISTS duration_seconds integer,
ADD COLUMN IF NOT EXISTS elevenlabs_request_id text,
ADD COLUMN IF NOT EXISTS elevenlabs_metadata jsonb DEFAULT '{}'::jsonb;

-- Indexes for storage queries
CREATE INDEX IF NOT EXISTS episode_audio_storage_path_idx ON episode_audio(storage_path);
CREATE INDEX IF NOT EXISTS episode_audio_elevenlabs_request_id_idx ON episode_audio(elevenlabs_request_id);

-- Storage RLS Policies for episode-audio bucket
CREATE POLICY "Users can view audio files from their accounts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'episode-audio' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM episodes WHERE account_id IN (
        SELECT account_id FROM accounts_memberships 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can upload audio files for their episodes"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'episode-audio' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM episodes WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update audio files for their episodes"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'episode-audio' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM episodes WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete audio files for their episodes"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'episode-audio' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM episodes WHERE created_by = auth.uid()
    )
  );

-- Audio file organization structure:
-- episode-audio/
--   {episode_id}/
--     music/
--       scene-{scene_number}-theme.mp3
--       episode-theme.mp3
--     sfx/
--       scene-{scene_number}-{sfx_id}.mp3
--       ambient-{ambient_id}.mp3
--
-- Example: episode-audio/550e8400-e29b-41d4-a716-446655440000/music/scene-1-theme.mp3

-- Function to generate storage path for audio files
CREATE OR REPLACE FUNCTION generate_episode_audio_path(
  p_episode_id uuid,
  p_audio_type text,
  p_scene_number integer DEFAULT NULL,
  p_audio_id text DEFAULT NULL
) RETURNS text AS $$
DECLARE
  base_path text;
  filename text;
BEGIN
  base_path := p_episode_id::text || '/' || p_audio_type || '/';
  
  IF p_audio_type = 'music' THEN
    IF p_scene_number IS NOT NULL THEN
      filename := 'scene-' || p_scene_number || '-theme.mp3';
    ELSE
      filename := 'episode-theme.mp3';
    END IF;
  ELSIF p_audio_type = 'sfx' THEN
    IF p_scene_number IS NOT NULL THEN
      filename := 'scene-' || p_scene_number || '-' || COALESCE(p_audio_id, gen_random_uuid()::text) || '.mp3';
    ELSE
      filename := 'ambient-' || COALESCE(p_audio_id, gen_random_uuid()::text) || '.mp3';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid audio_type: %', p_audio_type;
  END IF;
  
  RETURN base_path || filename;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get signed URL for audio playback
CREATE OR REPLACE FUNCTION get_episode_audio_url(
  p_episode_audio_id uuid,
  p_expires_in integer DEFAULT 3600
) RETURNS text AS $$
DECLARE
  audio_record episode_audio%ROWTYPE;
  signed_url text;
BEGIN
  -- Get the audio record
  SELECT * INTO audio_record FROM episode_audio WHERE id = p_episode_audio_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Check if user has access to this episode
  IF NOT EXISTS (
    SELECT 1 FROM episodes 
    WHERE id = audio_record.episode_id 
    AND account_id IN (
      SELECT account_id FROM accounts_memberships 
      WHERE user_id = auth.uid()
    )
  ) THEN
    RETURN NULL;
  END IF;
  
  -- Return storage URL if available
  IF audio_record.storage_path IS NOT NULL THEN
    -- In production, this would generate a signed URL
    -- For now, return the storage path
    RETURN 'storage://' || audio_record.storage_bucket || '/' || audio_record.storage_path;
  ELSIF audio_record.audio_url IS NOT NULL THEN
    -- Fallback to direct URL (e.g., ElevenLabs temporary URL)
    RETURN audio_record.audio_url;
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION generate_episode_audio_path TO authenticated;
GRANT EXECUTE ON FUNCTION get_episode_audio_url TO authenticated;