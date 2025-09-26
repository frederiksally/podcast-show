'use client';

import { Card, CardContent } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { User, Bot } from 'lucide-react';
// Removed AI SDK import

interface MessageDisplayProps {
  message: {
    role: 'user' | 'assistant';
    content: any; // UIMessage content can be string or array
    id: string;
  };
}

export function MessageDisplay({ message }: MessageDisplayProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
            <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      )}
      
      <div className={`max-w-[80%] ${isUser ? 'order-first' : ''}`}>
        <Card className={`${
          isUser 
            ? 'bg-blue-600 text-white border-blue-600' 
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
        }`}>
          <CardContent className="p-3">
            <div className="space-y-2">
              {/* Message content */}
              <div className={`text-sm whitespace-pre-wrap ${
                isUser ? 'text-white' : 'text-gray-900 dark:text-gray-100'
              }`}>
                {typeof message.content === 'string' ? message.content : 
                 Array.isArray(message.content) ? message.content.map(c => c.text || '').join('') :
                 String(message.content) || 'Loading...'}
              </div>
              
              {/* Message metadata */}
              <div className="flex items-center justify-between text-xs">
                <Badge 
                  variant={isUser ? 'secondary' : 'outline'}
                  className={`${
                    isUser 
                      ? 'bg-blue-500 text-blue-100' 
                      : 'text-gray-500'
                  }`}
                >
                  {isUser ? 'You' : 'AI Assistant'}
                </Badge>
                
                <span className={`${
                  isUser 
                    ? 'text-blue-100' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {new Date().toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {isUser && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </div>
        </div>
      )}
    </div>
  );
}