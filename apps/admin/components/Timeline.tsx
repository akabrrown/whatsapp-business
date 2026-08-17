// Vertical order timeline: connected dots, sand accent on current stage (ux.md §3.9).
const STAGES = ['RESERVED', 'PAID', 'PACKED', 'SHIPPED', 'DELIVERED'];

export function Timeline({ current, cancelled = false }: { current: string; cancelled?: boolean }) {
  const idx = STAGES.indexOf(current);
  return (
    <ol className="space-y-0">
      {STAGES.map((s, i) => {
        const done = idx > i;
        const active = idx === i;
        return (
          <li key={s} className="relative flex gap-3 pb-6 last:pb-0">
            {i < STAGES.length - 1 && (
              <span className={`absolute left-[7px] top-4 h-full w-px ${done ? 'bg-indigo' : 'bg-charcoal/15'}`} aria-hidden />
            )}
            <span
              className={`relative z-10 mt-1 h-3.5 w-3.5 rounded-full border-2 ${
                active ? 'border-sand bg-sand' : done ? 'border-indigo bg-indigo' : 'border-charcoal/20 bg-cream'
              }`}
            />
            <div>
              <p className={`text-sm ${active ? 'font-medium text-charcoal' : done ? 'text-charcoal/80' : 'text-charcoal/40'}`}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </p>
              {cancelled && s === current && <p className="text-xs text-charcoal/50">then cancelled</p>}
            </div>
          </li>
        );
      })}
      {(cancelled || current === 'CANCELLED' || current === 'REFUNDED') && (
        <li className="relative flex gap-3">
          <span className="relative z-10 mt-1 h-3.5 w-3.5 rounded-full border-2 border-charcoal/30 bg-charcoal/20" />
          <p className="text-sm text-charcoal/60">{current === 'REFUNDED' ? 'Refunded' : 'Cancelled'}</p>
        </li>
      )}
    </ol>
  );
}
