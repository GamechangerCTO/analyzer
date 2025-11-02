/**
 * מודל עלויות מפורט למערכת הניתוח והסימולציות
 * מחירים מעודכנים לפי OpenAI API Pricing (דצמבר 2024)
 */

export interface ModelPricing {
  model: string
  inputTokenPrice: number  // $ per 1K tokens
  outputTokenPrice: number // $ per 1K tokens
  audioInputPrice?: number // $ per minute (for audio models)
  audioOutputPrice?: number // $ per minute (for audio models)
  realtimeInputPrice?: number // $ per minute (for realtime models)
  realtimeOutputPrice?: number // $ per minute (for realtime models)
  description: string
  usage: string[]
}

// מחירי המודלים הנוכחיים (דצמבר 2024)
export const MODEL_PRICING: Record<string, ModelPricing> = {
  'gpt-4o': {
    model: 'gpt-4o',
    inputTokenPrice: 0.0025,   // $2.50 per 1M tokens
    outputTokenPrice: 0.01,    // $10.00 per 1M tokens
    description: 'GPT-4o - המודל הראשי לטקסט',
    usage: ['יצירת פרסונות', 'יצירת תרחישים', 'ניתוח כללי']
  },
  'gpt-4o-2024-08-06': {
    model: 'gpt-4o-2024-08-06',
    inputTokenPrice: 0.0025,   // $2.50 per 1M tokens
    outputTokenPrice: 0.01,    // $10.00 per 1M tokens
    description: 'GPT-4o מתקדם לניתוח תוכן',
    usage: ['ניתוח שיחות מקצועי', 'תובנות צוות', 'סיכומי סוכנים']
  },
  'gpt-4o-audio-preview': {
    model: 'gpt-4o-audio-preview',
    inputTokenPrice: 0.0025,   // $2.50 per 1M tokens (text)
    outputTokenPrice: 0.01,    // $10.00 per 1M tokens (text)
    audioInputPrice: 0.100,    // $0.100 per minute (audio input)
    audioOutputPrice: 0.200,   // $0.200 per minute (audio output)
    description: 'GPT-4o עם יכולות אודיו לניתוח טון',
    usage: ['ניתוח טונציה מאודיו']
  },
  'gpt-4o-transcribe': {
    model: 'gpt-4o-transcribe',
    inputTokenPrice: 0.0025,   // $2.50 per 1M tokens
    outputTokenPrice: 0.01,    // $10.00 per 1M tokens
    audioInputPrice: 0.006,    // $0.006 per minute (transcription)
    description: 'GPT-4o לתמלול שיחות',
    usage: ['תמלול קבצי אודיו לטקסט']
  },
  'gpt-4-turbo-2024-04-09': {
    model: 'gpt-4-turbo-2024-04-09',
    inputTokenPrice: 0.01,     // $10.00 per 1M tokens
    outputTokenPrice: 0.03,    // $30.00 per 1M tokens
    description: 'GPT-4 Turbo לדוחות מפורטים',
    usage: ['דוחות סימולציה מפורטים']
  },
  'gpt-realtime': {
    model: 'gpt-realtime',
    inputTokenPrice: 0.005,    // $5.00 per 1M tokens (text)
    outputTokenPrice: 0.02,    // $20.00 per 1M tokens (text)
    realtimeInputPrice: 0.100, // $0.100 per minute (audio input)
    realtimeOutputPrice: 0.200, // $0.200 per minute (audio output)
    description: 'GPT Realtime - הכי יקר! לסימולציות חיות',
    usage: ['סימולציות קוליות בזמן אמת']
  },
  'whisper-1': {
    model: 'whisper-1',
    inputTokenPrice: 0.006,    // $0.006 per minute
    outputTokenPrice: 0,       // No output tokens
    audioInputPrice: 0.006,    // $0.006 per minute
    description: 'Whisper לתמלול בסיסי',
    usage: ['תמלול בסימולציות realtime']
  }
}

export interface CallCostEstimate {
  callType: string
  avgDurationMinutes: number
  estimatedCost: number
  breakdown: {
    transcription?: number
    toneAnalysis?: number
    contentAnalysis?: number
  }
}

export interface SimulationCostEstimate {
  simulationType: string
  durationMinutes: number
  estimatedCost: number
  breakdown: {
    realtimeAudio?: number
    transcription?: number
    reportGeneration?: number
  }
}

/**
 * מחשבון עלויות לעיבוד שיחה רגילה
 */
export function calculateCallProcessingCost(durationMinutes: number, callType: string = 'sales_call'): CallCostEstimate {
  let totalCost = 0
  const breakdown: any = {}

  // 1. תמלול עם gpt-4o-transcribe
  const transcriptionCost = durationMinutes * MODEL_PRICING['gpt-4o-transcribe'].audioInputPrice!
  breakdown.transcription = transcriptionCost
  totalCost += transcriptionCost

  // 2. ניתוח טון עם gpt-4o-audio-preview
  const toneAnalysisCost = durationMinutes * MODEL_PRICING['gpt-4o-audio-preview'].audioInputPrice!
  breakdown.toneAnalysis = toneAnalysisCost
  totalCost += toneAnalysisCost

  // 3. ניתוח תוכן עם gpt-4o-2024-08-06
  // הערכה: ~500 tokens input + 1000 tokens output לדקה
  const avgTokensPerMinute = 1500
  const contentInputCost = (avgTokensPerMinute * durationMinutes * 0.5 / 1000) * MODEL_PRICING['gpt-4o-2024-08-06'].inputTokenPrice
  const contentOutputCost = (avgTokensPerMinute * durationMinutes * 0.5 / 1000) * MODEL_PRICING['gpt-4o-2024-08-06'].outputTokenPrice
  breakdown.contentAnalysis = contentInputCost + contentOutputCost
  totalCost += breakdown.contentAnalysis

  return {
    callType,
    avgDurationMinutes: durationMinutes,
    estimatedCost: Math.round(totalCost * 100) / 100, // Round to 2 decimal places
    breakdown
  }
}

/**
 * מחשבון עלויות לסימולציה בזמן אמת
 */
export function calculateSimulationCost(durationMinutes: number, simulationType: string = 'realtime'): SimulationCostEstimate {
  let totalCost = 0
  const breakdown: any = {}

  // 1. Realtime Audio - הכי יקר!
  const realtimeInputCost = durationMinutes * MODEL_PRICING['gpt-realtime'].realtimeInputPrice!
  const realtimeOutputCost = durationMinutes * MODEL_PRICING['gpt-realtime'].realtimeOutputPrice!
  breakdown.realtimeAudio = realtimeInputCost + realtimeOutputCost
  totalCost += breakdown.realtimeAudio

  // 2. תמלול עם Whisper
  breakdown.transcription = durationMinutes * MODEL_PRICING['whisper-1'].audioInputPrice!
  totalCost += breakdown.transcription

  // 3. דוח סימולציה עם GPT-4 Turbo
  // הערכה: ~1000 tokens input + 2000 tokens output
  const reportInputCost = (1000 / 1000) * MODEL_PRICING['gpt-4-turbo-2024-04-09'].inputTokenPrice
  const reportOutputCost = (2000 / 1000) * MODEL_PRICING['gpt-4-turbo-2024-04-09'].outputTokenPrice
  breakdown.reportGeneration = reportInputCost + reportOutputCost
  totalCost += breakdown.reportGeneration

  return {
    simulationType,
    durationMinutes,
    estimatedCost: Math.round(totalCost * 100) / 100,
    breakdown
  }
}

/**
 * המלצות גבולות לסימולציות
 */
export interface SimulationLimits {
  maxDurationMinutes: number
  maxSimulationsPerDay: number
  maxSimulationsPerMonth: number
  estimatedMonthlyCost: number
  reasoning: string
}

export function getSimulationLimitsRecommendation(
  companySize: 'small' | 'medium' | 'large' = 'medium',
  budget: 'low' | 'medium' | 'high' = 'medium'
): SimulationLimits {
  
  const recommendations = {
    small_low: {
      maxDurationMinutes: 5,
      maxSimulationsPerDay: 2,
      maxSimulationsPerMonth: 30,
      reasoning: 'חברה קטנה עם תקציב מוגבל - סימולציות קצרות ומוגבלות'
    },
    small_medium: {
      maxDurationMinutes: 8,
      maxSimulationsPerDay: 3,
      maxSimulationsPerMonth: 50,
      reasoning: 'חברה קטנה עם תקציב בינוני - איזון בין עלות לערך'
    },
    small_high: {
      maxDurationMinutes: 12,
      maxSimulationsPerDay: 5,
      maxSimulationsPerMonth: 80,
      reasoning: 'חברה קטנה עם תקציב גבוה - מקסימום ערך לסוכנים'
    },
    medium_low: {
      maxDurationMinutes: 6,
      maxSimulationsPerDay: 5,
      maxSimulationsPerMonth: 100,
      reasoning: 'חברה בינונית עם תקציב מוגבל - פוקוס על יעילות'
    },
    medium_medium: {
      maxDurationMinutes: 10,
      maxSimulationsPerDay: 8,
      maxSimulationsPerMonth: 150,
      reasoning: 'חברה בינונית עם תקציב בינוני - המלצה מאוזנת'
    },
    medium_high: {
      maxDurationMinutes: 15,
      maxSimulationsPerDay: 12,
      maxSimulationsPerMonth: 250,
      reasoning: 'חברה בינונית עם תקציב גבוה - אימון מקסימלי'
    },
    large_low: {
      maxDurationMinutes: 8,
      maxSimulationsPerDay: 10,
      maxSimulationsPerMonth: 200,
      reasoning: 'חברה גדולה עם תקציב מוגבל - יעילות בקנה מידה'
    },
    large_medium: {
      maxDurationMinutes: 12,
      maxSimulationsPerDay: 15,
      maxSimulationsPerMonth: 300,
      reasoning: 'חברה גדולה עם תקציב בינוני - אימון מקצועי'
    },
    large_high: {
      maxDurationMinutes: 20,
      maxSimulationsPerDay: 25,
      maxSimulationsPerMonth: 500,
      reasoning: 'חברה גדולה עם תקציב גבוה - אין הגבלות מעשיות'
    }
  }

  const key = `${companySize}_${budget}` as keyof typeof recommendations
  const recommendation = recommendations[key]

  // חישוב עלות חודשית משוערת
  const avgSimulationCost = calculateSimulationCost(recommendation.maxDurationMinutes).estimatedCost
  const estimatedMonthlyCost = Math.round(avgSimulationCost * recommendation.maxSimulationsPerMonth * 100) / 100

  return {
    ...recommendation,
    estimatedMonthlyCost
  }
}

/**
 * ניתוח עלות-תועלת
 */
export interface CostBenefitAnalysis {
  scenario: string
  monthlyCost: number
  expectedBenefits: string[]
  roi: string
  recommendation: 'highly_recommended' | 'recommended' | 'consider_carefully' | 'not_recommended'
}

export function analyzeCostBenefit(
  avgSimulationsPerMonth: number,
  avgDurationMinutes: number,
  teamSize: number
): CostBenefitAnalysis {
  
  const simulationCost = calculateSimulationCost(avgDurationMinutes).estimatedCost
  const monthlyCost = simulationCost * avgSimulationsPerMonth
  const costPerAgent = monthlyCost / teamSize

  let recommendation: CostBenefitAnalysis['recommendation']
  let roi: string
  let expectedBenefits: string[]

  if (costPerAgent <= 50) {
    recommendation = 'highly_recommended'
    roi = 'גבוה מאוד - החזר השקעה תוך 1-2 חודשים'
    expectedBenefits = [
      'שיפור ביצועי מכירות ב-15-25%',
      'קיצור זמן הדרכה לעובדים חדשים ב-40%',
      'הגדלת שביעות רצון לקוחות',
      'חיסכון בעלויות הדרכה מסורתית'
    ]
  } else if (costPerAgent <= 100) {
    recommendation = 'recommended'
    roi = 'טוב - החזר השקעה תוך 2-4 חודשים'
    expectedBenefits = [
      'שיפור ביצועי מכירות ב-10-20%',
      'שיפור איכות שירות לקוחות',
      'אימון מתמשך ועקבי'
    ]
  } else if (costPerAgent <= 200) {
    recommendation = 'consider_carefully'
    roi = 'בינוני - החזר השקעה תוך 4-8 חודשים'
    expectedBenefits = [
      'שיפור מקצועי של הצוות',
      'אימון מתקדם לתרחישים מורכבים'
    ]
  } else {
    recommendation = 'not_recommended'
    roi = 'נמוך - החזר השקעה לא ברור'
    expectedBenefits = [
      'אימון מתקדם מאוד',
      'מתאים רק לחברות עם תקציב גבוה מאוד'
    ]
  }

  return {
    scenario: `${avgSimulationsPerMonth} סימולציות חודשיות, ${avgDurationMinutes} דקות ממוצע, ${teamSize} סוכנים`,
    monthlyCost: Math.round(monthlyCost * 100) / 100,
    expectedBenefits,
    roi,
    recommendation
  }
}

/**
 * דוגמאות לתרחישים שונים
 */
export function getExampleScenarios() {
  return [
    {
      name: 'סטארטאפ קטן (5 סוכנים)',
      limits: getSimulationLimitsRecommendation('small', 'medium'),
      analysis: analyzeCostBenefit(50, 8, 5)
    },
    {
      name: 'חברה בינונית (15 סוכנים)', 
      limits: getSimulationLimitsRecommendation('medium', 'medium'),
      analysis: analyzeCostBenefit(150, 10, 15)
    },
    {
      name: 'חברה גדולה (50 סוכנים)',
      limits: getSimulationLimitsRecommendation('large', 'high'),
      analysis: analyzeCostBenefit(500, 15, 50)
    }
  ]
}

/**
 * חישוב עלויות בפועל מנתוני השימוש
 */
export function calculateActualCosts(callsData: any[], simulationsData: any[] = []) {
  let totalCost = 0
  let callsCost = 0
  let simulationsCost = 0

  // עלויות עיבוד שיחות
  for (const call of callsData) {
    const duration = call.duration_minutes || 0
    if (duration > 0) {
      const cost = calculateCallProcessingCost(duration, call.call_type)
      callsCost += cost.estimatedCost
    }
  }

  // עלויות סימולציות
  for (const simulation of simulationsData) {
    const duration = (simulation.duration_seconds || 0) / 60
    if (duration > 0) {
      const cost = calculateSimulationCost(duration, simulation.simulation_type)
      simulationsCost += cost.estimatedCost
    }
  }

  totalCost = callsCost + simulationsCost

  return {
    totalCost: Math.round(totalCost * 100) / 100,
    callsCost: Math.round(callsCost * 100) / 100,
    simulationsCost: Math.round(simulationsCost * 100) / 100,
    callsCount: callsData.length,
    simulationsCount: simulationsData.length
  }
}



