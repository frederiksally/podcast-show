import { use } from 'react';

import { Trans } from '@kit/ui/trans';
import { withI18n } from '~/lib/i18n/with-i18n';

import { CreateEpisodePageContent } from '../_components/create-episode-page-content';
import { loadUserWorkspace } from '../../_lib/server/load-user-workspace';

export const metadata = {
  title: 'Create Episode',
  description: 'Create a new choose-your-own-adventure podcast episode with real-time AI orchestration',
};

/**
 * Episode Studio Page - Personal Account Context (Server Component)
 * 
 * This page allows users to create interactive podcast episodes using the
 * multi-agent orchestrator. It's located in the personal account context
 * at /home/episodes/create.
 * 
 * Features:
 * - Real-time episode generation using Episode Multi-Agent Orchestrator
 * - Interactive choose-your-own-adventure format
 * - AI Elements for showing reasoning and progress
 * - Live audio cue generation
 * - State management and continuity tracking
 */
function CreateEpisodePage() {
  // Get workspace data from the same source as layout
  const workspace = use(loadUserWorkspace());
  
  if (!workspace?.workspace?.id) {
    throw new Error('Personal account not found');
  }

  return (
    <div className="flex flex-col space-y-6 p-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          <Trans i18nKey="common:routes.createEpisode" />
        </h1>
        <p className="text-muted-foreground">
          Create immersive choose-your-own-adventure podcast episodes with real-time AI orchestration.
          Watch as multiple agents work together to craft engaging stories, generate music, and create sound effects.
        </p>
      </div>

      <CreateEpisodePageContent accountId={workspace.workspace.id} />
    </div>
  );
}

export default withI18n(CreateEpisodePage);
