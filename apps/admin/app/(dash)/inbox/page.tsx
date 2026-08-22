'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Send,
  Plus,
  Search,
  MessageCircle,
  Phone,
  User,
  ShoppingBag,
  ExternalLink,
  Copy,
  Check,
  MapPin,
  Clock,
  ChevronRight,
  Sparkles,
  Info,
  Calendar,
} from 'lucide-react';
import { apiFetch, subscribeAdminEvents } from '@/lib/api';
import { StatusPill } from '@/components/StatusPill';
import { ChatBubbles, type ChatMessage } from '@/components/ChatBubbles';
import { formatGHS } from '@rose/shared';

interface CustomerOrder {
  id: string;
  number: string;
  status: string;
  totalP: number;
  createdAt: string;
  deliveryAddress?: string | null;
  items: {
    id: string;
    qty: number;
    unitPriceP: number;
    variant?: {
      size?: string | null;
      color?: string | null;
      product?: { name: string } | null;
    } | null;
  }[];
}

interface ConversationRow {
  id: string;
  status: string;
  failCount: number;
  undeliverable: boolean;
  lastMsgAt: string;
  customer: {
    id: string;
    name: string | null;
    phone: string;
    totalSpentP?: number;
    orders?: CustomerOrder[];
  };
  messages: { id: string; direction: string; body: string }[];
}

const QUICK_TEMPLATES = [
  {
    label: 'Order Confirmed',
    text: 'Hello! Your order with TOBI CLOTHINGS has been confirmed and is being carefully prepared for dispatch.',
  },
  {
    label: 'Out for Delivery',
    text: 'Great news! Your package is on its way with our dispatch rider. They will call you shortly on this number upon arrival.',
  },
  {
    label: 'Payment Received',
    text: 'Payment received with thanks! We truly appreciate your business with TOBI CLOTHINGS.',
  },
  {
    label: 'Request Location Pin',
    text: 'Please share your exact neighborhood or delivery location/pin on WhatsApp so we can calculate the fastest delivery route for you.',
  },
  {
    label: 'Size & Fit Check',
    text: 'Hello! To ensure your items fit you perfectly, please let us know your standard UK/EU clothing or footwear size.',
  },
];

export default function InboxPage() {
  const [convs, setConvs] = useState<ConversationRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [thread, setThread] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [showCustomerSidebar, setShowCustomerSidebar] = useState(true);

  // New Chat Modal state
  const [showNewChat, setShowNewChat] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');
  const [startingChat, setStartingChat] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      if (e.type === 'inbox.alert' || e.type === 'order.created' || e.type === 'order.updated') {
        loadList().catch(() => {});
      }
    });
    const poll = setInterval(() => loadList().catch(() => {}), 8_000);
    return () => {
      off();
      clearInterval(poll);
    };
  }, [loadList]);

  useEffect(() => {
    if (!selected) return;
    loadThread(selected);
    const poll = setInterval(() => loadThread(selected).catch(() => {}), 5_000);
    return () => clearInterval(poll);
  }, [selected, loadThread]);

  const current = convs.find((c) => c.id === selected);

  const send = async (textToSend?: string) => {
    const text = (textToSend || draft).trim();
    if (!selected || !text) return;
    setError('');
    try {
      await apiFetch(`/api/admin/inbox/${selected}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: text }),
      });
      if (!textToSend) setDraft('');
      await loadThread(selected);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const copyPhoneNumber = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
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

  const cleanWaNumber = current ? current.customer.phone.replace(/[^0-9]/g, '') : '';
  const internationalWa = cleanWaNumber.startsWith('0') ? `233${cleanWaNumber.slice(1)}` : cleanWaNumber;

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl text-indigo">Customer WhatsApp Console</h1>
            <span className="flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-0.5 text-[10px] uppercase tracking-wider border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Live Sync
            </span>
          </div>
          <p className="text-xs text-charcoal/60 mt-0.5">
            Direct merchant messaging, order coordination, and customer support.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCustomerSidebar(!showCustomerSidebar)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
              showCustomerSidebar
                ? 'border-indigo bg-indigo/10 text-indigo'
                : 'border-sand/80 bg-white text-charcoal hover:border-indigo/50'
            }`}
          >
            <Info size={14} /> {showCustomerSidebar ? 'Hide Customer Details' : 'Show Customer Details'}
          </button>
          <button
            type="button"
            onClick={() => setShowNewChat(true)}
            className="flex items-center gap-1.5 rounded-xl bg-indigo px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-deep transition"
          >
            <Plus size={14} /> Start New Chat
          </button>
        </div>
      </div>

      {error && <p className="rounded-xl bg-rose/10 px-4 py-2 text-xs text-rose font-medium">{error}</p>}

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-sand/60 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-indigo mb-2">
              <MessageCircle size={20} />
              <h2 className="font-serif text-lg font-bold">Start WhatsApp Conversation</h2>
            </div>
            <p className="text-xs text-charcoal/60 mb-5 leading-relaxed">
              Initiate a direct merchant WhatsApp thread with any customer by phone number.
            </p>
            <form onSubmit={startNewConversation} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-charcoal block mb-1">
                  Customer Phone Number <span className="text-rose">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 0592722997 or 233592722997"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full rounded-xl border border-sand/80 px-3.5 py-2.5 text-xs text-charcoal outline-none focus:border-indigo"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-bold text-charcoal block mb-1">
                  Customer Name <span className="text-charcoal/40 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Samuel Osei"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-xl border border-sand/80 px-3.5 py-2.5 text-xs text-charcoal outline-none focus:border-indigo"
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-3 border-t border-sand/30">
                <button
                  type="button"
                  onClick={() => setShowNewChat(false)}
                  className="rounded-xl border border-sand/80 px-4 py-2 text-xs font-medium text-charcoal hover:bg-sand/20 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={startingChat || !newPhone.trim()}
                  className="rounded-xl bg-indigo px-5 py-2 text-xs font-bold text-white hover:bg-indigo-deep disabled:opacity-50 transition shadow-xs"
                >
                  {startingChat ? 'Starting…' : 'Start Thread'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Console Canvas */}
      <div
        className={`grid gap-4 transition-all duration-200 ${
          showCustomerSidebar && current
            ? 'lg:grid-cols-[320px_1fr_300px]'
            : 'lg:grid-cols-[340px_1fr]'
        }`}
      >
        {/* ── Column 1: Conversations List ── */}
        <div className="flex flex-col h-[76vh] rounded-2xl border border-sand/60 bg-white overflow-hidden shadow-xs">
          {/* Search Header */}
          <div className="p-3 border-b border-sand/40 bg-sand/10">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-charcoal/40" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by phone, name or message…"
                className="w-full rounded-xl border border-sand/60 bg-white pl-8 pr-3 py-1.5 text-xs text-charcoal outline-none focus:border-indigo placeholder:text-charcoal/40"
              />
            </div>
          </div>

          {/* Conversations Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-sand/20 scrollbar-thin">
            {filteredConvs.length === 0 && (
              <div className="p-8 text-center text-charcoal/50">
                <MessageCircle size={28} className="mx-auto mb-2 opacity-30 text-indigo" />
                <p className="text-xs font-medium">No conversations found</p>
                <p className="text-[11px] text-charcoal/40 mt-1">
                  Click &quot;Start New Chat&quot; above to message any customer.
                </p>
              </div>
            )}
            {filteredConvs.map((c) => {
              const isSelected = selected === c.id;
              const preview = c.messages[0]?.body || 'Order conversation';
              const nameDisplay = c.customer.name || `Customer ${c.customer.phone.slice(-4)}`;

              return (
                <button
                  key={c.id}
                  onClick={() => setSelected(c.id)}
                  className={`block w-full px-4 py-3.5 text-left transition-all ${
                    isSelected
                      ? 'bg-indigo/10 border-l-4 border-indigo font-medium'
                      : 'hover:bg-sand/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Customer Initials Avatar */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sand/40 text-indigo font-bold text-xs border border-sand/60">
                      {nameDisplay.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate text-xs font-bold text-charcoal">
                          {nameDisplay}
                        </span>
                        <span className="shrink-0 text-[10px] text-charcoal/40">
                          {new Date(c.lastMsgAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>

                      <p className="mt-0.5 truncate text-xs text-charcoal/60 font-normal">
                        {preview}
                      </p>

                      <div className="mt-1 flex items-center justify-between text-[10px] text-charcoal/40">
                        <span>{c.customer.phone}</span>
                        {c.customer.orders && c.customer.orders.length > 0 && (
                          <span className="font-semibold text-indigo">
                            {c.customer.orders.length} order{c.customer.orders.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Column 2: Active WhatsApp Chat Canvas ── */}
        <div className="flex flex-col h-[76vh] rounded-2xl border border-sand/60 bg-[#F0EBE3] overflow-hidden shadow-xs relative">
          {!current ? (
            <div className="flex flex-1 flex-col items-center justify-center p-10 text-charcoal/40 bg-white">
              <MessageCircle size={40} className="mb-3 opacity-20 text-indigo" />
              <p className="text-sm font-semibold">Select a customer conversation to chat</p>
              <p className="text-xs text-charcoal/40 mt-1">All messages sync directly to the customer&apos;s WhatsApp thread.</p>
            </div>
          ) : (
            <>
              {/* Chat Canvas Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand/40 bg-white px-5 py-3 shadow-2xs z-10">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo/10 text-indigo font-bold text-sm border border-indigo/20">
                    {(current.customer.name?.[0] || current.customer.phone.slice(-1) || 'C').toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-charcoal">
                        {current.customer.name || `Customer (${current.customer.phone})`}
                      </p>
                      <button
                        type="button"
                        onClick={() => copyPhoneNumber(current.customer.phone)}
                        className="inline-flex items-center gap-1 text-[10px] text-charcoal/60 hover:text-indigo transition"
                        title="Copy Phone Number"
                      >
                        {copiedPhone ? (
                          <Check size={11} className="text-emerald-600" />
                        ) : (
                          <Copy size={11} />
                        )}
                        <span>{current.customer.phone}</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-emerald-700 font-medium mt-0.5 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Verified Customer
                    </p>
                  </div>
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center gap-2">
                  <a
                    href={`https://wa.me/${internationalWa}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-xl border border-emerald-600/30 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition shadow-2xs"
                  >
                    <ExternalLink size={13} /> Open WhatsApp Web
                  </a>
                </div>
              </div>

              {/* Chat Messages Feed with WhatsApp subtle background */}
              <div className="flex-1 overflow-y-auto p-5 bg-[radial-gradient(#d3c9b8_1px,transparent_1px)] [background-size:16px_16px]">
                <ChatBubbles messages={thread} />
                <div ref={bottomRef} />
              </div>

              {/* Quick Response Templates */}
              <div className="px-4 py-2 border-t border-sand/30 bg-white flex items-center gap-2 overflow-x-auto scrollbar-none">
                <span className="text-[10px] uppercase font-bold text-charcoal/40 shrink-0">
                  Quick Templates:
                </span>
                {QUICK_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => send(tmpl.text)}
                    className="shrink-0 rounded-lg border border-sand/70 bg-sand/10 px-2.5 py-1 text-[11px] font-medium text-charcoal hover:border-indigo hover:bg-indigo/10 hover:text-indigo transition shadow-2xs"
                  >
                    {tmpl.label}
                  </button>
                ))}
              </div>

              {/* Composer Input Area */}
              <div className="p-3 bg-white border-t border-sand/40">
                <div className="flex items-end gap-2 rounded-xl border border-sand/80 bg-sand/10 p-2 focus-within:border-indigo focus-within:bg-white transition">
                  <textarea
                    ref={textareaRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={2}
                    placeholder="Type your WhatsApp message to customer… (Enter to send, Shift+Enter for new line)"
                    className="flex-1 resize-none bg-transparent px-2 py-1 text-xs text-charcoal outline-none placeholder:text-charcoal/40"
                  />
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[10px] text-charcoal/40 px-1">{draft.length} chars</span>
                    <button
                      type="button"
                      onClick={() => send()}
                      disabled={!draft.trim()}
                      className="flex items-center gap-1.5 rounded-xl bg-indigo px-4 py-2 text-xs font-bold text-white hover:bg-indigo-deep disabled:opacity-40 transition shadow-xs"
                    >
                      <Send size={13} /> Send
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Column 3: Customer Details & Order History ── */}
        {showCustomerSidebar && current && (
          <div className="flex flex-col h-[76vh] rounded-2xl border border-sand/60 bg-white overflow-hidden shadow-xs animate-in slide-in-from-right-4 duration-200">
            <div className="p-4 border-b border-sand/40 bg-sand/10">
              <h2 className="font-serif text-sm font-bold text-indigo flex items-center gap-1.5">
                <User size={15} /> Customer Profile
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin">
              {/* Spend & Order Metric Summary */}
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-sand/10 p-3 border border-sand/40">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-charcoal/50 font-bold">Total Spent</p>
                  <p className="headline text-base font-bold text-indigo mt-0.5">
                    {formatGHS(current.customer.totalSpentP || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-charcoal/50 font-bold">Total Orders</p>
                  <p className="headline text-base font-bold text-charcoal mt-0.5">
                    {current.customer.orders?.length || 0}
                  </p>
                </div>
              </div>

              {/* Customer Contact Card */}
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[10px] text-charcoal/40 uppercase font-bold block">Phone Number</span>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="font-semibold text-charcoal">{current.customer.phone}</span>
                    <button
                      type="button"
                      onClick={() => copyPhoneNumber(current.customer.phone)}
                      className="text-[11px] text-indigo hover:underline"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {current.customer.name && (
                  <div>
                    <span className="text-[10px] text-charcoal/40 uppercase font-bold block">Full Name</span>
                    <span className="font-semibold text-charcoal mt-0.5 block">{current.customer.name}</span>
                  </div>
                )}
              </div>

              {/* Recent Orders Stream */}
              <div className="space-y-3 pt-2 border-t border-sand/30">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-charcoal flex items-center gap-1.5">
                    <ShoppingBag size={13} className="text-indigo" /> Recent Orders
                  </h3>
                  <Link
                    href={`/customers/${current.customer.id}`}
                    className="text-[10px] font-bold text-indigo hover:underline"
                  >
                    View All →
                  </Link>
                </div>

                {(!current.customer.orders || current.customer.orders.length === 0) ? (
                  <p className="text-xs text-charcoal/40 py-2">No orders placed by this customer yet.</p>
                ) : (
                  <div className="space-y-2.5">
                    {current.customer.orders.map((ord) => (
                      <Link
                        key={ord.id}
                        href={`/orders/${ord.id}`}
                        className="block rounded-xl border border-sand/50 bg-sand/5 p-3 hover:border-indigo/50 hover:bg-sand/15 transition group"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-xs text-indigo group-hover:underline">
                            #{ord.number}
                          </span>
                          <StatusPill status={ord.status} />
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-charcoal">{formatGHS(ord.totalP)}</span>
                          <span className="text-[10px] text-charcoal/40">
                            {new Date(ord.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        {ord.items && ord.items.length > 0 && (
                          <p className="mt-1 line-clamp-1 text-[10px] text-charcoal/60">
                            {ord.items.map((i) => `${i.qty}x ${i.variant?.product?.name || 'Item'}`).join(', ')}
                          </p>
                        )}
                        {ord.deliveryAddress && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-charcoal/50 truncate">
                            <MapPin size={10} className="shrink-0" />
                            <span className="truncate">{ord.deliveryAddress}</span>
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
