import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import type { EpisodeBible, AudioCue } from '../base/types';

/**
 * SFX Generation Schema following ElevenLabs Sound Effects API best practices
 */
const SFXSchema = z.object({
  soundEffects: z.array(z.object({
    text: z.string().describe('Text description for ElevenLabs Sound Effects API'),
    trigger: z.string().describe('Trigger text embedded in narration (e.g., "[SFX=door_creak]")'),
    durationSeconds: z.number().min(0.5).max(30).optional().nullable().describe('Duration 0.5-30 seconds, or null for auto'),
    promptInfluence: z.number().min(0).max(1).default(0.3).describe('How strictly to follow prompt (0.3 default)'),
    loop: z.boolean().default(false).describe('Whether SFX should loop seamlessly'),
    timing: z.number().describe('When to trigger the SFX (seconds from scene start)'),
    priority: z.enum(['low', 'medium', 'high']).describe('Generation priority'),
    category: z.enum(['simple', 'complex', 'musical', 'ambient', 'impact', 'one-shot']).describe('SFX type category')
  })).max(8).describe('Maximum 8 SFX per scene to avoid audio clutter')
});

/**
 * SFX Agent - Specialized for ElevenLabs Sound Effects API
 * 
 * This agent creates sound effects using the ElevenLabs textToSoundEffects API
 * following best practices for podcast audio enhancement.
 */
export class SFXAgent {
  private model = openai('gpt-4o-mini');

  /**
   * Generate sound effects for a scene based on narration analysis
   * Following ElevenLabs Sound Effects API best practices
   */
  async generateSceneSFX(
    episodeBible: EpisodeBible,
    narration: string,
    sceneNumber: number
  ): Promise<AudioCue[]> {
    const result = await generateObject({
      model: this.model,
      schema: SFXSchema,
      system: `You are an SFX Agent specialized in creating sound effects for podcast episodes using ElevenLabs Sound Effects API.

ELEVENLABS SOUND EFFECTS API BEST PRACTICES:
1. **Clear Descriptions**: Use specific, actionable text (e.g., "Heavy wooden door creaking open")
2. **Duration Control**: Set 0.5-30 seconds, or leave null for auto-detection
3. **Prompt Influence**: 0.3 default, higher for literal interpretation, lower for creative variation
4. **Looping**: Enable for ambient/atmospheric sounds that need to repeat
5. **Audio Terminology**: Use professional terms (impact, whoosh, ambience, one-shot, etc.)

SFX CATEGORIES:
- **Simple**: Basic single-event sounds ("Glass shattering", "Thunder rumble")
- **Complex**: Multi-part sequences ("Footsteps on gravel, then door opens")
- **Musical**: Rhythmic elements ("90s drum loop, 90 BPM")
- **Ambient**: Background atmosphere ("Wind whistling through trees")
- **Impact**: Collision sounds ("Sword clashing with blade")
- **One-shot**: Single, non-repeating sound effects

EPISODE BIBLE SFX GUIDANCE:
- Genre: ${episodeBible.worldRules.genre}
- Style: ${episodeBible.worldRules.style}
- Audio Style: ${episodeBible.audioDirection.musicStyle}
- Atmosphere: ${episodeBible.storytellingGuidelines.atmosphereKeywords.join(', ')}
- SFX Intensity: ${episodeBible.audioDirection.sfxIntensity || 'moderate'}

PODCAST SFX REQUIREMENTS:
- Enhance narration without overwhelming it
- Clear audio separation from background music
- Professional quality for podcast mixing
- Support story immersion and atmosphere

AUDIO TERMINOLOGY TO USE:
- Impact: Collision sounds (subtle taps to dramatic crashes)
- Whoosh: Air movement effects (fast/ghostly to slow-spinning)
- Ambience: Environmental background sounds
- One-shot: Single, non-repeating sound
- Braam: Big brassy cinematic hit for dramatic moments
- Glitch: Malfunction/erratic movement sounds
- Drone: Continuous atmospheric textures

Analyze narration and create 3-8 targeted sound effects using proper ElevenLabs terminology.`,

      prompt: `Analyze Scene ${sceneNumber} narration and generate ElevenLabs Sound Effects API calls:

SCENE NARRATION:
"${narration}"

Create sound effects that:
1. Use clear, specific text descriptions optimized for ElevenLabs SFX API
2. Follow the Episode Bible's genre (${episodeBible.worldRules.genre}) and atmosphere
3. Include appropriate duration settings (0.5-30 seconds or auto)
4. Use proper prompt influence (0.3 default, adjust if needed)
5. Set looping for ambient sounds that should repeat
6. Include professional audio terminology
7. Time appropriately to avoid audio clutter

Focus on the most impactful moments where sound effects genuinely enhance the story experience.`
    });

    return result.object.soundEffects.map(sfx => ({
      type: 'sfx' as const,
      trigger: sfx.trigger,
      description: sfx.text, // This is what goes to ElevenLabs API
      timing: sfx.timing,
      metadata: {
        elevenLabsText: sfx.text,
        durationSeconds: sfx.durationSeconds,
        promptInfluence: sfx.promptInfluence,
        loop: sfx.loop,
        priority: sfx.priority,
        category: sfx.category,
        agent: 'SFXAgent',
        sceneNumber
      }
    }));
  }

  /**
   * Generate ambient soundscape using looping capability
   */
  async generateAmbientSoundscape(
    episodeBible: EpisodeBible,
    sceneLocation: string,
    sceneAtmosphere: string
  ): Promise<AudioCue> {
    const result = await generateObject({
      model: this.model,
      schema: z.object({
        ambientSound: z.object({
          text: z.string().describe('ElevenLabs SFX API text for ambient sound'),
          durationSeconds: z.number().min(15).max(30).describe('Duration for seamless looping'),
          promptInfluence: z.number().min(0).max(1).default(0.2).describe('Lower for more natural variation')
        })
      }),
      system: `Create ambient soundscape using ElevenLabs Sound Effects API with looping enabled.

EPISODE BIBLE CONTEXT:
- Genre: ${episodeBible.worldRules.genre}
- Style: ${episodeBible.worldRules.style}
- Atmosphere: ${episodeBible.storytellingGuidelines.atmosphereKeywords.join(', ')}

LOOPING BEST PRACTICES:
- Generate 15-30 seconds for seamless repetition
- Use terms like "ambience", "drone", "atmospheric texture"
- Lower prompt influence (0.2) for natural variation
- Focus on continuous, non-percussive sounds

Create subtle background atmosphere that establishes location without interfering with narration.`,

      prompt: `Create looping ambient soundscape for:

LOCATION: "${sceneLocation}"
ATMOSPHERE: "${sceneAtmosphere}"

Generate continuous atmospheric sound using ElevenLabs terminology, optimized for seamless looping.`
    });

    const ambient = result.object.ambientSound;

    return {
      type: 'sfx',
      trigger: '[SFX=ambient_background]',
      description: ambient.text,
      timing: 0,
      metadata: {
        elevenLabsText: ambient.text,
        durationSeconds: ambient.durationSeconds,
        promptInfluence: ambient.promptInfluence,
        loop: true, // Enable looping for ambient
        priority: 'low',
        category: 'ambient',
        agent: 'SFXAgent',
        isAmbient: true
      }
    };
  }

  /**
   * Generate impactful one-shots for dramatic moments
   */
  async generateDramaticImpacts(
    episodeBible: EpisodeBible,
    dramaticMoments: string[]
  ): Promise<AudioCue[]> {
    const result = await generateObject({
      model: this.model,
      schema: z.object({
        impacts: z.array(z.object({
          text: z.string(),
          trigger: z.string(),
          durationSeconds: z.number().min(0.5).max(5).describe('Short impact duration'),
          promptInfluence: z.number().min(0.5).max(1).describe('High influence for precise impact')
        }))
      }),
      system: `Create dramatic impact sound effects for key story moments.

EPISODE BIBLE CONTEXT:
- Genre: ${episodeBible.worldRules.genre}
- Audio Style: ${episodeBible.audioDirection.musicStyle}

IMPACT SFX BEST PRACTICES:
- Use "impact", "hit", "crash", "slam" terminology
- Short duration (0.5-5 seconds) for punch
- High prompt influence (0.5-1.0) for precise control
- Consider genre-appropriate impacts (cinematic braam for drama, etc.)

Generate impactful one-shot sound effects that punctuate key story moments.`,

      prompt: `Create dramatic impacts for these moments:
${dramaticMoments.map((moment, i) => `${i + 1}. "${moment}"`).join('\n')}

Generate precise, impactful sound effects using ElevenLabs terminology.`
    });

    return result.object.impacts.map((impact, index) => ({
      type: 'sfx' as const,
      trigger: impact.trigger,
      description: impact.text,
      timing: index * 10, // Space out impacts
      metadata: {
        elevenLabsText: impact.text,
        durationSeconds: impact.durationSeconds,
        promptInfluence: impact.promptInfluence,
        loop: false,
        priority: 'high',
        category: 'impact',
        agent: 'SFXAgent',
        isImpact: true
      }
    }));
  }

  /**
   * Generate musical elements for transitions
   */
  async generateMusicalTransitions(
    episodeBible: EpisodeBible,
    transitionType: 'scene-change' | 'time-jump' | 'mood-shift'
  ): Promise<AudioCue> {
    const result = await generateObject({
      model: this.model,
      schema: z.object({
        musicalElement: z.object({
          text: z.string().describe('Musical SFX description with BPM and key'),
          durationSeconds: z.number().min(2).max(15).describe('Transition duration'),
          promptInfluence: z.number().min(0.4).max(0.8).describe('Balanced musical control')
        })
      }),
      system: `Create musical transition elements using ElevenLabs Sound Effects API.

EPISODE BIBLE MUSICAL GUIDANCE:
- Music Style: ${episodeBible.audioDirection.musicStyle}
- Genre: ${episodeBible.worldRules.genre}

MUSICAL SFX BEST PRACTICES:
- Include BPM, key signature, and instrument details
- Use terms like "stab", "sting", "sweep", "rise"
- Specify musical genre and style
- Medium prompt influence for musical coherence

Generate brief musical transitions that bridge story moments.`,

      prompt: `Create musical transition element for: ${transitionType}

Generate a brief musical sound effect that smoothly transitions between story moments, following the Episode Bible's musical style.`
    });

    const musical = result.object.musicalElement;

    return {
      type: 'sfx',
      trigger: `[SFX=musical_${transitionType.replace('-', '_')}]`,
      description: musical.text,
      timing: 0,
      metadata: {
        elevenLabsText: musical.text,
        durationSeconds: musical.durationSeconds,
        promptInfluence: musical.promptInfluence,
        loop: false,
        priority: 'medium',
        category: 'musical',
        agent: 'SFXAgent',
        transitionType
      }
    };
  }

  /**
   * Analyze narration and suggest optimal SFX opportunities
   */
  async analyzeSFXOpportunities(
    narration: string,
    episodeBible: EpisodeBible
  ): Promise<{
    opportunities: Array<{
      textSnippet: string;
      suggestedSFX: string;
      category: 'simple' | 'complex' | 'musical' | 'ambient' | 'impact';
      reasoning: string;
      priority: 'low' | 'medium' | 'high';
      estimatedDuration: number;
    }>;
    overallRecommendation: string;
  }> {
    const result = await generateObject({
      model: this.model,
      schema: z.object({
        opportunities: z.array(z.object({
          textSnippet: z.string(),
          suggestedSFX: z.string(),
          category: z.enum(['simple', 'complex', 'musical', 'ambient', 'impact', 'one-shot']),
          reasoning: z.string(),
          priority: z.enum(['low', 'medium', 'high']),
          estimatedDuration: z.number()
        })),
        overallRecommendation: z.string()
      }),
      system: `Analyze narration text to identify optimal ElevenLabs Sound Effects opportunities.

EPISODE BIBLE CONTEXT:
- Genre: ${episodeBible.worldRules.genre}
- Atmosphere: ${episodeBible.storytellingGuidelines.atmosphereKeywords.join(', ')}

ANALYSIS CRITERIA:
1. Explicit actions that would benefit from sound reinforcement
2. Environmental details that establish atmosphere
3. Emotional moments that need punctuation
4. Transitions that require audio bridges

Use ElevenLabs terminology and consider API limitations (0.5-30 seconds, etc.).`,

      prompt: `Analyze this narration for ElevenLabs Sound Effects opportunities:

"${narration}"

Identify moments where sound effects would genuinely enhance the listening experience, using proper ElevenLabs API terminology and duration constraints.`
    });

    return result.object;
  }

  /**
   * Create comprehensive SFX plan for scene
   */
  async createSceneSFXPlan(
    episodeBible: EpisodeBible,
    narration: string,
    estimatedSceneDuration: number
  ): Promise<{
    sfxPlan: AudioCue[];
    totalSFXDuration: number;
    audioBalance: string;
    implementation: {
      narrationWithTriggers: string;
      elevenlabsCalls: Array<{
        text: string;
        duration_seconds?: number;
        prompt_influence?: number;
        loop?: boolean;
      }>;
    };
  }> {
    // Generate the SFX plan
    const sfxPlan = await this.generateSceneSFX(episodeBible, narration, 1);
    
    // Calculate total SFX duration
    const totalSFXDuration = sfxPlan.reduce((total, sfx) => {
      const duration = sfx.metadata?.durationSeconds || 3; // Default 3 seconds if auto
      return total + duration;
    }, 0);

    // Create implementation details
    let narrationWithTriggers = narration;
    const elevenlabsCalls = [];

    for (const sfx of sfxPlan) {
      // Add trigger to narration
      narrationWithTriggers += ` ${sfx.trigger}`;
      
      // Create ElevenLabs API call
      const apiCall: any = {
        text: sfx.metadata?.elevenLabsText || sfx.description
      };
      
      if (sfx.metadata?.durationSeconds) {
        apiCall.duration_seconds = sfx.metadata.durationSeconds;
      }
      if (sfx.metadata?.promptInfluence !== 0.3) {
        apiCall.prompt_influence = sfx.metadata?.promptInfluence;
      }
      if (sfx.metadata?.loop) {
        apiCall.loop = true;
      }
      
      elevenlabsCalls.push(apiCall);
    }

    // Analyze audio balance
    const sfxRatio = totalSFXDuration / estimatedSceneDuration;
    const audioBalance = sfxRatio > 0.3 
      ? 'Heavy SFX usage - consider reducing for better narration clarity'
      : sfxRatio > 0.15
        ? 'Balanced SFX usage - good enhancement without overwhelming'
        : 'Light SFX usage - appropriate for dialogue-heavy scenes';

    return {
      sfxPlan,
      totalSFXDuration,
      audioBalance,
      implementation: {
        narrationWithTriggers,
        elevenlabsCalls
      }
    };
  }
}