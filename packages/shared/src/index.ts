// ============================================================
// ROSE & DENIM — shared types & constants (used by api/web/admin)
// Money is always integer pesewas (GHS 1 = 100).
// ============================================================

export const OrderStatus = {
  RESERVED: 'RESERVED',
  PAID: 'PAID',
  PACKED: 'PACKED',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const OrderSource = {
  WEBSITE: 'website',
  WHATSAPP_DIRECT: 'whatsapp_direct',
} as const;
export type OrderSource = (typeof OrderSource)[keyof typeof OrderSource];

export const ConversationStatus = {
  BOT: 'BOT',
  NEEDS_HUMAN: 'NEEDS_HUMAN',
  HUMAN: 'HUMAN',
} as const;
export type ConversationStatus =
  (typeof ConversationStatus)[keyof typeof ConversationStatus];

export const ChangeType = {
  PURCHASE: 'purchase',
  RESERVE: 'reserve',
  RELEASE: 'release',
  RESTOCK: 'restock',
  ADJUSTMENT: 'adjustment',
} as const;
export type ChangeType = (typeof ChangeType)[keyof typeof ChangeType];

export const AdminRole = {
  OWNER: 'owner',
  STAFF: 'staff',
} as const;
export type AdminRole = (typeof AdminRole)[keyof typeof AdminRole];

export const PaymentStatus = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const;
export type PaymentStatus =
  (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const TokenStatus = {
  ACTIVE: 'ACTIVE',
  USED: 'USED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
} as const;
export type TokenStatus = (typeof TokenStatus)[keyof typeof TokenStatus];

// ---- domain constants -------------------------------------------------
export const VIP_THRESHOLD_PESWAS = 100_000; // GHS 1,000
export const TOKEN_TTL_MIN = 15;
export const CART_TTL_MIN = 30;
export const TOKEN_RATE_LIMIT_PER_HOUR = 5;
export const MAX_PAYMENT_RETRIES = 1; // one retry after first failure (§5.5)
export const STALE_PACKED_HOURS = 24;
export const DUPLICATE_ORDER_WINDOW_MIN = 10;
export const LOW_STOCK_DEFAULT = 3;

// retention cadence (days)
export const CHECKIN_DAYS = 3;
export const CROSSSELL_DAYS = 14;
export const WINBACK_DAYS = 60;

// ---- shapes -----------------------------------------------------------
export interface CartItem {
  variantId: string;
  qty: number;
}

export interface Cart {
  sessionId: string;
  phone?: string;
  items: CartItem[];
  updatedAt: string;
}

export interface TokenPayload {
  code: string;
  phone: string;
  items: CartItem[];
  expiresAt: string;
  whatsappUrl: string;
}

export interface ZoneMatch {
  ok: boolean;
  zone?: { id: string; name: string; feeP: number };
  reason?: 'unrecognized' | 'out_of_zone';
}

// ---- helpers ----------------------------------------------------------
export function formatGHS(pesewas: number): string {
  return `GHS ${(pesewas / 100).toFixed(2)}`;
}

export function pesewas(ghs: number): number {
  return Math.round(ghs * 100);
}
