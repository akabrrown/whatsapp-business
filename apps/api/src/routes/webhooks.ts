// Webhook endpoints — Paystack (HMAC-verified) + Meta WhatsApp (verify handshake + inbound).
import { Router, raw } from 'express';
import crypto from 'node:crypto';
import { handlePaystackWebhook } from '../services/payments.js';
import { handleInbound } from '../services/bot.js';
import { config } from '../config.js';

export const webhooks = Router();

// Raw body is REQUIRED for Paystack HMAC verification (§14.3).
webhooks.post('/paystack', raw({ type: '*/*' }), async (req, res) => {
  const rawBody = req.body.toString('utf8');
  const signature = req.headers['x-paystack-signature'] as string | undefined;
  const outcome = await handlePaystackWebhook(rawBody, signature);
  res.status(outcome.status).json(outcome.body);
});

// Meta webhook verification handshake.
webhooks.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === config.whatsapp.verifyToken) {
    res.status(200).send(String(challenge));
  } else {
    res.status(403).send('forbidden');
  }
});

// Meta inbound message webhook → bot engine. Always ACK 200 fast (§12.5).
// Uses raw body for X-Hub-Signature-256 verification in real mode (§14.3).
const metaRaw = raw({ type: 'application/json' });
webhooks.post('/whatsapp', metaRaw, async (req, res) => {
  // §14 — verify Meta signature in real mode
  if (config.whatsapp.mode === 'real' && config.whatsapp.appSecret) {
    const sig = req.headers['x-hub-signature-256'] as string | undefined;
    const rawBody = req.body.toString('utf8');
    const expected = `sha256=${crypto.createHmac('sha256', config.whatsapp.appSecret).update(rawBody).digest('hex')}`;
    if (!sig || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return res.status(401).json({ ok: false, error: 'invalid_signature' });
    }
  }

  try {
    const rawStr = req.body.toString('utf8');
    const body = JSON.parse(rawStr);
    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0]?.value;
    const msg = change?.messages?.[0];
    if (msg) {
      const phone: string = msg.from;
      if (msg.type === 'audio') {
        await handleInbound({ phone, kind: 'voice' }); // §10.3
      } else if (msg.type === 'location') {
        await handleInbound({ phone, kind: 'location', lat: msg.location?.latitude, lng: msg.location?.longitude }); // §7.2
      } else {
        await handleInbound({ phone, text: msg.text?.body ?? '' });
      }
    }
  } catch (e) {
    console.error('whatsapp webhook error', e);
  }
  res.status(200).json({ ok: true });
});

/** Local sim console — inject an inbound WhatsApp message without Meta (dev mode only). */
if (config.whatsapp.mode === 'sim') {
  webhooks.post('/whatsapp/sim-inbound', async (req, res) => {
    const { phone, text, kind, lat, lng } = req.body as { phone?: string; text?: string; kind?: 'text' | 'voice' | 'location'; lat?: number; lng?: number };
    if (!phone) return res.status(400).json({ ok: false, error: 'phone required' });
    const result = await handleInbound({ phone, text, kind: kind ?? 'text', lat, lng });
    res.json({ ok: true, result });
  });
}
