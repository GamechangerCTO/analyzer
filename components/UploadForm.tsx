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
  Save,
  Clock,
  ArrowRight
} from 'lucide-react'

interface UploadFormProps {
  user: User
  userData: any
  callTypes: string[]
}

interface Agent {
  id: string
  full_name: string
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
  const [analysisType, setAnalysisType] = useState('full')
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
        analysis_type: analysisType,
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
              p_company_id: userData?.companies?.id || null,
              p_call_type: callType,
              p_audio_file_path: filePath,
              p_agent_notes: agentNotes || null,
              p_analysis_type: analysisType
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
      
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 3000);
      
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
  
  const forceTriggerFileInput = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const goToCallAnalysis = () => {
    if (uploadedCallId) {
      router.push(`/dashboard/calls/${uploadedCallId}`);
    }
  };

  const continueToDashboard = () => {
    router.push('/dashboard');
    router.refresh();
  };
  
  const isManager = userData?.role === 'manager' || userData?.role === 'owner';
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 flex items-start">
          <AlertCircle className="w-5 h-5 ml-2 mt-0.5 flex-shrink-0" />
          <div>{error}</div>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 flex items-start">
          <CheckCircle2 className="w-5 h-5 ml-2 mt-0.5 flex-shrink-0" />
          <div>{success}</div>
        </div>
      )}

      {uploadStep === 'completed' && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-8 text-center animate-fade-in">
          <div className="flex justify-center mb-6">
            <div className="bg-green-100 rounded-full p-4">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-green-800 mb-4">העלאה הושלמה בהצלחה!</h3>
          <p className="text-green-700 mb-6 text-lg">
            השיחה הועלתה ונשמרה במערכת. הניתוח מתבצע כעת ברקע ויושלם בקרוב.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              type="button"
              onClick={goToCallAnalysis}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 font-medium flex items-center justify-center"
            >
              <ArrowRight className="w-5 h-5 ml-2" />
              צפה בדף השיחה
            </button>
            <button
              type="button"
              onClick={continueToDashboard}
              className="px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-full hover:from-gray-600 hover:to-gray-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 font-medium flex items-center justify-center"
            >
              <Clock className="w-5 h-5 ml-2" />
              המשך לדשבורד
            </button>
          </div>
          <p className="text-sm text-green-600 mt-4">
            תקבל התראה כשהניתוח יושלם או שתוכל לבדוק את הסטטוס בדשבורד
          </p>
        </div>
      )}

      {uploadStep === 'processing' && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-8 text-center animate-fade-in">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-100 rounded-full p-4">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-blue-800 mb-4">מתחיל ניתוח ברקע...</h3>
          <p className="text-blue-700 mb-4 text-lg">
            השיחה הועלתה בהצלחה והניתוח מתחיל ברקע. תוכל להמשיך לעבוד בזמן שהמערכת מבצעת את הניתוח.
          </p>
          <div className="bg-blue-100 rounded-full h-2 w-full overflow-hidden">
            <div 
              style={{ width: `${progress}%` }} 
              className="bg-blue-500 h-full rounded-full transition-all duration-300"
            />
          </div>
        </div>
      )}

      {uploadStep === 'upload' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center border-b pb-4 mb-4">
              <MessageCircle className="w-5 h-5 ml-2 text-blue-600" />
              <h2 className="text-lg font-medium">פרטי שיחה</h2>
            </div>
            
            {isManager && (
              <div className="space-y-2">
                <label htmlFor="agentSelect" className="flex items-center text-sm font-medium text-gray-700">
                  <UserCheck className="w-4 h-4 ml-1.5 text-gray-500" />
                  בחר נציג *
                </label>
                <select
                  id="agentSelect"
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm py-2.5 px-3 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
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
                <p className="text-xs text-gray-500 flex items-center">
                  <Info className="w-3.5 h-3.5 ml-1 text-blue-500" />
                  למנהלים: באפשרותך לנתח שיחות של כל נציג בחברה
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <label htmlFor="callType" className="flex items-center text-sm font-medium text-gray-700">
                <Calendar className="w-4 h-4 ml-1.5 text-gray-500" />
                סוג שיחה *
              </label>
              <select
                id="callType"
                value={callType}
                onChange={(e) => setCallType(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm py-2.5 px-3 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
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
            
            <div className="space-y-2">
              <span className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <FileAudio className="w-4 h-4 ml-1.5 text-gray-500" />
                סוג ניתוח
              </span>
              <div className="flex flex-col space-y-2">
                <label className="inline-flex items-center p-3 border rounded-md border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    className="ml-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    value="full"
                    checked={analysisType === 'full'}
                    onChange={() => setAnalysisType('full')}
                    disabled={isLoading}
                  />
                  <div>
                    <span className="font-medium">ניתוח מלא</span>
                    <p className="text-xs text-gray-500 mr-6">תמלול + טונציה + ניתוח תוכן מקצועי (מקיף)</p>
                  </div>
                </label>
                <label className="inline-flex items-center p-3 border rounded-md border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    className="ml-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    value="tone"
                    checked={analysisType === 'tone'}
                    onChange={() => setAnalysisType('tone')}
                    disabled={isLoading}
                  />
                  <div>
                    <span className="font-medium">ניתוח טונציה בלבד</span>
                    <p className="text-xs text-gray-500 mr-6">בדיקת טון, אנרגיה וזיהוי דגלים אדומים (מהיר)</p>
                  </div>
                </label>
              </div>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="agentNotes" className="flex items-center text-sm font-medium text-gray-700">
                <MessageCircle className="w-4 h-4 ml-1.5 text-gray-500" />
                הערות נציג (אופציונלי)
              </label>
              <textarea
                id="agentNotes"
                value={agentNotes}
                onChange={(e) => setAgentNotes(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm py-2.5 px-3 focus:ring-blue-500 focus:border-blue-500 transition-all"
                rows={4}
                placeholder="הוסף הערות, דגשים מיוחדים או אתגרים ספציפיים לשיחה זו"
                disabled={isLoading}
              />
            </div>
          </div>
          
          <div className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center border-b pb-4 mb-4">
              <Upload className="w-5 h-5 ml-2 text-blue-600" />
              <h2 className="text-lg font-medium">העלאת קובץ</h2>
            </div>
            
            <div className="space-y-2">
              <span className="flex items-center text-sm font-medium text-gray-700">
                <FileAudio className="w-4 h-4 ml-1.5 text-gray-500" />
                קובץ אודיו *
              </span>
              
              <div 
                className={`mt-2 flex justify-center rounded-lg border-2 ${dragActive ? 'border-blue-500 bg-blue-50' : file ? 'border-green-500 bg-green-50' : error ? 'border-red-300' : 'border-gray-300 border-dashed'} px-6 py-10 transition-all cursor-pointer hover:bg-gray-50`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={triggerFileInput}
              >
                <div className="text-center">
                  {file ? (
                    <div className="flex flex-col items-center">
                      <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
                      <div className="mt-4 flex flex-col items-center">
                        <span className="font-medium text-green-800">
                          קובץ נבחר: {fileName || file.name}
                        </span>
                        <span className="text-sm text-green-600 mt-1">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                        
                        <button
                          type="button"
                          onClick={clearSelectedFile}
                          className="mt-3 px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-xs font-medium hover:bg-red-200 transition-colors"
                        >
                          הסר קובץ ובחר מחדש
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <FileAudio className={`mx-auto h-12 w-12 ${dragActive ? 'text-blue-600' : error ? 'text-red-400' : 'text-gray-400'}`} />
                      <div className="mt-4 flex flex-col items-center">
                        <span className={`font-medium ${error ? 'text-red-600' : 'text-gray-900'}`}>
                          {error ? 'יש שגיאה בבחירת הקובץ' : 'גרור קובץ לכאן או לחץ לבחירה'}
                        </span>
                        <span className="text-xs text-gray-500 mt-1">
                          MP3, WAV, M4A, AAC או כל קובץ אודיו אחר עד 100MB
                        </span>
                        
                        {error && (
                          <button
                            type="button"
                            onClick={forceTriggerFileInput}
                            className="mt-3 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium hover:bg-blue-200 transition-colors"
                          >
                            נסה בחירת קובץ שוב
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  id="audioFile"
                  name="audioFile"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,.mp4,.webm,.aiff,.wma"
                  className="hidden"
                  disabled={isLoading}
                />
              </div>
            </div>
            
            <div className="mt-2 text-xs text-gray-500 flex justify-center">
              סטטוס קובץ: {file 
                ? <span className="text-green-600 font-medium">✓ נבחר בהצלחה</span> 
                : <span className="text-gray-500">לא נבחר</span>}
              {uploadCount > 0 && !file && (
                <span className="text-yellow-600 mr-2">
                  {uploadCount} ניסיונות בחירה ללא הצלחה
                </span>
              )}
            </div>
            
            {isLoading && uploadStep === 'upload' && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <span className={`text-sm font-semibold inline-flex items-center py-1 px-2.5 rounded-full ${progress < 100 ? 'text-blue-600 bg-blue-100' : 'text-green-600 bg-green-100'}`}>
                      {progress < 30 ? (
                        <>
                          <Upload className="w-3.5 h-3.5 ml-1.5" />
                          מעלה קובץ
                        </>
                      ) : progress < 70 ? (
                        <>
                          <Save className="w-3.5 h-3.5 ml-1.5" />
                          שומר נתונים
                        </>
                      ) : progress < 100 ? (
                        <>
                          <Clock className="w-3.5 h-3.5 ml-1.5" />
                          מכין לניתוח
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 ml-1.5" />
                          הושלם
                        </>
                      )}
                    </span>
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-semibold inline-block text-blue-600">
                      {progress}%
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded-full bg-blue-100">
                  <div 
                    style={{ width: `${progress}%` }} 
                    className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-300 ${progress < 100 ? 'bg-blue-500' : 'bg-green-500'}`}
                  />
                </div>
                <p className="text-xs text-gray-500 text-center mt-2">
                  {progress < 30 ? 'מעלה את הקובץ לשרת...' : 
                   progress < 70 ? 'שומר את נתוני השיחה...' : 
                   progress < 100 ? 'מכין את השיחה לניתוח ברקע...' : 
                   'השיחה נשמרה והניתוח יתחיל ברקע...'}
                </p>
              </div>
            )}
            
            <div className="flex justify-end mt-6">
              <button
                type="submit"
                className={`py-2.5 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:ring-blue-500 focus:ring-offset-blue-200 text-white w-full transition ease-in duration-200 text-center text-base font-medium shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-lg flex items-center justify-center ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                    מעלה...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 ml-2" />
                    העלה שיחה לניתוח ברקע
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {!isLoading && uploadStep === 'upload' && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-blue-700 text-sm flex items-start mt-4">
          <Info className="w-5 h-5 ml-2 mt-0.5 flex-shrink-0 text-blue-500" />
          <div>
            <p className="font-medium">טיפ לניתוח ברקע:</p>
            <p>השיחה תועלה מיד ותוכל להמשיך לעבוד בזמן שהמערכת מנתחת אותה ברקע. תקבל התראה כשהניתוח יושלם.</p>
          </div>
        </div>
      )}
    </form>
  )
} 