import type { ProductionStatus, PaymentStatus, DesignStatus } from '@/data/types';

export const PRODUCTION_PIPELINE: ProductionStatus[] = [
  'RECEIVED',
  'CONFIRMED',
  'MEASUREMENTS_VERIFIED',
  'CUTTING',
  'STITCHING',
  'EMBROIDERY',
  'FINISHING',
  'QUALITY_CHECK',
  'PACKED',
  'DISPATCHED',
  'DELIVERED',
  'COMPLETED',
];

export const TERMINAL_STATUSES: ProductionStatus[] = [
  'COMPLETED',
  'CANCELLED',
  'REFUNDED',
  'DELIVERY_REFUSED',
];

export function isTerminal(status: ProductionStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function productionStatusLabel(s: ProductionStatus): string {
  const labels: Record<ProductionStatus, string> = {
    RECEIVED: 'Received',
    CONFIRMED: 'Confirmed',
    MEASUREMENTS_VERIFIED: 'Measurements Verified',
    CUTTING: 'Cutting',
    STITCHING: 'Stitching',
    EMBROIDERY: 'Embroidery',
    FINISHING: 'Finishing',
    QUALITY_CHECK: 'Quality Check',
    PACKED: 'Packed',
    DISPATCHED: 'Dispatched',
    DELIVERED: 'Delivered',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    REFUNDED: 'Refunded',
    DELIVERY_REFUSED: 'Delivery Refused',
  };
  return labels[s] ?? s;
}

export function productionStatusColor(s: ProductionStatus): 'neutral' | 'success' | 'warning' | 'error' | 'info' | 'accent' {
  switch (s) {
    case 'RECEIVED': return 'neutral';
    case 'CONFIRMED': return 'info';
    case 'MEASUREMENTS_VERIFIED': return 'accent';
    case 'CUTTING': return 'warning';
    case 'STITCHING':
    case 'EMBROIDERY':
    case 'FINISHING': return 'warning';
    case 'QUALITY_CHECK': return 'accent';
    case 'PACKED': return 'info';
    case 'DISPATCHED': return 'success';
    case 'DELIVERED': return 'success';
    case 'COMPLETED': return 'success';
    case 'CANCELLED':
    case 'REFUNDED':
    case 'DELIVERY_REFUSED': return 'error';
    default: return 'neutral';
  }
}

export function paymentStatusLabel(s: PaymentStatus): string {
  const labels: Record<PaymentStatus, string> = {
    UNPAID: 'Unpaid',
    DEPOSIT_PAID: 'Deposit Paid',
    BALANCE_DUE: 'Balance Due',
    PAID: 'Paid',
    REFUNDED: 'Refunded',
    PARTIALLY_REFUNDED: 'Partially Refunded',
  };
  return labels[s] ?? s;
}

export function paymentStatusColor(s: PaymentStatus): 'neutral' | 'success' | 'warning' | 'error' | 'info' | 'accent' {
  switch (s) {
    case 'UNPAID': return 'error';
    case 'DEPOSIT_PAID': return 'info';
    case 'BALANCE_DUE': return 'warning';
    case 'PAID': return 'success';
    case 'REFUNDED':
    case 'PARTIALLY_REFUNDED': return 'error';
    default: return 'neutral';
  }
}

export function designStatusLabel(s: DesignStatus): string {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

export function designStatusColor(s: DesignStatus): 'neutral' | 'success' | 'warning' | 'error' | 'info' | 'accent' {
  switch (s) {
    case 'PUBLISHED': return 'success';
    case 'DRAFT': return 'warning';
    case 'ARCHIVED': return 'neutral';
    default: return 'neutral';
  }
}
