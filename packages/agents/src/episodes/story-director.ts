import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import type { StateCard } from '../base/types';

/**
 * Story Director Agent - the creative intelligence of the system
 * 
 * This agent analyzes premises and creates the Episode Bible - the complete
 * creative world and guidelines for an entire episode. The Episode Bible is
 * created ONCE per episode and provides all guidance needed for consistent
 * scene generation throughout the entire episode.
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
      style: string; // Allow flexible style descriptions
      tone: string;
      setting: string;
      timeframe: string;
      coreConflict: string;
      worldLogic: string[];
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
    consistencyRules: string[];
    reasoning: string;
  }> {
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
          style: z.string().describe('Creative style that drives all decisions (e.g., "gothic horror", "dark fantasy")'),
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

This Episode Bible will be the creative foundation that ALL other agents use throughout the episode. Make it detailed, consistent, and perfectly suited to create an engaging choose-your-own-adventure podcast experience.

IMPORTANT FORMATTING REQUIREMENTS:
- For enum fields (pacing, complexity, audioIntensityRange), use EXACTLY lowercase values: "fast", "moderate", "slow" (not "Fast", "Moderate", "Slow")
- Include 'consistencyRules' as a TOP-LEVEL array field (not nested inside worldRules)
- Include 'reasoning' as a TOP-LEVEL string field explaining why this Episode Bible perfectly serves the premise

Output structure:
{
  "worldRules": { ... },
  "storytellingGuidelines": { "pacing": "moderate" (lowercase!), ... },
  "characterFramework": { ... },
  "conflictPatterns": { ... },
  "audioDirection": { "audioIntensityRange": "moderate" (lowercase!), ... },
  "storyArcGuidance": { ... },
  "consistencyRules": [...], // TOP-LEVEL array
  "reasoning": "..." // TOP-LEVEL string
}`
    });

    return episodeBible;
  }
}