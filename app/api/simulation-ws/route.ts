import { NextRequest } from 'next/server';
import { WebSocketServer } from 'ws';

// Global WebSocket server instance
let wss: WebSocketServer | null = null;

export async function GET(request: NextRequest) {
  // Initialize WebSocket server if not already running
  if (!wss) {
    wss = new WebSocketServer({ noServer: true });
    console.log('WebSocket server initialized');
  }

  // Handle upgrade request
  const upgrade = request.headers.get('upgrade');
  if (upgrade !== 'websocket') {
    return new Response('Expected Upgrade: websocket', { status: 426 });
  }

  return new Response('WebSocket server ready', { status: 200 });
}

export async function POST(request: NextRequest) {
  try {
    const { simulationId, action } = await request.json();

    if (action === 'start') {
      // Initialize simulation session
      return Response.json({ 
        status: 'ready',
        simulationId,
        websocketUrl: `/api/simulation-ws/${simulationId}`
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Simulation WS error:', error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
} 