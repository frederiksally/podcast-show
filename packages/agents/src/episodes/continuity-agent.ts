import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import type { StateCard, Anchor } from '../base/types';

/**
 * Continuity Agent - specialized worker for callback analysis
 * 
 * This agent analyzes the story state and determines when and how
 * to incorporate callbacks to previous anchors for narrative depth.
 */
export class ContinuityAgent {
  private model = openai('gpt-4o');

  /**
   * Analyze current state and suggest callback opportunities
   * This is the core function that other agents delegate to
   */
  async analyzeCallbacks(
    stateCard: StateCard,
    upcomingContext: string
  ): Promise<{
    shouldUseCallback: boolean;
    suggestedAnchor?: Anchor;
    callbackType: 'item' | 'character' | 'promise' | 'mystery' | 'none';
    reason: string;
    integration?: string;
  }> {
    const { object: analysis } = await generateObject({
      model: this.model,
      system: `You are the Continuity Agent, a specialist in story callbacks and narrative continuity.

Your job is to analyze the current story state and determine if this is a good moment to pay off an existing anchor through a callback.

Good callback opportunities:
- Natural story moments where past elements would logically resurface
- Moments that could benefit from added depth or surprise
- When anchors have been dormant for 2+ scenes
- Climactic or resolution moments
- When the story feels like it could use more connection to past events

Avoid callbacks when:
- It would feel forced or unnatural
- The story is building to a different climax  
- Too many callbacks have happened recently
- The upcoming context doesn't support it narratively

Types of callbacks:
- item: Physical objects that were mentioned or obtained earlier
- character: People or entities that could return or be referenced
- promise: Commitments, deals, or agreements made earlier
- mystery: Unresolved questions or clues that could be addressed
- none: No callback recommended at this time`,

      schema: z.object({
        shouldUseCallback: z.boolean().describe('Whether a callback would enhance this moment'),
        suggestedAnchorId: z.string().optional().describe('ID of the best anchor to use for callback'),
        callbackType: z.enum(['item', 'character', 'promise', 'mystery', 'none']).describe('Type of callback opportunity'),
        reason: z.string().describe('Detailed explanation of why this callback opportunity exists or doesnt'),
        naturalIntegration: z.string().optional().describe('Specific suggestion for how the callback could be naturally integrated'),
        impactLevel: z.enum(['subtle', 'moderate', 'dramatic']).describe('How prominently the callback should feature'),
        timingAdvice: z.string().optional().describe('Advice on timing within the upcoming scene')
      }),

      prompt: `Analyze callback opportunities for the story:

CURRENT STATE CARD:
Story so far: ${stateCard.storySoFar}
Key facts: ${stateCard.keyFacts.join(', ')}

ACTIVE ANCHORS (unused):
${stateCard.anchors
  .filter(a => !a.isUsed)
  .map(a => `${a.id}: ${a.description} (introduced scene ${a.createdAtScene})`)
  .join('\n')}

USED ANCHORS (for reference):
${stateCard.anchors
  .filter(a => a.isUsed)
  .map(a => `${a.id}: ${a.description} (used)`)
  .join('\n')}

UPCOMING CONTEXT:
${upcomingContext}

Should any anchors be paid off in the upcoming content? Consider story flow, natural timing, and narrative impact.`
    });

    // Find the suggested anchor if one was specified
    const suggestedAnchor = analysis.suggestedAnchorId 
      ? stateCard.anchors.find(a => a.id === analysis.suggestedAnchorId)
      : undefined;

    return {
      shouldUseCallback: analysis.shouldUseCallback,
      suggestedAnchor,
      callbackType: analysis.callbackType,
      reason: analysis.reason,
      integration: analysis.naturalIntegration
    };
  }

  /**
   * Evaluate the quality of an existing anchor for callback potential
   */
  async evaluateAnchor(
    anchor: Anchor,
    stateCard: StateCard,
    currentSceneNumber: number
  ): Promise<{
    callbackPotential: 'high' | 'medium' | 'low';
    ageScore: number; // 0-10, higher is better for callbacks
    relevanceScore: number; // 0-10, based on story context
    suggestedUsage: string;
  }> {
    const sceneAge = currentSceneNumber - anchor.createdAtScene;
    
    const { object: evaluation } = await generateObject({
      model: this.model,
      system: `You are the Continuity Agent evaluating an anchor's potential for future callbacks.

Consider:
- How long ago it was introduced (sweet spot is 2-5 scenes)
- How well it fits with the current story direction
- Whether it could add meaningful depth or surprise
- How naturally it could be integrated

Rate on multiple dimensions for the orchestrator's planning.`,

      schema: z.object({
        callbackPotential: z.enum(['high', 'medium', 'low']).describe('Overall potential for this anchor'),
        ageScore: z.number().min(0).max(10).describe('Score based on how long ago it was introduced'),
        relevanceScore: z.number().min(0).max(10).describe('Score based on current story relevance'),
        suggestedUsage: z.string().describe('How this anchor could best be used in a callback'),
        reasoning: z.string().describe('Analysis of the anchor\'s callback potential')
      }),

      prompt: `Evaluate this anchor for callback potential:

ANCHOR: ${anchor.description}
- Introduced: Scene ${anchor.createdAtScene}
- Current scene: ${currentSceneNumber}
- Age: ${sceneAge} scenes

CURRENT STORY STATE:
${stateCard.storySoFar}

Key facts: ${stateCard.keyFacts.join(', ')}

Rate this anchor's potential for future callbacks.`
    });

    return {
      callbackPotential: evaluation.callbackPotential,
      ageScore: evaluation.ageScore,
      relevanceScore: evaluation.relevanceScore,
      suggestedUsage: evaluation.suggestedUsage
    };
  }

  /**
   * Analyze story consistency and flag potential continuity issues
   */
  async checkContinuityIssues(
    stateCard: StateCard,
    newSceneContent: string
  ): Promise<{
    hasIssues: boolean;
    issues: Array<{
      type: 'contradiction' | 'forgotten_element' | 'inconsistency';
      description: string;
      severity: 'minor' | 'major';
      suggestion: string;
    }>;
  }> {
    const { object: analysis } = await generateObject({
      model: this.model,
      system: `You are the Continuity Agent checking for story consistency issues.

Review the new scene content against the established story state and flag any problems:
- Contradictions with established facts
- Forgotten important elements that should be acknowledged
- Character or plot inconsistencies
- Timeline issues

Focus on issues that would break immersion or confuse the audience.`,

      schema: z.object({
        hasIssues: z.boolean().describe('Whether continuity issues were found'),
        issues: z.array(z.object({
          type: z.enum(['contradiction', 'forgotten_element', 'inconsistency']),
          description: z.string().describe('What the continuity issue is'),
          severity: z.enum(['minor', 'major']).describe('How serious the issue is'),
          suggestion: z.string().describe('How to fix or address the issue')
        })).describe('List of continuity issues found')
      }),

      prompt: `Check for continuity issues:

ESTABLISHED STORY STATE:
Story so far: ${stateCard.storySoFar}
Key facts: ${stateCard.keyFacts.join(', ')}
Anchors: ${stateCard.anchors.map(a => a.description).join(', ')}

NEW SCENE CONTENT:
${newSceneContent}

Identify any continuity problems between the established state and new content.`
    });

    return analysis;
  }

  /**
   * Suggest ways to strengthen story connections
   */
  async suggestStoryConnections(
    stateCard: StateCard,
    upcomingSceneType: 'action' | 'dialogue' | 'transition' | 'climax'
  ): Promise<{
    connections: Array<{
      type: 'reference' | 'callback' | 'foreshadowing';
      description: string;
      anchorId?: string;
      subtlety: 'subtle' | 'obvious';
    }>;
    reasoning: string;
  }> {
    const { object: suggestions } = await generateObject({
      model: this.model,
      system: `You are the Continuity Agent suggesting ways to strengthen story connections.

Based on the story state and upcoming scene type, suggest ways to create stronger narrative cohesion through:
- References to earlier events
- Callbacks to established anchors  
- Subtle foreshadowing for future payoffs

Match suggestions to the scene type - action scenes need different approaches than dialogue scenes.`,

      schema: z.object({
        connections: z.array(z.object({
          type: z.enum(['reference', 'callback', 'foreshadowing']),
          description: z.string().describe('How to strengthen the story connection'),
          anchorId: z.string().optional().describe('Relevant anchor ID if applicable'),
          subtlety: z.enum(['subtle', 'obvious']).describe('How prominently to feature this connection')
        })),
        reasoning: z.string().describe('Why these connections would strengthen the story')
      }),

      prompt: `Suggest story connections for upcoming ${upcomingSceneType} scene:

CURRENT STORY STATE:
Story so far: ${stateCard.storySoFar}
Key facts: ${stateCard.keyFacts.join(', ')}

AVAILABLE ANCHORS:
${stateCard.anchors
  .filter(a => !a.isUsed)
  .map(a => `${a.id}: ${a.description}`)
  .join('\n')}

What connections could strengthen the narrative in this ${upcomingSceneType} scene?`
    });

    return suggestions;
  }
}