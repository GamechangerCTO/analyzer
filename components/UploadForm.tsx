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
  Shield
} from 'lucide-react'
import { Database } from '@/types/database.types'

interface UploadFormProps {
  user: User
  userData: any
  callTypes: string[]
}

interface Agent {
  id: string
  full_name: string | null
}

const CALL_TYPE_OPTIONS = [
  "מכירה טלפונית",
  "פולו אפ מכירה טלפונית – לאחר שיחה ראשונית לפניי הצעה",
  "פולו אפ מכירה טלפונית –לאחר הצעה",
  "תאום פגישה",
  "פולו אפ תאום פגישה",
  "מכירה טלפונית חוזרת/שדרוג",
  "שירות לקוחות"
]

export default function UploadForm({ user, userData, callTypes }: UploadFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [uploadStep, setUploadStep] = useState<'upload' | 'processing' | 'completed'>('upload')
  const [progress, setProgress] = useState(0)
  const [callType, setCallType] = useState('')
  const [agentNotes, setAgentNotes] = useState('')
  const [analysisNotes, setAnalysisNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string>(user.id)
  const [dragActive, setDragActive] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [uploadCount, setUploadCount] = useState(0)
  const [uploadedCallId, setUploadedCallId] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  useEffect(() => {
    const fetchAgents = async () => {
      const freshSupabase = createClient();
      
      if (userData?.role === 'manager' || userData?.role === 'owner') {
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
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadCount(count => count + 1);
    
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    } else {
      if (uploadCount > 1 && !file) {
        setError('בעיה בבחירת הקובץ. נסה להשתמש בכפתור "הסר קובץ ובחר מחדש" ולנסות שוב.');
      }
    }
    
    e.target.value = '';
  }
  
  const validateAndSetFile = (selectedFile: File) => {
    const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
    const validAudioExtensions = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac', 'mp4', 'webm', 'aiff', 'wma', 'aac'];
    
    const isAudioByMimeType = selectedFile.type.includes('audio');
    const isAudioByExtension = validAudioExtensions.includes(fileExtension || '');
    
    if (!isAudioByMimeType && !isAudioByExtension) {
      setError(`אנא העלה קובץ אודיו בפורמט תקין (mp3, wav, etc.). הקובץ שנבחר: ${selectedFile.name} (${selectedFile.type || 'ללא סוג'})`);
      setFile(null);
      return;
    }
    
    if (selectedFile.size > 100 * 1024 * 1024) {
      setError('הקובץ גדול מדי. הגודל המקסימלי הוא 100MB');
      setFile(null);
      return;
    }
    
    setFile(selectedFile);
    setFileName(selectedFile.name);
    setError(null);
  }
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  }
  
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  }
  
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
      
      const callRecord = {
        user_id: selectedAgent,
        company_id: userData?.companies?.id || null,
        call_type: callType,
        audio_file_path: filePath,
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

  const isManager = userData?.role === 'manager' || userData?.role === 'owner';
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 px-6 py-12 sm:px-12">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
        
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 animate-ping bg-white/30 rounded-full"></div>
              <div className="relative bg-white/20 backdrop-blur-sm rounded-full p-4">
                <Mic className="w-12 h-12 text-white" />
              </div>
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            העלאת שיחה לניתוח
            <span className="inline-block mr-3">
              <Sparkles className="w-8 h-8 text-yellow-300 animate-pulse" />
            </span>
          </h1>
          
          <p className="text-xl text-blue-100 max-w-2xl mx-auto leading-relaxed">
            המערכת המתקדמת לניתוח איכות שיחות מכירה ושירות לקוחות
          </p>
          
          <div className="flex justify-center mt-8 space-x-8">
            <div className="flex items-center text-blue-100">
              <Shield className="w-5 h-5 ml-2" />
              <span className="text-sm">אבטחה מתקדמת</span>
            </div>
            <div className="flex items-center text-blue-100">
              <Zap className="w-5 h-5 ml-2" />
              <span className="text-sm">ניתוח מהיר</span>
            </div>
            <div className="flex items-center text-blue-100">
              <Star className="w-5 h-5 ml-2" />
              <span className="text-sm">דיוק מקסימלי</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main form container */}
      <div className="relative -mt-8 px-4 pb-12">
        <form onSubmit={handleSubmit} className="max-w-6xl mx-auto" noValidate>
          
          {/* Error/Success messages */}
          {error && (
            <div className="mb-8 bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 rounded-xl p-6 shadow-lg animate-fadeIn">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="bg-red-100 rounded-full p-2">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
                <div className="mr-4">
                  <h3 className="text-red-800 font-semibold mb-2">שגיאה בתהליך</h3>
                  <p className="text-red-700">{error}</p>
                  {error.includes('שאלון החברה') && (userData?.role === 'manager' || userData?.role === 'admin') && (
                    <div className="mt-4">
                      <a
                        href="/company-questionnaire"
                        className="inline-flex items-center px-6 py-3 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
                      >
                        <File className="w-4 h-4 ml-2" />
                        השלם את השאלון כעת
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {success && (
            <div className="mb-8 bg-gradient-to-r from-green-50 to-emerald-100 border-l-4 border-green-500 rounded-xl p-6 shadow-lg animate-fadeIn">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="bg-green-100 rounded-full p-2">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div className="mr-4">
                  <h3 className="text-green-800 font-semibold mb-2">הצלחה!</h3>
                  <p className="text-green-700">{success}</p>
                </div>
              </div>
            </div>
          )}

          {/* Completed state */}
          {uploadStep === 'completed' && (
            <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-100 border border-green-200 rounded-3xl p-12 text-center shadow-2xl animate-slideUp mb-8">
              <div className="flex justify-center mb-8">
                <div className="relative">
                  <div className="absolute inset-0 bg-green-200 rounded-full animate-ping"></div>
                  <div className="relative bg-gradient-to-r from-green-400 to-emerald-500 rounded-full p-6 shadow-lg">
                    <CheckCircle2 className="w-16 h-16 text-white" />
                  </div>
                </div>
              </div>
              
              <h3 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-6">
                🎉 העלאה הושלמה בהצלחה!
              </h3>
              
              <p className="text-green-700 mb-4 text-xl leading-relaxed">
                השיחה הועלתה ונשמרה במערכת. הניתוח מתבצע כעת ברקע ויושלם בקרוב.
              </p>
              
              <div className="bg-green-100 rounded-2xl p-4 mb-8">
                <p className="text-green-700 text-lg font-medium flex items-center justify-center">
                  <Cloud className="w-5 h-5 ml-2 animate-bounce" />
                  🔄 מעביר אותך לדף השיחה בעוד רגעים קלים...
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <button
                  type="button"
                  onClick={goToCallAnalysis}
                  className="group px-8 py-4 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white rounded-2xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-105 font-semibold text-lg flex items-center justify-center"
                >
                  <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform duration-200" />
                  עבור עכשיו לדף השיחה
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="group px-8 py-4 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-2xl hover:from-gray-600 hover:to-gray-700 transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-105 font-semibold text-lg flex items-center justify-center"
                >
                  <Clock className="w-6 h-6 ml-3 group-hover:rotate-12 transition-transform duration-200" />
                  חזור לדשבורד
                </button>
              </div>
              
              <p className="text-sm text-green-600 mt-6 bg-green-50 rounded-xl p-3">
                💡 תקבל התראה כשהניתוח יושלם או שתוכל לבדוק את הסטטוס בדף השיחה
              </p>
            </div>
          )}

          {/* Processing state */}
          {uploadStep === 'processing' && (
            <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 border border-blue-200 rounded-3xl p-12 text-center shadow-2xl animate-slideUp mb-8">
              <div className="flex justify-center mb-8">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-200 rounded-full animate-spin"></div>
                  <div className="relative bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full p-6 shadow-lg">
                    <Loader2 className="w-16 h-16 text-white animate-spin" />
                  </div>
                </div>
              </div>
              
              <h3 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-6">
                🚀 מתחיל ניתוח ברקע...
              </h3>
              
              <p className="text-blue-700 mb-6 text-xl leading-relaxed">
                השיחה הועלתה בהצלחה והניתוח מתחיל ברקע. תוכל להמשיך לעבוד בזמן שהמערכת מבצעת את הניתוח.
              </p>
              
              <div className="bg-blue-100 rounded-2xl p-6 mb-6">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full h-3 w-full overflow-hidden shadow-inner">
                  <div 
                    style={{ width: `${progress}%` }} 
                    className="bg-gradient-to-r from-white to-blue-100 h-full rounded-full transition-all duration-500 ease-out shadow-sm"
                  />
                </div>
                <p className="text-blue-700 mt-3 font-medium">{progress}% הושלם</p>
              </div>
            </div>
          )}

          {/* Upload state */}
          {uploadStep === 'upload' && (
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                
                {/* Left Panel - Form Details */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-8 lg:p-12">
                  <div className="space-y-8">
                    <div className="flex items-center pb-6 border-b border-blue-200">
                      <div className="bg-blue-600 rounded-xl p-3 ml-4">
                        <MessageCircle className="w-6 h-6 text-white" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-800">פרטי השיחה</h2>
                    </div>
                    
                    {isManager && (
                      <div className="space-y-3">
                        <label htmlFor="agentSelect" className="flex items-center text-sm font-semibold text-gray-700">
                          <div className="bg-purple-100 rounded-lg p-2 ml-3">
                            <UserCheck className="w-4 h-4 text-purple-600" />
                          </div>
                          בחר נציג *
                        </label>
                        <select
                          id="agentSelect"
                          value={selectedAgent}
                          onChange={(e) => setSelectedAgent(e.target.value)}
                          className="block w-full rounded-xl border-gray-300 shadow-sm py-4 px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white hover:shadow-lg"
                          disabled={isLoading}
                          required
                        >
                          <option value="">בחר נציג</option>
                          {agents.map((agent) => (
                            <option key={agent.id} value={agent.id}>
                              {agent.full_name || agent.id}
                            </option>
                          ))}
                        </select>
                        <div className="bg-purple-50 rounded-xl p-4">
                          <p className="text-sm text-purple-700 flex items-center">
                            <Info className="w-4 h-4 ml-2 text-purple-500" />
                            למנהלים: באפשרותך לנתח שיחות של כל נציג בחברה
                          </p>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      <label htmlFor="callType" className="flex items-center text-sm font-semibold text-gray-700">
                        <div className="bg-green-100 rounded-lg p-2 ml-3">
                          <Calendar className="w-4 h-4 text-green-600" />
                        </div>
                        סוג שיחה *
                      </label>
                      <select
                        id="callType"
                        value={callType}
                        onChange={(e) => setCallType(e.target.value)}
                        className="block w-full rounded-xl border-gray-300 shadow-sm py-4 px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white hover:shadow-lg"
                        disabled={isLoading}
                        required
                      >
                        <option value="">בחר סוג שיחה</option>
                        {CALL_TYPE_OPTIONS.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="space-y-3">
                      <label htmlFor="agentNotes" className="flex items-center text-sm font-semibold text-gray-700">
                        <div className="bg-orange-100 rounded-lg p-2 ml-3">
                          <MessageCircle className="w-4 h-4 text-orange-600" />
                        </div>
                        הערות נציג (אופציונלי)
                      </label>
                      <textarea
                        id="agentNotes"
                        value={agentNotes}
                        onChange={(e) => setAgentNotes(e.target.value)}
                        className="block w-full rounded-xl border-gray-300 shadow-sm py-4 px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white hover:shadow-lg resize-none"
                        rows={4}
                        placeholder="הוסף הערות, דגשים מיוחדים או אתגרים ספציפיים לשיחה זו"
                        disabled={isLoading}
                      />
                    </div>
                    
                    {/* פרמטרים לניתוח */}
                    <div className="space-y-3">
                      <label htmlFor="analysisNotes" className="flex items-center text-sm font-semibold text-gray-700">
                        <div className="bg-yellow-100 rounded-lg p-2 ml-3 animate-pulse">
                          <Sparkles className="w-4 h-4 text-yellow-600" />
                        </div>
                        <span className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-3 py-1 rounded-full text-xs font-bold ml-2 shadow-lg">
                          חשוב לניתוח!
                        </span>
                        הערות מיוחדים לטובת שיחה זו
                      </label>
                      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-400 rounded-xl p-4 mb-3">
                        <div className="flex items-start space-x-3">
                          <Heart className="w-5 h-5 text-yellow-500 mt-1 animate-pulse" />
                          <div>
                            <p className="text-yellow-800 text-sm font-semibold">
                              💡 פרמטרים אלו ישפיעו ישירות על הניתוח:
                            </p>
                            <p className="text-yellow-700 text-xs mt-1">
                              המערכת תתאים את הניתוח בהתאם להערות שתכתוב כאן
                            </p>
                          </div>
                        </div>
                      </div>
                      <textarea
                        id="analysisNotes"
                        value={analysisNotes}
                        onChange={(e) => setAnalysisNotes(e.target.value)}
                        className="block w-full rounded-xl border-yellow-300 shadow-sm py-4 px-4 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all duration-300 bg-white hover:shadow-lg resize-none"
                        rows={3}
                        placeholder="לדוגמה: התמקד בטכניקות סגירה, בדוק האם הנציג התמודד טוב עם התנגדויות, שים דגש על טון ומקצועיות..."
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Right Panel - File Upload */}
                <div className="bg-white p-8 lg:p-12">
                  <div className="space-y-6">
                    <div className="flex items-center pb-6 border-b border-gray-200">
                      <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-3 ml-4">
                        <Upload className="w-6 h-6 text-white" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-800">העלאת קובץ</h2>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center text-sm font-semibold text-gray-700 mb-4">
                        <div className="bg-indigo-100 rounded-lg p-2 ml-3">
                          <FileAudio className="w-4 h-4 text-indigo-600" />
                        </div>
                        קובץ אודיו *
                      </div>
                      
                      <div 
                        className={`relative group transition-all duration-300 ${dragActive 
                          ? 'scale-105 shadow-2xl border-4 border-blue-400 bg-gradient-to-br from-blue-50 to-indigo-100' 
                          : file 
                            ? 'border-4 border-green-400 bg-gradient-to-br from-green-50 to-emerald-100 shadow-xl' 
                            : error 
                              ? 'border-4 border-red-300 bg-red-50' 
                              : 'border-4 border-dashed border-gray-300 hover:border-blue-400 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 hover:shadow-lg'
                        } rounded-2xl px-8 py-12 cursor-pointer text-center`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={triggerFileInput}
                      >
                        <div className="text-center">
                          {!file ? (
                            <>
                              <div className="flex justify-center mb-6">
                                <div className="relative">
                                  <div className="absolute inset-0 bg-blue-200 rounded-full animate-ping opacity-20"></div>
                                  <div className="relative bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full p-6 shadow-lg">
                                    <Upload className="w-12 h-12 text-white" />
                                  </div>
                                </div>
                              </div>
                              <div className="mb-4">
                                <label htmlFor="file-upload" className="cursor-pointer">
                                  <span className="block text-xl font-bold text-gray-900 mb-2">
                                    העלה קובץ אודיו
                                  </span>
                                  <p className="block text-lg text-gray-600 mb-4">
                                    או גרור ושחרר כאן
                                  </p>
                                </label>
                                <input
                                  ref={fileInputRef}
                                  id="file-upload"
                                  name="file-upload"
                                  type="file"
                                  className="sr-only"
                                  accept="audio/*"
                                  onChange={handleFileChange}
                                  disabled={isLoading}
                                />
                              </div>
                              <div className="bg-gray-100 rounded-xl p-4">
                                <p className="text-sm text-gray-600 font-medium">
                                  📁 פורמטים נתמכים: MP3, WAV, M4A, AAC
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  גודל מקסימלי: 100MB
                                </p>
                              </div>
                            </>
                          ) : (
                            <div className="text-center">
                              <div className="flex justify-center mb-6">
                                <div className="relative">
                                  <div className="absolute inset-0 bg-green-200 rounded-full animate-pulse"></div>
                                  <div className="relative bg-gradient-to-r from-green-400 to-emerald-500 rounded-full p-6 shadow-lg">
                                    <CheckCircle2 className="w-12 h-12 text-white" />
                                  </div>
                                </div>
                              </div>
                              <div className="mb-6">
                                <p className="text-xl font-bold text-gray-900 mb-2 break-all">
                                  {fileName || file.name}
                                </p>
                                <div className="flex items-center justify-center space-x-4">
                                  <div className="bg-green-100 rounded-lg px-3 py-1">
                                    <p className="text-sm text-green-700 font-medium">
                                      📊 {(file.size / (1024 * 1024)).toFixed(2)} MB
                                    </p>
                                  </div>
                                  <div className="bg-blue-100 rounded-lg px-3 py-1">
                                    <p className="text-sm text-blue-700 font-medium">
                                      ✅ מוכן לניתוח
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={clearSelectedFile}
                                className="group inline-flex items-center px-6 py-3 border-2 border-gray-300 shadow-sm text-sm font-semibold rounded-xl text-gray-700 bg-white hover:bg-gray-50 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 transform hover:scale-105"
                                disabled={isLoading}
                              >
                                <Upload className="w-4 h-4 ml-2 group-hover:rotate-180 transition-transform duration-300" />
                                החלף קובץ
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Submit Section */}
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-8 lg:px-12 py-8 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <Shield className="w-4 h-4 text-green-500" />
                      <span>הנתונים מוגנים באבטחה מתקדמת</span>
                    </div>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isLoading || !file || !callType}
                    className={`group relative overflow-hidden px-10 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white font-bold text-lg rounded-2xl shadow-xl transition-all duration-300 transform ${
                      isLoading || !file || !callType 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:scale-105 hover:shadow-2xl hover:from-blue-700 hover:to-indigo-800'
                    }`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    
                    {isLoading ? (
                      <>
                        <Loader2 className="animate-spin -ml-1 mr-3 h-6 w-6 inline" />
                        מעלה ומעבד...
                      </>
                    ) : (
                      <>
                        <div className="flex items-center">
                          <Sparkles className="w-6 h-6 ml-3 group-hover:rotate-180 transition-transform duration-300" />
                          שלח לניתוח מתקדם
                          <Play className="w-6 h-6 mr-3 group-hover:translate-x-1 transition-transform duration-200" />
                        </div>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}