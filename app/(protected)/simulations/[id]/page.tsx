'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
// Using standard HTML elements for buttons and cards
import { Mic, MicOff, Square, Play, Volume2, VolumeX } from 'lucide-react';

interface Simulation {
  id: string;
  customer_type: string;
  difficulty_level: string;
  scenario_description: string;
  status: string;
  created_at: string;
}

interface DialogueItem {
  speaker: 'agent' | 'customer';
  content: string;
  timestamp: string;
}

export default function SimulationPage() {
  const params = useParams();
  const router = useRouter();
  const simulationId = params.id as string;
  
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [dialogue, setDialogue] = useState<DialogueItem[]>([]);
  const [connectionStatus, setConnectionStatus] = useState('מתחבר...');
  
  const wsRef = useRef<EventSource | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioChunksRef = useRef<Uint8Array[]>([]);
  
  const supabase = createClient();

  useEffect(() => {
    loadSimulation();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [simulationId]);

  const loadSimulation = async () => {
    try {
      const { data, error } = await supabase
        .from('simulations')
        .select('*')
        .eq('id', simulationId)
        .single();

      if (error) throw error;
      setSimulation(data);
    } catch (error) {
      console.error('Error loading simulation:', error);
      router.push('/simulations');
    } finally {
      setIsLoading(false);
    }
  };

  const connectWebSocket = async () => {
    try {
      setConnectionStatus('מתחבר לשרת...');
      
      // Get user session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('לא מחובר');
      }

      // Instead of WebSocket, use simple connection check
      const response = await fetch(`/api/simulation-ws/${simulationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'connect',
          userId: session.user.id
        })
      });

      const result = await response.json();
      console.log('Connection response:', result);

      if (response.ok && result.success) {
        setIsConnected(true);
        setConnectionStatus('מחובר');
        console.log('Connection established');
        
        // Send welcome message
        handleWebSocketMessage({
          type: 'welcome',
          simulation: {
            id: simulationId,
            customerType: simulation?.customer_type,
            difficulty: simulation?.difficulty_level,
            scenario: simulation?.scenario_description
          }
        });
      } else {
        console.error('Connection failed:', result);
        throw new Error(result.error || 'Failed to connect');
      }

    } catch (error) {
      console.error('Error connecting:', error);
      setConnectionStatus('שגיאה בחיבור');
    }
  };

  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'welcome':
        console.log('Welcome message received:', message);
        break;
        
      case 'simulation_started':
        setConnectionStatus('הסימולציה החלה');
        addDialogueItem('customer', 'הלקוח מחובר ומוכן לשיחה');
        break;
        
      case 'audio_response':
        playAudioResponse(message.audio);
        break;
        
      case 'response_complete':
        setIsPlaying(false);
        break;
        
      case 'simulation_ended':
        setConnectionStatus('הסימולציה הושלמה');
        addDialogueItem('customer', `הסימולציה הושלמה! ${message.message}`);
        setTimeout(() => router.push('/simulations'), 3000);
        break;
        
      case 'error':
        setConnectionStatus(`שגיאה: ${message.message}`);
        break;
        
      default:
        console.log('Unknown message type:', message.type);
    }
  };

  const addDialogueItem = (speaker: 'agent' | 'customer', content: string) => {
    const newItem: DialogueItem = {
      speaker,
      content,
      timestamp: new Date().toISOString()
    };
    setDialogue(prev => [...prev, newItem]);
  };

  const startSimulation = async () => {
    if (!isConnected) {
      await connectWebSocket();
    }
    
    // Start the simulation
    await sendAction('start_simulation');
  };

  const sendAction = async (action: string, data?: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('לא מחובר');
      }

      const response = await fetch(`/api/simulation-ws/${simulationId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          userId: session.user.id,
          ...data
        }),
      });

      const result = await response.json();
      console.log('Action response:', { action, result });
      
      if (result.success) {
        if (action === 'start_simulation') {
          setConnectionStatus('הסימולציה החלה');
          addDialogueItem('customer', 'הלקוח מוכן לשיחה - התחל לדבר!');
        } else if (action === 'end_simulation') {
          setConnectionStatus('הסימולציה הושלמה');
          addDialogueItem('customer', `הסימולציה הושלמה! קיבלת ${result.coinsAwarded || 0} מטבעות.`);
          setTimeout(() => router.push('/simulations'), 3000);
        }
      } else {
        console.error('Action failed:', result);
        setConnectionStatus(`שגיאה: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error sending action:', error);
      setConnectionStatus('שגיאה בשליחת פעולה');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true 
        } 
      });

      // Create AudioContext for processing
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          const arrayBuffer = await event.data.arrayBuffer();
          const audioData = new Uint8Array(arrayBuffer);
          audioChunksRef.current.push(audioData);
          
          // Convert to base64 and send
          const base64Audio = btoa(String.fromCharCode.apply(null, Array.from(audioData)));
          if (isConnected) {
            await sendAction('send_audio', { audioData: base64Audio });
          }
        }
      };

      mediaRecorder.start(100); // Capture every 100ms
      setIsRecording(true);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      setConnectionStatus('שגיאה בגישה למיקרופון');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const playAudioResponse = async (base64Audio: string) => {
    try {
      if (isMuted) return;
      
      setIsPlaying(true);
      
      // Decode base64 audio
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create audio context if not exists
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const audioContext = audioContextRef.current;
      const audioBuffer = await audioContext.decodeAudioData(bytes.buffer);
      
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();
      
      source.onended = () => {
        setIsPlaying(false);
      };

    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
    }
  };

  const endSimulation = async () => {
    if (isConnected) {
      await sendAction('end_simulation', {
        feedback: {
          rating: 5,
          comments: 'סימולציה הושלמה בהצלחה'
        }
      });
    }
    
    if (mediaRecorderRef.current) {
      stopRecording();
    }
  };

  const getCustomerTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'aggressive': 'אגרסיבי',
      'hesitant': 'מהסס',
      'technical': 'טכני',
      'emotional': 'רגשי',
      'business': 'עסקי',
      'time_pressured': 'בלחץ זמן'
    };
    return types[type] || type;
  };

  const getDifficultyLabel = (level: string) => {
    const levels: Record<string, string> = {
      'easy': 'קל',
      'medium': 'בינוני',
      'hard': 'קשה'
    };
    return levels[level] || level;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">טוען סימולציה...</div>
      </div>
    );
  }

  if (!simulation) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">סימולציה לא נמצאה</div>
      </div>
    );
  }

      return (
      <div className="container mx-auto p-6 max-w-4xl" dir="rtl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Simulation Info */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
              <h1 className="text-2xl font-bold mb-4">פרטי הסימולציה</h1>
              
              <div className="space-y-3">
                <div>
                  <span className="font-semibold text-gray-600">סוג לקוח:</span>
                  <div className="text-lg">{getCustomerTypeLabel(simulation.customer_type)}</div>
                </div>
                
                <div>
                  <span className="font-semibold text-gray-600">רמת קושי:</span>
                  <div className="text-lg">{getDifficultyLabel(simulation.difficulty_level)}</div>
                </div>
                
                <div>
                  <span className="font-semibold text-gray-600">תרחיש:</span>
                  <div className="text-sm bg-gray-50 p-3 rounded-lg mt-1">
                    {simulation.scenario_description}
                  </div>
                </div>
                
                <div>
                  <span className="font-semibold text-gray-600">סטטוס:</span>
                  <div className={`text-lg ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                    {connectionStatus}
                  </div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="bg-white shadow-lg rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">בקרת שיחה</h3>
              
              <div className="space-y-3">
                {!isConnected ? (
                  <button
                    onClick={startSimulation}
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center"
                  >
                    <Play className="mr-2 h-5 w-5" />
                    התחל סימולציה
                  </button>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <button
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center ${
                          isRecording 
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {isRecording ? (
                          <>
                            <MicOff className="mr-2 h-5 w-5" />
                            עצור הקלטה
                          </>
                        ) : (
                          <>
                            <Mic className="mr-2 h-5 w-5" />
                            התחל הקלטה
                          </>
                        )}
                      </button>
                      
                      <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        {isMuted ? (
                          <VolumeX className="h-5 w-5" />
                        ) : (
                          <Volume2 className="h-5 w-5" />
                        )}
                      </button>
                    </div>

                    <button
                      onClick={endSimulation}
                      className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
                    >
                      <Square className="mr-2 h-5 w-5" />
                      סיים סימולציה
                    </button>
                  </>
                )}
              </div>

              {isPlaying && (
                <div className="mt-4 text-center">
                  <div className="inline-flex items-center text-blue-600">
                    <Volume2 className="mr-2 h-4 w-4 animate-pulse" />
                    הלקוח מדבר...
                  </div>
                </div>
              )}

              {isRecording && (
                <div className="mt-4 text-center">
                  <div className="inline-flex items-center text-red-600">
                    <div className="w-3 h-3 bg-red-600 rounded-full mr-2 animate-pulse"></div>
                    מקליט...
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Dialogue */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow-lg rounded-lg p-6 h-96">
              <h3 className="text-lg font-semibold mb-4">היסטוריית השיחה</h3>
              
              <div className="h-80 overflow-y-auto space-y-3">
                {dialogue.length === 0 ? (
                  <div className="text-gray-500 text-center py-8">
                    השיחה עוד לא החלה...
                  </div>
                ) : (
                  dialogue.map((item, index) => (
                    <div
                      key={index}
                      className={`flex ${item.speaker === 'agent' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs p-3 rounded-lg ${
                          item.speaker === 'agent'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-800'
                        }`}
                      >
                        <div className="text-sm font-semibold mb-1">
                          {item.speaker === 'agent' ? 'אתה' : 'הלקוח'}
                        </div>
                        <div>{item.content}</div>
                        <div className="text-xs opacity-70 mt-1">
                          {new Date(item.timestamp).toLocaleTimeString('he-IL')}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
} 