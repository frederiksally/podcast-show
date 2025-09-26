'use client';

import { useState } from 'react';
import { Badge } from '@kit/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@kit/ui/collapsible';
import { 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  Search, 
  Mic, 
  Settings,
  CheckCircle,
  Clock,
  PlayCircle
} from 'lucide-react';

interface ChainOfThoughtData {
  episodeOutline: Array<{
    title: string;
    content: string;
    status: 'complete' | 'active' | 'pending';
  }>;
  researchFindings: Array<{
    source: string;
    finding: string;
    status: 'complete' | 'active' | 'pending';
  }>;
  scriptSegments: Array<{
    segment: string;
    content: string;
    duration?: string;
    status: 'complete' | 'active' | 'pending';
  }>;
  productionNotes: Array<{
    note: string;
    category: string;
    status: 'complete' | 'active' | 'pending';
  }>;
}

interface EpisodeChainOfThoughtProps {
  data: ChainOfThoughtData;
}

export function EpisodeChainOfThought({ data }: EpisodeChainOfThoughtProps) {
  const [openSections, setOpenSections] = useState({
    outline: true,
    research: true,
    script: false,
    production: false
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getStatusIcon = (status: 'complete' | 'active' | 'pending') => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'active':
        return <PlayCircle className="w-4 h-4 text-blue-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: 'complete' | 'active' | 'pending') => {
    const variants = {
      complete: 'secondary' as const,
      active: 'default' as const,
      pending: 'outline' as const
    };
    
    return (
      <Badge variant={variants[status]} className="text-xs">
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Episode Outline */}
      {data.episodeOutline.length > 0 && (
        <Collapsible open={openSections.outline} onOpenChange={() => toggleSection('outline')}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg">
            <div className="flex items-center gap-2">
              {openSections.outline ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <FileText className="w-4 h-4 text-purple-600" />
              <span className="font-medium">Episode Outline</span>
              <Badge variant="secondary" className="text-xs">
                {data.episodeOutline.length}
              </Badge>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
            {data.episodeOutline.map((item, index) => (
              <Card key={index} className="p-3 bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(item.status)}
                      <h4 className="font-medium text-sm">{item.title}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      {item.content}
                    </p>
                  </div>
                  {getStatusBadge(item.status)}
                </div>
              </Card>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Research Findings */}
      {data.researchFindings.length > 0 && (
        <Collapsible open={openSections.research} onOpenChange={() => toggleSection('research')}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg">
            <div className="flex items-center gap-2">
              {openSections.research ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <Search className="w-4 h-4 text-blue-600" />
              <span className="font-medium">Research</span>
              <Badge variant="secondary" className="text-xs">
                {data.researchFindings.length}
              </Badge>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
            {data.researchFindings.map((item, index) => (
              <Card key={index} className="p-3 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(item.status)}
                      <h4 className="font-medium text-sm">{item.source}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      {item.finding}
                    </p>
                  </div>
                  {getStatusBadge(item.status)}
                </div>
              </Card>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Script Segments */}
      {data.scriptSegments.length > 0 && (
        <Collapsible open={openSections.script} onOpenChange={() => toggleSection('script')}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg">
            <div className="flex items-center gap-2">
              {openSections.script ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <Mic className="w-4 h-4 text-green-600" />
              <span className="font-medium">Script</span>
              <Badge variant="secondary" className="text-xs">
                {data.scriptSegments.length}
              </Badge>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
            {data.scriptSegments.map((item, index) => (
              <Card key={index} className="p-3 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(item.status)}
                      <h4 className="font-medium text-sm">{item.segment}</h4>
                      {item.duration && (
                        <Badge variant="outline" className="text-xs">
                          {item.duration}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      {item.content}
                    </p>
                  </div>
                  {getStatusBadge(item.status)}
                </div>
              </Card>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Production Notes */}
      {data.productionNotes.length > 0 && (
        <Collapsible open={openSections.production} onOpenChange={() => toggleSection('production')}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg">
            <div className="flex items-center gap-2">
              {openSections.production ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <Settings className="w-4 h-4 text-orange-600" />
              <span className="font-medium">Production</span>
              <Badge variant="secondary" className="text-xs">
                {data.productionNotes.length}
              </Badge>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
            {data.productionNotes.map((item, index) => (
              <Card key={index} className="p-3 bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(item.status)}
                      <h4 className="font-medium text-sm">{item.category}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      {item.note}
                    </p>
                  </div>
                  {getStatusBadge(item.status)}
                </div>
              </Card>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}