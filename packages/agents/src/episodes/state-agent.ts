import { generateObject, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import type { StateCard, Scene, Anchor } from '../base/types';

export class StateAgent {
  private model = openai('gpt-4o');

  /**
   * Update the State Card based on the current scene and choice made
   * Following AI SDK best practices with structured output
   */
  async updateStateCard(
    currentStateCard: StateCard,
    newScene: Scene,
    chosenOption: 'A' | 'B',
    allPreviousScenes: Scene[]
  ): Promise<StateCard> {
    const { object: updatedStateCard } = await generateObject({
      model: this.model,
      system: `You are the State Agent for a real-time podcast choose-your-own-adventure episode.

Your job is to maintain the State Card - a living document that tracks the story's evolution.

The State Card has three parts:
1. Story so far - a concise rolling summary of key events
2. Key facts - bullet points about important things that happened (items found, promises made, characters met)
3. Anchors - special memorable elements that can pay off later (e.g., "the mysterious key", "the deal with the stranger")

Guidelines:
- Keep the story summary concise but comprehensive
- Add only truly important facts, not every detail
- Anchors are potential callbacks - things that feel significant for future payoff
- Anchors should expire/be marked as used when they pay off
- Update everything based on the new scene and the choice that was made`,

      schema: z.object({
        storySoFar: z.string().describe('Updated concise summary of the story progression'),
        keyFacts: z.array(z.string()).describe('Important facts and events that have occurred'),
        anchors: z.array(z.object({
          id: z.string().describe('Unique identifier for the anchor'),
          description: z.string().describe('Description of the anchor element'),
          isUsed: z.boolean().describe('Whether this anchor has been used/paid off'),
          createdAtScene: z.number().describe('Scene number where this anchor was introduced')
        })).describe('Special elements that can be referenced or paid off later'),
        reasoning: z.string().describe('Brief explanation of what changed and why')
      }),

      prompt: `Update the State Card based on the new scene and choice made.

CURRENT STATE CARD:
Story so far: ${currentStateCard.storySoFar}
Key facts: ${currentStateCard.keyFacts.join(', ')}
Anchors: ${currentStateCard.anchors.map(a => `${a.description} (Scene ${a.createdAtScene}, ${a.isUsed ? 'used' : 'active'})`).join(', ')}

NEW SCENE (Scene ${newScene.sceneNumber}):
Narration: ${newScene.narration}
Choice A: ${newScene.choiceA}  
Choice B: ${newScene.choiceB}
CHOSEN: Option ${chosenOption}

PREVIOUS SCENES CONTEXT:
${allPreviousScenes.map(scene => `Scene ${scene.sceneNumber}: ${scene.narration.slice(0, 100)}... (Chose: ${scene.chosenOption || 'N/A'})`).join('\n')}

Based on this new scene and the choice made, update the State Card to reflect the current state of the story.`
    });

    return {
      storySoFar: updatedStateCard.storySoFar,
      keyFacts: updatedStateCard.keyFacts,
      themes: [], // Remove themes - handled by LLM naturally
      anchors: updatedStateCard.anchors
    };
  }

  /**
   * Initialize a State Card for a new episode
   */
  async initializeStateCard(premise: string): Promise<StateCard> {
    const { object: initialState } = await generateObject({
      model: this.model,
      system: `You are the State Agent creating the initial State Card for a new choose-your-own-adventure podcast episode.

Create the initial state based on the premise provided. This will be the starting point before any scenes are generated.

Guidelines:
- Story so far should set up the initial situation
- Key facts should include the basic setup information
- Anchors should include any important elements from the premise that might pay off later
- Keep it concise but establish the foundation`,

      schema: z.object({
        storySoFar: z.string().describe('Initial story setup based on the premise'),
        keyFacts: z.array(z.string()).describe('Basic setup facts derived from premise'),
        anchors: z.array(z.object({
          id: z.string(),
          description: z.string(),
          isUsed: z.boolean().default(false),
          createdAtScene: z.number().default(0)
        })).describe('Initial elements from premise that might be important later')
      }),

      prompt: `Create the initial State Card for this episode premise:

PREMISE: ${premise}

Set up the initial state that captures the essence of this premise and prepares for story development.`
    });

    return {
      storySoFar: initialState.storySoFar,
      keyFacts: initialState.keyFacts,
      themes: [], // Remove themes - handled by LLM naturally
      anchors: initialState.anchors
    };
  }

  /**
   * Analyze current state and suggest opportunities for callbacks/anchors
   * This helps the Scene Planner know when to reference past elements
   */
  async suggestCallbackOpportunities(
    stateCard: StateCard,
    upcomingSceneContext: string
  ): Promise<{
    shouldUseCallback: boolean;
    suggestedAnchor?: Anchor;
    callbackType: 'item' | 'character' | 'promise' | 'mystery' | 'none';
    reason: string;
  }> {
    const { object: suggestion } = await generateObject({
      model: this.model,
      system: `You are the State Agent analyzing callback opportunities for a choose-your-own-adventure story.

Review the current State Card and upcoming scene context to determine if now is a good time to pay off an existing anchor (callback).

Good callback opportunities:
- Natural story moments where past elements would logically resurface
- Moments that could benefit from added depth or surprise
- When anchors have been dormant for 2+ scenes
- Climactic or resolution moments

Avoid callbacks when:
- It would feel forced or unnatural
- The story is building to a different climax
- Too many callbacks have happened recently`,

      schema: z.object({
        shouldUseCallback: z.boolean().describe('Whether a callback would enhance this moment'),
        suggestedAnchorId: z.string().optional().describe('ID of the anchor to use for callback'),
        callbackType: z.enum(['item', 'character', 'promise', 'mystery', 'none']).describe('Type of callback opportunity'),
        reason: z.string().describe('Explanation of why this callback opportunity exists or doesnt'),
        naturalIntegration: z.string().optional().describe('How the callback could be naturally integrated')
      }),

      prompt: `Analyze callback opportunities:

CURRENT STATE CARD:
Story so far: ${stateCard.storySoFar}
Key facts: ${stateCard.keyFacts.join(', ')}

ACTIVE ANCHORS:
${stateCard.anchors
  .filter(a => !a.isUsed)
  .map(a => `${a.id}: ${a.description} (introduced scene ${a.createdAtScene})`)
  .join('\n')}

UPCOMING SCENE CONTEXT:
${upcomingSceneContext}

Should any of these anchors be paid off in the upcoming content?`
    });

    const suggestedAnchor = suggestion.suggestedAnchorId 
      ? stateCard.anchors.find(a => a.id === suggestion.suggestedAnchorId)
      : undefined;

    return {
      shouldUseCallback: suggestion.shouldUseCallback,
      suggestedAnchor,
      callbackType: suggestion.callbackType,
      reason: suggestion.reason
    };
  }

  /**
   * Mark an anchor as used when it gets paid off
   */
  markAnchorAsUsed(stateCard: StateCard, anchorId: string): StateCard {
    return {
      ...stateCard,
      anchors: stateCard.anchors.map(anchor => 
        anchor.id === anchorId 
          ? { ...anchor, isUsed: true }
          : anchor
      )
    };
  }

  /**
   * Clean up old or irrelevant anchors to keep the State Card manageable
   */
  async cleanupStateCard(stateCard: StateCard, currentSceneNumber: number): Promise<StateCard> {
    // Remove anchors that are very old (8+ scenes) and unused
    const cleanedAnchors = stateCard.anchors.filter(anchor => {
      const sceneAge = currentSceneNumber - anchor.createdAtScene;
      return anchor.isUsed || sceneAge < 8;
    });

    // Keep only the most recent key facts (limit to 10)
    const recentKeyFacts = stateCard.keyFacts.slice(-10);

    return {
      ...stateCard,
      keyFacts: recentKeyFacts,
      themes: [], // Always empty - themes handled naturally by LLM
      anchors: cleanedAnchors
    };
  }

  /**
   * Get a tool that can be used by other agents to update the state card
   */
  getStateUpdateTool(episodeId: string) {
    return tool({
      description: 'Update the episode state card after a scene',
      parameters: z.object({
        storySoFar: z.string().describe('Updated story summary'),
        newKeyFacts: z.array(z.string()).describe('New important facts to add'),
        newAnchors: z.array(z.object({
          description: z.string(),
          createdAtScene: z.number()
        })).optional().describe('New anchors to add'),
        usedAnchorIds: z.array(z.string()).optional().describe('Anchor IDs that were used in this scene')
      }),
      execute: async ({ storySoFar, newKeyFacts, newAnchors = [], usedAnchorIds = [] }) => {
        // This would typically load the current state, update it, and save back
        // For now, return the structure for the agent to use
        return {
          success: true,
          updatedState: {
            storySoFar,
            newKeyFacts,
            newAnchors: newAnchors.map((anchor, index) => ({
              id: `anchor_${Date.now()}_${index}`,
              description: anchor.description,
              isUsed: false,
              createdAtScene: anchor.createdAtScene
            })),
            usedAnchorIds
          }
        };
      }
    });
  }
}