'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createCustomizedSimulationPrompt, getSimulationPromptFromDB, type SimulationPromptParams } from '@/lib/simulation-prompts-db'

interface RealtimeSimulationProps {
  simulation: any
  customerPersona?: any
  user: any
  company: any
}

type SimulationStatus = 'preparing' | 'connecting' | 'ready' | 'active' | 'ending' | 'completed' | 'error'

export default function RealtimeSimulation({ simulation, customerPersona, user, company }: RealtimeSimulationProps) {
  const router = useRouter()
  const [status, setStatus] = useState<SimulationStatus>('preparing')
  const [isAudioEnabled, setIsAudioEnabled] = useState(false)
  const [transcript, setTranscript] = useState<string[]>([])
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null)
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null)
  const [sessionStarted, setSessionStarted] = useState(false)
  const [currentMessage, setCurrentMessage] = useState('')
  const [simulationMetrics, setSimulationMetrics] = useState({
    startTime: null as Date | null,
    responseTime: 0,
    interruptionsCount: 0,
    currentObjection: null as string | null
  })

  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const ephemeralKeyRef = useRef<string | null>(null)

  // הגדרת פרסונת הלקוח ל-AI (קבלת הפרסונה מהפרמטר או מהסימולציה)
  const persona = customerPersona || simulation.customer_personas_hebrew?.[0]
  
  // קביעת קול בהתאם לפרסונה
  const getVoiceForPersona = () => {
    // בדיקה אם יש הגדרה ספציפית בפרסונה
    if (persona?.voice_characteristics?.gender) {
      if (persona.voice_characteristics.gender === 'male' || persona.voice_characteristics.gender === 'זכר') {
        return 'onyx' // קול גברי - יותר טבעי בעברית
      } else {
        return 'coral' // קול נשי - יותר טבעי בעברית
      }
    }
    
    // בדיקה לפי שם הפרסונה
    const personaName = persona?.persona_name || ''
    const maleNames = ['דני', 'אמיר', 'יוסי', 'דוד', 'מיכאל', 'רון', 'אבי', 'גיל', 'יונתן', 'איתמר', 'יעקב', 'משה', 'אברהם', 'יצחק', 'אהרון', 'שמואל', 'בנימין', 'אליעזר', 'יהושע', 'חיים']
    const femaleNames = ['דנה', 'מיכל', 'שרה', 'רותי', 'ליאת', 'נועה', 'תמר', 'ענת', 'רונית', 'יעל']
    
    if (maleNames.some(name => personaName.includes(name))) {
      return 'onyx' // קול גברי - יותר טבעי בעברית
    } else if (femaleNames.some(name => personaName.includes(name))) {
      return 'coral' // קול נשי - יותר טבעי בעברית
    }
    
    // ברירת מחדל - נקבה (כי רוב פרסונות הלקוחות נשים בניסיון שלי)
    return 'coral'
  }

  const [aiInstructions, setAiInstructions] = useState('')

  // טעינת פרומפט מהמסד הנתונים
  useEffect(() => {
    const loadPromptFromDB = async () => {
      if (!persona) return
      
      try {
        // קביעת סוג הסימולציה לפי הנתונים
        const callType = simulation.simulation_type || 'inbound'
        
        // חילוץ פרמטרים חלשים מהסימולציה (אם קיימים)
        const focusedParameters = simulation.focused_parameters || []
        const agentWeaknesses = focusedParameters.map((param: any) => ({
          name: param.hebrewName || param.name,
          score: param.score,
          category: param.category
        }))
        
        // ✅ חילוץ נושאים נבחרים מהסימולציה
        const selectedTopics = simulation.selected_topics || []
        
        // יצירת פרמטרים לפרומפט
        const promptParams: SimulationPromptParams = {
          personaName: persona.persona_name || 'לקוח',
          personalityType: persona.personality_type || 'ידידותי',
          communicationStyle: persona.communication_style || 'ישיר',
          backgroundStory: persona.background_story || 'לקוח פוטנציאלי',
          currentSituation: persona.current_situation || 'מעוניין למידע',
          commonObjections: persona.common_objections || ['המחיר נשמע יקר', 'אני צריך לחשוב'],
          targetsWeaknesses: persona.targets_weaknesses || [],
          difficultyLevel: simulation.difficulty_level || 'medium',
          companyName: company?.name,
          industry: company?.company_questionnaires?.[0]?.industry,
          productService: company?.company_questionnaires?.[0]?.product_service,
          callType: callType as any,
          specificScenario: simulation.scenario_description,
          agentWeaknesses: agentWeaknesses,
          selectedTopics: selectedTopics // ✅ הנושאים שנבחרו
        }
        
        // יצירת פרומפט מותאם מהמסד הנתונים
        const customPrompt = await createCustomizedSimulationPrompt(promptParams)
        setAiInstructions(customPrompt)
        
        console.log('✅ פרומפט סימולציה נטען מהמסד הנתונים', {
          weaknessesCount: agentWeaknesses.length,
          weaknesses: agentWeaknesses
        })
      } catch (error) {
        console.error('❌ שגיאה בטעינת פרומפט מהמסד, משתמש בפרומפט ברירת מחדל:', error)
        setAiInstructions(createFallbackInstructions())
      }
    }
    
    loadPromptFromDB()
  }, [persona, simulation, company])

  const createFallbackInstructions = () => {
    const isGenderMale = getVoiceForPersona() === 'onyx'
    const genderText = isGenderMale ? 'לקוח' : 'לקוחה'
    
    // חילוץ פרמטרים חלשים
    const focusedParameters = simulation.focused_parameters || []
    const weaknessSection = focusedParameters.length > 0 ? `

## 🎯 מיקוד מיוחד - תחומים לשיפור:
הנציג צריך לתרגל את התחומים הבאים שבהם הוא חלש:

${focusedParameters.map((p: any) => `- **${p.hebrewName || p.name}** (ציון נוכחי: ${p.score}/10)
  תאתגר אותו במיוחד בתחום הזה!`).join('\n')}

**אסטרטגיית האתגר:**
- אם הנציג לא מטפל טוב בהתנגדות - תן לו עוד התנגדות קשה יותר
- אם הנציג לא מבצע בירור - היה מעורפל ותמתין שהוא ישאל
- אם הנציג לא סוגר - תישאר מהסס גם אחרי הצעה טובה
- זכור: אתה כאן לאמן, לא לנצח! תן רמזים אם הנציג תקוע

🎯 המטרה: לראות שיפור ב-${focusedParameters.length} התחומים האלה!
` : ''
    
    return `🎯 **אתה ${persona?.persona_name || 'הלקוח'}** - ${genderText} במערכת אימון

## ⚠️ הבהרה קריטית - קרא בעיון!
- **אתה = הלקוח** שמתקשר או מקבל שיחה
- **המשתמש שמולך = איש המכירות/שירות** שמנסה למכור לך
- **אתה לא איש מכירות!** אל תשאל "איך אוכל לעזור לך"

## 🎭 תפקידך כלקוח:
- ${persona?.background_story || 'אתה לקוח שמחפש פתרון'}
- ${persona?.current_situation || 'מעוניין לשמוע על המוצר/שירות'}

## 📋 איך להתנהג כלקוח:
- פתח בהצגה עצמית: "שלום, אני ${persona?.persona_name || 'מתקשר'}, ראיתי את הפרסום שלכם..."
- שאל שאלות על המוצר/שירות
- העלה התנגדויות באופן טבעי
- היה קצת מהסס - אל תסכים מיד

## 🚫 מה לא לעשות:
- לא לשאול "איך אוכל לעזור לך" - זה משפט של נציג!
- לא להציע פתרונות - אתה הלקוח!
- לא לנהל את השיחה - תן לאיש המכירות להוביל

## התנגדויות שלך:
${persona?.common_objections?.map((obj: string) => `- ${obj}`).join('\n') || '- אני צריך לחשוב על זה\n- נשמע יקר\n- יש לי ספק אחר'}
${weaknessSection}

🗣️ דבר בעברית טבעית. זכור: אתה **הלקוח**! 🎯
`
  }

  // קבלת ephemeral token מהשרת
  const getEphemeralToken = async () => {
    try {
      setStatus('connecting')
      const response = await fetch('/api/simulations/ephemeral-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          simulationId: simulation.id,
          instructions: createAIInstructions(),
          voice: getVoiceForPersona()
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get ephemeral token')
      }

      const data = await response.json()
      ephemeralKeyRef.current = data.client_secret?.value
      
      if (!ephemeralKeyRef.current) {
        throw new Error('No ephemeral token received')
      }

      return ephemeralKeyRef.current
    } catch (error) {
      console.error('Error getting ephemeral token:', error)
      setStatus('error')
      throw error
    }
  }

  // הגדרת WebRTC connection
  const initializeWebRTC = async () => {
    try {
      if (!ephemeralKeyRef.current) {
        await getEphemeralToken()
      }

      // יצירת peer connection
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      })

      // הגדרת audio element לקבלת אודיו מה-AI
      if (!audioElementRef.current) {
        const audioEl = document.createElement('audio')
        audioEl.autoplay = true
        audioEl.setAttribute('playsinline', 'true')
        audioElementRef.current = audioEl
      }

      pc.ontrack = (event) => {
        if (audioElementRef.current) {
          audioElementRef.current.srcObject = event.streams[0]
        }
      }

      // קבלת microphone מהמשתמש
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        } 
      })
      
      setMediaStream(mediaStream)
      pc.addTrack(mediaStream.getTracks()[0])

      // יצירת data channel לעדכונים
      const dc = pc.createDataChannel('oai-events')
      setDataChannel(dc)

      dc.onopen = () => {
        console.log('🎯 Data channel נפתח - מוכן לתקשורת')
        setStatus('ready')
      }

      dc.onmessage = (event) => {
        try {
          const serverEvent = JSON.parse(event.data)
          handleServerEvent(serverEvent)
        } catch (error) {
          console.error('Error parsing server event:', error)
        }
      }

      // יצירת SDP offer
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // שליחה לOpenAI Realtime API
      const baseUrl = "https://api.openai.com/v1/realtime"
      const model = "gpt-realtime-mini-2025-10-06"
      
      console.log('🔑 Ephemeral token:', ephemeralKeyRef.current?.substring(0, 20) + '...')
      console.log('📡 Sending SDP offer to:', `${baseUrl}?model=${model}`)
      
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKeyRef.current}`,
          "Content-Type": "application/sdp",
          "OpenAI-Beta": "realtime=v1"
        },
      })

      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text()
        console.error('🔴 SDP request failed:', {
          status: sdpResponse.status,
          statusText: sdpResponse.statusText,
          error: errorText,
          headers: Object.fromEntries(sdpResponse.headers.entries())
        })
        throw new Error(`SDP request failed: ${sdpResponse.status} - ${errorText}`)
      }

      const answer = {
        type: "answer" as RTCSdpType,
        sdp: await sdpResponse.text(),
      }
      
      await pc.setRemoteDescription(answer)
      
      setPeerConnection(pc)
      console.log('✅ WebRTC connection הוקם בהצלחה')

    } catch (error) {
      console.error('❌ שגיאה בהקמת WebRTC:', error)
      setStatus('error')
      throw error
    }
  }

  // טיפול באירועי השרת
  const handleServerEvent = (event: any) => {
    console.log('📨 Server event:', event.type, event)

    switch (event.type) {
      case 'session.created':
        console.log('🎉 סשן נוצר בהצלחה')
        console.log('📊 dataChannel זמין:', !!dataChannel)
        console.log('📊 sessionStarted:', sessionStarted)
        startSimulation()
        break

      case 'response.audio_transcript.delta':
        if (event.delta) {
          setCurrentMessage(prev => prev + event.delta)
        }
        break

                case 'response.audio_transcript.done':
        if (event.transcript) {
          setTranscript(prev => [...prev, `🤖 ${persona?.persona_name || 'לקוח'}: ${event.transcript}`])
          setCurrentMessage('')
        }
        break

      case 'input_audio_buffer.speech_started':
        console.log('🎤 הנציג התחיל לדבר')
        setSimulationMetrics(prev => ({
          ...prev,
          responseTime: Date.now()
        }))
        break

      case 'input_audio_buffer.speech_stopped':
        console.log('🔇 הנציג הפסיק לדבר')
        break

      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript) {
          setTranscript(prev => [...prev, `👤 אתה: ${event.transcript}`])
        }
        break

      case 'error':
        console.error('❌ שגיאה מהשרת:', event)
        setStatus('error')
        break

      default:
        // אירועים נוספים...
        break
    }
  }

  // התחלת הסימולציה
  const startSimulation = () => {
    console.log('🚀 מתחיל סימולציה, dataChannel:', !!dataChannel)
    if (!dataChannel) {
      console.error('❌ אין dataChannel - לא יכול להתחיל סימולציה')
      return
    }

    console.log('✅ מעדכן סטטוס ל-active')
    setStatus('active')
    setSessionStarted(true)
    setSimulationMetrics(prev => ({
      ...prev,
      startTime: new Date()
    }))

    // הגדרת session עם ההוראות
    const sessionUpdate = {
      type: "session.update",
      session: {
        type: "realtime",
        model: "gpt-realtime-mini-2025-10-06",
        modalities: ["text", "audio"],
        instructions: createAIInstructions(),
        voice: getVoiceForPersona(),
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: {
          model: "gpt-4o-mini-transcribe"
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.6,
          prefix_padding_ms: 300,
          silence_duration_ms: 800
        }
      }
    }

    dataChannel.send(JSON.stringify(sessionUpdate))

    // הודעת פתיחה מהלקוח - הAI הוא הלקוח!
    setTimeout(() => {
      const openingMessage = {
        type: "response.create",
        response: {
          modalities: ["audio"],
          instructions: `⚠️ אתה הלקוח, לא איש המכירות!
פתח את השיחה כלקוח שמתקשר לחברה. אמור משהו כמו:
"שלום, שמי ${persona?.persona_name || 'דני'}, אני מתקשר כי ראיתי את הפרסום שלכם ורציתי לשמוע עוד..."
או: "היי, אני מחפש פתרון ל... מישהו המליץ לי עליכם"
🚫 אל תשאל "איך אוכל לעזור לך" - זה משפט של איש שירות, ואתה הלקוח!`
        }
      }
      dataChannel.send(JSON.stringify(openingMessage))
    }, 1000)
  }

  // סיום הסימולציה
  // עצירה מיידית ללא שמירה
  const stopSimulation = () => {
    try {
      setStatus('ending')
      
      // ניתוק החיבורים
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop())
      }
      if (peerConnection) {
        peerConnection.close()
      }
      
      // חזור לעמוד הסימולציות
      router.push('/simulations')
    } catch (error) {
      console.error('❌ שגיאה בעצירת סימולציה:', error)
      setStatus('error')
    }
  }

  // עצירה ושליחה לניתוח
  const endSimulation = async () => {
    try {
      setStatus('ending')
      
      // ניתוק החיבורים
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop())
      }
      if (peerConnection) {
        peerConnection.close()
      }

      // שמירת תוצאות הסימולציה עם בקשה לניתוח
      const response = await fetch('/api/simulations/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          simulationId: simulation.id,
          transcript: transcript.join('\n'),
          metrics: simulationMetrics,
          status: 'completed',
          generateReport: true // דגל לייצור דוח
        })
      })

      if (response.ok) {
        const result = await response.json()
        setStatus('completed')
        
        // מעבר לעמוד הדוח
        setTimeout(() => {
          if (result.reportId) {
            router.push(`/simulations/report/${result.reportId}`)
          } else {
            router.push(`/simulations/report/${simulation.id}`)
          }
        }, 2000)
      } else {
        throw new Error('Failed to complete simulation')
      }

    } catch (error) {
      console.error('❌ שגיאה בסיום וניתוח סימולציה:', error)
      setStatus('error')
    }
  }

  // פעולות ממשק
  const handleStartSimulation = async () => {
    try {
      setIsAudioEnabled(true)
      await initializeWebRTC()
    } catch (error) {
      setIsAudioEnabled(false)
      setStatus('error')
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* כותרת */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              🎯 סימולציה בזמן אמת
            </h1>
            <p className="text-gray-600">
              אימון עם {persona?.persona_name || 'לקוח ווירטואלי'} • 
              רמת קושי: {simulation.difficulty_level}
            </p>
          </div>
          
          <div className="text-center">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              status === 'active' ? 'bg-green-100 text-green-800' :
              status === 'ready' ? 'bg-blue-100 text-blue-800' :
              status === 'ending' ? 'bg-orange-100 text-orange-800' :
              status === 'error' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${
                status === 'active' ? 'bg-green-500 animate-pulse' :
                status === 'ready' ? 'bg-blue-500' :
                status === 'ending' ? 'bg-orange-500 animate-pulse' :
                status === 'error' ? 'bg-red-500' :
                'bg-gray-500'
              }`} />
              {status === 'preparing' && 'מכין...'}
              {status === 'connecting' && 'מתחבר...'}
              {status === 'ready' && 'מוכן להתחיל'}
              {status === 'active' && 'שיחה פעילה'}
              {status === 'ending' && 'מסיים...'}
              {status === 'completed' && 'הושלם'}
              {status === 'error' && 'שגיאה'}
            </div>
          </div>
        </div>

        {/* פרטי הלקוח */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">פרופיל הלקוח:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">סוג אישיות:</span> {persona?.personality_type}
            </div>
            <div>
              <span className="font-medium">סגנון תקשורת:</span> {persona?.communication_style}
            </div>
          </div>
          <p className="text-blue-700 text-sm mt-2">
            {persona?.current_situation}
          </p>
        </div>
      </div>

      {/* בקרות */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-center space-x-4">
          {!isAudioEnabled && status === 'preparing' && (
            <button
              onClick={handleStartSimulation}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              🎤 התחל סימולציה
            </button>
          )}

          {status === 'active' && (
            <div className="flex space-x-3">
              <button
                onClick={stopSimulation}
                className="bg-gray-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors flex items-center"
              >
                ⏹️ עצור סימולציה
              </button>
              <button
                onClick={endSimulation}
                className="bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center"
              >
                🏁 עצור ושלח לניתוח
              </button>
            </div>
          )}

          {status === 'error' && (
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors"
            >
              🔄 נסה שוב
            </button>
          )}
        </div>

        {status === 'connecting' && (
          <div className="text-center mt-4">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-gray-600">מתחבר ל-OpenAI Realtime API...</p>
          </div>
        )}
      </div>

      {/* תמלול בזמן אמת */}
      {(status === 'active' || status === 'completed') && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            💬 תמלול השיחה
          </h3>
          
          <div className="h-64 overflow-y-auto border rounded-lg p-4 bg-gray-50 space-y-2">
            {transcript.map((message, index) => (
              <div key={index} className={`p-2 rounded ${
                message.startsWith('👤') ? 'bg-blue-100 text-blue-900' : 'bg-green-100 text-green-900'
              }`}>
                {message}
              </div>
            ))}
            
            {currentMessage && (
              <div className="p-2 rounded bg-green-100 text-green-900 opacity-70">
                🤖 {persona?.persona_name || 'לקוח'}: {currentMessage}...
              </div>
            )}
            
            {transcript.length === 0 && status === 'active' && (
              <div className="text-center text-gray-500 py-8">
                <p>מתחיל שיחה...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* מטריקות בזמן אמת */}
      {status === 'active' && simulationMetrics.startTime && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            📊 מדדי ביצועים
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Math.floor((Date.now() - simulationMetrics.startTime.getTime()) / 1000 / 60)}
              </div>
              <div className="text-sm text-gray-600">דקות</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {transcript.filter(t => t.startsWith('👤')).length}
              </div>
              <div className="text-sm text-gray-600">תגובות שלך</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {transcript.filter(t => t.startsWith('🤖')).length}
              </div>
              <div className="text-sm text-gray-600">תגובות לקוח</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {simulationMetrics.interruptionsCount}
              </div>
              <div className="text-sm text-gray-600">הפרעות</div>
            </div>
          </div>
        </div>
      )}

      {/* הודעות מצב */}
      {status === 'completed' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <div className="text-4xl mb-4">🎉</div>
          <h3 className="text-xl font-bold text-green-900 mb-2">
            סימולציה הושלמה בהצלחה!
          </h3>
          <p className="text-green-700">
            מעביר אותך לדוח המפורט...
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <div className="text-4xl mb-4">❌</div>
          <h3 className="text-xl font-bold text-red-900 mb-2">
            שגיאה בסימולציה
          </h3>
          <p className="text-red-700">
            אנא נסה שוב או צור קשר עם התמיכה
          </p>
        </div>
      )}
    </div>
  )
}
