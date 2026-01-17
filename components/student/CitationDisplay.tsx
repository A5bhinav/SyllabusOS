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
    <div className={cn('space-y-2.5', className)}>
      <div className="flex items-center space-x-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        <FileText className="h-3.5 w-3.5" />
        <span>Sources</span>
      </div>
      <ul className="space-y-2">
        {citations.map((citation, index) => (
          <li key={index} className="flex items-start space-x-2.5 text-xs">
            <BookOpen className="h-3.5 w-3.5 mt-0.5 text-primary/70 flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <span className="text-primary font-medium hover:underline cursor-pointer inline-block">
                {citation.source}
                {citation.page && <span className="text-muted-foreground"> (page {citation.page})</span>}
              </span>
              {citation.content && (
                <p className="text-muted-foreground leading-relaxed line-clamp-2">
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
