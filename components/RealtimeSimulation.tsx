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
  const dataChannelRef = useRef<RTCDataChannel | null>(null) // 🔴 ref לגישה מיידית
  const [sessionStarted, setSessionStarted] = useState(false)
  const [currentMessage, setCurrentMessage] = useState('')
  const [isPaused, setIsPaused] = useState(false) // 🔴 חדש: השהיה
  const [currentSpeaker, setCurrentSpeaker] = useState<'user' | 'ai' | null>(null) // 🔴 חדש: מי מדבר
  const [elapsedTime, setElapsedTime] = useState(0) // 🔴 חדש: טיימר בשניות
  const [isRecording, setIsRecording] = useState(false) // 🔴 הקלטה
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null) // 🔴 ההקלטה
  const [micActive, setMicActive] = useState(true) // מצב מיקרופון
  const [simulationMetrics, setSimulationMetrics] = useState({
    startTime: null as Date | null,
    responseTime: 0,
    interruptionsCount: 0,
    currentObjection: null as string | null
  })

  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const ephemeralKeyRef = useRef<string | null>(null)
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null) // 🔴 חדש: ref לטיימר
  const mediaRecorderRef = useRef<MediaRecorder | null>(null) // 🔴 להקלטה
  const audioChunksRef = useRef<Blob[]>([]) // 🔴 חלקי ההקלטה

  // 🔴 טיימר שמתעדכן כל שניה - מקסימום 10 דקות!
  const MAX_DURATION_SECONDS = 600 // 10 דקות
  
  useEffect(() => {
    if (status === 'active' && !isPaused) {
      timerIntervalRef.current = setInterval(() => {
        setElapsedTime(prev => {
          const newTime = prev + 1
          // סיום אוטומטי אחרי 10 דקות
          if (newTime >= MAX_DURATION_SECONDS) {
            console.log('⏰ הגיע למקסימום זמן - מסיים סימולציה')
            endSimulation()
            return prev
          }
          return newTime
        })
      }, 1000)
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }
  }, [status, isPaused])

  // 🔴 חדש: פורמט זמן MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // הגדרת פרסונת הלקוח ל-AI (קבלת הפרסונה מהפרמטר או מהסימולציה)
  const persona = customerPersona || simulation.customer_personas_hebrew?.[0]
  
  // קביעת קול בהתאם לפרסונה - קולות חדשים!
  const getVoiceForPersona = (): 'echo' | 'ash' | 'coral' | 'shimmer' => {
    const personaName = persona?.persona_name || ''
    console.log('🔊 בוחר קול לפרסונה:', personaName)
    
    // 1. בדיקה אם יש מגדר מוגדר בפרסונה (מה-AI)
    const gender = persona?.voice_characteristics?.gender || persona?.gender
    if (gender) {
      console.log('🔊 מגדר מה-AI:', gender)
      const isMale = gender === 'male' || gender === 'זכר' || gender === 'גבר'
      return isMale ? 'echo' : 'coral'
    }
    
    // 2. ניחוש לפי שם (fallback)
    const firstName = personaName.split(' ')[0].split('-')[0].trim()
    
    // שמות נפוצים
    const commonMale = ['רן', 'אלון', 'דוד', 'משה', 'אבי', 'רועי', 'גיל', 'טל', 'יוסי', 'עמית', 'אורי']
    const commonFemale = ['שירה', 'נועה', 'מיכל', 'יעל', 'דנה', 'תמר', 'הילה', 'עדי', 'רונית', 'גלית', 'אורית']
    
    if (commonMale.includes(firstName)) {
      console.log('🔊 שם גברי מוכר:', firstName)
      return 'echo'
    }
    if (commonFemale.includes(firstName)) {
      console.log('🔊 שם נשי מוכר:', firstName)
      return 'coral'
    }
    
    // לפי סיומת
    if (firstName.endsWith('ה') || firstName.endsWith('ית')) {
      console.log('🔊 סיומת נשית:', firstName)
      return 'coral'
    }
    
    // ברירת מחדל - coral (נשי)
    console.log('🔊 ברירת מחדל:', firstName)
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
        
        // שליפת נתוני השאלון של החברה
        const questionnaire = company?.company_questionnaires?.[0]
        
        // יצירת פרמטרים לפרומפט - כולל כל פרטי השאלון!
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
          industry: questionnaire?.sector,
          productService: questionnaire?.product_info,
          callType: callType as any,
          specificScenario: simulation.scenario_description,
          agentWeaknesses: agentWeaknesses,
          selectedTopics: selectedTopics,
          // ✅ כל פרטי השאלון לפרומפט מותאם!
          companyQuestionnaire: questionnaire ? {
            sector: questionnaire.sector,
            product_info: questionnaire.product_info,
            avg_product_cost: questionnaire.avg_product_cost,
            audience: questionnaire.audience,
            product_types: questionnaire.product_types,
            differentiators: questionnaire.differentiators,
            customer_benefits: questionnaire.customer_benefits,
            company_benefits: questionnaire.company_benefits
          } : undefined
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
    const personaName = persona?.persona_name || 'לקוח'
    const objections = persona?.common_objections?.join(', ') || 'יקר, צריך לחשוב, יש מתחרים'
    
    return `אני ${personaName}, לקוח שמתקשר לחברה.
המשתמש שמדבר איתי הוא נציג מכירות - הוא מנסה למכור לי.

מי אני:
- ${persona?.background_story || 'לקוח שמחפש פתרון'}
- ${persona?.current_situation || 'מעוניין לשמוע על המוצר'}

מה אני עושה:
- פותח: "שלום, אני ${personaName}, ראיתי את הפרסום שלכם..."
- שואל שאלות על המוצר והמחיר
- מעלה התנגדויות: ${objections}
- מהסס, לא מחליט מהר

איך אני מדבר:
- עברית טבעית עם "אממ", "נו", "תראה"
- שואל: "כמה זה עולה?", "מה אני מקבל?"

חשוב: אני הלקוח - הנציג הוא זה שמציע ומוכר!`
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
          instructions: aiInstructions || createFallbackInstructions(),
          voice: getVoiceForPersona()
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get ephemeral token')
      }

      const data = await response.json()
      // GA API מחזיר { value: "ek_..." } ישירות
      ephemeralKeyRef.current = data.value
      
      console.log('🔑 Ephemeral token:', data.value?.substring(0, 20) + '...')
      
      if (!ephemeralKeyRef.current) {
        console.error('❌ No ephemeral token in response:', data)
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
      dataChannelRef.current = dc // 🔴 שמירה ב-ref לגישה מיידית

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
      const model = "gpt-realtime-1.5"
      
      console.log('🔑 Ephemeral token:', ephemeralKeyRef.current?.substring(0, 20) + '...')
      console.log('📡 Sending SDP offer to:', baseUrl)
      
      const sdpResponse = await fetch(baseUrl, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKeyRef.current}`,
          "Content-Type": "application/sdp"
          // ללא OpenAI-Beta header ב-GA API
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
      
      // מעקב אחר מצב המיקרופון
      const audioTrack = mediaStream.getTracks()[0]
      if (audioTrack) {
        audioTrack.addEventListener('ended', () => {
          console.warn('⚠️ מיקרופון התנתק')
          setMicActive(false)
        })
        audioTrack.addEventListener('mute', () => setMicActive(false))
        audioTrack.addEventListener('unmute', () => setMicActive(true))
      }

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
          setCurrentSpeaker('ai') // 🔴 חדש: AI מדבר
        }
        break

                case 'response.audio_transcript.done':
        if (event.transcript) {
          setTranscript(prev => [...prev, `🤖 ${persona?.persona_name || 'לקוח'}: ${event.transcript}`])
          setCurrentMessage('')
          setCurrentSpeaker(null) // 🔴 חדש: AI סיים
        }
        break

      case 'input_audio_buffer.speech_started':
        console.log('🎤 הנציג התחיל לדבר')
        setCurrentSpeaker('user') // 🔴 חדש
        setSimulationMetrics(prev => ({
          ...prev,
          responseTime: Date.now()
        }))
        break

      case 'input_audio_buffer.speech_stopped':
        console.log('🔇 הנציג הפסיק לדבר')
        setCurrentSpeaker(null) // 🔴 חדש
        break

      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript) {
          setTranscript(prev => [...prev, `👤 אתה: ${event.transcript}`])
        }
        break

      case 'error':
        console.error('❌ שגיאה מהשרת:', event)
        console.error('❌ פרטי שגיאה:', JSON.stringify(event.error, null, 2))
        console.error('❌ event_id:', event.event_id)
        // לא להפסיק על שגיאות קלות
        if (event.error?.code === 'session_expired' || event.error?.code === 'invalid_session') {
          setStatus('error')
        }
        break

      default:
        // אירועים נוספים...
        break
    }
  }

  // התחלת הסימולציה
  const startSimulation = () => {
    const dc = dataChannelRef.current
    console.log('🚀 מתחיל סימולציה, dataChannel:', !!dc)
    if (!dc) {
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
    
    // התחלת הקלטה אוטומטית
    setTimeout(() => startRecording(), 500)

    // הגדרת session עם ההוראות - פרומפט קצר וברור בגוף ראשון
    const rolePrefix = `אני ${persona?.persona_name || 'לקוח'}, לקוח שמתקשר לחברה.
המשתמש שמדבר איתי הוא נציג מכירות שמנסה למכור לי.
אני שואל שאלות, מעלה התנגדויות, ומחכה שישכנעו אותי.

`
    const sessionUpdate = {
      type: "session.update",
      session: {
        type: "realtime",
        model: "gpt-realtime-1.5",
        modalities: ["text", "audio"],
        instructions: rolePrefix + (aiInstructions || createFallbackInstructions()),
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

    console.log('📤 שולח session.update:', JSON.stringify(sessionUpdate, null, 2))
    dc.send(JSON.stringify(sessionUpdate))

    // הלקוח (AI) מתחיל את השיחה - משפט פתיחה קצר וברור
    setTimeout(() => {
      const personaName = persona?.persona_name || 'מתקשר'
      const openingLine = persona?.opening_line || 
        `שלום, אני ${personaName}, ראיתי את הפרסום שלכם ורציתי לשמוע עוד...`
      
      const openingMessage = {
        type: "response.create",
        response: {
          modalities: ["audio"],
          instructions: `אני ${personaName}, לקוח שמתקשר לחברה.
אמור עכשיו: "${openingLine}"
אחרי זה, חכה שהנציג ידבר.`
        }
      }
      dc.send(JSON.stringify(openingMessage))
    }, 1000)
  }

  // 🔴 פונקציות הקלטה
  const startRecording = async () => {
    try {
      if (mediaStream) {
        const mediaRecorder = new MediaRecorder(mediaStream, { mimeType: 'audio/webm;codecs=opus' })
        audioChunksRef.current = []
        mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
        mediaRecorder.onstop = () => setAudioBlob(new Blob(audioChunksRef.current, { type: 'audio/webm' }))
        mediaRecorderRef.current = mediaRecorder
        mediaRecorder.start(1000)
        setIsRecording(true)
      }
    } catch (e) { console.error('Recording error:', e) }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop()
      setIsRecording(false)
    }
  }

  const downloadRecording = () => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `simulation_${simulation.id}.webm`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  // 🔴 חדש: השהיית סימולציה
  const togglePause = () => {
    setIsPaused(prev => !prev)
    // אם מושהה, נשתיק/נפעיל את האודיו
    if (audioElementRef.current) {
      if (!isPaused) {
        audioElementRef.current.pause()
      } else {
        audioElementRef.current.play()
      }
    }
  }

  // ביטול סימולציה — מנתק ומחזיר לרשימה ללא שמירת דוח
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  const cancelSimulation = () => {
    try {
      setStatus('ending')
      stopRecording()
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop())
      }
      if (peerConnection) {
        peerConnection.close()
      }
      router.push('/simulations')
    } catch (error) {
      console.error('❌ שגיאה בביטול סימולציה:', error)
      setStatus('error')
    }
  }

  // סיום סימולציה — שומר ושולח לניתוח
  const endSimulation = async () => {
    try {
      setStatus('ending')
      
      // עצירת הקלטה
      stopRecording()
      
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
          duration: elapsedTime,
          metrics: simulationMetrics,
          status: 'completed',
          generateReport: true
        })
      })

      if (response.ok) {
        const result = await response.json()
        setStatus('completed')

        if (result.reportId) {
          // דוח נוצר — ניווט ישיר
          setTimeout(() => {
            router.push(`/simulations/report/${result.reportId}`)
          }, 2000)
        } else {
          // דוח לא נוצר — ניסיון חיפוש לפי simulation ID
          console.warn('⚠️ דוח לא נוצר, מנסה לפי simulation ID')
          setTimeout(() => {
            router.push(`/simulations/report/${simulation.id}`)
          }, 3000)
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ שגיאה מהשרת:', errorData)
        throw new Error(errorData.error || 'Failed to complete simulation')
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
      {/* 🔴 כפתור סיום בולט - תמיד מוצג כשהסימולציה פעילה */}
      {(status === 'active' || status === 'ready') && (
        <div className="fixed top-4 left-4 right-4 z-50 flex justify-center">
          <button
            onClick={endSimulation}
            className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-2xl flex items-center gap-3 transition-all transform hover:scale-105"
          >
            <span className="text-2xl">🛑</span>
            סיום סימולציה ומעבר לניתוח
          </button>
        </div>
      )}

      {/* כותרת */}
      <div className="bg-white rounded-xl shadow-lg p-6 mt-16">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              🎯 סימולציה בזמן אמת
            </h1>
            <p className="text-gray-600">
              אימון עם {persona?.persona_name || 'לקוח ווירטואלי'} • 
              רמת קושי: {simulation.difficulty_level}
            </p>
            
            {/* 🔴 טיימר גדול עם זמן נותר */}
            {status === 'active' && (
              <div className="mt-3 flex items-center gap-4">
                <div className={`text-3xl font-mono font-bold px-4 py-2 rounded-lg ${
                  elapsedTime >= 540 ? 'text-red-600 bg-red-50 animate-pulse' :
                  elapsedTime >= 480 ? 'text-orange-600 bg-orange-50' :
                  elapsedTime >= 420 ? 'text-yellow-700 bg-yellow-50' :
                  'text-brand-primary bg-brand-info-light'
                }`}>
                  ⏱️ {formatTime(MAX_DURATION_SECONDS - elapsedTime)} נותרו
                </div>
                {elapsedTime >= 540 && (
                  <span className="text-red-600 font-bold animate-pulse">⚠️ פחות מדקה! סיים את השיחה</span>
                )}
                {elapsedTime >= 420 && elapsedTime < 540 && (
                  <span className="text-yellow-700 font-medium">⏳ {Math.ceil((MAX_DURATION_SECONDS - elapsedTime) / 60)} דקות נותרו</span>
                )}
                {isPaused && (
                  <span className="text-orange-600 font-bold animate-pulse">⏸️ מושהה</span>
                )}
                {!micActive && (
                  <span className="text-red-600 font-bold animate-pulse flex items-center gap-1">
                    🎤❌ המיקרופון מנותק!
                  </span>
                )}
                {isRecording && micActive && (
                  <span className="text-red-600 font-bold animate-pulse flex items-center gap-1">
                    <span className="w-2 h-2 bg-red-600 rounded-full" />
                    REC
                  </span>
                )}
              </div>
            )}
          </div>
          
          <div className="text-center">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              status === 'active' ? 'bg-green-100 text-green-800' :
              status === 'ready' ? 'bg-brand-info-light text-brand-primary-dark' :
              status === 'ending' ? 'bg-orange-100 text-orange-800' :
              status === 'error' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${
                status === 'active' ? 'bg-green-500 animate-pulse' :
                status === 'ready' ? 'bg-brand-primary' :
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
        <div className="bg-brand-info-light rounded-lg p-4">
          <h3 className="font-medium text-brand-primary-dark mb-2">פרופיל הלקוח:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">סוג אישיות:</span> {persona?.personality_type}
            </div>
            <div>
              <span className="font-medium">סגנון תקשורת:</span> {persona?.communication_style}
            </div>
          </div>
          <p className="text-brand-primary-dark text-sm mt-2">
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
              className="bg-brand-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-primary-dark transition-colors"
            >
              🎤 התחל סימולציה
            </button>
          )}

          {status === 'active' && (
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={togglePause}
                className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  isPaused
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-orange-500 hover:bg-orange-600 text-white'
                }`}
              >
                {isPaused ? '▶️ המשך' : '⏸️ השהה'}
              </button>

              <button
                onClick={() => setShowCancelConfirm(true)}
                className="bg-gray-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-600 transition-colors flex items-center gap-2"
              >
                ✕ ביטול
              </button>
              <button
                onClick={endSimulation}
                className="bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                🏁 סיים ועבור לניתוח
              </button>
            </div>
          )}

          {/* דיאלוג אישור ביטול */}
          {showCancelConfirm && (
            <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center">
              <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-2xl">
                <h3 className="text-lg font-bold text-gray-900 mb-2">לבטל את הסימולציה?</h3>
                <p className="text-gray-600 mb-4">הסימולציה לא תישמר ולא יופק דוח ניתוח.</p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    חזור לסימולציה
                  </button>
                  <button
                    onClick={cancelSimulation}
                    className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
                  >
                    כן, בטל
                  </button>
                </div>
              </div>
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
            <div className="animate-spin w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-gray-600">מתחבר ל-OpenAI Realtime API...</p>
          </div>
        )}
      </div>

      {/* תמלול בזמן אמת */}
      {(status === 'active' || status === 'completed') && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">
              💬 תמלול השיחה
            </h3>
            
            {/* 🔴 חדש: אינדיקטור מי מדבר */}
            {currentSpeaker && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full animate-pulse ${
                currentSpeaker === 'user' 
                  ? 'bg-brand-info-light text-brand-primary-dark'
                  : 'bg-green-100 text-green-800'
              }`}>
                <div className="w-3 h-3 rounded-full bg-current animate-ping" />
                {currentSpeaker === 'user' ? '🎤 אתה מדבר...' : `🤖 ${persona?.persona_name || 'הלקוח'} מדבר...`}
              </div>
            )}
          </div>
          
          <div className="h-64 overflow-y-auto border rounded-lg p-4 bg-gray-50 space-y-2">
            {transcript.map((message, index) => (
              <div key={index} className={`p-2 rounded ${
                message.startsWith('👤') ? 'bg-brand-info-light text-brand-primary-dark' : 'bg-green-100 text-green-900'
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
              <div className="text-2xl font-bold text-brand-primary font-mono">
                {formatTime(elapsedTime)}
              </div>
              <div className="text-sm text-gray-600">זמן שיחה</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {transcript.filter(t => t.startsWith('👤')).length}
              </div>
              <div className="text-sm text-gray-600">תגובות שלך</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-brand-info">
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
          <p className="text-green-700 mb-4">
            מעביר אותך לדוח המפורט...
          </p>
          {audioBlob && (
            <div className="space-y-3">
              <button
                onClick={downloadRecording}
                className="bg-brand-primary hover:bg-brand-primary-dark text-white px-6 py-3 rounded-lg font-medium"
              >
                🎧 הורד הקלטת השיחה
              </button>
              <audio controls className="w-full mt-2" src={URL.createObjectURL(audioBlob)} />
              <p className="text-xs text-gray-500">* הקלטה כוללת את הצד שלך בלבד</p>
            </div>
          )}
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
