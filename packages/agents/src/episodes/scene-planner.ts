import { generateObject, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import type { StateCard, Scene, AudioCue } from '../base/types';

export class ScenePlannerAgent {
  private model = openai('gpt-4o');

  /**
   * Generate a new scene with narration and two choices
   * This is the core content generation for the choose-your-own-adventure
   */
  async generateScene(
    premise: string,
    episodeBible: any,
    stateCard: StateCard,
    sceneNumber: number,
    callbackSuggestion?: {
      shouldUseCallback: boolean;
      suggestedAnchor?: any;
      reason: string;
    }
  ): Promise<{
    narration: string;
    choiceA: string;
    choiceB: string;
    stateUpdate: Record<string, any>;
    audioCues: AudioCue[];
  }> {
    const { object: scene } = await generateObject({
      model: this.model,
      system: `You are the Scene Planner for a real-time, AI-driven podcast choose-your-own-adventure episode.

You use the Episode Bible to maintain consistency across all scenes. The Episode Bible contains:
- World rules and setting details
- Storytelling guidelines (tone, pacing, narrative voice)
- Character framework and voice guidelines
- Conflict patterns and escalation approach
- Audio direction for consistent atmosphere
- Story arc guidance and consistency rules

Your job is to create engaging scenes that:
1. STRICTLY follow the Episode Bible's world rules and tone
2. Continue the story naturally from the current state
3. Present meaningful, distinct choices that lead to different consequences
4. Include appropriate audio cues that match the Episode Bible's audio direction
5. Update the story state based on what happens

Scene Creation Guidelines:
- Always reference the Episode Bible for consistency
- Use the narrative voice specified in the Episode Bible
- Maintain the atmosphere keywords from the Episode Bible
- Follow the choice philosophy from the Episode Bible
- Create choices that fit the established world logic
- Include audio cues that match the Episode Bible's audio style and intensity

IMPORTANT: You also direct per-scene audio generation by creating detailed audio cues that the audio agents will use.`,

      schema: z.object({
        narration: z.string().describe('The scene narration that sets up the situation and leads to the choice point'),
        choiceA: z.string().describe('First choice option - should be distinct and meaningful'),
        choiceB: z.string().describe('Second choice option - should offer a different approach/consequence'),
        stateUpdate: z.object({
          newLocation: z.string().optional().describe('New location if the scene changes setting'),
          newCharacters: z.array(z.string()).optional().describe('New characters introduced'),
          obtainedItems: z.array(z.string()).optional().describe('Items or clues obtained'),
          lostItems: z.array(z.string()).optional().describe('Items lost or used'),
          statusChanges: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Character or story status changes (e.g., healthPoints: 75, feelingObserved: true, currentMood: "nervous")')
        }).describe('State changes that occur in this scene'),
        audioCues: z.array(z.object({
          type: z.enum(['music', 'sfx']).describe('Type of audio cue'),
          trigger: z.string().describe('Text marker for the cue (e.g. [SFX=door_creak])'),
          description: z.string().describe('Detailed description of the audio needed'),
          timing: z.number().optional().describe('Timing in seconds from start of narration'),
          priority: z.enum(['low', 'medium', 'high']).describe('Priority level for generation'),
          duration: z.number().optional().describe('Expected duration in seconds'),
          intensity: z.enum(['subtle', 'moderate', 'dramatic']).describe('Audio intensity level'),
          audioDirection: z.string().describe('Specific direction for audio agents based on Episode Bible and scene context')
        })).describe('Detailed audio cues with generation instructions for music and sound effects'),
        reasoning: z.string().describe('Brief explanation of the scene design choices')
      }),

      prompt: `Generate Scene ${sceneNumber} for this episode:

PREMISE: ${premise}

EPISODE BIBLE:
${JSON.stringify(episodeBible, null, 2)}

CURRENT STATE CARD:
Story so far: ${stateCard.storySoFar}
Key facts: ${stateCard.keyFacts.join(', ')}
Active anchors: ${stateCard.anchors.filter(a => !a.isUsed).map(a => a.description).join(', ')}

${callbackSuggestion?.shouldUseCallback ? `
CALLBACK OPPORTUNITY:
${callbackSuggestion.reason}
Consider incorporating: ${callbackSuggestion.suggestedAnchor?.description}
` : ''}

Create an engaging scene that:
1. FOLLOWS the Episode Bible's world rules, tone, and storytelling guidelines
2. Uses the Episode Bible's narrative voice and atmosphere keywords
3. Continues the story naturally from the current state
4. Presents two meaningful choices following the Episode Bible's choice philosophy
5. Creates detailed audio cues with specific direction for the audio agents

AUDIO DIRECTION RESPONSIBILITY:
As the Scene Planner, you direct the audio agents by creating detailed audio cues that:
- Reference the Episode Bible's audio direction and style
- Match the specific atmosphere and intensity of this scene
- Provide clear, actionable instructions for music and SFX generation
- Consider the timing and priority of each audio element
- Enhance the narrative experience for podcast listeners

Remember: This is a live podcast - the narration will be read aloud by a host to guests who will then discuss and choose between the options.

The Episode Bible ensures consistency across ALL scenes in this episode.`
    });

    return {
      narration: scene.narration,
      choiceA: scene.choiceA,
      choiceB: scene.choiceB,
      stateUpdate: scene.stateUpdate,
      audioCues: scene.audioCues
    };
  }

  /**
   * Generate the finale scene when the episode is ending
   */
  async generateFinaleScene(
    premise: string,
    episodeBible: any,
    stateCard: StateCard,
    sceneNumber: number
  ): Promise<{
    narration: string;
    resolution: string;
    audioCues: AudioCue[];
  }> {
    const { object: finale } = await generateObject({
      model: this.model,
      system: `You are the Scene Planner creating the finale for a choose-your-own-adventure podcast episode.

Create a satisfying conclusion that:
1. Resolves the main story threads
2. References key moments and anchors from the journey
3. Provides a sense of completion
4. Ends on a high note appropriate to the story's tone

The finale should wrap up loose ends and give a satisfying conclusion to the adventure.`,

      schema: z.object({
        narration: z.string().describe('The final scene narration that brings the story to its conclusion'),
        resolution: z.string().describe('A brief resolution summary of what was accomplished'),
        audioCues: z.array(z.object({
          type: z.enum(['music', 'sfx']),
          trigger: z.string(),
          description: z.string(),
          timing: z.number().optional(),
          priority: z.enum(['low', 'medium', 'high']).describe('Priority level for generation'),
          duration: z.number().optional().describe('Expected duration in seconds'),
          intensity: z.enum(['subtle', 'moderate', 'dramatic']).describe('Audio intensity level'),
          audioDirection: z.string().describe('Specific direction for audio agents')
        })).describe('Detailed final audio cues with generation instructions'),
        reasoning: z.string().describe('Explanation of how this finale ties together the story elements')
      }),

      prompt: `Create the finale for this episode:

PREMISE: ${premise}

EPISODE BIBLE:
${JSON.stringify(episodeBible, null, 2)}

FINAL STATE CARD:
Story so far: ${stateCard.storySoFar}
Key facts: ${stateCard.keyFacts.join(', ')}
Anchors used: ${stateCard.anchors.filter(a => a.isUsed).map(a => a.description).join(', ')}

Total scenes completed: ${sceneNumber}

Create a finale that:
1. FOLLOWS the Episode Bible's world rules and tone
2. Uses the Episode Bible's narrative voice
3. Provides the type of conclusion specified in the Episode Bible's finale expectation
4. References the story arc progression from the Episode Bible
5. Creates detailed final audio cues with specific direction for audio agents

For the finale audio, direct the audio agents to create:
- Conclusive musical themes that resolve the episode's audio journey
- Final sound effects that punctuate key moments
- Audio elements that enhance the emotional impact of the resolution
- Clear instructions referencing the Episode Bible's audio style

Bring this adventure to a satisfying conclusion that acknowledges the journey and choices made, while staying true to the world and tone established in the Episode Bible.`
    });

    return {
      narration: finale.narration,
      resolution: finale.resolution,
      audioCues: finale.audioCues
    };
  }

  /**
   * Generate audio direction for a scene's audio cues
   * This method can be called to create detailed audio instructions based on Episode Bible + scene context
   */
  async generateAudioDirection(
    episodeBible: any,
    sceneContent: {
      narration: string;
      choiceA: string;
      choiceB: string;
      audioCues: any[];
    },
    sceneNumber: number
  ): Promise<{
    enhancedAudioCues: any[];
    overallAudioConcept: string;
  }> {
    const { object: audioDirection } = await generateObject({
      model: this.model,
      system: `You are the Scene Planner providing enhanced audio direction for this scene.

Using the Episode Bible and scene content, create detailed audio instructions that the audio agents can use to generate music and sound effects that perfectly match this scene's needs.

Your audio direction should:
1. Reference the Episode Bible's audio style and intensity guidelines
2. Match the specific atmosphere and emotion of this scene
3. Provide clear, actionable instructions for audio generation
4. Consider timing, priority, and technical requirements`,

      schema: z.object({
        enhancedAudioCues: z.array(z.object({
          originalCue: z.any().describe('The original audio cue'),
          enhancedDescription: z.string().describe('Enhanced description with more detail'),
          specificInstructions: z.string().describe('Specific instructions for audio agents'),
          episodeBibleReference: z.string().describe('How this relates to the Episode Bible audio direction'),
          technicalNotes: z.string().describe('Technical requirements or suggestions')
        })),
        overallAudioConcept: z.string().describe('The overall audio concept for this scene')
      }),

      prompt: `Enhance audio direction for Scene ${sceneNumber}:

EPISODE BIBLE AUDIO DIRECTION:
${JSON.stringify(episodeBible.audioDirection, null, 2)}

SCENE CONTENT:
Narration: ${sceneContent.narration}
Choice A: ${sceneContent.choiceA}
Choice B: ${sceneContent.choiceB}

CURRENT AUDIO CUES:
${JSON.stringify(sceneContent.audioCues, null, 2)}

Provide enhanced audio direction that will help the audio agents create perfect music and sound effects for this scene.`
    });

    return audioDirection;
  }

  /**
   * Get a tool for other agents to request scene generation
   */
  getSceneGenerationTool() {
    return tool({
      description: 'Generate a new scene with narration and choices',
      parameters: z.object({
        premise: z.string().describe('The episode premise'),
        stateCard: z.object({
          storySoFar: z.string(),
          keyFacts: z.array(z.string()),
          anchors: z.array(z.object({
            id: z.string(),
            description: z.string(),
            isUsed: z.boolean(),
            createdAtScene: z.number()
          }))
        }).describe('Current state of the episode'),
        sceneNumber: z.number().describe('The scene number to generate'),
        callbackAnchor: z.object({
          id: z.string(),
          description: z.string()
        }).optional().describe('Optional anchor to incorporate as callback')
      }),
      execute: async ({ premise, stateCard, sceneNumber, callbackAnchor }) => {
        try {
          const callbackSuggestion = callbackAnchor ? {
            shouldUseCallback: true,
            suggestedAnchor: callbackAnchor,
            reason: `Incorporating callback: ${callbackAnchor.description}`
          } : undefined;

          const scene = await this.generateScene(
            premise, 
            stateCard, 
            sceneNumber, 
            callbackSuggestion
          );

          return {
            success: true,
            scene
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate scene'
          };
        }
      }
    });
  }

  /**
   * Analyze and improve scene choices based on feedback
   * This can be used for quality control
   */
  async improveSceneChoices(
    narration: string,
    choiceA: string,
    choiceB: string,
    feedback: string
  ): Promise<{
    improvedChoiceA: string;
    improvedChoiceB: string;
    reasoning: string;
  }> {
    const { object: improved } = await generateObject({
      model: this.model,
      system: `You are the Scene Planner improving choice options based on feedback.

Good choices should:
- Be meaningfully different from each other
- Both be reasonable options a person might choose
- Lead to different consequences/story branches
- Be clear and well-written
- Fit naturally with the narration`,

      schema: z.object({
        improvedChoiceA: z.string().describe('Improved version of choice A'),
        improvedChoiceB: z.string().describe('Improved version of choice B'),
        reasoning: z.string().describe('Explanation of the improvements made')
      }),

      prompt: `Improve these scene choices based on the feedback provided:

NARRATION:
${narration}

CURRENT CHOICES:
A) ${choiceA}
B) ${choiceB}

FEEDBACK:
${feedback}

Provide improved versions that address the feedback while maintaining the story flow.`
    });

    return improved;
  }
}