import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/database.types';
import { addCallLog } from '@/lib/addCallLog';

// הגדרת max duration לוורסל
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { call_id, force_restart } = await request.json();

    if (!call_id) {
      return NextResponse.json(
        { error: 'חסר מזהה שיחה (call_id)' }, 
        { status: 400 }
      );
    }

    // יצירת לקוח סופהבייס בצד השרת עם הרשאות מלאות
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    await addCallLog(call_id, '🔄 מנסה ניתוח חוזר', { 
      timestamp: new Date().toISOString(),
      force_restart: force_restart || false
    });

    // קבלת פרטי השיחה הנוכחיים
    const { data: callData, error: callError } = await supabase
      .from('calls')
      .select('*')
      .eq('id', call_id)
      .single();

    if (callError || !callData) {
      await addCallLog(call_id, '❌ שגיאה בטעינת השיחה לניסיון חוזר', { 
        error: callError, 
        error_message: callError?.message || 'שגיאה לא ידועה' 
      });
      return NextResponse.json(
        { error: 'השיחה לא נמצאה', details: callError },
        { status: 404 }
      );
    }

    // בדיקה אם השיחה כבר הושלמה
    if (callData.processing_status === 'completed' && !force_restart) {
      await addCallLog(call_id, '⚠️ השיחה כבר הושלמה', { 
        current_status: callData.processing_status
      });
      return NextResponse.json({
        message: 'השיחה כבר הושלמה',
        call_id,
        status: callData.processing_status
      });
    }

    // איפוס הסטטוס לפנדינג
    let newStatus = 'pending';
    let updateData: any = {
      processing_status: newStatus,
      error_message: null
    };

    // אם זה force restart, מנקה גם נתונים קודמים
    if (force_restart) {
      updateData = {
        ...updateData,
        transcript: null,
        transcript_segments: null,
        transcript_words: null,
        analysis_report: null,
        tone_analysis_report: null,
        overall_score: null,
        red_flag: null,
        analyzed_at: null
      };
      await addCallLog(call_id, '🧹 מנקה נתונים קודמים (force restart)', {
        cleared_fields: Object.keys(updateData)
      });
    }

    // עדכון הסטטוס במסד הנתונים
    const { error: updateError } = await supabase
      .from('calls')
      .update(updateData)
      .eq('id', call_id);

    if (updateError) {
      await addCallLog(call_id, '❌ שגיאה בעדכון סטטוס לניסיון חוזר', { 
        error: updateError.message
      });
      return NextResponse.json(
        { error: 'שגיאה בעדכון הסטטוס', details: updateError },
        { status: 500 }
      );
    }

    await addCallLog(call_id, '✅ סטטוס עודכן לניסיון חוזר', { 
      new_status: newStatus,
      force_restart: force_restart || false
    });

    // הפעלת תהליך הניתוח מחדש
    try {
      const processResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/process-call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ call_id }),
      });

      if (!processResponse.ok) {
        const errorData = await processResponse.json();
        throw new Error(`Process call failed: ${errorData.error || processResponse.statusText}`);
      }

      await addCallLog(call_id, '🚀 תהליך ניתוח חוזר הופעל בהצלחה');

      return NextResponse.json({
        success: true,
        call_id,
        message: 'תהליך ניתוח חוזר הופעל בהצלחה',
        new_status: newStatus,
        force_restart: force_restart || false
      });

    } catch (processError: any) {
      await addCallLog(call_id, '❌ שגיאה בהפעלת תהליך ניתוח חוזר', { 
        error: processError.message
      });

      // עדכון הסטטוס חזרה לשגיאה
      await supabase
        .from('calls')
        .update({
          processing_status: 'error',
          error_message: `שגיאה בהפעלת ניתוח חוזר: ${processError.message}`
        })
        .eq('id', call_id);

      return NextResponse.json(
        { error: 'שגיאה בהפעלת תהליך ניתוח חוזר', details: processError.message },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('שגיאה כללית בניסיון חוזר:', error);
    
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 