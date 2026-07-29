export type UserRole = 'customer' | 'shopkeeper';

export type Category = 
  | 'All'
  | 'Daily Essentials'
  | 'Root Vegetables'
  | 'Leafy Greens'
  | 'Exotic Fruits'
  | 'Organic Herbs'
  | string;

export type UnitType = 
  | 'kg' 
  | 'g'
  | 'piece' 
  | 'bunch' 
  | 'pack' 
  | 'dozen' 
  | 'box' 
  | 'liter' 
  | 'pouch' 
  | 'tray'
  | string;

export interface InventoryItem {
  id: string;
  name: string;
  category: Category;
  pricePerUnit: number; // price per kg, per piece, or per bunch
  unitType: UnitType;
  stockQuantity: number; // e.g. 25.5 kg or 40 pieces
  inStock: boolean;
  image: string;
  description: string;
  origin: string;
  isOrganic?: boolean;
  isFavorite?: boolean; // Starred favorite item for 1-click quick access
  regionalName?: string; // Combined Hindi & Punjabi name for display
  hindiName?: string; // Hindi (Devanagari) name (e.g. Tamatar / टमाटर)
  punjabiName?: string; // Punjabi (Gurmukhi) name (e.g. Tamatar / ਟਮਾਟਰ)
  minStockAlert?: number; // Low stock alert threshold
}

export interface CartItem {
  itemId: string;
  item: InventoryItem;
  quantityOrWeight: number; // in grams if kg (e.g. 500), or count if piece/bunch
  calculatedPrice: number;
}

export type OrderStatus = 'sent_to_shopkeeper' | 'reviewed' | 'approved' | 'rejected' | 'paid' | 'cancelled';

export interface OrderItem {
  itemId: string;
  name: string;
  unitType: UnitType;
  quantityOrWeight: number; // grams or units
  pricePerUnit: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  storeName: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  platformFee: number;
  deliveryFee?: number;
  grandTotal: number;
  status: OrderStatus;
  fulfillmentType?: 'store_pickup' | 'home_delivery';
  deliveryAddress?: string;
  promoCode?: string;
  discountAmount?: number;
  rejectionReason?: string;
  cancellationReason?: string;
  cancelledBy?: 'customer' | 'shopkeeper';
  shopkeeperNote?: string;
  createdAt: string;
  updatedAt: string;
  paymentMethod?: 'UPI' | 'Cash' | 'Card';
}

export interface CustomerSession {
  name: string;
  phone: string;
  isLoggedIn: boolean;
  deliveryAddress?: string;
  scannedStore?: {
    id: string;
    name: string;
    branch: string;
    address: string;
  } | null;
}

export interface CustomerRecord {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
  lastActive: string;
  notes?: string;
  totalOrders?: number;
  totalSpent?: number;
}

export interface ProductOffer {
  id: string;
  itemId?: string; // specific item ID or 'ALL'
  title: string;
  discountPercentage?: number;
  discountAmount?: number;
  promoCode?: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface ExpenseItem {
  id: string;
  title: string;
  category: 'Wholesale Purchase' | 'Rent & Utilities' | 'Delivery & Logistics' | 'Packaging' | 'Wages & Staff' | 'Other';
  amount: number;
  date: string;
  paymentMethod: 'UPI' | 'Cash' | 'Bank Transfer' | 'Credit';
  notes?: string;
}

export interface CampaignTriggerConfig {
  vipMinOrders: number;
  dormantDays: number;
  vipCouponCode: string;
  vipDiscount: string;
  dormantCouponCode: string;
  dormantDiscount: string;
  welcomeCouponCode: string;
  welcomeDiscount: string;
}

