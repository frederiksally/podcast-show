'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Textarea } from '@kit/ui/textarea';
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent
} from '@kit/ui/ai-elements/reasoning';
import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
  ChainOfThoughtSearchResult,
  ChainOfThoughtSearchResults
} from '@kit/ui/ai-elements/chain-of-thought';
import { Search, FileText, Mic, Send } from 'lucide-react';

export function EpisodeStudio() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Array<{role: 'user' | 'assistant'; content: string; id: string}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const [showChainOfThought, setShowChainOfThought] = useState(false);
  const [reasoningText, setReasoningText] = useState('');
  const [chainOfThoughtSteps, setChainOfThoughtSteps] = useState<Array<{
    icon: any;
    label: string;
    description?: string;
    status: 'complete' | 'active' | 'pending';
  }>>([]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = {
      role: 'user' as const,
      content: input,
      id: Date.now().toString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setShowReasoning(true);
    setReasoningText('Processing your podcast episode request...');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] })
      });

      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantContent = '';

        const assistantMessage = {
          role: 'assistant' as const,
          content: '',
          id: (Date.now() + 1).toString()
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Simulate chain of thought steps as content streams
        setChainOfThoughtSteps([
          { icon: Search, label: 'Research Phase', description: 'Gathering topic information', status: 'active' }
        ]);
        setShowChainOfThought(true);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          assistantContent += chunk;
          
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessage.id 
              ? { ...msg, content: assistantContent }
              : msg
          ));

          // Update chain of thought as we get more content
          if (assistantContent.length > 50) {
            setChainOfThoughtSteps([
              { icon: Search, label: 'Research Phase', description: 'Topic research completed', status: 'complete' },
              { icon: FileText, label: 'Episode Outline', description: 'Creating episode structure', status: 'active' }
            ]);
          }
          
          if (assistantContent.length > 200) {
            setChainOfThoughtSteps(prev => [
              ...prev.slice(0, 2).map(step => ({ ...step, status: 'complete' as const })),
              { icon: Mic, label: 'Content Creation', description: 'Writing episode content', status: 'active' }
            ]);
          }
        }

        // Mark all complete
        setChainOfThoughtSteps(prev => prev.map(step => ({ ...step, status: 'complete' as const })));
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
      setShowReasoning(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)]">
      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col">
        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="w-5 h-5" />
              Episode Creation Assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto mb-4 space-y-4 max-h-[500px]">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <Mic className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Ready to create your podcast episode</h3>
                  <p>Describe your episode idea, topic, or ask for help with research, scripting, or planning.</p>
                </div>
              )}
              
              {messages.map((message, index) => (
                <div key={message.id}>
                  <div className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-lg ${
                      message.role === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 dark:bg-gray-800'
                    }`}>
                      {message.content || 'Loading...'}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Official AI Elements Reasoning Component */}
              {showReasoning && (
                <Reasoning isStreaming={isLoading} defaultOpen={true}>
                  <ReasoningTrigger />
                  <ReasoningContent>
                    {reasoningText}
                  </ReasoningContent>
                </Reasoning>
              )}
            </div>

            {/* Simple Input Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="relative">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="What would you like to create for your podcast episode? (e.g., 'Help me create an episode about sustainable living')"
                  className="pr-12 min-h-[60px] resize-none"
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  size="sm"
                  className="absolute bottom-2 right-2"
                  disabled={!input.trim() || isLoading}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Official AI Elements Chain of Thought */}
      {showChainOfThought && (
        <div className="lg:w-80">
          <Card>
            <CardContent className="p-4">
              <ChainOfThought defaultOpen={true}>
                <ChainOfThoughtHeader>Episode Creation Progress</ChainOfThoughtHeader>
                <ChainOfThoughtContent>
                  {chainOfThoughtSteps.map((step, index) => (
                    <ChainOfThoughtStep
                      key={index}
                      icon={step.icon}
                      label={step.label}
                      description={step.description}
                      status={step.status}
                    >
                      {step.label === 'Research Phase' && step.status === 'complete' && (
                        <ChainOfThoughtSearchResults>
                          <ChainOfThoughtSearchResult>
                            Topic research completed
                          </ChainOfThoughtSearchResult>
                        </ChainOfThoughtSearchResults>
                      )}
                    </ChainOfThoughtStep>
                  ))}
                </ChainOfThoughtContent>
              </ChainOfThought>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}