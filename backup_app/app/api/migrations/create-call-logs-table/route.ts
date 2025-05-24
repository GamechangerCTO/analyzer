import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/database.types';

export async function POST(request: Request) {
  try {
    // יצירת לקוח סופהבייס בצד השרת עם הרשאות מלאות
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // יצירת טבלת call_logs
    const { error: createTableError } = await supabase.rpc('create_call_logs_table');

    if (createTableError) {
      // ניסיון חלופי ביצירה ישירה באמצעות SQL
      const { error: sqlError } = await supabase.rpc('run_sql', {
        sql: `
          -- יצירת טבלת לוגים של שיחות
          CREATE TABLE IF NOT EXISTS call_logs (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
            message TEXT NOT NULL,
            data JSONB,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            
            -- אינדקסים
            INDEX call_logs_call_id_idx (call_id),
            INDEX call_logs_created_at_idx (created_at)
          );
          
          -- הוספת הרשאות לטבלה
          ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
          
          -- יצירת פוליסי להרשאות
          CREATE POLICY "Allow users to view logs for their calls" 
            ON call_logs FOR SELECT 
            USING (
              EXISTS (
                SELECT 1 FROM calls
                WHERE calls.id = call_logs.call_id
                AND calls.user_id = auth.uid()
              )
            );
            
          -- מנהלים יכולים לראות את כל הלוגים
          CREATE POLICY "Allow admins to view all logs" 
            ON call_logs FOR SELECT 
            USING (
              EXISTS (
                SELECT 1 FROM users
                WHERE users.id = auth.uid() 
                AND users.role IN ('admin', 'owner')
              )
            );
            
          -- הרשאה לשרת להוסיף לוגים
          CREATE POLICY "Allow service role to insert logs" 
            ON call_logs FOR INSERT 
            WITH CHECK (true);
          
          COMMENT ON TABLE call_logs IS 'לוגים מפורטים של תהליך ניתוח השיחות';
        `
      });

      if (sqlError) {
        return NextResponse.json(
          { error: 'שגיאה ביצירת טבלת לוגים', details: sqlError },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'טבלת call_logs נוצרה בהצלחה'
    });

  } catch (error: any) {
    console.error('שגיאה כללית ביצירת טבלת לוגים:', error);
    
    return NextResponse.json(
      { error: error.message || 'שגיאה לא ידועה' },
      { status: 500 }
    );
  }
} 