import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const maxDuration = 60; // 1 minute timeout

export async function GET() {
  try {
    console.log('🧪 Testing OpenAI connectivity');
    
    // בדיקת מפתח API
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not found' },
        { status: 500 }
      );
    }

    console.log('✅ API key found, testing connection');

    // יצירת לקוח OpenAI
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    // בדיקה פשוטה של OpenAI API
    console.log('🔄 Sending test request to OpenAI');
    const testResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: 'שלום, זהו בדיקת קישוריות. אנא השב במילה אחת.'
        }
      ],
      max_tokens: 10
    });

    console.log('✅ OpenAI test successful');

    return NextResponse.json({
      success: true,
      message: 'OpenAI connection successful',
      response: testResponse.choices[0].message.content,
      model: testResponse.model,
      usage: testResponse.usage,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ OpenAI test failed:', error);
    
    return NextResponse.json(
      { 
        error: error.message,
        type: error.constructor.name,
        status: error.status || 'unknown',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 