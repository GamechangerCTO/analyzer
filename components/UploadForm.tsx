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

interface UploadedCall {
  id: string
  fileName: string
  status: 'uploading' | 'processing' | 'completed' | 'error'
  progress: number
  error?: string
  callId?: string
}

const CALL_TYPE_OPTIONS = [
  {
    value: "מכירה טלפונית",
    label: "מכירה טלפונית",
    icon: Phone,
    color: "bg-blue-500",
    description: "שיחת מכירה ישירה ללקוח"
  },
  {
    value: "פולו אפ מכירה טלפונית – לאחר שיחה ראשונית לפניי הצעה",
    label: "פולו אפ לפני הצעה",
    icon: RefreshCw,
    color: "bg-green-500",
    description: "מעקב לאחר שיחה ראשונית"
  },
  {
    value: "פולו אפ מכירה טלפונית –לאחר הצעה",
    label: "פולו אפ לאחר הצעה",
    icon: TrendingUp,
    color: "bg-orange-500",
    description: "מעקב לאחר הגשת הצעה"
  },
  {
    value: "תאום פגישה",
    label: "תאום פגישה",
    icon: CalendarCheck,
    color: "bg-purple-500",
    description: "קביעת פגישה עם לקוח"
  },
  {
    value: "פולו אפ תאום פגישה",
    label: "פולו אפ תאום פגישה",
    icon: Calendar,
    color: "bg-indigo-500",
    description: "מעקב אחרי תאום פגישה"
  },
  {
    value: "מכירה טלפונית חוזרת/שדרוג",
    label: "מכירה חוזרת/שדרוג",
    icon: Star,
    color: "bg-yellow-500",
    description: "מכירה ללקוח קיים או שדרוג"
  },
  {
    value: "שירות לקוחות",
    label: "שירות לקוחות",
    icon: Headphones,
    color: "bg-pink-500",
    description: "שיחת תמיכה ושירות"
  }
]

export default function UploadForm({ user, userData, callTypes }: UploadFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [uploadMode, setUploadMode] = useState<'single' | 'multiple'>('single')
  const [uploadStep, setUploadStep] = useState<'upload' | 'processing' | 'completed'>('upload')
  const [progress, setProgress] = useState(0)
  const [callType, setCallType] = useState('')
  const [agentNotes, setAgentNotes] = useState('')
  const [analysisNotes, setAnalysisNotes] = useState('')
  
  // Single file upload
  const [file, setFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  
  // Multiple files upload - חדש
  const [files, setFiles] = useState<File[]>([])
  const [uploadedCalls, setUploadedCalls] = useState<UploadedCall[]>([])
  
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
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isCallTypeDropdownOpen) {
        const target = event.target as HTMLElement;
        if (!target.closest('[data-dropdown="call-type"]')) {
          setIsCallTypeDropdownOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCallTypeDropdownOpen]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadCount(count => count + 1);
    
    const selectedFiles = Array.from(e.target.files || []);
    
    if (uploadMode === 'single') {
      const selectedFile = selectedFiles[0];
      if (selectedFile) {
        validateAndSetFile(selectedFile);
      } else {
        if (uploadCount > 1 && !file) {
          setError('בעיה בבחירת הקובץ. נסה להשתמש בכפתור "הסר קובץ ובחר מחדש" ולנסות שוב.');
        }
      }
    } else {
      // Multiple files mode
      if (selectedFiles.length > 0) {
        validateAndSetMultipleFiles(selectedFiles);
      }
    }
    
    e.target.value = '';
  }
  
  const validateAndSetFile = async (selectedFile: File) => {
    const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
    const supportedFormats = getSupportedFormats();
    
    const isAudioByMimeType = selectedFile.type.includes('audio');
    const isAudioByExtension = supportedFormats.includes(fileExtension || '');
    
    if (!isAudioByMimeType && !isAudioByExtension) {
      setError(`אנא העלה קובץ אודיו בפורמט נתמך. פורמטים נתמכים: ${supportedFormats.join(', ')}`);
      return;
    }
    
    // Convert file if needed
    let finalFile = selectedFile;
         if (needsConversion(selectedFile.name)) {
       setIsConverting(true);
       setConversionStatus('מבצע המרה לפורמט MP3...');
       
       try {
         finalFile = await convertAudioToMp3(selectedFile);
         setConversionStatus('ההמרה הושלמה בהצלחה');
       } catch (conversionError) {
         console.error('Conversion error:', conversionError);
         setError('שגיאה בהמרת קובץ האודיו. נסה להשתמש בקובץ בפורמט MP3 או WAV.');
         setIsConverting(false);
         return;
       } finally {
         setIsConverting(false);
         setConversionStatus('');
       }
     }
    
    setFile(finalFile);
    setFileName(finalFile.name);
    setError(null);
  }

  // חדש: פונקציה לטיפול בקבצים מרובים
  const validateAndSetMultipleFiles = async (selectedFiles: File[]) => {
    const supportedFormats = getSupportedFormats();
    const validFiles: File[] = [];
    const errors: string[] = [];

    for (const file of selectedFiles) {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const isAudioByMimeType = file.type.includes('audio');
      const isAudioByExtension = supportedFormats.includes(fileExtension || '');
      
      if (!isAudioByMimeType && !isAudioByExtension) {
        errors.push(`${file.name}: פורמט לא נתמך`);
      } else {
        validFiles.push(file);
      }
    }

    if (errors.length > 0) {
      setError(`קבצים לא נתמכים: ${errors.join(', ')}. פורמטים נתמכים: ${supportedFormats.join(', ')}`);
      return;
    }

    setFiles(validFiles);
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
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    
    if (uploadMode === 'single' && droppedFiles.length > 0) {
      validateAndSetFile(droppedFiles[0]);
    } else if (uploadMode === 'multiple' && droppedFiles.length > 0) {
      validateAndSetMultipleFiles(droppedFiles);
    }
  }
  
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!file && !files.length) {
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
      
      const fileExt = file ? file.name.split('.').pop() : files[0].name.split('.').pop()
      const filePath = `${selectedAgent}/${Date.now()}.${fileExt}`
      
      setProgress(20)
      
      const { data: uploadData, error: uploadError } = await freshSupabase.storage
        .from('audio_files')
        .upload(filePath, file ? file : files[0], {
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
  
    // פונקציה לטיפול בהעלאת מספר שיחות
  const handleMultipleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!files.length) {
      setError('אנא בחר קבצים להעלאה');
      return;
    }
    
    if (!callType) {
      setError('אנא בחר סוג שיחה');
      return;
    }

    // בדיקת שאלון החברה
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
        setError('לא ניתן להעלות שיחות - שאלון החברה לא מולא במלואו. אנא השלם את השאלון בעמוד השאלון.');
        return;
      }
    }

    setError(null);
    setIsLoading(true);
    setUploadStep('upload');
    
    // אתחול מערך השיחות המועלות
    const initialCalls: UploadedCall[] = files.map((file, index) => ({
      id: `temp-${index}-${Date.now()}`,
      fileName: file.name,
      status: 'uploading',
      progress: 0
    }));
    
    setUploadedCalls(initialCalls);

    try {
      const freshSupabase = createClient();
      const uploadPromises = files.map(async (file, index) => {
        const fileExt = file.name.split('.').pop();
        const filePath = `${selectedAgent}/${Date.now()}-${index}.${fileExt}`;
        
        // עדכון סטטוס העלאה
        setUploadedCalls(prev => prev.map(call => 
          call.id === initialCalls[index].id 
            ? { ...call, progress: 20 }
            : call
        ));

        // העלאת הקובץ
        const { data: uploadData, error: uploadError } = await freshSupabase.storage
          .from('audio_files')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          throw new Error(`שגיאה בהעלאת ${file.name}: ${uploadError.message}`);
        }

        // עדכון סטטוס
        setUploadedCalls(prev => prev.map(call => 
          call.id === initialCalls[index].id 
            ? { ...call, progress: 60 }
            : call
        ));

        // יצירת רשומה בבסיס הנתונים
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

        const { data: callData, error: callError } = await freshSupabase
          .from('calls')
          .insert(callRecord)
          .select();

        if (callError || !callData || callData.length === 0) {
          throw new Error(`שגיאה ביצירת רשומת שיחה עבור ${file.name}`);
        }

        const callId = callData[0].id;

        // עדכון סטטוס
        setUploadedCalls(prev => prev.map(call => 
          call.id === initialCalls[index].id 
            ? { ...call, progress: 80, callId, status: 'processing' }
            : call
        ));

        // התחלת עיבוד השיחה ברקע
        processCall(callId).catch(processError => {
          console.error('Background processing error:', processError);
          setUploadedCalls(prev => prev.map(call => 
            call.callId === callId 
              ? { ...call, status: 'error', error: 'שגיאה בעיבוד השיחה' }
              : call
          ));
        });

        // עדכון סטטוס השלמה
        setUploadedCalls(prev => prev.map(call => 
          call.id === initialCalls[index].id 
            ? { ...call, progress: 100, status: 'completed' }
            : call
        ));

        return callId;
      });

      await Promise.all(uploadPromises);
      setUploadStep('completed');
      setSuccess(`${files.length} שיחות הועלו בהצלחה! הניתוח מתבצע ברקע ותקבל התראות כשיושלמו.`);
      
    } catch (error: any) {
      console.error('Error:', error);
      setError(error.message || 'שגיאה לא ידועה בעת העלאת השיחות');
      setUploadStep('upload');
    } finally {
      setIsLoading(false);
    }
  }

  // הסרת קובץ מהרשימה
  const removeFileFromList = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }

  const clearSelectedFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    setFileName(null);
    setFiles([]);
    setUploadedCalls([]);
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
    <div className="p-8">
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

      {/* Upload Mode Selection */}
      {uploadStep === 'upload' && (
        <div className="mb-8 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-6 shadow-lg animate-fadeIn">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <div className="bg-indigo-600 rounded-lg p-2 ml-3">
              <FolderOpen className="w-5 h-5 text-white" />
            </div>
            בחר מצב העלאה
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => {
                setUploadMode('single');
                setFiles([]);
                setUploadedCalls([]);
                setError(null);
              }}
              className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                uploadMode === 'single'
                  ? 'border-indigo-500 bg-indigo-100 shadow-lg scale-105'
                  : 'border-gray-300 bg-white hover:border-indigo-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-center mb-3">
                <div className={`rounded-lg p-2 ml-3 ${
                  uploadMode === 'single' ? 'bg-indigo-500' : 'bg-gray-400'
                }`}>
                  <FileAudio className="w-5 h-5 text-white" />
                </div>
                <h4 className={`font-semibold ${
                  uploadMode === 'single' ? 'text-indigo-800' : 'text-gray-700'
                }`}>
                  שיחה בודדת
                </h4>
              </div>
              <p className={`text-sm ${
                uploadMode === 'single' ? 'text-indigo-600' : 'text-gray-600'
              }`}>
                העלה קובץ אחד ונתח אותו
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setUploadMode('multiple');
                setFile(null);
                setFileName(null);
                setError(null);
              }}
              className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                uploadMode === 'multiple'
                  ? 'border-purple-500 bg-purple-100 shadow-lg scale-105'
                  : 'border-gray-300 bg-white hover:border-purple-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-center mb-3">
                <div className={`rounded-lg p-2 ml-3 ${
                  uploadMode === 'multiple' ? 'bg-purple-500' : 'bg-gray-400'
                }`}>
                  <Copy className="w-5 h-5 text-white" />
                </div>
                <h4 className={`font-semibold ${
                  uploadMode === 'multiple' ? 'text-purple-800' : 'text-gray-700'
                }`}>
                  שיחות מרובות
                </h4>
              </div>
              <p className={`text-sm ${
                uploadMode === 'multiple' ? 'text-purple-600' : 'text-gray-600'
              }`}>
                העלה מספר קבצים יחד וננתח בבת אחת
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Upload form */}
      {uploadStep === 'upload' && (
        <form onSubmit={uploadMode === 'single' ? handleSubmit : handleMultipleSubmit} className="space-y-8" noValidate>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Panel - Form Details */}
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <div className="bg-blue-600 rounded-lg p-2 ml-3">
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  פרטי השיחה
                </h2>
                
                <div className="space-y-4">
                  {isManager && (
                    <div className="smooth-appear">
                      <label htmlFor="agentSelect" className="block text-sm font-medium text-gray-700 mb-2">
                        בחר נציג *
                      </label>
                      <select
                        id="agentSelect"
                        value={selectedAgent}
                        onChange={(e) => setSelectedAgent(e.target.value)}
                        className="block w-full rounded-lg border-gray-300 shadow-sm py-3 px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
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
                    </div>
                  )}
                  
                  <div className="smooth-appear">
                    <label htmlFor="callType" className="block text-sm font-medium text-gray-700 mb-2">
                      סוג שיחה *
                    </label>
                    
                    {/* Custom Dropdown */}
                    <div className="relative" data-dropdown="call-type">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCallTypeDropdownOpen(!isCallTypeDropdownOpen);
                        }}
                        className="block w-full rounded-lg shadow-sm py-3 px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white text-right border border-gray-300 hover:shadow-md"
                        disabled={isLoading}
                      >
                        <div className="flex items-center justify-between">
                          {callType ? (
                            <div className="flex items-center">
                              {(() => {
                                const selectedOption = CALL_TYPE_OPTIONS.find(option => option.value === callType);
                                if (selectedOption) {
                                  const IconComponent = selectedOption.icon;
                                  return (
                                    <>
                                      <div className={`${selectedOption.color} rounded-lg p-1.5 ml-3 shadow-sm`}>
                                        <IconComponent className="w-4 h-4 text-white" />
                                      </div>
                                      <div className="text-right">
                                        <div className="font-medium text-gray-900">{selectedOption.label}</div>
                                        <div className="text-sm text-gray-500">{selectedOption.description}</div>
                                      </div>
                                    </>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          ) : (
                            <span className="text-gray-500">בחר סוג שיחה</span>
                          )}
                          <ChevronDown className={`w-5 h-5 text-gray-400 transition-all duration-200 ${isCallTypeDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>
                      </button>
                      
                      {isCallTypeDropdownOpen && (
                        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-auto animate-fadeIn">
                          {CALL_TYPE_OPTIONS.map((option) => {
                            const IconComponent = option.icon;
                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                  setCallType(option.value);
                                  setIsCallTypeDropdownOpen(false);
                                }}
                                className={`w-full text-right px-4 py-3 hover:bg-blue-50 transition-colors duration-200 flex items-center border-b border-gray-100 last:border-b-0 ${
                                  callType === option.value ? 'bg-blue-100 border-r-4 border-blue-500' : ''
                                }`}
                              >
                                <div className={`${option.color} rounded-lg p-1.5 ml-3`}>
                                  <IconComponent className="w-4 h-4 text-white" />
                                </div>
                                <div className="text-right flex-1">
                                  <div className="font-medium text-gray-900">{option.label}</div>
                                  <div className="text-sm text-gray-500">{option.description}</div>
                                </div>
                                {callType === option.value && (
                                  <CheckCircle2 className="w-5 h-5 text-blue-500 mr-2" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="smooth-appear">
                    <label htmlFor="agentNotes" className="block text-sm font-medium text-gray-700 mb-2">
                      הערות נציג (אופציונלי)
                    </label>
                    <textarea
                      id="agentNotes"
                      value={agentNotes}
                      onChange={(e) => setAgentNotes(e.target.value)}
                      className="block w-full rounded-lg border-gray-300 shadow-sm py-3 px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 resize-none hover:shadow-md"
                      rows={3}
                      placeholder="הוסף הערות או דגשים מיוחדים לשיחה זו"
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="smooth-appear">
                    <label htmlFor="analysisNotes" className="block text-sm font-medium text-gray-700 mb-2">
                      <span className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-2 py-1 rounded-full text-xs font-bold ml-2 animate-pulse">
                        חשוב לניתוח
                      </span>
                      הערות מיוחדות לניתוח
                    </label>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                      <p className="text-yellow-800 text-sm">
                        💡 הערות אלה ישפיעו ישירות על הניתוח - המערכת תתאים את הניתוח בהתאם
                      </p>
                    </div>
                    <textarea
                      id="analysisNotes"
                      value={analysisNotes}
                      onChange={(e) => setAnalysisNotes(e.target.value)}
                      className="block w-full rounded-lg border-yellow-300 shadow-sm py-3 px-4 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all duration-300 resize-none hover:shadow-md"
                      rows={3}
                      placeholder="לדוגמה: התמקד בטכניקות סגירה, בדוק התמודדות עם התנגדויות, שים דגש על טון ומקצועיות..."
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right Panel - File Upload */}
            <div className="space-y-6 animate-slideUp">
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <div className={`rounded-lg p-2 ml-3 ${
                    uploadMode === 'multiple' ? 'bg-purple-600' : 'bg-purple-600'
                  }`}>
                    <Upload className="w-5 h-5 text-white" />
                  </div>
                  {uploadMode === 'multiple' ? 'העלאת קבצי אודיו' : 'העלאת קובץ אודיו'}
                </h2>
                
                {/* הודעת המרה */}
                {(isConverting || conversionStatus) && (
                  <div className={`mb-4 p-4 rounded-lg border animate-fadeIn ${
                    isConverting 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'bg-green-50 border-green-200'
                  }`}>
                    <div className="flex items-center">
                      {isConverting ? (
                        <Loader2 className="w-5 h-5 text-blue-500 animate-spin ml-3" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-green-500 ml-3" />
                      )}
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          isConverting ? 'text-blue-800' : 'text-green-800'
                        }`}>
                          {isConverting ? 'מבצע המרה...' : 'המרה הושלמה!'}
                        </p>
                        <p className={`text-xs mt-1 ${
                          isConverting ? 'text-blue-600' : 'text-green-600'
                        }`}>
                          {conversionStatus}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div 
                  className={`relative transition-all duration-300 ${dragActive 
                    ? 'scale-105 border-4 border-blue-400 bg-blue-50 glow' 
                    : (file || files.length > 0)
                      ? `border-4 ${uploadMode === 'multiple' ? 'border-purple-400 bg-purple-50 glow-purple' : 'border-green-400 bg-green-50 glow-green'}` 
                      : error 
                        ? 'border-4 border-red-300 bg-red-50 glow-red' 
                        : 'border-4 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 hover:shadow-lg'
                  } rounded-xl px-8 py-12 cursor-pointer text-center`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={triggerFileInput}
                >
                  <div className="text-center">
                    {!file && !files.length ? (
                      <>
                        <div className="flex justify-center mb-4">
                          <div className="bg-blue-100 rounded-full p-4 animate-float">
                            <Upload className="w-8 h-8 text-blue-600" />
                          </div>
                        </div>
                        <div className="mb-4">
                          <label htmlFor="file-upload" className="cursor-pointer">
                            <span className="block text-lg font-semibold text-gray-900 mb-2">
                              {uploadMode === 'single' ? 'העלה קובץ אודיו' : 'העלה קבצי אודיו'}
                            </span>
                            <p className="block text-gray-600 mb-4">
                              {uploadMode === 'single' ? 'או גרור ושחרר כאן' : 'או גרור ושחרר מספר קבצים כאן'}
                            </p>
                          </label>
                          <input
                            ref={fileInputRef}
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            className="sr-only"
                            accept="audio/*"
                            multiple={uploadMode === 'multiple'}
                            onChange={handleFileChange}
                            disabled={isLoading}
                          />
                        </div>
                        <div className="bg-gray-100 rounded-lg p-3">
                          <p className="text-sm text-gray-600 font-medium">
                            פורמטים נתמכים: MP3, WAV, M4A, MP4, AAC, WebM, OGG, WMA
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            גודל מקסימלי: 25MB {uploadMode === 'multiple' ? 'לכל קובץ' : ''}
                          </p>
                        </div>
                      </>
                    ) : uploadMode === 'single' && file ? (
                      <div className="text-center">
                        <div className="flex justify-center mb-4">
                          <div className="bg-green-100 rounded-full p-4 animate-float">
                            <CheckCircle2 className="w-8 h-8 text-green-600" />
                          </div>
                        </div>
                        <div className="mb-4">
                          <p className="text-lg font-semibold text-gray-900 mb-2 break-all">
                            {fileName || file.name}
                          </p>
                          <div className="flex items-center justify-center space-x-4">
                            <div className="bg-green-100 rounded-lg px-3 py-1">
                              <p className="text-sm text-green-700 font-medium">
                                {(file.size / (1024 * 1024)).toFixed(2)} MB
                              </p>
                            </div>
                            <div className="bg-blue-100 rounded-lg px-3 py-1">
                              <p className="text-sm text-blue-700 font-medium">
                                מוכן לניתוח
                              </p>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={clearSelectedFile}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-all duration-200 hover:shadow-md"
                          disabled={isLoading}
                        >
                          <Upload className="w-4 h-4 ml-2" />
                          החלף קובץ
                        </button>
                      </div>
                    ) : uploadMode === 'multiple' && files.length > 0 ? (
                      <div className="text-right">
                        <div className="flex justify-center mb-4">
                          <div className="bg-purple-100 rounded-full p-4 animate-float">
                            <CheckCircle2 className="w-8 h-8 text-purple-600" />
                          </div>
                        </div>
                        <div className="mb-4">
                          <p className="text-lg font-semibold text-gray-900 mb-4">
                            {files.length} קבצים נבחרו
                          </p>
                          
                          {/* רשימת קבצים */}
                          <div className="max-h-48 overflow-y-auto space-y-2 mb-4">
                            {files.map((file, index) => (
                              <div key={index} className="flex items-center justify-between bg-white rounded-lg p-3 shadow-sm border">
                                <div className="flex items-center flex-1">
                                  <FileAudio className="w-5 h-5 text-purple-500 ml-3" />
                                  <div className="text-right flex-1">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {file.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeFileFromList(index)}
                                  className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors"
                                  disabled={isLoading}
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                          
                          <div className="flex items-center justify-center space-x-4 mb-4">
                            <div className="bg-purple-100 rounded-lg px-3 py-1">
                              <p className="text-sm text-purple-700 font-medium">
                                {(files.reduce((total, f) => total + f.size, 0) / (1024 * 1024)).toFixed(2)} MB סה"כ
                              </p>
                            </div>
                            <div className="bg-blue-100 rounded-lg px-3 py-1">
                              <p className="text-sm text-blue-700 font-medium">
                                מוכן לניתוח
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 justify-center">
                          <button
                            type="button"
                            onClick={triggerFileInput}
                            className="inline-flex items-center px-4 py-2 border border-purple-300 shadow-sm text-sm font-medium rounded-lg text-purple-700 bg-purple-50 hover:bg-purple-100 transition-all duration-200 hover:shadow-md"
                            disabled={isLoading}
                          >
                            <Plus className="w-4 h-4 ml-2" />
                            הוסף עוד
                          </button>
                          <button
                            type="button"
                            onClick={clearSelectedFile}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-all duration-200 hover:shadow-md"
                            disabled={isLoading}
                          >
                            <X className="w-4 h-4 ml-2" />
                            נקה הכל
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Submit Section */}
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-sm text-gray-600 flex items-center">
                <Shield className="w-4 h-4 text-green-500 ml-2" />
                הנתונים מוגנים באבטחה מתקדמת
              </div>
              
              <button
                type="submit"
                disabled={isLoading || (!file && !files.length) || !callType}
                className={`px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-lg rounded-xl shadow-lg transition-all duration-300 ${
                  isLoading || (!file && !files.length) || !callType 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl transform hover:scale-105'
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 inline" />
                    {uploadMode === 'multiple' ? 'מעלה ומעבד שיחות...' : 'מעלה ומעבד...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 ml-3 inline" />
                    {uploadMode === 'multiple' ? `התחל ניתוח ${files.length} שיחות` : 'התחל ניתוח'}
                    <Play className="w-5 h-5 mr-3 inline" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Multiple Upload Progress */}
      {uploadMode === 'multiple' && uploadedCalls.length > 0 && (
        <div className="mt-8 bg-white rounded-xl p-6 border border-gray-200 shadow-lg animate-fadeIn">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
            <div className="bg-purple-600 rounded-lg p-2 ml-3">
              <Upload className="w-5 h-5 text-white" />
            </div>
            התקדמות העלאת השיחות
          </h3>
          
          <div className="space-y-4">
            {uploadedCalls.map((call, index) => (
              <div key={call.id} className="bg-gray-50 rounded-lg p-4 border">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center flex-1">
                    <div className={`rounded-lg p-2 ml-3 ${
                      call.status === 'completed' ? 'bg-green-500' :
                      call.status === 'error' ? 'bg-red-500' :
                      call.status === 'processing' ? 'bg-blue-500' :
                      'bg-gray-500'
                    }`}>
                      {call.status === 'completed' ? (
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      ) : call.status === 'error' ? (
                        <AlertCircle className="w-4 h-4 text-white" />
                      ) : call.status === 'processing' ? (
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div className="text-right flex-1">
                      <p className="font-medium text-gray-900 truncate">
                        {call.fileName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {call.status === 'uploading' ? 'מעלה...' :
                         call.status === 'processing' ? 'מעבד...' :
                         call.status === 'completed' ? 'הושלם' :
                         call.status === 'error' ? call.error || 'שגיאה' : ''}
                      </p>
                    </div>
                  </div>
                  
                  {call.callId && call.status === 'completed' && (
                    <button
                      onClick={() => router.push(`/dashboard/calls/${call.callId}`)}
                      className="text-blue-600 hover:text-blue-800 font-medium text-sm px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      צפה בניתוח
                    </button>
                  )}
                </div>
                
                {/* Progress Bar */}
                <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div 
                    style={{ width: `${call.progress}%` }} 
                    className={`h-full rounded-full transition-all duration-500 ${
                      call.status === 'completed' ? 'bg-green-500' :
                      call.status === 'error' ? 'bg-red-500' :
                      'bg-blue-500'
                    }`}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1 text-right">
                  {call.progress}% הושלם
                </p>
              </div>
            ))}
          </div>
          
          {/* Summary */}
          <div className="mt-6 bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="font-medium text-purple-800">
                  {uploadedCalls.filter(c => c.status === 'completed').length} מתוך {uploadedCalls.length} הושלמו
                </p>
                <p className="text-sm text-purple-600">
                  {uploadedCalls.filter(c => c.status === 'error').length > 0 && 
                    `${uploadedCalls.filter(c => c.status === 'error').length} שיחות נכשלו`}
                </p>
              </div>
              
              {uploadedCalls.every(c => c.status === 'completed' || c.status === 'error') && (
                <button
                  onClick={() => router.push('/dashboard/calls')}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  עבור לרשימת השיחות
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}