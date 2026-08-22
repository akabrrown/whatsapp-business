'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Mic, CheckCheck, FileText, ShoppingBag, ExternalLink } from 'lucide-react';
import { formatGHS } from '@rose/shared';

export interface ChatMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  kind: string;
  body: string;
  createdAt: string;
}

function formatDateDivider(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return 'TODAY';
  if (isYesterday) return 'YESTERDAY';
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

function renderMessageBody(text: string) {
  // Regex to highlight and make #RD-XXXX order numbers clickable
  const orderRegex = /(#?RD-\d{4,})/g;
  const parts = text.split(orderRegex);

  return parts.map((part, index) => {
    if (orderRegex.test(part)) {
      const cleanNum = part.replace(/^#/, '');
      return (
        <Link
          key={index}
          href={`/orders?search=${encodeURIComponent(cleanNum)}`}
          className="inline-flex items-center gap-0.5 font-bold underline decoration-indigo/50 hover:text-indigo transition"
        >
          <ShoppingBag size={12} className="inline mr-0.5" />
          {part}
        </Link>
      );
    }
    return part;
  });
}

export function ChatBubbles({ messages }: { messages: ChatMessage[] }) {
  // Group messages chronologically by day
  const groupedByDay = useMemo(() => {
    const groups: { dateLabel: string; msgs: ChatMessage[] }[] = [];
    let currentLabel = '';
    let currentList: ChatMessage[] = [];

    for (const m of messages) {
      const label = formatDateDivider(m.createdAt);
      if (label !== currentLabel) {
        if (currentList.length > 0) {
          groups.push({ dateLabel: currentLabel, msgs: currentList });
        }
        currentLabel = label;
        currentList = [m];
      } else {
        currentList.push(m);
      }
    }
    if (currentList.length > 0) {
      groups.push({ dateLabel: currentLabel, msgs: currentList });
    }
    return groups;
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center text-charcoal/40">
        <p className="text-xs">No messages in this conversation yet.</p>
        <p className="text-[11px] mt-1 text-charcoal/30">Type a message below to start chatting with the customer.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groupedByDay.map((group, groupIdx) => (
        <div key={groupIdx} className="space-y-3">
          {/* WhatsApp centered date divider pill */}
          <div className="flex justify-center my-2">
            <span className="rounded-md bg-sand/30 backdrop-blur-xs px-3 py-1 text-[10px] font-semibold tracking-wider uppercase text-charcoal/60 shadow-2xs">
              {group.dateLabel}
            </span>
          </div>

          {group.msgs.map((m) => {
            const isOutbound = m.direction === 'outbound';
            const timeFormatted = new Date(m.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={m.id}
                className={`flex ${isOutbound ? 'justify-end' : 'justify-start'} animate-in fade-in duration-200`}
              >
                <div
                  className={`group relative max-w-[85%] sm:max-w-[75%] px-3.5 py-2.5 shadow-xs transition-all ${
                    isOutbound
                      ? 'rounded-2xl rounded-tr-xs bg-[#E7FFDB] text-charcoal border border-[#D0F0C0]'
                      : 'rounded-2xl rounded-tl-xs bg-white text-charcoal border border-sand/40'
                  }`}
                >
                  {/* Sender identity badge */}
                  <div className="flex items-center justify-between gap-4 mb-1">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        isOutbound ? 'text-emerald-800' : 'text-indigo'
                      }`}
                    >
                      {isOutbound ? 'TOBI CLOTHINGS' : 'Customer'}
                    </span>
                  </div>

                  {/* Message body */}
                  <div className="text-[13px] leading-relaxed whitespace-pre-wrap break-words font-normal text-charcoal/90">
                    {m.kind === 'voice' ? (
                      <div className="flex items-center gap-2 py-1 text-indigo font-medium">
                        <Mic size={16} className="text-rose shrink-0" />
                        <span>Voice Message</span>
                      </div>
                    ) : (
                      renderMessageBody(m.body)
                    )}
                  </div>

                  {/* Timestamp & double checkmarks */}
                  <div className="mt-1 flex items-center justify-end gap-1 select-none text-[10px] text-charcoal/50">
                    <span>{timeFormatted}</span>
                    {isOutbound && (
                      <CheckCheck size={13} className="text-[#53BDEB] shrink-0" aria-label="Delivered" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
