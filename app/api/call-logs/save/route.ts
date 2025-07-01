import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { Database } from '@/types/database.types';

/**
 * נקודת קצה לשמירת לוג בטבלת call_logs
 */
export async function POST(request: Request) {
  try {
    // יצירת לקוח סופהבייס בצד השרת עם הרשאות מלאות
    const supabase = createClient();
    
    // קבלת נתוני הלוג מגוף הבקשה
    const { call_id, message, data, timestamp } = await request.json();

    if (!call_id) {
      return NextResponse.json(
        { error: 'חסר מזהה שיחה (call_id)' }, 
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { error: 'חסרה הודעת לוג (message)' }, 
        { status: 400 }
      );
    }

    // הוספת רשומת לוג לטבלת call_logs
    const { data: insertedLog, error } = await supabase
      .from('call_logs')
      .insert([
        { 
          call_id, 
          message, 
          data,
          created_at: timestamp || new Date().toISOString() 
        }
      ])
      .select('id, call_id, message, created_at')
      .single();

    if (error) {
      return NextResponse.json(
        { 
          error: 'שגיאה בשמירת לוג בסופהבייס', 
          details: error.message,
          call_id,
          message 
        }, 
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      log: insertedLog
    });

  } catch (error: any) {
    console.error('שגיאה כללית בשמירת לוג:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'שגיאה לא ידועה',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 