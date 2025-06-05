import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

// יצירת חיבור לSupabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// מיפוי בין קבצי הפרומפטים לסוגי השיחות
const promptMappings = [
  {
    file: 'sales_call_prompt.md',
    call_type: 'מכירה ישירה טלפונית'
  },
  {
    file: 'appointment_setting_prompt.md', 
    call_type: 'תאום פגישה'
  },
  {
    file: 'follow_up_before_proposal_prompt.md',
    call_type: 'פולו אפ מכירה טלפונית – לאחר שיחה ראשונית לפני מתן הצעה'
  },
  {
    file: 'follow_up_after_proposal_prompt.md',
    call_type: 'פולו אפ מכירה טלפונית –לאחר מתן הצעה'
  },
  {
    file: 'follow_up_appointment_setting_prompt.md',
    call_type: 'פולו אפ תאום פגישה (לפני קביעת פגישה)'
  },
  {
    file: 'customer_service_prompt.md',
    call_type: 'שירות לקוחות מגיב – בעקבות פניה של לקוח'
  }
]

async function checkAndSetupPrompts() {
  console.log('🔍 בודק את הפרומפטים הקיימים בבסיס הנתונים...')
  
  // בדיקת הפרומפטים הקיימים
  const { data: existingPrompts, error: fetchError } = await supabase
    .from('prompts')
    .select('call_type, is_active, system_prompt')
    .eq('is_active', true)
  
  if (fetchError) {
    console.error('❌ שגיאה בקריאת הפרומפטים:', fetchError)
    return
  }
  
  console.log(`📊 נמצאו ${existingPrompts?.length || 0} פרומפטים פעילים`)
  
  if (existingPrompts) {
    existingPrompts.forEach(prompt => {
      console.log(`✅ ${prompt.call_type} - ${prompt.system_prompt?.length || 0} תווים`)
    })
  }
  
  // בדיקה אם כל הפרומפטים קיימים
  const missingPrompts = promptMappings.filter(mapping => 
    !existingPrompts?.some(existing => existing.call_type === mapping.call_type)
  )
  
  if (missingPrompts.length === 0) {
    console.log('✅ כל הפרומפטים קיימים ופעילים!')
    return
  }
  
  console.log(`⚠️  נמצאו ${missingPrompts.length} פרומפטים חסרים:`)
  missingPrompts.forEach(missing => {
    console.log(`   - ${missing.call_type}`)
  })
  
  // העלאת הפרומפטים החסרים
  console.log('\n📤 מעלה פרומפטים חסרים...')
  
  for (const missing of missingPrompts) {
    try {
      // קריאת קובץ הפרומפט
      const promptPath = join(process.cwd(), 'memory-bank', 'prompts', missing.file)
      const promptContent = readFileSync(promptPath, 'utf-8')
      
      // חילוץ תוכן הפרומפט (אחרי הכותרת)
      const systemPrompt = promptContent
        .split('\n')
        .slice(2) // דילוג על הכותרת
        .join('\n')
        .trim()
      
      // הוספה לבסיס הנתונים
      const { data, error } = await supabase
        .from('prompts')
        .insert({
          call_type: missing.call_type,
          system_prompt: systemPrompt,
          is_active: true,
          version: 1
        })
        .select()
      
      if (error) {
        console.error(`❌ שגיאה בהעלאת ${missing.call_type}:`, error)
      } else {
        console.log(`✅ הועלה בהצלחה: ${missing.call_type} (${systemPrompt.length} תווים)`)
      }
    } catch (fileError) {
      console.error(`❌ שגיאה בקריאת קובץ ${missing.file}:`, fileError)
    }
  }
  
  console.log('\n🎉 תהליך העלאת הפרומפטים הושלם!')
  
  // בדיקה סופית
  const { data: finalCheck } = await supabase
    .from('prompts')
    .select('call_type')
    .eq('is_active', true)
  
  console.log(`📊 סך הכל פרומפטים פעילים: ${finalCheck?.length || 0}`)
}

// הפעלת הסקריפט
if (require.main === module) {
  checkAndSetupPrompts().catch(console.error)
}

export { checkAndSetupPrompts } 