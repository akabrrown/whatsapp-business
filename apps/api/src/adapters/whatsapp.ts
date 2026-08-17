// WhatsApp messaging adapter — Meta Cloud API + in-process simulator.
// Env switch: WHATSAPP_MODE=sim|real.
import { config } from '../config.js';
import { now } from '../clock.js';

export interface OutboundMessage {
  to: string;
  body: string;
  template?: boolean;
  sentAt: string;
}

export interface WhatsAppSender {
  sendText(to: string, body: string): Promise<{ ok: boolean; error?: string }>;
  sendTemplate(to: string, templateName: string, body: string): Promise<{ ok: boolean; error?: string }>;
}

// ---- Real adapter (Meta Cloud API) --------------------------------------
export class MetaSender implements WhatsAppSender {
  private url() {
    return `https://graph.facebook.com/v20.0/${config.whatsapp.phoneNumberId}/messages`;
  }
  private headers() {
    return {
      Authorization: `Bearer ${config.whatsapp.accessToken}`,
      'Content-Type': 'application/json',
    };
  }
  private async post(payload: Record<string, unknown>) {
    try {
      const res = await fetch(this.url(), {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        return { ok: false as const, error: err?.error?.message ?? `meta_error_${res.status}` };
      }
      return { ok: true as const };
    } catch {
      // §13.3 — Meta outage: send fails, caller retries/flags.
      return { ok: false as const, error: 'meta_unreachable' };
    }
  }
  sendText(to: string, body: string) {
    return this.post({ messaging_product: 'whatsapp', to, type: 'text', text: { body } });
  }
  sendTemplate(to: string, templateName: string, body: string) {
    return this.post({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: { name: templateName, language: { code: 'en' }, components: [{ type: 'body', parameters: [{ type: 'text', text: body }] }] },
    });
  }
}

// ---- Simulator -----------------------------------------------------------
export class SimSender implements WhatsAppSender {
  outbox: OutboundMessage[] = [];
  /** Numbers whose sends always fail (blocked business number, §12.2). */
  blocked = new Set<string>();
  /** Numbers whose sends fail with API errors (§12.1). */
  failing = new Set<string>();
  /** Simulate §13.3 platform outage. */
  outage = false;
  /** Reject non-template sends (simulates 24h-window template enforcement, §12.4). */
  enforceTemplateWindow = false;
  outsideWindow = new Set<string>();

  async sendText(to: string, body: string) {
    if (this.outage) return { ok: false, error: 'meta_unreachable' };
    if (this.blocked.has(to)) return { ok: false, error: 'undelivered' };
    if (this.failing.has(to)) return { ok: false, error: 'api_error' };
    if (this.enforceTemplateWindow && this.outsideWindow.has(to)) {
      // §12.4 — free-form text outside 24h window is rejected by Meta.
      return { ok: false, error: 'template_required' };
    }
    this.outbox.push({ to, body, sentAt: now().toISOString() });
    return { ok: true };
  }

  async sendTemplate(to: string, _templateName: string, body: string) {
    if (this.outage) return { ok: false, error: 'meta_unreachable' };
    if (this.blocked.has(to)) return { ok: false, error: 'undelivered' };
    if (this.failing.has(to)) return { ok: false, error: 'api_error' };
    this.outbox.push({ to, body, template: true, sentAt: now().toISOString() });
    return { ok: true };
  }

  // helpers for tests/local console
  lastTo(to: string): OutboundMessage | undefined {
    return [...this.outbox].reverse().find((m) => m.to === to);
  }
  clear() {
    this.outbox = [];
  }
}

export const whatsapp: WhatsAppSender & Partial<SimSender> =
  config.whatsapp.mode === 'real' ? new MetaSender() : new SimSender();

/** Build the wa.me deep link used by the website handoff (§4.7). */
export function waDeepLink(text: string): string {
  return `https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(text)}`;
}
