'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { loadDemoCourse } from '@/lib/api/demo'
import { useRouter } from 'next/navigation'

interface LoadDemoButtonProps {
  onSuccess?: (courseId: string) => void
  variant?: 'default' | 'outline' | 'secondary'
  className?: string
}

export function LoadDemoButton({ 
  onSuccess, 
  variant = 'outline',
  className = '' 
}: LoadDemoButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleLoadDemo = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await loadDemoCourse()

      if (result.success && result.courseId) {
        // Call success callback if provided
        if (onSuccess) {
          onSuccess(result.courseId)
        } else {
          // Default: redirect to dashboard
          router.push('/dashboard')
        }
      } else {
        setError(result.error || 'Failed to load demo course')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <Button
        onClick={handleLoadDemo}
        disabled={loading}
        variant={variant}
        className="w-full"
      >
        {loading ? (
          <>
            <LoadingSpinner size="sm" className="mr-2" />
            Loading Demo Course...
          </>
        ) : (
          'Load Demo Course (UCSC CMPS 5J)'
        )}
      </Button>
      {error && (
        <div className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
          {error}
        </div>
      )}
      {loading && (
        <p className="text-xs text-muted-foreground">
          Creating demo course with syllabus, schedule, and announcements...
        </p>
      )}
    </div>
  )
}

