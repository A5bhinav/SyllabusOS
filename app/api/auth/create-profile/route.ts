import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { userId, email, name, role } = await request.json()

    if (!userId || !email || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Use service client to bypass RLS
    const supabase = createServiceClient()

    // Check if profile already exists
    const { data: existing } = await supabase
      .from('profiles')
      .select('id, role, name')
      .eq('id', userId)
      .maybeSingle()

    if (existing) {
      // Profile exists, but update role if provided and different
      if (role && existing.role !== role) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ role, name: name || existing.name, email })
          .eq('id', userId)
        
        if (updateError) {
          console.error('Profile update error:', updateError)
          return NextResponse.json(
            { error: updateError.message },
            { status: 500 }
          )
        }
      }
      return NextResponse.json({ success: true, message: 'Profile already exists' })
    }

    // Create profile
    const { error } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email,
        name: name || '',
        role,
      })

    if (error) {
      console.error('Profile creation error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Create profile API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

