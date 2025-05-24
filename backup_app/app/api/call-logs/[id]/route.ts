import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/database.types';
import { createClient } from '@supabase/supabase-js';

// מערך לשמירת לוגים בזיכרון לשליפה מהירה 
// בנוסף לשמירה בסופהבייס
const callLogs: Record<string, Array<{ timestamp: string; message: string; data?: any }>> = {};

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
    
    // יצירת לקוח סופהבייס
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // קבלת לוגים מסופהבייס
    const { data: storedLogs, error } = await supabase
      .from('call_logs')
      .select('*')
      .eq('call_id', callId)
      .order('created_at', { ascending: true });
      
    if (error) {
      console.error('שגיאה בקבלת לוגים מסופהבייס:', error);
      
      // אם יש שגיאה, ננסה להשתמש בלוגים שבזיכרון
      const memoryLogs = callLogs[callId] || [];
      return NextResponse.json({
        callId,
        logs: memoryLogs,
        count: memoryLogs.length,
        source: 'memory'
      });
    }
    
    // המרת הלוגים מסופהבייס למבנה אחיד
    const formattedLogs = storedLogs.map(log => ({
      timestamp: log.created_at,
      message: log.message,
      data: log.data
    }));
    
    return NextResponse.json({
      callId,
      logs: formattedLogs,
      count: formattedLogs.length,
      source: 'supabase'
    });
    
  } catch (error: any) {
    console.error('שגיאה בקבלת לוגים של השיחה:', error);
    
    // במקרה של שגיאה, נחזיר את הלוגים מהזיכרון אם קיימים
    const memoryLogs = callLogs[params.id] || [];
    
    return NextResponse.json({
      callId: params.id,
      logs: memoryLogs,
      count: memoryLogs.length,
      source: 'memory_fallback',
      error: error.message || 'שגיאה בלתי צפויה'
    });
  }
}

// פונקציה לשימוש פנימי להוספת לוג חדש
export async function addCallLog(callId: string, message: string, data?: any) {
  try {
    // 1. שמירה בזיכרון
    if (!callLogs[callId]) {
      callLogs[callId] = [];
    }
    
    const timestamp = new Date().toISOString();
    
    callLogs[callId].push({
      timestamp,
      message,
      data
    });
    
    // שמירה על מקסימום 100 לוגים לכל שיחה בזיכרון
    if (callLogs[callId].length > 100) {
      callLogs[callId] = callLogs[callId].slice(-100);
    }
    
    // 2. הדפסה לקונסול (בסביבת פיתוח/שרת)
    console.log(`[${callId}] ${message}`, data || '');
    
    // 3. שמירה בסופהבייס - גישה ישירה במקום קריאה ל-API פנימי
    try {
      // יצירת קליינט סופאבייס עם סיסמה סודית (מוגדרת משתנה סביבה)
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || '' // שימוש במפתח שירות כדי לעקוף בעיות אימות
      );
      
      // ניסיון להוסיף את הלוג
      const { error: insertError } = await supabaseAdmin
        .from('call_logs')
        .insert([
          { 
            call_id: callId, 
            message, 
            data,
            created_at: timestamp 
          }
        ]);
      
      // אם יש שגיאה 42P01 (טבלה לא קיימת), ננסה ליצור אותה
      if (insertError && insertError.code === '42P01') {
        console.log('טבלת call_logs לא קיימת, מנסה ליצור אותה');
        
        // SQL ליצירת הטבלה
        const createTableSQL = `
          -- יצירת טבלת לוגים של שיחות
          CREATE TABLE IF NOT EXISTS call_logs (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
            message TEXT NOT NULL,
            data JSONB,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
        `;
        
        // ניסיון ליצור את הטבלה
        const { error: createError } = await supabaseAdmin.rpc('run_sql', { 
          sql: createTableSQL 
        });
        
        if (createError) {
          console.error('שגיאה ביצירת טבלת call_logs:', createError);
        } else {
          // נסה שוב להוסיף את הלוג אחרי יצירת הטבלה
          const { error: retryError } = await supabaseAdmin
            .from('call_logs')
            .insert([
              { 
                call_id: callId, 
                message, 
                data,
                created_at: timestamp 
              }
            ]);
          
          if (retryError) {
            console.error('שגיאה בהוספת לוג אחרי יצירת הטבלה:', retryError);
          }
        }
      } else if (insertError) {
        console.error('שגיאה בשמירת לוג ישירות לסופהבייס:', insertError);
      }
    } catch (dbError) {
      // אם נכשלה השמירה לסופהבייס, נמשיך בכל זאת
      console.error('שגיאה בשמירת לוג לסופהבייס:', dbError);
    }
  } catch (error) {
    console.error('שגיאה כללית בהוספת לוג:', error);
  }
} 