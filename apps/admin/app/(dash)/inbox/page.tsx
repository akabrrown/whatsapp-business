'use client';
// Inbox — two-panel WhatsApp console (§3.11): conversation list with status
// dots, full thread, take-over / release (§10.6, §10.7), send-as-Kukua.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, Hand, Send } from 'lucide-react';
import { apiFetch, subscribeAdminEvents } from '@/lib/api';
import { StatusPill } from '@/components/StatusPill';
import { ChatBubbles, type ChatMessage } from '@/components/ChatBubbles';

interface ConversationRow {
  id: string;
  status: string;
  failCount: number;
  undeliverable: boolean;
  lastMsgAt: string;
  customer: { name: string | null; phone: string };
  messages: { id: string; direction: string; body: string }[];
}

export default function InboxPage() {
  const [convs, setConvs] = useState<ConversationRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [thread, setThread] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadList = useCallback(async () => {
    const r = await apiFetch<{ conversations: ConversationRow[] }>('/api/admin/inbox');
    setConvs(r.conversations);
  }, []);

  const loadThread = useCallback(async (id: string) => {
    const r = await apiFetch<{ messages: ChatMessage[] }>(`/api/admin/inbox/${id}/messages`);
    setThread(r.messages);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, []);

  useEffect(() => {
    loadList().catch((e: Error) => setError(e.message));
    const off = subscribeAdminEvents((e) => {
      if (e.type === 'inbox.alert' || e.type === 'order.created') loadList().catch(() => {});
    });
    const poll = setInterval(() => loadList().catch(() => {}), 15_000);
    return () => {
      off();
      clearInterval(poll);
    };
  }, [loadList]);

  useEffect(() => {
    if (!selected) return;
    loadThread(selected).catch((e: Error) => setError(e.message));
    const poll = setInterval(() => loadThread(selected).catch(() => {}), 10_000);
    return () => clearInterval(poll);
  }, [selected, loadThread]);

  const current = convs.find((c) => c.id === selected);

  const convAction = async (path: 'take-over' | 'release') => {
    if (!selected) return;
    setError('');
    try {
      await apiFetch(`/api/admin/inbox/${selected}/${path}`, { method: 'POST' });
      await Promise.all([loadList(), loadThread(selected)]);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const send = async () => {
    if (!selected || !draft.trim()) return;
    setError('');
    try {
      await apiFetch(`/api/admin/inbox/${selected}/messages`, { method: 'POST', body: JSON.stringify({ body: draft.trim() }) });
      setDraft('');
      await loadThread(selected);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div>
      <h1 className="mb-5 font-serif text-2xl text-indigo">Inbox</h1>
      {error && <p className="mb-4 text-sm text-rose">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Conversation list */}
        <div className="max-h-[70vh] overflow-y-auto rounded border border-sand/30 bg-white/50">
          {convs.length === 0 && <p className="p-6 text-sm text-charcoal/50">No conversations yet.</p>}
          {convs.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c.id)}
              className={`block w-full border-b border-sand/20 px-4 py-3 text-left last:border-0 ${selected === c.id ? 'bg-indigo/10' : 'hover:bg-sand/10'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-charcoal">{c.customer.name ?? c.customer.phone}</span>
                <StatusPill status={c.status} />
              </div>
              <p className="mt-1 truncate text-xs text-charcoal/50">
                {c.messages[0]?.body || '—'}
              </p>
              <p className="mt-0.5 text-[10px] text-charcoal/30">{new Date(c.lastMsgAt).toLocaleString()}</p>
            </button>
          ))}
        </div>

        {/* Thread */}
        <div className="flex max-h-[70vh] flex-col rounded border border-sand/30 bg-white/50">
          {!current && <p className="p-10 text-center text-sm text-charcoal/50">Select a conversation to read the thread.</p>}
          {current && (
            <>
              <div className="flex flex-wrap items-center gap-3 border-b border-sand/30 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-charcoal">{current.customer.name ?? '—'} · {current.customer.phone}</p>
                  {current.undeliverable && <p className="text-xs text-rose">Number blocked / undeliverable (§12.2)</p>}
                  {!current.undeliverable && current.failCount >= 2 && (
                    <p className="text-xs text-charcoal/60">Bot has missed {current.failCount} messages in a row — consider taking over (§10.2)</p>
                  )}
                </div>
                <div className="ml-auto flex gap-2">
                  {current.status !== 'HUMAN' ? (
                    <button onClick={() => convAction('take-over')} className="flex items-center gap-1.5 rounded bg-indigo px-3 py-1.5 text-xs text-cream hover:bg-indigo-deep">
                      <Hand size={13} aria-hidden /> Take over from bot
                    </button>
                  ) : (
                    <button onClick={() => convAction('release')} className="flex items-center gap-1.5 rounded border border-charcoal/30 px-3 py-1.5 text-xs hover:border-indigo hover:text-indigo">
                      <Bot size={13} aria-hidden /> Release back to bot
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <ChatBubbles messages={thread} />
                <div ref={bottomRef} />
              </div>
              <div className="flex gap-2 border-t border-sand/30 p-3">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder={current.status === 'HUMAN' ? 'Reply as Kukua…' : 'Take over before replying manually'}
                  className="flex-1 rounded border border-charcoal/20 bg-white px-3 py-2 text-sm outline-none focus:border-indigo"
                />
                <button onClick={send} className="flex items-center gap-1.5 rounded bg-indigo px-4 py-2 text-sm text-cream hover:bg-indigo-deep">
                  <Send size={14} aria-hidden /> Send
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
