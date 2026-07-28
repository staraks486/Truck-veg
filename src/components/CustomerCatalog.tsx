import React, { useState, useMemo } from 'react';
import { InventoryItem, Category, CartItem, CustomerSession, Order } from '../types';
import { ProductCard } from './ProductCard';
import { Search, Mic, Home, Tag as OfferTag, User, ChevronRight, ShoppingBag, QrCode, LogOut, Bell, Trash2, Truck, MapPin, Store, AlertTriangle, Tag, Sparkles, Check, ShieldCheck, Receipt, MessageSquare } from 'lucide-react';
import { formatCurrency, formatWeightOrUnits } from '../utils/storageManager';
import { openWhatsAppShare } from '../utils/whatsappHelper';

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
  onOpenLogin
}) => {
  const [selectedCategory, setSelectedCategory] = useState<Category>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'offers' | 'cart' | 'profile'>('home');

  // Cart checkout state
  const [fulfillmentType, setFulfillmentType] = useState<'store_pickup' | 'home_delivery'>('store_pickup');
  const [deliveryAddress, setDeliveryAddress] = useState(session.deliveryAddress || '');
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number; label: string } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subtotal = cart.reduce((acc, curr) => acc + curr.calculatedPrice, 0);
  const tax = 0;
  const computedDiscount = appliedPromo ? Math.min(subtotal, appliedPromo.discount) : 0;
  const deliveryFee = fulfillmentType === 'home_delivery' ? (subtotal >= 300 ? 0 : 30) : 0;
  const grandTotal = Math.max(0, subtotal - computedDiscount + tax + deliveryFee);

  const freeDeliveryThreshold = 300;
  const progressToFreeDelivery = Math.min(100, (subtotal / freeDeliveryThreshold) * 100);
  const amountNeededForFreeDelivery = Math.max(0, freeDeliveryThreshold - subtotal);

  const PRESET_OFFERS = [
    { code: 'FRESH10', label: '10% OFF Fresh Produce', icon: '🏷️' },
    { code: 'WELCOME50', label: '₹50 OFF (Min ₹250)', icon: '🎁' },
    { code: 'ORGANIC20', label: '₹20 OFF Organic Veggies', icon: '🥦' },
  ];

  const suggestedProducts = useMemo(() => {
    const cartItemIds = new Set(cart.map(c => c.itemId));
    return inventory.filter(item => !cartItemIds.has(item.id) && item.stockQuantity > 0).slice(0, 6);
  }, [inventory, cart]);

  const handleSendWelcomeWhatsApp = () => {
    const welcomeMsg = `🌿 *WELCOME TO FARMER'S GATE!* 🌿
━━━━━━━━━━━━━━━━━━━━━━
Hello *${session.name || 'Valued Customer'}*,

Thank you for logging in and joining our fresh organic produce store! 🥦🍅

🎉 *Your First-Login Welcome Offer:*
Use coupon code *WELCOME50* on your first order of ₹250 or more to get *₹50 OFF* instantly!
Or use *FRESH10* for 10% OFF on all fresh vegetables and fruits.

Shop now and enjoy farm-fresh quality delivered straight to your door or ready for store pickup.

_Fresh, organic, and handpicked daily._`;
    openWhatsAppShare(welcomeMsg, session.phone);
  };

  const handleApplyPromoCode = (codeToApply?: string) => {
    const code = (codeToApply || promoInput).trim().toUpperCase();
    setPromoError(null);

    if (!code) {
      setPromoError('Please enter a valid coupon code.');
      return;
    }

    if (code === 'FRESH10') {
      const discount = Math.round(subtotal * 0.10);
      setAppliedPromo({ code: 'FRESH10', discount, label: '10% OFF Fresh Produce' });
      setPromoInput('');
    } else if (code === 'WELCOME50') {
      if (subtotal < 250) {
        setPromoError('Cart subtotal must be at least ₹250 for WELCOME50.');
        return;
      }
      setAppliedPromo({ code: 'WELCOME50', discount: 50, label: '₹50 Flat Welcome Offer' });
      setPromoInput('');
    } else if (code === 'ORGANIC20') {
      if (subtotal < 100) {
        setPromoError('Cart subtotal must be at least ₹100 for ORGANIC20.');
        return;
      }
      setAppliedPromo({ code: 'ORGANIC20', discount: 20, label: '₹20 Organic Discount' });
      setPromoInput('');
    } else {
      const discount = Math.min(subtotal, Math.max(10, Math.round(subtotal * 0.05)));
      setAppliedPromo({ code, discount, label: `${code} Applied (Special Discount)` });
      setPromoInput('');
    }
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
    return inventory.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [inventory, searchQuery, selectedCategory]);

  const customerNotifications = useMemo(() => {
    return orders
      .filter(o => o.customerPhone === session.phone && (o.status === 'approved' || o.status === 'rejected' || o.status === 'cancelled' || o.status === 'paid'))
      .map(o => ({
        id: o.id,
        title: `Order ${o.status.charAt(0).toUpperCase() + o.status.slice(1)}`,
        message: `Your order #${o.id.slice(-4)} was ${o.status}.`,
        date: o.updatedAt,
        type: o.status === 'approved' || o.status === 'paid' ? 'success' : 'error'
      }));
  }, [orders, session.phone]);

  const userName = session.name || 'Guest';
  const cartBadgeCount = cart.length;
  const unreadCount = customerNotifications.length;

  return (
    <div className="bg-[#f9fafb] min-h-screen pb-28">
      {/* Header Area */}
      <div className="px-4 sm:px-6 pt-4 pb-3 bg-[#f9fafb] sticky top-0 z-25">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-[24px] font-bold text-gray-900 leading-tight">Hi, {userName} 👋</h1>
            <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5">What would you like to buy today?</p>
          </div>
          <div className="flex items-center gap-2.5">
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

      {activeTab === 'home' && (
        <div className="px-6 space-y-6 mt-4">
          {/* Promotional Banner */}
          <div className="relative overflow-hidden bg-[#57864B] rounded-3xl p-6 flex items-center justify-between h-[150px] shadow-sm">
            <div className="relative z-10 w-2/3 flex flex-col justify-center h-full">
              <h2 className="text-[20px] font-bold text-white mb-1 tracking-tight">Fresh & Healthy</h2>
              <p className="text-xs text-green-50 mb-3 font-medium tracking-wide">Get 20% Off on all vegetables</p>
              <button 
                onClick={() => setActiveTab('offers')}
                className="bg-white text-gray-900 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-gray-50 transition-colors w-fit shadow-xs"
              >
                View Offers <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="absolute right-[-30px] top-[-20px] bottom-[-20px] w-[55%]">
              <img 
                src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80" 
                alt="Fresh vegetables" 
                className="w-full h-full object-cover object-left-top" 
                style={{ WebkitMaskImage: 'linear-gradient(to right, transparent, black 30%)' }}
              />
            </div>
          </div>

          {/* WhatsApp First Login Welcome Offer Card */}
          {session.isLoggedIn && (
            <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-green-950 text-white p-4.5 rounded-3xl shadow-md flex flex-col sm:flex-row items-center justify-between gap-3 border border-emerald-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-700/80 rounded-2xl flex items-center justify-center text-emerald-200 shrink-0 border border-emerald-500/40 shadow-inner">
                  <MessageSquare className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs sm:text-sm text-white flex items-center gap-1.5">
                    <span>First Login WhatsApp Offer</span>
                    <span className="text-[10px] bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded-full font-mono">WELCOME50</span>
                  </h4>
                  <p className="text-[11px] text-emerald-200 mt-0.5">Send automated welcome greeting & ₹50 coupon to +91 {session.phone}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSendWelcomeWhatsApp}
                className="w-full sm:w-auto px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs rounded-2xl shadow-md transition-all shrink-0 flex items-center justify-center gap-1.5"
              >
                <span>Send WhatsApp Offer</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Categories */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3">Categories</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none px-1 -mx-1">
              {CATEGORIES.map((cat) => (
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
        <div className="px-6 space-y-4 mt-4">
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

          {/* Account Bar */}
          <div className="bg-emerald-900 text-emerald-100 px-4 py-2.5 rounded-2xl flex items-center justify-between text-xs shadow-sm">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="font-bold text-[11px] text-emerald-200 shrink-0">Account:</span>
              {session.phone ? (
                <span className="font-mono font-black text-white bg-emerald-950 px-2.5 py-0.5 rounded-lg border border-emerald-700 text-[11px] truncate flex items-center gap-1">
                  <span>+91 {session.phone}</span>
                  <Check className="w-3 h-3 text-lime-400" />
                </span>
              ) : (
                <span className="text-[10px] font-extrabold text-amber-300 bg-amber-950 px-2 py-0.5 rounded-lg">
                  Guest Mode
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onOpenLogin}
              className="text-[11px] font-black text-lime-300 hover:text-white bg-emerald-800 hover:bg-emerald-700 px-3 py-1 rounded-xl transition-all"
            >
              {session.isLoggedIn ? 'Account' : 'Link Phone'}
            </button>
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
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs font-black text-emerald-950">
                  <span className="flex items-center gap-1"><Tag className="w-3.5 h-3.5 text-emerald-700" /> Coupons & Savings</span>
                </div>
                {!appliedPromo ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value)}
                        placeholder="Enter coupon (e.g. FRESH10)"
                        className="flex-1 px-3 py-1.5 bg-white border border-emerald-300 rounded-xl text-xs uppercase font-mono text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyPromoCode()}
                        className="px-4 py-1.5 bg-emerald-800 text-white text-xs font-black rounded-xl"
                      >
                        Apply
                      </button>
                    </div>
                    {promoError && <p className="text-[11px] font-bold text-rose-600">{promoError}</p>}
                    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                      {PRESET_OFFERS.map(offer => (
                        <button
                          key={offer.code}
                          type="button"
                          onClick={() => handleApplyPromoCode(offer.code)}
                          className="px-2.5 py-1 bg-white border border-emerald-300 rounded-xl text-[10px] font-black text-emerald-950 shrink-0"
                        >
                          {offer.icon} {offer.code}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-100 p-2.5 rounded-xl flex items-center justify-between text-xs text-emerald-950">
                    <div>
                      <span className="font-mono font-black uppercase bg-white px-1.5 py-0.5 rounded text-[10px]">{appliedPromo.code}</span>
                      <span className="font-black text-emerald-900 ml-2">- {formatCurrency(computedDiscount)} Saved</span>
                    </div>
                    <button type="button" onClick={handleRemovePromo} className="text-rose-600 font-bold text-xs">Remove</button>
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
        <div className="px-6 space-y-4 mt-4">
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

          <button
            onClick={onLogout}
            className="w-full py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-2xl text-sm transition-colors border border-rose-200"
          >
            Logout / Switch User
          </button>
        </div>
      )}

      {/* Bottom Navigation (Always Visible, Never Hidden) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200/60 px-6 py-2 flex items-center justify-between z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        <button 
          onClick={() => { setActiveTab('home'); setSelectedCategory('All'); }} 
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'home' ? 'text-[#427A38]' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-bold">Home</span>
        </button>

        <button 
          onClick={onOpenQRScanner} 
          className="flex flex-col items-center gap-1 text-emerald-700 hover:text-emerald-800 transition-transform active:scale-95"
          title="Scan Product QR Code"
        >
          <div className="w-9 h-9 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-md shadow-emerald-600/30">
            <QrCode className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold">Scan</span>
        </button>

        <button 
          onClick={() => setActiveTab('offers')} 
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'offers' ? 'text-[#427A38]' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <OfferTag className="w-5 h-5" />
          <span className="text-[10px] font-bold">Offers</span>
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
          onClick={() => setActiveTab('profile')} 
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'profile' ? 'text-[#427A38]' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-bold">Profile</span>
        </button>
      </div>
    </div>
  );
};

