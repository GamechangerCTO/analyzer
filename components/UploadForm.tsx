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
  Calendar, 
  AlertCircle, 
  Info, 
  CheckCircle2,
  Loader2,
  File,
  Clock,
  ArrowRight,
  Sparkles,
  Zap,
  Heart,
  Star,
  Mic,
  Play,
  Cloud,
  Shield,
  Phone,
  RefreshCw,
  HandHeart,
  CalendarCheck,
  Users,
  TrendingUp,
  Headphones,
  ChevronDown,
  X,
  Plus,
  FolderOpen,
  Copy,
  Target,
  Activity
} from 'lucide-react'
import { Database } from '@/types/database.types'
import { convertAudioToMp3, needsConversion, getSupportedFormats } from '@/lib/audioConverter'

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
  
  // Single file upload only
  const [file, setFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string>(user.id)
  const [dragActive, setDragActive] = useState(false)
  const [uploadCount, setUploadCount] = useState(0)
  const [uploadedCallId, setUploadedCallId] = useState<string | null>(null)
  const [isCallTypeDropdownOpen, setIsCallTypeDropdownOpen] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [conversionStatus, setConversionStatus] = useState<string>('')
  const [currentStep, setCurrentStep] = useState<'file' | 'details' | 'submit'>('file')
  
  // Animation states
  const [isHovering, setIsHovering] = useState(false)
  const [isFileAnimating, setIsFileAnimating] = useState(false)
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false)
  const [buttonClicked, setButtonClicked] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const callTypeDropdownRef = useRef<HTMLDivElement>(null)

  // Load agents for managers
  useEffect(() => {
    const loadAgents = async () => {
      if (userData?.role === 'manager' && userData?.companies?.id) {
        try {
                     const { data: agentData, error } = await supabase
             .from('users')
             .select(`
               id,
               full_name,
               company_id
             `)
            .eq('company_id', userData.companies.id)
            .in('role', ['agent', 'manager'])
            .order('full_name')

          if (error) {
            console.error('Error loading agents:', error)
          } else {
            setAgents(agentData || [])
          }
        } catch (err) {
          console.error('Unexpected error loading agents:', err)
        }
      }
    }

    loadAgents()
  }, [userData, supabase])

  // סגירת תפריט נופל בלחיצה מחוץ אליו או במקש ESC
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (callTypeDropdownRef.current && !callTypeDropdownRef.current.contains(event.target as Node)) {
        setIsCallTypeDropdownOpen(false)
      }
    }

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsCallTypeDropdownOpen(false)
      }
    }

    if (isCallTypeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscapeKey)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [isCallTypeDropdownOpen])

  const handleCallTypeSelect = (type: string) => {
    setCallType(type)
    setIsCallTypeDropdownOpen(false)
    // הוספת אפקט ויזואלי קצר להראות שהבחירה בוצעה
    setTimeout(() => {
      // אפשר להוסיף כאן אפקט חזותי נוסף אם רוצים
    }, 150)
  }
  
  const validateAndSetFile = async (selectedFile: File) => {
    setError(null);
    setIsFileAnimating(true);
    
    // Animation delay for smooth experience
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // בדיקת גודל קובץ (100MB)
    const maxSizeMB = 100;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    if (selectedFile.size > maxSizeBytes) {
      setError(`גודל הקובץ (${(selectedFile.size / 1024 / 1024).toFixed(1)}MB) גדול מדי. המגבלה היא ${maxSizeMB}MB`);
      setIsFileAnimating(false);
      return;
    }
    
         // בדיקה אם נדרשת המרה
     if (needsConversion(selectedFile.name)) {
      setIsConverting(true);
      setConversionStatus('ממיר קובץ אודיו...');
      
      try {
                 const convertedFile = await convertAudioToMp3(selectedFile);
        
        setFile(convertedFile);
        setFileName(convertedFile.name);
        setShowSuccessAnimation(true);
        setTimeout(() => {
          setCurrentStep('details');
          setIsFileAnimating(false);
          setShowSuccessAnimation(false);
        }, 800);
      } catch (error) {
        console.error('Conversion error:', error);
        setError('שגיאה בהמרת הקובץ. אנא נסה קובץ אחר או צור קשר לתמיכה.');
      } finally {
        setIsConverting(false);
        setConversionStatus('');
      }
    } else {
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setShowSuccessAnimation(true);
      setTimeout(() => {
        setCurrentStep('details');
        setIsFileAnimating(false);
        setShowSuccessAnimation(false);
      }, 800);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    
    if (e.dataTransfer.files) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };
  
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!file) {
      setError('אנא בחר קובץ להעלאה');
      return;
    }
    
    if (!callType) {
      setError('אנא בחר סוג שיחה');
      return;
    }

    if (!customerName.trim()) {
      setError('אנא הזן שם לקוח/חברה');
      return;
    }
    
    // בדיקה אם לחברה יש שאלון מלא - רק עבור נציגים ומנהלים (לא אדמינים)
    if (userData?.companies?.id && userData?.role !== 'admin') {
      const freshSupabase = createClient();
      
      const { data: questionnaireData, error: checkError } = await freshSupabase
        .from('company_questionnaires')
        .select('is_complete, completion_score')
        .eq('company_id', userData.companies.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        setError('שגיאה בבדיקת סטטוס השאלון');
        return;
      }
      
      const isComplete = questionnaireData?.is_complete || false;
      
      if (!isComplete) {
        setError('לא ניתן להעלות שיחה - שאלון החברה לא מולא במלואו. אנא השלם את השאלון בעמוד השאלון.');
        return;
      }
    }
    
    setError(null);
    setIsLoading(true);
    setUploadStep('processing');
    setProgress(0);
    
    try {
      const freshSupabase = createClient()
      
      const fileExt = file.name.split('.').pop()
      const filePath = `${selectedAgent}/${Date.now()}.${fileExt}`
      
      setProgress(20)
      
      const { data: uploadData, error: uploadError } = await freshSupabase.storage
        .from('audio_files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })
      
      setProgress(60)
      
      if (uploadError) {
        throw new Error(`שגיאה בהעלאת הקובץ: ${uploadError.message}`)
      }
      
      // חישוב משך האודיו
      let audioDurationSeconds = null;
      try {
        const { getAudioDuration } = await import('@/lib/audioConverter');
        audioDurationSeconds = Math.round(await getAudioDuration(file));
      } catch (durationError) {
        console.warn('לא הצלחתי לחשב משך אודיו:', durationError);
      }

      const callRecord = {
        user_id: selectedAgent,
        company_id: userData?.companies?.id || null,
        call_type: callType,
        customer_name: customerName.trim(),
        audio_file_path: filePath,
        audio_duration_seconds: audioDurationSeconds,
        duration_seconds: audioDurationSeconds, // Set duration_seconds to match audio_duration_seconds
        agent_notes: agentNotes || null,
        analysis_notes: analysisNotes || null,
        analysis_type: 'full',
        processing_status: 'pending'
      };
      
      let insertedCall = null;
      const { data: callData, error: callError } = await freshSupabase
        .from('calls')
        .insert(callRecord)
        .select();
      
      if (!callError) {
        insertedCall = callData;
      } else {
        const { data: funcData, error: funcError } = await freshSupabase
          .rpc('insert_call', {
            p_user_id: selectedAgent,
            p_call_type: callType,
            p_audio_file_path: filePath,
            p_company_id: userData?.companies?.id || null,
            p_agent_notes: agentNotes || undefined,
            p_analysis_notes: analysisNotes || undefined,
            p_analysis_type: 'full'
          });
        
        if (funcError) {
          throw new Error(`שגיאה ביצירת רשומת השיחה: ${funcError.message}`);
        }
        
        insertedCall = funcData;
      }
      
      if (!insertedCall || insertedCall.length === 0) {
        throw new Error('לא הצלחתי לקבל פרטי שיחה אחרי ההוספה');
      }
      
      const call = Array.isArray(insertedCall) ? insertedCall[0] : insertedCall;
      setUploadedCallId(call.id);
      
      setProgress(80);
      
      // עיבוד השיחה ברקע
      try {
        await processCall(call.id);
        setProgress(100);
        setUploadStep('completed');
        setSuccess('השיחה הועלתה בהצלחה ומתחיל הניתוח!');
        
        setTimeout(() => {
          router.push(`/call/${call.id}`);
        }, 2000);
        
      } catch (processError) {
        console.error('שגיאה בעיבוד השיחה:', processError);
        setProgress(100);
        setUploadStep('completed');
        setSuccess('השיחה הועלתה בהצלחה! הניתוח יתחיל בקרוב.');
        
        setTimeout(() => {
          router.push(`/call/${call.id}`);
        }, 3000);
      }
      
    } catch (error: any) {
      console.error('שגיאה בהעלאה:', error);
      setError(error.message || 'שגיאה לא צפויה בהעלאה');
      setIsLoading(false);
      setUploadStep('upload');
      setProgress(0);
    }
  };

  const resetForm = () => {
    setFile(null);
    setFileName(null);
    setCallType('');
    setCustomerName('');
    setAgentNotes('');
    setAnalysisNotes('');
    setCurrentStep('file');
    setError(null);
    setSuccess(null);
  };

  const isManager = userData?.role === 'manager';
  
  return (
    <div className="space-y-4">

        {uploadStep === 'upload' && (
          <div className="space-y-4">
            
            {/* אינדיקטור צעדים עם אנימציות מתקדמות - Responsive 2025 */}
            <div className="flex items-center justify-center mb-4 md:mb-6 px-4">
              <div className="flex items-center space-x-1 md:space-x-2 overflow-x-auto max-w-full">
                {/* צעד 1 - קובץ */}
                                  <div className={`relative flex items-center space-x-1 md:space-x-2 px-2 md:px-4 py-2 md:py-3 rounded-tl-xl rounded-br-xl transition-all duration-500 ease-out transform text-xs md:text-sm min-w-0 flex-shrink-0 ${
                    currentStep === 'file' 
                      ? 'bg-brand-primary text-white scale-105 shadow-lg animate-pulse' 
                      : file 
                        ? 'bg-brand-success text-white scale-100 shadow-md'
                        : 'bg-neutral-200 text-neutral-800 border border-neutral-300 hover:scale-105 hover:shadow-md'
                  }`}>
                    {/* Background glow effect */}
                    {currentStep === 'file' && (
                      <div className="absolute inset-0 bg-brand-primary rounded-tl-xl rounded-br-xl animate-pulse opacity-50 blur-sm"></div>
                    )}
                    
                    <FileAudio className={`w-4 h-4 md:w-5 md:h-5 relative z-10 transition-transform duration-300 flex-shrink-0 ${
                      currentStep === 'file' ? 'animate-bounce' : ''
                    }`} />
                    <span className="font-medium relative z-10 whitespace-nowrap">
                      <span className="hidden md:inline">1. בחר שיחה</span>
                      <span className="md:hidden">קובץ</span>
                    </span>
                    {file && currentStep !== 'file' && (
                      <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4 relative z-10 animate-spin flex-shrink-0" style={{animationDuration: '2s'}} />
                    )}
                  </div>
                
                <ArrowRight className={`w-4 h-4 md:w-5 md:h-5 transition-all duration-300 flex-shrink-0 ${
                  file ? 'text-brand-success animate-pulse' : 'text-neutral-400'
                }`} />
                
                {/* צעד 2 - פרטים */}
                <div className={`relative flex items-center space-x-1 md:space-x-2 px-2 md:px-4 py-2 md:py-3 rounded-tr-xl rounded-bl-xl transition-all duration-500 ease-out transform text-xs md:text-sm min-w-0 flex-shrink-0 ${
                  currentStep === 'details' 
                    ? 'bg-brand-primary text-white scale-105 shadow-lg animate-pulse' 
                    : (callType && customerName)
                      ? 'bg-brand-success text-white scale-100 shadow-md'
                      : file
                        ? 'bg-neutral-200 text-neutral-800 border border-neutral-300 hover:scale-105 hover:shadow-md cursor-pointer'
                        : 'bg-neutral-100 text-neutral-400 border border-neutral-200 opacity-50'
                }`}>
                  {/* Background glow effect */}
                  {currentStep === 'details' && (
                    <div className="absolute inset-0 bg-brand-primary rounded-tr-xl rounded-bl-xl animate-pulse opacity-50 blur-sm"></div>
                  )}
                  
                  <Info className={`w-4 h-4 md:w-5 md:h-5 relative z-10 transition-transform duration-300 flex-shrink-0 ${
                    currentStep === 'details' ? 'animate-bounce' : ''
                  }`} />
                  <span className="font-medium relative z-10 whitespace-nowrap">
                    <span className="hidden md:inline">2. פרטי השיחה</span>
                    <span className="md:hidden">פרטים</span>
                  </span>
                  {callType && customerName && (
                    <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4 relative z-10 animate-spin flex-shrink-0" style={{animationDuration: '2s'}} />
                  )}
                </div>
                
                <ArrowRight className={`w-4 h-4 md:w-5 md:h-5 transition-all duration-300 flex-shrink-0 ${
                  (callType && customerName) ? 'text-brand-success animate-pulse' : 'text-neutral-400'
                }`} />
                
                {/* צעד 3 - שליחה */}
                <div className={`relative flex items-center space-x-1 md:space-x-2 px-2 md:px-4 py-2 md:py-3 rounded-tl-xl rounded-br-xl transition-all duration-500 ease-out transform text-xs md:text-sm min-w-0 flex-shrink-0 ${
                  currentStep === 'submit' 
                    ? 'bg-brand-primary text-white scale-105 shadow-lg animate-pulse' 
                    : (callType && customerName)
                      ? 'bg-neutral-200 text-neutral-800 border border-neutral-300 hover:scale-105 hover:shadow-md cursor-pointer'
                      : 'bg-neutral-100 text-neutral-400 border border-neutral-200 opacity-50'
                }`}>
                  {/* Background glow effect */}
                  {currentStep === 'submit' && (
                    <div className="absolute inset-0 bg-brand-primary rounded-tl-xl rounded-br-xl animate-pulse opacity-50 blur-sm"></div>
                  )}
                  
                  <Zap className={`w-4 h-4 md:w-5 md:h-5 relative z-10 transition-transform duration-300 flex-shrink-0 ${
                    currentStep === 'submit' ? 'animate-bounce' : ''
                  }`} />
                  <span className="font-medium relative z-10 whitespace-nowrap">
                    <span className="hidden md:inline">3. התחל ניתוח</span>
                    <span className="md:hidden">ניתוח</span>
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* שלב 1: בחירת קובץ - Mobile Optimized */}
              {currentStep === 'file' && (
                <div className="space-y-3 md:space-y-4 animate-in slide-in-from-bottom duration-500 px-4 md:px-0">
                  
                  {/* כרטיס הדרכה - Mobile Optimized */}
                  <div className="bg-gradient-to-r from-brand-secondary/10 to-brand-primary/10 border border-brand-secondary/20 rounded-tl-2xl rounded-br-2xl p-4 md:p-6">
                    <div className="flex items-start space-x-3 md:space-x-4">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-brand-secondary rounded-tl-xl rounded-br-xl flex items-center justify-center flex-shrink-0">
                        <Headphones className="w-5 h-5 md:w-6 md:h-6 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base md:text-lg font-bold text-neutral-900 mb-2">
                          מה אפשר להעלות?
                        </h3>
                        <ul className="text-neutral-700 space-y-1 text-xs md:text-sm">
                          <li>• קבצי אודיו: MP3, WAV, M4A, AAC, FLAC, OGG</li>
                          <li>• קבצי וידאו: MP4, MOV, AVI, WebM (נחלץ האודיו)</li>
                          <li className="text-xs md:text-sm">• גודל מקסימלי: עד 100MB לקובץ</li>
                          <li className="hidden md:block">• איכות מומלצת: רזולוציה טובה ללא רעשי רקע</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* אזור העלאת קבצים מרכזי - Mobile Touch Optimized */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={triggerFileInput}
                    onMouseEnter={() => setIsHovering(true)}
                    onMouseLeave={() => setIsHovering(false)}
                    onTouchStart={() => setIsHovering(true)}
                    onTouchEnd={() => setIsHovering(false)}
                    className={`
                      relative cursor-pointer border-2 border-dashed rounded-tl-2xl rounded-br-2xl p-6 md:p-12 text-center transition-all duration-500 ease-out group overflow-hidden touch-action-manipulation
                      ${dragActive 
                        ? 'border-brand-secondary bg-brand-secondary/10 scale-105 shadow-2xl rotate-1 transform-gpu' 
                        : file
                          ? 'border-brand-success bg-brand-success/10 shadow-xl scale-102'
                          : isHovering 
                            ? 'border-brand-primary bg-gradient-to-br from-brand-primary/5 to-white shadow-xl scale-102 transform-gpu'
                            : 'border-neutral-300 bg-white hover:border-brand-primary hover:bg-brand-primary/5 shadow-lg active:scale-95'
                      }
                      ${isFileAnimating ? 'animate-pulse' : ''}
                      ${showSuccessAnimation ? 'animate-bounce' : ''}
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
                      <div className="space-y-4">
                        <div className="w-20 h-20 bg-brand-warning/10 rounded-tl-2xl rounded-br-2xl flex items-center justify-center mx-auto">
                          <Loader2 className="w-10 h-10 text-brand-warning animate-spin" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-neutral-900 mb-2">
                            ממיר קובץ...
                          </h3>
                          <p className="text-neutral-600">{conversionStatus}</p>
                        </div>
                      </div>
                    ) : file ? (
                      <div className="space-y-4">
                        <div className="w-20 h-20 bg-brand-success/10 rounded-tl-2xl rounded-br-2xl flex items-center justify-center mx-auto">
                          <CheckCircle2 className="w-10 h-10 text-brand-success" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-brand-success mb-2">
                            קובץ נבחר בהצלחה!
                          </h3>
                          <p className="text-neutral-700 text-lg font-medium">
                            {fileName}
                          </p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              resetForm();
                            }}
                            className="mt-3 text-neutral-500 hover:text-neutral-700 text-sm underline"
                          >
                            בחר קובץ אחר
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 md:space-y-4">
                        <div className={`relative w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-tl-2xl rounded-br-2xl flex items-center justify-center mx-auto transition-all duration-500 ease-out transform-gpu ${
                          dragActive ? 'scale-125 rotate-6 shadow-2xl' : 
                          isHovering ? 'scale-110 -rotate-3 shadow-xl' : 
                          showSuccessAnimation ? 'scale-125 rotate-12' : 
                          'group-hover:scale-110 shadow-lg'
                        }`}>
                          {showSuccessAnimation ? (
                            <CheckCircle2 className="w-8 h-8 md:w-10 md:h-10 text-white animate-spin" />
                          ) : (
                            <Upload className={`w-8 h-8 md:w-10 md:h-10 text-white transition-transform duration-300 ${
                              dragActive ? 'animate-bounce' : 
                              isHovering ? 'scale-110' : ''
                            }`} />
                          )}
                          
                          {/* Floating particles effect */}
                          {(dragActive || isHovering) && (
                            <>
                              <div className="absolute -top-2 -right-2 w-3 h-3 bg-brand-secondary rounded-full animate-ping opacity-75"></div>
                              <div className="absolute -bottom-2 -left-2 w-2 h-2 bg-brand-primary rounded-full animate-pulse opacity-75"></div>
                              <div className="absolute top-0 left-0 w-1 h-1 bg-white rounded-full animate-bounce opacity-75"></div>
                            </>
                          )}
                        </div>
                        
                        <div>
                          <h3 className="text-lg md:text-2xl font-bold text-neutral-900 mb-2">
                            <span className="hidden md:inline">גרור קובץ לכאן או לחץ לבחירה</span>
                            <span className="md:hidden">לחץ לבחירת קובץ</span>
                          </h3>
                          <p className="text-neutral-600 text-sm md:text-lg">
                            <span className="hidden md:inline">בחר את קובץ השיחה שברצונך לנתח</span>
                            <span className="md:hidden">בחר קובץ שיחה לניתוח</span>
                          </p>
                        </div>

                        {/* סטטיסטיקות מהירות */}
                        <div className="flex items-center justify-center space-x-8 mt-6 pt-6 border-t border-neutral-200">
                          <div className="text-center">
                            <div className="w-10 h-10 bg-brand-primary/10 rounded-tl-xl rounded-br-xl flex items-center justify-center mx-auto mb-2 border border-brand-primary/20">
                              <Zap className="w-5 h-5 text-brand-primary" />
                            </div>
                            <div className="text-sm text-neutral-700 font-semibold">ניתוח מהיר</div>
                          </div>
                          <div className="text-center">
                            <div className="w-10 h-10 bg-brand-secondary/10 rounded-tr-xl rounded-bl-xl flex items-center justify-center mx-auto mb-2 border border-brand-secondary/20">
                              <Activity className="w-5 h-5 text-brand-secondary" />
                            </div>
                            <div className="text-sm text-neutral-700 font-semibold">דוח מפורט</div>
                          </div>
                          <div className="text-center">
                            <div className="w-10 h-10 bg-brand-success/10 rounded-tl-xl rounded-br-xl flex items-center justify-center mx-auto mb-2 border border-brand-success/20">
                              <Target className="w-5 h-5 text-brand-success" />
                            </div>
                            <div className="text-sm text-neutral-700 font-semibold">המלצות מעשיות</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* שלב 2: פרטי השיחה */}
              {currentStep === 'details' && (
                <div className="space-y-4 animate-in slide-in-from-bottom duration-500">
                  
                  {/* קובץ שנבחר - סיכום */}
                  <div className="bg-glacier-success-50 border border-glacier-success-200 rounded-2xl p-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-glacier-success-500 rounded-xl flex items-center justify-center">
                        <FileAudio className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-glacier-success-800">קובץ נבחר:</h4>
                        <p className="text-glacier-success-700">{fileName}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCurrentStep('file')}
                        className="mr-auto text-glacier-success-600 hover:text-glacier-success-800 text-sm underline"
                      >
                        שנה קובץ
                      </button>
                    </div>
                  </div>

                  {/* פרטי השיחה */}
                  <div className="grid md:grid-cols-2 gap-4">
                    
                    {/* שם לקוח */}
                    <div className="space-y-3">
                      <label className="block">
                        <span className="text-lg font-bold text-neutral-900 mb-2 flex items-center gap-2">
                          <UserCheck className="w-5 h-5 text-glacier-primary" />
                          שם הלקוח/החברה
                          <span className="text-red-500">*</span>
                        </span>
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="לדוגמה: חברת ABC, יוסי כהן..."
                          className="w-full p-4 border-2 border-neutral-200 rounded-xl focus:border-glacier-primary focus:outline-none transition-all duration-300 ease-out text-neutral-900 bg-white hover:border-glacier-primary-light hover:shadow-lg hover:scale-[1.02] focus:scale-[1.02] focus:shadow-xl transform-gpu"
                          required
                        />
                      </label>
                    </div>

                    {/* סוג שיחה */}
                    <div className="space-y-3">
                      <label className="block">
                        <span className="text-lg font-bold text-glacier-neutral-900 mb-2 flex items-center gap-2">
                          <Phone className="w-5 h-5 text-glacier-accent-500" />
                          סוג השיחה
                          <span className="text-glacier-danger-500">*</span>
                        </span>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setIsCallTypeDropdownOpen(!isCallTypeDropdownOpen)}
                            className="relative w-full p-4 border-2 border-neutral-200 rounded-xl focus:border-glacier-primary focus:outline-none transition-all duration-300 ease-out text-right flex items-center justify-between bg-white hover:border-glacier-primary-light hover:shadow-lg hover:scale-[1.02] focus:scale-[1.02] focus:shadow-xl transform-gpu overflow-hidden group"
                          >
                            {/* Shimmer effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-glacier-primary-light/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
                            
                            <span className={`relative z-10 transition-all duration-300 ${
                              callType ? 'text-neutral-900 font-medium' : 'text-neutral-500'
                            }`}>
                              {callType || 'בחר סוג שיחה...'}
                            </span>
                            <ChevronDown className={`w-5 h-5 text-neutral-400 transition-all duration-300 ease-out relative z-10 ${
                              isCallTypeDropdownOpen ? 'rotate-180 scale-110 text-glacier-primary' : 'group-hover:scale-110'
                            }`} />
                          </button>
                          
                          {isCallTypeDropdownOpen && (
                            <div 
                              ref={callTypeDropdownRef}
                              className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border-2 border-neutral-200 shadow-2xl z-50 py-2 animate-in slide-in-from-top-2 duration-300 backdrop-blur-sm"
                            >
                              <div className="absolute inset-0 bg-gradient-to-br from-glacier-primary-light/5 to-glacier-accent-light/5 rounded-xl"></div>
                              {callTypes.map((type, index) => (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() => handleCallTypeSelect(type)}
                                  className="relative w-full px-4 py-3 text-right hover:bg-gradient-to-r hover:from-glacier-primary-50 hover:to-glacier-accent-50 transition-all duration-200 text-neutral-900 font-medium hover:text-glacier-primary group overflow-hidden transform hover:scale-[1.02] hover:shadow-md"
                                  style={{animationDelay: `${index * 50}ms`}}
                                >
                                  <div className="absolute inset-0 bg-gradient-to-r from-glacier-primary to-glacier-accent opacity-0 group-hover:opacity-10 transition-opacity duration-200"></div>
                                  <span className="relative z-10">{type}</span>
                                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-glacier-primary scale-y-0 group-hover:scale-y-100 transition-transform duration-200 origin-top"></div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* בחירת נציג (למנהלים) */}
                  {agents.length > 1 && (
                    <div className="space-y-3">
                      <label className="block">
                        <span className="text-lg font-bold text-glacier-neutral-900 mb-2 flex items-center gap-2">
                          <Users className="w-5 h-5 text-glacier-secondary-500" />
                          בחר נציג
                          <span className="text-glacier-danger-500">*</span>
                        </span>
                        <select
                          value={selectedAgent}
                          onChange={(e) => setSelectedAgent(e.target.value)}
                          className="w-full p-4 border-2 border-neutral-200 rounded-xl focus:border-glacier-primary focus:outline-none transition-all duration-200 text-neutral-900 bg-white hover:border-neutral-300"
                          required
                        >
                          {agents.map((agent) => (
                            <option key={agent.id} value={agent.id}>
                              {agent.full_name || 'נציג ללא שם'}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  )}

                  {/* הערות אופציונליות */}
                  <div className="grid md:grid-cols-2 gap-4">
                    
                    {/* הערות נציג */}
                    <div className="space-y-3">
                      <label className="block">
                        <span className="text-lg font-bold text-glacier-neutral-900 mb-2 flex items-center gap-2">
                          <MessageCircle className="w-5 h-5 text-glacier-neutral-500" />
                          הערות נציג
                          <span className="text-sm font-normal text-glacier-neutral-500">(אופציונלי)</span>
                        </span>
                        <textarea
                          value={agentNotes}
                          onChange={(e) => setAgentNotes(e.target.value)}
                          placeholder="הוסף הערות על השיחה, תחושות, אתגרים שעלו..."
                          className="w-full p-4 border-2 border-glacier-neutral-200 rounded-xl focus:border-glacier-primary-500 focus:outline-none transition-all duration-200 text-glacier-neutral-900 resize-none bg-white hover:border-glacier-neutral-300"
                          rows={4}
                        />
                      </label>
                    </div>

                    {/* נושאים לניתוח */}
                    <div className="space-y-3">
                      <label className="block">
                        <span className="text-lg font-bold text-glacier-neutral-900 mb-2 flex items-center gap-2">
                          <Target className="w-5 h-5 text-glacier-neutral-500" />
                          נושאים לניתוח
                          <span className="text-sm font-normal text-glacier-neutral-500">(אופציונלי)</span>
                        </span>
                        <textarea
                          value={analysisNotes}
                          onChange={(e) => setAnalysisNotes(e.target.value)}
                          placeholder="ציין נושאים ספציפיים לבדיקה: הקשבה, סגירת עסקה, התמודדות עם התנגדויות..."
                          className="w-full p-4 border-2 border-glacier-neutral-200 rounded-xl focus:border-glacier-primary-500 focus:outline-none transition-all duration-200 text-glacier-neutral-900 resize-none bg-white hover:border-glacier-neutral-300"
                          rows={4}
                        />
                      </label>
                    </div>
                  </div>

                  {/* כפתורי ניווט */}
                  <div className="flex items-center justify-between pt-6">
                    <button
                      type="button"
                      onClick={() => setCurrentStep('file')}
                      className="flex items-center gap-2 px-6 py-3 text-glacier-neutral-600 hover:text-glacier-neutral-800 font-medium transition-colors duration-200"
                    >
                      <ArrowRight className="w-5 h-5 rotate-180" />
                      חזור לבחירת קובץ
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        if (!callType || !customerName.trim()) {
                          setError('אנא מלא את כל השדות הנדרשים');
                          return;
                        }
                        setCurrentStep('submit');
                        setError(null);
                      }}
                      className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-glacier-primary to-glacier-accent text-neutral-900 font-bold rounded-xl hover:shadow-2xl transition-all duration-200 border-2 border-neutral-900/20"
                    >
                      המשך לניתוח
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* שלב 3: אישור סופי ושליחה */}
              {currentStep === 'submit' && (
                <div className="space-y-4 animate-in slide-in-from-bottom duration-500">
                  
                  {/* סיכום הפרטים */}
                  <div className="bg-gradient-to-br from-glacier-primary-50 to-glacier-accent-50 border-2 border-glacier-primary-200 rounded-2xl p-6">
                    <div className="flex items-center justify-center mb-6">
                      <div className="w-8 h-8 bg-glacier-primary-500 rounded-full flex items-center justify-center mr-3">
                        <Target className="w-4 h-4 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-glacier-neutral-900">
                        סיכום השיחה לניתוח
                      </h3>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <FileAudio className="w-5 h-5 text-glacier-primary-600" />
                          <div>
                            <div className="font-bold text-glacier-neutral-900">קובץ השיחה:</div>
                            <div className="text-glacier-neutral-700">{fileName}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <UserCheck className="w-5 h-5 text-glacier-success-600" />
                          <div>
                            <div className="font-bold text-glacier-neutral-900">לקוח/חברה:</div>
                            <div className="text-glacier-neutral-700">{customerName}</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <Phone className="w-5 h-5 text-glacier-accent-600" />
                          <div>
                            <div className="font-bold text-glacier-neutral-900">סוג שיחה:</div>
                            <div className="text-glacier-neutral-700">{callType}</div>
                          </div>
                        </div>
                        
                        {agents.length > 1 && (
                          <div className="flex items-center gap-3">
                            <Users className="w-5 h-5 text-glacier-secondary-600" />
                            <div>
                              <div className="font-bold text-glacier-neutral-900">נציג:</div>
                              <div className="text-glacier-neutral-700">
                                {agents.find(a => a.id === selectedAgent)?.full_name || 'נציג ללא שם'}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {(agentNotes || analysisNotes) && (
                      <div className="mt-6 pt-6 border-t border-glacier-primary-200">
                        {agentNotes && (
                          <div className="mb-4">
                            <div className="font-bold text-glacier-neutral-900 mb-2">הערות נציג:</div>
                            <div className="text-glacier-neutral-700 bg-white/50 p-3 rounded-lg">{agentNotes}</div>
                          </div>
                        )}
                        {analysisNotes && (
                          <div>
                            <div className="font-bold text-glacier-neutral-900 mb-2">נושאים לניתוח:</div>
                            <div className="text-glacier-neutral-700 bg-white/50 p-3 rounded-lg">{analysisNotes}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* הודעות שגיאה והצלחה */}
                  {error && (
                    <div className="bg-glacier-danger-50 border-2 border-glacier-danger-200 p-4 rounded-xl flex items-center space-x-3">
                      <AlertCircle className="w-5 h-5 text-glacier-danger-600 flex-shrink-0" />
                      <span className="text-glacier-danger-800 font-medium">{error}</span>
                    </div>
                  )}

                  {success && (
                    <div className="bg-glacier-success-50 border-2 border-glacier-success-200 p-4 rounded-xl flex items-center space-x-3">
                      <CheckCircle2 className="w-5 h-5 text-glacier-success-600 flex-shrink-0" />
                      <span className="text-glacier-success-800 font-medium">{success}</span>
                    </div>
                  )}

                  {/* כפתורי פעולה */}
                  <div className="flex items-center justify-between pt-6">
                    <button
                      type="button"
                      onClick={() => setCurrentStep('details')}
                      className="flex items-center gap-2 px-6 py-3 text-glacier-neutral-600 hover:text-glacier-neutral-800 font-medium transition-colors duration-200"
                    >
                      <ArrowRight className="w-5 h-5 rotate-180" />
                      חזור לעריכה
                    </button>
                    
                    <button
                      type="submit"
                      disabled={isLoading || isConverting || !callType || !file}
                      onClick={() => {
                        setButtonClicked(true);
                        setTimeout(() => setButtonClicked(false), 300);
                      }}
                      className="group relative overflow-hidden flex items-center gap-3 px-12 py-5 bg-gradient-to-r from-glacier-success via-glacier-primary to-glacier-accent text-neutral-900 font-bold text-xl rounded-2xl hover:from-glacier-success-dark hover:via-glacier-primary-dark hover:to-glacier-accent-dark transition-all duration-500 ease-out shadow-2xl hover:shadow-3xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transform hover:scale-105 border-2 border-neutral-900/20 hover:border-neutral-900/40 active:scale-95"
                    >
                        {/* Ripple effect */}
                        {buttonClicked && (
                          <div className="absolute inset-0 bg-white/30 rounded-2xl animate-ping"></div>
                        )}
                        
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>
                        
                        {isLoading ? (
                          <>
                            <div className="relative">
                              <Loader2 className="w-6 h-6 animate-spin" />
                              <div className="absolute inset-0 bg-gradient-to-r from-glacier-primary to-glacier-accent rounded-full animate-pulse opacity-50"></div>
                            </div>
                            <span className="animate-pulse">מעלה ומתחיל ניתוח...</span>
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-neutral-800 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-neutral-800 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                              <div className="w-2 h-2 bg-neutral-800 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                            </div>
                          </>
                        ) : (
                          <>
                            <Zap className={`w-6 h-6 transition-all duration-300 ${
                              buttonClicked ? 'scale-125 rotate-12' : 'group-hover:animate-bounce group-hover:scale-110'
                            }`} />
                            <span className="relative">
                              התחל ניתוח עכשיו!
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-neutral-800/20 to-transparent translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
                            </span>
                            <Sparkles className={`w-6 h-6 transition-all duration-300 ${
                              buttonClicked ? 'scale-125 -rotate-12' : 'group-hover:animate-pulse group-hover:scale-110'
                            }`} />
                          </>
                        )}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        )}

        {/* מסך עיבוד */}
        {uploadStep === 'processing' && (
          <div className="text-center space-y-4 py-8">
            <div className="w-32 h-32 bg-gradient-to-br from-glacier-primary-100 to-glacier-accent-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <div className="w-20 h-20 bg-gradient-to-br from-glacier-primary-500 to-glacier-accent-500 rounded-full flex items-center justify-center">
                <Activity className="w-10 h-10 text-white animate-bounce" />
              </div>
            </div>
            
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-glacier-neutral-900">
                מעבד את השיחה שלך...
              </h2>
              <p className="text-xl text-glacier-neutral-600">
                הניתוח המתקדם מתבצע כעת - זה יכול לקחת דקה או שתיים
              </p>
            </div>
            
            {/* בר התקדמות */}
            <div className="w-full max-w-md mx-auto">
              <div className="w-full bg-glacier-neutral-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-glacier-primary-500 to-glacier-accent-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-glacier-neutral-600 mt-2 font-medium">{progress}% הושלם</p>
            </div>
            
            <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto pt-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-glacier-primary-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Mic className="w-6 h-6 text-glacier-primary-600" />
                </div>
                <div className="text-sm text-glacier-neutral-700">מנתח אודיו</div>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-glacier-accent-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Target className="w-6 h-6 text-glacier-accent-600" />
                </div>
                <div className="text-sm text-glacier-neutral-700">בודק ביצועים</div>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-glacier-success-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-6 h-6 text-glacier-success-600" />
                </div>
                <div className="text-sm text-glacier-neutral-700">יוצר המלצות</div>
              </div>
            </div>
          </div>
        )}

        {/* מסך הושלם */}
        {uploadStep === 'completed' && (
          <div className="text-center space-y-4 py-8">
            <div className="w-32 h-32 bg-gradient-to-br from-glacier-success-100 to-glacier-primary-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-20 h-20 text-glacier-success-600" />
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 bg-glacier-success-500 rounded-full flex items-center justify-center mr-4">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-glacier-success-800">
                  הניתוח הושלם בהצלחה!
                </h2>
              </div>
              <p className="text-xl text-glacier-neutral-600">
                עוברים לדף התוצאות...
              </p>
            </div>
            
            {uploadedCallId && (
              <button
                onClick={() => router.push(`/call/${uploadedCallId}`)}
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-glacier-success-500 to-glacier-primary-500 text-white font-bold rounded-xl hover:from-glacier-success-600 hover:to-glacier-primary-600 transition-all duration-200 shadow-glacier-medium"
              >
                <TrendingUp className="w-5 h-5" />
                צפה בתוצאות
              </button>
                         )}
           </div>
         )}
     </div>
   )
 }