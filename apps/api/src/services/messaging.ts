// Reliable WhatsApp delivery: retries, template fallback, undeliverable flags (§12.1–12.4).
import { whatsapp } from '../adapters/whatsapp.js';
import { db } from '../db.js';

const MAX_ATTEMPTS = 3;
const FAILURE_FLAG_THRESHOLD = 3;
const BACKOFF_MS = [500, 2000, 8000]; // Exponential backoff between retries

export interface SendOptions {
  templateName?: string; // pre-approved template for outside-24h sends
  conversationId?: string;
  buttons?: { id: string; title: string }[];
  imageUrl?: string;
}

/**
 * Send with retry (§12.1). If Meta rejects free-form text outside the 24h
 * window, fall back to the pre-approved template (§12.4). Persistent failure
 * flags the conversation undeliverable after repeated attempts (§12.2).
 */
export async function sendReliable(to: string, body: string, opts: SendOptions = {}): Promise<{ ok: boolean; error?: string }> {
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let res = opts.imageUrl
      ? await whatsapp.sendImage(to, opts.imageUrl, body)
      : opts.buttons
        ? await whatsapp.sendInteractiveButtons(to, body, opts.buttons)
        : opts.templateName
          ? await whatsapp.sendTemplate(to, opts.templateName, body)
          : await whatsapp.sendText(to, body);

    if (!res.ok && res.error === 'template_required' && opts.templateName) {
      // §12.4: fall back to pre-approved template.
      res = await whatsapp.sendTemplate(to, opts.templateName, body);
    }
    if (res.ok) {
      await logOutbound(opts.conversationId, to, body);
      await resetFailures(to);
      return { ok: true };
    }
    lastError = res.error;
    if (res.error === 'undelivered' || res.error === 'template_required') break; // retrying won't help
    if (attempt < MAX_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, BACKOFF_MS[attempt - 1] ?? BACKOFF_MS[BACKOFF_MS.length - 1]));
    }
  }

  await recordFailure(to, opts.conversationId);
  return { ok: false, error: lastError };
}

async function logOutbound(conversationId: string | undefined, to: string, body: string) {
  if (!conversationId) {
    const conv = await db.conversation.findFirst({
      where: { customer: { phone: to } },
      orderBy: { lastMsgAt: 'desc' },
    });
    conversationId = conv?.id;
  }
  if (!conversationId) return;
  await db.message.create({ data: { conversationId, direction: 'outbound', kind: 'text', body } });
  await db.conversation.update({ where: { id: conversationId }, data: { lastMsgAt: new Date() } });
}

async function recordFailure(to: string, conversationId?: string) {
  const conv = conversationId
    ? await db.conversation.findUnique({ where: { id: conversationId } })
    : await db.conversation.findFirst({ where: { customer: { phone: to } }, orderBy: { lastMsgAt: 'desc' } });
  if (!conv) return;
  const sendFailures = conv.sendFailures + 1;
  const undeliverable = sendFailures >= FAILURE_FLAG_THRESHOLD;
  await db.conversation.update({ where: { id: conv.id }, data: { sendFailures, undeliverable } });
}

async function resetFailures(to: string) {
  const conv = await db.conversation.findFirst({ where: { customer: { phone: to } }, orderBy: { lastMsgAt: 'desc' } });
  if (conv && (conv.sendFailures > 0 || conv.undeliverable)) {
    await db.conversation.update({ where: { id: conv.id }, data: { sendFailures: 0, undeliverable: false } });
  }
}
