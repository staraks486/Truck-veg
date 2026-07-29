import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, CheckCircle, XCircle, Receipt, X, Bell, AlertTriangle } from 'lucide-react';
import { UserRole, InventoryItem, CartItem, Order, CustomerSession, OrderItem } from './types';
import {
  getStoredInventory,
  saveStoredInventory,
  getStoredOrders,
  saveStoredOrders,
  getStoredCustomerSession,
  saveStoredCustomerSession,
  playChimeSound,
  registerOrUpdateCustomer,
  getLocalTimestamp,
  setLocalTimestamp,
  SCHEMA_VERSION,
  getStoredCart,
  saveStoredCart
} from './utils/storageManager';

import { formatOrderWhatsAppMessage, openWhatsAppShare } from './utils/whatsappHelper';
import { Header } from './components/Header';
import { CustomerCatalog } from './components/CustomerCatalog';
import { ShopkeeperDashboard } from './components/ShopkeeperDashboard';
import { CartDrawer } from './components/CartDrawer';
import { ReceiptModal } from './components/ReceiptModal';
import { CustomerLoginModal } from './components/CustomerLoginModal';
import { QRScannerModal } from './components/QRScannerModal';
import { AuthLandingPage } from './components/AuthLandingPage';

export default function App() {
  const [currentView, setCurrentView] = useState<'auth' | 'app'>('auth');
  const [role, setRole] = useState<UserRole>('customer');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customerSession, setCustomerSession] = useState<CustomerSession>(getStoredCustomerSession());
  const [cart, setCart] = useState<CartItem[]>(getStoredCart());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Modals state
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isQRScannerModalOpen, setIsQRScannerModalOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeReceiptOrder, setActiveReceiptOrder] = useState<Order | null>(null);
  const [isOutdatedVersion, setIsOutdatedVersion] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');

  // Load initial data & set up realtime cross-tab / cross-role synchronization
  useEffect(() => {
    const loadAllData = () => {
      setInventory(getStoredInventory());
      setOrders(getStoredOrders());
      setCustomerSession(getStoredCustomerSession());
      setCart(getStoredCart());
    };

    const syncTypeMap: Record<string, { localKey: string; setStateFn?: (data: any) => void }> = {
      inventory: { localKey: 'qr_veg_inventory_v1', setStateFn: setInventory },
      orders: { localKey: 'qr_veg_orders_v1', setStateFn: setOrders },
      customers: { localKey: 'qr_veg_customer_records_v1' },
      storeConfig: { localKey: 'qr_veg_store_config_v1' },
      offers: { localKey: 'qr_veg_offers_v1' },
      expenses: { localKey: 'qr_veg_expenses_v1' },
      campaignConfig: { localKey: 'qr_veg_campaign_config_v1' },
      cart: { localKey: 'qr_veg_cart_v1', setStateFn: setCart }
    };

    const checkOutdatedVersion = (serverData: any) => {
      let isOutdated = false;
      for (const key of Object.keys(serverData)) {
        const item = serverData[key];
        if (item && typeof item === 'object' && 'schemaVersion' in item) {
          if (item.schemaVersion > SCHEMA_VERSION) {
            isOutdated = true;
          }
        }
      }
      setIsOutdatedVersion(isOutdated);
    };

    const handleServerSyncData = (serverData: any) => {
      let changed = false;
      checkOutdatedVersion(serverData);

      for (const serverType of Object.keys(syncTypeMap)) {
        const item = serverData[serverType];
        if (!item) continue;

        const serverTime = typeof item === 'object' && item !== null && 'updatedAt' in item ? item.updatedAt : 0;
        const serverDataVal = typeof item === 'object' && item !== null && 'data' in item ? item.data : item;

        if (serverDataVal === null || serverDataVal === undefined) continue;

        const arrayKeys = ['inventory', 'orders', 'customers', 'cart', 'offers', 'expenses'];
        if (arrayKeys.includes(serverType) && !Array.isArray(serverDataVal)) {
          continue;
        }

        const localTime = getLocalTimestamp(serverType);

        if (serverTime > localTime || localTime === 0) {
          const { localKey, setStateFn } = syncTypeMap[serverType];
          const rawLocal = localStorage.getItem(localKey);
          const serverStr = JSON.stringify(serverDataVal);
          if (rawLocal !== serverStr) {
            localStorage.setItem(localKey, serverStr);
            setLocalTimestamp(serverType, serverTime);
            if (setStateFn) {
              setStateFn(serverDataVal);
            }
            changed = true;
          }
        }
      }

      if (changed) {
        loadAllData();
      }
    };

    const handleSingleItemUpdate = (serverType: string, serverDataVal: any, serverTime: number) => {
      if (serverType && serverType in syncTypeMap) {
        if (serverDataVal === null || serverDataVal === undefined) return;

        const arrayKeys = ['inventory', 'orders', 'customers', 'cart', 'offers', 'expenses'];
        if (arrayKeys.includes(serverType) && !Array.isArray(serverDataVal)) {
          return;
        }

        const localTime = getLocalTimestamp(serverType);

        if (serverTime > localTime || localTime === 0) {
          const { localKey, setStateFn } = syncTypeMap[serverType];
          const rawLocal = localStorage.getItem(localKey);
          const serverStr = JSON.stringify(serverDataVal);
          if (rawLocal !== serverStr) {
            localStorage.setItem(localKey, serverStr);
            setLocalTimestamp(serverType, serverTime);
            if (setStateFn) {
              setStateFn(serverDataVal);
            }
            loadAllData();
          }
        }
      }
    };

    // EventSource (SSE) setup for instantaneous sub-second live updates
    let eventSource: EventSource | null = null;
    let sseActive = false;

    const setupSSE = () => {
      try {
        if (eventSource) {
          eventSource.close();
        }
        
        eventSource = new EventSource('/api/sync/stream');
        
        eventSource.onopen = () => {
          sseActive = true;
          setSyncStatus('synced');
        };

        eventSource.onmessage = (event) => {
          try {
            setSyncStatus('syncing');
            const message = JSON.parse(event.data);
            if (message.type === 'init') {
              handleServerSyncData(message.store);
            } else {
              handleSingleItemUpdate(message.type, message.data, message.updatedAt);
            }
            setTimeout(() => setSyncStatus('synced'), 400);
          } catch (e) {
            console.error('Failed to parse SSE live message:', e);
          }
        };

        eventSource.onerror = () => {
          sseActive = false;
          setSyncStatus('error');
          if (eventSource) {
            eventSource.close();
          }
        };
      } catch (err) {
        console.error('Error starting EventSource stream:', err);
        sseActive = false;
        setSyncStatus('error');
      }
    };

    const syncWithServerFallback = async () => {
      // If SSE is active and working, we can bypass high-frequency polling to save bandwidth/battery
      if (sseActive) {
        return;
      }

      try {
        setSyncStatus('syncing');
        const response = await fetch('/api/sync');
        if (!response.ok) {
          setSyncStatus('error');
          return;
        }
        const serverData = await response.json();
        handleServerSyncData(serverData);
        setSyncStatus('synced');
      } catch (e) {
        console.error('Failed fallback HTTP sync:', e);
        setSyncStatus('error');
      }
    };

    loadAllData();
    setupSSE();
    syncWithServerFallback(); // Sync immediately on mount

    // Fallback polling loop (runs every 3.5 seconds to cover connectivity drops)
    const syncInterval = setInterval(syncWithServerFallback, 3500);

    // Re-initialize SSE if we detect document visibility or network state changes
    const handleFocusOrOnline = () => {
      if (!sseActive) {
        setupSSE();
      }
    };

    window.addEventListener('focus', handleFocusOrOnline);
    window.addEventListener('online', handleFocusOrOnline);

    const handleCustomStateChange = () => {
      loadAllData();
    };

    window.addEventListener('app-state-change', handleCustomStateChange);
    window.addEventListener('storage', handleCustomStateChange);

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      clearInterval(syncInterval);
      window.removeEventListener('focus', handleFocusOrOnline);
      window.removeEventListener('online', handleFocusOrOnline);
      window.removeEventListener('app-state-change', handleCustomStateChange);
      window.removeEventListener('storage', handleCustomStateChange);
    };
  }, []);

  // Track previous order statuses to trigger real-time toast notifications
  const prevOrdersStatusRef = useRef<Record<string, Order['status']>>({});
  const knownShopkeeperOrdersRef = useRef<Set<string>>(new Set());

  const showCustomerOrderStatusToast = (order: Order, newStatus: 'approved' | 'rejected' | 'cancelled') => {
    if (newStatus === 'approved') {
      toast.custom(
        (t) => (
          <div className="bg-slate-900 border-2 border-emerald-500 text-white rounded-2xl p-4 shadow-2xl max-w-md w-full flex flex-col gap-3 animate-in fade-in slide-in-from-top-5 duration-300">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                  <CheckCircle2 className="w-6 h-6 animate-pulse text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950">
                      Order Approved
                    </span>
                    <span className="text-xs text-slate-400 font-mono font-bold">#{order.id.slice(-6)}</span>
                  </div>
                  <h4 className="text-sm font-bold text-white mt-0.5">
                    Your order is ready for payment!
                  </h4>
                </div>
              </div>
              <button
                onClick={() => toast.dismiss(t)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
              The shopkeeper approved your order ({order.items.length} items • <strong className="text-emerald-400 font-bold">₹{order.grandTotal.toFixed(2)}</strong>). Click below to view your digital bill and complete payment.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  toast.dismiss(t);
                  setActiveReceiptOrder(order);
                }}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-950/50 active:scale-95 cursor-pointer"
              >
                <Receipt className="w-4 h-4" />
                <span>View Bill & Pay Now</span>
              </button>
              <button
                onClick={() => toast.dismiss(t)}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        ),
        { duration: 12000, position: 'top-center' }
      );
    } else if (newStatus === 'rejected') {
      toast.custom(
        (t) => (
          <div className="bg-slate-900 border-2 border-rose-500 text-white rounded-2xl p-4 shadow-2xl max-w-md w-full flex flex-col gap-3 animate-in fade-in slide-in-from-top-5 duration-300">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                  <XCircle className="w-6 h-6 text-rose-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500 text-white">
                      Order Declined
                    </span>
                    <span className="text-xs text-slate-400 font-mono font-bold">#{order.id.slice(-6)}</span>
                  </div>
                  <h4 className="text-sm font-bold text-white mt-0.5">
                    Order declined by store
                  </h4>
                </div>
              </div>
              <button
                onClick={() => toast.dismiss(t)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-300 leading-relaxed bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 space-y-1">
              <p>Your order <span className="font-mono text-slate-200 font-bold">#{order.id.slice(-6)}</span> was declined by the shopkeeper.</p>
              {order.rejectionReason && (
                <p className="font-medium text-rose-300 bg-rose-950/60 border border-rose-900/60 p-2 rounded-lg text-[11px] mt-1">
                  Reason: "{order.rejectionReason}"
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  toast.dismiss(t);
                  setActiveReceiptOrder(order);
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-rose-950/50 active:scale-95 cursor-pointer"
              >
                <Receipt className="w-4 h-4" />
                <span>View Details</span>
              </button>
              <button
                onClick={() => toast.dismiss(t)}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        ),
        { duration: 12000, position: 'top-center' }
      );
    } else if (newStatus === 'cancelled') {
      toast.custom(
        (t) => (
          <div className="bg-slate-900 border-2 border-rose-500 text-white rounded-2xl p-4 shadow-2xl max-w-md w-full flex flex-col gap-3 animate-in fade-in slide-in-from-top-5 duration-300">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                  <XCircle className="w-6 h-6 text-rose-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-600 text-white">
                      Order Cancelled
                    </span>
                    <span className="text-xs text-slate-400 font-mono font-bold">#{order.id.slice(-6)}</span>
                  </div>
                  <h4 className="text-sm font-bold text-white mt-0.5">
                    Order #{order.id.slice(-6)} has been cancelled
                  </h4>
                </div>
              </div>
              <button
                onClick={() => toast.dismiss(t)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-300 leading-relaxed bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 space-y-1">
              <p>Order <span className="font-mono text-slate-200 font-bold">#{order.id.slice(-6)}</span> was cancelled.</p>
              {(order.cancellationReason || order.rejectionReason) && (
                <p className="font-medium text-rose-300 bg-rose-950/60 border border-rose-900/60 p-2 rounded-lg text-[11px] mt-1">
                  Reason: "{order.cancellationReason || order.rejectionReason}"
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  toast.dismiss(t);
                  setActiveReceiptOrder(order);
                }}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>View Details</span>
              </button>
              <button
                onClick={() => toast.dismiss(t)}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        ),
        { duration: 8000, position: 'top-center' }
      );
    }
  };

  // Inspect order status transitions and new live orders
  useEffect(() => {
    if (role === 'customer') {
      orders.forEach((order) => {
        const prevStatus = prevOrdersStatusRef.current[order.id];
        if (prevStatus !== undefined && prevStatus !== order.status) {
          if (order.status === 'approved' || order.status === 'rejected' || order.status === 'cancelled') {
            const matchesCustomerPhone = !customerSession.phone || order.customerPhone === customerSession.phone;
            if (matchesCustomerPhone) {
              if (soundEnabled) {
                if (order.status === 'approved') playChimeSound('order_approved');
                else if (order.status === 'rejected' || order.status === 'cancelled') playChimeSound('order_cancelled');
              }
              showCustomerOrderStatusToast(order, order.status);
            }
          }
        }
        prevOrdersStatusRef.current[order.id] = order.status;
      });
    } else if (role === 'shopkeeper') {
      // Check for newly arrived live orders for shopkeeper
      orders.forEach((order) => {
        if (!knownShopkeeperOrdersRef.current.has(order.id)) {
          knownShopkeeperOrdersRef.current.add(order.id);
          // If a new live order is received in pending status
          if (order.status === 'sent_to_shopkeeper') {
            if (soundEnabled) {
              playChimeSound('new_order_tune');
            }
            toast.custom(
              (t) => (
                <div className="bg-slate-900 border-2 border-amber-400 text-white rounded-2xl p-4 shadow-2xl max-w-md w-full flex flex-col gap-3 animate-in fade-in slide-in-from-top-5 duration-300">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                        <Bell className="w-6 h-6 animate-bounce text-amber-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                            🔔 New Live Order
                          </span>
                          <span className="text-xs text-slate-400 font-mono font-bold">#{order.id.slice(-6)}</span>
                        </div>
                        <h4 className="text-sm font-bold text-white mt-0.5">
                          New order from {order.customerName}
                        </h4>
                      </div>
                    </div>
                    <button
                      onClick={() => toast.dismiss(t)}
                      className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                      aria-label="Close notification"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-xs text-slate-300 leading-relaxed bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-200">{order.items.length} item(s) • {order.fulfillmentType === 'home_delivery' ? 'Home Delivery' : 'Store Pickup'}</p>
                      <p className="text-[11px] text-slate-400">Phone: {order.customerPhone}</p>
                    </div>
                    <span className="text-sm font-mono font-black text-emerald-400">₹{order.grandTotal.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => {
                        toast.dismiss(t);
                        handleUpdateOrderStatus(order.id, 'approved');
                        if (soundEnabled) playChimeSound('order_approved');
                        toast.success(`✅ Order #${order.id.slice(-6)} Accepted! Customer notified.`, { position: 'top-center' });
                      }}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4 text-slate-950" />
                      <span>Accept Order</span>
                    </button>
                    <button
                      onClick={() => toast.dismiss(t)}
                      className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ),
              { duration: 15000, position: 'top-center' }
            );
          }
        }
      });
    }
  }, [orders, role, customerSession.phone, soundEnabled]);

  // Sync active receipt modal order state in realtime
  useEffect(() => {
    if (activeReceiptOrder) {
      const updated = orders.find((o) => o.id === activeReceiptOrder.id);
      if (updated) {
        setActiveReceiptOrder(updated);
      }
    }
  }, [orders, activeReceiptOrder]);

  // Cart operations
  const handleAddToCart = (newItem: CartItem) => {
    if (soundEnabled) playChimeSound('click');
    setCart((prev) => {
      const isKg = newItem.item.unitType === 'kg';
      const currentInventoryItem = inventory.find(i => i.id === newItem.itemId);
      const currentStock = currentInventoryItem ? currentInventoryItem.stockQuantity : newItem.item.stockQuantity;
      const maxStockGramsOrUnits = isKg ? (currentStock * 1000) : currentStock;
      const existingIdx = prev.findIndex((c) => c.itemId === newItem.itemId);

      if (existingIdx > -1) {
        const copy = [...prev];
        const existing = copy[existingIdx];
        const updatedGrams = Math.min(maxStockGramsOrUnits, existing.quantityOrWeight + newItem.quantityOrWeight);
        const updatedPrice = existing.item.unitType === 'kg'
          ? (existing.item.pricePerUnit * updatedGrams) / 1000
          : existing.item.pricePerUnit * updatedGrams;

        copy[existingIdx] = {
          ...existing,
          quantityOrWeight: updatedGrams,
          calculatedPrice: updatedPrice,
          item: currentInventoryItem || existing.item
        };
        return copy;
      }

      const cappedQuantity = Math.min(maxStockGramsOrUnits, newItem.quantityOrWeight);
      const calculatedPrice = newItem.item.unitType === 'kg'
        ? (newItem.item.pricePerUnit * cappedQuantity) / 1000
        : newItem.item.pricePerUnit * cappedQuantity;

      toast.success(`Added ${newItem.item.name} to cart`);

      return [...prev, { ...newItem, quantityOrWeight: cappedQuantity, calculatedPrice, item: currentInventoryItem || newItem.item }];
    });
  };

  const handleUpdateCartQuantity = (itemId: string, newGramsOrCount: number) => {
    if (soundEnabled) playChimeSound('click');
    setCart((prev) =>
      prev.map((item) => {
        if (item.itemId === itemId) {
          const isKg = item.item.unitType === 'kg';
          const currentInventoryItem = inventory.find(i => i.id === itemId);
          const currentStock = currentInventoryItem ? currentInventoryItem.stockQuantity : item.item.stockQuantity;
          const maxStockGramsOrUnits = isKg ? (currentStock * 1000) : currentStock;
          const cappedQuantity = Math.min(maxStockGramsOrUnits, Math.max(0, newGramsOrCount));

          const calculatedPrice = item.item.unitType === 'kg'
            ? (item.item.pricePerUnit * cappedQuantity) / 1000
            : item.item.pricePerUnit * cappedQuantity;

          return {
            ...item,
            quantityOrWeight: cappedQuantity,
            calculatedPrice,
            item: currentInventoryItem || item.item // update item info if possible
          };
        }
        return item;
      })
    );
  };

  const handleRemoveCartItem = (itemId: string) => {
    if (soundEnabled) playChimeSound('click');
    setCart((prev) => prev.filter((i) => i.itemId !== itemId));
  };

  const handleClearCart = () => {
    if (soundEnabled) playChimeSound('click');
    setCart([]);
  };

  // Sync cart to local storage and the server on change, avoiding loops
  useEffect(() => {
    const rawLocal = localStorage.getItem('qr_veg_cart_v1');
    const currentStr = JSON.stringify(cart);
    if (rawLocal !== currentStr) {
      saveStoredCart(cart);
    }
  }, [cart]);

  // Submit order from Customer
  const handleSubmitOrder = (
    customerName: string,
    customerPhone: string,
    sendViaWhatsApp: boolean = false,
    fulfillmentType: 'store_pickup' | 'home_delivery' = 'store_pickup',
    deliveryAddress?: string,
    deliveryFee: number = 0,
    promoCode?: string,
    discountAmount: number = 0
  ) => {
    const subtotal = cart.reduce((acc, curr) => acc + curr.calculatedPrice, 0);
    const calculatedFee = fulfillmentType === 'home_delivery' ? deliveryFee : 0;
    const finalDiscount = Math.min(subtotal, Math.max(0, discountAmount));
    const grandTotal = Math.max(0, subtotal - finalDiscount + calculatedFee);

    const orderItems: OrderItem[] = cart.map((c) => ({
      itemId: c.itemId,
      name: c.item.name,
      unitType: c.item.unitType,
      quantityOrWeight: c.quantityOrWeight,
      pricePerUnit: c.item.pricePerUnit,
      totalPrice: c.calculatedPrice
    }));

    const newOrder: Order = {
      id: `FG-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName,
      customerPhone,
      storeName: customerSession.scannedStore?.name || "Farmer's Gate - Fresh Produce",
      items: orderItems,
      subtotal,
      tax: 0,
      platformFee: 0,
      deliveryFee: calculatedFee,
      promoCode,
      discountAmount: finalDiscount,
      grandTotal,
      status: 'sent_to_shopkeeper',
      fulfillmentType,
      deliveryAddress,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedOrders = [newOrder, ...orders];
    setOrders(updatedOrders);
    saveStoredOrders(updatedOrders);

    // Deduct stock from inventory
    const updatedInventory = inventory.map((invItem) => {
      const cartItem = cart.find(c => c.itemId === invItem.id);
      if (cartItem) {
        const isKg = invItem.unitType === 'kg';
        const reduction = isKg ? cartItem.quantityOrWeight / 1000 : cartItem.quantityOrWeight;
        const newStock = Math.max(0, Number((invItem.stockQuantity - reduction).toFixed(2)));
        return {
          ...invItem,
          stockQuantity: newStock,
          inStock: newStock > 0
        };
      }
      return invItem;
    });
    setInventory(updatedInventory);
    saveStoredInventory(updatedInventory);

    // Save customer name, mobile and address in customer session
    if (deliveryAddress && deliveryAddress.trim()) {
      handleSaveSession({
        ...customerSession,
        name: customerName,
        phone: customerPhone,
        deliveryAddress: deliveryAddress.trim()
      });
    }

    // Save customer name and mobile in shopkeeper data with order increment
    registerOrUpdateCustomer(customerName, customerPhone, grandTotal);

    if (soundEnabled) playChimeSound('order_sent');

    if (sendViaWhatsApp) {
      const message = formatOrderWhatsAppMessage(newOrder);
      openWhatsAppShare(message);
    }

    toast.success("Order placed successfully!");
    setCart([]);
    setIsCartOpen(false);
    setActiveReceiptOrder(newOrder);
  };

  // Shopkeeper & Customer status updates
  const handleUpdateOrderStatus = (
    orderId: string,
    status: Order['status'],
    paymentMethod?: 'UPI' | 'Cash' | 'Card',
    rejectionReason?: string,
    cancellationReason?: string,
    cancelledBy?: 'customer' | 'shopkeeper',
    paymentReminderSent?: boolean,
    paymentReminderMessage?: string
  ) => {
    let orderToRestore: Order | undefined;

    const updated = orders.map((order) => {
      if (order.id === orderId) {
        const isCancel = status === 'cancelled';
        const isReject = status === 'rejected';
        const isPaidOrVerifying = status === 'paid' || status === 'payment_pending_confirmation';
        
        // If order is transitioning to cancelled/rejected from an active state, restore stock
        if ((isCancel || isReject) && order.status !== 'cancelled' && order.status !== 'rejected') {
          orderToRestore = order;
        }

        return {
          ...order,
          status,
          paymentMethod: paymentMethod || order.paymentMethod,
          rejectionReason: rejectionReason || order.rejectionReason,
          cancellationReason: isCancel ? (cancellationReason || rejectionReason || 'Cancelled by user') : order.cancellationReason,
          cancelledBy: isCancel ? (cancelledBy || 'customer') : order.cancelledBy,
          paymentReminderSent: isPaidOrVerifying ? false : (paymentReminderSent !== undefined ? paymentReminderSent : order.paymentReminderSent),
          paymentReminderMessage: isPaidOrVerifying ? undefined : (paymentReminderMessage !== undefined ? paymentReminderMessage : order.paymentReminderMessage),
          paymentReminderSentAt: isPaidOrVerifying ? undefined : (paymentReminderSent ? new Date().toISOString() : order.paymentReminderSentAt),
          updatedAt: new Date().toISOString()
        };
      }
      return order;
    });

    setOrders(updated);
    saveStoredOrders(updated);

    if (orderToRestore) {
      const updatedInventory = inventory.map(invItem => {
        const orderItem = orderToRestore!.items.find(i => i.itemId === invItem.id);
        if (orderItem) {
          const isKg = invItem.unitType === 'kg';
          const restoration = isKg ? orderItem.quantityOrWeight / 1000 : orderItem.quantityOrWeight;
          const newStock = Number((invItem.stockQuantity + restoration).toFixed(2));
          return {
            ...invItem,
            stockQuantity: newStock,
            inStock: newStock > 0
          };
        }
        return invItem;
      });
      setInventory(updatedInventory);
      saveStoredInventory(updatedInventory);
    }

    if (soundEnabled) {
      if (status === 'approved' || status === 'paid') playChimeSound('order_approved');
      else if (status === 'cancelled' || status === 'rejected') playChimeSound('order_cancelled');
    }
  };

  // Shopkeeper weight adjustments on counter scale
  const handleUpdateOrderWeights = (
    orderId: string,
    updatedItems: OrderItem[],
    shopkeeperNote?: string
  ) => {
    const existingOrder = orders.find(o => o.id === orderId);
    if (existingOrder && (existingOrder.status === 'sent_to_shopkeeper' || existingOrder.status === 'approved')) {
      const itemQtyMap: Record<string, { oldQty: number; newQty: number; unitType: string }> = {};
      
      existingOrder.items.forEach(item => {
        itemQtyMap[item.itemId] = {
          oldQty: item.quantityOrWeight,
          newQty: 0,
          unitType: item.unitType
        };
      });

      updatedItems.forEach(item => {
        if (!itemQtyMap[item.itemId]) {
          itemQtyMap[item.itemId] = { oldQty: 0, newQty: item.quantityOrWeight, unitType: item.unitType };
        } else {
          itemQtyMap[item.itemId].newQty = item.quantityOrWeight;
        }
      });

      let invChanged = false;
      const updatedInventory = inventory.map(invItem => {
        const diffData = itemQtyMap[invItem.id];
        if (diffData) {
          const isKg = invItem.unitType === 'kg';
          const oldUnits = isKg ? diffData.oldQty / 1000 : diffData.oldQty;
          const newUnits = isKg ? diffData.newQty / 1000 : diffData.newQty;
          const diff = newUnits - oldUnits; // positive = increased weight, deduct more stock
          if (diff !== 0) {
            invChanged = true;
            const newStock = Math.max(0, Number((invItem.stockQuantity - diff).toFixed(2)));
            return {
              ...invItem,
              stockQuantity: newStock,
              inStock: newStock > 0
            };
          }
        }
        return invItem;
      });

      if (invChanged) {
        setInventory(updatedInventory);
        saveStoredInventory(updatedInventory);
      }
    }

    const computedSubtotal = updatedItems.reduce((acc, curr) => acc + curr.totalPrice, 0);
    const updated = orders.map((order) => {
      if (order.id === orderId) {
        const deliveryFee = order.deliveryFee || 0;
        const discountAmount = order.discountAmount || 0;
        const finalGrandTotal = Math.max(0, computedSubtotal - discountAmount + deliveryFee);
        return {
          ...order,
          items: updatedItems,
          subtotal: computedSubtotal,
          grandTotal: finalGrandTotal,
          shopkeeperNote,
          updatedAt: new Date().toISOString()
        };
      }
      return order;
    });

    setOrders(updated);
    saveStoredOrders(updated);
  };

  // Inventory CRUD
  const handleSaveInventoryItem = (item: InventoryItem) => {
    const exists = inventory.some((i) => i.id === item.id);
    let updated: InventoryItem[];
    if (exists) {
      updated = inventory.map((i) => (i.id === item.id ? item : i));
    } else {
      updated = [item, ...inventory];
    }
    setInventory(updated);
    saveStoredInventory(updated);
  };

  const handleDeleteInventoryItem = (itemId: string) => {
    const updated = inventory.filter((i) => i.id !== itemId);
    setInventory(updated);
    saveStoredInventory(updated);
  };

  const handleToggleStock = (itemId: string) => {
    const updated = inventory.map((i) =>
      i.id === itemId ? { ...i, inStock: !i.inStock } : i
    );
    setInventory(updated);
    saveStoredInventory(updated);
  };

  // Customer session
  const handleSaveSession = (newSession: CustomerSession) => {
    setCustomerSession(newSession);
    saveStoredCustomerSession(newSession);
  };

  const handleScanStoreSuccess = (store: CustomerSession['scannedStore']) => {
    const updated = {
      ...customerSession,
      scannedStore: store
    };
    setCustomerSession(updated);
    saveStoredCustomerSession(updated);

    if (!updated.isLoggedIn || !updated.name?.trim()) {
      // New / not logged in customer -> send to login page
      setCurrentView('auth');
    } else {
      // Already signed in -> give access to the app
      setRole('customer');
      setCurrentView('app');
    }
  };

  const pendingOrderCount = orders.filter((o) => o.status === 'sent_to_shopkeeper').length;
  const activeCustomerOrder = orders.find(
    (o) => (o.status === 'sent_to_shopkeeper' || o.status === 'approved') &&
           (customerSession.phone ? o.customerPhone === customerSession.phone : true)
  ) || null;

  if (currentView === 'auth') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {isOutdatedVersion && (
          <div className="bg-amber-600 text-white px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md relative z-50">
            <AlertTriangle className="w-4.5 h-4.5 shrink-0 animate-pulse text-amber-100" />
            <span>Outdated App Version Detected: A newer database schema is in use. Please reload to sync properly and avoid conflicts.</span>
            <button onClick={() => window.location.reload()} className="underline bg-amber-800 hover:bg-amber-900 px-2 py-1 rounded ml-2 transition-all cursor-pointer">
              Reload Now
            </button>
          </div>
        )}
        <div className="flex-1 flex flex-col">
          <AuthLandingPage
            onSelectRole={(selectedRole) => {
              if (soundEnabled) playChimeSound('click');
              setRole(selectedRole);
              setCurrentView('app');
            }}
            customerSession={customerSession}
            onSaveSession={handleSaveSession}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col selection:bg-emerald-200">
      {isOutdatedVersion && (
        <div className="bg-amber-600 text-white px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md relative z-50">
          <AlertTriangle className="w-4.5 h-4.5 shrink-0 animate-pulse text-amber-100" />
          <span>Outdated App Version Detected: A newer database schema is in use. Please reload to sync properly and avoid conflicts.</span>
          <button onClick={() => window.location.reload()} className="underline bg-amber-800 hover:bg-amber-900 px-2 py-1 rounded ml-2 transition-all cursor-pointer">
            Reload Now
          </button>
        </div>
      )}
      {/* Header Bar */}
      {role === 'shopkeeper' && (
        <Header
          role={role}
          customerSession={customerSession}
          onOpenLogin={() => setIsLoginModalOpen(true)}
          onOpenQRScanner={() => setIsQRScannerModalOpen(true)}
          cartItemCount={cart.length}
          onOpenCart={() => setIsCartOpen(true)}
          pendingOrderCount={pendingOrderCount}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(!soundEnabled)}
          onLogout={() => {
            if (soundEnabled) playChimeSound('click');
            setCurrentView('auth');
          }}
          orders={orders}
          syncStatus={syncStatus}
        />
      )}

      {/* Main Container */}
      <main className={`flex-1 w-full mx-auto ${role === 'shopkeeper' ? 'max-w-7xl px-4 sm:px-6 lg:px-8 py-6' : 'px-0 py-0'}`}>
        {role === 'customer' ? (
          <CustomerCatalog
            inventory={inventory}
            cart={cart}
            onAddToCart={handleAddToCart}
            onUpdateQuantity={handleUpdateCartQuantity}
            onRemoveItem={handleRemoveCartItem}
            onClearCart={handleClearCart}
            onOpenCart={() => setIsCartOpen(true)}
            session={customerSession}
            onOpenQRScanner={() => setIsQRScannerModalOpen(true)}
            onOpenLogin={() => setIsLoginModalOpen(true)}
            activeOrder={activeCustomerOrder}
            onViewReceipt={(order) => setActiveReceiptOrder(order)}
            onCancelOrder={(orderId, reason) =>
              handleUpdateOrderStatus(orderId, 'cancelled', reason, undefined, reason, 'customer')
            }
            onLogout={() => setCurrentView('auth')}
            orders={orders}
            onSubmitOrder={handleSubmitOrder}
            syncStatus={syncStatus}
          />
        ) : (
          <ShopkeeperDashboard
            orders={orders}
            inventory={inventory}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onUpdateOrderWeights={handleUpdateOrderWeights}
            onSaveInventoryItem={handleSaveInventoryItem}
            onDeleteInventoryItem={handleDeleteInventoryItem}
            onToggleStock={handleToggleStock}
            onViewOrderReceipt={(order) => setActiveReceiptOrder(order)}
            onAddOrder={(newOrder) => {
              const updated = [newOrder, ...orders];
              setOrders(updated);
              saveStoredOrders(updated);
              if (soundEnabled) playChimeSound('order_sent');
            }}
          />
        )}
      </main>

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        customerSession={customerSession}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onSubmitOrder={handleSubmitOrder}
        activeOrder={activeCustomerOrder}
        onViewReceipt={(order) => setActiveReceiptOrder(order)}
        onCancelOrder={(orderId, reason) =>
          handleUpdateOrderStatus(orderId, 'cancelled', reason, undefined, reason, 'customer')
        }
      />

      {/* Login Modal */}
      <CustomerLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        session={customerSession}
        onSaveSession={handleSaveSession}
      />

      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={isQRScannerModalOpen}
        onClose={() => setIsQRScannerModalOpen(false)}
        onScanSuccess={handleScanStoreSuccess}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={!!activeReceiptOrder}
        onClose={() => setActiveReceiptOrder(null)}
        order={activeReceiptOrder}
        onUpdateOrderStatus={handleUpdateOrderStatus}
      />

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-6 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <p className="font-bold text-slate-200">
              App design by Arvind Kumar Shukla
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Farmer's Gate • Fresh Produce Self-Checkout System
            </p>
          </div>
          <div className="text-slate-500 font-mono text-[11px]">
            Connected to {customerSession.scannedStore?.name || "Farmer's Gate"}
          </div>
        </div>
      </footer>
    </div>
  );
}
