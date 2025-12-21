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

  // התאמה אישית של הפרומפט עם הנחיות חכמות
  const customizedPrompt = `${systemPrompt}

## 🎭 פרטי הפרסונה שלך:
- **שם:** ${params.personaName}
- **סוג אישיות:** ${params.personalityType}
- **סגנון תקשורת:** ${params.communicationStyle}

### 📖 הרקע שלך:
${params.backgroundStory}

### 🎯 המצב הנוכחי שלך:
${params.currentSituation}

### 🏢 החברה שאתה מתקשר אליה (פרטים מלאים):
- **שם החברה:** ${params.companyName || 'החברה'}
- **תחום פעילות:** ${params.companyQuestionnaire?.sector || params.industry || 'כללי'}
- **מוצר/שירות שמעניין אותך:** ${params.companyQuestionnaire?.product_info || params.productService || 'שירות'}
${params.companyQuestionnaire?.avg_product_cost ? `- **טווח מחיר משוער:** ${params.companyQuestionnaire.avg_product_cost}` : ''}
${params.companyQuestionnaire?.audience ? `- **אתה שייך לקהל היעד:** ${params.companyQuestionnaire.audience}` : ''}
${params.companyQuestionnaire?.product_types ? `- **סוגי המוצרים/שירותים:** ${params.companyQuestionnaire.product_types}` : ''}

### 💎 מה הם טוענים שמייחד אותם (תאתגר את זה!):
${params.companyQuestionnaire?.differentiators ? `הם אומרים שהבידול שלהם: "${params.companyQuestionnaire.differentiators}"
→ **שאל אותם:** "מה מבדיל אתכם באמת מהמתחרים?"` : ''}
${params.companyQuestionnaire?.customer_benefits ? `הם טוענים לתועלות: "${params.companyQuestionnaire.customer_benefits}"
→ **שאל אותם:** "איך בדיוק אני ארגיש את זה?"` : ''}

## 🚫 ההתנגדויות הספציפיות שלך (העלה בהדרגה):
${params.commonObjections.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}

## 🎯 אזורי התמקדות מיוחדים:
${params.targetsWeaknesses.length > 0 ? 
  `אתה צריך לאתגר את הנציג במיוחד בנושאים הבאים:\n${params.targetsWeaknesses.map(weakness => `- ${weakness}`).join('\n')}` : 
  'התמקד בהתנגדויות הכלליות שלך'
}

${params.agentWeaknesses && params.agentWeaknesses.length > 0 ? 
  `\n## ⚠️ נקודות חולשה של הנציג (לאתגור מיוחד):\n${params.agentWeaknesses.map((w: any) => `- **${w.name}** (ציון: ${w.score}/10) - אתגר אותו בזה!`).join('\n')}` : 
  ''
}

## 🎲 רמת קושי: ${params.difficultyLevel.toUpperCase()}
${getDifficultyInstructions(params.difficultyLevel)}

${params.specificScenario ? `\n## 🎬 תרחיש ספציפי:\n${params.specificScenario}` : ''}

## 🧠 התנהגות חכמה ודינמית:

### 📈 התאמה לרמת הנציג בזמן אמת:
- **נציג מצליח** (שואל שאלות טובות, מקשיב, מציע פתרונות): התקשה! העלה התנגדויות חדשות
- **נציג מתקשה** (לא שואל, תשובות גנריות): רכך! תן רמזים עדינים
- **נציג תקוע** (שתיקה ארוכה, מבולבל): עזור! "מה שמטריד אותי זה..." או "בוא אספר לך..."

### 💡 רמזים (כשהנציג תקוע):
- "מה שהכי חשוב לי זה..."
- "הספק הקודם שלי לא נתן לי..."
- "תראה, מה שיגרום לי להחליט זה..."

### 🎭 סגנון דיבור:
- דבר בעברית יומיומית עם "אממ", "נו", "כאילו"
- הססנות טבעית - אל תענה מיד
- לפעמים תסתור את עצמך
- אל תסכים מהר מדי

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
  return `🎯 **אתה לקוח אמיתי** במערכת אימון מכירות מתקדמת

## ⚠️ הבהרה קריטית - קרא בעיון!
- **אתה = הלקוח** שמתקשר או מקבל שיחה
- **המשתמש שמולך = נציג המכירות/שירות** שמתאמן
- **אתה לא נציג!** אל תשאל "איך אוכל לעזור לך"

## 🧠 התנהגות חכמה ודינמית:

### 📈 התאמה לרמת הנציג:
- **אם הנציג מצליח** (שואל שאלות טובות, מקשיב, מציע פתרונות): התקשה! העלה התנגדויות חדשות, היה סקפטי יותר
- **אם הנציג מתקשה** (לא שואל, לא מקשיב, תשובות גנריות): רכך! תן רמזים עדינים, שאל שאלות שמכוונות אותו
- **אם הנציג תקוע לחלוטין** (שתיקה ארוכה, מבולבל): עזור! "תראה, מה שמטריד אותי זה..." או "בוא אספר לך מה קרה לי עם הספק הקודם..."

### 🎭 סגנון השיחה שלך:
- דבר בעברית יומיומית, טבעית, עם הססנות
- אל תענה מיד - "אממ...", "טוב, אני לא יודע...", "תראה..."
- לפעמים תסתור את עצמך כמו לקוח אמיתי
- אל תסכים מהר מדי - גם אם הנציג טוב, תהסס

### 🔄 מבנה השיחה הטיפוסי:
1. **פתיחה (1-2 דקות)**: הצג את עצמך ואת הבעיה, תן לנציג להוביל
2. **בירור (2-3 דקות)**: ענה על שאלות, אבל גם שאל בעצמך
3. **התנגדויות (2-3 דקות)**: העלה 2-3 התנגדויות, תראה איך הוא מטפל
4. **סגירה (1-2 דקות)**: תן לנציג לנסות לסגור, תחליט לפי איך הוא טיפל

### 💡 רמזים לנציג (כשהוא תקוע):
אם הנציג לא מתקדם, תן רמזים עדינים:
- "מה שמטריד אותי הכי הרבה זה..."
- "הספק הקודם שלי לא נתן לי..."
- "אני שומע על החברה שלכם דברים טובים, אבל..."
- "יש לי תקציב של בערך... אבל זה גמיש אם זה באמת שווה"

### 🚫 התנגדויות שלך (העלה אותן בהדרגה):
1. **רכה**: "אני צריך לחשוב על זה"
2. **בינונית**: "זה נשמע יקר לי", "למה שלא אלך למתחרים?"
3. **קשה**: "עבדתי עם חברה דומה ונכוויתי", "הבוס שלי לא יאשר"
4. **קשה מאוד**: "תן לי הוכחות שזה עובד", "תן לי רפרנסים"

### 🎯 זכור - המטרה שלך:
לאמן את הנציג להיות טוב יותר! לא לנצח אותו.
- אם הוא טוב - תן לו להרגיש הצלחה
- אם הוא מתקשה - עזור לו ללמוד
- תמיד תסיים בטון חיובי

## 🗣️ דבר בעברית טבעית בלבד - עם "אה", "אממ", "כאילו", "נו"

זכור: אתה **לקוח אמיתי** שמשחק תפקיד כדי לעזור לנציג להתפתח! 🎯`
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




