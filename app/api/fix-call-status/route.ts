import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { addCallLog } from '@/lib/addCallLog';

export async function POST(request: Request) {
  try {
    const { call_id } = await request.json();

    if (!call_id) {
      return NextResponse.json(
        { error: 'חסר מזהה שיחה (call_id)' }, 
        { status: 400 }
      );
    }

    // יצירת לקוח סופהבייס עם service role key
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // קבלת פרטי השיחה
    const { data: callData, error: callError } = await supabase
      .from('calls')
      .select('*')
      .eq('id', call_id)
      .single();

    if (callError || !callData) {
      return NextResponse.json(
        { error: 'השיחה לא נמצאה', details: callError },
        { status: 404 }
      );
    }

    // בדיקה אם יש ניתוח מוכן
    const hasAnalysis = callData.analysis_report && Object.keys(callData.analysis_report).length > 0;
    const hasToneAnalysis = callData.tone_analysis_report && Object.keys(callData.tone_analysis_report).length > 0;
    
    if (!hasAnalysis && !hasToneAnalysis) {
      await addCallLog(call_id, '⚠️ לא ניתן לתקן - אין נתוני ניתוח', {
        has_analysis: hasAnalysis,
        has_tone_analysis: hasToneAnalysis,
        current_status: callData.processing_status
      });
      
      return NextResponse.json(
        { error: 'השיחה לא מכילה נתוני ניתוח' },
        { status: 400 }
      );
    }

    // עדכון הסטטוס ל-completed
    const { error: updateError } = await supabase
      .from('calls')
      .update({
        processing_status: 'completed',
        analyzed_at: callData.analyzed_at || new Date().toISOString(),
        overall_score: callData.overall_score || ((callData.analysis_report as any)?.overall_score) || 0,
        red_flag: callData.red_flag || ((callData.analysis_report as any)?.red_flag) || false
      })
      .eq('id', call_id);

    if (updateError) {
      await addCallLog(call_id, '❌ שגיאה בתיקון סטטוס השיחה', {
        error: updateError.message,
        error_details: updateError
      });
      
      return NextResponse.json(
        { error: 'שגיאה בעדכון סטטוס השיחה', details: updateError.message },
        { status: 500 }
      );
    }

    await addCallLog(call_id, '✅ סטטוס השיחה תוקן ידנית', {
      old_status: callData.processing_status,
      new_status: 'completed',
      manual_fix: true,
      fix_timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      call_id,
      message: 'סטטוס השיחה תוקן בהצלחה',
      old_status: callData.processing_status,
      new_status: 'completed'
    });

  } catch (error: any) {
    console.error('שגיאה בתיקון סטטוס השיחה:', error);
    
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
} 