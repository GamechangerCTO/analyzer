'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX, Loader2, Clock, User, Bot, Play, Pause, RotateCcw, Download } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  audioUrl?: string
}

interface StepByStepSimulationProps {
  simulationId: string
  persona: {
    persona_name: string
    personality_type: string
    communication_style: string
    voice_characteristics?: {
      gender?: 'male' | 'female'
    }
  }
  onComplete?: (transcript: string, duration: number) => void
  onError?: (error: string) => void
}

export default function StepByStepSimulation({
  simulationId,
  persona,
  onComplete,
  onError
}: StepByStepSimulationProps) {
  // State
  const [isActive, setIsActive] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [currentTurn, setCurrentTurn] = useState(0)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState('')
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  
  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  // Timer
  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isActive])
  
  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  
  // Start simulation
  const startSimulation = async () => {
    try {
      setIsActive(true)
      setDuration(0)
      setMessages([])
      setError(null)
      setStatusMessage('מתחיל סימולציה...')
      
      // Get AI's opening message
      const formData = new FormData()
      formData.append('simulationId', simulationId)
      formData.append('textInput', 'שלום') // Trigger opening
      
      const response = await fetch('/api/simulations/conversation-turn', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'שגיאה בהתחלת הסימולציה')
      }
      
      const data = await response.json()
      
      // Play AI response
      if (data.audioBase64 && !isMuted) {
        await playAudio(data.audioBase64)
      }
      
      // Add AI message
      setMessages([{
        role: 'assistant',
        content: data.aiResponse,
        timestamp: new Date().toISOString()
      }])
      
      setCurrentTurn(data.turnNumber || 1)
      setStatusMessage('מוכן להקלטה')
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'שגיאה לא ידועה'
      setError(errorMessage)
      onError?.(errorMessage)
      setIsActive(false)
    }
  }
  
  // Start recording
  const startRecording = async () => {
    try {
      setStatusMessage('מקליט...')
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
        } 
      })
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      audioChunksRef.current = []
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop())
        await processRecording()
      }
      
      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setIsRecording(true)
      
    } catch (err) {
      console.error('Error starting recording:', err)
      setError('לא ניתן לגשת למיקרופון')
    }
  }
  
  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }
  
  // Process recording and get AI response
  const processRecording = async () => {
    setIsProcessing(true)
    setStatusMessage('מעבד את ההקלטה...')
    
    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
      
      // Convert to File
      const audioFile = new File([audioBlob], 'recording.webm', { 
        type: 'audio/webm' 
      })
      
      const formData = new FormData()
      formData.append('audio', audioFile)
      formData.append('simulationId', simulationId)
      
      setStatusMessage('שולח לעיבוד...')
      
      const response = await fetch('/api/simulations/conversation-turn', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'שגיאה בעיבוד')
      }
      
      const data = await response.json()
      
      // Add user message
      setMessages(prev => [...prev, {
        role: 'user',
        content: data.userTranscript,
        timestamp: new Date().toISOString()
      }])
      
      setStatusMessage('מקבל תשובה...')
      
      // Play AI response
      if (data.audioBase64 && !isMuted) {
        await playAudio(data.audioBase64)
      }
      
      // Add AI message
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.aiResponse,
        timestamp: new Date().toISOString()
      }])
      
      setCurrentTurn(data.turnNumber || currentTurn + 1)
      setStatusMessage('מוכן להקלטה')
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'שגיאה בעיבוד'
      setError(errorMessage)
      setStatusMessage('שגיאה - נסה שוב')
    } finally {
      setIsProcessing(false)
    }
  }
  
  // Play audio from base64
  const playAudio = async (base64Audio: string) => {
    return new Promise<void>((resolve, reject) => {
      try {
        setStatusMessage('משמיע תשובה...')
        
        const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`)
        currentAudioRef.current = audio
        
        audio.onended = () => {
          currentAudioRef.current = null
          resolve()
        }
        
        audio.onerror = () => {
          currentAudioRef.current = null
          reject(new Error('שגיאה בהשמעת האודיו'))
        }
        
        audio.play()
      } catch (err) {
        reject(err)
      }
    })
  }
  
  // End simulation
  const endSimulation = async () => {
    setIsActive(false)
    setIsRecording(false)
    
    // Stop any playing audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current = null
    }
    
    // Build full transcript
    const transcript = messages
      .map(m => `${m.role === 'user' ? 'נציג' : 'לקוח'}: ${m.content}`)
      .join('\n\n')
    
    onComplete?.(transcript, duration)
  }
  
  // Toggle mute
  const toggleMute = () => {
    setIsMuted(!isMuted)
    if (currentAudioRef.current) {
      currentAudioRef.current.muted = !isMuted
    }
  }
  
  // Download transcript
  const downloadTranscript = () => {
    const transcript = messages
      .map(m => {
        const time = new Date(m.timestamp).toLocaleTimeString('he-IL')
        return `[${time}] ${m.role === 'user' ? 'נציג' : 'לקוח'}: ${m.content}`
      })
      .join('\n\n')
    
    const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `simulation-${simulationId}-transcript.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 rounded-2xl p-6 text-white min-h-[600px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-brand-primary to-brand-info rounded-full flex items-center justify-center">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg">{persona.persona_name}</h3>
            <p className="text-sm text-neutral-400">{persona.personality_type}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Timer */}
          <div className="flex items-center gap-2 bg-neutral-700/50 px-3 py-1.5 rounded-full">
            <Clock className="w-4 h-4 text-neutral-400" />
            <span className="font-mono">{formatDuration(duration)}</span>
          </div>
          
          {/* Turn counter */}
          <div className="bg-neutral-700/50 px-3 py-1.5 rounded-full">
            <span className="text-sm">תור {currentTurn}</span>
          </div>
        </div>
      </div>
      
      {/* Status */}
      {statusMessage && (
        <div className="mb-4 text-center text-sm text-neutral-400">
          {statusMessage}
        </div>
      )}
      
      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto mb-6 space-y-4 max-h-[350px] scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
        {messages.length === 0 && !isActive && (
          <div className="flex items-center justify-center h-full text-neutral-500">
            <p>לחץ על "התחל סימולציה" כדי להתחיל</p>
          </div>
        )}
        
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-4 rounded-2xl ${
                message.role === 'user'
                  ? 'bg-brand-primary text-white rounded-br-sm'
                  : 'bg-neutral-700 text-white rounded-bl-sm'
              }`}
            >
              <div className="flex items-center gap-2 mb-1 text-xs opacity-70">
                {message.role === 'user' ? (
                  <>
                    <User className="w-3 h-3" />
                    <span>אתה (הנציג)</span>
                  </>
                ) : (
                  <>
                    <Bot className="w-3 h-3" />
                    <span>הלקוח</span>
                  </>
                )}
              </div>
              <p className="leading-relaxed">{message.content}</p>
            </div>
          </div>
        ))}
        
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-neutral-700 p-4 rounded-2xl rounded-bl-sm">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">מעבד...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        {!isActive ? (
          // Start button
          <button
            onClick={startSimulation}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-full font-medium transition-all transform hover:scale-105"
          >
            <Phone className="w-5 h-5" />
            <span>התחל סימולציה</span>
          </button>
        ) : (
          <>
            {/* Mute button */}
            <button
              onClick={toggleMute}
              className={`p-3 rounded-full transition-all ${
                isMuted 
                  ? 'bg-yellow-500/20 text-yellow-400' 
                  : 'bg-neutral-700 hover:bg-neutral-600'
              }`}
              title={isMuted ? 'בטל השתקה' : 'השתק'}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            
            {/* Record button */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              className={`p-6 rounded-full transition-all transform ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse scale-110'
                  : isProcessing
                  ? 'bg-neutral-600 cursor-not-allowed'
                  : 'bg-brand-primary hover:bg-brand-primary hover:scale-105'
              }`}
              title={isRecording ? 'עצור הקלטה' : 'התחל לדבר'}
            >
              {isProcessing ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : isRecording ? (
                <MicOff className="w-8 h-8" />
              ) : (
                <Mic className="w-8 h-8" />
              )}
            </button>
            
            {/* End button */}
            <button
              onClick={endSimulation}
              className="p-3 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
              title="סיים סימולציה"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
            
            {/* Download transcript */}
            {messages.length > 0 && (
              <button
                onClick={downloadTranscript}
                className="p-3 rounded-full bg-neutral-700 hover:bg-neutral-600 transition-all"
                title="הורד תמלול"
              >
                <Download className="w-5 h-5" />
              </button>
            )}
          </>
        )}
      </div>
      
      {/* Instructions */}
      {isActive && !isRecording && !isProcessing && (
        <p className="text-center text-sm text-neutral-400 mt-4">
          לחץ על כפתור המיקרופון כדי לדבר, ושחרר כשסיימת
        </p>
      )}
      
      {isRecording && (
        <p className="text-center text-sm text-red-400 mt-4 animate-pulse">
          🔴 מקליט... לחץ שוב לשליחה
        </p>
      )}
    </div>
  )
}







