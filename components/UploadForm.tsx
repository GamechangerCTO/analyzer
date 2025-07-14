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
  Copy
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
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  useEffect(() => {
    const fetchAgents = async () => {
      const freshSupabase = createClient();
      
      if (userData?.role === 'manager') {
        if (userData?.companies?.id) {
          const { data, error } = await freshSupabase
            .from('users')
            .select('id, full_name')
            .eq('company_id', userData.companies.id)
            .order('full_name');
          
          if (error) {
            console.error('Error fetching agents:', error);
            return;
          }
          
          if (data) {
            setAgents(data);
          }
        }
      } else {
        setAgents([{
          id: user.id,
          full_name: userData?.full_name || user.email || 'נציג'
        }]);
      }
    };
    
    fetchAgents();
  }, [userData, user]);
  
  // Close dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (isCallTypeDropdownOpen) {
        const target = event.target as HTMLElement;
        if (!target.closest('[data-dropdown="call-type"]')) {
          setIsCallTypeDropdownOpen(false);
        }
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isCallTypeDropdownOpen && event.key === 'Escape') {
        setIsCallTypeDropdownOpen(false);
      }
    };

    if (isCallTypeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCallTypeDropdownOpen]);

  // Function to handle call type selection
  const handleCallTypeSelect = (optionValue: string) => {
    setCallType(optionValue);
    setIsCallTypeDropdownOpen(false);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadCount(count => count + 1);
    
    if (e.target.files) {
      validateAndSetFile(e.target.files[0]);
    }
  };
  
  const validateAndSetFile = async (selectedFile: File) => {
    setError(null);
    
    const supportedFormats = getSupportedFormats();
    const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
    
    if (!fileExtension || !supportedFormats.includes(fileExtension)) {
      setError(`סוג קובץ לא נתמך. אנא בחר קובץ מהסוגים: ${supportedFormats.join(', ')}`);
      return;
    }
    
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (selectedFile.size > maxSize) {
      setError('הקובץ גדול מדי. גודל מקסימלי: 100MB');
      return;
    }
    
    // Check if conversion is needed
    if (needsConversion(selectedFile.name)) {
      setIsConverting(true);
      setConversionStatus('ממיר קובץ לפורמט נתמך...');
      
      try {
        const mp3File = await convertAudioToMp3(selectedFile);
        setFile(mp3File);
        setFileName(mp3File.name);
        setConversionStatus('המרה הושלמה בהצלחה!');
        setTimeout(() => {
          setIsConverting(false);
          setConversionStatus('');
        }, 2000);
      } catch (error) {
        console.error('Conversion error:', error);
        setError('שגיאה בהמרת הקובץ. אנא נסה שוב.');
        setIsConverting(false);
        setConversionStatus('');
        return;
      }
    } else {
      setFile(selectedFile);
      setFileName(selectedFile.name);
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
      
      // בדיקה באמצעות הטבלה המיוחדת לשאלון
      const { data: questionnaireData, error: checkError } = await freshSupabase
        .from('company_questionnaires')
        .select('is_complete, completion_score')
        .eq('company_id', userData.companies.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
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
    setUploadStep('upload');
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
      
      // חישוב משך האודיו לפני השמירה
      let audioDurationSeconds = null;
      try {
        const { getAudioDuration } = await import('@/lib/audioConverter');
        audioDurationSeconds = Math.round(await getAudioDuration(file));
        console.log(`🕐 משך אודיו חושב: ${audioDurationSeconds} שניות`);
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
        try {
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
        } catch (funcExecError) {
          throw new Error(`שגיאה ביצירת רשומת השיחה: ${callError.message}`);
        }
      }
      
      if (!insertedCall || insertedCall.length === 0) {
        throw new Error('לא ניתן ליצור רשומת שיחה חדשה');
      }
      
      setProgress(80);
      const callId = insertedCall[0].id;
      setUploadedCallId(callId);
      setUploadStep('processing');
      
      try {
        processCall(callId).catch(processError => {
          console.error('Background processing error:', processError);
        });
        setProgress(100);
      } catch (processError) {
        console.error('Error starting background processing:', processError);
      }
      
      setUploadStep('completed');
      setSuccess('השיחה הועלתה בהצלחה! הניתוח מתבצע ברקע ותקבל התראה כשיושלם.')
      
      // מעבר אוטומטי לדף השיחה לאחר 2 שניות
      setTimeout(() => {
        if (callId) {
          router.push(`/dashboard/calls/${callId}`);
        }
      }, 2000);
      
    } catch (error: any) {
      console.error('Error:', error)
      setError(error.message || 'שגיאה לא ידועה בעת העלאת השיחה')
      setUploadStep('upload');
    } finally {
      setIsLoading(false)
    }
  }
  
  const clearSelectedFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    setFileName(null);
    setError(null);
    setUploadStep('upload');
  };

  const goToCallAnalysis = () => {
    if (uploadedCallId) {
      router.push(`/dashboard/calls/${uploadedCallId}`);
    }
  };

  const isManager = userData?.role === 'manager';
  
  return (
    <div className="space-y-8">
      {uploadStep === 'upload' && (
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* אזור העלאת קבצים */}
          <div className="space-y-6">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={triggerFileInput}
              className={`
                choacee-card-clay-raised cursor-pointer p-12 text-center transition-all duration-300
                ${dragActive 
                  ? 'shadow-clay-hover scale-105 border-2 border-clay-accent border-dashed' 
                  : file
                    ? 'shadow-clay-hover border-2 border-clay-success border-dashed'
                    : 'hover:shadow-clay-hover hover:-translate-y-1'
                }
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                accept=".mp3,.wav,.m4a,.aac,.flac,.ogg,.webm,.mp4,.mov,.avi"
                className="hidden"
              />
              
              <div className="space-y-4">
                {isConverting ? (
                  <div className="choacee-smooth-appear">
                    <Loader2 className="w-16 h-16 text-clay-warning mx-auto animate-spin" />
                    <p className="text-lg font-semibold text-neutral-800 mt-4">{conversionStatus}</p>
                  </div>
                ) : file ? (
                  <div className="text-clay-success">
                    <CheckCircle2 className="w-16 h-16 mx-auto choacee-smooth-appear" />
                    <p className="text-lg font-semibold text-neutral-800 mt-4">
                      נבחר: {fileName}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className={`w-20 h-20 mx-auto rounded-clay flex items-center justify-center choacee-card-clay-pressed ${
                      dragActive ? 'shadow-clay-hover' : ''
                    }`}>
                      <Upload className={`w-10 h-10 ${
                        dragActive ? 'text-clay-accent' : 'text-clay-primary'
                      }`} />
                    </div>
                    
                    <div>
                      <h3 className="choacee-text-body text-xl font-bold text-neutral-800 mb-2">
                        גרור שיחה או לחץ להעלאה
                      </h3>
                      <p className="text-neutral-500">
                        נתמך: MP3, WAV, M4A, AAC ועוד | עד 100MB לקובץ
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* שדה שם לקוח/חברה */}
            <div className="space-y-2">
              <label htmlFor="customerName" className="block text-sm font-medium text-gray-700">
                שם הלקוח/החברה <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="הזן שם הלקוח או החברה"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* בחירת סוג שיחה */}
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-semibold text-indigo-night mb-2 block">
                  סוג שיחה <span className="text-electric-coral">*</span>
                </span>
                <div className="relative" data-dropdown="call-type">
                  <button
                    type="button"
                    onClick={() => setIsCallTypeDropdownOpen(!isCallTypeDropdownOpen)}
                    className="w-full p-3 border-2 border-ice-gray rounded-lg focus:border-lemon-mint focus:outline-none transition-colors duration-200 text-right flex items-center justify-between bg-white hover:border-lemon-mint-dark"
                  >
                    <div className="flex items-center space-x-3">
                      {callType ? (
                        <span className="font-medium">{callType}</span>
                      ) : (
                        <span>בחר סוג שיחה...</span>
                      )}
                    </div>
                    <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${
                      isCallTypeDropdownOpen ? 'rotate-180' : ''
                    }`} />
                  </button>
                  
                  {isCallTypeDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-ice-gray shadow-xl z-50 py-2">
                      {callTypes.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleCallTypeSelect(type);
                          }}
                          className="w-full px-4 py-3 text-right hover:bg-lemon-mint/10 transition-colors duration-150 border-b border-ice-gray/50 last:border-b-0"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-indigo-night">{type}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* בחירת נציג (למנהלים במצב שיחה בודדת) */}
          {agents.length > 1 && (
            <div className="space-y-4">
              <label className="block">
                <span className="text-lg font-semibold text-indigo-night mb-3 block">
                  נציג <span className="text-electric-coral">*</span>
                </span>
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  className="w-full p-4 border-2 border-ice-gray rounded-xl focus:border-lemon-mint focus:outline-none transition-colors duration-200 text-indigo-night"
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

          {/* הודעה הסברית למנהלים במצב מרובה */}
          {agents.length > 1 && (
            <div className="bg-lemon-mint/10 border border-lemon-mint/30 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <Info className="w-5 h-5 text-lemon-mint-dark flex-shrink-0" />
                <p className="text-sm text-indigo-night">
                  <span className="font-semibold">במצב שיחות מרובות:</span> בחר נציג נפרד עבור כל שיחה בטבלה למעלה
                </p>
              </div>
            </div>
          )}

          {/* הערות נציג */}
          <div className="space-y-4">
            <label className="block">
              <span className="text-lg font-semibold text-indigo-night mb-3 block">
                הערות נציג <span className="text-indigo-night/60 text-sm font-normal">(אופציונלי)</span>
              </span>
              <textarea
                value={agentNotes}
                onChange={(e) => setAgentNotes(e.target.value)}
                placeholder="הוסף הערות על השיחה שיעזרו בניתוח..."
                className="w-full p-4 border-2 border-ice-gray rounded-xl focus:border-lemon-mint focus:outline-none transition-colors duration-200 text-indigo-night resize-none"
                rows={3}
              />
            </label>
          </div>

          {/* הערות ניתוח */}
          <div className="space-y-4">
            <label className="block">
              <span className="text-lg font-semibold text-indigo-night mb-3 block">
                נושאים לניתוח <span className="text-indigo-night/60 text-sm font-normal">(אופציונלי)</span>
              </span>
              <textarea
                value={analysisNotes}
                onChange={(e) => setAnalysisNotes(e.target.value)}
                placeholder="ציין נושאים ספציפיים לניתוח (לדוגמה: מיומנויות הקשבה, טכניקות סגירה...)"
                className="w-full p-4 border-2 border-ice-gray rounded-xl focus:border-lemon-mint focus:outline-none transition-colors duration-200 text-indigo-night resize-none"
                rows={3}
              />
            </label>
          </div>

          {/* הודעות שגיאה והצלחה */}
          {error && (
            <div className="red-flag-indicator p-4 rounded-xl flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="success-indicator p-4 rounded-xl flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* כפתור העלאה */}
          <div className="flex justify-center">
            <button
              type="submit"
              disabled={
                isLoading || 
                isConverting || 
                !callType || 
                !file
              }
              className="replayme-button-primary text-lg px-12 py-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center space-x-3">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>מעלה ומנתח...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Sparkles className="w-5 h-5" />
                  <span>
                    התחל ניתוח 🚀
                  </span>
                </div>
              )}
            </button>
          </div>
        </form>
      )}

      {/* מסך עיבוד */}
      {uploadStep === 'processing' && (
        <div className="text-center space-y-8">
          <div className="w-24 h-24 bg-lemon-mint/20 rounded-full flex items-center justify-center mx-auto animate-lemon-pulse">
            <Loader2 className="w-12 h-12 text-lemon-mint-dark animate-spin" />
          </div>
          
          <div>
            <h3 className="text-display text-2xl font-bold text-indigo-night mb-4">
              מנתח את השיחה שלך... 🤖
            </h3>
            <p className="text-indigo-night/70 text-lg leading-relaxed">
עובדים על ניתוח מעמיק של השיחה.              <br />
              <span className="text-lemon-mint-dark font-semibold">זה יקח בין 2-5 דקות</span>
            </p>
          </div>

          <div className="relative">
            <div className="progress-bar">
              <div 
                className="progress-bar-fill bg-lemon-mint transition-all duration-700 ease-out" 
                style={{ width: `${progress}%` }}
              ></div>
              {/* אפקט זוהר */}
              <div 
                className="progress-bar-fill bg-lemon-mint/50 animate-pulse absolute top-0" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-indigo-night/60">
              התקדמות: {Math.round(progress)}%
            </p>
            <p className="text-xs text-indigo-night/50">
              {progress < 20 && '🔄 טוען קובץ ומכין למעבד...'}
              {progress >= 20 && progress < 50 && '📝 מתחיל תמלול השיחה...'}
              {progress >= 50 && progress < 80 && '🎭 מנתח טון ורגש בשיחה...'}
              {progress >= 80 && progress < 95 && '📊 מבצע ניתוח תוכן מקצועי...'}
              {progress >= 95 && '✨ מסיים ומכין דוח...'}
            </p>
          </div>
        </div>
      )}

      {/* מסך הושלם */}
      {uploadStep === 'completed' && (
        <div className="text-center space-y-8">
          <div className="w-24 h-24 bg-success/20 rounded-full flex items-center justify-center mx-auto animate-score-bounce">
            <CheckCircle2 className="w-12 h-12 text-success" />
          </div>
          
          <div>
            <h3 className="text-display text-2xl font-bold text-indigo-night mb-4">
              השיחה הועלתה בהצלחה! ✅
            </h3>
            <p className="text-indigo-night/70 text-lg">
              השיחה נשמרה במערכת והניתוח התחיל ברקע
              <br />
              <span className="text-lemon-mint-dark font-semibold">תוכל לצפות בתוצאות בעוד כ-3-5 דקות</span>
            </p>
          </div>

          <div className="flex justify-center space-x-4">
            <button
              onClick={goToCallAnalysis}
              className="choacee-btn-clay-primary text-lg px-8 py-4"
            >
              <div className="flex items-center space-x-2">
                <ArrowRight className="w-5 h-5" />
                <span>עבור לדף השיחה</span>
              </div>
            </button>
            
            <button
              onClick={() => {
                setUploadStep('upload');
                setFile(null);
                setFileName(null);
                setCallType('');
                setCustomerName('');
                setAgentNotes('');
                setAnalysisNotes('');
                setProgress(0);
                setError(null);
                setSuccess(null);
              }}
              className="choacee-btn-clay-secondary text-lg px-8 py-4"
            >
              העלה שיחה נוספת
            </button>
          </div>
        </div>
      )}
    </div>
  )
}