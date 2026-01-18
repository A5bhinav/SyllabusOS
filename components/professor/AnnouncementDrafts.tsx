'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { getAnnouncements, updateAnnouncement } from '@/lib/api/announcements'
import type { Announcement, UpdateAnnouncementRequest } from '@/types/api'
import { Check, Edit2, X, Calendar, Megaphone } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function AnnouncementDrafts() {
  const { toast } = useToast()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)

  const loadAnnouncements = useCallback(async () => {
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
  }, [])

  useEffect(() => {
    loadAnnouncements()
  }, [loadAnnouncements])

  const handleApprove = useCallback(async (id: string) => {
    try {
      setSaving(true)
      await updateAnnouncement(id, { status: 'published' })
      await loadAnnouncements()
      toast({
        title: 'Announcement Published',
        description: 'The announcement has been published successfully.',
      })
    } catch (err) {
      console.error('Error approving announcement:', err)
      const errorMsg = 'Failed to approve announcement'
      setError(errorMsg)
      toast({
        title: 'Approval Failed',
        description: errorMsg,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }, [loadAnnouncements, toast])

  const handleEdit = useCallback((id: string) => {
    const announcement = announcements.find(a => a.id === id)
    if (announcement) {
      setEditingId(id)
      setEditTitle(announcement.title)
      setEditContent(announcement.content)
    }
  }, [announcements])

  const handleSaveEdit = useCallback(async () => {
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
      toast({
        title: 'Announcement Updated',
        description: 'The announcement has been updated successfully.',
      })
    } catch (err) {
      console.error('Error updating announcement:', err)
      const errorMsg = 'Failed to update announcement'
      setError(errorMsg)
      toast({
        title: 'Update Failed',
        description: errorMsg,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }, [editingId, editTitle, editContent, loadAnnouncements, toast])

  const handleCancelEdit = useCallback(() => {
    setEditingId(null)
    setEditTitle('')
    setEditContent('')
  }, [])

  if (loading) {
    return (
      <Card className="h-full flex flex-col border-2 hover:border-primary/20">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Megaphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-xl">Announcement Drafts</CardTitle>
              <CardDescription className="mt-1">Review and publish weekly announcements</CardDescription>
            </div>
          </div>
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
    <Card className="h-full flex flex-col hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Megaphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <CardTitle className="text-xl">Announcement Drafts</CardTitle>
            <CardDescription className="mt-1">Review and publish weekly announcements</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {announcements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4">
              <Megaphone className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-sm text-muted-foreground font-medium mb-1">
              No draft announcements
            </p>
            <p className="text-xs text-muted-foreground max-w-sm">
              Run the Sunday Night Conductor to generate announcements
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className="rounded-lg border-2 p-4 space-y-3 hover:border-primary/30 hover:shadow-md transition-all duration-200 bg-card"
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
