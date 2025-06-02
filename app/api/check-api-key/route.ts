import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    return NextResponse.json({
      hasApiKey: !!apiKey,
      keyPrefix: apiKey ? `${apiKey.substring(0, 7)}...` : null,
      keyLength: apiKey ? apiKey.length : 0,
      environment: process.env.NODE_ENV || 'unknown',
      vercelEnv: process.env.VERCEL_ENV || 'not-vercel'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 