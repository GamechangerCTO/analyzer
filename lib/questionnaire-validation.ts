import { createClient } from '@/lib/supabase/server'

export interface QuestionnaireValidation {
  isValid: boolean
  isComplete: boolean
  completeness: number
  missing: string[]
  ageInDays: number
  isStale: boolean
  questionnaire?: any
  errors: string[]
}

/**
 * בודק את תקינות ושלמות שאלון החברה
 */
export async function validateCompanyQuestionnaire(
  companyId: string
): Promise<QuestionnaireValidation> {
  const supabase = createClient()
  
  const result: QuestionnaireValidation = {
    isValid: false,
    isComplete: false,
    completeness: 0,
    missing: [],
    ageInDays: 0,
    isStale: false,
    errors: []
  }

  try {
    // שליפת השאלון
    const { data: questionnaire, error } = await supabase
      .from('company_questionnaires')
      .select('*')
      .eq('company_id', companyId)
      .single()

    if (error || !questionnaire) {
      result.errors.push('לא נמצא שאלון חברה')
      return result
    }

    result.questionnaire = questionnaire
    result.isValid = true

    // בדיקת שדות חובה
    const requiredFields = [
      { key: 'industry', name: 'תחום עסקי' },
      { key: 'product_service', name: 'מוצר/שירות' },
      { key: 'target_audience', name: 'קהל יעד' },
      { key: 'key_differentiator', name: 'בידול מרכזי' },
      { key: 'customer_benefits', name: 'תועלות לקוח' }
    ]

    const missingFields: string[] = []
    let filledFields = 0

    for (const field of requiredFields) {
      const value = questionnaire[field.key]
      if (!value || (typeof value === 'string' && value.trim().length === 0)) {
        missingFields.push(field.name)
      } else {
        filledFields++
      }
    }

    result.missing = missingFields
    result.completeness = Math.round((filledFields / requiredFields.length) * 100)
    result.isComplete = missingFields.length === 0

    // בדיקת גיל השאלון
    const updatedAt = new Date(questionnaire.updated_at || questionnaire.created_at)
    const now = new Date()
    const ageInMs = now.getTime() - updatedAt.getTime()
    result.ageInDays = Math.floor(ageInMs / (1000 * 60 * 60 * 24))
    
    // שאלון נחשב "ישן" אם לא עודכן ב-180 יום (6 חודשים)
    result.isStale = result.ageInDays > 180

    if (!result.isComplete) {
      result.errors.push(`שאלון החברה לא מלא. חסרים: ${missingFields.join(', ')}`)
    }

    if (result.isStale) {
      result.errors.push(`שאלון החברה לא עודכן כבר ${result.ageInDays} יום. מומלץ לעדכן את הנתונים.`)
    }

  } catch (error) {
    result.errors.push(`שגיאה בבדיקת השאלון: ${error instanceof Error ? error.message : 'Unknown'}`)
  }

  return result
}

/**
 * יוצר fallback persona מבוסס שאלון (ללא AI) במקרה כשלון
 */
export function createFallbackPersona(questionnaire: any): any {
  if (!questionnaire) {
    return {
      persona_name: 'לקוח פוטנציאלי',
      personality_type: 'מקצועי ומעורב',
      communication_style: 'ישיר ומנומס',
      industry_context: 'כללי',
      company_size: 'בינוני',
      background_story: 'לקוח פוטנציאלי המעוניין במוצרים/שירותים שלנו',
      current_situation: 'מחפש פתרון לצרכים שלו',
      pain_points: ['צורך בפתרון איכותי', 'רגישות למחיר', 'חוסר ודאות'],
      goals_and_objectives: ['מציאת פתרון מתאים', 'ערך תמורת כסף'],
      common_objections: ['מחיר', 'זמן', 'אמון'],
      objection_patterns: {
        price: 'שואל על מחיר והשוואה למתחרים',
        trust: 'מבקש המלצות ואישורים',
        timing: 'רוצה זמן לחשוב'
      },
      preferred_communication: ['שיחה ישירה', 'הסברים ברורים'],
      decision_making_style: 'מבוסס מידע',
      budget_sensitivity: 'בינונית',
      time_pressure: 'רגיל',
      openai_instructions: 'התנהג כלקוח מקצועי ומעורב. שאל שאלות רלוונטיות והעלה התנגדויות סבירות.',
      scenario_templates: {
        opening: 'הצג עניין אך שאל שאלות מבררות',
        objections: 'העלה חששות לגבי מחיר ואיכות',
        closing: 'בקש זמן לחשוב לפני החלטה'
      },
      voice_characteristics: {
        gender: Math.random() > 0.5 ? 'male' : 'female'
      }
    }
  }

  // יצירת פרסונה מבוססת נתוני השאלון
  const industry = questionnaire.industry || 'כללי'
  const productService = questionnaire.product_service || 'מוצרים/שירותים'
  const targetAudience = questionnaire.target_audience || 'לקוחות פוטנציאליים'
  const benefits = questionnaire.customer_benefits || 'ערך מוסף'
  const objections = questionnaire.common_objections 
    ? questionnaire.common_objections.split(',').map((o: string) => o.trim())
    : ['מחיר', 'זמן', 'אמון']

  // שמות אקראיים עבריים
  const maleNames = ['דוד', 'אלון', 'רועי', 'יוסי', 'מיכאל', 'אבי', 'ליאור', 'אורי']
  const femaleNames = ['מיכל', 'יעל', 'רונית', 'דנה', 'שירה', 'נועה', 'תמר', 'הילה']
  const lastNames = ['כהן', 'לוי', 'מזרחי', 'אברהם', 'דהן', 'ברק', 'שמש', 'גרין']
  
  const isMale = Math.random() > 0.5
  const firstName = isMale 
    ? maleNames[Math.floor(Math.random() * maleNames.length)]
    : femaleNames[Math.floor(Math.random() * femaleNames.length)]
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]

  return {
    persona_name: `${firstName} ${lastName} - לקוח ב${industry}`,
    personality_type: 'מעורב ומחפש ערך',
    communication_style: 'ישיר ומקצועי',
    industry_context: industry,
    company_size: 'בינוני',
    background_story: `${firstName} הוא לקוח פוטנציאלי ב${industry}. הוא שמע על ${productService} ומעוניין להבין אם זה מתאים לצרכים שלו.`,
    current_situation: `מחפש ${productService} שיעניק לו ${benefits}`,
    pain_points: [
      `קושי למצוא ${productService} איכותי`,
      'חששות לגבי מחיר',
      'צורך בפתרון מהיר ויעיל'
    ],
    goals_and_objectives: [
      `מציאת ${productService} מתאים`,
      'קבלת ערך תמורת כסף',
      'עבודה עם ספק אמין'
    ],
    common_objections: objections,
    objection_patterns: {
      price: `המחיר של ${productService} נראה גבוה`,
      trust: 'צריך לראות המלצות ואישורים',
      timing: 'לא בטוח שזה הזמן הנכון'
    },
    preferred_communication: ['ישיר', 'עניני', 'ברור'],
    decision_making_style: 'מבוסס מידע והשוואה',
    budget_sensitivity: 'בינונית',
    time_pressure: 'רגיל',
    openai_instructions: `אתה ${firstName} ${lastName}, לקוח פוטנציאלי ב${industry}. אתה מעוניין ב${productService} אבל יש לך שאלות וחששות. התנהג בצורה מקצועית ומעורבת. שאל שאלות על: ${benefits}. העלה התנגדויות כמו: ${objections.join(', ')}. היה מאתגר אך פתוח לשכנוע אם תקבל תשובות טובות.`,
    scenario_templates: {
      opening: `שלום, שמעתי על ${productService} שלכם. אשמח להבין יותר`,
      objections: `יש לי כמה חששות: ${objections[0]}, ובנוסף ${objections[1] || 'זמן יישום'}`,
      closing: 'נשמע מעניין, אבל אני צריך לחשוב על זה ולהשוות'
    },
    voice_characteristics: {
      gender: isMale ? 'male' : 'female'
    }
  }
}

/**
 * מחשב ציון שלמות השאלון (0-100)
 */
export function calculateQuestionnaireCompleteness(questionnaire: any): number {
  if (!questionnaire) return 0

  const allFields = [
    'industry',
    'product_service',
    'target_audience',
    'key_differentiator',
    'customer_benefits',
    'average_deal_size',
    'sales_cycle',
    'common_objections',
    'company_description'
  ]

  let filledCount = 0
  for (const field of allFields) {
    const value = questionnaire[field]
    if (value && (typeof value !== 'string' || value.trim().length > 0)) {
      filledCount++
    }
  }

  return Math.round((filledCount / allFields.length) * 100)
}

