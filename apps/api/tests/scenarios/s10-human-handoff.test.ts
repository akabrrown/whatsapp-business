// Scenario suite §10 — Human Handoff (7 scenarios).
import { describe, it, expect, beforeEach } from 'vitest';
import { db, resetDb, baseline, setNow, whatsapp, hub, resetRuntime } from '../helpers.js';
import { handleInbound, takeOver, releaseToBot } from '../../src/services/bot.js';

const PHONE = '233206666666';

async function conversationId() {
  const conv = await db.conversation.findFirst({ where: { customer: { phone: PHONE } } });
  return conv?.id;
}

describe('§10 Human Handoff', () => {
  beforeEach(async () => {
    setNow('2026-08-17T10:00:00Z');
    resetRuntime();
    await resetDb(db);
    await baseline(db);
  });

  it('Scenario §10.1 — explicit human request: immediate handoff', async () => {
    const reply = await handleInbound({ phone: PHONE, text: 'Can I speak to someone?' });
    expect(reply.handoff).toBe(true);
    expect(whatsapp.lastTo(PHONE)?.body).toContain('Let me get Kukua for you');
    const conv = await db.conversation.findFirst({ where: { customer: { phone: PHONE } } });
    expect(conv?.status).toBe('NEEDS_HUMAN');
    expect(hub.log.some((e) => e.type === 'inbox.alert')).toBe(true);
  });

  it('Scenario §10.2 — three unrecognized messages: handoff on the third', async () => {
    const r1 = await handleInbound({ phone: PHONE, text: 'flurble' });
    const r2 = await handleInbound({ phone: PHONE, text: 'grumble wumble' });
    expect(r1.handoff).toBeFalsy();
    expect(r2.handoff).toBeFalsy();
    expect(whatsapp.lastTo(PHONE)?.body).toContain("didn't catch that");
    const r3 = await handleInbound({ phone: PHONE, text: 'zzz qqq' });
    expect(r3.handoff).toBe(true);
    const conv = await db.conversation.findFirst({ where: { customer: { phone: PHONE } } });
    expect(conv?.status).toBe('NEEDS_HUMAN');
    expect(hub.log.some((e) => e.type === 'inbox.alert' && (e.payload as { reason?: string }).reason === '3 unrecognized messages')).toBe(true);
  });

  it('Scenario §10.3 — voice note: cannot parse, auto-handoff', async () => {
    const reply = await handleInbound({ phone: PHONE, kind: 'voice' });
    expect(reply.handoff).toBe(true);
    expect(whatsapp.lastTo(PHONE)?.body).toContain("can't listen to voice notes");
  });

  it('Scenario §10.4 — high-value cart (≥ GHS 1,000): VIP alert, customer sees nothing different', async () => {
    await handleInbound({ phone: PHONE, text: 'hi' });
    await handleInbound({ phone: PHONE, text: 'add 1' }); // GHS 340
    await handleInbound({ phone: PHONE, text: 'add 1' }); // GHS 680
    const reply = await handleInbound({ phone: PHONE, text: 'add 1' }); // GHS 1,020 → VIP
    expect(reply.handoff).toBeFalsy(); // bot continues normally
    expect(reply.replies[0]).toContain('Added'); // no visible change for the customer
    const vipAlert = hub.log.find((e) => e.type === 'alert.vip');
    expect(vipAlert).toBeDefined();
    expect((vipAlert!.payload as { subtotalP: number }).subtotalP).toBe(102000);
  });

  it('Scenario §10.5 — negotiation attempt: handed off, bot never negotiates', async () => {
    const reply = await handleInbound({ phone: PHONE, text: 'Can you do a discount on these?' });
    expect(reply.handoff).toBe(true);
    expect(whatsapp.lastTo(PHONE)?.body).toContain('Kukua');
    const conv = await db.conversation.findFirst({ where: { customer: { phone: PHONE } } });
    expect(conv?.status).toBe('NEEDS_HUMAN');
  });

  it('Scenario §10.6 — staff takes over: bot goes silent', async () => {
    await handleInbound({ phone: PHONE, text: 'hi' });
    const convId = (await conversationId())!;
    await takeOver(convId);
    whatsapp.clear!();
    const reply = await handleInbound({ phone: PHONE, text: 'hello? anyone there?' });
    expect(reply.replies).toHaveLength(0); // bot stays silent
    expect(whatsapp.outbox).toHaveLength(0);
    const conv = await db.conversation.findUniqueOrThrow({ where: { id: convId } });
    expect(conv.status).toBe('HUMAN');
  });

  it('Scenario §10.7 — staff releases: bot resumes automated handling', async () => {
    await handleInbound({ phone: PHONE, text: 'hi' });
    const convId = (await conversationId())!;
    await takeOver(convId);
    await releaseToBot(convId);
    const reply = await handleInbound({ phone: PHONE, text: 'menu' });
    expect(reply.replies.length).toBeGreaterThan(0); // bot picks up naturally
    const conv = await db.conversation.findUniqueOrThrow({ where: { id: convId } });
    expect(conv.status).toBe('BOT');
  });
});
