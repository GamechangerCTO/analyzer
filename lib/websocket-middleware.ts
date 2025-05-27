import { NextRequest } from 'next/server';
import { WebSocketServer } from 'ws';
import { simulationWsServer } from './simulation-websocket-server';

// Global WebSocket server instance
let globalWss: WebSocketServer | null = null;

export function initializeWebSocketServer() {
  if (!globalWss) {
    globalWss = new WebSocketServer({ noServer: true });
    
    globalWss.on('connection', (ws, request) => {
      console.log('New WebSocket connection established');
      
      // Parse the URL to get simulation ID and user ID
      const url = new URL(request.url!, `http://${request.headers.host}`);
      const pathParts = url.pathname.split('/');
      const simulationId = pathParts[pathParts.indexOf('simulation-ws') + 1];
      const userId = url.searchParams.get('userId');

      if (!simulationId || !userId) {
        ws.close(1002, 'Invalid parameters');
        return;
      }

      // Handle the connection with our simulation server
      simulationWsServer.handleConnection(ws, simulationId, userId);
    });

    console.log('WebSocket server initialized');
  }
  return globalWss;
}

export function getWebSocketServer() {
  return globalWss;
}

// Handle WebSocket upgrade requests
export function handleWebSocketUpgrade(request: NextRequest) {
  const wss = initializeWebSocketServer();
  
  // In a real deployment, you'd need to handle the upgrade differently
  // This is a simplified version for development
  return new Response('WebSocket upgrade handled', { 
    status: 101,
    headers: {
      'Upgrade': 'websocket',
      'Connection': 'Upgrade'
    }
  });
} 