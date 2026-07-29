import { InventoryItem, Order, CustomerSession, CustomerRecord, ProductOffer, ExpenseItem, CampaignTriggerConfig } from '../types';
import { INITIAL_INVENTORY, DEFAULT_STORE, SAMPLE_ORDERS, SAMPLE_CUSTOMERS } from '../data/mockData';

const INVENTORY_KEY = 'qr_veg_inventory_v1';
const ORDERS_KEY = 'qr_veg_orders_v1';
const SESSION_KEY = 'qr_veg_customer_session_v1';
const CUSTOMERS_KEY = 'qr_veg_customer_records_v1';
const STORE_CONFIG_KEY = 'qr_veg_store_config_v1';
const OFFERS_KEY = 'qr_veg_offers_v1';
const EXPENSES_KEY = 'qr_veg_expenses_v1';
const CAMPAIGN_CONFIG_KEY = 'qr_veg_campaign_config_v1';
const TIMESTAMPS_KEY = 'qr_veg_sync_timestamps_v1';

export const SCHEMA_VERSION = 1;

export function getLocalTimestamp(type: string): number {
  try {
    const raw = localStorage.getItem(TIMESTAMPS_KEY);
    const ts = raw ? JSON.parse(raw) : {};
    return ts[type] || 0;
  } catch (e) {
    return 0;
  }
}

export function setLocalTimestamp(type: string, time: number) {
  try {
    const raw = localStorage.getItem(TIMESTAMPS_KEY);
    const ts = raw ? JSON.parse(raw) : {};
    ts[type] = time;
    localStorage.setItem(TIMESTAMPS_KEY, JSON.stringify(ts));
  } catch (e) {}
}

export async function pushToSyncServer(type: string, data: any, forceUpdatedAt?: number) {
  const syncTypeMap: Record<string, string> = {
    expenses: 'expenses',
    campaign_config: 'campaignConfig',
    offers: 'offers',
    store_config: 'storeConfig',
    customers: 'customers',
    inventory: 'inventory',
    orders: 'orders'
  };

  const serverType = syncTypeMap[type];
  if (serverType) {
    const updatedAt = forceUpdatedAt || Date.now();
    setLocalTimestamp(serverType, updatedAt);
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: serverType, data, updatedAt, schemaVersion: SCHEMA_VERSION }),
      });
    } catch (e) {
      console.error(`Failed to sync ${type} with server:`, e);
    }
  }
  
  window.dispatchEvent(new CustomEvent('app-state-change', { detail: { type } }));
}

export function getStoredExpenses(): ExpenseItem[] {
  try {
    const raw = localStorage.getItem(EXPENSES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading expenses:', e);
  }
  const defaultExpenses: ExpenseItem[] = [
    {
      id: 'exp-1',
      title: 'Wholesale Organic Tomatoes & Leafy Greens',
      category: 'Wholesale Purchase',
      amount: 4500,
      date: '2026-07-26',
      paymentMethod: 'UPI',
      notes: 'Purchased from Central Mandi'
    },
    {
      id: 'exp-2',
      title: 'Monthly Store Rent & Electricity',
      category: 'Rent & Utilities',
      amount: 12000,
      date: '2026-07-01',
      paymentMethod: 'Bank Transfer',
      notes: 'Shop No 4, Market Complex'
    },
    {
      id: 'exp-3',
      title: 'Delivery Partner Fuel Allowance',
      category: 'Delivery & Logistics',
      amount: 1200,
      date: '2026-07-25',
      paymentMethod: 'Cash',
      notes: 'Weekly delivery incentive'
    }
  ];
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(defaultExpenses));
  return defaultExpenses;
}

export function saveStoredExpenses(expenses: ExpenseItem[]) {
  try {
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
    const now = Date.now();
    pushToSyncServer('expenses', expenses, now);
  } catch (e) {
    console.error('Error saving expenses:', e);
  }
}

export function getStoredCampaignTrigger(): CampaignTriggerConfig {
  try {
    const raw = localStorage.getItem(CAMPAIGN_CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading campaign config:', e);
  }
  const defaultConfig: CampaignTriggerConfig = {
    vipMinOrders: 3,
    dormantDays: 7,
    vipCouponCode: 'VIP20',
    vipDiscount: '20% OFF',
    dormantCouponCode: 'COMEBACK15',
    dormantDiscount: '15% OFF',
    welcomeCouponCode: 'WELCOME50',
    welcomeDiscount: '₹50 OFF'
  };
  localStorage.setItem(CAMPAIGN_CONFIG_KEY, JSON.stringify(defaultConfig));
  return defaultConfig;
}

export function saveStoredCampaignTrigger(config: CampaignTriggerConfig) {
  try {
    localStorage.setItem(CAMPAIGN_CONFIG_KEY, JSON.stringify(config));
    const now = Date.now();
    pushToSyncServer('campaign_config', config, now);
  } catch (e) {
    console.error('Error saving campaign config:', e);
  }
}

export function getStoredOffers(): ProductOffer[] {
  try {
    const raw = localStorage.getItem(OFFERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading offers:', e);
  }
  const defaultOffers: ProductOffer[] = [
    {
      id: 'offer-1',
      itemId: 'ALL',
      title: 'Farm Fresh 10% Off Weekend Special',
      discountPercentage: 10,
      promoCode: 'FARM10',
      startDate: '2026-07-01',
      endDate: '2026-12-31',
      isActive: true
    },
    {
      id: 'offer-2',
      itemId: 'item-1',
      title: 'Organic Tomato ₹5 Off per kg',
      discountAmount: 5,
      promoCode: 'TOMATO5',
      startDate: '2026-07-01',
      endDate: '2026-08-31',
      isActive: true
    }
  ];
  localStorage.setItem(OFFERS_KEY, JSON.stringify(defaultOffers));
  return defaultOffers;
}

export function saveStoredOffers(offers: ProductOffer[]) {
  try {
    localStorage.setItem(OFFERS_KEY, JSON.stringify(offers));
    const now = Date.now();
    pushToSyncServer('offers', offers, now);
  } catch (e) {
    console.error('Error saving offers:', e);
  }
}

export interface StoreConfig {
  name: string;
  branch: string;
  address: string;
  phone: string;
  taxRate: number;
  operatingHours: string;
  upiId: string;
  loginPhotoUrl?: string;
  bannerTitle?: string;
  bannerSubtitle?: string;
  bannerImageUrl?: string;
  offerPageBgUrl?: string;
  offerPageBannerTitle?: string;
  offerPageBannerSubtitle?: string;
  offerPageBannerImageUrl?: string;
}

export function getStoredStoreConfig(): StoreConfig {
  try {
    const raw = localStorage.getItem(STORE_CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading store config:', e);
  }
  const defaultConfig: StoreConfig = {
    name: DEFAULT_STORE.name,
    branch: DEFAULT_STORE.branch,
    address: DEFAULT_STORE.address,
    phone: '+91 98765 43210',
    taxRate: 0,
    operatingHours: '06:00 AM - 09:00 PM Daily',
    upiId: 'farmersgate@okaxis',
    loginPhotoUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
    bannerTitle: 'Fresh & Healthy',
    bannerSubtitle: 'Get 20% Off on all vegetables',
    bannerImageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
    offerPageBgUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
    offerPageBannerTitle: 'Special Harvest Deals',
    offerPageBannerSubtitle: 'Explore exclusive discounts and seasonal offers',
    offerPageBannerImageUrl: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=800&q=80'
  };
  localStorage.setItem(STORE_CONFIG_KEY, JSON.stringify(defaultConfig));
  return defaultConfig;
}

export function saveStoredStoreConfig(config: StoreConfig) {
  try {
    localStorage.setItem(STORE_CONFIG_KEY, JSON.stringify(config));
    const now = Date.now();
    pushToSyncServer('store_config', config, now);
  } catch (e) {
    console.error('Error saving store config:', e);
  }
}

const DELETED_PHONES_KEY = 'kirana_deleted_customer_phones';

export function getDeletedCustomerPhones(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_PHONES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading deleted phones:', e);
  }
  return [];
}

export function getNormalizedPhoneVariants(phone: string): string[] {
  if (!phone) return [];
  const digits = phone.replace(/\D/g, '');
  if (!digits) return [];
  const set = new Set<string>();
  set.add(phone.trim());
  set.add(digits);
  if (digits.length >= 10) {
    const last10 = digits.slice(-10);
    set.add(last10);
    set.add(`91${last10}`);
    set.add(`+91${last10}`);
  }
  return Array.from(set);
}

export function isPhoneInDeletedList(phone: string | undefined, deletedList: string[]): boolean {
  if (!phone) return false;
  if (!deletedList || deletedList.length === 0) return false;

  const trimmed = phone.trim();
  const digits = phone.replace(/\D/g, '');

  if (deletedList.includes(trimmed) || (digits && deletedList.includes(digits))) {
    return true;
  }

  const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
  if (last10 && last10.length >= 7) {
    for (const d of deletedList) {
      const dDigits = d.replace(/\D/g, '');
      const dLast10 = dDigits.length >= 10 ? dDigits.slice(-10) : dDigits;
      if (dLast10 && dLast10.length >= 7 && (last10 === dLast10 || (digits && dDigits && digits === dDigits))) {
        return true;
      }
    }
  }

  return false;
}

export function addDeletedCustomerPhone(phone: string) {
  try {
    if (!phone) return;
    const variants = getNormalizedPhoneVariants(phone);
    const current = getDeletedCustomerPhones();
    let updated = [...current];
    let changed = false;
    for (const v of variants) {
      if (!updated.includes(v)) {
        updated.push(v);
        changed = true;
      }
    }
    if (changed) {
      localStorage.setItem(DELETED_PHONES_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('app-state-change', { detail: { type: 'customers' } }));
    }
  } catch (e) {
    console.error('Error saving deleted phone:', e);
  }
}

export function clearDeletedCustomerPhones() {
  localStorage.removeItem(DELETED_PHONES_KEY);
  window.dispatchEvent(new CustomEvent('app-state-change', { detail: { type: 'customers' } }));
}

export function getStoredCustomers(): CustomerRecord[] {
  const deleted = getDeletedCustomerPhones();
  try {
    const raw = localStorage.getItem(CUSTOMERS_KEY);
    if (raw) {
      const list: CustomerRecord[] = JSON.parse(raw);
      if (deleted.length > 0) {
        return list.filter(c => !isPhoneInDeletedList(c.phone, deleted) && !isPhoneInDeletedList(c.id, deleted));
      }
      return list;
    }
  } catch (e) {
    console.error('Error reading customers:', e);
  }
  const initial = SAMPLE_CUSTOMERS.filter(c => !isPhoneInDeletedList(c.phone, deleted));
  localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(initial));
  return initial;
}

export function saveStoredCustomers(customers: CustomerRecord[]) {
  try {
    localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
    const now = Date.now();
    pushToSyncServer('customers', customers, now);
  } catch (e) {
    console.error('Error saving customers:', e);
  }
}

export function registerOrUpdateCustomer(name: string, phone: string, orderTotal?: number): CustomerRecord {
  const current = getStoredCustomers();
  const normalizedPhone = phone.trim();
  const normDigits = normalizedPhone.replace(/\D/g, '');

  // If customer was previously deleted, un-delete if re-registering
  const deleted = getDeletedCustomerPhones();
  if (normDigits && isPhoneInDeletedList(normalizedPhone, deleted)) {
    const variants = getNormalizedPhoneVariants(normalizedPhone);
    const updatedDeleted = deleted.filter(p => !variants.includes(p) && p.replace(/\D/g, '').slice(-10) !== normDigits.slice(-10));
    localStorage.setItem(DELETED_PHONES_KEY, JSON.stringify(updatedDeleted));
  }

  const existingIdx = current.findIndex(
    (c) => c.phone.replace(/\D/g, '') === normDigits || c.phone === normalizedPhone
  );

  const now = new Date().toISOString();

  if (existingIdx >= 0) {
    const cust = current[existingIdx];
    const updated: CustomerRecord = {
      ...cust,
      name: name.trim() || cust.name,
      phone: normalizedPhone,
      lastActive: now,
      totalOrders: (cust.totalOrders || 0) + (orderTotal !== undefined ? 1 : 0),
      totalSpent: (cust.totalSpent || 0) + (orderTotal || 0)
    };
    current[existingIdx] = updated;
    saveStoredCustomers(current);
    return updated;
  } else {
    const newCust: CustomerRecord = {
      id: `cust-${Date.now()}`,
      name: name.trim() || 'Valued Customer',
      phone: normalizedPhone,
      createdAt: now,
      lastActive: now,
      totalOrders: orderTotal !== undefined ? 1 : 0,
      totalSpent: orderTotal || 0,
      notes: 'Registered via self-checkout'
    };
    const updatedList = [newCust, ...current];
    saveStoredCustomers(updatedList);
    return newCust;
  }
}

export function deleteStoredCustomer(idOrPhone: string): CustomerRecord[] {
  const current = getStoredCustomers();
  const rawDigits = idOrPhone.replace(/\D/g, '');

  const found = current.find(
    (c) => c.id === idOrPhone || c.phone === idOrPhone || (rawDigits.length >= 7 && c.phone.replace(/\D/g, '').endsWith(rawDigits.slice(-10)))
  );

  let targetPhone = idOrPhone;
  if (found) {
    targetPhone = found.phone;
  }

  // Add variants for both targetPhone and idOrPhone
  addDeletedCustomerPhone(targetPhone);
  if (idOrPhone !== targetPhone) {
    addDeletedCustomerPhone(idOrPhone);
  }

  const deletedList = getDeletedCustomerPhones();

  // Anonymize customer data from raw stored orders in localStorage
  try {
    const rawOrdersStr = localStorage.getItem(ORDERS_KEY);
    const rawOrders: Order[] = rawOrdersStr ? JSON.parse(rawOrdersStr) : SAMPLE_ORDERS;
    const updatedOrders = rawOrders.map((ord) => {
      if (isPhoneInDeletedList(ord.customerPhone, deletedList)) {
        return {
          ...ord,
          customerName: 'Deleted Customer',
          customerPhone: '0000000000'
        };
      }
      return ord;
    });

    saveStoredOrders(updatedOrders);
  } catch (e) {
    console.error('Error updating orders on customer delete:', e);
  }

  // Clear session if logged in as this deleted customer
  const session = getStoredCustomerSession();
  if (session.phone && isPhoneInDeletedList(session.phone, deletedList)) {
    saveStoredCustomerSession({
      name: '',
      phone: '',
      isLoggedIn: false,
      scannedStore: session.scannedStore
    });
  }

  const updated = current.filter((c) => {
    if (c.id === idOrPhone) return false;
    if (isPhoneInDeletedList(c.phone, deletedList)) return false;
    if (c.id && isPhoneInDeletedList(c.id, deletedList)) return false;
    return true;
  });

  saveStoredCustomers(updated);
  return updated;
}

export function clearAllStoredCustomers(): CustomerRecord[] {
  const current = getStoredCustomers();
  current.forEach(c => {
    if (c.phone) addDeletedCustomerPhone(c.phone);
    if (c.id) addDeletedCustomerPhone(c.id);
  });

  // Anonymize all customer personal details in stored orders
  try {
    const rawOrdersStr = localStorage.getItem(ORDERS_KEY);
    const rawOrders: Order[] = rawOrdersStr ? JSON.parse(rawOrdersStr) : SAMPLE_ORDERS;
    const updatedOrders = rawOrders.map(ord => ({
      ...ord,
      customerName: 'Walk-in Customer',
      customerPhone: '9999999999'
    }));
    saveStoredOrders(updatedOrders);
  } catch (e) {
    console.error('Error clearing customer details from orders:', e);
  }

  // Clear customer session
  const session = getStoredCustomerSession();
  if (session.isLoggedIn) {
    saveStoredCustomerSession({
      name: '',
      phone: '',
      isLoggedIn: false,
      scannedStore: session.scannedStore
    });
  }

  saveStoredCustomers([]);
  return [];
}


export function getStoredInventory(): InventoryItem[] {
  try {
    const raw = localStorage.getItem(INVENTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading inventory:', e);
  }
  localStorage.setItem(INVENTORY_KEY, JSON.stringify(INITIAL_INVENTORY));
  return INITIAL_INVENTORY;
}

export function saveStoredInventory(items: InventoryItem[]) {
  try {
    localStorage.setItem(INVENTORY_KEY, JSON.stringify(items));
    const now = Date.now();
    pushToSyncServer('inventory', items, now);
  } catch (e) {
    console.error('Error saving inventory:', e);
  }
}

export function getStoredOrders(): Order[] {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    let orders: Order[] = raw ? JSON.parse(raw) : SAMPLE_ORDERS;
    const deletedPhones = getDeletedCustomerPhones();
    if (deletedPhones.length > 0) {
      orders = orders.map((ord) => {
        if (isPhoneInDeletedList(ord.customerPhone, deletedPhones)) {
          return {
            ...ord,
            customerName: 'Deleted Customer',
            customerPhone: '0000000000'
          };
        }
        return ord;
      });
    }
    return orders;
  } catch (e) {
    console.error('Error reading orders:', e);
  }
  localStorage.setItem(ORDERS_KEY, JSON.stringify(SAMPLE_ORDERS));
  return SAMPLE_ORDERS;
}

export function saveStoredOrders(orders: Order[]) {
  try {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    const now = Date.now();
    pushToSyncServer('orders', orders, now);
  } catch (e) {
    console.error('Error saving orders:', e);
  }
}

export function getStoredCustomerSession(): CustomerSession {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading customer session:', e);
  }
  const defaultSession: CustomerSession = {
    name: 'Rohan Sharma',
    phone: '9876543210',
    isLoggedIn: false,
    scannedStore: DEFAULT_STORE
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(defaultSession));
  return defaultSession;
}

export function saveStoredCustomerSession(session: CustomerSession) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    window.dispatchEvent(new CustomEvent('app-state-change', { detail: { type: 'session' } }));
  } catch (e) {
    console.error('Error saving session:', e);
  }
}

// Web Audio API chime synthesizer for crisp UI audio cues
export function playChimeSound(type: 'order_sent' | 'order_approved' | 'order_rejected' | 'click' | 'new_order_tune' | 'order_cancelled') {
  try {
    const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
      return;
    }

    if (type === 'new_order_tune' || type === 'order_sent') {
      // Pleasant multi-tone chime: C5, E5, G5, C6
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.09);
        gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.09 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.09);
        osc.stop(ctx.currentTime + i * 0.09 + 0.3);
      });
    } else if (type === 'order_approved') {
      const notes = [587.33, 880, 1174.66]; // D5, A5, D6
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
        gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.35);
      });
    } else if (type === 'order_rejected' || type === 'order_cancelled') {
      const notes = [350, 240, 180];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
        gain.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.22);
      });
    }
  } catch (err) {
    // Audio context may be restricted before user interaction
  }
}

export function formatWeightOrUnits(quantityOrWeight: number, unitType: string): string {
  if (unitType === 'kg') {
    if (quantityOrWeight >= 1000) {
      const kgVal = quantityOrWeight / 1000;
      return `${kgVal % 1 === 0 ? kgVal : kgVal.toFixed(2)} kg`;
    }
    return `${quantityOrWeight} g`;
  } else if (unitType === 'g') {
    return `${quantityOrWeight} g`;
  } else if (unitType === 'bunch') {
    return `${quantityOrWeight} bunch${quantityOrWeight > 1 ? 'es' : ''}`;
  } else if (unitType === 'piece' || unitType === 'pcs') {
    return `${quantityOrWeight} pc${quantityOrWeight > 1 ? 's' : ''}`;
  } else if (unitType === 'dozen') {
    return `${quantityOrWeight} doz`;
  } else {
    return `${quantityOrWeight} ${unitType}`;
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(amount);
}

export function resetAllAppData() {
  localStorage.removeItem(INVENTORY_KEY);
  localStorage.removeItem(ORDERS_KEY);
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(CUSTOMERS_KEY);
  localStorage.removeItem(STORE_CONFIG_KEY);
  localStorage.removeItem(OFFERS_KEY);
  localStorage.removeItem(EXPENSES_KEY);
  localStorage.removeItem(CAMPAIGN_CONFIG_KEY);
  localStorage.removeItem(DELETED_PHONES_KEY);
  window.dispatchEvent(new CustomEvent('app-state-change', { detail: { type: 'all' } }));
}

