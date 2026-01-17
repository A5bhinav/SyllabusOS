'use client'

import { useCallback, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from './LoadingSpinner'
import { Upload, File, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  label: string
  accept: string
  file: File | null
  onFileSelect: (file: File | null) => void
  maxSizeMB?: number
  disabled?: boolean
}

export function FileUpload({
  label,
  accept,
  file,
  onFileSelect,
  maxSizeMB = 10,
  disabled = false,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateFile = useCallback(
    (selectedFile: File): string | null => {
      const maxSizeBytes = maxSizeMB * 1024 * 1024
      if (selectedFile.size > maxSizeBytes) {
        return `File size must be less than ${maxSizeMB}MB`
      }
      return null
    },
    [maxSizeMB]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragging(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      if (disabled) return

      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile) {
        const validationError = validateFile(droppedFile)
        if (validationError) {
          setError(validationError)
          return
        }
        setError(null)
        onFileSelect(droppedFile)
      }
    },
    [disabled, validateFile, onFileSelect]
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0]
      if (selectedFile) {
        const validationError = validateFile(selectedFile)
        if (validationError) {
          setError(validationError)
          return
        }
        setError(null)
        onFileSelect(selectedFile)
      }
    },
    [validateFile, onFileSelect]
  )

  const handleRemove = useCallback(() => {
    onFileSelect(null)
    setError(null)
  }, [onFileSelect])

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <Card
        className={cn(
          'transition-colors',
          isDragging && 'border-primary bg-primary/5',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="p-6">
          {!file ? (
            <div className="flex flex-col items-center justify-center space-y-4">
              <Upload className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">
                  Drag and drop your file here, or click to browse
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Accepted: {accept} (max {maxSizeMB}MB)
                </p>
              </div>
              <input
                type="file"
                accept={accept}
                onChange={handleFileChange}
                disabled={disabled}
                className="hidden"
                id={`file-upload-${label}`}
              />
              <label htmlFor={`file-upload-${label}`}>
                <Button type="button" variant="outline" disabled={disabled} asChild>
                  <span>Browse Files</span>
                </Button>
              </label>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <File className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleRemove}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          {error && (
            <p className="text-sm text-destructive mt-2">{error}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

