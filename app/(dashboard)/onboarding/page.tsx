'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileUpload } from '@/components/shared/FileUpload'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { LoadDemoButton } from '@/components/shared/LoadDemoButton'
import { ProfessorNav } from '@/components/professor/ProfessorNav'
import { uploadFiles } from '@/lib/api/upload'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function OnboardingPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [syllabusFile, setSyllabusFile] = useState<File | null>(null)
  const [scheduleFile, setScheduleFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [hasExistingCourses, setHasExistingCourses] = useState<boolean | null>(null)
  const [success, setSuccess] = useState<{
    courseId: string
    chunksCreated: number
    scheduleEntries: number
  } | null>(null)

  // Check if user has existing courses (indicates they navigated from dashboard)
  useEffect(() => {
    async function checkExistingCourses() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setHasExistingCourses(false)
          return
        }

        const { data: courses } = await supabase
          .from('courses')
          .select('id')
          .eq('professor_id', user.id)
          .limit(1)

        setHasExistingCourses((courses && courses.length > 0) || false)
      } catch (err) {
        console.error('Error checking existing courses:', err)
        setHasExistingCourses(false)
      }
    }

    checkExistingCourses()
  }, [])

  const handleUpload = async () => {
    if (!syllabusFile || !scheduleFile) {
      const errorMsg = 'Please select both a syllabus PDF and a schedule file'
      setError(errorMsg)
      toast({
        title: 'Upload Error',
        description: errorMsg,
        variant: 'destructive',
      })
      return
    }

    setError(null)
    setLoading(true)
    setUploadProgress(0)

    try {
      // Simulate upload progress (since we don't have real progress from backend yet)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      const response = await uploadFiles({
        syllabus: syllabusFile,
        schedule: scheduleFile,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (response.success) {
        setSuccess({
          courseId: response.courseId,
          chunksCreated: response.chunksCreated,
          scheduleEntries: response.scheduleEntries,
        })
        
        toast({
          title: 'Upload Successful!',
          description: `Created ${response.chunksCreated} content chunks and ${response.scheduleEntries} schedule entries.`,
        })

        // Get user role to determine redirect destination
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

          // Redirect based on role
          setTimeout(() => {
            if (profile?.role === 'professor') {
              router.push('/dashboard')
            } else {
              router.push('/student/chat')
            }
          }, 2000)
        } else {
          // Default redirect
          setTimeout(() => {
            router.push('/dashboard')
          }, 2000)
        }
      } else {
        setUploadProgress(0)
        const errorMsg = response.error || 'Upload failed'
        setError(errorMsg)
        toast({
          title: 'Upload Failed',
          description: errorMsg,
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      setUploadProgress(0)
      const errorMessage = err.response?.data?.error || err.message || 'Failed to upload files'
      setError(errorMessage)
      toast({
        title: 'Upload Failed',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const canUpload = syllabusFile && scheduleFile && !loading

  return (
    <>
      {hasExistingCourses && <ProfessorNav />}
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto max-w-2xl py-8 px-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Course Setup</CardTitle>
              <CardDescription>
                Upload your course syllabus (PDF) and schedule (CSV or Excel) to get started, or try the demo course
              </CardDescription>
            </CardHeader>
        <CardContent className="space-y-6">
          <div className="border-b pb-6">
            <h3 className="text-lg font-semibold mb-2">Try Demo Course (UCSC CMPS 5J)</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Load a complete demo course with syllabus, schedule, and announcements. Perfect for testing the system!
            </p>
            <LoadDemoButton 
              onSuccess={(courseId) => {
                setTimeout(() => {
                  router.push('/dashboard')
                }, 1500)
              }}
            />
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Upload Your Own Course</h3>
          <FileUpload
            label="Syllabus (PDF)"
            accept=".pdf,application/pdf"
            file={syllabusFile}
            onFileSelect={setSyllabusFile}
            maxSizeMB={10}
            disabled={loading}
            uploadProgress={loading ? uploadProgress : undefined}
          />

          <FileUpload
            label="Schedule (CSV or Excel)"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            file={scheduleFile}
            onFileSelect={setScheduleFile}
            maxSizeMB={5}
            disabled={loading}
            uploadProgress={loading ? uploadProgress : undefined}
          />

          {error && (
            <div className="flex items-start space-x-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-start space-x-2 rounded-md bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Upload successful!</p>
                <p className="mt-1">
                  Created {success.chunksCreated} content chunks and {success.scheduleEntries} schedule entries.
                </p>
                <p className="mt-1">Redirecting to dashboard...</p>
              </div>
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={!canUpload}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Uploading and processing...
              </>
            ) : (
              'Upload and Process'
            )}
          </Button>
          </div>
        </CardContent>
      </Card>
        </div>
      </div>
    </>
  )
}

