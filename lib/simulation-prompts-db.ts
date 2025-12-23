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
  selectedTopics?: string[] // ✅ נושאים שנבחרו לאימון
  // ✅ פרטי שאלון החברה המלאים
  companyQuestionnaire?: {
    sector?: string
    product_info?: string
    avg_product_cost?: string
    audience?: string
    product_types?: string
    differentiators?: string
    customer_benefits?: string
    company_benefits?: string
  }
}

/**
 * סינון פרומפט לפי נושאים נבחרים
 * מוסיף הנחיות מפורשות ל-AI להתמקד בנושאים הנבחרים
 */
export function filterPromptByTopics(
  basePrompt: string, 
  selectedTopics: string[]
): string {
  if (!selectedTopics || selectedTopics.length === 0) {
    return basePrompt
  }
  
  // מיפוי נושאים לסעיפים בפרומפט
  const topicSections: Record<string, string> = {
    'פתיחת_שיחה_ובניית_אמון': 'פתיחת שיחה ובניית אמון',
    'איתור_צרכים_וזיהוי_כאב': 'איתור צרכים וזיהוי כאב',
    'הקשבה_ואינטראקציה': 'הקשבה ואינטראקציה',
    'הצגת_פתרון_והדגשת_ערך': 'הצגת פתרון והדגשת ערך',
    'טיפול_בהתנגדויות': 'טיפול בהתנגדויות',
    'הנעה_לפעולה_וסגירה': 'הנעה לפעולה וסגירה',
    'שפת_תקשורת': 'שפת תקשורת',
    'שלושת_הלמה': 'שלושת הלמה'
  }
  
  // הוספת הנחיות מפורשות לAI להתמקד בנושאים שנבחרו
  const focusInstruction = `
🎯 **התמקד במיוחד בתחומים הבאים:**
${selectedTopics.map(t => `- ${topicSections[t] || t}`).join('\n')}

**הנחיות לAI:**
- אתגר את הנציג במיוחד בתחומים אלה
- העלה התנגדויות וסיטואציות שידרשו מהנציג להפגין מיומנויות בתחומים אלה
- שים דגש על הערכת הביצועים בתחומים שנבחרו
- תן משוב מפורט על כל אחד מהנושאים שנבחרו
`
  
  return focusInstruction + '\n\n' + basePrompt
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
  let { systemPrompt, error } = await getSimulationPromptFromDB(promptType)
  
  if (error) {
    console.warn(`שימוש בפרומפט fallback בגלל: ${error}`)
  }

  // ✅ סינון הפרומפט לפי נושאים נבחרים (אם יש)
  if (params.selectedTopics && params.selectedTopics.length > 0) {
    systemPrompt = filterPromptByTopics(systemPrompt, params.selectedTopics)
    console.log(`✅ פרומפט סונן לפי ${params.selectedTopics.length} נושאים נבחרים`)
  }

  // פרומפט קצר וברור - בגוף ראשון כדי שה-AI יזדהה כלקוח
  const customizedPrompt = `אני ${params.personaName}, לקוח שמתקשר לחברת ${params.companyName || 'החברה'}.
המשתמש שמדבר איתי הוא נציג מכירות - הוא מנסה למכור לי, ואני צריך להחליט אם לקנות.

מי אני:
- שם: ${params.personaName}
- אישיות: ${params.personalityType}
- סגנון: ${params.communicationStyle}
- רקע: ${params.backgroundStory}
- מצב נוכחי: ${params.currentSituation}

מה מעניין אותי:
- תחום: ${params.companyQuestionnaire?.sector || params.industry || 'כללי'}
- מוצר/שירות: ${params.companyQuestionnaire?.product_info || params.productService || 'שירות'}
${params.companyQuestionnaire?.avg_product_cost ? `- תקציב משוער: ${params.companyQuestionnaire.avg_product_cost}` : ''}

ההתנגדויות שלי (אעלה בהדרגה):
${params.commonObjections.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}

${params.agentWeaknesses && params.agentWeaknesses.length > 0 ? 
  `נקודות לאתגר במיוחד:\n${params.agentWeaknesses.map((w: any) => `- ${w.name}`).join('\n')}` : ''
}

רמת קושי: ${params.difficultyLevel}
${getDifficultyInstructions(params.difficultyLevel)}

איך אני מתנהג:
- פותח: "שלום, אני ${params.personaName}, ראיתי את הפרסום שלכם..."
- שואל שאלות על המוצר והמחיר
- מעלה התנגדויות כשמנסים למכור לי
- מהסס, לא מחליט מהר
- מדבר עברית טבעית עם "אממ", "נו", "תראה"

התאמה לנציג:
- נציג טוב שמשכנע? אתקשה יותר
- נציג מתקשה? אתן רמז: "מה שמטריד אותי זה..."
- נציג תקוע? אעזור: "בוא אספר לך מה אני צריך..."

חשוב: אני הלקוח - הנציג הוא זה שמציע ומוכר!

### 🎯 זכור - המטרה:
לאמן את הנציג! לא לנצח אותו. אם הוא טוב - תן לו להרגיש הצלחה. אם הוא מתקשה - עזור לו ללמוד.
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
 * הוראות טונציה וסגנון דיבור לפי אישיות
 */
function getVoiceToneInstructions(personalityType: string, communicationStyle: string): string {
  const personality = personalityType?.toLowerCase() || ''
  const style = communicationStyle?.toLowerCase() || ''
  
  let toneInstructions = ''
  
  // לפי סוג אישיות
  if (personality.includes('אנליטי') || personality.includes('מדויק')) {
    toneInstructions += '- דבר באופן מסודר ולוגי\n- שאל שאלות מספריות ומדויקות\n- בקש נתונים והוכחות\n'
  } else if (personality.includes('דומיננטי') || personality.includes('תובעני')) {
    toneInstructions += '- דבר בביטחון וישירות\n- היה חד וקצר\n- דרוש תשובות מהירות\n'
  } else if (personality.includes('חברותי') || personality.includes('ידידותי')) {
    toneInstructions += '- היה חם ופתוח\n- שתף רגשות והתלבטויות\n- הראה עניין אישי\n'
  } else if (personality.includes('זהיר') || personality.includes('מהסס')) {
    toneInstructions += '- דבר לאט ובזהירות\n- הצג חששות רבים\n- בקש זמן לחשוב\n'
  } else {
    toneInstructions += '- דבר בצורה טבעית ונעימה\n'
  }
  
  // לפי סגנון תקשורת
  if (style.includes('ישיר')) {
    toneInstructions += '- היה ישיר ותכליתי - אל תעקוף\n'
  } else if (style.includes('רשמי')) {
    toneInstructions += '- שמור על שפה רשמית ומנומסת\n'
  } else if (style.includes('לא פורמלי') || style.includes('חברי')) {
    toneInstructions += '- היה קליל וחברותי בשפה\n'
  }
  
  return toneInstructions || '- דבר בצורה טבעית ונעימה'
}

/**
 * יצירת שאלות מותאמות אישית לפי הרקע
 */
function getPersonalizedQuestions(params: SimulationPromptParams): string {
  const questions: string[] = []
  
  // שאלות לפי תחום
  if (params.industry) {
    questions.push(`שאל על ניסיון קודם בתחום ה${params.industry}`)
  }
  
  // שאלות לפי מוצר
  if (params.productService) {
    questions.push(`שאל איך ה${params.productService} עובד בפועל`)
    questions.push(`שאל על הבדלים מהמתחרים`)
  }
  
  // שאלות לפי סיטואציה
  if (params.currentSituation) {
    questions.push(`שאל איך זה יעזור לבעיה הספציפית שלך: "${params.currentSituation}"`)
  }
  
  // שאלות כלליות אם אין מספיק
  if (questions.length < 3) {
    questions.push('שאל על מחיר ותנאי תשלום')
    questions.push('שאל על זמני אספקה/התחלה')
    questions.push('שאל על אחריות ותמיכה')
  }
  
  return questions.map((q, i) => `${i + 1}. ${q}`).join('\n')
}

/**
 * פרומפט ברירת מחדל במקרה של כשל - גרסה חכמה!
 */
function getDefaultSimulationPrompt(): string {
  return `אני לקוח שמתקשר לחברה. המשתמש שמדבר איתי הוא נציג מכירות שמנסה למכור לי.

התפקיד שלי: אני הלקוח. אני שואל שאלות. אני מעלה התנגדויות. אני צריך שישכנעו אותי לקנות.

מה אני עושה:
- פותח בהצגה עצמית: "שלום, אני [שם], ראיתי את הפרסום שלכם..."
- שואל שאלות על המוצר והמחיר
- מעלה התנגדויות: "יקר לי", "צריך לחשוב", "יש מתחרים"
- מחכה שהנציג ישכנע אותי

איך אני מדבר:
- עברית טבעית עם "אממ", "נו", "תראה"
- מהסס, לא מחליט מהר
- שואל: "כמה זה עולה?", "מה אני מקבל?", "למה דווקא אתם?"

חשוב: אני הקונה - הנציג הוא זה שמציע ומוכר, לא אני!`
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




