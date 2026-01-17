import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * Auto-confirm user email using service role (bypasses email confirmation requirement)
 * This is used to skip email verification during signup
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Use service role client to bypass RLS and confirm email
    const supabaseAdmin = createServiceClient()

    // Update user to confirm email using admin API
    // This sets email_confirmed_at to current timestamp
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        email_confirm: true, // Auto-confirm email immediately
      }
    )

    if (error) {
      console.error('[Auto-confirm] Error confirming email:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to confirm email' },
        { status: 500 }
      )
    }

    console.log('[Auto-confirm] Email confirmed successfully for user:', userId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Auto-confirm] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
