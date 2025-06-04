import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // יצירת Supabase client עם Service Role Key כדי לעקוף RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('company_questionnaires')
      .select('is_complete, completion_score, sector, audience')
      .eq('company_id', params.id)
      .maybeSingle();

    if (error) {
      console.error('שגיאה בשליפת נתוני השאלון:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch questionnaire data' 
      }, { status: 500 });
    }

    // אם אין נתונים, נחזיר ערכי ברירת מחדל
    const result = data || {
      is_complete: false,
      completion_score: 0,
      sector: null,
      audience: null
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('שגיאה בAPI של שאלון החברה:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 