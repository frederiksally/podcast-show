'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { ChevronDown, ChevronRight, Brain, Search, FileText, Mic, Settings } from 'lucide-react';

interface EpisodeReasoningDisplayProps {
  isStreaming: boolean;
  currentStep?: string;
}

const agentSteps = [
  { 
    id: 'research', 
    name: 'Research Agent', 
    icon: Search, 
    description: 'Gathering information and sources' 
  },
  { 
    id: 'outline', 
    name: 'Structure Agent', 
    icon: FileText, 
    description: 'Creating episode outline and flow' 
  },
  { 
    id: 'script', 
    name: 'Script Agent', 
    icon: Mic, 
    description: 'Writing engaging content and dialogue' 
  },
  { 
    id: 'production', 
    name: 'Production Agent', 
    icon: Settings, 
    description: 'Planning production details and timing' 
  }
];

export function EpisodeReasoningDisplay({ isStreaming, currentStep }: EpisodeReasoningDisplayProps) {
  const [isOpen, setIsOpen] = useState(isStreaming);
  const [activeAgent, setActiveAgent] = useState(0);

  useEffect(() => {
    if (isStreaming) {
      setIsOpen(true);
      // Simulate agent progression
      const interval = setInterval(() => {
        setActiveAgent((prev) => (prev + 1) % agentSteps.length);
      }, 2000);

      return () => clearInterval(interval);
    } else {
      // Close after streaming is complete
      const timer = setTimeout(() => {
        setIsOpen(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isStreaming]);

  if (!isOpen && !isStreaming) return null;

  return (
    <Card className="mb-4 border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
      <CardContent className="p-4">
        <div 
          className="flex items-center gap-2 cursor-pointer" 
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-blue-600" />
          ) : (
            <ChevronRight className="w-4 h-4 text-blue-600" />
          )}
          <Brain className="w-4 h-4 text-blue-600" />
          <span className="font-medium text-blue-900 dark:text-blue-100">
            {isStreaming ? 'AI Agents Working...' : 'Reasoning Complete'}
          </span>
          {isStreaming && (
            <div className="flex space-x-1 ml-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          )}
        </div>

        {isOpen && (
          <div className="mt-3 space-y-3">
            {currentStep && (
              <div className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                {currentStep}
              </div>
            )}
            
            <div className="space-y-2">
              {agentSteps.map((step, index) => {
                const Icon = step.icon;
                const isActive = isStreaming && index === activeAgent;
                const isComplete = !isStreaming || index < activeAgent;
                
                return (
                  <div 
                    key={step.id} 
                    className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700' 
                        : 'bg-transparent'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${
                      isActive 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : isComplete 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-gray-400 dark:text-gray-600'
                    }`} />
                    
                    <div className="flex-1">
                      <div className={`text-sm font-medium ${
                        isActive 
                          ? 'text-blue-900 dark:text-blue-100' 
                          : isComplete 
                            ? 'text-green-900 dark:text-green-100'
                            : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {step.name}
                      </div>
                      <div className={`text-xs ${
                        isActive 
                          ? 'text-blue-700 dark:text-blue-300' 
                          : 'text-gray-500 dark:text-gray-500'
                      }`}>
                        {step.description}
                      </div>
                    </div>
                    
                    <Badge 
                      variant={isActive ? 'default' : isComplete ? 'secondary' : 'outline'}
                      className="text-xs"
                    >
                      {isActive ? 'Active' : isComplete ? 'Complete' : 'Pending'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}