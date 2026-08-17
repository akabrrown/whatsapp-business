// Chat bubbles — customer left/neutral, business right/denim (ux.md §3.9, §3.11).
export interface ChatMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  kind: string;
  body: string;
  createdAt: string;
}

export function ChatBubbles({ messages }: { messages: ChatMessage[] }) {
  if (messages.length === 0) return <p className="text-sm text-charcoal/50">No messages yet.</p>;
  return (
    <div className="space-y-2">
      {messages.map((m) => (
        <div key={m.id} className={m.direction === 'outbound' ? 'flex justify-end' : 'flex justify-start'}>
          <div
            className={`max-w-[80%] px-3 py-2 text-sm ${
              m.direction === 'outbound'
                ? 'rounded-2xl rounded-tr-sm bg-indigo text-cream'
                : 'rounded-2xl rounded-tl-sm bg-white text-charcoal shadow-sm'
            }`}
          >
            <p className="whitespace-pre-wrap">{m.kind === 'voice' ? '🎤 Voice note' : m.body}</p>
            <p className={`mt-1 text-[10px] ${m.direction === 'outbound' ? 'text-cream/60' : 'text-charcoal/40'}`}>
              {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
