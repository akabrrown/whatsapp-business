'use client';
// Inbox: two-panel WhatsApp console (§3.11): conversation list with status
// dots, full thread, take-over / release (§10.6, §10.7), send-as-Kukua.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, Hand, Send, Plus, Search, MessageCircle, Phone, User, Package, Check, Sparkles } from 'lucide-react';
import { apiFetch, subscribeAdminEvents } from '@/lib/api';
import { StatusPill } from '@/components/StatusPill';
import { ChatBubbles, type ChatMessage } from '@/components/ChatBubbles';

interface ConversationRow {
  id: string;
  status: string;
  failCount: number;
  undeliverable: boolean;
  lastMsgAt: string;
  customer: { id: string; name: string | null; phone: string; totalSpentP?: number };
  messages: { id: string; direction: string; body: string }[];
}

const QUICK_REPLIES = [
  'Hello! Your order has been confirmed and is being prepared.',
  'Your order is out for delivery! Our rider will call you upon arrival.',
  'Payment received with thanks! We appreciate your business with TOBI CLOTHINGS.',
  'Please share your exact neighborhood or delivery location so we can dispatch your items.',
];

export default function InboxPage() {
  const [convs, setConvs] = useState<ConversationRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [thread, setThread] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');
  const [startingChat, setStartingChat] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadList = useCallback(async () => {
    try {
      const r = await apiFetch<{ conversations: ConversationRow[] }>('/api/admin/inbox');
      if (r?.conversations) {
        setConvs(r.conversations);
        if (!selected && r.conversations.length > 0) {
          setSelected(r.conversations[0].id);
        }
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }, [selected]);

  const loadThread = useCallback(async (id: string) => {
    try {
      const r = await apiFetch<{ messages: ChatMessage[] }>(`/api/admin/inbox/${id}/messages`);
      if (r?.messages) {
        setThread(r.messages);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    loadList();
    const off = subscribeAdminEvents((e) => {
      if (e.type === 'inbox.alert' || e.type === 'order.created') loadList().catch(() => {});
    });
    const poll = setInterval(() => loadList().catch(() => {}), 10_000);
    return () => {
      off();
      clearInterval(poll);
    };
  }, [loadList]);

  useEffect(() => {
    if (!selected) return;
    loadThread(selected);
    const poll = setInterval(() => loadThread(selected).catch(() => {}), 6_000);
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

  const send = async (textToSend?: string) => {
    const text = (textToSend || draft).trim();
    if (!selected || !text) return;
    setError('');
    try {
      await apiFetch(`/api/admin/inbox/${selected}/messages`, { method: 'POST', body: JSON.stringify({ body: text }) });
      if (!textToSend) setDraft('');
      await loadThread(selected);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const startNewConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone.trim()) return;
    setStartingChat(true);
    setError('');
    try {
      const res = await apiFetch<{ ok: boolean; conversationId: string }>('/api/admin/inbox/start', {
        method: 'POST',
        body: JSON.stringify({ phone: newPhone.trim(), name: newName.trim() || undefined }),
      });
      if (res.conversationId) {
        setShowNewChat(false);
        setNewPhone('');
        setNewName('');
        await loadList();
        setSelected(res.conversationId);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setStartingChat(false);
    }
  };

  const filteredConvs = convs.filter((c) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      (c.customer.name && c.customer.name.toLowerCase().includes(q)) ||
      c.customer.phone.includes(q) ||
      c.messages.some((m) => m.body.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-indigo">Customer WhatsApp Inbox</h1>
          <p className="text-xs text-charcoal/60">Live conversations, order inquiries, and human-agent handoff.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowNewChat(true)}
          className="flex items-center gap-1.5 rounded-xl bg-indigo px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-deep transition"
        >
          <Plus size={14} /> Start New Chat
        </button>
      </div>

      {error && <p className="rounded-xl bg-rose/10 px-4 py-2 text-xs text-rose">{error}</p>}

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-sand/60">
            <h2 className="font-serif text-lg text-indigo mb-2">Start WhatsApp Conversation</h2>
            <p className="text-xs text-charcoal/60 mb-4">Enter customer phone number to initiate a direct message thread.</p>
            <form onSubmit={startNewConversation} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-charcoal block mb-1">Phone Number (Required)</label>
                <input
                  type="tel"
                  placeholder="e.g. 0592722997 or 233592722997"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full rounded-xl border border-sand/80 px-3.5 py-2 text-xs text-charcoal outline-none focus:border-indigo"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-charcoal block mb-1">Customer Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Samuel Osei"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-xl border border-sand/80 px-3.5 py-2 text-xs text-charcoal outline-none focus:border-indigo"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewChat(false)}
                  className="rounded-xl border border-sand/80 px-4 py-2 text-xs text-charcoal hover:bg-sand/20"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={startingChat || !newPhone.trim()}
                  className="rounded-xl bg-indigo px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-deep disabled:opacity-50"
                >
                  {startingChat ? 'Starting…' : 'Start Thread'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        {/* Left Column: Search & Conversation List */}
        <div className="flex flex-col h-[75vh] rounded-2xl border border-sand/60 bg-white overflow-hidden shadow-xs">
          <div className="p-3 border-b border-sand/40 bg-sand/10">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-charcoal/40" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations…"
                className="w-full rounded-xl border border-sand/60 bg-white pl-8 pr-3 py-1.5 text-xs text-charcoal outline-none focus:border-indigo"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-sand/30">
            {filteredConvs.length === 0 && (
              <div className="p-8 text-center text-charcoal/50">
                <MessageCircle size={28} className="mx-auto mb-2 opacity-30 text-indigo" />
                <p className="text-xs font-medium">No conversations found</p>
                <p className="text-[11px] text-charcoal/40 mt-1">Click &quot;Start New Chat&quot; above to message any customer.</p>
              </div>
            )}
            {filteredConvs.map((c) => {
              const isSelected = selected === c.id;
              const preview = c.messages[0]?.body || 'Order conversation';
              return (
                <button
                  key={c.id}
                  onClick={() => setSelected(c.id)}
                  className={`block w-full px-4 py-3.5 text-left transition-all ${
                    isSelected ? 'bg-indigo/10 border-l-4 border-indigo' : 'hover:bg-sand/10'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-bold text-charcoal">
                      {c.customer.name || c.customer.phone}
                    </span>
                    <StatusPill status={c.status} />
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs text-charcoal/60 font-normal">
                    {preview}
                  </p>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-charcoal/40">
                    <span>{c.customer.phone}</span>
                    <span>{new Date(c.lastMsgAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Chat Thread & Reply Controls */}
        <div className="flex flex-col h-[75vh] rounded-2xl border border-sand/60 bg-white overflow-hidden shadow-xs">
          {!current ? (
            <div className="flex flex-1 flex-col items-center justify-center p-10 text-charcoal/40">
              <MessageCircle size={36} className="mb-3 opacity-20 text-indigo" />
              <p className="text-sm font-medium">Select a conversation to read the thread</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand/40 bg-sand/10 px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo/10 text-indigo font-bold text-xs">
                    {(current.customer.name?.[0] || 'C').toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-charcoal">
                      {current.customer.name || 'Customer'} · <span className="font-normal text-charcoal/70">{current.customer.phone}</span>
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
                      <span className="text-[10px] text-charcoal/50">WhatsApp Connected</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {current.status !== 'HUMAN' ? (
                    <button
                      onClick={() => convAction('take-over')}
                      className="flex items-center gap-1.5 rounded-xl bg-indigo px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-deep transition"
                    >
                      <Hand size={13} /> Take Over from Bot
                    </button>
                  ) : (
                    <button
                      onClick={() => convAction('release')}
                      className="flex items-center gap-1.5 rounded-xl border border-sand/80 bg-white px-3 py-1.5 text-xs font-semibold text-charcoal hover:border-indigo transition"
                    >
                      <Bot size={13} /> Release Back to Bot
                    </button>
                  )}
                </div>
              </div>

              {/* Chat Thread */}
              <div className="flex-1 overflow-y-auto p-5 bg-sand/5">
                <ChatBubbles messages={thread} />
                <div ref={bottomRef} />
              </div>

              {/* Quick Replies */}
              <div className="px-4 py-2 border-t border-sand/30 bg-sand/10 flex flex-wrap gap-1.5">
                <span className="text-[10px] uppercase font-bold text-charcoal/40 self-center mr-1">Quick:</span>
                {QUICK_REPLIES.map((qr, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => send(qr)}
                    className="rounded-lg border border-sand/60 bg-white px-2.5 py-1 text-[11px] text-charcoal hover:border-indigo hover:text-indigo transition truncate max-w-[200px]"
                    title={qr}
                  >
                    {qr}
                  </button>
                ))}
              </div>

              {/* Input Area */}
              <div className="flex gap-2 border-t border-sand/40 p-3 bg-white">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder={current.status === 'HUMAN' ? 'Reply as Tobi on WhatsApp…' : 'Take over to send manual reply…'}
                  className="flex-1 rounded-xl border border-sand/80 bg-sand/10 px-4 py-2 text-xs text-charcoal outline-none focus:border-indigo"
                />
                <button
                  type="button"
                  onClick={() => send()}
                  disabled={!draft.trim()}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-deep disabled:opacity-40 transition"
                >
                  <Send size={13} /> Send
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

