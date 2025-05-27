import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const simulationId = params.id;
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return new Response('Missing userId parameter', { status: 400 });
    }

    // Initialize Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get simulation data
    const { data: simulation, error } = await supabase
      .from('simulations')
      .select('*')
      .eq('id', simulationId)
      .eq('agent_id', userId)
      .single();

    if (error || !simulation) {
      console.error('Simulation query error:', error);
      return new Response(JSON.stringify({ 
        error: 'Simulation not found or unauthorized' 
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create a readable stream for Server-Sent Events
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection message
        const welcomeMessage = {
          type: 'welcome',
          simulation: {
            id: simulation.id,
            customerType: simulation.customer_type,
            difficulty: simulation.difficulty_level,
            scenario: simulation.scenario_description
          }
        };
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(welcomeMessage)}\n\n`));

        // Keep connection alive
        const keepAlive = setInterval(() => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'ping' })}\n\n`));
        }, 30000);

        // Cleanup function
        setTimeout(() => {
          clearInterval(keepAlive);
          controller.close();
        }, 600000); // Close after 10 minutes
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    });

  } catch (error) {
    console.error('Error in simulation GET route:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const simulationId = params.id;
    const body = await request.json();
    const { action, userId, audioData } = body;

    console.log('POST request received:', { simulationId, action, userId });

    // Initialize Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    switch (action) {
      case 'connect':
        // Simple connection check
        return Response.json({ 
          success: true, 
          message: 'Connected successfully' 
        });

      case 'start_simulation':
        // Update simulation status
        const { error: updateError } = await supabase
          .from('simulations')
          .update({ 
            status: 'in_progress',
            started_at: new Date().toISOString()
          })
          .eq('id', simulationId);

        if (updateError) {
          console.error('Error updating simulation:', updateError);
          return Response.json({ 
            success: false,
            error: 'Failed to start simulation' 
          }, { status: 500 });
        }

        return Response.json({ 
          success: true, 
          message: 'Simulation started successfully' 
        });

      case 'send_audio':
        // Handle audio data (for now, just acknowledge)
        // TODO: Implement OpenAI Realtime API integration
        console.log('Audio data received for simulation:', simulationId);
        
        // Simulate a customer response after a delay
        setTimeout(async () => {
          // This would normally be handled by OpenAI Realtime API
          // For now, we'll just log it
          console.log('Would send audio response here');
        }, 1000);

        return Response.json({ 
          success: true, 
          message: 'Audio received and processed' 
        });

      case 'end_simulation':
        // End simulation
        await supabase
          .from('simulations')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', simulationId);

        // Award coins
        await awardCoins(supabase, userId, 50, 'simulation_completed');

        return Response.json({ 
          success: true, 
          message: 'Simulation completed',
          coinsAwarded: 50
        });

      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in simulation POST route:', error);
    return Response.json({ 
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function awardCoins(supabase: any, userId: string, amount: number, reason: string) {
  try {
    // Add transaction
    await supabase
      .from('coin_transactions')
      .insert({
        agent_id: userId,
        amount,
        transaction_type: 'earned',
        description: reason,
        created_at: new Date().toISOString()
      });

    // Update user's total coins
    const { data: currentCoins } = await supabase
      .from('agent_coins')
      .select('total_coins')
      .eq('agent_id', userId)
      .single();

    const newTotal = (currentCoins?.total_coins || 0) + amount;

    await supabase
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