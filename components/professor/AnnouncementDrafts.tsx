'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { getAnnouncements, updateAnnouncement } from '@/lib/api/announcements'
import type { Announcement, UpdateAnnouncementRequest } from '@/types/api'
import { Check, Edit2, X, Calendar } from 'lucide-react'

export function AnnouncementDrafts() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadAnnouncements()
  }, [])

  async function loadAnnouncements() {
    try {
      setLoading(true)
      setError(null)
      const data = await getAnnouncements()
      // Filter for draft announcements
      const drafts = data.filter(a => a.status === 'draft')
      setAnnouncements(drafts)
    } catch (err) {
      console.error('Error loading announcements:', err)
      setError('Failed to load announcements')
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(id: string) {
    try {
      setSaving(true)
      await updateAnnouncement(id, { status: 'published' })
      await loadAnnouncements()
    } catch (err) {
      console.error('Error approving announcement:', err)
      setError('Failed to approve announcement')
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit(id: string) {
    const announcement = announcements.find(a => a.id === id)
    if (announcement) {
      setEditingId(id)
      setEditTitle(announcement.title)
      setEditContent(announcement.content)
    }
  }

  async function handleSaveEdit() {
    if (!editingId) return
    
    try {
      setSaving(true)
      await updateAnnouncement(editingId, {
        title: editTitle,
        content: editContent,
      })
      setEditingId(null)
      setEditTitle('')
      setEditContent('')
      await loadAnnouncements()
    } catch (err) {
      console.error('Error updating announcement:', err)
      setError('Failed to update announcement')
    } finally {
      setSaving(false)
    }
  }

  function handleCancelEdit() {
    setEditingId(null)
    setEditTitle('')
    setEditContent('')
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Announcement Drafts</CardTitle>
          <CardDescription>Review and publish weekly announcements</CardDescription>
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
        <CardTitle>Announcement Drafts</CardTitle>
        <CardDescription>Review and publish weekly announcements</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {announcements.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No draft announcements. Run the Sunday Night Conductor to generate announcements.
          </p>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className="rounded-lg border p-4 space-y-3"
              >
                {editingId === announcement.id ? (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor={`title-${announcement.id}`}>Title</Label>
                      <Input
                        id={`title-${announcement.id}`}
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`content-${announcement.id}`}>Content</Label>
                      <Textarea
                        id={`content-${announcement.id}`}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="mt-1 min-h-[120px]"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSaveEdit}
                        disabled={saving}
                      >
                        {saving ? <LoadingSpinner size="sm" /> : 'Save'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-muted-foreground">
                            Week {announcement.weekNumber}
                          </span>
                        </div>
                        <h4 className="font-semibold mb-2">{announcement.title}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {announcement.content}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(announcement.id)}
                        disabled={saving}
                        className="flex-1"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(announcement.id)}
                        disabled={saving}
                        className="flex-1"
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
