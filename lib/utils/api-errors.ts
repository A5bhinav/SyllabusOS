/**
 * API Error Utilities
 * Standardized error handling and responses for API routes
 */

import { NextResponse } from 'next/server'
import { logger } from './logger'

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  error: string
  message: string
  code?: string
  details?: any
  demoMode?: {
    enabled: boolean
    currentWeek?: number
  }
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: Error | ApiError | unknown,
  defaultMessage: string = 'Internal server error',
  includeDemoMode: boolean = false
): NextResponse<ErrorResponse> {
  let statusCode = 500
  let message = defaultMessage
  let code: string | undefined
  let details: any = undefined

  if (error instanceof ApiError) {
    statusCode = error.statusCode
    message = error.message
    code = error.code
    details = error.details
  } else if (error instanceof Error) {
    message = error.message || defaultMessage
    // Try to infer status code from error message
    if (error.message.includes('Unauthorized') || error.message.includes('401')) {
      statusCode = 401
      code = 'UNAUTHORIZED'
    } else if (error.message.includes('Forbidden') || error.message.includes('403')) {
      statusCode = 403
      code = 'FORBIDDEN'
    } else if (error.message.includes('Not found') || error.message.includes('404')) {
      statusCode = 404
      code = 'NOT_FOUND'
    } else if (error.message.includes('Validation') || error.message.includes('400')) {
      statusCode = 400
      code = 'VALIDATION_ERROR'
    }
  } else {
    message = String(error) || defaultMessage
  }

  const response: ErrorResponse = {
    error: getErrorType(statusCode),
    message,
    ...(code && { code }),
    ...(details && { details }),
  }

  // Include demo mode info if requested
  if (includeDemoMode) {
    const { getDemoModeInfo } = require('./demo-mode')
    const demoInfo = getDemoModeInfo()
    response.demoMode = {
      enabled: demoInfo.enabled,
      ...(demoInfo.enabled && { currentWeek: demoInfo.currentWeek }),
    }
  }

  // Log error
  logger.apiError('ERROR', 'UNKNOWN', error instanceof Error ? error : new Error(String(error)), statusCode)

  return NextResponse.json(response, { status: statusCode })
}

/**
 * Get error type string based on status code
 */
function getErrorType(statusCode: number): string {
  if (statusCode >= 500) return 'Internal Server Error'
  if (statusCode === 404) return 'Not Found'
  if (statusCode === 403) return 'Forbidden'
  if (statusCode === 401) return 'Unauthorized'
  if (statusCode === 400) return 'Bad Request'
  if (statusCode === 422) return 'Unprocessable Entity'
  return 'Error'
}

/**
 * Validation error response
 */
export function createValidationError(
  field: string,
  message: string,
  details?: any
): NextResponse<ErrorResponse> {
  return createErrorResponse(
    new ApiError(400, `Validation error: ${message}`, 'VALIDATION_ERROR', {
      field,
      ...details,
    }),
    'Validation error'
  )
}

/**
 * Unauthorized error response
 */
export function createUnauthorizedError(message: string = 'Unauthorized - please log in'): NextResponse<ErrorResponse> {
  return createErrorResponse(
    new ApiError(401, message, 'UNAUTHORIZED'),
    'Unauthorized'
  )
}

/**
 * Forbidden error response
 */
export function createForbiddenError(message: string = 'Forbidden - insufficient permissions'): NextResponse<ErrorResponse> {
  return createErrorResponse(
    new ApiError(403, message, 'FORBIDDEN'),
    'Forbidden'
  )
}

/**
 * Not found error response
 */
export function createNotFoundError(resource: string = 'Resource'): NextResponse<ErrorResponse> {
  return createErrorResponse(
    new ApiError(404, `${resource} not found`, 'NOT_FOUND'),
    'Not found'
  )
}

/**
 * Helper to validate required fields
 */
export function validateRequired(
  data: Record<string, any>,
  fields: string[]
): { isValid: boolean; errors: Array<{ field: string; message: string }> } {
  const errors: Array<{ field: string; message: string }> = []

  for (const field of fields) {
    const value = data[field]
    if (value === undefined || value === null || (typeof value === 'string' && value.trim().length === 0)) {
      errors.push({
        field,
        message: `${field} is required`,
      })
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Helper to validate field types
 */
export function validateType(
  data: Record<string, any>,
  field: string,
  expectedType: 'string' | 'number' | 'boolean' | 'array' | 'object'
): { isValid: boolean; error?: string } {
  const value = data[field]

  if (value === undefined || value === null) {
    return { isValid: true } // Let required validation handle this
  }

  let isValid = false

  switch (expectedType) {
    case 'string':
      isValid = typeof value === 'string'
      break
    case 'number':
      isValid = typeof value === 'number' && !isNaN(value)
      break
    case 'boolean':
      isValid = typeof value === 'boolean'
      break
    case 'array':
      isValid = Array.isArray(value)
      break
    case 'object':
      isValid = typeof value === 'object' && !Array.isArray(value) && value !== null
      break
  }

  if (!isValid) {
    return {
      isValid: false,
      error: `${field} must be of type ${expectedType}`,
    }
  }

  return { isValid: true }
}

