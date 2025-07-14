import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('🔍 Checking environment variables...');
    
    const envCheck = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      NODE_ENV: process.env.NODE_ENV,
      
      // לא מציג את הערכים האמיתיים מסיבות אבטחה
      SUPABASE_URL_LENGTH: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
      SERVICE_KEY_LENGTH: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
    };
    
    console.log('📊 Environment check results:', envCheck);
    
    return NextResponse.json({
      success: true,
      message: 'Environment variables check completed',
      data: envCheck
    });
    
  } catch (error) {
    console.error('❌ Error checking environment:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 