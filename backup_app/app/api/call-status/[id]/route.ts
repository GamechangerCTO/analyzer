import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/database.types';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const callId = params.id;
    
    if (!callId) {
      return NextResponse.json(
        { error: 'נדרש מזהה שיחה' },
        { status: 400 }
      );
    }
    
    // יצירת לקוח סופהבייס בצד השרת עם הרשאות מלאות
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // קבלת פרטי השיחה
    const { data: callData, error: callError } = await supabase
      .from('calls')
      .select('id, processing_status, error_message, analyzed_at, overall_score, red_flag')
      .eq('id', callId)
      .single();
      
    if (callError) {
      console.error('שגיאה בטעינת השיחה:', callError);
      return NextResponse.json(
        { error: 'השיחה לא נמצאה' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      id: callData.id,
      status: callData.processing_status,
      error: callData.error_message,
      analyzed_at: callData.analyzed_at,
      overall_score: callData.overall_score,
      red_flag: callData.red_flag,
      // הוספת שדה שימושי למתכנתי הקליינט
      is_completed: callData.processing_status === 'completed',
      is_error: callData.processing_status === 'error',
      is_processing: ['pending', 'transcribing', 'analyzing_tone', 'analyzing_content'].includes(callData.processing_status || '')
    });
    
  } catch (error: any) {
    console.error('שגיאה בקבלת סטטוס השיחה:', error);
    return NextResponse.json(
      { error: error.message || 'שגיאה בלתי צפויה' },
      { status: 500 }
    );
  }
} 