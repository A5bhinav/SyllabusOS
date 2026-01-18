'use client'

import { useState, useOptimistic, useRef, useEffect, startTransition, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { MessageBubble, type Message } from './MessageBubble'
import { sendChatMessage, getChatHistory } from '@/lib/api/chat'
import { Send, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ChatInterfaceProps {
  courseId: string
  userId: string
  initialMessages?: Message[]
}

type OptimisticMessage = Message | { id: string; text: string; role: 'user' | 'assistant'; timestamp: Date; pending?: boolean }

export function ChatInterface({ courseId, userId, initialMessages = [] }: ChatInterfaceProps) {
  const { toast } = useToast()
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

  const handleSubmit = async (e: React.FormEvent, suggestedText?: string) => {
    e.preventDefault()
    const messageText = suggestedText || input.trim()
    
    if (!messageText || isLoading) return

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
      text: messageText,
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
        message: messageText,
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
      
      // Clear any previous suggested follow-ups by resetting (they'll be generated from the new message)
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to send message. Please try again.'
      setError(errorMsg)
      
      toast({
        title: 'Message Failed',
        description: errorMsg,
        variant: 'destructive',
      })
      
      // Remove the optimistic user message on error by reverting messages state
      setMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id))
    } finally {
      setIsLoading(false)
    }
  }

  // Generate suggested follow-up questions based on the last assistant message
  const suggestedFollowUps = useMemo(() => {
    if (optimisticMessages.length === 0 || isLoading) return []
    
    const lastAssistantMessage = [...optimisticMessages].reverse().find(msg => msg.role === 'assistant')
    if (!lastAssistantMessage) return []
    
    const messageText = lastAssistantMessage.text.toLowerCase()
    const suggestions: string[] = []
    
    // Generate context-aware suggestions
    if (messageText.includes('midterm') || messageText.includes('final') || messageText.includes('exam')) {
      suggestions.push('What topics are covered on the exam?')
      suggestions.push('What is the exam format?')
      suggestions.push('Can I see sample questions?')
    } else if (messageText.includes('assignment') || messageText.includes('homework') || messageText.includes('project')) {
      suggestions.push('When is the due date?')
      suggestions.push('What are the requirements?')
      suggestions.push('Where do I submit it?')
    } else if (messageText.includes('week') || messageText.includes('schedule')) {
      suggestions.push('What are the topics for this week?')
      suggestions.push('Are there any readings?')
      suggestions.push('What assignments are due?')
    } else if (messageText.includes('grade') || messageText.includes('grading')) {
      suggestions.push('How is the course graded?')
      suggestions.push('What is the grading breakdown?')
      suggestions.push('Can I check my current grade?')
    } else {
      // Generic follow-ups
      suggestions.push('Can you tell me more about that?')
      suggestions.push('What should I focus on?')
      suggestions.push('Are there any related topics?')
    }
    
    return suggestions.slice(0, 3) // Return max 3 suggestions
  }, [optimisticMessages, isLoading])

  function handleSuggestedFollowUp(question: string) {
    // Create a synthetic event and call handleSubmit with the suggested text
    const syntheticEvent = {
      preventDefault: () => {},
    } as React.FormEvent
    
    handleSubmit(syntheticEvent, question)
  }

  return (
    <div className="flex flex-col h-[600px] bg-background overflow-hidden rounded-lg">
      <ScrollArea className="flex-1 px-6 py-6 overflow-hidden" ref={scrollAreaRef}>
        <div className="space-y-1">
          {isLoadingHistory ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center">
              <LoadingSpinner size="lg" />
              <p className="text-muted-foreground text-sm mt-4 font-medium">
                Loading chat history...
              </p>
            </div>
          ) : optimisticMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              </div>
              <p className="text-foreground font-medium text-base">
                Start a conversation
              </p>
              <p className="text-muted-foreground text-sm max-w-md">
                Ask questions about course policies, concepts, or schedules. Your AI assistant is here to help.
              </p>
            </div>
          ) : (
            <>
              <AnimatePresence mode="popLayout">
              {optimisticMessages.map((message, index) => {
                const isLastAssistant = !isLoading && 
                  message.role === 'assistant' && 
                  index === optimisticMessages.length - 1
                
                return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ 
                        duration: 0.3,
                        ease: [0.4, 0, 0.2, 1] // Custom easing for smooth feel
                      }}
                      className="mb-4"
                    >
                    <MessageBubble message={message} />
                    
                    {/* Show suggested follow-ups after the last assistant message */}
                    {isLastAssistant && suggestedFollowUps.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2, duration: 0.3 }}
                          className="flex flex-wrap gap-2 ml-2 mt-3"
                        >
                        {suggestedFollowUps.map((suggestion, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.3 + idx * 0.1, duration: 0.2 }}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                          <Button
                            variant="outline"
                            size="sm"
                                className="text-xs h-auto py-2 px-3 shadow-sm hover:shadow-md transition-shadow"
                            onClick={() => handleSuggestedFollowUp(suggestion)}
                          >
                            {suggestion}
                          </Button>
                            </motion.div>
                        ))}
                        </motion.div>
                    )}
                    </motion.div>
                )
              })}
              </AnimatePresence>
              <AnimatePresence>
          {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex justify-start mb-4"
                  >
                    <div className="bg-muted/80 rounded-xl border border-border px-4 py-3 flex items-center space-x-3 shadow-sm">
                <LoadingSpinner size="sm" />
                      <div className="flex items-center space-x-1">
                        <span className="text-sm text-muted-foreground font-medium">AI is thinking</span>
                        <motion.div
                          className="flex space-x-1"
                          initial="hidden"
                          animate="visible"
                        >
                          {[0, 1, 2].map((index) => (
                            <motion.span
                              key={index}
                              className="w-1 h-1 bg-muted-foreground rounded-full"
                              variants={{
                                hidden: { opacity: 0 },
                                visible: {
                                  opacity: [0, 1, 0],
                                  transition: {
                                    duration: 1.4,
                                    repeat: Infinity,
                                    delay: index * 0.2,
                                    ease: 'easeInOut',
                                  },
                                },
                              }}
                            />
                          ))}
                        </motion.div>
              </div>
            </div>
                  </motion.div>
              )}
              </AnimatePresence>
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {error && (
        <div className="mx-6 mb-4 flex items-start space-x-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="border-t bg-card/50 p-4">
        <div className="flex items-end space-x-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your course..."
            className="min-h-[56px] max-h-[200px] resize-none text-base"
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
            className="h-[56px] w-[56px] flex-shrink-0 shadow-sm hover:shadow-md transition-shadow"
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
