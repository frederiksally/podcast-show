import { generateText, tool, stepCountIs } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import type { Episode, Scene, StateCard, EpisodeBible } from '../base/types';
import { StateAgent } from './state-agent';
import { ScenePlannerAgent } from './scene-planner';
import { ContinuityAgent } from './continuity-agent';
import { StoryDirectorAgent } from './story-director';
import { createEpisodeTools } from '../tools/episode-tools';
import { createAudioTools } from '../tools/audio-tools';
import { createEpisodeBibleTools } from '../tools/episode-bible-tools';

/**
 * Episode Orchestrator Agent following AI SDK Orchestrator-Worker pattern
 * 
 * This agent coordinates the workflow but delegates all content generation 
 * to specialized worker agents. It maintains the rolling window of 3 scenarios
 * and manages the real-time episode flow.
 */
export class EpisodeOrchestrator {
  private model = openai('gpt-4o');

  // Worker agents - each specialized for their domain
  private storyDirector = new StoryDirectorAgent(); // Creative intelligence
  private stateAgent = new StateAgent();
  private scenePlanner = new ScenePlannerAgent();
  private continuityAgent = new ContinuityAgent();

  // Episode Bible - the creative world and guidelines (set once per episode)
  private episodeBible: EpisodeBible | null = null;
  
  /**
   * Check if Episode Bible has been created for this episode
   */
  private hasEpisodeBible(): boolean {
    return this.episodeBible !== null;
  }
  
  /**
   * Store the Episode Bible for use throughout the episode
   */
  private storeEpisodeBible(bible: EpisodeBible): void {
    this.episodeBible = bible;
  }
  
  /**
   * Get the stored Episode Bible (throws if not available)
   */
  private getEpisodeBible(): EpisodeBible {
    if (!this.episodeBible) {
      throw new Error('Episode Bible not available. Must create Episode Bible before generating scenes.');
    }
    return this.episodeBible;
  }
  
  // Database and API tools
  private episodeTools: any;
  private audioTools: any;
  private episodeBibleTools: any;

  // Rolling window state: current + two possible children
  private scenarioWindow: {
    current?: Scene;
    optionA?: Scene;
    optionB?: Scene;
  } = {};

  constructor(
    private databaseClient: any,
    private elevenLabsApiKey: string
  ) {
    this.episodeTools = createEpisodeTools(databaseClient);
    this.audioTools = createAudioTools(databaseClient, elevenLabsApiKey);
    this.episodeBibleTools = createEpisodeBibleTools(databaseClient);
  }

  /**
   * Start a new episode - delegates to worker agents
   * Following Orchestrator-Worker pattern from AI SDK
   */
  async startEpisode(
    accountId: string,
    userId: string,
    title: string,
    premise: string
  ): Promise<{
    episode: Episode;
    firstScene: Scene;
    stateCard: StateCard;
  }> {
    const result = await generateText({
      model: this.model,
      system: `You are the Episode Orchestrator coordinating a choose-your-own-adventure podcast episode.

You coordinate but DO NOT generate content yourself. You delegate to specialized worker agents.

IMPORTANT WORKFLOW LOGIC:

1. FIRST: Always check if Episode Bible exists for this episode using database tools
2. IF NO BIBLE EXISTS: 
   - Create Episode Bible using Story Director
   - Save Episode Bible to database
   - Store Episode Bible in memory for this session
3. IF BIBLE EXISTS: 
   - Load Episode Bible from database
   - Store Episode Bible in memory for this session
4. Initialize State Card using State Agent
5. Generate scenes using Scene Planner with the Episode Bible
6. Use Continuity Agent for callback analysis when needed
7. Save all episode and scene data

CRITICAL RULES:
- Episode Bible is created ONCE per episode and stored in database
- All scene generation uses the same Episode Bible
- Scene Planner handles its own audio cue generation
- You coordinate the workflow but never generate content yourself`,

      tools: {
        // Story Director delegation (Episode Bible creation only)
        delegateToStoryDirector: tool({
          description: 'Create Episode Bible using Story Director (only called once per episode)',
          parameters: z.object({
            premise: z.string().describe('The episode premise to create Episode Bible from')
          }),
          execute: async ({ premise }) => {
            const episodeBible = await this.storyDirector.createEpisodeBible(premise);
            this.storeEpisodeBible(episodeBible); // Store in memory for this session
            return { success: true, episodeBible, agent: 'StoryDirector' };
          }
        }),

        // State management delegation
        delegateToStateAgent: tool({
          description: 'Delegate State Card operations to State Agent',
          parameters: z.object({
            task: z.enum(['initialize', 'update']),
            premise: z.string().optional(),
            currentStateCard: z.object({
              storySoFar: z.string(),
              keyFacts: z.array(z.string()),
              anchors: z.array(z.object({
                id: z.string(),
                description: z.string(),
                isUsed: z.boolean(),
                createdAtScene: z.number()
              }))
            }).optional(),
            newScene: z.object({
              id: z.string(),
              episodeId: z.string(),
              sceneNumber: z.number(),
              narration: z.string(),
              choiceA: z.string(),
              choiceB: z.string(),
              chosenOption: z.enum(['A', 'B']).optional(),
              stateUpdate: z.record(z.any()),
              audioCues: z.array(z.any()),
              createdAt: z.string()
            }).optional(),
            chosenOption: z.enum(['A', 'B']).optional(),
            previousScenes: z.array(z.any()).optional()
          }),
          execute: async ({ task, premise, currentStateCard, newScene, chosenOption, previousScenes }) => {
            if (task === 'initialize') {
              const stateCard = await this.stateAgent.initializeStateCard(premise!);
              return { success: true, stateCard, agent: 'StateAgent' };
            } else {
              const updatedStateCard = await this.stateAgent.updateStateCard(
                currentStateCard!, newScene!, chosenOption!, previousScenes!
              );
              return { success: true, updatedStateCard, agent: 'StateAgent' };
            }
          }
        }),

        // Scene planning delegation with Episode Bible
        delegateToScenePlanner: tool({
          description: 'Delegate scene generation to Scene Planner Agent using Episode Bible',
          parameters: z.object({
            task: z.enum(['generateScene', 'generateFinale']),
            premise: z.string(),
            episodeBible: z.any().describe('The Episode Bible containing world rules and creative guidelines'),
            stateCard: z.object({
              storySoFar: z.string(),
              keyFacts: z.array(z.string()),
              anchors: z.array(z.object({
                id: z.string(),
                description: z.string(),
                isUsed: z.boolean(),
                createdAtScene: z.number()
              }))
            }),
            sceneNumber: z.number(),
            callbackSuggestion: z.object({
              shouldUseCallback: z.boolean(),
              suggestedAnchor: z.object({
                id: z.string(),
                description: z.string()
              }).optional(),
              reason: z.string()
            }).optional()
          }),
          execute: async ({ task, premise, episodeBible, stateCard, sceneNumber, callbackSuggestion }) => {
            if (task === 'generateScene') {
              const sceneData = await this.scenePlanner.generateScene(
                premise, 
                episodeBible,
                stateCard, 
                sceneNumber, 
                callbackSuggestion
              );
              return { success: true, sceneData, agent: 'ScenePlannerAgent' };
            } else {
              const finaleData = await this.scenePlanner.generateFinaleScene(
                premise, 
                episodeBible,
                stateCard, 
                sceneNumber
              );
              return { success: true, finaleData, agent: 'ScenePlannerAgent' };
            }
          }
        }),

        // Continuity analysis delegation
        delegateToContinuityAgent: tool({
          description: 'Delegate callback analysis to Continuity Agent',
          parameters: z.object({
            task: z.literal('analyzeCallbacks'),
            stateCard: z.object({
              storySoFar: z.string(),
              keyFacts: z.array(z.string()),
              anchors: z.array(z.object({
                id: z.string(),
                description: z.string(),
                isUsed: z.boolean(),
                createdAtScene: z.number()
              }))
            }),
            upcomingContext: z.string()
          }),
          execute: async ({ stateCard, upcomingContext }) => {
            const suggestion = await this.continuityAgent.analyzeCallbacks(stateCard, upcomingContext);
            return { success: true, suggestion, agent: 'ContinuityAgent' };
          }
        }),

        // Parallel audio generation delegation
        delegateToAudioWorkers: tool({
          description: 'Delegate audio generation to Music and SFX agents in parallel',
          parameters: z.object({
            task: z.literal('generateAudio'),
            episodeId: z.string(),
            sceneId: z.string().optional(),
            audioCues: z.array(z.object({
              type: z.enum(['music', 'sfx']),
              trigger: z.string(),
              description: z.string(),
              timing: z.number().optional()
            })),
            style: z.string().describe('Derived style from premise (horror, fantasy, etc.)'),
            audioDirection: z.object({
              musicMood: z.string(),
              sfxIntensity: z.string(),
              audioStyle: z.string(),
              atmosphereNotes: z.string()
            }).optional().describe('Creative direction for audio generation')
          }),
          execute: async ({ episodeId, sceneId, audioCues, style, audioDirection }) => {
            // Execute music and SFX generation in parallel
            const audioPromises = audioCues.map(cue => {
              if (cue.type === 'music') {
                return this.audioTools.generateMusic.execute({
                  episodeId,
                  sceneId,
                  description: audioDirection ? 
                    `${cue.description}. Audio direction: ${audioDirection.musicMood}, ${audioDirection.audioStyle}, ${audioDirection.atmosphereNotes}` : 
                    cue.description,
                  style,
                  duration: 30 // Default duration
                });
              } else {
                return this.audioTools.generateSFX.execute({
                  episodeId,
                  sceneId,
                  sfxDescription: audioDirection ?
                    `${cue.description}. SFX direction: ${audioDirection.sfxIntensity}, ${audioDirection.audioStyle}, ${audioDirection.atmosphereNotes}` :
                    cue.description,
                  trigger: cue.trigger,
                  intensity: audioDirection?.sfxIntensity || 'moderate'
                });
              }
            });

            const results = await Promise.all(audioPromises);
            const successful = results.filter(r => r.success).length;
            
            return { 
              success: true, 
              audioResults: results, 
              successfulGenerations: successful,
              agent: 'AudioWorkers'
            };
          }
        }),

        // Include database tools for coordination
        ...this.episodeTools,
        ...this.episodeBibleTools
      },

      prompt: `Start new episode coordination:

Title: ${title}
Premise: ${premise}
Account ID: ${accountId}
User ID: ${userId}

Follow the Episode Bible workflow:

1. FIRST: Check if Episode Bible exists for this episode
2. If NO Bible: Create one using Story Director, then save to database
3. If Bible EXISTS: Load it from database
4. Initialize State Card using State Agent
5. Generate opening scene using Scene Planner with Episode Bible
6. Analyze for continuity opportunities using Continuity Agent
7. Save episode and scene data

You coordinate the workflow - the agents execute their specializations.`,

      stopWhen: stepCountIs(12) // Allow orchestration steps
    });

    // Extract results from worker delegations
    const stateResult = this.extractToolResult(result, 'delegateToStateAgent');
    const sceneResult = this.extractToolResult(result, 'delegateToScenePlanner');
    const episodeResult = this.extractToolResult(result, 'saveEpisode');
    const sceneDbResult = this.extractToolResult(result, 'saveScene');

    if (!stateResult?.success || !sceneResult?.success) {
      throw new Error('Worker agents failed during episode initialization');
    }

    const episode = episodeResult.episode;
    const stateCard = stateResult.stateCard;
    const firstScene = {
      id: sceneDbResult.sceneId,
      episodeId: episode.id,
      sceneNumber: 1,
      ...sceneResult.sceneData,
      createdAt: new Date().toISOString()
    };

    // Store current scene and pre-generate children
    this.scenarioWindow.current = firstScene;
    await this.coordinateChildGeneration(premise, stateCard, firstScene);

    return { episode, firstScene, stateCard };
  }

  /**
   * Process a choice by coordinating worker agents
   */
  async processChoice(
    episodeId: string,
    choice: 'A' | 'B',
    userId: string
  ): Promise<{
    nextScene: Scene;
    updatedStateCard: StateCard;
    audioGenerated: boolean;
  }> {
    const result = await generateText({
      model: this.model,
      system: `You are the Episode Orchestrator processing a choice selection.

Coordinate the worker agents to:
1. Retrieve the pre-generated scene from rolling window
2. Delegate state update to State Agent
3. Save the choice and new scene data  
4. Delegate audio generation to Audio Workers
5. Delegate next scenarios generation to Scene Planner
6. Update rolling window

You coordinate the flow - workers handle their specializations.`,

      tools: {
        delegateToStateAgent: tool({
          description: 'Delegate state card update to State Agent',
          parameters: z.object({
            task: z.literal('update'),
            currentStateCard: z.object({
              storySoFar: z.string(),
              keyFacts: z.array(z.string()),
              anchors: z.array(z.object({
                id: z.string(),
                description: z.string(),
                isUsed: z.boolean(),
                createdAtScene: z.number()
              }))
            }),
            newScene: z.object({
              id: z.string(),
              episodeId: z.string(),
              sceneNumber: z.number(),
              narration: z.string(),
              choiceA: z.string(),
              choiceB: z.string(),
              chosenOption: z.enum(['A', 'B']).optional(),
              stateUpdate: z.record(z.any()),
              audioCues: z.array(z.any()),
              createdAt: z.string()
            }),
            chosenOption: z.enum(['A', 'B']),
            previousScenes: z.array(z.any())
          }),
          execute: async ({ currentStateCard, newScene, chosenOption, previousScenes }) => {
            const updatedStateCard = await this.stateAgent.updateStateCard(
              currentStateCard,
              newScene,
              chosenOption,
              previousScenes
            );
            return { success: true, updatedStateCard, agent: 'StateAgent' };
          }
        }),

        delegateToScenePlanner: tool({
          description: 'Delegate scene generation to Scene Planner Agent',  
          parameters: z.object({
            task: z.enum(['generateScene', 'generateFinale']),
            premise: z.string(),
            stateCard: z.object({
              storySoFar: z.string(),
              keyFacts: z.array(z.string()),
              anchors: z.array(z.object({
                id: z.string(),
                description: z.string(),
                isUsed: z.boolean(),
                createdAtScene: z.number()
              }))
            }),
            sceneNumber: z.number(),
            callbackSuggestion: z.object({
              shouldUseCallback: z.boolean(),
              suggestedAnchor: z.object({
                id: z.string(),
                description: z.string()
              }).optional(),
              reason: z.string()
            }).optional()
          }),
          execute: async ({ task, premise, stateCard, sceneNumber, callbackSuggestion }) => {
            const sceneData = await this.scenePlanner.generateScene(
              premise, 
              stateCard, 
              sceneNumber, 
              callbackSuggestion
            );
            return { success: true, sceneData, agent: 'ScenePlannerAgent' };
          }
        }),

        delegateToContinuityAgent: tool({
          description: 'Delegate callback analysis to Continuity Agent',
          parameters: z.object({
            task: z.literal('analyzeCallbacks'),
            stateCard: z.object({
              storySoFar: z.string(),
              keyFacts: z.array(z.string()),
              anchors: z.array(z.object({
                id: z.string(),
                description: z.string(),
                isUsed: z.boolean(),
                createdAtScene: z.number()
              }))
            }),
            upcomingContext: z.string()
          }),
          execute: async ({ stateCard, upcomingContext }) => {
            const suggestion = await this.continuityAgent.analyzeCallbacks(stateCard, upcomingContext);
            return { success: true, suggestion, agent: 'ContinuityAgent' };
          }
        }),

        ...this.episodeTools,
        ...this.audioTools
      },

      prompt: `Process choice "${choice}" for episode ${episodeId}.

Use the pre-generated scene from rolling window and coordinate workers to:
- Update state via State Agent
- Generate audio via Audio Workers  
- Generate next scenarios via Scene Planner
- Update database
- Maintain rolling window`,

      stopWhen: stepCountIs(10)
    });

    // Extract the chosen scene from rolling window
    const nextScene = choice === 'A' ? this.scenarioWindow.optionA : this.scenarioWindow.optionB;
    if (!nextScene) {
      throw new Error('No pre-generated scenario available for choice');
    }

    // Get results from worker coordination
    const stateUpdateResult = this.extractToolResult(result, 'delegateToStateAgent');
    if (!stateUpdateResult?.success) {
      throw new Error('State Agent failed to update state card');
    }

    // Update rolling window
    this.scenarioWindow.current = nextScene;
    this.scenarioWindow.optionA = undefined;
    this.scenarioWindow.optionB = undefined;

    // Coordinate generation of new child scenarios
    await this.coordinateChildGeneration(
      '', // Would get from loaded episode
      stateUpdateResult.updatedStateCard,
      nextScene
    );

    return {
      nextScene,
      updatedStateCard: stateUpdateResult.updatedStateCard,
      audioGenerated: false // Audio happens in background
    };
  }

  /**
   * Coordinate child scenario generation via worker agents
   */
  private async coordinateChildGeneration(
    premise: string,
    stateCard: StateCard,
    parentScene: Scene
  ): Promise<void> {
    // Delegate callback analysis to Continuity Agent
    const callbackSuggestion = await this.continuityAgent.analyzeCallbacks(
      stateCard,
      `Following choice A: ${parentScene.choiceA} or choice B: ${parentScene.choiceB}`
    );

    // Delegate parallel child generation to Scene Planner
    const [optionAScene, optionBScene] = await Promise.all([
      this.coordinateChildScenario(premise, stateCard, parentScene, 'A', callbackSuggestion),
      this.coordinateChildScenario(premise, stateCard, parentScene, 'B', callbackSuggestion)
    ]);

    // Update rolling window
    this.scenarioWindow.optionA = optionAScene;
    this.scenarioWindow.optionB = optionBScene;
  }

  /**
   * Coordinate generation of a single child scenario
   */
  private async coordinateChildScenario(
    premise: string,
    stateCard: StateCard,
    parentScene: Scene,
    choice: 'A' | 'B',
    callbackSuggestion: any
  ): Promise<Scene> {
    // Project state for this choice path
    const projectedStateCard = this.projectStateForChoice(stateCard, parentScene, choice);

    // Delegate to Scene Planner
    const sceneData = await this.scenePlanner.generateScene(
      premise,
      projectedStateCard,
      parentScene.sceneNumber + 1,
      callbackSuggestion.shouldUseCallback ? callbackSuggestion : undefined
    );

    return {
      id: `temp_${parentScene.id}_${choice}_${Date.now()}`,
      episodeId: parentScene.episodeId,
      sceneNumber: parentScene.sceneNumber + 1,
      ...sceneData,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Simple state projection for choice paths
   */
  private projectStateForChoice(
    stateCard: StateCard,
    scene: Scene,
    choice: 'A' | 'B'
  ): StateCard {
    const choiceText = choice === 'A' ? scene.choiceA : scene.choiceB;
    return {
      ...stateCard,
      storySoFar: `${stateCard.storySoFar} ${choiceText}`,
      keyFacts: [...stateCard.keyFacts, `Chose: ${choiceText}`]
    };
  }

  /**
   * Extract tool results from AI SDK execution
   */
  private extractToolResult(result: any, toolName: string): any {
    return result.toolCalls?.find((call: any) => call.toolName === toolName)?.result;
  }

  /**
   * Get current rolling window state
   */
  getCurrentWindow() {
    return { ...this.scenarioWindow };
  }
}