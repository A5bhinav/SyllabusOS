'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { getAnnouncements } from '@/lib/api/announcements'
import type { Announcement } from '@/types/api'
import { Calendar, Megaphone } from 'lucide-react'
import { format } from 'date-fns'

interface AnnouncementsProps {
  courseId?: string // Optional: filter by course ID
}

export function Announcements({ courseId }: AnnouncementsProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAnnouncements()
  }, [courseId])

  async function loadAnnouncements() {
    try {
      setLoading(true)
      setError(null)
      
      // Build query URL with courseId if provided
      let url = '/api/announcements?status=published'
      if (courseId) {
        url += `&courseId=${courseId}`
      }
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('Failed to load announcements')
      }
      
      const data = await response.json()
      // Students only see published announcements (API filters this, but double-check)
      const published = data.filter((a: Announcement) => a.status === 'published')
      // Sort by week number (descending) and then by published date (descending)
      published.sort((a: Announcement, b: Announcement) => {
        if (b.weekNumber !== a.weekNumber) {
          return b.weekNumber - a.weekNumber
        }
        const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0
        const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0
        return dateB - dateA
      })
      setAnnouncements(published)
    } catch (err) {
      console.error('Error loading announcements:', err)
      setError('Failed to load announcements')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Announcements
          </CardTitle>
          <CardDescription>Important updates from your professor</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5" />
          Announcements
        </CardTitle>
        <CardDescription>Important updates from your professor</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {announcements.length === 0 ? (
          <div className="text-center py-8">
            <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No announcements yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Check back later for updates from your professor
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className="rounded-lg border p-4 space-y-3 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">
                        Week {announcement.weekNumber}
                      </span>
                      {announcement.publishedAt && (
                        <span className="text-xs text-muted-foreground">
                          • {format(new Date(announcement.publishedAt), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                    <h4 className="font-semibold text-lg mb-2">{announcement.title}</h4>
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {announcement.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

