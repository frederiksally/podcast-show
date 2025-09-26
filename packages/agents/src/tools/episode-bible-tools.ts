import { tool } from 'ai';
import { z } from 'zod';
import type { EpisodeBible } from '../base/types';

type DatabaseClient = any;

export function createEpisodeBibleTools(client: DatabaseClient) {
  return {
    loadEpisodeBible: tool({
      description: 'Load Episode Bible for an episode from database',
      parameters: z.object({
        episodeId: z.string().describe('UUID of the episode to load Bible for')
      }),
      execute: async ({ episodeId }) => {
        try {
          const { data, error } = await client
            .from('episode_bibles')
            .select('*')
            .eq('episode_id', episodeId)
            .single();

          if (error && error.code !== 'PGRST116') { // PGRST116 = not found
            throw error;
          }

          if (!data) {
            return {
              success: true,
              exists: false,
              episodeBible: null
            };
          }

          // Convert database format to EpisodeBible interface
          const episodeBible: EpisodeBible = {
            worldRules: {
              genre: data.world_genre,
              style: data.world_style,
              tone: data.world_tone,
              setting: data.world_setting,
              timeframe: data.world_timeframe,
              coreConflict: data.world_core_conflict,
              worldLogic: data.world_logic
            },
            storytellingGuidelines: {
              narrativeVoice: data.storytelling_narrative_voice,
              pacing: data.storytelling_pacing,
              complexity: data.storytelling_complexity,
              atmosphereKeywords: data.storytelling_atmosphere_keywords,
              choicePhilosophy: data.storytelling_choice_philosophy,
              sceneStructureNotes: data.storytelling_scene_structure_notes
            },
            characterFramework: {
              protagonistTypes: data.character_protagonist_types,
              antagonistTypes: data.character_antagonist_types,
              supportingTypes: data.character_supporting_types,
              characterVoiceGuidelines: data.character_voice_guidelines
            },
            conflictPatterns: {
              typicalConflicts: data.conflict_typical_conflicts,
              escalationPattern: data.conflict_escalation_pattern,
              resolutionApproach: data.conflict_resolution_approach
            },
            audioDirection: {
              musicStyle: data.audio_music_style,
              commonSFXTypes: data.audio_common_sfx_types,
              audioIntensityRange: data.audio_intensity_range,
              atmosphereNotes: data.audio_atmosphere_notes
            },
            storyArcGuidance: {
              expectedProgression: data.story_expected_progression,
              keyFactTypes: data.story_key_fact_types,
              likelyAnchorTypes: data.story_likely_anchor_types,
              finaleExpectation: data.story_finale_expectation
            },
            consistencyRules: data.consistency_rules,
            reasoning: data.reasoning
          };

          return {
            success: true,
            exists: true,
            episodeBible
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to load Episode Bible'
          };
        }
      }
    }),

    saveEpisodeBible: tool({
      description: 'Save Episode Bible to database',
      parameters: z.object({
        episodeId: z.string().describe('UUID of the episode'),
        episodeBible: z.any().describe('Episode Bible data structure')
      }),
      execute: async ({ episodeId, episodeBible }) => {
        try {
          // Convert EpisodeBible interface to database format
          const dbData = {
            episode_id: episodeId,
            
            // World Rules
            world_genre: episodeBible.worldRules.genre,
            world_style: episodeBible.worldRules.style,
            world_tone: episodeBible.worldRules.tone,
            world_setting: episodeBible.worldRules.setting,
            world_timeframe: episodeBible.worldRules.timeframe,
            world_core_conflict: episodeBible.worldRules.coreConflict,
            world_logic: episodeBible.worldRules.worldLogic,
            
            // Storytelling Guidelines
            storytelling_narrative_voice: episodeBible.storytellingGuidelines.narrativeVoice,
            storytelling_pacing: episodeBible.storytellingGuidelines.pacing,
            storytelling_complexity: episodeBible.storytellingGuidelines.complexity,
            storytelling_atmosphere_keywords: episodeBible.storytellingGuidelines.atmosphereKeywords,
            storytelling_choice_philosophy: episodeBible.storytellingGuidelines.choicePhilosophy,
            storytelling_scene_structure_notes: episodeBible.storytellingGuidelines.sceneStructureNotes,
            
            // Character Framework
            character_protagonist_types: episodeBible.characterFramework.protagonistTypes,
            character_antagonist_types: episodeBible.characterFramework.antagonistTypes,
            character_supporting_types: episodeBible.characterFramework.supportingTypes,
            character_voice_guidelines: episodeBible.characterFramework.characterVoiceGuidelines,
            
            // Conflict Patterns
            conflict_typical_conflicts: episodeBible.conflictPatterns.typicalConflicts,
            conflict_escalation_pattern: episodeBible.conflictPatterns.escalationPattern,
            conflict_resolution_approach: episodeBible.conflictPatterns.resolutionApproach,
            
            // Audio Direction
            audio_music_style: episodeBible.audioDirection.musicStyle,
            audio_common_sfx_types: episodeBible.audioDirection.commonSFXTypes,
            audio_intensity_range: episodeBible.audioDirection.audioIntensityRange,
            audio_atmosphere_notes: episodeBible.audioDirection.atmosphereNotes,
            
            // Story Arc Guidance
            story_expected_progression: episodeBible.storyArcGuidance.expectedProgression,
            story_key_fact_types: episodeBible.storyArcGuidance.keyFactTypes,
            story_likely_anchor_types: episodeBible.storyArcGuidance.likelyAnchorTypes,
            story_finale_expectation: episodeBible.storyArcGuidance.finaleExpectation,
            
            // Consistency Rules
            consistency_rules: episodeBible.consistencyRules,
            reasoning: episodeBible.reasoning
          };

          const { data, error } = await client
            .from('episode_bibles')
            .upsert(dbData)
            .select()
            .single();

          if (error) throw error;

          return {
            success: true,
            id: data.id,
            message: 'Episode Bible saved successfully'
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to save Episode Bible'
          };
        }
      }
    }),

    checkEpisodeBibleExists: tool({
      description: 'Check if Episode Bible exists for an episode',
      parameters: z.object({
        episodeId: z.string().describe('UUID of the episode to check')
      }),
      execute: async ({ episodeId }) => {
        try {
          const { data, error } = await client
            .from('episode_bibles')
            .select('id')
            .eq('episode_id', episodeId)
            .single();

          if (error && error.code !== 'PGRST116') { // PGRST116 = not found
            throw error;
          }

          return {
            success: true,
            exists: !!data
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to check Episode Bible existence'
          };
        }
      }
    })
  };
}