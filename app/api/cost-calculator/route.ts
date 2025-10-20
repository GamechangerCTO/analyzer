import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 
  calculateCallProcessingCost, 
  calculateSimulationCost, 
  getSimulationLimitsRecommendation,
  analyzeCostBenefit,
  calculateActualCosts,
  getExampleScenarios
} from '@/lib/cost-model'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'examples':
        return NextResponse.json({
          success: true,
          examples: getExampleScenarios()
        })

      case 'actual-costs':
        return await getActualCosts()

      case 'recommendations':
        const companySize = searchParams.get('companySize') as 'small' | 'medium' | 'large' || 'medium'
        const budget = searchParams.get('budget') as 'low' | 'medium' | 'high' || 'medium'
        const teamSize = parseInt(searchParams.get('teamSize') || '10')

        const limits = getSimulationLimitsRecommendation(companySize, budget)
        const analysis = analyzeCostBenefit(limits.maxSimulationsPerMonth, limits.maxDurationMinutes, teamSize)

        return NextResponse.json({
          success: true,
          recommendations: {
            limits,
            analysis,
            costPerAgent: Math.round(analysis.monthlyCost / teamSize * 100) / 100
          }
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action parameter'
        }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Cost calculator error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to calculate costs',
      details: error.message
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...params } = body

    switch (action) {
      case 'calculate-call-cost':
        const { durationMinutes, callType } = params
        const callCost = calculateCallProcessingCost(durationMinutes, callType)
        return NextResponse.json({
          success: true,
          cost: callCost
        })

      case 'calculate-simulation-cost':
        const { simulationDuration, simulationType } = params
        const simulationCost = calculateSimulationCost(simulationDuration, simulationType)
        return NextResponse.json({
          success: true,
          cost: simulationCost
        })

      case 'bulk-analysis':
        const { scenarios } = params
        const results = scenarios.map((scenario: any) => ({
          scenario: scenario.name,
          callCost: calculateCallProcessingCost(scenario.callDuration, scenario.callType),
          simulationCost: calculateSimulationCost(scenario.simulationDuration, scenario.simulationType),
          limits: getSimulationLimitsRecommendation(scenario.companySize, scenario.budget)
        }))

        return NextResponse.json({
          success: true,
          results
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action parameter'
        }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Cost calculation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to process cost calculation',
      details: error.message
    }, { status: 500 })
  }
}

async function getActualCosts() {
  try {
    const supabase = createClient()

    // קבלת נתוני שיחות
    const { data: callsData, error: callsError } = await supabase
      .from('calls')
      .select('call_type, duration_minutes, created_at')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // 30 days
      .gt('duration_minutes', 0)

    if (callsError) {
      throw new Error(`Failed to fetch calls data: ${callsError.message}`)
    }

    // קבלת נתוני סימולציות
    const { data: simulationsData, error: simulationsError } = await supabase
      .from('simulations')
      .select('simulation_type, duration_seconds, created_at, status')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // 30 days
      .gt('duration_seconds', 0)

    if (simulationsError) {
      throw new Error(`Failed to fetch simulations data: ${simulationsError.message}`)
    }

    // חישוב עלויות בפועל
    const actualCosts = calculateActualCosts(callsData || [], simulationsData || [])

    // סטטיסטיקות נוספות
    const callsByType = (callsData || []).reduce((acc: any, call) => {
      acc[call.call_type] = (acc[call.call_type] || 0) + 1
      return acc
    }, {})

    const simulationsByType = (simulationsData || []).reduce((acc: any, sim) => {
      acc[sim.simulation_type] = (acc[sim.simulation_type] || 0) + 1
      return acc
    }, {})

    return NextResponse.json({
      success: true,
      actualCosts,
      statistics: {
        callsByType,
        simulationsByType,
        avgCallDuration: callsData?.length ? 
          callsData.reduce((sum, call) => sum + (call.duration_minutes || 0), 0) / callsData.length : 0,
        avgSimulationDuration: simulationsData?.length ?
          simulationsData.reduce((sum, sim) => sum + ((sim.duration_seconds || 0) / 60), 0) / simulationsData.length : 0
      },
      period: '30 days'
    })
  } catch (error: any) {
    console.error('Actual costs calculation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to calculate actual costs',
      details: error.message
    }, { status: 500 })
  }
}


