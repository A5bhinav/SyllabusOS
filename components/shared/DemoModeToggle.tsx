'use client'

import { useEffect, useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Info } from 'lucide-react'

/**
 * DemoModeToggle Component
 * 
 * Note: Demo mode is controlled by environment variables (DEMO_MODE) which
 * are server-side only. This component displays the current demo mode status
 * but cannot actually toggle it (as that would require server restart).
 * 
 * For development/demo purposes, you can:
 * 1. Set DEMO_MODE=true in .env file
 * 2. Restart the development server
 */
export function DemoModeToggle() {
  const [demoMode, setDemoMode] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch demo mode status from API (if available) or use local storage preference
    // Since demo mode is server-side only, we check if there's a way to get status
    async function checkDemoMode() {
      try {
        // Try to get demo mode status from conductor API if available
        const response = await fetch('/api/conductor')
        if (response.ok) {
          const data = await response.json()
          setDemoMode(data.demoMode || false)
        }
      } catch (error) {
        // If API fails, check localStorage for UI preference
        const stored = localStorage.getItem('demoModeUI')
        setDemoMode(stored === 'true')
      } finally {
        setLoading(false)
      }
    }

    checkDemoMode()
  }, [])

  function handleToggle(checked: boolean) {
    // This is a UI-only toggle for demonstration purposes
    // Actual demo mode is controlled by environment variables
    setDemoMode(checked)
    localStorage.setItem('demoModeUI', checked.toString())
  }

  if (loading) {
    return null
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
      <div className="flex items-center gap-2">
        <Switch
          id="demo-mode"
          checked={demoMode}
          onCheckedChange={handleToggle}
          disabled={true} // Disabled because demo mode is server-side only
        />
        <Label htmlFor="demo-mode" className="cursor-pointer">
          Demo Mode
        </Label>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Info className="h-3 w-3" />
        <span>Server-side only (set DEMO_MODE in .env)</span>
      </div>
    </div>
  )
}
