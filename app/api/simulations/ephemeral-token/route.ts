import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // בדיקת אימות
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { simulationId, instructions, voice } = await request.json()

    // ווידוא שהסימולציה שייכת למשתמש
    const { data: simulation } = await supabase
      .from('simulations')
      .select('*')
      .eq('id', simulationId)
      .eq('agent_id', session.user.id)
      .single()

    if (!simulation) {
      return NextResponse.json({ error: 'Simulation not found' }, { status: 404 })
    }

    // יצירת ephemeral token מ-OpenAI - ✅ מעודכן למודלים חדשים
    const sessionConfig = {
      model: "gpt-realtime-mini-2025-10-06",
      instructions: instructions || "You are a helpful customer for sales training in Hebrew.",
      voice: voice || "shimmer",
      input_audio_format: "pcm16",
      output_audio_format: "pcm16",
      input_audio_transcription: {
        model: "gpt-4o-mini-transcribe"
      },
      turn_detection: {
        type: "server_vad",
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 500
      }
    }

    console.log('🔑 יוצר ephemeral token עבור סימולציה:', simulationId)
    console.log('📝 Session config:', JSON.stringify(sessionConfig, null, 2))

    // Check if OpenAI API key exists
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY לא מוגדר')
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const response = await fetch(
      "https://api.openai.com/v1/realtime/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "realtime=v1"
        },
        body: JSON.stringify(sessionConfig),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ שגיאה ביצירת ephemeral token:', response.status, errorText)
      return NextResponse.json(
        { error: `Failed to create ephemeral token: ${response.status}` },
        { status: 500 }
      )
    }

    const data = await response.json()
    console.log('✅ Ephemeral token נוצר בהצלחה')

    // עדכון סטטוס הסימולציה
    await supabase
      .from('simulations')
      .update({ 
        status: 'active',
        started_at: new Date().toISOString()
      })
      .eq('id', simulationId)

    return NextResponse.json(data)

  } catch (error) {
    console.error('💥 שגיאה כללית ביצירת ephemeral token:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
