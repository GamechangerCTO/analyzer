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
  selectedAgent?: string
}

const CALL_TYPE_OPTIONS = [
  {
    value: "sales_call",
    label: "מכירה טלפונית",
    icon: Phone,
    emoji: "📞",
    color: "lemon-mint",
    description: "שיחת מכירה ישירה ללקוח פוטנציאלי"
  },
  {
    value: "follow_up_before_offer",
    label: "פולו אפ לפני הצעה",
    icon: RefreshCw,
    emoji: "📋",
    color: "electric-coral",
    description: "מעקב לאחר שיחה ראשונית לפני הגשת הצעה"
  },
  {
    value: "follow_up_after_offer",
    label: "פולו אפ אחרי הצעה",
    icon: TrendingUp,
    emoji: "✅",
    color: "success",
    description: "מעקב לאחר הגשת הצעת מחיר"
  },
  {
    value: "appointment_scheduling",
    label: "תאום פגישה",
    icon: CalendarCheck,
    emoji: "📅",
    color: "indigo-night",
    description: "קביעת פגישה עתידית עם לקוח"
  },
  {
    value: "follow_up_appointment",
    label: "פולו אפ תאום",
    icon: Calendar,
    emoji: "🔄",
    color: "warning",
    description: "מעקב אחרי תאום פגישה שנקבע"
  },
  {
    value: "customer_service",
    label: "שירות לקוחות",
    icon: Headphones,
    emoji: "🛠️",
    color: "purple-500",
    description: "שיחת תמיכה ושירות ללקוח קיים"
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
  
  // Multiple files upload
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
      if (uploadMode === 'single') {
        validateAndSetFile(e.target.files[0]);
      } else {
        validateAndSetMultipleFiles(Array.from(e.target.files));
      }
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
  
  const validateAndSetMultipleFiles = async (selectedFiles: File[]) => {
    setError(null);
    const supportedFormats = getSupportedFormats();
    
    const validFiles: File[] = [];
    const maxSize = 100 * 1024 * 1024; // 100MB
    
    for (const file of selectedFiles) {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (!fileExtension || !supportedFormats.includes(fileExtension)) {
        setError(`הקובץ ${file.name} אינו נתמך. אנא בחר קבצים מהסוגים: ${supportedFormats.join(', ')}`);
        return;
      }
      
      if (file.size > maxSize) {
        setError(`הקובץ ${file.name} גדול מדי. גודל מקסימלי: 100MB`);
        return;
      }
      
      validFiles.push(file);
    }
    
    setFiles(validFiles);
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
      if (uploadMode === 'single') {
        validateAndSetFile(e.dataTransfer.files[0]);
      } else {
        validateAndSetMultipleFiles(Array.from(e.dataTransfer.files));
      }
    }
  };
  
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };
  
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

    // בדיקה שכל שיחה הוקצתה לnaget (במצב מנהל)
    if (isManager && agents.length > 1) {
      const unassignedFiles = files.filter((file, index) => {
        const assignedCall = uploadedCalls.find(call => call.fileName === file.name);
        return !assignedCall?.selectedAgent;
      });

      if (unassignedFiles.length > 0) {
        setError(`אנא בחר נציג עבור כל השיחות. חסר נציג עבור: ${unassignedFiles.map(f => f.name).join(', ')}`);
        return;
      }
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
        // קבלת הagent המוקצה לשיחה זו (או default לעובד)
        const assignedCall = uploadedCalls.find(call => call.fileName === file.name);
        const fileAgentId = isManager && agents.length > 1 
          ? assignedCall?.selectedAgent || selectedAgent 
          : selectedAgent;
        
        const fileExt = file.name.split('.').pop();
        const filePath = `${fileAgentId}/${Date.now()}-${index}.${fileExt}`;
        
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
          user_id: fileAgentId,
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
      
      // הודעת הצלחה מפורטת יותר למנהלים
      if (isManager && agents.length > 1) {
        const agentCounts = files.reduce((acc, file, index) => {
          const assignedCall = uploadedCalls.find(call => call.fileName === file.name);
          const agentId = assignedCall?.selectedAgent || selectedAgent;
          const agentName = agents.find(a => a.id === agentId)?.full_name || 'נציג ללא שם';
          acc[agentName] = (acc[agentName] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const agentSummary = Object.entries(agentCounts)
          .map(([name, count]) => `${name}: ${count} שיחות`)
          .join(', ');
        
        setSuccess(`${files.length} שיחות הועלו בהצלחה! פילוח: ${agentSummary}. הניתוח מתבצע ברקע.`);
      } else {
        setSuccess(`${files.length} שיחות הועלו בהצלחה! הניתוח מתבצע ברקע ותקבל התראות כשיושלמו.`);
      }
      
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
    // הסרת גם השיחה המתאימה מuploaded calls אם קיימת
    setUploadedCalls(prev => prev.filter((_, i) => i !== index));
  }

  // עדכון agent נבחר לשיחה ספציפית
  const updateCallAgent = (fileIndex: number, agentId: string) => {
    const fileName = files[fileIndex]?.name;
    if (!fileName) return;

    setUploadedCalls(prev => {
      const existingCallIndex = prev.findIndex(call => call.fileName === fileName);
      if (existingCallIndex >= 0) {
        // עדכון קיים
        const updated = [...prev];
        updated[existingCallIndex] = { ...updated[existingCallIndex], selectedAgent: agentId };
        return updated;
      } else {
        // יצירת חדש
        return [...prev, {
          id: `temp-${fileIndex}-${Date.now()}`,
          fileName,
          status: 'uploading' as const,
          progress: 0,
          selectedAgent: agentId
        }];
      }
    });
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

  const isManager = userData?.role === 'manager';
  
  return (
    <div className="space-y-8">
      {/* בחירת מצב העלאה */}
      <div className="flex justify-center">
        <div className="flex bg-cream-sand rounded-xl p-1 border border-ice-gray">
          <button
            type="button"
            onClick={() => setUploadMode('single')}
            className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
              uploadMode === 'single'
                ? 'bg-lemon-mint text-indigo-night shadow-md'
                : 'text-indigo-night/60 hover:text-indigo-night'
            }`}
          >
            <div className="flex items-center space-x-2">
              <FileAudio className="w-4 h-4" />
              <span>שיחה בודדת</span>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setUploadMode('multiple')}
            className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
              uploadMode === 'multiple'
                ? 'bg-electric-coral text-white shadow-md'
                : 'text-indigo-night/60 hover:text-indigo-night'
            }`}
          >
            <div className="flex items-center space-x-2">
              <FolderOpen className="w-4 h-4" />
              <span>שיחות מרובות</span>
            </div>
          </button>
        </div>
      </div>

      {uploadStep === 'upload' && (
        <form onSubmit={uploadMode === 'single' ? handleSubmit : handleMultipleSubmit} className="space-y-8">
          
          {/* אזור העלאת קבצים */}
          <div className="space-y-6">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={triggerFileInput}
              className={`
                relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300
                ${dragActive 
                  ? 'border-lemon-mint bg-lemon-mint/10 scale-105' 
                  : file || files.length > 0
                    ? 'border-success bg-success/5'
                    : 'border-ice-gray hover:border-lemon-mint hover:bg-lemon-mint/5'
                }
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                multiple={uploadMode === 'multiple'}
                accept=".mp3,.wav,.m4a,.aac,.flac,.ogg,.webm,.mp4,.mov,.avi"
                className="hidden"
              />
              
              <div className="space-y-4">
                {isConverting ? (
                  <div className="animate-lemon-pulse">
                    <Loader2 className="w-16 h-16 text-lemon-mint-dark mx-auto animate-spin" />
                    <p className="text-lg font-semibold text-indigo-night mt-4">{conversionStatus}</p>
                  </div>
                ) : file || files.length > 0 ? (
                  <div className="text-success">
                    <CheckCircle2 className="w-16 h-16 mx-auto animate-score-bounce" />
                    <p className="text-lg font-semibold text-indigo-night mt-4">
                      {uploadMode === 'single' 
                        ? `נבחר: ${fileName}` 
                        : `נבחרו ${files.length} קבצים`
                      }
                    </p>
                  </div>
                ) : (
                  <>
                    <div className={`w-20 h-20 mx-auto rounded-2xl flex items-center justify-center ${
                      dragActive ? 'bg-lemon-mint/20 animate-lemon-pulse' : 'bg-indigo-night/10'
                    }`}>
                      <Upload className={`w-10 h-10 ${
                        dragActive ? 'text-lemon-mint-dark' : 'text-indigo-night'
                      }`} />
                    </div>
                    
                    <div>
                      <h3 className="text-xl font-bold text-indigo-night mb-2">
                        {uploadMode === 'single' ? 'גרור שיחה או לחץ להעלאה' : 'גרור קבצים או לחץ להעלאה'}
                      </h3>
                      <p className="text-indigo-night/60">
                        נתמך: MP3, WAV, M4A, AAC ועוד | עד 100MB לקובץ
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* רשימת קבצים שנבחרו (מצב מרובה) */}
            {uploadMode === 'multiple' && files.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-lg font-semibold text-indigo-night">קבצים שנבחרו:</h4>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {files.map((file, index) => (
                    <div key={index} className="p-4 bg-cream-sand rounded-xl border border-ice-gray">
                      {/* מידע הקובץ */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <FileAudio className="w-5 h-5 text-indigo-night" />
                          <span className="text-sm font-medium text-indigo-night">{file.name}</span>
                          <span className="text-xs text-indigo-night/60">
                            {(file.size / (1024 * 1024)).toFixed(1)} MB
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFileFromList(index);
                          }}
                          className="text-electric-coral hover:text-electric-coral-dark p-1 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {/* בחירת נציג לקובץ זה (רק למנהלים) */}
                      {isManager && agents.length > 1 && (
                        <div className="mt-3">
                          <label className="block">
                            <span className="text-sm font-semibold text-indigo-night mb-2 block">
                              נציג לשיחה זו <span className="text-electric-coral">*</span>
                            </span>
                            <select
                              value={uploadedCalls.find(call => call.fileName === file.name)?.selectedAgent || ''}
                              onChange={(e) => updateCallAgent(index, e.target.value)}
                              className="w-full p-3 border-2 border-ice-gray rounded-lg focus:border-lemon-mint focus:outline-none transition-colors duration-200 text-indigo-night text-sm"
                              required
                            >
                              <option value="">בחר נציג...</option>
                              {agents.map((agent) => (
                                <option key={agent.id} value={agent.id}>
                                  {agent.full_name || 'נציג ללא שם'}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* בחירת סוג שיחה */}
          <div className="space-y-4">
            <label className="block">
              <span className="text-lg font-semibold text-indigo-night mb-3 block">
                סוג השיחה <span className="text-electric-coral">*</span>
              </span>
              
              <div className="relative" data-dropdown="call-type">
                <button
                  type="button"
                  onClick={() => setIsCallTypeDropdownOpen(!isCallTypeDropdownOpen)}
                  className={`
                    w-full p-4 text-right rounded-xl border-2 transition-all duration-200 flex items-center justify-between
                    ${callType 
                      ? 'border-lemon-mint bg-lemon-mint/5 text-indigo-night' 
                      : 'border-ice-gray hover:border-lemon-mint text-indigo-night/60'
                    }
                  `}
                >
                  <div className="flex items-center space-x-3">
                    {callType && (
                      <>
                        <span className="text-xl">
                          {CALL_TYPE_OPTIONS.find(option => option.value === callType)?.emoji}
                        </span>
                        <span className="font-medium">
                          {CALL_TYPE_OPTIONS.find(option => option.value === callType)?.label}
                        </span>
                      </>
                    )}
                    {!callType && <span>בחר סוג שיחה...</span>}
                  </div>
                  <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${
                    isCallTypeDropdownOpen ? 'rotate-180' : ''
                  }`} />
                </button>
                
                {isCallTypeDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-ice-gray shadow-xl z-50 py-2">
                    {CALL_TYPE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleCallTypeSelect(option.value);
                        }}
                        className="w-full p-4 text-right hover:bg-lemon-mint/10 transition-colors duration-200 flex items-center space-x-4"
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          <span className="text-xl">{option.emoji}</span>
                          <div className="text-right">
                            <div className="font-semibold text-indigo-night">{option.label}</div>
                            <div className="text-sm text-indigo-night/60">{option.description}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* בחירת נציג (למנהלים במצב שיחה בודדת) */}
          {agents.length > 1 && uploadMode === 'single' && (
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
          {agents.length > 1 && uploadMode === 'multiple' && files.length > 0 && (
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
                (uploadMode === 'single' ? !file : files.length === 0)
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
                    {uploadMode === 'single' 
                      ? 'התחל ניתוח 🚀' 
                      : `נתח ${files.length} שיחות 🚀`
                    }
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
              הבינה המלאכותית שלנו עובדת כעת על ניתוח מעמיק של השיחה
              <br />
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
              className="replayme-button-primary text-lg px-8 py-4"
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
                setFiles([]);
                setFileName(null);
                setCallType('');
                setAgentNotes('');
                setAnalysisNotes('');
                setProgress(0);
                setError(null);
                setSuccess(null);
              }}
              className="replayme-button-secondary text-lg px-8 py-4"
            >
              העלה שיחה נוספת
            </button>
          </div>
        </div>
      )}
    </div>
  )
}