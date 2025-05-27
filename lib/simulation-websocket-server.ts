import WebSocket from 'ws';
import { createClient } from '@supabase/supabase-js';

interface SimulationSession {
  id: string;
  clientWs: WebSocket;
  openaiWs: WebSocket | null;
  userId: string;
  simulationData: any;
  isActive: boolean;
}

export class SimulationWebSocketServer {
  private sessions: Map<string, SimulationSession> = new Map();
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async handleConnection(ws: WebSocket, simulationId: string, userId: string) {
    console.log(`New simulation connection: ${simulationId} for user ${userId}`);

    // Get simulation data from database
    const { data: simulation, error } = await this.supabase
      .from('simulations')
      .select('*')
      .eq('id', simulationId)
      .eq('agent_id', userId)
      .single();

    if (error || !simulation) {
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'סימולציה לא נמצאה או אין הרשאה' 
      }));
      ws.close();
      return;
    }

    // Create session
    const session: SimulationSession = {
      id: simulationId,
      clientWs: ws,
      openaiWs: null,
      userId,
      simulationData: simulation,
      isActive: false
    };

    this.sessions.set(simulationId, session);

    // Handle client messages
    ws.on('message', (data) => {
      this.handleClientMessage(session, data);
    });

    ws.on('close', () => {
      this.cleanup(simulationId);
    });

    ws.on('error', (error) => {
      console.error('Client WebSocket error:', error);
      this.cleanup(simulationId);
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'welcome',
      simulation: {
        id: simulation.id,
        customerType: simulation.customer_type,
        difficulty: simulation.difficulty_level,
        scenario: simulation.scenario_description
      }
    }));
  }

  private async handleClientMessage(session: SimulationSession, data: any) {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'start_simulation':
          await this.startSimulation(session);
          break;
          
        case 'audio_data':
          await this.forwardAudioToOpenAI(session, message.audio);
          break;
          
        case 'end_simulation':
          await this.endSimulation(session, message.feedback);
          break;
          
        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling client message:', error);
      session.clientWs.send(JSON.stringify({
        type: 'error',
        message: 'שגיאה בעיבוד ההודעה'
      }));
    }
  }

  private async startSimulation(session: SimulationSession) {
    try {
      // Connect to OpenAI Realtime API
      const openaiWs = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01', {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      });

      session.openaiWs = openaiWs;

      openaiWs.on('open', () => {
        console.log('Connected to OpenAI Realtime API');
        
        // Configure the session with our scenario
        const sessionConfig = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: this.buildInstructions(session.simulationData),
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            }
          }
        };

        openaiWs.send(JSON.stringify(sessionConfig));
        session.isActive = true;

        // Update simulation status in database
        this.supabase
          .from('simulations')
          .update({ 
            status: 'in_progress',
            started_at: new Date().toISOString()
          })
          .eq('id', session.id)
          .then();

        session.clientWs.send(JSON.stringify({
          type: 'simulation_started',
          message: 'הסימולציה החלה! אתה יכול להתחיל לדבר עכשיו.'
        }));
      });

      openaiWs.on('message', (data) => {
        this.handleOpenAIMessage(session, data);
      });

      openaiWs.on('error', (error) => {
        console.error('OpenAI WebSocket error:', error);
        session.clientWs.send(JSON.stringify({
          type: 'error',
          message: 'שגיאה בחיבור לשירות הקול'
        }));
      });

    } catch (error) {
      console.error('Error starting simulation:', error);
      session.clientWs.send(JSON.stringify({
        type: 'error',
        message: 'שגיאה בהתחלת הסימולציה'
      }));
    }
  }

  private buildInstructions(simulation: any): string {
    const customerTypes: Record<string, string> = {
      'aggressive': 'לקוח אגרסיבי ולא סבלני שצועק ומאיים',
      'hesitant': 'לקוח מהסס שצריך הרבה שכנוע ובטחון',
      'technical': 'לקוח טכני שדורש פרטים מדויקים ומידע מעמיק',
      'emotional': 'לקוח רגשי שמודאג ודורש אמפתיה והבנה',
      'business': 'לקוח עסקי מקצועי הפונה במיידי לתוצאה התחתונה',
      'time_pressured': 'לקוח בלחץ זמן שרוצה הכל מהר ובקצרה'
    };

    const difficultyLevels: Record<string, string> = {
      'easy': 'התנהג בצורה שיתופית יחסית',
      'medium': 'התנהג בצורה מאתגרת בינונית',
      'hard': 'התנהג בצורה קשה ומאתגרת מאוד'
    };

    return `אתה משחק תפקיד של ${customerTypes[simulation.customer_type] || 'לקוח רגיל'}.
    רמת הקושי: ${difficultyLevels[simulation.difficulty_level] || 'בינונית'}.
    
    תרחיש: ${simulation.scenario_description}
    
    הנחיות:
    1. דבר בעברית בלבד
    2. התנהג כלקוח אמיתי עם הרגשות והתנהגות המתאימים לסוג הלקוח
    3. אל תחשוף שאתה AI או שזו סימולציה
    4. תגיב באופן טבעי לדברים שהנציג אומר
    5. אם הנציג מטפל בך טוב, תהיה יותר שיתופי
    6. אם הנציג לא מטפל בך טוב, תהיה יותר קשה
    7. השיחה צריכה להמשך בין 3-5 דקות
    8. בסוף, תסכם איך הרגשת מהטיפול שקיבלת`;
  }

  private handleOpenAIMessage(session: SimulationSession, data: any) {
    try {
      const message = JSON.parse(data.toString());
      
      // Forward audio responses to client
      if (message.type === 'response.audio.delta' && message.delta) {
        session.clientWs.send(JSON.stringify({
          type: 'audio_response',
          audio: message.delta
        }));
      }
      
      // Handle conversation events
      if (message.type === 'conversation.item.created') {
        // Log conversation item for later analysis
        this.logConversationItem(session.id, message.item);
      }

      if (message.type === 'response.done') {
        // Response completed
        session.clientWs.send(JSON.stringify({
          type: 'response_complete'
        }));
      }

    } catch (error) {
      console.error('Error handling OpenAI message:', error);
    }
  }

  private async forwardAudioToOpenAI(session: SimulationSession, audioData: string) {
    if (!session.openaiWs || !session.isActive) {
      return;
    }

    // Forward audio data to OpenAI
    const audioMessage = {
      type: 'input_audio_buffer.append',
      audio: audioData
    };

    session.openaiWs.send(JSON.stringify(audioMessage));

    // Commit the audio buffer
    session.openaiWs.send(JSON.stringify({
      type: 'input_audio_buffer.commit'
    }));
  }

  private async logConversationItem(simulationId: string, item: any) {
    try {
      await this.supabase
        .from('simulation_dialogues')
        .insert({
          simulation_id: simulationId,
          speaker: item.role === 'user' ? 'agent' : 'customer',
          content: item.content?.[0]?.text || '',
          audio_data: item.content?.[0]?.audio || null,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging conversation item:', error);
    }
  }

  private async endSimulation(session: SimulationSession, feedback?: any) {
    try {
      // Close OpenAI connection
      if (session.openaiWs) {
        session.openaiWs.close();
        session.openaiWs = null;
      }

      session.isActive = false;

      // Update simulation in database
      await this.supabase
        .from('simulations')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          feedback_data: feedback || null
        })
        .eq('id', session.id);

      // Award coins for completing simulation
      await this.awardCoins(session.userId, 50, 'simulation_completed');

      session.clientWs.send(JSON.stringify({
        type: 'simulation_ended',
        message: 'הסימולציה הושלמה! קיבלת 50 מטבעות.',
        coinsAwarded: 50
      }));

    } catch (error) {
      console.error('Error ending simulation:', error);
    }
  }

  private async awardCoins(userId: string, amount: number, reason: string) {
    try {
      // Add transaction
      await this.supabase
        .from('coin_transactions')
        .insert({
          agent_id: userId,
          amount,
          transaction_type: 'earned',
          description: reason,
          created_at: new Date().toISOString()
        });

      // Update user's total coins
      const { data: currentCoins } = await this.supabase
        .from('agent_coins')
        .select('total_coins')
        .eq('agent_id', userId)
        .single();

      const newTotal = (currentCoins?.total_coins || 0) + amount;

      await this.supabase
        .from('agent_coins')
        .upsert({
          agent_id: userId,
          total_coins: newTotal,
          updated_at: new Date().toISOString()
        });

    } catch (error) {
      console.error('Error awarding coins:', error);
    }
  }

  private cleanup(simulationId: string) {
    const session = this.sessions.get(simulationId);
    if (session) {
      if (session.openaiWs) {
        session.openaiWs.close();
      }
      this.sessions.delete(simulationId);
      console.log(`Cleaned up session: ${simulationId}`);
    }
  }
}

// Singleton instance
export const simulationWsServer = new SimulationWebSocketServer(); 