'use client';

import { useState, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Textarea } from '@kit/ui/textarea';
import { Badge } from '@kit/ui/badge';
import { Alert, AlertDescription } from '@kit/ui/alert';
import { Separator } from '@kit/ui/separator';
import { Mic, Play, Pause, Settings, Volume2, Users, Clock } from 'lucide-react';

import { Reasoning, ReasoningTrigger, ReasoningContent } from './reasoning';
import { 
  ChainOfThought, 
  ChainOfThoughtHeader, 
  ChainOfThoughtContent, 
  ChainOfThoughtStep,
  ChainOfThoughtSearchResult,
  ChainOfThoughtSearchResults 
} from './chain-of-thought';
import { PromptInput } from './prompt-input';
import { Response } from './response';

export interface EpisodeStudioProps {
  accountId: string;
  onEpisodeCreated?: (episode: any) => void;
  onSceneGenerated?: (scene: any) => void;
  className?: string;
}

export interface EpisodeScene {
  id: string;
  sceneNumber: number;
  narration: string;
  choiceA: string;
  choiceB: string;
  chosenOption?: 'A' | 'B';
  audioCues?: any[];
}

export interface EpisodeState {
  id?: string;
  title?: string;
  premise: string;
  currentScene?: EpisodeScene;
  stateCard?: {
    storySoFar: string;
    keyFacts: string[];
    anchors: Array<{
      id: string;
      description: string;
      isUsed: boolean;
      createdAtScene: number;
    }>;
  };
  status: 'creating' | 'active' | 'waiting_choice' | 'completed' | 'error';
  sceneCount: number;
  choiceCount: number;
}

/**
 * Episode Studio - AI-powered real-time podcast episode creation
 * 
 * Features:
 * - Real-time episode generation using multi-agent orchestrator
 * - AI Elements for showing reasoning and progress
 * - Interactive choice selection for guests
 * - Live audio cue generation
 * - State management and continuity tracking
 */
export function EpisodeStudio({
  accountId,
  onEpisodeCreated,
  onSceneGenerated,
  className,
}: EpisodeStudioProps) {
  const [episodeState, setEpisodeState] = useState<EpisodeState>({
    premise: '',
    status: 'creating',
    sceneCount: 0,
    choiceCount: 0,
  });

  const [agentProgress, setAgentProgress] = useState<Array<{
    agent: string;
    status: 'idle' | 'working' | 'complete' | 'error';
    message?: string;
    timestamp: string;
  }>>([]);

  // Use AI SDK's useChat for streaming orchestrator communication
  const {
    messages,
    input,
    setInput,
    isLoading,
    error,
    append,
  } = useChat({
    api: '/api/episodes/orchestrate',
    initialMessages: [],
    onFinish: (message) => {
      // Parse the orchestrator response and update episode state
      try {
        const response = JSON.parse(message.content);
        if (response.success) {
          setEpisodeState(prev => ({
            ...prev,
            ...response,
            status: 'active',
          }));
          
          if (onEpisodeCreated && response.episode) {
            onEpisodeCreated(response.episode);
          }
          
          if (onSceneGenerated && response.firstScene) {
            onSceneGenerated(response.firstScene);
          }
        }
      } catch (err) {
        console.error('Failed to parse orchestrator response:', err);
      }
    },
    onError: (error) => {
      setEpisodeState(prev => ({ ...prev, status: 'error' }));
    },
  });

  const handleCreateEpisode = useCallback(async () => {
    if (!episodeState.premise.trim()) return;

    setEpisodeState(prev => ({ ...prev, status: 'creating' }));
    setAgentProgress([]);

    await append({
      role: 'user',
      content: JSON.stringify({
        premise: episodeState.premise,
        accountId,
      }),
    });
  }, [episodeState.premise, accountId, append]);

  const handleChoice = useCallback(async (choice: 'A' | 'B') => {
    if (!episodeState.id || !episodeState.currentScene) return;

    setEpisodeState(prev => ({ 
      ...prev, 
      status: 'creating',
      choiceCount: prev.choiceCount + 1,
    }));

    // Make choice processing request
    const response = await fetch('/api/episodes/orchestrate', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        episodeId: episodeState.id,
        choice,
        sceneNumber: episodeState.currentScene.sceneNumber,
      }),
    });

    // Handle streaming response for choice processing
    // This would need to be implemented similar to useChat but for PUT requests
  }, [episodeState.id, episodeState.currentScene]);

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Episode Studio
            </CardTitle>
            <div className="flex items-center gap-2">
              {episodeState.status === 'active' && (
                <Badge variant="secondary" className="animate-pulse">
                  <div className="h-2 w-2 bg-green-500 rounded-full mr-2" />
                  Live
                </Badge>
              )}
              <Badge variant="outline">
                Scene {episodeState.sceneCount}
              </Badge>
              <Badge variant="outline">
                Choices {episodeState.choiceCount}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Episode Creation Form */}
          {!episodeState.id && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="premise">Episode Premise</Label>
                <Textarea
                  id="premise"
                  value={episodeState.premise}
                  onChange={(e) =>
                    setEpisodeState(prev => ({ ...prev, premise: e.target.value }))
                  }
                  placeholder="Describe the starting situation for your choose-your-own-adventure episode... (e.g., 'You wake up in a mysterious Victorian mansion during a thunderstorm')"
                  rows={3}
                  className="mt-1"
                />
              </div>

              <Button
                onClick={handleCreateEpisode}
                disabled={!episodeState.premise.trim() || isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Creating Episode...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    Start Episode Creation
                  </div>
                )}
              </Button>
            </div>
          )}

          {/* Agent Progress - Show AI reasoning */}
          {isLoading && episodeState.status === 'creating' && (
            <Reasoning isStreaming={isLoading} defaultOpen={true}>
              <ReasoningTrigger />
              <ReasoningContent>
                {messages.length > 0 ? messages[messages.length - 1]?.content || 'Processing your episode...' : 'Initializing multi-agent workflow...'}
              </ReasoningContent>
            </Reasoning>
          )}

          {/* Multi-Agent Chain of Thought Progress */}
          {(agentProgress.length > 0 || isLoading) && (
            <ChainOfThought defaultOpen={true}>
              <ChainOfThoughtHeader>Episode Creation Progress</ChainOfThoughtHeader>
              <ChainOfThoughtContent>
                {/* Story Director Step */}
                <ChainOfThoughtStep
                  icon={Settings}
                  label="Story Director"
                  description="Creating Episode Bible with world rules and creative guidelines"
                  status={
                    agentProgress.find(p => p.agent === 'StoryDirector')?.status === 'complete' 
                      ? 'complete' 
                      : isLoading 
                        ? 'active' 
                        : 'pending'
                  }
                >
                  {agentProgress.find(p => p.agent === 'StoryDirector') && (
                    <ChainOfThoughtSearchResults>
                      <ChainOfThoughtSearchResult>
                        Episode Bible Generated
                      </ChainOfThoughtSearchResult>
                    </ChainOfThoughtSearchResults>
                  )}
                </ChainOfThoughtStep>

                {/* Scene Planner Step */}
                <ChainOfThoughtStep
                  icon={Users}
                  label="Scene Planner"
                  description="Generating opening scene with narration and choices"
                  status={
                    agentProgress.find(p => p.agent === 'ScenePlannerAgent')?.status === 'complete' 
                      ? 'complete' 
                      : agentProgress.some(p => p.agent === 'StoryDirector' && p.status === 'complete')
                        ? 'active'
                        : 'pending'
                  }
                >
                  {agentProgress.find(p => p.agent === 'ScenePlannerAgent') && (
                    <ChainOfThoughtSearchResults>
                      <ChainOfThoughtSearchResult>
                        Scene 1 Generated
                      </ChainOfThoughtSearchResult>
                      <ChainOfThoughtSearchResult>
                        Audio Cues Created
                      </ChainOfThoughtSearchResult>
                    </ChainOfThoughtSearchResults>
                  )}
                </ChainOfThoughtStep>

                {/* Audio Agents Step */}
                <ChainOfThoughtStep
                  icon={Volume2}
                  label="Audio Agents"
                  description="Generating music and sound effects"
                  status={
                    agentProgress.find(p => p.agent === 'AudioWorkers')?.status === 'complete' 
                      ? 'complete' 
                      : agentProgress.some(p => p.agent === 'ScenePlannerAgent' && p.status === 'complete')
                        ? 'active'
                        : 'pending'
                  }
                >
                  {agentProgress.find(p => p.agent === 'AudioWorkers') && (
                    <ChainOfThoughtSearchResults>
                      <ChainOfThoughtSearchResult>
                        Background Music
                      </ChainOfThoughtSearchResult>
                      <ChainOfThoughtSearchResult>
                        Sound Effects
                      </ChainOfThoughtSearchResult>
                    </ChainOfThoughtSearchResults>
                  )}
                </ChainOfThoughtStep>
              </ChainOfThoughtContent>
            </ChainOfThought>
          )}

          {/* Current Scene Display */}
          {episodeState.currentScene && (
            <div className="space-y-4">
              <Separator />
              
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Scene {episodeState.currentScene.sceneNumber}
                </h3>
                
                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <div className="prose prose-sm max-w-none">
                      <Response>{episodeState.currentScene.narration}</Response>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Choices */}
              {episodeState.status === 'active' && !episodeState.currentScene.chosenOption && (
                <div className="space-y-3">
                  <h4 className="font-medium">What do you choose?</h4>
                  
                  <div className="grid gap-3">
                    <Button
                      onClick={() => handleChoice('A')}
                      variant="outline"
                      className="h-auto p-4 text-left justify-start"
                      disabled={isLoading}
                    >
                      <div className="flex items-start gap-3">
                        <Badge variant="secondary">A</Badge>
                        <span className="flex-1">{episodeState.currentScene.choiceA}</span>
                      </div>
                    </Button>
                    
                    <Button
                      onClick={() => handleChoice('B')}
                      variant="outline"
                      className="h-auto p-4 text-left justify-start"
                      disabled={isLoading}
                    >
                      <div className="flex items-start gap-3">
                        <Badge variant="secondary">B</Badge>
                        <span className="flex-1">{episodeState.currentScene.choiceB}</span>
                      </div>
                    </Button>
                  </div>
                </div>
              )}

              {/* Choice Made */}
              {episodeState.currentScene.chosenOption && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Choice made: <span className="font-medium">Option {episodeState.currentScene.chosenOption}</span>
                  </p>
                  <p className="text-sm">
                    {episodeState.currentScene.chosenOption === 'A' 
                      ? episodeState.currentScene.choiceA 
                      : episodeState.currentScene.choiceB
                    }
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Episode State Card */}
          {episodeState.stateCard && (
            <div className="space-y-4">
              <Separator />
              
              <div>
                <h3 className="text-lg font-semibold mb-3">Story Progress</h3>
                
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">Story So Far</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {episodeState.stateCard.storySoFar}
                    </p>
                  </div>

                  {episodeState.stateCard.keyFacts.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium">Key Facts</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {episodeState.stateCard.keyFacts.map((fact, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {fact}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {episodeState.stateCard.anchors.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium">Active Elements</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {episodeState.stateCard.anchors
                          .filter(anchor => !anchor.isUsed)
                          .map((anchor) => (
                            <Badge key={anchor.id} variant="secondary" className="text-xs">
                              {anchor.description}
                            </Badge>
                          ))
                        }
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>
                {error.message || 'An error occurred during episode creation.'}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}