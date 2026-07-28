import { InventoryItem, Order, CustomerSession, CustomerRecord, ProductOffer } from '../types';
import { INITIAL_INVENTORY, DEFAULT_STORE, SAMPLE_ORDERS, SAMPLE_CUSTOMERS } from '../data/mockData';

const INVENTORY_KEY = 'qr_veg_inventory_v1';
const ORDERS_KEY = 'qr_veg_orders_v1';
const SESSION_KEY = 'qr_veg_customer_session_v1';
const CUSTOMERS_KEY = 'qr_veg_customer_records_v1';
const STORE_CONFIG_KEY = 'qr_veg_store_config_v1';
const OFFERS_KEY = 'qr_veg_offers_v1';

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
    window.dispatchEvent(new CustomEvent('app-state-change', { detail: { type: 'offers' } }));
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
    loginPhotoUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80'
  };
  localStorage.setItem(STORE_CONFIG_KEY, JSON.stringify(defaultConfig));
  return defaultConfig;
}

export function saveStoredStoreConfig(config: StoreConfig) {
  try {
    localStorage.setItem(STORE_CONFIG_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('app-state-change', { detail: { type: 'store_config' } }));
  } catch (e) {
    console.error('Error saving store config:', e);
  }
}

export function getStoredCustomers(): CustomerRecord[] {
  try {
    const raw = localStorage.getItem(CUSTOMERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading customers:', e);
  }
  localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(SAMPLE_CUSTOMERS));
  return SAMPLE_CUSTOMERS;
}

export function saveStoredCustomers(customers: CustomerRecord[]) {
  try {
    localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
    window.dispatchEvent(new CustomEvent('app-state-change', { detail: { type: 'customers' } }));
  } catch (e) {
    console.error('Error saving customers:', e);
  }
}

export function registerOrUpdateCustomer(name: string, phone: string, orderTotal?: number): CustomerRecord {
  const current = getStoredCustomers();
  const normalizedPhone = phone.trim();
  const existingIdx = current.findIndex(
    (c) => c.phone.replace(/\D/g, '') === normalizedPhone.replace(/\D/g, '') || c.phone === normalizedPhone
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
    window.dispatchEvent(new CustomEvent('app-state-change', { detail: { type: 'inventory' } }));
  } catch (e) {
    console.error('Error saving inventory:', e);
  }
}

export function getStoredOrders(): Order[] {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading orders:', e);
  }
  localStorage.setItem(ORDERS_KEY, JSON.stringify(SAMPLE_ORDERS));
  return SAMPLE_ORDERS;
}

export function saveStoredOrders(orders: Order[]) {
  try {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    window.dispatchEvent(new CustomEvent('app-state-change', { detail: { type: 'orders' } }));
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
export function playChimeSound(type: 'order_sent' | 'order_approved' | 'order_rejected' | 'click') {
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

    if (type === 'order_sent') {
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.1);
        osc.stop(ctx.currentTime + i * 0.1 + 0.25);
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
    } else if (type === 'order_rejected') {
      const notes = [300, 220];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
        gain.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.2);
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
