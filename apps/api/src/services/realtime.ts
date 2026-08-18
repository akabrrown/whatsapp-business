// WebSocket hub: live stock pushes to the storefront (§6.5) and
// order/inbox/low-stock/stale alerts to the admin dashboard (§8.6, §10.2, §11.3).
import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'node:http';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

type Channel = 'web' | 'admin';

interface Client {
  ws: WebSocket;
  channels: Set<Channel>;
}

class RealtimeHub {
  private clients = new Set<Client>();
  /** Ring buffer for recent broadcasts (bounded, for diagnostics/tests). */
  log: { channel: Channel; type: string; payload: unknown; at: string }[] = [];
  private static readonly LOG_CAP = 500;

  attach(server: Server) {
    const wss = new WebSocketServer({ server, path: '/ws' });
    wss.on('connection', (ws, req) => {
      const params = new URL(req.url ?? '/', 'http://x').searchParams;
      const channel = (params.get('channel') as Channel) ?? 'web';

      // §11: admin channel requires a valid admin JWT. Web channel stays open.
      if (channel === 'admin') {
        const token = params.get('token') ?? '';
        try {
          jwt.verify(token, config.jwtSecret);
        } catch {
          ws.send(JSON.stringify({ type: 'error', error: 'unauthorized' }));
          ws.close(4401, 'unauthorized');
          return;
        }
      }

      const client: Client = { ws, channels: new Set([channel === 'admin' ? 'admin' : 'web']) };
      this.clients.add(client);
      ws.on('close', () => this.clients.delete(client));
      ws.send(JSON.stringify({ type: 'hello', channel }));
    });

    // L2: WS ping/pong keepalive to clean up dead connections
    setInterval(() => {
      for (const c of this.clients) {
        if (c.ws.readyState !== WebSocket.OPEN) {
          this.clients.delete(c);
          continue;
        }
        c.ws.ping();
      }
    }, 30_000).unref();
  }

  broadcast(channel: Channel, type: string, payload: unknown) {
    const msg = JSON.stringify({ type, payload });
    this.log.push({ channel, type, payload, at: new Date().toISOString() });
    if (this.log.length > RealtimeHub.LOG_CAP) this.log.splice(0, this.log.length - RealtimeHub.LOG_CAP);
    for (const c of this.clients) {
      if (c.channels.has(channel) && c.ws.readyState === WebSocket.OPEN) {
        c.ws.send(msg);
      }
    }
  }

  broadcastWeb(type: string, payload: unknown) {
    this.broadcast('web', type, payload);
  }
  broadcastAdmin(type: string, payload: unknown) {
    this.broadcast('admin', type, payload);
  }
}

export const hub = new RealtimeHub();
