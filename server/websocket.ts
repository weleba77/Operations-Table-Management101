import { Server as HttpServer } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { db } from './db.ts';

let wss: WebSocketServer | null = null;
const clients = new Set<WebSocket>();

export function initWebSocketServer(server: HttpServer): WebSocketServer {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    clients.add(ws);

    // Send initial snapshot on connection
    const snapshot = {
      type: 'init',
      data: {
        restaurant: db.getData().restaurant,
        zones: db.getData().zones,
        tables: db.getData().tables,
        alerts: db.getData().alerts,
        queue: db.getData().queue,
        cameras: db.getData().cameras,
        staff: db.getData().staff,
        settings: db.getData().settings,
        recentEvents: db.getData().events.slice(0, 20),
      },
    };

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(snapshot));
    }

    ws.on('message', (message: string) => {
      try {
        const parsed = JSON.parse(message.toString());
        if (parsed.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        }
      } catch {
        // ignore malformed client message
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
    });

    ws.on('error', () => {
      clients.delete(ws);
    });
  });

  return wss;
}

export function broadcast(eventType: string, payload: unknown): void {
  if (!wss || clients.size === 0) return;
  const message = JSON.stringify({ type: eventType, data: payload, timestamp: Date.now() });

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch (err) {
        console.warn('Failed broadcasting to client', err);
      }
    }
  }
}
