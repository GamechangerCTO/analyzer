import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createClient()

    // קבלת כל החבילות
    const { data: plans, error: plansError } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('sort_order')

    if (plansError) {
      console.error('Plans error:', plansError)
      return NextResponse.json({ error: 'שגיאה בטעינת החבילות', details: plansError }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      plans: plans || [],
      total: plans?.length || 0
    })

  } catch (error) {
    console.error('Debug plans API error:', error)
    return NextResponse.json(
      { 
        error: 'שגיאה פנימית בשרת', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 