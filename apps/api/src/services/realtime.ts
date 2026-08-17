// WebSocket hub — live stock pushes to the storefront (§6.5) and
// order/inbox/low-stock/stale alerts to the admin dashboard (§8.6, §10.2, §11.3).
import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'node:http';

type Channel = 'web' | 'admin';

interface Client {
  ws: WebSocket;
  channels: Set<Channel>;
}

class RealtimeHub {
  private clients = new Set<Client>();
  /** In sim mode/tests, captures every broadcast for assertions. */
  log: { channel: Channel; type: string; payload: unknown; at: string }[] = [];

  attach(server: Server) {
    const wss = new WebSocketServer({ server, path: '/ws' });
    wss.on('connection', (ws, req) => {
      const channel = (new URL(req.url ?? '/', 'http://x').searchParams.get('channel') as Channel) ?? 'web';
      const client: Client = { ws, channels: new Set([channel === 'admin' ? 'admin' : 'web']) };
      this.clients.add(client);
      ws.on('close', () => this.clients.delete(client));
      ws.send(JSON.stringify({ type: 'hello', channel }));
    });
  }

  broadcast(channel: Channel, type: string, payload: unknown) {
    const msg = JSON.stringify({ type, payload });
    this.log.push({ channel, type, payload, at: new Date().toISOString() });
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
