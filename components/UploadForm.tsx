'use client'

import { useState, useRef, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { processCall } from '@/lib/processCall'
import { 
  Upload, 
  MessageCircle, 
  FileAudio, 
  UserCheck, 
  AlertCircle, 
  CheckCircle2,
  Loader2,
  ArrowRight,
  Phone,
  Users,
  ChevronDown,
  Target,
  Activity
} from 'lucide-react'
import { convertAudioToMp3, needsConversion } from '@/lib/audioConverter'

interface UploadFormProps {
  user: User
  userData: any
  callTypes: string[]
}

interface Agent {
  id: string
  full_name: string | null
}

export default function UploadForm({ user, userData, callTypes }: UploadFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [uploadStep, setUploadStep] = useState<'upload' | 'processing' | 'completed'>('upload')
  const [progress, setProgress] = useState(0)
  const [callType, setCallType] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [agentNotes, setAgentNotes] = useState('')
  const [analysisNotes, setAnalysisNotes] = useState('')
  
  const [file, setFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string>(user.id)
  const [dragActive, setDragActive] = useState(false)
  const [uploadedCallId, setUploadedCallId] = useState<string | null>(null)
  const [isCallTypeDropdownOpen, setIsCallTypeDropdownOpen] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [conversionStatus, setConversionStatus] = useState<string>('')
  const [currentStep, setCurrentStep] = useState<'file' | 'details' | 'submit'>('file')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const callTypeDropdownRef = useRef<HTMLDivElement>(null)

  // Load agents for managers
  useEffect(() => {
    const loadAgents = async () => {
      if (userData?.role === 'manager' && userData?.companies?.id) {
        try {
          const { data: agentData, error } = await supabase
            .from('users')
            .select('id, full_name, company_id')
            .eq('company_id', userData.companies.id)
            .in('role', ['agent', 'manager'])
            .order('full_name')

          if (!error) {
            setAgents(agentData || [])
          }
        } catch (err) {
          console.error('Unexpected error loading agents:', err)
        }
      }
    }

    loadAgents()
  }, [userData, supabase])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (callTypeDropdownRef.current && !callTypeDropdownRef.current.contains(event.target as Node)) {
        setIsCallTypeDropdownOpen(false)
      }
    }

    if (isCallTypeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isCallTypeDropdownOpen])

  const handleCallTypeSelect = (type: string) => {
    setCallType(type)
    setIsCallTypeDropdownOpen(false)
  }
  
  const validateAndSetFile = async (selectedFile: File) => {
    setError(null)
    
    const maxSizeMB = 100
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    
    if (selectedFile.size > maxSizeBytes) {
      setError(`גודל הקובץ (${(selectedFile.size / 1024 / 1024).toFixed(1)}MB) גדול מדי. המגבלה היא ${maxSizeMB}MB`)
      return
    }
    
    if (needsConversion(selectedFile.name)) {
      setIsConverting(true)
      setConversionStatus('ממיר קובץ אודיו...')
      
      try {
        const convertedFile = await convertAudioToMp3(selectedFile)
        setFile(convertedFile)
        setFileName(convertedFile.name)
        setCurrentStep('details')
      } catch (error) {
        console.error('Conversion error:', error)
        setError('שגיאה בהמרת הקובץ. אנא נסה קובץ אחר.')
      } finally {
        setIsConverting(false)
        setConversionStatus('')
      }
    } else {
      setFile(selectedFile)
      setFileName(selectedFile.name)
      setCurrentStep('details')
    }
  }
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      validateAndSetFile(selectedFile)
    }
  }
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragActive(true)
  }
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragActive(false)
  }
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragActive(false)
    
    if (e.dataTransfer.files) {
      validateAndSetFile(e.dataTransfer.files[0])
    }
  }
  
  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!file) {
      setError('אנא בחר קובץ להעלאה')
      return
    }
    
    if (!callType) {
      setError('אנא בחר סוג שיחה')
      return
    }

    if (!customerName.trim()) {
      setError('אנא הזן שם לקוח/חברה')
      return
    }
    
    // Check questionnaire completion
    if (userData?.companies?.id && userData?.role !== 'admin') {
      const freshSupabase = createClient()
      
      const { data: questionnaireData, error: checkError } = await freshSupabase
        .from('company_questionnaires')
        .select('is_complete')
        .eq('company_id', userData.companies.id)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        setError('שגיאה בבדיקת סטטוס השאלון')
        return
      }
      
      if (!questionnaireData?.is_complete) {
        setError('לא ניתן להעלות שיחה - שאלון החברה לא מולא במלואו.')
        return
      }
    }
    
    setError(null)
    setIsLoading(true)
    setUploadStep('processing')
    setProgress(0)
    
    try {
      const freshSupabase = createClient()
      
      const fileExt = file.name.split('.').pop()
      const filePath = `${selectedAgent}/${Date.now()}.${fileExt}`
      
      setProgress(20)
      
      const { error: uploadError } = await freshSupabase.storage
        .from('audio_files')
        .upload(filePath, file, { cacheControl: '3600', upsert: false })
      
      setProgress(60)
      
      if (uploadError) {
        throw new Error(`שגיאה בהעלאת הקובץ: ${uploadError.message}`)
      }
      
      // Calculate audio duration
      let audioDurationSeconds = null
      try {
        const { getAudioDuration } = await import('@/lib/audioConverter')
        audioDurationSeconds = Math.round(await getAudioDuration(file))
      } catch (durationError) {
        console.warn('Could not calculate audio duration:', durationError)
      }

      const callRecord = {
        user_id: selectedAgent,
        company_id: userData?.companies?.id || null,
        call_type: callType,
        customer_name: customerName.trim(),
        audio_file_path: filePath,
        audio_duration_seconds: audioDurationSeconds,
        duration_seconds: audioDurationSeconds,
        agent_notes: agentNotes || null,
        analysis_notes: analysisNotes || null,
        analysis_type: 'full',
        processing_status: 'pending'
      }
      
      const { data: callData, error: callError } = await freshSupabase
        .from('calls')
        .insert(callRecord)
        .select()
      
      if (callError) {
        throw new Error(`שגיאה ביצירת רשומת השיחה: ${callError.message}`)
      }
      
      const call = Array.isArray(callData) ? callData[0] : callData
      setUploadedCallId(call.id)
      
      setProgress(80)
      
      // Process call in background
      try {
        await processCall(call.id)
        setProgress(100)
        setUploadStep('completed')
        setSuccess('השיחה הועלתה בהצלחה!')
        
        setTimeout(() => {
          router.push(`/call/${call.id}`)
        }, 2000)
        
      } catch (processError) {
        console.error('Processing error:', processError)
        setProgress(100)
        setUploadStep('completed')
        setSuccess('השיחה הועלתה בהצלחה! הניתוח יתחיל בקרוב.')
        
        setTimeout(() => {
          router.push(`/call/${call.id}`)
        }, 3000)
      }
      
    } catch (error: any) {
      console.error('Upload error:', error)
      setError(error.message || 'שגיאה לא צפויה בהעלאה')
      setIsLoading(false)
      setUploadStep('upload')
      setProgress(0)
    }
  }

  const resetForm = () => {
    setFile(null)
    setFileName(null)
    setCallType('')
    setCustomerName('')
    setAgentNotes('')
    setAnalysisNotes('')
    setCurrentStep('file')
    setError(null)
    setSuccess(null)
  }
  
  return (
    <div className="space-y-6">

      {uploadStep === 'upload' && (
        <div className="space-y-6">
          
          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
              currentStep === 'file' ? 'bg-brand-primary text-white' : file ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'
            }`}>
              <FileAudio className="w-4 h-4" />
              <span>1. קובץ</span>
              {file && currentStep !== 'file' && <CheckCircle2 className="w-4 h-4" />}
            </div>
            
            <ArrowRight className={`w-4 h-4 ${file ? 'text-green-500' : 'text-neutral-300'}`} />
            
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
              currentStep === 'details' ? 'bg-brand-primary text-white' : (callType && customerName) ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'
            }`}>
              <MessageCircle className="w-4 h-4" />
              <span>2. פרטים</span>
            </div>
            
            <ArrowRight className={`w-4 h-4 ${(callType && customerName) ? 'text-green-500' : 'text-neutral-300'}`} />
            
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
              currentStep === 'submit' ? 'bg-brand-primary text-white' : 'bg-neutral-100 text-neutral-500'
            }`}>
              <Target className="w-4 h-4" />
              <span>3. ניתוח</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Step 1: File Selection */}
            {currentStep === 'file' && (
              <div className="space-y-4">
                
                {/* Info Card */}
                <div className="bg-brand-secondary/10 border border-brand-secondary/20 rounded-xl p-4">
                  <h3 className="font-medium text-neutral-900 mb-2">מה אפשר להעלות?</h3>
                  <ul className="text-neutral-600 text-sm space-y-1">
                    <li>• קבצי אודיו: MP3, WAV, M4A, AAC, FLAC, OGG</li>
                    <li>• קבצי וידאו: MP4, MOV, AVI, WebM (נחלץ האודיו)</li>
                    <li>• גודל מקסימלי: עד 100MB</li>
                  </ul>
                </div>

                {/* Upload Area */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={triggerFileInput}
                  className={`
                    relative cursor-pointer border-2 border-dashed rounded-xl p-8 text-center transition-colors
                    ${dragActive ? 'border-brand-primary bg-brand-primary/5' : file ? 'border-green-500 bg-green-50' : 'border-neutral-300 hover:border-brand-primary hover:bg-neutral-50'}
                  `}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                    accept=".mp3,.wav,.m4a,.aac,.flac,.ogg,.webm,.mp4,.mov,.avi"
                    className="hidden"
                  />
                  
                  {isConverting ? (
                    <div className="space-y-3">
                      <Loader2 className="w-12 h-12 text-brand-warning mx-auto animate-spin" />
                      <p className="text-neutral-600">{conversionStatus}</p>
                    </div>
                  ) : file ? (
                    <div className="space-y-3">
                      <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                      <div>
                        <p className="font-medium text-green-700">קובץ נבחר בהצלחה!</p>
                        <p className="text-neutral-600">{fileName}</p>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); resetForm(); }}
                          className="mt-2 text-sm text-neutral-500 hover:text-neutral-700 underline"
                        >
                          בחר קובץ אחר
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="w-16 h-16 bg-brand-primary rounded-xl flex items-center justify-center mx-auto">
                        <Upload className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <p className="text-lg font-medium text-neutral-900">גרור קובץ לכאן או לחץ לבחירה</p>
                        <p className="text-neutral-500">בחר את קובץ השיחה שברצונך לנתח</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Details */}
            {currentStep === 'details' && (
              <div className="space-y-4">
                
                {/* Selected File Summary */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <FileAudio className="w-6 h-6 text-green-600" />
                    <div className="flex-1">
                      <p className="font-medium text-green-800">קובץ נבחר:</p>
                      <p className="text-green-700 text-sm">{fileName}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentStep('file')}
                      className="text-green-600 hover:text-green-800 text-sm"
                    >
                      שנה
                    </button>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid md:grid-cols-2 gap-4">
                  
                  {/* Customer Name */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      <UserCheck className="w-4 h-4 inline ml-1" />
                      שם הלקוח/החברה <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="לדוגמה: חברת ABC, יוסי כהן..."
                      className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-colors"
                      required
                    />
                  </div>

                  {/* Call Type */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      <Phone className="w-4 h-4 inline ml-1" />
                      סוג השיחה <span className="text-red-500">*</span>
                    </label>
                    <div className="relative" ref={callTypeDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsCallTypeDropdownOpen(!isCallTypeDropdownOpen)}
                        className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-right flex items-center justify-between bg-white hover:border-neutral-300 transition-colors"
                      >
                        <span className={callType ? 'text-neutral-900' : 'text-neutral-400'}>
                          {callType || 'בחר סוג שיחה...'}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${isCallTypeDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {isCallTypeDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-neutral-200 shadow-lg z-50 py-1 max-h-60 overflow-y-auto">
                          {callTypes.map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => handleCallTypeSelect(type)}
                              className="w-full px-4 py-2 text-right hover:bg-neutral-50 text-neutral-700 transition-colors"
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Agent Selection (for managers) */}
                {agents.length > 1 && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      <Users className="w-4 h-4 inline ml-1" />
                      בחר נציג <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedAgent}
                      onChange={(e) => setSelectedAgent(e.target.value)}
                      className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none"
                      required
                    >
                      {agents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.full_name || 'נציג ללא שם'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Optional Notes */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      הערות נציג <span className="text-neutral-400">(אופציונלי)</span>
                    </label>
                    <textarea
                      value={agentNotes}
                      onChange={(e) => setAgentNotes(e.target.value)}
                      placeholder="הוסף הערות על השיחה..."
                      className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none resize-none"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      נושאים לניתוח <span className="text-neutral-400">(אופציונלי)</span>
                    </label>
                    <textarea
                      value={analysisNotes}
                      onChange={(e) => setAnalysisNotes(e.target.value)}
                      placeholder="ציין נושאים ספציפיים לבדיקה..."
                      className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none resize-none"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setCurrentStep('file')}
                    className="flex items-center gap-2 px-4 py-2 text-neutral-600 hover:text-neutral-900"
                  >
                    <ArrowRight className="w-4 h-4 rotate-180" />
                    חזור
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      if (!callType || !customerName.trim()) {
                        setError('אנא מלא את כל השדות הנדרשים')
                        return
                      }
                      setCurrentStep('submit')
                      setError(null)
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-brand-primary text-white font-medium rounded-xl hover:bg-brand-primary-dark transition-colors"
                  >
                    המשך לניתוח
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Confirm & Submit */}
            {currentStep === 'submit' && (
              <div className="space-y-4">
                
                {/* Summary */}
                <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-neutral-900 mb-4 text-center">
                    סיכום השיחה לניתוח
                  </h3>
                  
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <FileAudio className="w-4 h-4 text-brand-primary" />
                      <span className="text-neutral-600">קובץ:</span>
                      <span className="font-medium">{fileName}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-green-600" />
                      <span className="text-neutral-600">לקוח:</span>
                      <span className="font-medium">{customerName}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-brand-secondary" />
                      <span className="text-neutral-600">סוג:</span>
                      <span className="font-medium">{callType}</span>
                    </div>
                    
                    {agents.length > 1 && (
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-amber-500" />
                        <span className="text-neutral-600">נציג:</span>
                        <span className="font-medium">{agents.find(a => a.id === selectedAgent)?.full_name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Error/Success Messages */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <span className="text-red-700">{error}</span>
                  </div>
                )}

                {success && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-green-700">{success}</span>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setCurrentStep('details')}
                    className="flex items-center gap-2 px-4 py-2 text-neutral-600 hover:text-neutral-900"
                  >
                    <ArrowRight className="w-4 h-4 rotate-180" />
                    חזור לעריכה
                  </button>
                  
                  <button
                    type="submit"
                    disabled={isLoading || isConverting || !callType || !file}
                    className="flex items-center gap-3 px-8 py-4 bg-brand-secondary text-white font-semibold rounded-xl hover:bg-brand-secondary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        מעלה...
                      </>
                    ) : (
                      <>
                        <Activity className="w-5 h-5" />
                        התחל ניתוח עכשיו!
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      )}

      {/* Processing Screen */}
      {uploadStep === 'processing' && (
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Activity className="w-10 h-10 text-brand-primary animate-pulse" />
          </div>
          
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">
            מעבד את השיחה...
          </h2>
          <p className="text-neutral-600 mb-6">
            הניתוח יכול לקחת דקה או שתיים
          </p>
          
          <div className="w-full max-w-md mx-auto">
            <div className="w-full bg-neutral-200 rounded-full h-2">
              <div 
                className="bg-brand-primary h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-neutral-500 mt-2 text-sm">{progress}% הושלם</p>
          </div>
        </div>
      )}

      {/* Completed Screen */}
      {uploadStep === 'completed' && (
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-green-700 mb-2">
            הניתוח הושלם בהצלחה!
          </h2>
          <p className="text-neutral-600 mb-6">
            עוברים לדף התוצאות...
          </p>
          
          {uploadedCallId && (
            <button
              onClick={() => router.push(`/call/${uploadedCallId}`)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 transition-colors"
            >
              <Target className="w-5 h-5" />
              צפה בתוצאות
            </button>
          )}
        </div>
      )}
    </div>
  )
}
