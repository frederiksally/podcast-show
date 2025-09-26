import { tool } from 'ai';
import { z } from 'zod';
import type { StateCard, Episode, Scene, AudioCue } from '../base/types';

// We'll need to import database client - this will be injected
type DatabaseClient = any;

export function createEpisodeTools(client: DatabaseClient) {
  return {
    saveEpisode: tool({
      description: 'Save or update an episode in the database',
      parameters: z.object({
        episode: z.object({
          id: z.string().optional(),
          accountId: z.string(),
          createdBy: z.string(),
          title: z.string(),
          premise: z.string(),
          stateCard: z.object({
            storySoFar: z.string(),
            keyFacts: z.array(z.string()),
            themes: z.array(z.string()),
            anchors: z.array(z.object({
              id: z.string(),
              description: z.string(),
              isUsed: z.boolean(),
              createdAtScene: z.number()
            }))
          }),
          status: z.enum(['active', 'completed', 'abandoned']),
          totalScenes: z.number(),
          totalChoices: z.number()
        })
      }),
      execute: async ({ episode }) => {
        try {
          const episodeData = {
            account_id: episode.accountId,
            created_by: episode.createdBy,
            title: episode.title,
            premise: episode.premise,
            state_card: episode.stateCard,
            status: episode.status,
            total_scenes: episode.totalScenes,
            total_choices: episode.totalChoices
          };

          let result;
          if (episode.id) {
            // Update existing episode
            const { data, error } = await client
              .from('episodes')
              .update(episodeData)
              .eq('id', episode.id)
              .select()
              .single();
            
            if (error) throw error;
            result = data;
          } else {
            // Create new episode
            const { data, error } = await client
              .from('episodes')
              .insert(episodeData)
              .select()
              .single();
            
            if (error) throw error;
            result = data;
          }

          return { 
            success: true, 
            episodeId: result.id,
            episode: {
              id: result.id,
              accountId: result.account_id,
              createdBy: result.created_by,
              title: result.title,
              premise: result.premise,
              stateCard: result.state_card,
              status: result.status,
              createdAt: result.created_at,
              completedAt: result.completed_at,
              totalScenes: result.total_scenes,
              totalChoices: result.total_choices
            }
          };
        } catch (error) {
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Failed to save episode' 
          };
        }
      }
    }),

    loadEpisode: tool({
      description: 'Load an episode from the database by ID',
      parameters: z.object({
        episodeId: z.string()
      }),
      execute: async ({ episodeId }) => {
        try {
          const { data, error } = await client
            .from('episodes')
            .select('*')
            .eq('id', episodeId)
            .single();
          
          if (error) throw error;
          if (!data) throw new Error('Episode not found');

          return {
            success: true,
            episode: {
              id: data.id,
              accountId: data.account_id,
              createdBy: data.created_by,
              title: data.title,
              premise: data.premise,
              stateCard: data.state_card,
              status: data.status,
              createdAt: data.created_at,
              completedAt: data.completed_at,
              totalScenes: data.total_scenes,
              totalChoices: data.total_choices
            }
          };
        } catch (error) {
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Failed to load episode' 
          };
        }
      }
    }),

    saveScene: tool({
      description: 'Save a new scene to the database',
      parameters: z.object({
        scene: z.object({
          episodeId: z.string(),
          sceneNumber: z.number(),
          narration: z.string(),
          choiceA: z.string(),
          choiceB: z.string(),
          chosenOption: z.enum(['A', 'B']).optional(),
          stateUpdate: z.record(z.any()).default({}),
          audioCues: z.array(z.object({
            type: z.enum(['music', 'sfx']),
            trigger: z.string(),
            description: z.string(),
            timing: z.number().optional()
          })).default([])
        })
      }),
      execute: async ({ scene }) => {
        try {
          const sceneData = {
            episode_id: scene.episodeId,
            scene_number: scene.sceneNumber,
            narration: scene.narration,
            choice_a: scene.choiceA,
            choice_b: scene.choiceB,
            chosen_option: scene.chosenOption,
            state_update: scene.stateUpdate,
            audio_cues: scene.audioCues
          };

          const { data, error } = await client
            .from('episode_scenes')
            .insert(sceneData)
            .select()
            .single();
          
          if (error) throw error;

          return {
            success: true,
            sceneId: data.id,
            scene: {
              id: data.id,
              episodeId: data.episode_id,
              sceneNumber: data.scene_number,
              narration: data.narration,
              choiceA: data.choice_a,
              choiceB: data.choice_b,
              chosenOption: data.chosen_option,
              stateUpdate: data.state_update,
              audioCues: data.audio_cues,
              createdAt: data.created_at
            }
          };
        } catch (error) {
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Failed to save scene' 
          };
        }
      }
    }),

    loadScenes: tool({
      description: 'Load all scenes for an episode, ordered by scene number',
      parameters: z.object({
        episodeId: z.string()
      }),
      execute: async ({ episodeId }) => {
        try {
          const { data, error } = await client
            .from('episode_scenes')
            .select('*')
            .eq('episode_id', episodeId)
            .order('scene_number', { ascending: true });
          
          if (error) throw error;

          const scenes = data.map((scene: any) => ({
            id: scene.id,
            episodeId: scene.episode_id,
            sceneNumber: scene.scene_number,
            narration: scene.narration,
            choiceA: scene.choice_a,
            choiceB: scene.choice_b,
            chosenOption: scene.chosen_option,
            stateUpdate: scene.state_update,
            audioCues: scene.audio_cues,
            createdAt: scene.created_at
          }));

          return { success: true, scenes };
        } catch (error) {
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Failed to load scenes' 
          };
        }
      }
    }),

    updateSceneChoice: tool({
      description: 'Update a scene with the chosen option (A or B)',
      parameters: z.object({
        sceneId: z.string(),
        chosenOption: z.enum(['A', 'B'])
      }),
      execute: async ({ sceneId, chosenOption }) => {
        try {
          const { data, error } = await client
            .from('episode_scenes')
            .update({ chosen_option: chosenOption })
            .eq('id', sceneId)
            .select()
            .single();
          
          if (error) throw error;

          return {
            success: true,
            scene: {
              id: data.id,
              episodeId: data.episode_id,
              sceneNumber: data.scene_number,
              narration: data.narration,
              choiceA: data.choice_a,
              choiceB: data.choice_b,
              chosenOption: data.chosen_option,
              stateUpdate: data.state_update,
              audioCues: data.audio_cues,
              createdAt: data.created_at
            }
          };
        } catch (error) {
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Failed to update scene choice' 
          };
        }
      }
    }),

    updateEpisodeStats: tool({
      description: 'Update episode statistics (total scenes and choices)',
      parameters: z.object({
        episodeId: z.string(),
        totalScenes: z.number(),
        totalChoices: z.number(),
        status: z.enum(['active', 'completed', 'abandoned']).optional()
      }),
      execute: async ({ episodeId, totalScenes, totalChoices, status }) => {
        try {
          const updateData: any = {
            total_scenes: totalScenes,
            total_choices: totalChoices
          };

          if (status) {
            updateData.status = status;
            if (status === 'completed') {
              updateData.completed_at = new Date().toISOString();
            }
          }

          const { data, error } = await client
            .from('episodes')
            .update(updateData)
            .eq('id', episodeId)
            .select()
            .single();
          
          if (error) throw error;

          return { success: true, episode: data };
        } catch (error) {
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Failed to update episode stats' 
          };
        }
      }
    })
  };
}