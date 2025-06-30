import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import fs from 'fs';
import path from 'path';

const promptFiles: { [key: string]: string } = {
  'מכירה ישירה טלפונית': 'sales_call_prompt.md',
  'תאום פגישה': 'appointment_setting_prompt.md',
  'פולו אפ מכירה טלפונית – לאחר שיחה ראשונית לפני מתן הצעה': 'follow_up_before_proposal_prompt.md',
  'פולו אפ מכירה טלפונית –לאחר מתן הצעה': 'follow_up_after_proposal_prompt.md',
  'פולו אפ תאום פגישה (לפני קביעת פגישה)': 'follow_up_appointment_setting_prompt.md',
  'שירות לקוחות מגיב – בעקבות פניה של לקוח': 'customer_service_prompt.md'
};

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // בדיקת הרשאות - רק אדמינים יכולים לעדכן פרומפטים
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log('🔄 מתחיל עדכון פרומפטים...');
    const results = [];

    for (const [callType, fileName] of Object.entries(promptFiles)) {
      try {
        const filePath = path.join(process.cwd(), 'memory-bank', 'prompts', fileName);
        
        // בדיקה אם הקובץ קיים
        if (!fs.existsSync(filePath)) {
          console.warn(`⚠️ קובץ לא נמצא: ${fileName}`);
          results.push({ callType, status: 'file_not_found', fileName });
          continue;
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        
        // חילוץ תוכן הפרומפט (מדלג על הכותרת)
        const lines = content.split('\n');
        const systemPrompt = lines.slice(2).join('\n').trim(); // דילוג על השורה הראשונה (כותרת)
        
        console.log(`📝 מעדכן ${callType}... (${systemPrompt.length} תווים)`);
        
        const { error } = await supabase
          .from('prompts')
          .upsert({
            call_type: callType,
            system_prompt: systemPrompt,
            is_active: true,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'call_type'
          });
        
        if (error) {
          console.error(`❌ שגיאה בעדכון ${callType}:`, error);
          results.push({ callType, status: 'error', error: error.message, fileName });
        } else {
          console.log(`✅ ${callType} עודכן בהצלחה`);
          results.push({ callType, status: 'success', promptLength: systemPrompt.length, fileName });
        }
      } catch (error) {
        console.error(`❌ שגיאה בקריאת קובץ ${fileName}:`, error);
        results.push({ callType, status: 'file_error', error: String(error), fileName });
      }
    }
    
    // סיכום התוצאות
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status !== 'success').length;
    
    console.log(`🎉 סיום עדכון פרומפטים: ${successCount} הצליחו, ${errorCount} נכשלו`);
    
    return NextResponse.json({
      success: true,
      message: `עדכון פרומפטים הושלם: ${successCount} הצליחו, ${errorCount} נכשלו`,
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: errorCount
      }
    });

  } catch (error) {
    console.error('❌ שגיאה כללית בעדכון פרומפטים:', error);
    return NextResponse.json({
      success: false,
      error: 'שגיאה בעדכון פרומפטים',
      details: String(error)
    }, { status: 500 });
  }
} 