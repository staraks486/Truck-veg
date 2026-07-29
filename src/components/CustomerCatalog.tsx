import React, { useState, useMemo, useEffect } from 'react';
import { InventoryItem, Category, CartItem, CustomerSession, Order } from '../types';
import { ProductCard } from './ProductCard';
import { Search, Mic, Home, Tag as OfferTag, User, ChevronRight, ShoppingBag, QrCode, LogOut, Bell, Trash2, Truck, MapPin, Store, AlertTriangle, Tag, Sparkles, Check, ShieldCheck, Receipt, RotateCcw, CheckCircle2, XCircle, Clock, Percent } from 'lucide-react';
import { formatCurrency, formatWeightOrUnits, getStoredStoreConfig, StoreConfig } from '../utils/storageManager';
import { AppliedPromo, PRESET_PROMO_CODES, parsePromoCode, calculatePromoDiscount } from '../utils/promoManager';
import { toast } from 'sonner';

interface CustomerCatalogProps {
  inventory: InventoryItem[];
  cart: CartItem[];
  onAddToCart: (item: CartItem) => void;
  onUpdateQuantity: (itemId: string, newGramsOrCount: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
  onOpenCart: () => void;
  session: CustomerSession;
  onOpenQRScanner: () => void;
  onOpenLogin: () => void;
  activeOrder?: Order | null;
  onViewReceipt?: (order: Order) => void;
  onCancelOrder?: (orderId: string, reason: string) => void;
  onLogout?: () => void;
  orders?: Order[];
  syncStatus?: 'synced' | 'syncing' | 'error';
  onSubmitOrder: (
    customerName: string,
    customerPhone: string,
    sendViaWhatsApp?: boolean,
    fulfillmentType?: 'store_pickup' | 'home_delivery',
    deliveryAddress?: string,
    deliveryFee?: number,
    promoCode?: string,
    discountAmount?: number
  ) => void;
}

const CATEGORIES: Category[] = [
  'All',
  'Fruits',
  'Vegetables',
  'Dairy',
  'Snacks'
];

export const CustomerCatalog: React.FC<CustomerCatalogProps> = ({
  inventory,
  cart,
  onAddToCart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  session,
  onOpenQRScanner,
  onLogout,
  orders = [],
  onSubmitOrder,
  onOpenLogin,
  activeOrder,
  onViewReceipt,
  syncStatus = 'synced'
}) => {
  const safeInventory = Array.isArray(inventory) ? inventory : [];

  const [selectedCategory, setSelectedCategory] = useState<Category>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const availableCategories = useMemo(() => {
    const catsInInventory = Array.from(new Set(safeInventory.map((i) => i.category).filter(Boolean)));
    return ['All', ...catsInInventory];
  }, [safeInventory]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'offers' | 'cart' | 'profile'>('home');

  const [storeConfig, setStoreConfig] = useState<StoreConfig>(getStoredStoreConfig());

  useEffect(() => {
    const handleStateChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || detail.type === 'store_config') {
        setStoreConfig(getStoredStoreConfig());
      }
    };
    window.addEventListener('app-state-change', handleStateChange as EventListener);
    return () => window.removeEventListener('app-state-change', handleStateChange as EventListener);
  }, []);

  // Cart checkout state
  const [fulfillmentType, setFulfillmentType] = useState<'store_pickup' | 'home_delivery'>('store_pickup');
  const [deliveryAddress, setDeliveryAddress] = useState(session.deliveryAddress || '');
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subtotal = cart.reduce((acc, curr) => acc + curr.calculatedPrice, 0);
  const tax = 0;
  
  // Dynamic promo discount calculation (supports percentage & flat-rate)
  const { discount: computedDiscount, isValid: promoIsValid, errorReason: activePromoError } = calculatePromoDiscount(appliedPromo, subtotal);
  const deliveryFee = fulfillmentType === 'home_delivery' ? (subtotal >= 300 ? 0 : 30) : 0;
  const grandTotal = Math.max(0, subtotal - computedDiscount + tax + deliveryFee);

  const freeDeliveryThreshold = 300;
  const progressToFreeDelivery = Math.min(100, (subtotal / freeDeliveryThreshold) * 100);
  const amountNeededForFreeDelivery = Math.max(0, freeDeliveryThreshold - subtotal);

  const suggestedProducts = useMemo(() => {
    const cartItemIds = new Set(cart.map(c => c.itemId));
    return safeInventory.filter(item => !cartItemIds.has(item.id) && item.stockQuantity > 0).slice(0, 6);
  }, [safeInventory, cart]);

  const handleApplyPromoCode = (codeToApply?: string) => {
    const code = (codeToApply || promoInput).trim().toUpperCase();
    setPromoError(null);

    if (!code) {
      setPromoError('Please enter a valid promo or coupon code.');
      return;
    }

    const rule = parsePromoCode(code);
    if (rule.minSpend && subtotal < rule.minSpend) {
      setPromoError(`Cart subtotal (₹${subtotal.toFixed(0)}) must be at least ₹${rule.minSpend} to use ${code}. Add ₹${(rule.minSpend - subtotal).toFixed(0)} more items.`);
      return;
    }

    setAppliedPromo({
      code: rule.code,
      type: rule.type,
      value: rule.value,
      label: rule.label,
      minSpend: rule.minSpend
    });
    setPromoInput('');
    setPromoError(null);
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoError(null);
  };

  const handleSendOrder = (sendViaWhatsApp: boolean = false) => {
    if (cart.length === 0) return;
    if (!session.isLoggedIn) {
      onOpenLogin();
      return;
    }

    if (fulfillmentType === 'home_delivery' && !deliveryAddress.trim()) {
      setAddressError('Please enter your complete delivery address for home delivery.');
      return;
    }

    setAddressError(null);
    const actualWhatsApp = fulfillmentType === 'home_delivery' ? true : sendViaWhatsApp;

    setIsSubmitting(true);
    setTimeout(() => {
      onSubmitOrder(
        session.name,
        session.phone,
        actualWhatsApp,
        fulfillmentType,
        deliveryAddress.trim(),
        deliveryFee,
        appliedPromo?.code,
        computedDiscount
      );
      setIsSubmitting(false);
      setActiveTab('home');
    }, 500);
  };

  const filteredItems = useMemo(() => {
    return safeInventory.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [safeInventory, searchQuery, selectedCategory]);

  const customerNotifications = useMemo(() => {
    const list = orders
      .filter(o => o.customerPhone === session.phone && (o.status === 'approved' || o.status === 'rejected' || o.status === 'cancelled' || o.status === 'paid'))
      .map(o => ({
        id: o.id,
        title: `Order ${o.status.charAt(0).toUpperCase() + o.status.slice(1)}`,
        message: `Your order #${o.id.slice(-4)} was ${o.status}.`,
        date: o.updatedAt,
        type: o.status === 'approved' || o.status === 'paid' ? 'success' : 'error'
      }));

    const promoOffers = [
      {
        id: 'promo-welcome',
        title: '🎉 First-Login Welcome Offer',
        message: 'Welcome to Farmer\'s Gate! Use coupon code WELCOME50 to get ₹50 OFF on orders above ₹250.',
        date: new Date().toISOString(),
        type: 'success' as const
      },
      {
        id: 'promo-fresh',
        title: '🌿 Fresh Produce Coupon',
        message: 'Use coupon code FRESH10 for 10% OFF on all fresh fruits & vegetables.',
        date: new Date(Date.now() - 3600000).toISOString(),
        type: 'success' as const
      }
    ];

    return [...promoOffers, ...list];
  }, [orders, session.phone]);

  const handleReorder = (order: Order) => {
    let addedCount = 0;
    order.items.forEach(orderItem => {
      const invItem = safeInventory.find(i => i.id === orderItem.itemId);
      if (invItem && invItem.inStock && invItem.stockQuantity > 0) {
        const isKg = invItem.unitType === 'kg';
        const maxStockGramsOrUnits = isKg ? Math.round(invItem.stockQuantity * 1000) : invItem.stockQuantity;
        const qtyToAdd = Math.min(maxStockGramsOrUnits, orderItem.quantityOrWeight);

        if (qtyToAdd > 0) {
          const calculatedPrice = isKg
            ? (invItem.pricePerUnit * qtyToAdd) / 1000
            : invItem.pricePerUnit * qtyToAdd;

          onAddToCart({
            itemId: invItem.id,
            item: invItem,
            quantityOrWeight: qtyToAdd,
            calculatedPrice
          });
          addedCount++;
        }
      }
    });

    if (addedCount > 0) {
      toast.success(`Successfully added ${addedCount} available item(s) from Order #${order.id} to cart!`);
      setActiveTab('cart');
    } else {
      toast.error('None of the items from this order are currently in stock.');
    }
  };

  const userName = session.name || 'Guest';
  const cartBadgeCount = cart.length;
  const unreadCount = customerNotifications.length;

  return (
    <div className="bg-[#f9fafb] min-h-screen pb-28">
      {/* Header Area */}
      <div className="px-4 sm:px-6 pt-4 pb-3 bg-[#f9fafb] sticky top-0 z-25">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-[24px] font-bold text-gray-900 leading-tight">Hi, {userName} 👋</h1>
              <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5">What would you like to buy today?</p>
            </div>
            <div className="flex items-center gap-2.5">
              {/* Advanced Real-time Sync Status Indicator */}
              {syncStatus === 'syncing' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-600 transition-all select-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  <span className="hidden sm:inline">Live</span> Syncing
                </span>
              ) : syncStatus === 'error' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-[10px] font-bold text-rose-600 transition-all select-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                  Offline
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-600 transition-all select-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="hidden sm:inline">Real-time</span> Synced
                </span>
              )}

              {/* Notification Bell Icon */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center border border-gray-100 hover:bg-gray-50 transition-colors"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5 text-gray-700" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-rose-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-xs sm:w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 text-slate-900">
                    <div className="p-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="font-bold text-sm">Notifications</h3>
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{customerNotifications.length}</span>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {customerNotifications.length === 0 ? (
                        <div className="p-6 text-center text-gray-400 text-sm">
                          No new notifications
                        </div>
                      ) : (
                        customerNotifications.map(notif => (
                          <div key={notif.id} className="p-3 border-b border-gray-50 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${notif.type === 'success' ? 'bg-green-500' : 'bg-rose-500'}`} />
                              <h4 className="font-semibold text-xs sm:text-sm text-gray-900">{notif.title}</h4>
                            </div>
                            <p className="text-xs text-gray-600 mt-1 pl-4">{notif.message}</p>
                            <p className="text-[10px] text-gray-400 mt-1 pl-4">{new Date(notif.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Cart Icon */}
              <button 
                onClick={() => setActiveTab('cart')}
                className="relative w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center border border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <ShoppingBag className="w-5 h-5 text-gray-800" />
                {cartBadgeCount > 0 && (
                  <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-[#427A38] text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                    {cartBadgeCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-3 relative flex items-center">
            <Search className="w-5 h-5 text-gray-400 absolute left-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for products"
              className="w-full pl-11 pr-10 py-2.5 bg-white shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] rounded-xl text-sm font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-green-500/20 transition-all border border-gray-100"
            />
            <button className="absolute right-3.5 text-gray-400 hover:text-gray-600">
              <Mic className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'home' && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6 mt-4">
          {/* Active Order Status Notification Banner */}
          {activeOrder && onViewReceipt && (
            <div className={`p-4 rounded-3xl shadow-sm border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 transition-all ${
              activeOrder.status === 'approved'
                ? 'bg-slate-900 text-white border-emerald-500 shadow-emerald-950/20'
                : activeOrder.status === 'reviewed'
                ? 'bg-slate-900 text-white border-sky-500 shadow-sky-950/20'
                : activeOrder.status === 'rejected'
                ? 'bg-slate-900 text-white border-rose-500 shadow-rose-950/20'
                : 'bg-slate-900 text-white border-amber-500 shadow-amber-950/20'
            }`}>
              <div className="flex items-center gap-3.5">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                  activeOrder.status === 'approved'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : activeOrder.status === 'reviewed'
                    ? 'bg-sky-500/20 text-sky-400 border-sky-500/30 animate-pulse'
                    : activeOrder.status === 'rejected'
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                }`}>
                  {activeOrder.status === 'approved' ? (
                    <CheckCircle2 className="w-6 h-6 animate-pulse text-emerald-400" />
                  ) : activeOrder.status === 'reviewed' ? (
                    <ShoppingBag className="w-6 h-6 text-sky-400 animate-bounce" />
                  ) : activeOrder.status === 'rejected' ? (
                    <XCircle className="w-6 h-6 text-rose-400" />
                  ) : (
                    <Clock className="w-6 h-6 animate-spin text-amber-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                      activeOrder.status === 'approved'
                        ? 'bg-emerald-500 text-slate-950'
                        : activeOrder.status === 'reviewed'
                        ? 'bg-sky-500 text-slate-950'
                        : activeOrder.status === 'payment_pending_confirmation'
                        ? 'bg-amber-500 text-slate-950'
                        : activeOrder.status === 'rejected'
                        ? 'bg-rose-500 text-white'
                        : 'bg-amber-500 text-slate-950'
                    }`}>
                      {activeOrder.status === 'approved'
                        ? 'Order Approved'
                        : activeOrder.status === 'reviewed'
                        ? 'Preparing Order'
                        : activeOrder.status === 'payment_pending_confirmation'
                        ? 'Payment Sent'
                        : activeOrder.status === 'rejected'
                        ? 'Order Declined'
                        : 'Reviewing Order'}
                    </span>
                    <span className="text-xs text-slate-400 font-mono font-bold">#{activeOrder.id}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-200 mt-1">
                    {activeOrder.status === 'approved'
                      ? `Your bill of ₹${activeOrder.grandTotal.toFixed(2)} is ready! Click to pay.`
                      : activeOrder.status === 'reviewed'
                      ? `Accepted! Shopkeeper is packing & weighing.${activeOrder.waitingTimeMinutes ? ` Est: ${activeOrder.waitingTimeMinutes} mins.` : ''}${activeOrder.waitingMessage ? ` Message: "${activeOrder.waitingMessage}"` : ' Preparing shortly.'}`
                      : activeOrder.status === 'payment_pending_confirmation'
                      ? `Payment of ₹${activeOrder.grandTotal.toFixed(2)} sent! Awaiting verification.`
                      : activeOrder.status === 'rejected'
                      ? `Declined by store.${activeOrder.rejectionReason ? ` Reason: "${activeOrder.rejectionReason}"` : ''}`
                      : 'Order sent to shopkeeper. Awaiting weight confirmation.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onViewReceipt(activeOrder)}
                className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold shrink-0 flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 ${
                  activeOrder.status === 'approved'
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-950'
                    : activeOrder.status === 'reviewed'
                    ? 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-sky-950'
                    : activeOrder.status === 'payment_pending_confirmation'
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-950'
                    : activeOrder.status === 'rejected'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-950'
                }`}
              >
                <Receipt className="w-4 h-4" />
                {activeOrder.status === 'approved'
                  ? 'View Bill & Pay'
                  : activeOrder.status === 'reviewed'
                  ? 'Track Order'
                  : activeOrder.status === 'payment_pending_confirmation'
                  ? 'Track Verification'
                  : activeOrder.status === 'rejected'
                  ? 'View Details'
                  : 'Track Status'}
              </button>
            </div>
          )}

          {/* Promotional Banner */}
          <div className="relative overflow-hidden bg-[#57864B] rounded-3xl p-6 flex items-center justify-between h-[150px] shadow-sm">
            <div className="relative z-10 w-2/3 flex flex-col justify-center h-full">
              <h2 className="text-[20px] font-bold text-white mb-1 tracking-tight">{storeConfig.bannerTitle || 'Fresh & Healthy'}</h2>
              <p className="text-xs text-green-50 mb-3 font-medium tracking-wide">{storeConfig.bannerSubtitle || 'Get 20% Off on all vegetables'}</p>
              <button 
                onClick={() => setActiveTab('offers')}
                className="bg-white text-gray-900 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-gray-50 transition-colors w-fit shadow-xs"
              >
                View Offers <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="absolute right-[-30px] top-[-20px] bottom-[-20px] w-[55%]">
              <img 
                src={storeConfig.bannerImageUrl || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80"} 
                alt="Fresh vegetables" 
                className="w-full h-full object-cover object-left-top" 
                style={{ WebkitMaskImage: 'linear-gradient(to right, transparent, black 30%)' }}
              />
            </div>
          </div>



          {/* Categories */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3">Categories</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none px-1 -mx-1">
              {availableCategories.map((cat) => (
                <button 
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border shrink-0 ${
                    selectedCategory === cat 
                      ? 'bg-[#57864B] text-white border-[#57864B] shadow-sm' 
                      : 'bg-white text-gray-700 border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* All Products Grid */}
          <div>
            {filteredItems.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                <p className="text-gray-500 text-sm font-medium">No products found matching your search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredItems.map(item => (
                  <ProductCard key={`grid-${item.id}`} item={item} cart={cart} onAddToCart={onAddToCart} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'offers' && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-4 mt-4">
          {/* Offer Page Promotional Banner */}
          <div className="relative overflow-hidden rounded-3xl h-[130px] shadow-sm flex items-center p-6 text-white">
            <div className="absolute inset-0 z-0">
              <img
                src={storeConfig.offerPageBgUrl || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80'}
                alt="Offers Banner"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/90 via-emerald-900/70 to-transparent" />
            </div>
            <div className="relative z-10 max-w-xs">
              <span className="bg-emerald-500 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-md uppercase tracking-wider mb-1 inline-block">Exclusive Deals</span>
              <h2 className="text-lg font-black tracking-tight">Special Store Discounts</h2>
              <p className="text-xs text-emerald-100 font-medium mt-0.5">Save big on your daily fresh groceries & organic produce.</p>
            </div>
          </div>

          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-black text-gray-900">Active Offers & Discounts</h2>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full">3 Available</span>
          </div>

          {/* Offer Card 1 */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-5 rounded-3xl shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="bg-white/20 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-wider">Super Saver</span>
                <h3 className="text-lg font-black mt-2">20% OFF on Organic Vegetables</h3>
                <p className="text-xs text-emerald-100 mt-0.5">Valid on all farm-fresh leafy greens & root vegetables.</p>
              </div>
              <div className="bg-white text-emerald-950 font-black text-xs px-3 py-1.5 rounded-xl shadow-xs">
                FRESH20
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-white/10 text-[11px] font-semibold text-emerald-100">
              <span>Min. purchase ₹250</span>
              <button 
                onClick={() => setActiveTab('home')}
                className="bg-white text-emerald-900 px-3 py-1.5 rounded-xl font-bold hover:bg-emerald-50 transition-colors"
              >
                Shop Now
              </button>
            </div>
          </div>

          {/* Offer Card 2 */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white p-5 rounded-3xl shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="bg-white/20 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-wider">Free Delivery</span>
                <h3 className="text-lg font-black mt-2">Free Delivery on Orders Over ₹500</h3>
                <p className="text-xs text-amber-100 mt-0.5">No coupon code required. Applied automatically at checkout.</p>
              </div>
              <div className="bg-white text-orange-950 font-black text-xs px-3 py-1.5 rounded-xl shadow-xs">
                AUTO
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-white/10 text-[11px] font-semibold text-amber-100">
              <span>All customers eligible</span>
              <button 
                onClick={() => setActiveTab('home')}
                className="bg-white text-orange-900 px-3 py-1.5 rounded-xl font-bold hover:bg-amber-50 transition-colors"
              >
                Browse Store
              </button>
            </div>
          </div>

          {/* Offer Card 3 */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-5 rounded-3xl shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="bg-white/20 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-wider">Dairy Special</span>
                <h3 className="text-lg font-black mt-2">₹50 CashBack on Fresh Milk & Paneer</h3>
                <p className="text-xs text-blue-100 mt-0.5">Use code DAIRY50 when you buy farm-fresh dairy products.</p>
              </div>
              <div className="bg-white text-blue-950 font-black text-xs px-3 py-1.5 rounded-xl shadow-xs">
                DAIRY50
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-white/10 text-[11px] font-semibold text-blue-100">
              <span>Min. purchase ₹300</span>
              <button 
                onClick={() => { setSelectedCategory('Dairy'); setActiveTab('home'); }}
                className="bg-white text-blue-900 px-3 py-1.5 rounded-xl font-bold hover:bg-blue-50 transition-colors"
              >
                View Dairy
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'cart' && (
        <div className="px-4 sm:px-6 space-y-4 mt-4 max-w-2xl mx-auto">
          {/* Cart Header Banner */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-950 via-teal-900 to-green-950 text-white flex items-center justify-between rounded-3xl shadow-lg relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-3 relative z-10">
              <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-2xl text-white shadow-md border border-emerald-300/40">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base tracking-tight text-white">Farmer's Gate Basket</h3>
                <p className="text-[11px] text-emerald-200 font-medium mt-0.5">
                  {cart.length === 0 ? 'Your basket is empty' : `${cart.length} fresh item${cart.length !== 1 ? 's' : ''} in basket`}
                </p>
              </div>
            </div>

            {cart.length > 0 && (
              <button
                type="button"
                onClick={onClearCart}
                className="text-xs text-rose-200 hover:text-white px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/30 transition-all font-bold relative z-10"
              >
                Clear Cart
              </button>
            )}
          </div>



          {/* Free Delivery Progress */}
          {cart.length > 0 && fulfillmentType === 'home_delivery' && (
            <div className="bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-2xl space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-extrabold text-emerald-950">
                <span className="flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-emerald-700" />
                  {amountNeededForFreeDelivery <= 0 ? (
                    <span className="text-emerald-800 font-black">🎉 Free Express Delivery Unlocked!</span>
                  ) : (
                    <span>Add <strong className="text-emerald-900 font-black">{formatCurrency(amountNeededForFreeDelivery)}</strong> more for Free Delivery</span>
                  )}
                </span>
                <span className="font-mono text-xs font-black text-emerald-800 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                  {Math.round(progressToFreeDelivery)}%
                </span>
              </div>
              <div className="w-full h-2 bg-emerald-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                  style={{ width: `${progressToFreeDelivery}%` }}
                />
              </div>
            </div>
          )}

          {/* Cart Items List */}
          <div className="space-y-3">
            {cart.length === 0 ? (
              <div className="py-12 bg-white rounded-3xl border border-gray-100 text-center space-y-3 shadow-sm">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <ShoppingBag className="w-8 h-8 text-emerald-600" />
                </div>
                <h4 className="font-black text-slate-800 text-base">Your Cart is Empty</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Add fresh vegetables & fruits from the catalog or scan produce QR codes to checkout.
                </p>
                <button
                  onClick={() => setActiveTab('home')}
                  className="px-5 py-2.5 bg-emerald-700 text-white text-xs font-bold rounded-2xl shadow-md hover:bg-emerald-800 transition-colors"
                >
                  Explore Catalog
                </button>
              </div>
            ) : (
              cart.map(({ item, quantityOrWeight, calculatedPrice }) => {
                const isKg = item.unitType === 'kg';
                const maxStockGramsOrUnits = isKg ? Math.round(item.stockQuantity * 1000) : item.stockQuantity;
                const isAtMaxStock = quantityOrWeight >= maxStockGramsOrUnits;

                return (
                  <div key={item.id} className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs flex gap-3 items-center">
                    <img
                      src={item.image}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 rounded-xl object-cover bg-slate-100 shrink-0 border"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-black text-xs text-slate-900 truncate">{item.name}</h4>
                        <span className="font-black text-xs text-emerald-900">{formatCurrency(calculatedPrice)}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{formatCurrency(item.pricePerUnit)} / {item.unitType}</p>

                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center bg-emerald-50 p-0.5 rounded-xl border border-emerald-200">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.id, Math.max(isKg ? 50 : 1, quantityOrWeight - (isKg ? 100 : 1)))}
                            className="w-6 h-6 bg-white text-emerald-900 font-black rounded-lg flex items-center justify-center text-xs shadow-2xs"
                          >
                            -
                          </button>
                          <span className="text-xs font-black text-emerald-950 px-2 font-mono">
                            {formatWeightOrUnits(quantityOrWeight, item.unitType)}
                          </span>
                          <button
                            type="button"
                            disabled={isAtMaxStock}
                            onClick={() => onUpdateQuantity(item.id, Math.min(maxStockGramsOrUnits, quantityOrWeight + (isKg ? 100 : 1)))}
                            className="w-6 h-6 bg-white text-emerald-900 font-black rounded-lg flex items-center justify-center text-xs shadow-2xs"
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Suggested Products Section */}
          {suggestedProducts.length > 0 && (
            <div className="bg-white p-4 rounded-3xl border border-slate-200 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-black text-xs text-slate-900">
                  <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>Frequently Bought Together / Suggestions</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Fresh Farm Picks</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {suggestedProducts.map(prod => (
                  <div key={`suggested-${prod.id}`} className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 flex flex-col justify-between gap-2">
                    <div className="flex gap-2 items-center">
                      <img src={prod.image} alt={prod.name} referrerPolicy="no-referrer" className="w-10 h-10 rounded-xl object-cover bg-white" />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs text-slate-900 truncate">{prod.name}</p>
                        <p className="text-[10px] text-emerald-800 font-black">{formatCurrency(prod.pricePerUnit)}/{prod.unitType}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onAddToCart({ itemId: prod.id, item: prod, quantityOrWeight: prod.unitType === 'kg' ? 1000 : 1, calculatedPrice: prod.pricePerUnit })}
                      className="w-full py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-[11px] rounded-xl transition-colors shadow-2xs"
                    >
                      + Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {cart.length > 0 && (
            <div className="space-y-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
              {/* Coupons */}
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-lime-50 border border-emerald-200/90 p-3.5 rounded-2xl space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between text-xs font-black text-emerald-950">
                  <span className="flex items-center gap-1.5"><Tag className="w-4 h-4 text-emerald-700" /> Apply Promo Code & Coupons</span>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                {!appliedPromo ? (
                  <div className="space-y-2">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleApplyPromoCode();
                      }}
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        value={promoInput}
                        onChange={(e) => {
                          setPromoInput(e.target.value);
                          if (promoError) setPromoError(null);
                        }}
                        placeholder="Enter promo code (e.g. FRESH10, 20OFF, WELCOME50)"
                        className="flex-1 px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs uppercase font-mono text-slate-900 outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-black rounded-xl shadow-xs transition-all active:scale-95"
                      >
                        Apply
                      </button>
                    </form>
                    {promoError && (
                      <p className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 p-2 rounded-xl flex items-center gap-1.5 animate-fadeIn">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                        <span>{promoError}</span>
                      </p>
                    )}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 block">Quick Promo Presets:</span>
                      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                        {PRESET_PROMO_CODES.map((offer) => (
                          <button
                            key={offer.code}
                            type="button"
                            onClick={() => handleApplyPromoCode(offer.code)}
                            className="px-2.5 py-1.5 bg-white hover:bg-emerald-100 border border-emerald-300 rounded-xl text-[10px] font-extrabold text-emerald-950 shrink-0 flex items-center gap-1 transition-all active:scale-95 shadow-2xs"
                          >
                            <span>{offer.icon || '🏷️'}</span>
                            <span className="font-mono text-emerald-900">{offer.code}</span>
                            <span className={`px-1 py-0.2 rounded text-[9px] font-black ${
                              offer.type === 'percent'
                                ? 'bg-teal-100 text-teal-800 border border-teal-200'
                                : 'bg-amber-100 text-amber-900 border border-amber-200'
                            }`}>
                              {offer.type === 'percent' ? `${offer.value}% OFF` : `₹${offer.value} OFF`}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="bg-emerald-100/90 border border-emerald-300 p-3 rounded-xl flex items-center justify-between text-xs text-emerald-950 shadow-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-emerald-700 text-white rounded-xl shrink-0">
                          {appliedPromo.type === 'percent' ? (
                            <Percent className="w-4 h-4" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 font-black text-emerald-950">
                            <span className="font-mono uppercase bg-white px-2 py-0.5 rounded border border-emerald-300 text-xs text-emerald-900">
                              {appliedPromo.code}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-200 text-[10px] font-black uppercase text-emerald-900">
                              {appliedPromo.type === 'percent' ? `${appliedPromo.value}% Percentage Discount` : `₹${appliedPromo.value} Flat Discount`}
                            </span>
                          </div>
                          <p className="text-[11px] text-emerald-900 font-extrabold mt-1 flex items-center gap-1">
                            <span>{appliedPromo.label}</span>
                            <strong className="text-emerald-950 bg-emerald-300/80 px-1.5 py-0.2 rounded font-mono font-black">
                              Saved {formatCurrency(computedDiscount)}
                            </strong>
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemovePromo}
                        className="p-1.5 text-emerald-800 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-emerald-200 hover:border-rose-300"
                        title="Remove promo code"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {activePromoError && (
                      <p className="text-[11px] font-bold text-amber-900 bg-amber-100/90 border border-amber-300 p-2 rounded-xl flex items-center gap-1.5 animate-fadeIn">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-700" />
                        <span>{activePromoError}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Fulfillment Mode */}
              <div className="space-y-2">
                <span className="text-[11px] font-black uppercase text-slate-500">Fulfillment Mode:</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFulfillmentType('store_pickup')}
                    className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all ${fulfillmentType === 'store_pickup' ? 'bg-emerald-950 text-white border-emerald-900 ring-2 ring-emerald-600' : 'bg-slate-50 text-slate-700'}`}
                  >
                    <div className="flex items-center gap-1.5 font-black text-xs">
                      <Store className="w-3.5 h-3.5 text-lime-400" />
                      <span>Store Pickup</span>
                    </div>
                    <span className="text-[10px] opacity-80">Free • Instant</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFulfillmentType('home_delivery')}
                    className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all ${fulfillmentType === 'home_delivery' ? 'bg-emerald-950 text-white border-emerald-900 ring-2 ring-emerald-600' : 'bg-slate-50 text-slate-700'}`}
                  >
                    <div className="flex items-center gap-1.5 font-black text-xs">
                      <Truck className="w-3.5 h-3.5 text-amber-400" />
                      <span>Home Delivery</span>
                    </div>
                    <span className="text-[10px] opacity-80">{subtotal >= 300 ? 'FREE' : '₹30 Fee'}</span>
                  </button>
                </div>

                {fulfillmentType === 'home_delivery' && (
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] font-black text-slate-800">Delivery Address *</label>
                    <textarea
                      rows={2}
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Enter flat, street, area & landmark..."
                      className="w-full text-xs bg-slate-50 border border-emerald-300 rounded-xl p-2 text-slate-900 outline-none"
                    />
                    {addressError && <p className="text-[10px] font-bold text-rose-600">{addressError}</p>}
                  </div>
                )}
              </div>

              {/* Bill Details */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between font-black text-slate-900 pb-1 border-b">
                  <span>Item Total</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {computedDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Discount</span>
                    <span>-{formatCurrency(computedDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Delivery Fee</span>
                  <span className="font-bold text-emerald-700">{deliveryFee === 0 ? 'FREE' : formatCurrency(deliveryFee)}</span>
                </div>
                <div className="pt-2 border-t flex justify-between items-baseline font-black text-slate-900 text-sm">
                  <span>To Pay</span>
                  <span className="text-xl text-emerald-900">{formatCurrency(grandTotal)}</span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                type="button"
                onClick={() => handleSendOrder(true)}
                disabled={isSubmitting}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-black text-sm rounded-2xl shadow-xl flex items-center justify-between px-5 active:scale-98"
              >
                <span>{isSubmitting ? 'Processing...' : `Pay ${formatCurrency(grandTotal)}`}</span>
                <span className="flex items-center gap-1 uppercase tracking-wider text-xs">
                  {fulfillmentType === 'home_delivery' ? 'Place Delivery Order' : 'Checkout Order'} <ChevronRight className="w-4 h-4" />
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="px-6 space-y-4 mt-4 max-w-2xl mx-auto">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center font-black text-2xl mx-auto mb-3">
              {userName.charAt(0).toUpperCase()}
            </div>
            <h2 className="text-lg font-bold text-gray-900">{userName}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{session.phone || 'No phone registered'}</p>
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-around text-center">
              <div>
                <p className="text-xs text-gray-400 font-semibold">Total Orders</p>
                <p className="text-base font-black text-gray-900">{orders.filter(o => o.customerPhone === session.phone).length}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold">Saved Address</p>
                <p className="text-sm font-black text-emerald-700">Store Pickup</p>
              </div>
            </div>
          </div>

          {/* Order History & Reorder Section */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm text-slate-900">Your Order History & Reorder</h3>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">
                {orders.filter(o => o.customerPhone === session.phone).length} Orders
              </span>
            </div>

            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {orders.filter(o => o.customerPhone === session.phone).length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No previous orders found. Place an order to see your history & reorder items!
                </div>
              ) : (
                orders
                  .filter(o => o.customerPhone === session.phone)
                  .map(order => (
                    <div key={order.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-mono font-black text-xs text-slate-900">#{order.id}</span>
                          <span className="text-[10px] text-slate-500 ml-2">{new Date(order.createdAt).toLocaleDateString()}</span>
                        </div>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                          order.status === 'approved' || order.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                          order.status === 'rejected' || order.status === 'cancelled' ? 'bg-rose-100 text-rose-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {order.status}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 space-y-1">
                        <p className="font-medium truncate">
                          {order.items.map(i => `${i.name} (${formatWeightOrUnits(i.quantityOrWeight, i.unitType)})`).join(', ')}
                        </p>
                        <div className="flex justify-between items-center pt-1 font-bold">
                          <span className="text-slate-900">Total: {formatCurrency(order.grandTotal)}</span>
                          <button
                            type="button"
                            onClick={() => handleReorder(order)}
                            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs rounded-xl shadow-xs flex items-center gap-1 transition-colors active:scale-95 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reorder</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-2xl text-sm transition-colors border border-rose-200"
          >
            Logout / Switch User
          </button>
        </div>
      )}

      {/* Bottom Navigation (Always Visible, Never Hidden) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200/60 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] max-w-lg mx-auto sm:rounded-t-2xl">
        <div className="px-6 py-2 flex items-center justify-between">
          <button 
            onClick={() => { setActiveTab('home'); setSelectedCategory('All'); }} 
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'home' ? 'text-[#427A38]' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-bold">Home</span>
          </button>

          <button 
            onClick={() => setActiveTab('cart')} 
            className={`flex flex-col items-center gap-1 transition-colors relative ${activeTab === 'cart' ? 'text-[#427A38]' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <ShoppingBag className="w-5 h-5" />
            {cartBadgeCount > 0 && (
              <span className="absolute -top-1 right-0 w-3.5 h-3.5 bg-[#427A38] text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white">
                {cartBadgeCount}
              </span>
            )}
            <span className="text-[10px] font-bold">Cart</span>
          </button>

          <button 
            onClick={() => setActiveTab('offers')} 
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'offers' ? 'text-[#427A38]' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <OfferTag className="w-5 h-5" />
            <span className="text-[10px] font-bold">Offers</span>
          </button>

          <button 
            onClick={() => setActiveTab('profile')} 
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'profile' ? 'text-[#427A38]' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] font-bold">Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
};

