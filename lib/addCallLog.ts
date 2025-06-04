import { createClient } from '@supabase/supabase-js';

// מערך לשמירת לוגים בזיכרון לשליפה מהירה 
const callLogs: Record<string, Array<{ timestamp: string; message: string; data?: any }>> = {};

// יצירת לקוח Supabase עם Service Role עבור פונקציות serverless
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * מוסיף לוג לשיחה עם אחסון ב-Supabase ופלטפורמת console
 * @param callId מזהה השיחה
 * @param message הודעת הלוג
 * @param data מידע נוסף (אופציונלי)
 */
export async function addCallLog(callId: string, message: string, data?: any) {
  try {
    // יצירת זמן timestamp מדויק
    const timestamp = new Date().toISOString();
    
    // הדפסה ב-console עם פורמט נוח לקריאה (גם ב-Vercel logs)
    console.log(`[${callId}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    
    // שמירה ב-Supabase עם timeout וניסיונות חוזרים
    const insertData = {
      call_id: callId,
      message,
      data: data || null,
      created_at: timestamp
    };

    // ניסיון אחד עם timeout
    const insertPromise = supabase
      .from('call_logs')
      .insert(insertData);

    // הגדרת timeout של 5 שניות
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Supabase insert timeout')), 5000)
    );

    const { error } = await Promise.race([insertPromise, timeoutPromise]) as any;
    
    if (error) {
      console.warn(`[${callId}] ⚠️ Failed to save log to Supabase:`, error.message);
      console.log(`[${callId}] 📝 Log (console only): ${message}`, data ? JSON.stringify(data) : '');
    } else {
      // אופציונלי: הדפסה רק אם נשמר בהצלחה
      // console.log(`[${callId}] ✅ Log saved to Supabase: ${message}`);
    }
  } catch (err: any) {
    // במקרה של שגיאה, לפחות נציג ב-console
    console.warn(`[${callId}] ⚠️ addCallLog error:`, err.message);
    console.log(`[${callId}] 📝 Log (console only): ${message}`, data ? JSON.stringify(data) : '');
  }
}

// פונקציה לקבלת לוגים מהזיכרון
export function getCallLogsFromMemory(callId: string) {
  return callLogs[callId] || [];
} 