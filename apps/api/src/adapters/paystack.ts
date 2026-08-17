// Paystack adapter — real REST integration + in-process simulator.
// Env switch: PAYSTACK_MODE=sim|real (see src/config.ts).
import crypto from 'node:crypto';
import { config } from '../config.js';

export interface PaystackInitInput {
  email: string;
  amountP: number;
  reference: string;
  metadata?: Record<string, unknown>;
}
export interface PaystackInitResult {
  ok: boolean;
  authorizationUrl?: string;
  error?: string;
}

export interface PaystackAdapter {
  initialize(input: PaystackInitInput): Promise<PaystackInitResult>;
  verify(reference: string): Promise<{ status: 'success' | 'failed' | 'pending'; amountP: number; channel: string }>;
  refund(reference: string, amountP: number): Promise<{ ok: boolean; error?: string }>;
  /** HMAC-SHA512 signature for outgoing/verification use (§14.3). */
  sign(rawBody: string): string;
}

// ---- Real adapter ------------------------------------------------------
export class RealPaystack implements PaystackAdapter {
  private base = 'https://api.paystack.co';
  private headers() {
    return {
      Authorization: `Bearer ${config.paystack.secretKey}`,
      'Content-Type': 'application/json',
    };
  }
  async initialize({ email, amountP, reference, metadata }: PaystackInitInput): Promise<PaystackInitResult> {
    try {
      const res = await fetch(`${this.base}/transaction/initialize`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          email,
          amount: amountP,
          reference,
          callback_url: config.paystack.callbackUrl,
          metadata,
        }),
      });
      const json = (await res.json()) as { status: boolean; data?: { authorization_url: string }; message?: string };
      if (!json.status || !json.data) return { ok: false, error: json.message ?? 'Paystack initialization failed' };
      return { ok: true, authorizationUrl: json.data.authorization_url };
    } catch (e) {
      // §13.1 — Paystack down: caller surfaces friendly message, no order created.
      return { ok: false, error: 'paystack_unreachable' };
    }
  }
  async verify(reference: string): Promise<{ status: 'success' | 'failed' | 'pending'; amountP: number; channel: string }> {
    const res = await fetch(`${this.base}/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: this.headers(),
    });
    const json = (await res.json()) as { data: { status: string; amount: number; channel: string } };
    const status: 'success' | 'failed' | 'pending' =
      json.data.status === 'success' ? 'success' : json.data.status === 'failed' ? 'failed' : 'pending';
    return { status, amountP: json.data.amount, channel: json.data.channel };
  }
  async refund(reference: string, amountP: number) {
    try {
      const res = await fetch(`${this.base}/refund`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ transaction: reference, amount: amountP }),
      });
      const json = (await res.json()) as { status: boolean; message?: string };
      return json.status ? { ok: true } : { ok: false, error: json.message };
    } catch {
      return { ok: false, error: 'paystack_unreachable' };
    }
  }
  sign(rawBody: string): string {
    return crypto.createHmac('sha512', config.paystack.webhookSecret).update(rawBody).digest('hex');
  }
}

// ---- Simulator ----------------------------------------------------------
type Listener = (event: string, payload: Record<string, unknown>, signature: string) => Promise<void> | void;

export class SimPaystack implements PaystackAdapter {
  /** Set true to simulate §13.1 Paystack outage. */
  outage = false;
  initialized: PaystackInitInput[] = [];
  refunds: { reference: string; amountP: number }[] = [];
  private listener: Listener | null = null;
  private charges = new Map<string, { amountP: number; status: string; channel: string; metadata: Record<string, unknown> }>();

  onWebhook(fn: Listener) {
    this.listener = fn;
  }

  async initialize(input: PaystackInitInput): Promise<PaystackInitResult> {
    if (this.outage) return { ok: false, error: 'paystack_unreachable' };
    this.initialized.push(input);
    this.charges.set(input.reference, { amountP: input.amountP, status: 'pending', channel: 'card', metadata: input.metadata ?? {} });
    return { ok: true, authorizationUrl: `https://sim.paystack.local/pay/${input.reference}` };
  }

  async verify(reference: string) {
    const c = this.charges.get(reference);
    return {
      status: (c?.status as 'success' | 'failed' | 'pending') ?? 'pending',
      amountP: c?.amountP ?? 0,
      channel: c?.channel ?? 'card',
    };
  }

  async refund(reference: string, amountP: number) {
    if (this.outage) return { ok: false, error: 'paystack_unreachable' };
    this.refunds.push({ reference, amountP });
    return { ok: true };
  }

  sign(rawBody: string): string {
    return crypto.createHmac('sha512', config.paystack.webhookSecret).update(rawBody).digest('hex');
  }

  // Test/local helpers: drive the webhook flow exactly like Paystack would.
  setChannel(reference: string, channel: string) {
    const c = this.charges.get(reference);
    if (c) c.channel = channel;
  }

  async emitChargeSuccess(reference: string, opts?: { badSignature?: boolean }) {
    const c = this.charges.get(reference);
    if (!c) throw new Error(`sim: unknown reference ${reference}`);
    c.status = 'success';
    const payload = {
      event: 'charge.success',
      data: { reference, amount: c.amountP, channel: c.channel, metadata: c.metadata },
    };
    const raw = JSON.stringify(payload);
    const sig = opts?.badSignature ? 'deadbeef'.repeat(16) : this.sign(raw);
    await this.listener?.('charge.success', payload, sig);
  }

  async emitChargeFailure(reference: string) {
    const c = this.charges.get(reference);
    if (!c) throw new Error(`sim: unknown reference ${reference}`);
    c.status = 'failed';
    const payload = { event: 'charge.failed', data: { reference, amount: c.amountP, channel: c.channel, metadata: c.metadata } };
    const raw = JSON.stringify(payload);
    await this.listener?.('charge.failed', payload, this.sign(raw));
  }
}

export const paystack: PaystackAdapter & Partial<SimPaystack> =
  config.paystack.mode === 'real' ? new RealPaystack() : new SimPaystack();
