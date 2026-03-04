import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    // חסימת גישה בסביבת production
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Endpoint disabled in production' }, { status: 404 })
    }

    console.log('🔍 Checking environment variables...');

    const envCheck = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      NODE_ENV: process.env.NODE_ENV,
    }
    
    return NextResponse.json({
      success: true,
      message: 'Environment variables check completed',
      data: envCheck
    })
    
  } catch (error) {
    console.error('❌ Error checking environment:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal error'
    }, { status: 500 })
  }
} 