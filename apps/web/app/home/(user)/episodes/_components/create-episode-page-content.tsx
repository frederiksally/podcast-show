'use client';

import { EpisodeStudio } from '@kit/ui/ai-elements';
import { toast } from '@kit/ui/sonner';

interface CreateEpisodePageContentProps {
  accountId: string;
}

/**
 * Client-side wrapper for Episode Studio with event handlers
 * 
 * This component handles the client-side logic for episode creation
 * events and user interactions while the parent page remains a server component.
 */
export function CreateEpisodePageContent({ accountId }: CreateEpisodePageContentProps) {
  const handleEpisodeCreated = (episode: any) => {
    console.log('Episode created:', episode);
    
    // Show success toast
    toast.success('Episode created successfully!', {
      description: `Your episode "${episode.title}" is now active and ready for interaction.`,
    });
    
    // TODO: Could navigate to episode management page or trigger other actions
    // router.push(`/home/episodes/${episode.id}`);
  };

  const handleSceneGenerated = (scene: any) => {
    console.log('Scene generated:', scene);
    
    // Could trigger audio playback, analytics, or other scene-specific actions
    // For now, we'll let the Episode Studio handle the display
  };

  return (
    <EpisodeStudio 
      accountId={accountId}
      onEpisodeCreated={handleEpisodeCreated}
      onSceneGenerated={handleSceneGenerated}
    />
  );
}