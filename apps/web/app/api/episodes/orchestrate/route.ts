import { openai } from '@ai-sdk/openai';
import { streamText, generateId, UIMessage, convertToModelMessages } from 'ai';
import { z } from 'zod';
import { enhanceRouteHandler } from '@kit/next/routes';
import { NextResponse } from 'next/server';

import { EpisodeOrchestrator } from '@kit/agents/episodes/orchestrator';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

// Allow streaming responses up to 5 minutes for complex episode generation
export const maxDuration = 300;

const CreateEpisodeSchema = z.object({
  premise: z.string().min(10).max(500).describe('The episode premise or starting situation'),
  accountId: z.string().describe('The account ID for the episode'),
});

/**
 * Episode Orchestrator API - Uses AI SDK streamText with orchestrator tools
 * 
 * This uses the AI SDK's streaming capabilities with the existing orchestrator
 * to coordinate Story Director, Scene Planner, State Agent, Music Agent, and SFX Agent.
 * 
 * Follows AI SDK best practices:
 * - Uses streamText for streaming responses
 * - Uses existing orchestrator tools pattern
 * - Returns proper AI SDK streaming response
 */
export const POST = enhanceRouteHandler(
  async function ({ body, user, request }) {
    const { premise, accountId } = CreateEpisodeSchema.parse(body);
    
    const client = getSupabaseServerClient();
    const adminClient = getSupabaseServerAdminClient();
    
    // Verify user has access to this account (RLS will protect this)
    const { data: account, error: accountError } = await client
      .from('accounts')
      .select('id, name')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Account not found or access denied' },
        { status: 404 }
      );
    }

    // Generate unique episode ID for this session
    const episodeId = generateId();
    
    // Create orchestrator with database clients
    const orchestrator = new EpisodeOrchestrator(
      adminClient, // Use admin client for orchestrator database operations
      process.env.ELEVENLABS_API_KEY!
    );

    // Use AI SDK streamText with orchestrator workflow
    const result = streamText({
      model: openai('gpt-4o'),
      system: `You are coordinating a live podcast episode creation using multi-agent workflow.
      
      User: ${user.email}
      Account: ${account.name}
      Episode ID: ${episodeId}
      
      Start the episode orchestration workflow to create a choose-your-own-adventure episode.`,
      tools: {
        // Create the episode in database
        createEpisode: {
          description: 'Create episode record in database',
          parameters: z.object({
            title: z.string(),
            premise: z.string(),
          }),
          execute: async ({ title, premise: episodePremise }) => {
            const { data: episode, error } = await client
              .from('episodes')
              .insert({
                id: episodeId,
                account_id: accountId,
                created_by: user.id,
                title,
                premise: episodePremise,
                status: 'active',
                total_scenes: 0,
                total_choices: 0,
              })
              .select()
              .single();
              
            if (error) throw new Error(`Failed to create episode: ${error.message}`);
            return { success: true, episode };
          },
        },
        
        // Start orchestrator workflow
        startOrchestration: {
          description: 'Start the multi-agent orchestration workflow',
          parameters: z.object({
            title: z.string(),
            premise: z.string(),
          }),
          execute: async ({ title, premise: episodePremise }) => {
            try {
              const result = await orchestrator.startEpisode(
                accountId,
                user.id,
                title,
                episodePremise
              );
              
              return {
                success: true,
                episode: result.episode,
                firstScene: result.firstScene,
                stateCard: result.stateCard,
              };
            } catch (error) {
              throw new Error(`Orchestration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          },
        },
      },
      prompt: `Create a new episode with this premise: "${premise}"
      
      Please:
      1. Create the episode record in the database
      2. Start the orchestration workflow to generate the first scene
      3. Provide the initial episode state for the user
      
      This will be a live, interactive choose-your-own-adventure podcast episode.`,
    });

    // Return AI SDK streaming response compatible with useChat
    return result.toUIMessageStreamResponse();
  },
  {
    auth: true,
    schema: CreateEpisodeSchema,
  },
);

/**
 * Process choice made by users during live episode
 */
const ProcessChoiceSchema = z.object({
  episodeId: z.string(),
  choice: z.enum(['A', 'B']),
  sceneNumber: z.number().min(1),
});

export const PUT = enhanceRouteHandler(
  async function ({ body, user, request }) {
    const { episodeId, choice, sceneNumber } = ProcessChoiceSchema.parse(body);
    
    const client = getSupabaseServerClient();
    const adminClient = getSupabaseServerAdminClient();
    
    // Verify user has access to this episode (RLS will protect this)
    const { data: episode, error: episodeError } = await client
      .from('episodes')
      .select('id, account_id, status')
      .eq('id', episodeId)
      .single();

    if (episodeError || !episode) {
      return NextResponse.json(
        { error: 'Episode not found or access denied' },
        { status: 404 }
      );
    }

    if (episode.status !== 'active') {
      return NextResponse.json(
        { error: 'Episode is not active' },
        { status: 400 }
      );
    }

    // Create orchestrator for choice processing
    const orchestrator = new EpisodeOrchestrator(
      adminClient,
      process.env.ELEVENLABS_API_KEY!
    );

    // Use AI SDK streamText for choice processing
    const result = streamText({
      model: openai('gpt-4o'),
      system: `You are processing a choice made in an active podcast episode.
      
      Episode ID: ${episodeId}
      Choice Made: ${choice}
      Scene Number: ${sceneNumber}
      User: ${user.email}
      
      Process this choice and generate the next scene using the orchestrator.`,
      tools: {
        // Process the choice using orchestrator
        processChoice: {
          description: 'Process the user choice and generate next scene',
          parameters: z.object({
            choice: z.enum(['A', 'B']),
            sceneNumber: z.number(),
          }),
          execute: async ({ choice: userChoice, sceneNumber: currentScene }) => {
            try {
              const result = await orchestrator.processChoice(
                episodeId,
                userChoice,
                user.id
              );
              
              return {
                success: true,
                nextScene: result.nextScene,
                updatedStateCard: result.updatedStateCard,
                audioGenerated: result.audioGenerated,
              };
            } catch (error) {
              throw new Error(`Choice processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          },
        },
      },
      prompt: `The user has made choice "${choice}" in scene ${sceneNumber}.
      
      Please process this choice and generate the next scene in the episode.`,
    });

    // Return AI SDK streaming response compatible with useChat
    return result.toUIMessageStreamResponse();
  },
  {
    auth: true,
    schema: ProcessChoiceSchema,
  },
);
