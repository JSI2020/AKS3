export type ProductionStatus =
  | 'RECEIVED'
  | 'CONFIRMED'
  | 'MEASUREMENTS_VERIFIED'
  | 'CUTTING'
  | 'STITCHING'
  | 'EMBROIDERY'
  | 'FINISHING'
  | 'QUALITY_CHECK'
  | 'PACKED'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'DELIVERY_REFUSED';

export type PaymentStatus =
  | 'UNPAID'
  | 'DEPOSIT_PAID'
  | 'BALANCE_DUE'
  | 'PAID'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

export type DesignStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type SizeMode = 'STANDARD' | 'CUSTOM';

export interface OrderItem {
  id: string;
  designName: string;
  designId: string;
  colourway: string;
  sizeMode: SizeMode;
  sizeLabel?: string;
  customMeasurements?: Record<string, number>;
  customizations: string[];
  priceMinor: number;
}

export interface TimelineEvent {
  id: string;
  fromStatus: ProductionStatus | null;
  toStatus: ProductionStatus;
  actor: string;
  remark: string;
  timestamp: string;
  notified: boolean;
}

export interface Order {
  id: string;
  number: string;
  customerName: string;
  customerId: string;
  customerPhone: string;
  customerWhatsapp: string;
  customerEmail: string;
  date: string;
  productionStatus: ProductionStatus;
  paymentStatus: PaymentStatus;
  totalMinor: number;
  depositMinor: number;
  balanceMinor: number;
  promisedDate: string;
  atRisk: boolean;
  source: 'WEBSITE' | 'WHATSAPP' | 'INSTAGRAM';
  items: OrderItem[];
  shippingAddress: string;
  assignedKarigar: string | null;
  paymentMethod: 'CARD' | 'BANK_TRANSFER' | 'COD' | 'WALLET';
  timeline: TimelineEvent[];
  internalRemarks: string;
  customerRemarks: string;
}

export interface Design {
  id: string;
  name: string;
  status: DesignStatus;
  category: string;
  occasion: string[];
  season: string;
  fabricName: string;
  fabricId: string;
  fabricMeters: number;
  embroideryCostMinor: number;
  stitchingCostMinor: number;
  trimsCostMinor: number;
  packagingCostMinor: number;
  aiCostMinor: number;
  totalCostMinor: number;
  sellingPriceMinor: number;
  marginPercent: number;
  featured: boolean;
  collections: string[];
  orderCount: number;
  revenueMinor: number;
  imageUrl: string;
  createdAt: string;
}

export interface FabricLot {
  id: string;
  lotCode: string;
  metresReceived: number;
  metresOnHand: number;
  metresReserved: number;
  costPerMetreMinor: number;
  receivedDate: string;
}

export interface Fabric {
  id: string;
  name: string;
  composition: string;
  weight: string;
  width: string;
  care: string;
  costPerMetreMinor: number;
  supplier: string;
  reorderPoint: number;
  totalOnHand: number;
  totalReserved: number;
  drape: 'LIGHT' | 'MEDIUM' | 'HEAVY';
  lots: FabricLot[];
  swatchColor: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  city: string;
  province: string;
  orderCount: number;
  lifetimeValueMinor: number;
  lastOrderDate: string;
  codRefusals: number;
  codEnabled: boolean;
  tags: string[];
  savedMeasurements: { label: string; values: Record<string, number> }[];
  source: 'WEBSITE' | 'WHATSAPP' | 'INSTAGRAM';
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'STAFF' | 'TAILOR' | 'ACCOUNTANT' | 'READ_ONLY';
  active: boolean;
  lastSeen: string;
  twoFactorEnabled: boolean;
  currentJobs: number;
}

export interface RecurringCost {
  id: string;
  name: string;
  category: string;
  amountMinor: number;
  cycle: 'MONTHLY' | 'YEARLY' | 'WEEKLY';
  active: boolean;
}

export interface Rate {
  id: string;
  kind: 'STITCHING' | 'EMBROIDERY' | 'PACKAGING';
  name: string;
  amountMinor: number;
  unit: 'FLAT' | 'PER_HOUR' | 'PER_METRE';
  active: boolean;
}

export interface Trim {
  id: string;
  name: string;
  type: string;
  unit: string;
  costMinor: number;
  stock: number;
}
