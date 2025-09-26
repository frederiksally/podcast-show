import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import type { EpisodeBible, AudioCue } from '../base/types';

/**
 * Music Generation Schema following ElevenLabs best practices
 */
const MusicTrackSchema = z.object({
  prompt: z.string().describe('Detailed ElevenLabs-optimized prompt for music generation'),
  duration: z.number().min(10000).max(300000).describe('Duration in milliseconds (10s-5min for scenes)'),
  isInstrumental: z.boolean().describe('Whether track should be instrumental only (true for podcast background)'),
  priority: z.enum(['low', 'medium', 'high']).describe('Generation priority'),
  trigger: z.string().describe('Audio trigger for scene integration'),
  description: z.string().describe('Human-readable description of the music')
});

/**
 * Music Agent - Specialized for ElevenLabs Music API integration
 * 
 * This agent creates music for individual scenes (max 5 minutes) using ElevenLabs
 * best practices for podcast episode background music.
 */
export class MusicAgent {
  private model = openai('gpt-4o-mini');

  /**
   * Generate background music for a single scene
   * Following ElevenLabs best practices for podcast background music
   */
  async generateSceneMusic(
    episodeBible: EpisodeBible,
    narration: string,
    sceneNumber: number,
    estimatedDurationSeconds: number = 180 // Default 3 minutes
  ): Promise<AudioCue> {
    const result = await generateObject({
      model: this.model,
      schema: MusicTrackSchema,
      system: `You are a Music Agent specialized in creating background music for podcast episodes using ElevenLabs Music API.

ELEVENLABS MUSIC API BEST PRACTICES:
1. **Instrumental Only**: Always add "instrumental only" to prompts for podcast background music
2. **Detailed Musical Language**: Use specific musical terms (BPM, key, instruments, style)
3. **Genre Adherence**: The model strongly follows genre conventions
4. **Tempo Control**: Specify BPM for better control (e.g., "90 BPM", "120-130 BPM")
5. **Key Signature**: Include musical keys when relevant (e.g., "in A minor", "in C major")
6. **Emotional Descriptors**: Use both abstract mood and detailed musical language
7. **Length Control**: Specify duration clearly

EPISODE BIBLE MUSICAL GUIDANCE:
- Music Style: ${episodeBible.audioDirection.musicStyle}
- Music Mood: ${episodeBible.audioDirection.musicMood}
- Style Notes: ${episodeBible.audioDirection.styleNotes}
- Genre: ${episodeBible.worldRules.genre}
- Atmosphere Keywords: ${episodeBible.storytellingGuidelines.atmosphereKeywords.join(', ')}

PODCAST BACKGROUND MUSIC REQUIREMENTS:
- Must be instrumental (no vocals that compete with narration)
- Should enhance but not overwhelm the story
- Appropriate volume level for background use
- Seamless looping capability if needed
- Match the scene's emotional tone

SCENE DURATION: Maximum 5 minutes (300 seconds / 300000ms)

Create a single background music track for the entire scene that follows ElevenLabs best practices.`,

      prompt: `Generate background music for Scene ${sceneNumber}:

SCENE NARRATION:
"${narration}"

ESTIMATED SCENE DURATION: ${estimatedDurationSeconds} seconds

Create an ElevenLabs-optimized prompt that:
1. Includes "instrumental only" for podcast background use
2. Uses specific musical language (BPM, key, instruments)
3. Follows the Episode Bible's audio direction: ${episodeBible.audioDirection.musicStyle}
4. Matches the scene's emotional tone and atmosphere
5. Specifies appropriate duration in milliseconds
6. Uses genre conventions for ${episodeBible.worldRules.genre}

The music should support this specific scene's narrative without overwhelming the spoken content.`
    });

    const track = result.object;
    
    return {
      type: 'music',
      trigger: track.trigger,
      description: track.description,
      timing: 0, // Start with scene
      metadata: {
        elevenLabsPrompt: track.prompt,
        durationMs: track.duration,
        isInstrumental: track.isInstrumental,
        priority: track.priority,
        agent: 'MusicAgent',
        sceneNumber,
        estimatedDurationSeconds
      }
    };
  }

  /**
   * Generate transition music between scenes
   */
  async generateTransitionMusic(
    episodeBible: EpisodeBible,
    fromScene: string,
    toScene: string
  ): Promise<AudioCue> {
    const result = await generateObject({
      model: this.model,
      schema: MusicTrackSchema,
      system: `Create short transition music (10-30 seconds) between podcast scenes.

EPISODE BIBLE GUIDANCE:
- Music Style: ${episodeBible.audioDirection.musicStyle}
- Genre: ${episodeBible.worldRules.genre}

ELEVENLABS BEST PRACTICES:
- Add "instrumental only" to prompt
- Specify exact duration and BPM
- Use musical terminology for precision
- Match genre conventions

Create a brief musical bridge that smoothly transitions between scenes.`,

      prompt: `Create transition music from Scene A to Scene B:

FROM: "${fromScene}"
TO: "${toScene}"

Generate a 15-30 second instrumental bridge that maintains story continuity and follows the Episode Bible's musical style.`
    });

    const track = result.object;

    return {
      type: 'music',
      trigger: '[MUSIC=transition]',
      description: track.description,
      timing: 0,
      metadata: {
        elevenLabsPrompt: track.prompt,
        durationMs: track.duration,
        isInstrumental: track.isInstrumental,
        priority: track.priority,
        agent: 'MusicAgent',
        isTransition: true
      }
    };
  }

  /**
   * Generate dramatic stingers for choice moments
   * Short musical punctuation (2-10 seconds)
   */
  async generateChoiceStingers(
    episodeBible: EpisodeBible,
    choiceA: string,
    choiceB: string
  ): Promise<AudioCue[]> {
    const result = await generateObject({
      model: this.model,
      schema: z.object({
        stingers: z.array(MusicTrackSchema).max(3)
      }),
      system: `Create short musical stingers (2-10 seconds) for choice presentation moments.

EPISODE BIBLE GUIDANCE:
- Music Style: ${episodeBible.audioDirection.musicStyle}
- Genre: ${episodeBible.worldRules.genre}

ELEVENLABS BEST PRACTICES:
- Specify "instrumental only"
- Use precise timing (2000-10000 milliseconds)
- Include BPM and musical details
- Create tension and anticipation

Generate 2-3 brief musical stingers for:
1. Choice reveal moment
2. Decision emphasis
3. Optional: Consequence hint`,

      prompt: `Create musical stingers for choice moment:

CHOICE A: "${choiceA}"
CHOICE B: "${choiceB}"

Generate short, impactful instrumental stingers that build tension and emphasize the importance of the decision.`
    });

    return result.object.stingers.map((stinger, index) => ({
      type: 'music' as const,
      trigger: `[MUSIC=choice_stinger_${index + 1}]`,
      description: stinger.description,
      timing: 0,
      metadata: {
        elevenLabsPrompt: stinger.prompt,
        durationMs: stinger.duration,
        isInstrumental: stinger.isInstrumental,
        priority: stinger.priority,
        agent: 'MusicAgent',
        isStinger: true,
        stingerIndex: index + 1
      }
    }));
  }

  /**
   * Generate episode opening theme
   */
  async generateEpisodeTheme(
    episodeBible: EpisodeBible,
    episodeTitle: string,
    premise: string
  ): Promise<AudioCue> {
    const result = await generateObject({
      model: this.model,
      schema: MusicTrackSchema,
      system: `Create an episode opening theme (30-60 seconds) that establishes the world and tone.

EPISODE BIBLE GUIDANCE:
- Music Style: ${episodeBible.audioDirection.musicStyle}
- Music Mood: ${episodeBible.audioDirection.musicMood}
- Genre: ${episodeBible.worldRules.genre}
- World Tone: ${episodeBible.worldRules.style}

ELEVENLABS BEST PRACTICES:
- Specify "instrumental only" for podcast use
- Use detailed musical language and BPM
- Include key signature for harmonic control
- Create memorable, atmospheric opening

The theme should establish the episode's world and draw listeners into the story.`,

      prompt: `Create opening theme for episode: "${episodeTitle}"

PREMISE: "${premise}"

Generate a compelling INSTRUMENTAL ONLY theme that introduces this specific episode's world and atmosphere. 

IMPORTANT: The prompt MUST include "instrumental only" as this is for podcast background use. Follow the Episode Bible's musical direction.`
    });

    const track = result.object;

    return {
      type: 'music',
      trigger: '[MUSIC=episode_theme]',
      description: track.description,
      timing: 0,
      metadata: {
        elevenLabsPrompt: track.prompt,
        durationMs: track.duration,
        isInstrumental: track.isInstrumental,
        priority: 'high',
        agent: 'MusicAgent',
        isTheme: true,
        episodeTitle
      }
    };
  }

  /**
   * Analyze scene and suggest optimal music approach
   */
  async analyzeSceneForMusic(
    episodeBible: EpisodeBible,
    narration: string,
    sceneType: 'opening' | 'action' | 'dialogue' | 'transition' | 'climax' | 'finale'
  ): Promise<{
    recommendedApproach: string;
    suggestedBPM: string;
    suggestedKey: string;
    emotionalArc: string;
    instrumentationSuggestion: string;
  }> {
    const result = await generateObject({
      model: this.model,
      schema: z.object({
        recommendedApproach: z.string(),
        suggestedBPM: z.string(),
        suggestedKey: z.string(),
        emotionalArc: z.string(),
        instrumentationSuggestion: z.string()
      }),
      system: `Analyze scene content and provide music recommendations following ElevenLabs best practices.

EPISODE BIBLE CONTEXT:
- Genre: ${episodeBible.worldRules.genre}
- Style: ${episodeBible.worldRules.style}
- Audio Direction: ${episodeBible.audioDirection.musicStyle}
- Mood: ${episodeBible.audioDirection.musicMood}`,

      prompt: `Analyze this ${sceneType} scene for optimal music approach:

"${narration}"

Provide specific recommendations for ElevenLabs music generation including BPM ranges, key signatures, instrumentation, and emotional progression.`
    });

    return result.object;
  }
}