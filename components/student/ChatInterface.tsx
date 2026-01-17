'use client'

import { useState, useOptimistic, useRef, useEffect, startTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { MessageBubble, type Message } from './MessageBubble'
import { sendChatMessage } from '@/lib/api/chat'
import { Send, AlertCircle } from 'lucide-react'

interface ChatInterfaceProps {
  courseId: string
  userId: string
  initialMessages?: Message[]
}

type OptimisticMessage = Message | { id: string; text: string; role: 'user' | 'assistant'; timestamp: Date; pending?: boolean }

export function ChatInterface({ courseId, userId, initialMessages = [] }: ChatInterfaceProps) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Use useOptimistic for fast message updates
  const [optimisticMessages, addOptimisticMessage] = useOptimistic<Message[], OptimisticMessage>(
    messages,
    (state, newMessage: OptimisticMessage) => {
      const message: Message = {
        id: newMessage.id,
        text: newMessage.text,
        role: newMessage.role,
        timestamp: newMessage.timestamp instanceof Date ? newMessage.timestamp : new Date(newMessage.timestamp),
        agent: (newMessage as Message).agent,
        citations: (newMessage as Message).citations,
        escalated: (newMessage as Message).escalated,
        escalationId: (newMessage as Message).escalationId,
      }
      return [...state, message]
    }
  )

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [optimisticMessages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: input.trim(),
      role: 'user',
      timestamp: new Date(),
    }

    // Add user message optimistically (wrapped in startTransition for React 19)
    startTransition(() => {
      addOptimisticMessage(userMessage)
    })
    setInput('')
    setError(null)
    setIsLoading(true)

    try {
      const response = await sendChatMessage({
        message: userMessage.text,
        courseId,
        userId,
      })

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        text: response.response,
        role: 'assistant',
        timestamp: new Date(),
        agent: response.agent,
        citations: response.citations,
        escalated: response.escalated,
        escalationId: response.escalationId,
      }

      // Update actual messages state with both user and assistant messages
      // This will sync with useOptimistic and resolve the optimistic user message
      // The user message is already in optimistic state, so we only add it if not present
      setMessages((prev) => {
        // Only add user message if it's not already there
        const withoutUser = prev.filter(msg => msg.id !== userMessage.id)
        return [...withoutUser, userMessage, assistantMessage]
      })
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to send message. Please try again.')
      
      // Remove the optimistic user message on error by reverting messages state
      setMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full max-h-[800px] border rounded-lg bg-background">
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {optimisticMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <p className="text-muted-foreground text-sm">
                Start a conversation by asking a question about your course.
              </p>
              <p className="text-muted-foreground text-xs mt-2">
                Try asking about course policies, concepts, or schedules.
              </p>
            </div>
          ) : (
            optimisticMessages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-2.5 flex items-center space-x-2">
                <LoadingSpinner size="sm" />
                <span className="text-sm text-muted-foreground">AI is thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {error && (
        <div className="mx-4 mb-2 flex items-start space-x-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex items-end space-x-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your course..."
            className="min-h-[60px] max-h-[200px] resize-none"
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e as any)
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="h-[60px] w-[60px] flex-shrink-0"
          >
            {isLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
