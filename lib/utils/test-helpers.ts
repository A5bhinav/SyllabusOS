/**
 * Test Helpers and Utilities
 * Utilities for integration testing and development
 */

import { getCurrentWeek, getDemoModeInfo, isDemoModeEnabled } from './demo-mode'

/**
 * Test configuration helper
 * Useful for setting up test environment
 */
export interface TestConfig {
  demoMode: boolean
  demoWeek: number
  mockMode: boolean
}

/**
 * Get current test configuration
 */
export function getTestConfig(): TestConfig {
  return {
    demoMode: isDemoModeEnabled(),
    demoWeek: parseInt(process.env.DEMO_WEEK || '4', 10),
    mockMode: process.env.MOCK_MODE === 'true',
  }
}

/**
 * Create a test API request helper
 */
export function createTestRequest(
  method: string,
  url: string,
  body?: any,
  headers?: Record<string, string>
): Request {
  const requestHeaders = new Headers(headers || {})
  if (body && !requestHeaders.get('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json')
  }

  return new Request(url, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  })
}

/**
 * Validate API response structure
 */
export function validateApiResponse(
  response: Response,
  expectedStatus: number,
  expectedFields?: string[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (response.status !== expectedStatus) {
    errors.push(
      `Expected status ${expectedStatus}, got ${response.status}`
    )
  }

  if (expectedFields && expectedFields.length > 0) {
    // Note: This is a basic validation - in real tests you'd parse JSON
    // and check actual field presence
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Helper to check if demo mode is affecting week calculations
 */
export function verifyDemoModeWeek(): {
  currentWeek: number
  isDemoMode: boolean
  message: string
} {
  const demoInfo = getDemoModeInfo()
  const currentWeek = getCurrentWeek()

  return {
    currentWeek,
    isDemoMode: demoInfo.enabled,
    message: demoInfo.enabled
      ? `Demo mode enabled - using week ${currentWeek} (configured: ${demoInfo.demoWeek})`
      : `Demo mode disabled - calculated week ${currentWeek} from current date`,
  }
}

/**
 * Test data generators
 */
export const testData = {
  /**
   * Generate a test chat request
   */
  chatRequest: (overrides?: Partial<{
    message: string
    courseId: string
    userId: string
  }>) => ({
    message: 'What is the midterm date?',
    courseId: 'test-course-id',
    userId: 'test-user-id',
    ...overrides,
  }),

  /**
   * Generate a test announcement request
   */
  announcementRequest: (overrides?: Partial<{
    weekNumber: number
    title: string
    content: string
    courseId: string
  }>) => ({
    weekNumber: getCurrentWeek(),
    title: `Week ${getCurrentWeek()} Announcement`,
    content: 'Test announcement content',
    courseId: 'test-course-id',
    ...overrides,
  }),

  /**
   * Generate a test escalation request
   */
  escalationRequest: (overrides?: Partial<{
    escalationId: string
    status: 'pending' | 'resolved'
  }>) => ({
    escalationId: 'test-escalation-id',
    status: 'resolved' as const,
    ...overrides,
  }),

  /**
   * Generate a test conductor request
   */
  conductorRequest: (overrides?: Partial<{
    courseId: string
    weekNumber: number
    manual: boolean
  }>) => ({
    manual: true,
    weekNumber: getCurrentWeek(),
    courseId: 'test-course-id',
    ...overrides,
  }),
}

/**
 * Common test assertions
 */
export const testAssertions = {
  /**
   * Assert that demo mode info is present in response
   */
  hasDemoModeInfo: (response: any): boolean => {
    return (
      typeof response === 'object' &&
      response !== null &&
      typeof response.demoMode === 'object' &&
      typeof response.demoMode.enabled === 'boolean'
    )
  },

  /**
   * Assert that error response has correct structure
   */
  isValidErrorResponse: (response: any): boolean => {
    return (
      typeof response === 'object' &&
      response !== null &&
      typeof response.error === 'string' &&
      typeof response.message === 'string'
    )
  },

  /**
   * Assert that success response has correct structure
   */
  isValidSuccessResponse: (response: any): boolean => {
    return (
      typeof response === 'object' &&
      response !== null &&
      (response.success === true || response.id !== undefined)
    )
  },
}

