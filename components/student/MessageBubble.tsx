'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { CitationDisplay } from './CitationDisplay'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Copy, Check } from 'lucide-react'
import type { ChatResponse } from '@/types/api'

export interface Message {
  id: string
  text: string
  role: 'user' | 'assistant'
  timestamp: Date
  agent?: ChatResponse['agent']
  citations?: ChatResponse['citations']
  escalated?: boolean
  escalationId?: string
}

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'
  const isEscalated = message.agent === 'ESCALATE' || message.escalated

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message.text)
      setCopied(true)
      toast({
        title: 'Copied!',
        description: 'Message copied to clipboard',
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      toast({
        title: 'Failed to copy',
        description: 'Could not copy message to clipboard',
        variant: 'destructive',
      })
    }
  }

  return (
    <div
      className={cn(
        'flex w-full',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'flex flex-col max-w-[80%] md:max-w-[70%] space-y-1',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        <div className="relative group">
          <div
            className={cn(
              'rounded-lg px-4 py-2.5 shadow-sm',
              isUser
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground'
            )}
          >
            <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
            
            {!isUser && message.citations && message.citations.length > 0 && (
              <CitationDisplay citations={message.citations} className="mt-3" />
            )}
          </div>
          
          {/* Copy button for AI messages */}
          {!isUser && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity',
                'hover:bg-background/80'
              )}
              onClick={handleCopy}
              aria-label="Copy message"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
        </div>

        {isEscalated && (
          <div className="rounded-md bg-blue-500/10 border border-blue-500/20 px-3 py-2 text-xs">
            <p className="text-blue-700 dark:text-blue-400 font-medium">
              Your request has been escalated to the professor for review.
            </p>
            {message.escalationId && (
              <p className="text-blue-600 dark:text-blue-500 mt-1">
                Escalation ID: {message.escalationId}
              </p>
            )}
          </div>
        )}

        <div className="flex items-center space-x-1.5 text-xs text-muted-foreground px-1">
          <span>{format(message.timestamp, 'HH:mm')}</span>
          {!isUser && message.agent && (
            <>
              <span>•</span>
              <span className="capitalize">{message.agent.toLowerCase()}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
