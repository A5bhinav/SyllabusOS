import { createServiceClient } from '../supabase/server'
import type { Escalation } from '@/types/database'

export interface EscalationResult {
  escalationId: string
  message: string
}

/**
 * Escalation Handler (ESCALATE)
 * Creates escalation entries for professor review
 * Handles personal situations, complex issues, and "I don't know" cases
 */
export class EscalationHandler {
  /**
   * Create an escalation entry
   */
  async createEscalation(
    query: string,
    courseId: string,
    studentId: string,
    category?: string
  ): Promise<EscalationResult> {
    const supabase = createServiceClient()

    try {
      // Insert escalation entry
      const { data, error } = await supabase
        .from('escalations')
        .insert({
          course_id: courseId,
          student_id: studentId,
          query,
          status: 'pending',
          category: category || null,
        })
        .select()
        .single()

      if (error) {
        console.error('[Escalation Handler] Database error:', error)
        throw new Error(`Failed to create escalation: ${error.message}`)
      }

      if (!data) {
        throw new Error('Failed to create escalation: no data returned')
      }

      // Get student profile for better messaging
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', studentId)
        .single()

      const studentName = profile?.name || 'Student'

      return {
        escalationId: data.id,
        message: `Your question has been escalated to the professor for review. They will respond to you directly. Reference ID: ${data.id.substring(0, 8)}`,
      }
    } catch (error) {
      console.error('[Escalation Handler] Error creating escalation:', error)
      throw new Error(`Failed to create escalation: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get escalation details
   */
  async getEscalation(escalationId: string): Promise<Escalation | null> {
    const supabase = createServiceClient()

    try {
      const { data, error } = await supabase
        .from('escalations')
        .select('*')
        .eq('id', escalationId)
        .single()

      if (error) {
        console.error('[Escalation Handler] Error fetching escalation:', error)
        return null
      }

      return data as Escalation
    } catch (error) {
      console.error('[Escalation Handler] Error fetching escalation:', error)
      return null
    }
  }
}

/**
 * Create a singleton instance of EscalationHandler
 */
let handlerInstance: EscalationHandler | null = null

export function getEscalationHandler(): EscalationHandler {
  if (!handlerInstance) {
    handlerInstance = new EscalationHandler()
  }
  return handlerInstance
}

