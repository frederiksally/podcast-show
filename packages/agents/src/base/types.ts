export interface StateCard {
  storySoFar: string;           // Rolling summary
  keyFacts: string[];           // Bullet points of what happened
  anchors: Anchor[];            // Things that can pay off later
}

export interface Anchor {
  id: string;
  description: string;
  isUsed: boolean;
  createdAtScene: number;
}

export interface Episode {
  id: string;
  accountId: string;
  createdBy: string;
  title: string;
  premise: string;
  stateCard: StateCard;
  status: 'active' | 'completed' | 'abandoned';
  createdAt: string;
  completedAt?: string;
  totalScenes: number;
  totalChoices: number;
}

export interface Scene {
  id: string;
  episodeId: string;
  sceneNumber: number;
  narration: string;
  choiceA: string;
  choiceB: string;
  chosenOption?: 'A' | 'B';
  stateUpdate: Record<string, any>;
  audioCues: AudioCue[];
  createdAt: string;
}

export interface AudioCue {
  type: 'music' | 'sfx';
  trigger: string;          // e.g., "[SFX=door_creak]"
  description: string;      // Human-readable description
  timing?: number;         // Optional timing in seconds
}

export interface EpisodeAudio {
  id: string;
  episodeId: string;
  sceneId?: string;
  audioType: 'music' | 'sfx';
  triggerText?: string;
  audioUrl?: string;
  status: 'pending' | 'generating' | 'ready' | 'failed';
  createdAt: string;
}

export interface AgentContext {
  episode: Episode;
  currentScene?: Scene;
  previousScenes: Scene[];
  stateCard: StateCard;
  userId: string;
}

export interface AgentResponse {
  success: boolean;
  data?: any;
  error?: string;
  reasoning?: string;
}

export interface SceneGenerationRequest {
  premise: string;
  stateCard: StateCard;
  previousScenes: Scene[];
  sceneNumber: number;
}

export interface SceneGenerationResponse extends AgentResponse {
  data?: {
    narration: string;
    choiceA: string;
    choiceB: string;
    stateUpdate: Record<string, any>;
    audioCues: AudioCue[];
  };
}

export interface ChoiceRequest {
  episodeId: string;
  choice: 'A' | 'B';
  userId: string;
}

export interface ChoiceResponse extends AgentResponse {
  data?: {
    nextScene: Scene;
    updatedStateCard: StateCard;
    audioGenerated?: boolean;
  };
}

// Agent status for real-time updates
export interface AgentStatus {
  agentName: string;
  status: 'idle' | 'thinking' | 'working' | 'complete' | 'error';
  message?: string;
  progress?: number; // 0-100
}

// Server-Sent Events types
export interface EpisodeStreamEvent {
  type: 'agent_status' | 'scene_ready' | 'audio_ready' | 'episode_complete' | 'error';
  data: any;
  timestamp: string;
}

// Agent tool parameters for AI SDK
export interface CreateSceneParams {
  narration: string;
  choiceA: string;
  choiceB: string;
  stateUpdate: Record<string, any>;
  audioCues: AudioCue[];
}

export interface UpdateStateParams {
  storySoFar: string;
  keyFacts: string[];
  newAnchors?: Omit<Anchor, 'id' | 'createdAtScene'>[];
  usedAnchorIds?: string[];
}

export interface GenerateAudioParams {
  type: 'music' | 'sfx';
  description: string;
  style?: string;
  duration?: number; // in seconds
}

/**
 * Episode Bible - Complete creative world and guidelines for an entire episode
 * Created once per episode by Story Director, used by all other agents
 */
export interface EpisodeBible {
  worldRules: {
    genre: string;
    style: string; // Allow flexible style descriptions like "gothic horror", "dark fantasy", etc.
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
}
