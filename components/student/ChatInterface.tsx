'use client'

import { useState, useOptimistic, useRef, useEffect, startTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { MessageBubble, type Message } from './MessageBubble'
import { sendChatMessage, getChatHistory } from '@/lib/api/chat'
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
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLElement | null>(null)
  const [isUserAtBottom, setIsUserAtBottom] = useState(true)
  const userScrolledUpRef = useRef(false)

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

  // Load chat history on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        setIsLoadingHistory(true)
        const history = await getChatHistory(courseId, userId, 100)
        
        // Transform API messages to match Message type
        const transformedMessages: Message[] = history.messages.map((msg) => ({
          id: msg.id,
          text: msg.text,
          role: msg.role,
          timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
          agent: msg.agent,
          citations: msg.citations,
          escalated: msg.escalated,
          escalationId: msg.escalationId,
        }))
        
        setMessages(transformedMessages)
        
        // Scroll to bottom after loading history
        setTimeout(() => {
          const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement
          if (viewport && messagesEndRef.current) {
            viewport.scrollTop = viewport.scrollHeight
            setIsUserAtBottom(true)
          }
        }, 100)
      } catch (err: any) {
        console.error('Error loading chat history:', err)
        // Don't show error, just start with empty messages
      } finally {
        setIsLoadingHistory(false)
      }
    }

    // Only load if no initial messages provided
    if (initialMessages.length === 0) {
      loadHistory()
    } else {
      setIsLoadingHistory(false)
    }
  }, [courseId, userId, initialMessages.length])

  // Check if user is at bottom of scroll area
  useEffect(() => {
    // Find the viewport element inside ScrollArea (Radix UI creates it)
    const findViewport = () => {
      if (!scrollAreaRef.current) return null
      return scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement
    }

    const checkScrollPosition = () => {
      const viewport = viewportRef.current || findViewport()
      if (!viewport) return

      viewportRef.current = viewport
      const { scrollTop, scrollHeight, clientHeight } = viewport
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50 // 50px threshold
      setIsUserAtBottom(isAtBottom)
      // Track if user manually scrolled up
      if (!isAtBottom) {
        userScrolledUpRef.current = true
      } else if (isAtBottom) {
        // Reset flag when user scrolls back to bottom
        userScrolledUpRef.current = false
      }
    }

    // Check initially after a short delay to let ScrollArea render
    const timeoutId = setTimeout(() => {
      checkScrollPosition()
      const viewport = findViewport()
      if (viewport) {
        viewport.addEventListener('scroll', checkScrollPosition, { passive: true })
      }
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      if (viewportRef.current) {
        viewportRef.current.removeEventListener('scroll', checkScrollPosition)
      }
    }
  }, [optimisticMessages.length]) // Re-check when messages change

  // Auto-scroll to bottom when messages change, but only if user is at bottom and hasn't scrolled up
  useEffect(() => {
    // Only auto-scroll if:
    // 1. User is at bottom
    // 2. User hasn't manually scrolled up
    // 3. Not loading history
    if (messagesEndRef.current && isUserAtBottom && !userScrolledUpRef.current && !isLoadingHistory) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        const viewport = viewportRef.current
        if (viewport) {
          const { scrollHeight, clientHeight } = viewport
          // Double-check we're still at bottom before scrolling
          const currentScrollTop = viewport.scrollTop
          const isStillAtBottom = scrollHeight - currentScrollTop - clientHeight < 50
          if (isStillAtBottom) {
            // Scroll within the viewport, not the page
            viewport.scrollTo({
              top: scrollHeight,
              behavior: 'smooth'
            })
          }
        }
      }, 100)
    }
  }, [optimisticMessages, isUserAtBottom, isLoadingHistory])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!input.trim() || isLoading) return

    // Check if user is at bottom before submitting
    // If they are, we'll auto-scroll. If not, don't force scroll.
    const viewport = viewportRef.current
    let wasAtBottom = true
    if (viewport) {
      const { scrollTop, scrollHeight, clientHeight } = viewport
      wasAtBottom = scrollHeight - scrollTop - clientHeight < 50
    }
    
    // If user was at bottom, allow auto-scroll. Otherwise, don't scroll.
    if (!wasAtBottom) {
      userScrolledUpRef.current = true
    }

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
    <div className="flex flex-col h-[600px] border rounded-lg bg-background overflow-hidden">
      <ScrollArea className="flex-1 p-4 overflow-hidden" ref={scrollAreaRef}>
        <div className="space-y-4">
          {isLoadingHistory ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <LoadingSpinner size="lg" />
              <p className="text-muted-foreground text-sm mt-4">
                Loading chat history...
              </p>
            </div>
          ) : optimisticMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <p className="text-muted-foreground text-sm">
                Start a conversation by asking a question about your course.
              </p>
              <p className="text-muted-foreground text-xs mt-2">
                Try asking about course policies, concepts, or schedules.
              </p>
            </div>
          ) : (
            <>
              {optimisticMessages.map((message) => (
              <MessageBubble key={message.id} message={message} />
              ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-2.5 flex items-center space-x-2">
                <LoadingSpinner size="sm" />
                <span className="text-sm text-muted-foreground">AI is thinking...</span>
              </div>
            </div>
              )}
            </>
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
