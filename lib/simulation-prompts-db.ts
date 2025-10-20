/**
 * מערכת פרומפטים מתקדמת לסימולציות - מחוברת למסד הנתונים
 * מחליפה את lib/simulation-prompts.ts לעבודה מלאה עם הפרומפטים מהמסד
 */

import { createClient } from '@/lib/supabase/client'

export interface SimulationPromptParams {
  personaName: string
  personalityType: string
  communicationStyle: string
  backgroundStory: string
  currentSituation: string
  commonObjections: string[]
  targetsWeaknesses: string[]
  difficultyLevel: 'easy' | 'medium' | 'hard' | 'expert'
  companyName?: string
  industry?: string
  productService?: string
  callType: 'inbound' | 'outbound' | 'follow_up' | 'closing' | 'customer_service' | 'upsell' | 'retention'
  specificScenario?: string
  agentWeaknesses?: string[]
}

/**
 * שליפת פרומפט לסימולציה מטבלת prompts
 */
export async function getSimulationPromptFromDB(
  callType: string,
  fallbackToBase: boolean = true
): Promise<{ systemPrompt: string; analysisFields?: any; error?: string }> {
  try {
    const supabase = createClient()
    
    // ניסיון ראשון - חיפוש פרומפט ספציפי לסוג השיחה
    const { data: promptData, error: promptError } = await supabase
      .from('prompts')
      .select('system_prompt, analysis_fields, analysis_criteria')
      .eq('call_type', callType)
      .eq('is_active', true)
      .single()

    if (!promptError && promptData) {
      console.log(`✅ נמצא פרומפט לסוג: ${callType}`)
      return {
        systemPrompt: promptData.system_prompt,
        analysisFields: promptData.analysis_fields
      }
    }

    // ניסיון שני - חיפוש פרומפט סימולציה כללי
    if (fallbackToBase) {
      const { data: basePrompt, error: baseError } = await supabase
        .from('prompts')
        .select('system_prompt, analysis_fields, analysis_criteria')
        .eq('call_type', 'simulation_base')
        .eq('is_active', true)
        .single()

      if (!baseError && basePrompt) {
        console.log(`⚠️ משתמש בפרומפט בסיסי לסימולציה עבור: ${callType}`)
        return {
          systemPrompt: basePrompt.system_prompt,
          analysisFields: basePrompt.analysis_fields
        }
      }
    }

    // אם לא נמצא כלום - fallback להגדרה ידנית
    console.warn(`❌ לא נמצא פרומפט עבור ${callType}, משתמש בפרומפט בסיסי`)
    return {
      systemPrompt: getDefaultSimulationPrompt(),
      error: `לא נמצא פרומפט עבור ${callType}`
    }

  } catch (error: any) {
    console.error('❌ שגיאה בשליפת פרומפט מהמסד:', error)
    return {
      systemPrompt: getDefaultSimulationPrompt(),
      error: error.message
    }
  }
}

/**
 * יצירת פרומפט מותאם אישית על בסיס פרומפט מהמסד + פרמטרים
 */
export async function createCustomizedSimulationPrompt(params: SimulationPromptParams): Promise<string> {
  const { callType } = params
  
  // קביעת סוג הפרומפט לפי callType
  let promptType = 'simulation_base'
  if (callType === 'inbound') promptType = 'simulation_inbound'
  else if (callType === 'outbound') promptType = 'simulation_outbound'
  
  // שליפת הפרומפט מהמסד
  const { systemPrompt, error } = await getSimulationPromptFromDB(promptType)
  
  if (error) {
    console.warn(`שימוש בפרומפט fallback בגלל: ${error}`)
  }

  // התאמה אישית של הפרומפט
  const customizedPrompt = `${systemPrompt}

## 🎭 פרטי הפרסונה שלך:
- **שם:** ${params.personaName}
- **סוג אישיות:** ${params.personalityType}
- **סגנון תקשורת:** ${params.communicationStyle}

### 📖 הרקע שלך:
${params.backgroundStory}

### 🎯 המצב הנוכחי שלך:
${params.currentSituation}

### 🏢 החברה שאתה מתקשר אליה:
- שם: ${params.companyName || 'החברה'}
- תחום: ${params.industry || 'כללי'}
- מוצר/שירות: ${params.productService || 'שירות'}

## 🚫 ההתנגדויות הספציפיות שלך:
${params.commonObjections.map(obj => `- ${obj}`).join('\n')}

## 🎯 אזורי התמקדות מיוחדים:
${params.targetsWeaknesses.length > 0 ? 
  `אתה צריך לאתגר את הנציג במיוחד בנושאים הבאים:\n${params.targetsWeaknesses.map(weakness => `- ${weakness}`).join('\n')}` : 
  'התמקד בהתנגדויות הכלליות שלך'
}

${params.agentWeaknesses && params.agentWeaknesses.length > 0 ? 
  `\n## ⚠️ נקודות חולשה של הנציג (לאתגור מיוחד):\n${params.agentWeaknesses.map(weakness => `- ${weakness}`).join('\n')}` : 
  ''
}

## 🎲 רמת קושי: ${params.difficultyLevel.toUpperCase()}
${getDifficultyInstructions(params.difficultyLevel)}

${params.specificScenario ? `\n## 🎬 תרחיש ספציפי:\n${params.specificScenario}` : ''}
`

  return customizedPrompt
}

/**
 * הוראות רמת קושי
 */
function getDifficultyInstructions(level: string): string {
  const instructions = {
    easy: 'היה מעט אתגרי, תיתן לנציג להצליח בקלות יחסית',
    medium: 'היה מאתגר במידה בינונית, העלה התנגדויות בסיסיות',
    hard: 'היה מאתגר מאוד, התעקש על ההתנגדויות שלך',
    expert: 'היה מקצועי וקשוח, כמו לקוח מנוסה שקשה לשכנע'
  }
  return instructions[level as keyof typeof instructions] || instructions.medium
}

/**
 * פרומפט ברירת מחדל במקרה של כשל
 */
function getDefaultSimulationPrompt(): string {
  return `🎯 אתה לקוח וירטואלי במערכת אימון מכירות

## 📋 הנחיות בסיסיות:
- דבר בעברית טבעית בלבד
- התנהג כמו לקוח אמיתי
- היה אתגרי אבל הוגן
- המטרה היא לאמן את הנציג

## 🚫 התנגדויות נפוצות:
- "אני צריך לחשוב על זה"
- "זה נשמע יקר"
- "אין לי זמן עכשיו"

זכור: המטרה היא ללמד את הנציג! 🎯`
}

/**
 * שליפת כל הפרומפטים הזמינים לסימולציות
 */
export async function getAvailableSimulationPrompts(): Promise<Array<{ call_type: string; system_prompt: string }>> {
  try {
    const supabase = createClient()
    
    const { data: prompts, error } = await supabase
      .from('prompts')
      .select('call_type, system_prompt')
      .like('call_type', 'simulation_%')
      .eq('is_active', true)
      .order('call_type')

    if (error) {
      console.error('❌ שגיאה בשליפת פרומפטי סימולציות:', error)
      return []
    }

    return prompts || []
  } catch (error) {
    console.error('❌ שגיאה בקריאת פרומפטי סימולציות:', error)
    return []
  }
}

/**
 * עדכון פרומפט סימולציה (לאדמינים)
 */
export async function updateSimulationPrompt(
  callType: string, 
  systemPrompt: string, 
  analysisFields?: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/simulations/prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        call_type: callType,
        system_prompt: systemPrompt,
        analysis_fields: analysisFields
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      return { success: false, error: errorData.error }
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}




