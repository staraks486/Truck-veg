import React, { useState, useEffect } from 'react';
import { UserRole, InventoryItem, CartItem, Order, CustomerSession, OrderItem } from './types';
import {
  getStoredInventory,
  saveStoredInventory,
  getStoredOrders,
  saveStoredOrders,
  getStoredCustomerSession,
  saveStoredCustomerSession,
  playChimeSound,
  registerOrUpdateCustomer
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
  const [cart, setCart] = useState<CartItem[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Modals state
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isQRScannerModalOpen, setIsQRScannerModalOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeReceiptOrder, setActiveReceiptOrder] = useState<Order | null>(null);

  // Load initial data & set up realtime cross-tab / cross-role synchronization
  useEffect(() => {
    const loadAllData = () => {
      setInventory(getStoredInventory());
      setOrders(getStoredOrders());
      setCustomerSession(getStoredCustomerSession());
    };

    loadAllData();

    const handleCustomStateChange = () => {
      loadAllData();
    };

    window.addEventListener('app-state-change', handleCustomStateChange);
    window.addEventListener('storage', handleCustomStateChange);

    return () => {
      window.removeEventListener('app-state-change', handleCustomStateChange);
      window.removeEventListener('storage', handleCustomStateChange);
    };
  }, []);

  // Update active receipt when orders update in realtime
  useEffect(() => {
    if (activeReceiptOrder) {
      const updated = orders.find((o) => o.id === activeReceiptOrder.id);
      if (updated) {
        if (updated.status !== activeReceiptOrder.status) {
          if (soundEnabled) {
            if (updated.status === 'approved') playChimeSound('order_approved');
            else if (updated.status === 'rejected') playChimeSound('order_rejected');
          }
        }
        setActiveReceiptOrder(updated);
      }
    }
  }, [orders, activeReceiptOrder, soundEnabled]);

  // Cart operations
  const handleAddToCart = (newItem: CartItem) => {
    if (soundEnabled) playChimeSound('click');
    setCart((prev) => {
      const existingIdx = prev.findIndex((c) => c.itemId === newItem.itemId);
      if (existingIdx > -1) {
        const copy = [...prev];
        const existing = copy[existingIdx];
        const updatedGrams = existing.quantityOrWeight + newItem.quantityOrWeight;
        const updatedPrice = existing.item.unitType === 'kg'
          ? (existing.item.pricePerUnit * updatedGrams) / 1000
          : existing.item.pricePerUnit * updatedGrams;

        copy[existingIdx] = {
          ...existing,
          quantityOrWeight: updatedGrams,
          calculatedPrice: updatedPrice
        };
        return copy;
      }
      return [...prev, newItem];
    });
  };

  const handleUpdateCartQuantity = (itemId: string, newGramsOrCount: number) => {
    if (soundEnabled) playChimeSound('click');
    setCart((prev) =>
      prev.map((item) => {
        if (item.itemId === itemId) {
          const calculatedPrice = item.item.unitType === 'kg'
            ? (item.item.pricePerUnit * newGramsOrCount) / 1000
            : item.item.pricePerUnit * newGramsOrCount;
          return {
            ...item,
            quantityOrWeight: newGramsOrCount,
            calculatedPrice
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

  // Submit order from Customer
  const handleSubmitOrder = (
    customerName: string,
    customerPhone: string,
    sendViaWhatsApp: boolean = false,
    fulfillmentType: 'store_pickup' | 'home_delivery' = 'store_pickup',
    deliveryAddress?: string,
    deliveryFee: number = 0
  ) => {
    const subtotal = cart.reduce((acc, curr) => acc + curr.calculatedPrice, 0);
    const calculatedFee = fulfillmentType === 'home_delivery' ? deliveryFee : 0;
    const grandTotal = subtotal + calculatedFee;

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

    setCart([]);
    setIsCartOpen(false);
    setActiveReceiptOrder(newOrder);
  };

  // Shopkeeper status updates
  const handleUpdateOrderStatus = (
    orderId: string,
    status: Order['status'],
    rejectionReason?: string,
    paymentMethod?: 'UPI' | 'Cash' | 'Card'
  ) => {
    const updated = orders.map((order) => {
      if (order.id === orderId) {
        return {
          ...order,
          status,
          rejectionReason: rejectionReason || order.rejectionReason,
          paymentMethod: paymentMethod || order.paymentMethod,
          updatedAt: new Date().toISOString()
        };
      }
      return order;
    });

    setOrders(updated);
    saveStoredOrders(updated);
  };

  // Shopkeeper weight adjustments on counter scale
  const handleUpdateOrderWeights = (
    orderId: string,
    updatedItems: OrderItem[],
    shopkeeperNote?: string
  ) => {
    const computedSubtotal = updatedItems.reduce((acc, curr) => acc + curr.totalPrice, 0);
    const updated = orders.map((order) => {
      if (order.id === orderId) {
        return {
          ...order,
          items: updatedItems,
          subtotal: computedSubtotal,
          grandTotal: computedSubtotal,
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
  };

  const pendingOrderCount = orders.filter((o) => o.status === 'sent_to_shopkeeper').length;
  const activeCustomerOrder = orders.find(
    (o) => o.status === 'sent_to_shopkeeper' || o.status === 'approved'
  ) || null;

  if (currentView === 'auth') {
    return (
      <AuthLandingPage
        onSelectRole={(selectedRole) => {
          if (soundEnabled) playChimeSound('click');
          setRole(selectedRole);
          setCurrentView('app');
        }}
        customerSession={customerSession}
        onSaveSession={handleSaveSession}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 flex flex-col selection:bg-emerald-200">
      {/* Header Bar */}
      <Header
        role={role}
        onRoleChange={(r) => {
          if (soundEnabled) playChimeSound('click');
          setRole(r);
        }}
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
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {role === 'customer' ? (
          <CustomerCatalog
            inventory={inventory}
            cart={cart}
            onAddToCart={handleAddToCart}
            onOpenCart={() => setIsCartOpen(true)}
            session={customerSession}
            onOpenQRScanner={() => setIsQRScannerModalOpen(true)}
            onOpenLogin={() => setIsLoginModalOpen(true)}
          />
        ) : (
          <ShopkeeperDashboard
            orders={orders}
            inventory={inventory}
            onUpdateOrderStatus={(id, status, reason) =>
              handleUpdateOrderStatus(id, status, reason)
            }
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
              FreshSelf Pay • QR Produce Self-Checkout System
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Empowering local vegetable stores with instant weigh-and-pay verification.
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
