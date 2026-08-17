// Restrained status pills: denim/sand/sage, no traffic-light reds (ux.md §3.8).
const STYLES: Record<string, string> = {
  RESERVED: 'bg-sand/25 text-charcoal/80',
  PAID: 'bg-indigo/10 text-indigo',
  PACKED: 'bg-sand/40 text-charcoal',
  SHIPPED: 'bg-indigo/20 text-indigo-deep',
  DELIVERED: 'bg-sage/30 text-charcoal',
  CANCELLED: 'bg-charcoal/10 text-charcoal/60',
  REFUNDED: 'bg-rose/20 text-charcoal/70',
  BOT: 'bg-indigo/10 text-indigo',
  NEEDS_HUMAN: 'bg-sand/40 text-charcoal',
  HUMAN: 'bg-sage/30 text-charcoal',
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs ${STYLES[status] ?? 'bg-charcoal/10 text-charcoal/60'}`}>
      {status.replace(/_/g, ' ').toLowerCase()}
    </span>
  );
}
