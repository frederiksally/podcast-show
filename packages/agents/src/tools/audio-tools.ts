import { tool } from 'ai';
import { z } from 'zod';
import { ElevenLabsClient } from 'elevenlabs';

type DatabaseClient = any;

export function createAudioTools(client: DatabaseClient, elevenLabsApiKey: string) {
  const elevenLabs = new ElevenLabsClient({
    apiKey: elevenLabsApiKey
  });

  return {
    generateMusic: tool({
      description: 'Generate background music using ElevenLabs Music API for a scene',
      parameters: z.object({
        episodeId: z.string(),
        sceneId: z.string().optional(),
        description: z.string().describe('Description of the music needed (e.g., "tense horror atmosphere", "upbeat adventure theme")'),
        style: z.string().describe('Musical style derived from the story premise (e.g., "horror", "fantasy", "noir", "comedy")'),
        duration: z.number().min(10).max(60).default(30).describe('Duration in seconds')
      }),
      execute: async ({ episodeId, sceneId, description, style, duration }) => {
        try {
          // Create a detailed prompt for music generation based on style and scene
          const musicPrompt = createMusicPrompt(style, description, duration);
          
          // Generate music using ElevenLabs Music API
          const audioResponse = await elevenLabs.music.compose({
            prompt: musicPrompt,
            musicLengthMs: duration * 1000 // Convert seconds to milliseconds
          });

          // Convert audio response to URL and upload to storage
          const audioUrl = await uploadAudioToStorage(audioResponse, `music-${episodeId}-${Date.now()}.mp3`);

          // Save to database
          const { data, error } = await client
            .from('episode_audio')
            .insert({
              episode_id: episodeId,
              scene_id: sceneId,
              audio_type: 'music',
              trigger_text: description,
              audio_url: audioUrl,
              status: 'ready'
            })
            .select()
            .single();

          if (error) throw error;

          return {
            success: true,
            audioId: data.id,
            audioUrl: audioUrl,
            description: description,
            style: style,
            duration: duration
          };
        } catch (error) {
          // If generation fails, save with failed status
          await client
            .from('episode_audio')
            .insert({
              episode_id: episodeId,
              scene_id: sceneId,
              audio_type: 'music',
              trigger_text: description,
              status: 'failed'
            });

          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate music'
          };
        }
      }
    }),

    generateSFX: tool({
      description: 'Generate sound effects using ElevenLabs Sound Effects API',
      parameters: z.object({
        episodeId: z.string(),
        sceneId: z.string().optional(),
        sfxDescription: z.string().describe('Description of the sound effect (e.g., "door creaking", "footsteps on gravel", "thunder crash")'),
        trigger: z.string().describe('The trigger text that will be embedded in narration (e.g., "[SFX=door_creak]")'),
        intensity: z.enum(['subtle', 'moderate', 'dramatic']).default('moderate').describe('Intensity level of the sound effect')
      }),
      execute: async ({ episodeId, sceneId, sfxDescription, trigger, intensity }) => {
        try {
          // Create intensity-adjusted prompt
          const intensityMap = {
            subtle: 'soft, ambient',
            moderate: 'clear, noticeable',
            dramatic: 'loud, impactful'
          };
          
          const sfxPrompt = `${intensityMap[intensity]} ${sfxDescription}`;
          
          // Generate SFX using ElevenLabs Sound Effects API
          const audioResponse = await elevenLabs.textToSoundEffects.convert({
            text: sfxPrompt
          });

          // Convert audio response to URL
          const audioUrl = await uploadAudioToStorage(audioResponse, `sfx-${episodeId}-${Date.now()}.mp3`);

          // Save to database
          const { data, error } = await client
            .from('episode_audio')
            .insert({
              episode_id: episodeId,
              scene_id: sceneId,
              audio_type: 'sfx',
              trigger_text: trigger,
              audio_url: audioUrl,
              status: 'ready'
            })
            .select()
            .single();

          if (error) throw error;

          return {
            success: true,
            audioId: data.id,
            audioUrl: audioUrl,
            trigger: trigger,
            description: sfxDescription,
            intensity: intensity
          };
        } catch (error) {
          // If generation fails, save with failed status
          await client
            .from('episode_audio')
            .insert({
              episode_id: episodeId,
              scene_id: sceneId,
              audio_type: 'sfx',
              trigger_text: trigger,
              status: 'failed'
            });

          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate SFX'
          };
        }
      }
    }),

    generateDetailedMusic: tool({
      description: 'Generate music with detailed composition plan for complex scenes',
      parameters: z.object({
        episodeId: z.string(),
        sceneId: z.string().optional(),
        prompt: z.string().describe('Detailed music prompt with style, tempo, instruments'),
        duration: z.number().min(10).max(120).default(45).describe('Duration in seconds')
      }),
      execute: async ({ episodeId, sceneId, prompt, duration }) => {
        try {
          // Use the detailed music generation to get composition plan
          const trackDetails = await elevenLabs.music.composeDetailed({
            prompt: prompt,
            musicLengthMs: duration * 1000
          });

          // Convert audio response to URL
          const audioUrl = await uploadAudioToStorage(trackDetails.audio, `detailed-music-${episodeId}-${Date.now()}.mp3`);

          // Save to database with composition plan metadata
          const { data, error } = await client
            .from('episode_audio')
            .insert({
              episode_id: episodeId,
              scene_id: sceneId,
              audio_type: 'music',
              trigger_text: prompt,
              audio_url: audioUrl,
              status: 'ready'
            })
            .select()
            .single();

          if (error) throw error;

          return {
            success: true,
            audioId: data.id,
            audioUrl: audioUrl,
            compositionPlan: trackDetails.json.composition_plan,
            metadata: trackDetails.json.song_metadata,
            filename: trackDetails.filename
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate detailed music'
          };
        }
      }
    }),

    createAudioCueSheet: tool({
      description: 'Create a comprehensive audio cue sheet for a scene with embedded triggers',
      parameters: z.object({
        narration: z.string().describe('The scene narration text'),
        style: z.string().describe('The story style (horror, fantasy, etc.)'),
        sceneType: z.string().describe('Type of scene (action, dialogue, transition, climax, etc.)')
      }),
      execute: async ({ narration, style, sceneType }) => {
        try {
          // Analyze the narration and suggest audio cues
          const audioCues = [];

          // Basic music cue - always present
          const musicDescription = generateMusicDescription(style, sceneType);
          audioCues.push({
            type: 'music' as const,
            trigger: '[MUSIC=background]',
            description: musicDescription,
            timing: 0 // Start of scene
          });

          // Analyze narration for potential SFX opportunities
          const sfxSuggestions = analyzeSFXOpportunities(narration, style);
          audioCues.push(...sfxSuggestions);

          return {
            success: true,
            audioCues: audioCues,
            narrationWithCues: embedAudioCues(narration, sfxSuggestions)
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create audio cue sheet'
          };
        }
      }
    }),

    loadEpisodeAudio: tool({
      description: 'Load all audio files for an episode',
      parameters: z.object({
        episodeId: z.string()
      }),
      execute: async ({ episodeId }) => {
        try {
          const { data, error } = await client
            .from('episode_audio')
            .select('*')
            .eq('episode_id', episodeId)
            .order('created_at', { ascending: true });

          if (error) throw error;

          const audioFiles = data.map((audio: any) => ({
            id: audio.id,
            episodeId: audio.episode_id,
            sceneId: audio.scene_id,
            audioType: audio.audio_type,
            triggerText: audio.trigger_text,
            audioUrl: audio.audio_url,
            status: audio.status,
            createdAt: audio.created_at
          }));

          return { success: true, audioFiles };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to load episode audio'
          };
        }
      }
    })
  };
}

// Helper functions
async function uploadAudioToStorage(audioResponse: any, filename: string): Promise<string> {
  // This would integrate with your storage solution (Supabase Storage, S3, etc.)
  // For now, return a placeholder URL - in real implementation:
  // 1. Convert audio buffer to file
  // 2. Upload to storage service
  // 3. Return public URL
  return `https://storage.example.com/audio/${filename}`;
}

function createMusicPrompt(style: string, description: string, duration: number): string {
  const stylePrompts: Record<string, string> = {
    horror: `Create a haunting, atmospheric ${description}. Use dark ambient textures, subtle dissonance, low-frequency drones, and sparse, eerie instrumentation. Build tension with gradual dynamic swells and unsettling harmonic progressions.`,
    fantasy: `Create an enchanting, orchestral ${description}. Use soaring strings, magical harp arpeggios, woodwind melodies, and warm brass sections. Include mystical textures with ethereal choir pads and Celtic-inspired motifs.`,
    noir: `Create a sophisticated, jazzy ${description}. Use smooth saxophone lines, muted trumpet, upright bass walking lines, and subtle jazz drums. Include smoky piano chords and classic film noir harmonic progressions.`,
    comedy: `Create a playful, upbeat ${description}. Use bright orchestral colors, bouncy rhythms, whimsical woodwind melodies, and light percussion. Include comedic musical stingers and cheerful harmonic progressions.`,
    adventure: `Create an epic, cinematic ${description}. Use full orchestral arrangement with powerful brass fanfares, driving string ostinatos, heroic melodies, and dynamic percussion. Build excitement with tempo changes and crescendos.`,
    mystery: `Create a suspenseful, intriguing ${description}. Use pizzicato strings, subtle percussion, mysterious piano figures, and sparse instrumentation. Build tension with chromatic harmonies and unexpected musical turns.`
  };

  const basePrompt = stylePrompts[style.toLowerCase()] || 
    `Create atmospheric ${style} music for ${description}. Use instrumentation and harmonies appropriate for the ${style} genre.`;

  return `${basePrompt} Duration: approximately ${duration} seconds. Suitable for podcast background music - instrumental only, well-mixed and balanced.`;
}

function generateMusicDescription(style: string, sceneType: string): string {
  const styleMap: Record<string, Record<string, string>> = {
    horror: {
      action: 'tense, fast-paced horror music with building suspense',
      dialogue: 'subtle, eerie ambient horror soundtrack',
      transition: 'mysterious, atmospheric horror bridge',
      climax: 'intense, dramatic horror crescendo'
    },
    fantasy: {
      action: 'epic, orchestral adventure music with rising energy',
      dialogue: 'magical, whimsical background melody',
      transition: 'mystical, flowing fantasy bridge',
      climax: 'heroic, triumphant orchestral finale'
    },
    noir: {
      action: 'jazzy, tension-filled noir chase music',
      dialogue: 'smooth, atmospheric jazz ambience',
      transition: 'smoky, sultry jazz bridge',
      climax: 'dramatic, brass-heavy jazz crescendo'
    },
    comedy: {
      action: 'upbeat, playful comedic music',
      dialogue: 'light, whimsical background tune',
      transition: 'bouncy, cheerful musical bridge',
      climax: 'silly, over-the-top comedic finale'
    }
  };

  return styleMap[style]?.[sceneType] || `${style} background music suitable for ${sceneType} scene`;
}

function analyzeSFXOpportunities(narration: string, style: string) {
  const audioCues = [];
  
  // Common SFX triggers based on narration content
  const sfxPatterns = [
    { pattern: /\b(door|doors?)\b.*\b(open|close|creak|slam)/i, sfx: 'door_sound', description: 'Door creaking open' },
    { pattern: /\bfootsteps?\b|\bwalking\b|\bwalks?\b/i, sfx: 'footsteps', description: 'Footsteps on surface' },
    { pattern: /\bthunder\b|\blightning\b|\bstorm/i, sfx: 'thunder', description: 'Thunder crash' },
    { pattern: /\bwind\b.*\b(howl|blow|whistle)/i, sfx: 'wind', description: 'Wind howling' },
    { pattern: /\bphone\b.*\bring/i, sfx: 'phone_ring', description: 'Phone ringing' },
    { pattern: /\bcar\b.*\b(start|engine)/i, sfx: 'car_start', description: 'Car engine starting' },
    { pattern: /\bglass\b.*\b(break|shatter)/i, sfx: 'glass_break', description: 'Glass shattering' },
    { pattern: /\bscream/i, sfx: 'scream', description: 'Human scream' },
    { pattern: /\bexplosion\b|\bexplode/i, sfx: 'explosion', description: 'Explosion sound' },
    { pattern: /\bgun\b.*\b(shot|fire)/i, sfx: 'gunshot', description: 'Gunshot' }
  ];

  sfxPatterns.forEach((pattern, index) => {
    if (pattern.pattern.test(narration)) {
      audioCues.push({
        type: 'sfx' as const,
        trigger: `[SFX=${pattern.sfx}]`,
        description: pattern.description,
        timing: index * 5 + 3 // Stagger SFX timing
      });
    }
  });

  return audioCues;
}

function embedAudioCues(narration: string, sfxCues: any[]): string {
  let narrationWithCues = narration;
  
  // Insert SFX triggers at appropriate points in the narration
  sfxCues.forEach(cue => {
    if (cue.type === 'sfx') {
      // Try to insert the trigger near relevant text
      const triggerRegex = new RegExp(`\\b${cue.description.split(' ')[0]}\\b`, 'i');
      if (triggerRegex.test(narrationWithCues)) {
        narrationWithCues = narrationWithCues.replace(triggerRegex, `$& ${cue.trigger}`);
      } else {
        // If no good spot found, add at the end of sentence
        narrationWithCues += ` ${cue.trigger}`;
      }
    }
  });

  return narrationWithCues;
}