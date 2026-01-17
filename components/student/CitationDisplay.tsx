'use client'

import { FileText, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatResponse } from '@/types/api'

interface CitationDisplayProps {
  citations: ChatResponse['citations']
  className?: string
}

export function CitationDisplay({ citations, className }: CitationDisplayProps) {
  if (!citations || citations.length === 0) {
    return null
  }

  return (
    <div className={cn('mt-3 space-y-2', className)}>
      <div className="flex items-center space-x-2 text-xs font-medium text-muted-foreground">
        <FileText className="h-3 w-3" />
        <span>Sources:</span>
      </div>
      <ul className="space-y-1.5">
        {citations.map((citation, index) => (
          <li key={index} className="flex items-start space-x-2 text-xs">
            <BookOpen className="h-3.5 w-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1">
              <span className="text-primary hover:underline cursor-pointer">
                {citation.source}
                {citation.page && ` (page ${citation.page})`}
              </span>
              {citation.content && (
                <p className="text-muted-foreground mt-0.5 line-clamp-2">
                  {citation.content}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
