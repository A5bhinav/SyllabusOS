/**
 * Demo Mode Utility
 * Centralized configuration and helpers for demo mode functionality
 */

/**
 * Check if demo mode is enabled
 */
export function isDemoModeEnabled(): boolean {
  return process.env.DEMO_MODE === 'true'
}

/**
 * Get the demo week number
 * Returns the configured demo week or defaults to 4
 */
export function getDemoWeek(): number {
  const demoWeek = parseInt(process.env.DEMO_WEEK || '4', 10)
  return isNaN(demoWeek) || demoWeek < 1 ? 4 : demoWeek
}

/**
 * Get current week number
 * Returns demo week if demo mode is enabled, otherwise calculates from current date
 * 
 * @param semesterStart Optional semester start date (defaults to August 20 of current year)
 */
export function getCurrentWeek(semesterStart?: Date): number {
  if (isDemoModeEnabled()) {
    const demoWeek = getDemoWeek()
    console.log(`[Demo Mode] Using demo week: ${demoWeek}`)
    return demoWeek
  }

  // Calculate week number from current date
  // Default semester start: August 20
  const now = new Date()
  const startDate = semesterStart || new Date(now.getFullYear(), 7, 20) // Month 7 = August (0-indexed)
  
  const diffTime = now.getTime() - startDate.getTime()
  const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7))
  
  // Return at least week 1
  const weekNumber = Math.max(1, diffWeeks + 1)
  console.log(`[Week Calculation] Current week: ${weekNumber} (based on date: ${now.toISOString()})`)
  
  return weekNumber
}

/**
 * Get demo mode status information
 * Useful for API responses
 */
export function getDemoModeInfo(): {
  enabled: boolean
  currentWeek: number
  demoWeek?: number
} {
  const enabled = isDemoModeEnabled()
  const currentWeek = getCurrentWeek()
  
  return {
    enabled,
    currentWeek,
    ...(enabled && { demoWeek: getDemoWeek() }),
  }
}

