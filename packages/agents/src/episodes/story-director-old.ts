import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import type { StateCard } from '../base/types';

/**
 * Story Director Agent - the creative intelligence of the system
 * 
 * This agent analyzes premises, sets creative direction, provides rich context
 * to other agents, and ensures story quality and coherence. The orchestrator
 * delegates to this agent for all creative decision-making.
 */
export class StoryDirectorAgent {
  private model = openai('gpt-4o');

  /**
   * Create comprehensive Episode Bible - the creative world and guidelines for the entire episode
   * This is called ONCE per episode and provides all guidance needed for consistent scene generation
   */
  async createEpisodeBible(premise: string): Promise<{
    worldRules: {
      genre: string;
      style: string; // horror, fantasy, noir, comedy, mystery, adventure
      tone: string; // dark, whimsical, intense, lighthearted, suspenseful
      setting: string;
      timeframe: string;
      coreConflict: string;
      worldLogic: string[]; // Rules that govern this world
    };
    storytellingGuidelines: {
      narrativeVoice: string;
      pacing: 'fast' | 'moderate' | 'slow';
      complexity: 'simple' | 'moderate' | 'complex';
      atmosphereKeywords: string[];
      choicePhilosophy: string;
      sceneStructureNotes: string;
    };
    characterFramework: {
      protagonistTypes: string[];
      antagonistTypes: string[];
      supportingTypes: string[];
      characterVoiceGuidelines: string;
    };
    conflictPatterns: {
      typicalConflicts: string[];
      escalationPattern: string;
      resolutionApproach: string;
    };
    audioDirection: {
      musicStyle: string;
      commonSFXTypes: string[];
      audioIntensityRange: 'subtle' | 'moderate' | 'dramatic';
      atmosphereNotes: string;
    };
    storyArcGuidance: {
      expectedProgression: string;
      keyFactTypes: string[];
      likelyAnchorTypes: string[];
      finaleExpectation: string;
    };
    consistencyRules: string[]; // Rules to maintain throughout episode
    reasoning: string;
  }>
    const { object: episodeBible } = await generateObject({
      model: this.model,
      system: `You are the Story Director creating an Episode Bible - the complete creative world and guidelines for a choose-your-own-adventure podcast episode.

Your Episode Bible will be used by ALL other agents throughout the ENTIRE episode to maintain consistency. You create this ONCE and it guides everything.

The Episode Bible defines:
1. WORLD RULES - The universe, setting, logic, and core conflict
2. STORYTELLING GUIDELINES - How scenes should be structured and narrated
3. CHARACTER FRAMEWORK - Types of characters and how they should behave
4. CONFLICT PATTERNS - How tensions escalate and resolve
5. AUDIO DIRECTION - Musical and sound design approach
6. STORY ARC GUIDANCE - Expected progression and finale approach
7. CONSISTENCY RULES - Rules that MUST be maintained throughout

This is for a live podcast where:
- Guests discuss choices together after each scene
- Host reads narration aloud with dramatic effect
- Story unfolds in real-time with choices affecting future scenes
- Audio elements enhance the atmosphere
- Episodes run 30-45 minutes typically

Create a comprehensive bible that ensures every scene feels like part of the same cohesive world.`,

      schema: z.object({
        worldRules: z.object({
          genre: z.string().describe('Primary genre (thriller, fantasy, sci-fi, etc.)'),
          style: z.enum(['horror', 'fantasy', 'noir', 'comedy', 'mystery', 'adventure', 'drama', 'sci-fi']).describe('Style that drives all creative decisions'),
          tone: z.string().describe('Overall emotional tone and atmosphere to maintain'),
          setting: z.string().describe('Where and when this story takes place'),
          timeframe: z.string().describe('Historical period, season, time constraints'),
          coreConflict: z.string().describe('The central tension driving the entire episode'),
          worldLogic: z.array(z.string()).describe('Fundamental rules that govern how this world works')
        }),
        storytellingGuidelines: z.object({
          narrativeVoice: z.string().describe('How all narration should be written and delivered'),
          pacing: z.enum(['fast', 'moderate', 'slow']).describe('How quickly events should unfold'),
          complexity: z.enum(['simple', 'moderate', 'complex']).describe('Narrative complexity level'),
          atmosphereKeywords: z.array(z.string()).describe('Key atmospheric elements to weave throughout'),
          choicePhilosophy: z.string().describe('What makes choices meaningful in this story'),
          sceneStructureNotes: z.string().describe('How scenes should be structured for maximum impact')
        }),
        characterFramework: z.object({
          protagonistTypes: z.array(z.string()).describe('Types of main characters that fit this world'),
          antagonistTypes: z.array(z.string()).describe('Types of opposing forces/characters'),
          supportingTypes: z.array(z.string()).describe('Types of supporting characters'),
          characterVoiceGuidelines: z.string().describe('How characters should speak and behave')
        }),
        conflictPatterns: z.object({
          typicalConflicts: z.array(z.string()).describe('Types of conflicts that naturally arise'),
          escalationPattern: z.string().describe('How tensions should build throughout the episode'),
          resolutionApproach: z.string().describe('How conflicts should typically resolve')
        }),
        audioDirection: z.object({
          musicStyle: z.string().describe('Musical style and instrumentation approach'),
          commonSFXTypes: z.array(z.string()).describe('Types of sound effects that will be common'),
          audioIntensityRange: z.enum(['subtle', 'moderate', 'dramatic']).describe('Range of audio intensity to use'),
          atmosphereNotes: z.string().describe('How audio should enhance the story atmosphere')
        }),
        storyArcGuidance: z.object({
          expectedProgression: z.string().describe('How the story should develop from beginning to end'),
          keyFactTypes: z.array(z.string()).describe('What kinds of facts are most important to track'),
          likelyAnchorTypes: z.array(z.string()).describe('What kinds of callback opportunities will emerge'),
          finaleExpectation: z.string().describe('How this story should conclude satisfyingly')
        }),
        consistencyRules: z.array(z.string()).describe('Critical rules that must be maintained throughout the entire episode'),
        reasoning: z.string().describe('Detailed analysis of why this Episode Bible serves the premise perfectly')
      }),

      prompt: `Create a comprehensive Episode Bible for this premise:

PREMISE: ${premise}

Analyze this premise deeply and create the complete creative world and guidelines that will govern the ENTIRE episode. Consider:

- What world does this premise suggest?
- What kinds of characters and conflicts naturally arise?
- What tone and atmosphere best serve this premise?
- How should the story progress and conclude?
- What rules must be consistent throughout?

This Episode Bible will be the creative foundation that ALL other agents use throughout the episode. Make it detailed, consistent, and perfectly suited to create an engaging choose-your-own-adventure podcast experience.`
    });

    return episodeBible;
  }

  // NOTE: Per-scene direction methods removed in favor of Episode Bible approach
  // The Episode Bible contains all creative guidance needed for consistent scene generation
}
      model: this.model,
      system: `You are the Story Director providing specific creative direction for scene generation.

Based on the established story direction and current state, provide detailed guidance for the Scene Planner agent. Consider:

- Where we are in the story arc
- What this scene needs to accomplish
- How it should feel and flow
- What makes choices meaningful in this context
- How to maintain consistency with established direction

Your direction will guide the Scene Planner to create content that serves the overall story vision.`,

      schema: z.object({
        sceneDirection: z.object({
          focus: z.enum(['character', 'action', 'atmosphere', 'mystery', 'dialogue']).describe('Primary focus for this scene'),
          intensity: z.enum(['low', 'medium', 'high']).describe('Emotional/dramatic intensity level'),
          purposeInStory: z.string().describe('What this scene should accomplish in the overall narrative'),
          narrativeGoals: z.array(z.string()).describe('Specific goals this scene should achieve')
        }),
        contextualGuidance: z.object({
          settingEmphasis: z.string().describe('How to handle setting and environment'),
          characterGuidance: z.string().describe('Character development or interaction guidance'),
          choiceGuidance: z.string().describe('How to structure meaningful choices'),
          atmosphereNotes: z.string().describe('Atmospheric elements to emphasize')
        }),
        qualityCriteria: z.object({
          mustInclude: z.array(z.string()).describe('Elements that must be in this scene'),
          shouldAvoid: z.array(z.string()).describe('Things to avoid in this scene'),
          successMetrics: z.array(z.string()).describe('How to judge if the scene succeeds')
        })
      }),

      prompt: `Provide creative direction for Scene ${sceneNumber}:

STORY DIRECTION:
Style: ${storyDirection.style}
Tone: ${storyDirection.tone}
Pacing: ${storyDirection.pacing}

CURRENT STATE:
Story so far: ${stateCard.storySoFar}
Key facts: ${stateCard.keyFacts.join(', ')}
Active anchors: ${stateCard.anchors.filter(a => !a.isUsed).map(a => a.description).join(', ')}

${callbackSuggestion ? `CALLBACK OPPORTUNITY: ${callbackSuggestion.reason}` : ''}

What creative direction should guide the Scene Planner for this specific scene?`
    });

    return direction;
  }

  /**
   * Evaluate and provide feedback on generated content
   */
  async evaluateStoryQuality(
    storyDirection: any,
    stateCard: StateCard,
    generatedContent: {
      narration: string;
      choiceA: string;
      choiceB: string;
    }
  ): Promise<{
    qualityAssessment: {
      overallScore: number; // 1-10
      consistencyScore: number; // 1-10
      engagementScore: number; // 1-10
      choiceQualityScore: number; // 1-10
    };
    feedback: {
      strengths: string[];
      improvements: string[];
      specificSuggestions: string[];
    };
    approval: 'approved' | 'needs_revision' | 'needs_major_revision';
    revisionGuidance?: string;
  }> {
    const { object: evaluation } = await generateObject({
      model: this.model,
      system: `You are the Story Director evaluating generated content for quality and consistency.

Assess the generated scene content against:
1. Adherence to established story direction
2. Quality of writing and engagement
3. Meaningfulness and balance of choices
4. Consistency with established story state
5. Suitability for live podcast format

Provide constructive feedback that can guide revisions if needed.`,

      schema: z.object({
        qualityAssessment: z.object({
          overallScore: z.number().min(1).max(10).describe('Overall quality score'),
          consistencyScore: z.number().min(1).max(10).describe('Consistency with story direction'),
          engagementScore: z.number().min(1).max(10).describe('How engaging and compelling it is'),
          choiceQualityScore: z.number().min(1).max(10).describe('Quality and meaningfulness of choices')
        }),
        feedback: z.object({
          strengths: z.array(z.string()).describe('What works well in this content'),
          improvements: z.array(z.string()).describe('Areas that could be improved'),
          specificSuggestions: z.array(z.string()).describe('Specific suggestions for enhancement')
        }),
        approval: z.enum(['approved', 'needs_revision', 'needs_major_revision']).describe('Whether content is ready to use'),
        revisionGuidance: z.string().optional().describe('Specific guidance for revisions if needed')
      }),

      prompt: `Evaluate this generated content:

ESTABLISHED DIRECTION:
Style: ${storyDirection.style}
Tone: ${storyDirection.tone}

CURRENT STORY STATE:
${stateCard.storySoFar}

GENERATED CONTENT:
Narration: ${generatedContent.narration}

Choice A: ${generatedContent.choiceA}
Choice B: ${generatedContent.choiceB}

Assess quality, consistency, and provide feedback for improvement if needed.`
    });

    return evaluation;
  }

  /**
   * Analyze story progression and suggest strategic adjustments
   */
  async analyzeStoryProgression(
    storyDirection: any,
    stateCard: StateCard,
    sceneNumber: number,
    targetLength: number = 8 // Target episode length in scenes
  ): Promise<{
    progressionAnalysis: {
      storyArcPosition: 'opening' | 'rising_action' | 'climax_building' | 'climax' | 'resolution';
      pacingAssessment: 'too_slow' | 'good' | 'too_fast';
      tensionLevel: 'low' | 'medium' | 'high';
      engagementTrend: 'increasing' | 'steady' | 'decreasing';
    };
    strategicGuidance: {
      upcomingSceneFocus: string[];
      anchorUsagePriority: string[];
      pacingAdjustments: string[];
      thematicEmphasis: string[];
    };
    climaxTrigger: {
      shouldTriggerClimax: boolean;
      climaxReadiness: number; // 0-10
      climaxTriggerConditions: string[];
    };
  }> {
    const { object: analysis } = await generateObject({
      model: this.model,
      system: `You are the Story Director analyzing overall story progression and providing strategic guidance.

Consider the story's position in its arc, pacing, and how to guide future scenes toward a satisfying conclusion. Provide strategic direction for the orchestrator to use in planning upcoming scenes.`,

      schema: z.object({
        progressionAnalysis: z.object({
          storyArcPosition: z.enum(['opening', 'rising_action', 'climax_building', 'climax', 'resolution']).describe('Where we are in the story arc'),
          pacingAssessment: z.enum(['too_slow', 'good', 'too_fast']).describe('How the pacing feels'),
          tensionLevel: z.enum(['low', 'medium', 'high']).describe('Current tension/stakes level'),
          engagementTrend: z.enum(['increasing', 'steady', 'decreasing']).describe('How engagement is trending')
        }),
        strategicGuidance: z.object({
          upcomingSceneFocus: z.array(z.string()).describe('What upcoming scenes should focus on'),
          anchorUsagePriority: z.array(z.string()).describe('Which anchors should be prioritized for callbacks'),
          pacingAdjustments: z.array(z.string()).describe('How to adjust pacing if needed'),
          thematicEmphasis: z.array(z.string()).describe('Thematic elements to emphasize')
        }),
        climaxTrigger: z.object({
          shouldTriggerClimax: z.boolean().describe('Whether we should move toward climax soon'),
          climaxReadiness: z.number().min(0).max(10).describe('How ready the story is for climax'),
          climaxTriggerConditions: z.array(z.string()).describe('What conditions suggest climax timing')
        })
      }),

      prompt: `Analyze story progression:

STORY DIRECTION:
Style: ${storyDirection.style}
Expected arc: ${storyDirection.stateCardPriorities.storyArcExpectation}

CURRENT STATE (Scene ${sceneNumber}/${targetLength}):
Story so far: ${stateCard.storySoFar}
Key facts: ${stateCard.keyFacts.join(', ')}
Active anchors: ${stateCard.anchors.filter(a => !a.isUsed).map(a => a.description).join(', ')}

How is the story progressing and what strategic guidance should shape upcoming scenes?`
    });

    return analysis;
  }

  /**
   * Generate creative direction for audio elements
   */
  async directAudioCreation(
    storyDirection: any,
    sceneContent: string,
    sceneType: 'opening' | 'action' | 'dialogue' | 'climax' | 'resolution',
    currentTension: 'low' | 'medium' | 'high'
  ): Promise<{
    musicDirection: {
      style: string;
      mood: string;
      instruments: string[];
      tempo: 'slow' | 'moderate' | 'fast';
      intensity: 'subtle' | 'moderate' | 'dramatic';
    };
    sfxDirection: {
      prioritySounds: string[];
      atmosphericElements: string[];
      intensityLevel: 'subtle' | 'moderate' | 'dramatic';
      timingGuidance: string;
    };
    overallAudioConcept: string;
  }> {
    const { object: direction } = await generateObject({
      model: this.model,
      system: `You are the Story Director providing creative direction for audio generation.

Based on the story style, scene content, and current tension, provide detailed direction for the Audio Workers to create music and sound effects that enhance the narrative experience.`,

      schema: z.object({
        musicDirection: z.object({
          style: z.string().describe('Musical style that fits the scene'),
          mood: z.string().describe('Emotional mood the music should convey'),
          instruments: z.array(z.string()).describe('Key instruments or sounds to feature'),
          tempo: z.enum(['slow', 'moderate', 'fast']).describe('Tempo that matches scene pacing'),
          intensity: z.enum(['subtle', 'moderate', 'dramatic']).describe('How prominent the music should be')
        }),
        sfxDirection: z.object({
          prioritySounds: z.array(z.string()).describe('Most important sound effects for this scene'),
          atmosphericElements: z.array(z.string()).describe('Ambient sounds that support atmosphere'),
          intensityLevel: z.enum(['subtle', 'moderate', 'dramatic']).describe('Overall SFX intensity'),
          timingGuidance: z.string().describe('Guidance on when sounds should occur')
        }),
        overallAudioConcept: z.string().describe('The complete audio concept for this scene')
      }),

      prompt: `Provide audio direction for this scene:

STORY STYLE: ${storyDirection.style}
AUDIO APPROACH: ${storyDirection.audioDirection.musicStyle} (${storyDirection.audioDirection.intensityLevel})
SCENE TYPE: ${sceneType}
CURRENT TENSION: ${currentTension}

SCENE CONTENT:
${sceneContent}

What audio elements will best support this scene's narrative impact?`
    });

    return direction;
  }
}