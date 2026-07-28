import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
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
    rejectionReason?: string,
    paymentMethod?: 'UPI' | 'Cash' | 'Card',
    cancellationReason?: string,
    cancelledBy?: 'customer' | 'shopkeeper'
  ) => {
    let orderToRestore: Order | undefined;

    const updated = orders.map((order) => {
      if (order.id === orderId) {
        const isCancel = status === 'cancelled';
        const isReject = status === 'rejected';
        
        // If order is transitioning to cancelled/rejected from an active state, restore stock
        if ((isCancel || isReject) && order.status !== 'cancelled' && order.status !== 'rejected') {
          orderToRestore = order;
        }

        return {
          ...order,
          status,
          rejectionReason: rejectionReason || order.rejectionReason,
          cancellationReason: isCancel ? (cancellationReason || rejectionReason || 'Cancelled by user') : order.cancellationReason,
          cancelledBy: isCancel ? (cancelledBy || 'customer') : order.cancelledBy,
          paymentMethod: paymentMethod || order.paymentMethod,
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
      if (status === 'cancelled') playChimeSound('click');
    }
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
  ) || (customerSession.phone ? orders.find((o) => o.customerPhone === customerSession.phone) : null) || null;

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
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col selection:bg-emerald-200">
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
