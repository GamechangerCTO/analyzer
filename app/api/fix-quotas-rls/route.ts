import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // בדיקת הרשאות - רק admin יכול להריץ את זה
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'לא מחובר' }, { status: 401 })
    }

    // בדיקה שזה admin
    if (user.email !== 'ido.segev23@gmail.com') {
      return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })
    }

    console.log('🔧 Starting company_minutes_quotas RLS fix...')

    // הרצת המיגרציה שלב אחר שלב
    const migrations = [
      // הפעלת RLS
      `ALTER TABLE company_minutes_quotas ENABLE ROW LEVEL SECURITY;`,
      
      // מחיקת policies קיימים
      `DROP POLICY IF EXISTS "Users can view own company quotas" ON company_minutes_quotas;`,
      `DROP POLICY IF EXISTS "Users can insert own company quotas" ON company_minutes_quotas;`,
      `DROP POLICY IF EXISTS "Users can update own company quotas" ON company_minutes_quotas;`,
      `DROP POLICY IF EXISTS "Service can manage quotas" ON company_minutes_quotas;`,
      
      // יצירת policy לקריאה
      `CREATE POLICY "Users can view own company quotas" ON company_minutes_quotas
        FOR SELECT USING (
          company_id IN (
            SELECT company_id FROM users 
            WHERE id = auth.uid()
          )
        );`,
      
      // policy לכתיבה
      `CREATE POLICY "Users can insert own company quotas" ON company_minutes_quotas
        FOR INSERT WITH CHECK (
          company_id IN (
            SELECT company_id FROM users 
            WHERE id = auth.uid()
          )
        );`,
      
      // policy לעדכון
      `CREATE POLICY "Users can update own company quotas" ON company_minutes_quotas
        FOR UPDATE USING (
          company_id IN (
            SELECT company_id FROM users 
            WHERE id = auth.uid()
          )
        );`,
      
      // policy לשירותים
      `CREATE POLICY "Service can manage quotas" ON company_minutes_quotas
        FOR ALL USING (
          auth.role() = 'service_role'
        );`,
      
      // הענקת הרשאות
      `GRANT ALL ON company_minutes_quotas TO authenticated;`,
      `GRANT ALL ON company_minutes_quotas TO service_role;`
    ]

    const results = []
    
    for (let i = 0; i < migrations.length; i++) {
      const migration = migrations[i]
      console.log(`🔧 Running migration ${i + 1}/${migrations.length}:`, migration.substring(0, 50) + '...')
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: migration })
        
        if (error) {
          console.error(`❌ Migration ${i + 1} failed:`, error)
          results.push({ step: i + 1, success: false, error: error.message })
        } else {
          console.log(`✅ Migration ${i + 1} succeeded`)
          results.push({ step: i + 1, success: true })
        }
      } catch (err) {
        console.error(`❌ Migration ${i + 1} exception:`, err)
        results.push({ step: i + 1, success: false, error: String(err) })
      }
    }

    // סיכום תוצאות
    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    console.log(`🏁 RLS fix completed: ${successful} successful, ${failed} failed`)

    return NextResponse.json({
      success: failed === 0,
      message: `RLS fix completed: ${successful} successful, ${failed} failed`,
      results,
      summary: {
        total: migrations.length,
        successful,
        failed
      }
    })

  } catch (error) {
    console.error('❌ RLS fix error:', error)
    return NextResponse.json(
      { error: 'שגיאה בתיקון RLS', details: String(error) },
      { status: 500 }
    )
  }
} 