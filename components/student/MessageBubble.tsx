'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
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
          'flex flex-col max-w-[85%] md:max-w-[75%] space-y-2',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        <div className="relative group">
          <div
            className={cn(
              'rounded-xl px-4 py-3 shadow-sm border',
              isUser
                ? 'bg-primary text-primary-foreground border-primary/20'
                : 'bg-card text-foreground border-border/50'
            )}
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.text}</p>
            
            {!isUser && message.citations && message.citations.length > 0 && (
              <CitationDisplay citations={message.citations} className="mt-3 pt-3 border-t border-border/30" />
            )}
          </div>
          
          {/* Copy button for AI messages */}
          {!isUser && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'absolute -top-1 -right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-all duration-200',
                'hover:bg-background/90 border border-border shadow-sm',
                'hover:scale-110 active:scale-95'
              )}
              onClick={handleCopy}
              aria-label="Copy message"
            >
              {copied ? (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                >
                  <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                </motion.div>
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
        </div>

        {isEscalated && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="w-full rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-4 py-3 space-y-1"
          >
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Your request has been escalated to the professor for review.
            </p>
            {message.escalationId && (
              <p className="text-xs text-blue-600 dark:text-blue-400 font-mono">
                Escalation ID: {message.escalationId}
              </p>
            )}
          </motion.div>
        )}

        <div className="flex items-center space-x-1.5 text-xs text-muted-foreground px-2">
          <span>{format(message.timestamp, 'HH:mm')}</span>
          {!isUser && message.agent && (
            <>
              <span>•</span>
              <span className="capitalize font-medium">{message.agent.toLowerCase()}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
