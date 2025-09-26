-- Episode Bible table to store creative guidelines per episode
-- Each episode has exactly one Episode Bible created by Story Director

create table if not exists episode_bibles (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references episodes(id) on delete cascade,
  
  -- World Rules
  world_genre text not null,
  world_style text not null, -- Allow flexible style descriptions like "gothic horror", "dark fantasy", etc.
  world_tone text not null,
  world_setting text not null,
  world_timeframe text not null,
  world_core_conflict text not null,
  world_logic text[] not null default '{}',
  
  -- Storytelling Guidelines  
  storytelling_narrative_voice text not null,
  storytelling_pacing text not null check (storytelling_pacing in ('fast', 'moderate', 'slow')),
  storytelling_complexity text not null check (storytelling_complexity in ('simple', 'moderate', 'complex')),
  storytelling_atmosphere_keywords text[] not null default '{}',
  storytelling_choice_philosophy text not null,
  storytelling_scene_structure_notes text not null,
  
  -- Character Framework
  character_protagonist_types text[] not null default '{}',
  character_antagonist_types text[] not null default '{}',
  character_supporting_types text[] not null default '{}',
  character_voice_guidelines text not null,
  
  -- Conflict Patterns
  conflict_typical_conflicts text[] not null default '{}',
  conflict_escalation_pattern text not null,
  conflict_resolution_approach text not null,
  
  -- Audio Direction
  audio_music_style text not null,
  audio_common_sfx_types text[] not null default '{}',
  audio_intensity_range text not null check (audio_intensity_range in ('subtle', 'moderate', 'dramatic')),
  audio_atmosphere_notes text not null,
  
  -- Story Arc Guidance
  story_expected_progression text not null,
  story_key_fact_types text[] not null default '{}',
  story_likely_anchor_types text[] not null default '{}',
  story_finale_expectation text not null,
  
  -- Consistency Rules
  consistency_rules text[] not null default '{}',
  reasoning text not null,
  
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Indexes
create index if not exists episode_bibles_episode_id_idx on episode_bibles(episode_id);

-- RLS Policies
alter table episode_bibles enable row level security;

-- Users can access Episode Bibles for episodes in their accounts
create policy "Users can view Episode Bibles from their accounts"
  on episode_bibles for select
  using (
    episode_id in (
      select id from episodes where account_id in (
        select account_id from accounts_memberships 
        where user_id = auth.uid()
      )
    )
  );

create policy "Users can create Episode Bibles for their episodes"
  on episode_bibles for insert
  with check (
    episode_id in (
      select id from episodes where created_by = auth.uid()
    )
  );

create policy "Users can update Episode Bibles they created"
  on episode_bibles for update
  using (
    episode_id in (
      select id from episodes where created_by = auth.uid()
    )
  );

-- Note: updated_at is managed manually by application code

-- Ensure one Episode Bible per episode
create unique index if not exists episode_bibles_unique_per_episode 
  on episode_bibles(episode_id);