# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a **Next.js 15 SaaS starter kit** with **Supabase backend**, built using **Turborepo** for monorepo management. It features a multi-tenant architecture supporting both personal and team accounts with role-based permissions.

## Core Technologies

- **Next.js 15** with App Router
- **Supabase** for database, auth, and storage  
- **React 19**
- **TypeScript**
- **Tailwind CSS 4** and Shadcn UI
- **AI SDK 5** with official Elements components
- **Turborepo** for monorepo management
- **pnpm** as package manager

## Essential Commands

### Development Workflow
```bash
pnpm dev                    # Start all apps in development mode
pnpm --filter web dev       # Start main web app only (port 3000)
pnpm build                  # Build all packages and apps
pnpm clean                  # Clean all node_modules and build artifacts
```

### Database Operations (Critical Sequence ⚠️)
```bash
pnpm supabase:web:start     # Start Supabase locally
pnpm --filter web supabase:db:diff -f <migration_name>  # Create migration after schema changes
pnpm --filter web supabase migration up                 # Apply new migrations
pnpm supabase:web:reset     # Reset with latest schema (clean rebuild)
pnpm supabase:web:typegen   # Generate TypeScript types from database
pnpm supabase:web:test      # Run Supabase tests
```

**Critical Database Workflow**: When adding new database features, ALWAYS follow this exact order:
1. Create/modify schema file in `apps/web/supabase/schemas/XX-feature.sql`
2. Generate migration: `pnpm --filter web supabase:db:diff -f <migration_name>`
3. Apply changes: `pnpm --filter web supabase migration up`
4. Generate types: `pnpm supabase:web:typegen`
5. Verify types exist before using in code

⚠️ **NEVER skip step 2** - schema files alone don't create tables!

### Database Schema Files
```bash
apps/web/supabase/schemas/
├── 15-episodes.sql              # Episodes, episode_scenes, episode_audio tables with RLS
├── 16-episode-bible.sql         # Episode Bibles table with flexible world_style field
└── 17-episode-audio-storage.sql # Supabase Storage integration and helper functions
```

### Code Quality
```bash
pnpm typecheck              # Type check all packages
pnpm lint                   # Lint all packages  
pnpm lint:fix               # Auto-fix linting issues
pnpm format                 # Check code formatting
pnpm format:fix             # Auto-format code
pnpm test                   # Run tests across all packages
```

### Testing
```bash
pnpm test                   # Run all tests
pnpm --filter e2e test      # Run E2E tests (Playwright)
pnpm supabase:web:test      # Run Supabase database tests

# Episode Multi-Agent Workflow Testing
cd apps/web && OPENAI_API_KEY=your_key pnpm --filter agents test episode-multi-agent-workflow.test.ts
```

### Billing Integration
```bash
pnpm stripe:listen          # Start Stripe webhook listener for development
```

### AI Elements Integration
```bash
# Install official AI Elements components (run from packages/ui directory)
cd packages/ui
npx ai-elements@latest add prompt-input
npx ai-elements@latest add reasoning  
npx ai-elements@latest add chain-of-thought
```

## Monorepo Architecture

### Apps Structure
- `apps/web` - Main Next.js SaaS application
- `apps/e2e` - Playwright end-to-end tests
- `apps/dev-tool` - Development utilities

### Packages Structure
- `packages/features/*` - Feature-specific packages (accounts, auth, billing, etc.)
- `packages/ui` - Shared UI components, design system, and AI Elements
- `packages/supabase` - Supabase client utilities and types
- `packages/shared` - Common utilities and configurations
- `packages/billing/*` - Payment processing (Stripe, Lemon Squeezy)
- `packages/mailers/*` - Email service providers
- `packages/agents` - Episode  multi-agent system for story generation
- `tooling/*` - Development tools and configurations

#### UI Package AI Elements Structure
- `packages/ui/src/components/ai-elements/` - Official AI SDK Elements components
  - `reasoning.tsx` - Shows AI thinking process with automatic open/close
  - `chain-of-thought.tsx` - Step-by-step reasoning visualization
  - `prompt-input.tsx` - Rich input with attachments and model selection
  - `response.tsx` - Streaming AI response display
  - `episode-studio.tsx` - Complete Episode Studio UI with multi-agent progress

## Multi-Tenant Architecture

The application supports two account types:

**Personal Accounts**: Individual user accounts (`auth.users.id = accounts.id`)
**Team Accounts**: Shared workspaces with members, roles, and permissions

Data associates with accounts via foreign keys for proper access control using Row Level Security (RLS).

## Next.js App Router Structure

```
apps/web/app/
├── (marketing)/          # Public pages (landing, blog, docs)
├── (auth)/              # Authentication pages  
├── home/
│   ├── (user)/          # Personal account context
│   │   └── episodes/    # Episode management
│   │       └── create/  # Episode Studio with AI Elements
│   └── [account]/       # Team account context ([account] = team slug)
├── admin/               # Super admin section
└── api/                 # API routes
    ├── chat/           # Simple AI chat streaming endpoint (legacy)
    └── episodes/
        └── orchestrate/ # Episode Multi-Agent Orchestrator API (streaming)
```

## Key Development Patterns

### Server Components (Preferred)
Always use async server components for initial data loading:

```typescript
// ✅ CORRECT - Next.js 15 pattern
async function Page({ params }: Props) {
  const { account } = await params; // Direct await in async components
  const client = getSupabaseServerClient();
  const { data } = await client.from('notes').select('*');
  return <NotesList notes={data} />;
}
```

### Form Architecture
Organize schemas for reusability between server actions and client forms:

```
_lib/
├── schemas/
│   └── feature.schema.ts    # Shared Zod schemas
├── server/
│   └── server-actions.ts    # Server actions import schemas
└── client/
    └── forms.tsx            # Forms import same schemas
```

### Workspace Contexts

**Personal Account Context** (`app/home/(user)`):
```tsx
import { useUserWorkspace } from '@kit/accounts/hooks/use-user-workspace';

function PersonalComponent() {
  const { user, account } = useUserWorkspace();
  // Personal account data
}
```

**Team Account Context** (`app/home/[account]`):
```tsx
import { useTeamAccountWorkspace } from '@kit/team-accounts/hooks/use-team-account-workspace';

function TeamComponent() {
  const { account, user, accounts } = useTeamAccountWorkspace();
  // Team account data with permissions
}
```

## Important File Patterns

### Component Organization
- Route-specific components: `_components/` directories
- Route utilities: `_lib/` for client, `_lib/server/` for server-side
- Global components: Root-level directories

### Navigation Configuration
- Personal navigation: `config/personal-account-navigation.config.tsx`
- Team navigation: `config/team-account-navigation.config.tsx`
- Paths: `config/paths.config.ts`

### Configuration Files
- Feature flags: `config/feature-flags.config.ts`
- i18n settings: `lib/i18n/i18n.settings.ts`
- Supabase config: `supabase/config.toml`

## Development Guidelines

### TypeScript Best Practices
- Always use implicit type inference unless impossible
- Avoid using `any` type
- Use service pattern for server-side APIs
- Add `server-only` to exclusively server-side code
- Handle errors gracefully with try/catch

### React Patterns
- Use `react-hook-form` and `@kit/ui/form` for all forms
- Always use 'use client' directive for client components
- Avoid `useEffect` when possible - prefer server-side data fetching
- Use single state objects instead of multiple `useState` calls

### Next.js Patterns
- Use `enhanceAction` for Server Actions
- Use `enhanceRouteHandler` for API Routes
- Export page components with `withI18n` utility
- Use `redirect` after server actions instead of client-side routing

### UI Component Usage
Always check `@kit/ui` first before external packages:
- Toast notifications: `import { toast } from '@kit/ui/sonner'`
- Forms: `import { Form, FormField, ... } from '@kit/ui/form'`

### AI Elements Component Usage
Use official AI SDK Elements for all AI interactions:
```typescript
// Reasoning Component - Shows AI thinking process
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent
} from '@kit/ui/ai-elements/reasoning';

<Reasoning isStreaming={isLoading} defaultOpen={true}>
  <ReasoningTrigger />
  <ReasoningContent>
    Processing your podcast episode request...
  </ReasoningContent>
</Reasoning>

// Chain of Thought - Step-by-step reasoning
import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
  ChainOfThoughtSearchResult,
  ChainOfThoughtSearchResults
} from '@kit/ui/ai-elements/chain-of-thought';

<ChainOfThought defaultOpen={true}>
  <ChainOfThoughtHeader>Episode Creation Progress</ChainOfThoughtHeader>
  <ChainOfThoughtContent>
    <ChainOfThoughtStep
      icon={SearchIcon}
      label="Research Phase"
      description="Gathering information and sources"
      status="complete"
    >
      <ChainOfThoughtSearchResults>
        <ChainOfThoughtSearchResult>
          Topic research completed
        </ChainOfThoughtSearchResult>
      </ChainOfThoughtSearchResults>
    </ChainOfThoughtStep>
  </ChainOfThoughtContent>
</ChainOfThought>
```

## Security & Authorization

### Authentication
- Authentication enforced by middleware
- Authorization handled by RLS at database level
- Use standard Supabase client for RLS-protected operations
- Use admin client only when necessary (requires manual authorization)

### Permission Patterns
```typescript
// Check team permissions
const canManageBilling = await api.hasPermission({
  accountId,
  userId,
  permission: 'billing.manage'
});

// Check account ownership
const isOwner = await client.rpc('is_account_owner', { 
  account_id: accountId 
});
```

## Testing Strategy

- **Unit Tests**: Individual package testing
- **E2E Tests**: Playwright tests in `apps/e2e`
- **Database Tests**: Supabase-specific tests
- Use `data-test` attributes for E2E test targeting

## Environment Requirements

- **Node.js**: >= v18.18.0
- **Package Manager**: pnpm@10.14.0
- **Runtime**: Next.js 15 with App Router
- **AI SDK**: v5.0.48 with @ai-sdk/react v2.0.52

## AI-Driven Choose-Your-Own-Adventure Episodes

This app creates **real-time, AI-driven choose-your-own-adventure podcast episodes**. Each episode is an interactive story where guests make choices that shape the narrative. The multi-agent AI framework generates consistent, engaging stories with dynamic audio, following a premise provided by the host.

Episodes start when the host provides a premise (e.g., "We're trapped in a haunted amusement park"). The AI system creates an **Episode Bible** containing the creative world and guidelines, then generates the story scene by scene as guests make decisions. ElevenLabs API provides dynamic music and sound effects.

## Episode Bible Multi-Agent Architecture

The system uses a **database-driven Episode Bible workflow** following AI SDK best practices:

### Complete Episode Multi-Agent Workflow

**User Input → Orchestrator → Story Director/Scene Planner/State Agent → Music/SFX Agents**

1. **Episode Orchestrator** receives user premise and coordinates workflow
2. **Story Director** creates Episode Bible (once per episode) → stored in database
3. **State Agent** initializes story state with premise and key facts
4. **Scene Planner** generates first scene using Episode Bible guidelines
5. **Music Agent** creates background music for scene (ElevenLabs Music API)
6. **SFX Agent** generates contextual sound effects (ElevenLabs SFX API)
7. **State Agent** updates story state based on guest choices
8. **Scene Planner** generates subsequent scenes using same Episode Bible
9. **Audio Agents** continue generating scene-specific audio
10. **Database persistence** maintains state across all LLM sessions

### Key Principles
- **Episode Bible created ONCE per episode** for consistency and efficiency
- **Database persistence** allows proper state management across LLM sessions
- **AI SDK best practices** with clean Orchestrator-Worker delegation pattern
- **Scene Planner directs audio** for dynamic per-scene music and SFX
- **No per-scene Story Director calls** - Episode Bible contains all creative guidance

### Agent Specializations
- **Episode Orchestrator**: Coordinates complete workflow using AI SDK Orchestrator-Worker pattern
- **Story Director**: Creates comprehensive Episode Bible with world rules, tone, audio direction (once per episode)
- **Scene Planner**: Generates scenes + audio cues using Episode Bible for consistency
- **State Agent**: Manages story state, key facts, and callback anchors between scenes
- **Continuity Agent**: Analyzes callback opportunities and narrative coherence
- **Music Agent**: Generates background music using ElevenLabs Music API with best practices
- **SFX Agent**: Creates sound effects using ElevenLabs Sound Effects API with proper categorization
- **Audio Tools**: Low-level ElevenLabs API integration for music and SFX generation

### Database Schema
- **Episodes**: Core episode data with premise, state_card (jsonb), status, account associations
- **Episode Bibles**: Creative guidelines and world rules (one per episode) with flexible styling
- **Episode Scenes**: Scene-by-scene story progression with choices and audio cues
- **Episode Audio**: Generated music and SFX with Supabase Storage integration and ElevenLabs metadata
- **Supabase Storage**: `episode-audio` bucket with organized paths and RLS policies

### Agents Package Structure
```
packages/agents/src/
├── base/
│   └── types.ts                    # TypeScript interfaces (EpisodeBible, StateCard, etc.)
├── episodes/
│   ├── orchestrator.ts             # Episode Orchestrator (workflow coordinator)
│   ├── story-director.ts           # Story Director (Episode Bible creation)
│   ├── scene-planner.ts            # Scene Planner (scene + audio cue generation)
│   ├── state-agent.ts              # State Agent (story state management)
│   ├── continuity-agent.ts         # Continuity Agent (callback analysis)
│   ├── music-agent.ts              # Music Agent (ElevenLabs Music API)
│   └── sfx-agent.ts                # SFX Agent (ElevenLabs Sound Effects API)
├── tools/
│   ├── episode-tools.ts            # Database CRUD for episodes/scenes
│   ├── episode-bible-tools.ts      # Database CRUD for Episode Bibles
│   └── audio-tools.ts              # ElevenLabs API integration
└── episode-multi-agent-workflow.test.ts  # Comprehensive workflow tests
```

## ElevenLabs Audio Integration

The system uses **ElevenLabs APIs** for professional-quality audio generation following best practices:

### Music Agent (ElevenLabs Music API)
- **Purpose**: Generate instrumental background music for podcast scenes (max 5 minutes per scene)
- **Best Practices**:
  - Always include "instrumental only" in prompts for podcast background use
  - Use detailed musical language (BPM, key signatures, instrumentation)
  - Follow genre conventions from Episode Bible
  - Specify duration in milliseconds (10s-5min range)
  - Include emotional descriptors and musical terminology

```typescript
// Example Music Agent usage
const musicTrack = await musicAgent.generateSceneMusic(
  episodeBible,
  narration,
  sceneNumber,
  estimatedDurationSeconds
);

// Generates ElevenLabs-optimized prompts like:
// "Create haunting instrumental only piano and strings background music 
//  for podcast, 90 BPM in A minor, with creepy atmosphere..."
```

### SFX Agent (ElevenLabs Sound Effects API)
- **Purpose**: Create contextual sound effects based on scene narration
- **Categories**: Simple, Complex, Musical, Ambient, Impact, One-shot
- **Best Practices**:
  - Use clear, actionable descriptions ("Heavy wooden door creaking open")
  - Set duration limits (0.5-30 seconds) or auto-detection
  - Control prompt influence (0.3 default, higher for precision)
  - Enable looping for ambient/atmospheric sounds
  - Use professional audio terminology (impact, whoosh, ambience, drone)

```typescript
// Example SFX Agent usage
const sfxEffects = await sfxAgent.generateSceneSFX(
  episodeBible,
  narration,
  sceneNumber
);

// Generates effects like:
// { text: "Thunder rumbling ominously in distance", 
//   durationSeconds: 5, promptInfluence: 0.3, loop: true }
```

### Audio Tools Integration
- **Music Generation**: `music.compose()` and `music.composeDetailed()` for complex compositions
- **SFX Generation**: `textToSoundEffects.convert()` with duration/loop controls
- **Storage Integration**: Automatic upload to Supabase Storage with public URLs
- **Database Tracking**: All generated audio stored in `episode_audio` table

### Environment Setup
```bash
# Required API keys in .env.development
OPENAI_API_KEY=your_openai_key
ELEVENLABS_API_KEY=your_elevenlabs_key
```

## Episode Multi-Agent Workflow Testing

The system includes comprehensive tests validating the complete workflow:

### Test Coverage
- **Complete Orchestrator Workflow**: Tests entire user input → orchestrator → agents → audio flow
- **Episode Bible Creation**: Verifies Story Director creates Episode Bible once per episode
- **Scene Generation**: Tests Scene Planner uses Episode Bible for consistent scenes
- **Audio Generation**: Validates Music and SFX agents follow ElevenLabs best practices
- **State Management**: Ensures proper story progression and choice handling
- **Database Integration**: Tests Episode Bible and scene persistence

### Running Tests
```bash
# From project root
cd apps/web
OPENAI_API_KEY=your_key ELEVENLABS_API_KEY=your_key pnpm --filter agents test episode-multi-agent-workflow.test.ts

# Expected output:
# ✅ Complete orchestrator workflow (Story Director → Scene Planner → Audio Agents)
# ✅ Music Agent ElevenLabs integration (instrumental only, proper duration)
# ✅ SFX Agent sound effects generation (clear descriptions, duration limits)
# ✅ Episode Bible workflow efficiency (once per episode creation)
```

### Key Test Validations
- Story Director called only once per episode
- Episode Bible reused across all scene generations
- Music tracks include "instrumental only" for podcast use
- SFX effects follow ElevenLabs duration/category constraints
- State progression maintains story continuity
- Audio cues generated dynamically per scene

## Episode Studio Feature

### File Structure
```
apps/web/app/home/(user)/episodes/
├── create/
│   ├── page.tsx                           # Episode creation page (Server Component)
│   └── _components/
│       └── create-episode-page-content.tsx # Client wrapper with event handlers
└── _components/
    └── episode-studio.tsx                 # Legacy component (simple chat interface)

packages/ui/src/components/ai-elements/
└── episode-studio.tsx                     # Main Episode Studio UI component

apps/web/app/api/episodes/orchestrate/
└── route.ts                              # Episode Multi-Agent Orchestrator API
```

### Key Features
- **Real-time Multi-Agent Orchestration**: Live coordination of Story Director → Scene Planner → Audio Agents
- **AI Elements Integration**: Uses official AI SDK Elements for reasoning, chain-of-thought, and progress visualization
- **Interactive Choose-Your-Own-Adventure**: Button-based choice selection with real-time scene generation
- **Episode Bible Consistency**: Story Director creates comprehensive creative guidelines used across all scenes
- **Dynamic Audio Generation**: Music and SFX agents create contextual audio using ElevenLabs APIs
- **State Management**: Tracks story progression, key facts, anchors, and callback opportunities
- **Database Persistence**: Episodes, scenes, bibles, and audio stored with proper RLS protection
- **Supabase Storage Integration**: Audio files organized in structured buckets with access control

### Architecture Implementation
- **Server Component Pattern**: Next.js 15 async server component with personal account context
- **Client Component Separation**: Server component handles data fetching, client component handles interactions
- **AI SDK Streaming**: Uses `streamText` with orchestrator tools instead of custom streaming implementation
- **Account Context**: Uses `createAccountsApi` to fetch workspace data server-side for RLS compliance
- **Event Handlers**: Client component manages episode creation and scene generation callbacks

### API Integration
- **Primary Endpoint**: `/api/episodes/orchestrate` - POST for episode creation, PUT for choice processing
- **Streaming Implementation**: AI SDK `streamText` with `enhanceRouteHandler` and authentication
- **Multi-Agent Coordination**: Integrates with `EpisodeOrchestrator` class from agents package
- **Database Integration**: Creates episodes, scenes, and audio records with account associations
- **Navigation**: Accessible via "Create Episode" in personal account menu
- **Route**: `/home/episodes/create`

## Troubleshooting Commands

```bash
# Reset everything and start fresh
pnpm clean && pnpm install

# Reset database with latest schema
pnpm supabase:web:reset && pnpm supabase:web:typegen

# Fix dependency issues
pnpm syncpack:fix

# Check for type errors across all packages
pnpm typecheck

# Test Episode Multi-Agent Workflow (requires API keys)
cd apps/web && OPENAI_API_KEY=your_key ELEVENLABS_API_KEY=your_key pnpm --filter agents test

# Generate environment file templates
pnpm env:generate
```
