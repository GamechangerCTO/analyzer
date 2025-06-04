import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // בדיקת משתני סביבה קריטיים
    const envCheck = {
      // OpenAI
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      openAIKeyLength: process.env.OPENAI_API_KEY?.length || 0,
      openAIKeyPrefix: process.env.OPENAI_API_KEY?.substring(0, 10) + '...' || 'N/A',
      
      // Supabase
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'N/A',
      hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      
      // Environment
      nodeEnv: process.env.NODE_ENV || 'unknown',
      vercelEnv: process.env.VERCEL_ENV || 'not-vercel',
      vercelRegion: process.env.VERCEL_REGION || 'unknown',
      
      // Runtime
      timestamp: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    return NextResponse.json(envCheck);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message, timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
} 