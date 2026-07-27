import React, { useState, useMemo, useEffect } from 'react';
import { InventoryItem, Category, CartItem, CustomerSession, Order } from '../types';
import { ProductCard } from './ProductCard';
import { AIRecipeModal } from './AIRecipeModal';
import { Search, Filter, ShoppingBag, QrCode, Sparkles, Store, Heart, Quote, RefreshCw, Leaf, ShieldCheck, Sun, ChefHat, CheckCircle2, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import { formatCurrency } from '../utils/storageManager';

interface CustomerCatalogProps {
  inventory: InventoryItem[];
  cart: CartItem[];
  onAddToCart: (item: CartItem) => void;
  onOpenCart: () => void;
  session: CustomerSession;
  onOpenQRScanner: () => void;
  onOpenLogin: () => void;
  activeOrder?: Order | null;
  onViewReceipt?: (order: Order) => void;
}

const CATEGORIES: Category[] = [
  'All',
  'Daily Essentials',
  'Root Vegetables',
  'Leafy Greens',
  'Exotic Fruits',
  'Organic Herbs'
];

const HEALTHY_QUOTES = [
  {
    quote: "Eating farm-fresh vegetables daily is nature's simplest prescription for longevity, vitality, and natural immunity.",
    author: "Dr. Ann Wigmore",
    tag: "Immunity & Vitality",
    emoji: "🥦"
  },
  {
    quote: "Let food be thy medicine and medicine be thy food. Fresh organic produce nourishes every cell in your body.",
    author: "Hippocrates",
    tag: "Natural Wellness",
    emoji: "🥗"
  },
  {
    quote: "Red ripe tomatoes are loaded with Lycopene and Vitamin C — a power combo for a healthy heart and radiant skin.",
    author: "Nutrition Science Journal",
    tag: "Heart & Skin Health",
    emoji: "🍅"
  }
];

export const CustomerCatalog: React.FC<CustomerCatalogProps> = ({
  inventory,
  cart,
  onAddToCart,
  onOpenCart,
  session,
  onOpenQRScanner,
  onOpenLogin,
  activeOrder,
  onViewReceipt
}) => {
  const [selectedCategory, setSelectedCategory] = useState<Category>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStoreMode, setActiveStoreMode] = useState<'zepto' | 'monsoon' | 'fresh'>('zepto');
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isAIRecipeOpen, setIsAIRecipeOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) + HEALTHY_QUOTES.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const currentQuote = HEALTHY_QUOTES[quoteIndex % HEALTHY_QUOTES.length];

  // Calculate cart metrics
  const totalCartItems = cart.length;
  const totalCartPrice = cart.reduce((acc, curr) => acc + curr.calculatedPrice, 0);

  // Filter inventory
  const filteredItems = useMemo(() => {
    return inventory.filter((item) => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.origin.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [inventory, selectedCategory, searchQuery]);

  return (
    <div className="space-y-4 pb-32 relative">
      {/* Active Self-Checkout Cart Order Status Banner */}
      {activeOrder && (
        <div
          className={`p-4 rounded-3xl border shadow-sm transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
            activeOrder.status === 'approved'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : activeOrder.status === 'sent_to_shopkeeper'
              ? 'bg-amber-50 border-amber-300 text-amber-950'
              : activeOrder.status === 'paid'
              ? 'bg-teal-50 border-teal-300 text-teal-950'
              : 'bg-rose-50 border-rose-300 text-rose-950'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-2xl shrink-0 mt-0.5 ${
              activeOrder.status === 'approved'
                ? 'bg-emerald-600 text-white'
                : activeOrder.status === 'sent_to_shopkeeper'
                ? 'bg-amber-500 text-white animate-pulse'
                : activeOrder.status === 'paid'
                ? 'bg-teal-600 text-white'
                : 'bg-rose-600 text-white'
            }`}>
              {activeOrder.status === 'approved' && <CheckCircle2 className="w-5 h-5" />}
              {activeOrder.status === 'sent_to_shopkeeper' && <Clock className="w-5 h-5 animate-spin" />}
              {activeOrder.status === 'paid' && <CheckCircle2 className="w-5 h-5" />}
              {activeOrder.status === 'rejected' && <AlertTriangle className="w-5 h-5" />}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-sm text-slate-900">
                  Self-Checkout Order #{activeOrder.id}
                </span>

                {/* Explicit Status Badge */}
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${
                  activeOrder.status === 'approved'
                    ? 'bg-emerald-200 text-emerald-900 border border-emerald-400'
                    : activeOrder.status === 'sent_to_shopkeeper'
                    ? 'bg-amber-200 text-amber-950 border border-amber-400'
                    : activeOrder.status === 'paid'
                    ? 'bg-teal-200 text-teal-950 border border-teal-400'
                    : 'bg-rose-200 text-rose-950 border border-rose-400'
                }`}>
                  {activeOrder.status === 'approved'
                    ? 'ACCEPTED'
                    : activeOrder.status === 'sent_to_shopkeeper'
                    ? 'WAITING'
                    : activeOrder.status === 'paid'
                    ? 'PAYMENT COMPLETED'
                    : 'DECLINED'}
                </span>
              </div>

              {/* Status Update Message */}
              <p className="text-xs font-semibold leading-relaxed">
                {activeOrder.status === 'approved' && (
                  <span>✅ <strong>Status Update:</strong> Order Accepted by Shopkeeper! Scale weights & bill finalized. Ready for payment.</span>
                )}
                {activeOrder.status === 'sent_to_shopkeeper' && (
                  <span>⏳ <strong>Status Update:</strong> Waiting for shopkeeper to accept & verify scale weights on counter.</span>
                )}
                {activeOrder.status === 'paid' && (
                  <span>🎉 <strong>Status Update:</strong> Payment confirmed! Thank you for your order.</span>
                )}
                {activeOrder.status === 'rejected' && (
                  <span>❌ <strong>Status Update:</strong> Order declined by shopkeeper. {activeOrder.rejectionReason ? `Reason: ${activeOrder.rejectionReason}` : ''}</span>
                )}
              </p>

              <p className="text-[11px] opacity-75 font-mono">
                {activeOrder.items.length} item{activeOrder.items.length !== 1 ? 's' : ''} • Total Bill: {formatCurrency(activeOrder.grandTotal)} • Mode: {activeOrder.fulfillmentType === 'home_delivery' ? 'Home Delivery' : 'Store Pickup'}
              </p>
            </div>
          </div>

          {onViewReceipt && (
            <button
              type="button"
              onClick={() => onViewReceipt(activeOrder)}
              className={`px-4 py-2.5 rounded-2xl font-black text-xs transition-all shrink-0 flex items-center gap-1.5 shadow-sm active:scale-95 ${
                activeOrder.status === 'approved'
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              <span>{activeOrder.status === 'approved' ? 'Pay Now & View Receipt' : 'View Receipt / Details'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
      {/* Search Bar & Category Header Row */}
      <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200/90 shadow-sm space-y-3">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search fresh vegetables, fruits, herbs (e.g. Tomato, Spinach)..."
            className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all font-medium text-slate-800"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 text-xs text-slate-400 hover:text-slate-600 bg-slate-200 rounded-full w-5 h-5 flex items-center justify-center font-bold"
            >
              ×
            </button>
          )}
        </div>

        {/* Category Pills Slider */}
        <div className="flex items-center gap-2 overflow-x-auto py-0.5 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 shadow-2xs">
          <Filter className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800">No Vegetables Found</h3>
          <p className="text-xs text-slate-500 mt-0.5 max-w-sm mx-auto">
            Try adjusting your search criteria or category filter.
          </p>
          <button
            onClick={() => { setSelectedCategory('All'); setSearchQuery(''); }}
            className="mt-3 px-3.5 py-1.5 bg-purple-100 text-purple-800 font-bold text-xs rounded-xl hover:bg-purple-200 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
          {filteredItems.map((item) => (
            <ProductCard
              key={item.id}
              item={item}
              cart={cart}
              onAddToCart={onAddToCart}
            />
          ))}
        </div>
      )}

      {/* Fixed Bottom Right Animated Floating Action Button (FAB) */}
      <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 animate-float pointer-events-auto">
        <button
          onClick={() => setIsAIRecipeOpen(true)}
          className="animate-glow bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-emerald-200/70 hover:scale-110 active:scale-90 transition-transform duration-200 flex items-center justify-center group cursor-pointer shadow-2xl backdrop-blur-md relative"
          title="100% Pure Veg AI Recipe Generator"
          aria-label="100% Pure Veg AI Recipe Generator"
        >
          <span className="absolute -inset-1 rounded-full bg-emerald-400/30 animate-ping pointer-events-none" />
          <ChefHat className="w-6 h-6 text-white group-hover:rotate-12 transition-transform drop-shadow-md" />
          <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 text-[10px] p-1 rounded-full shadow-md font-black flex items-center justify-center border border-white">
            <Sparkles className="w-2.5 h-2.5 fill-current" />
          </span>
        </button>
      </div>

      {/* Floating Bottom Cart Bar for Desktop/Quick Access */}
      {totalCartItems > 0 && (
        <div className="hidden sm:block fixed bottom-6 left-6 w-96 z-30 animate-slideUp">
          <button
            onClick={onOpenCart}
            className="w-full bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl border border-slate-700 hover:bg-slate-800 transition-all flex items-center justify-between group active:scale-98"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-sm shadow-inner">
                {totalCartItems}
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-400">Total Bill Amount</p>
                <p className="text-sm font-black text-white">
                  {totalCartItems} {totalCartItems === 1 ? 'Item' : 'Items'} in Cart
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-base font-black text-emerald-400">
                {formatCurrency(totalCartPrice)}
              </span>
              <span className="px-3 py-1 bg-emerald-500 text-slate-950 font-extrabold text-xs rounded-lg group-hover:bg-emerald-400 transition-colors">
                Checkout &rarr;
              </span>
            </div>
          </button>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 flex items-center justify-around shadow-xl">
        <button
          onClick={() => { setSelectedCategory('All'); setSearchQuery(''); }}
          className="flex flex-col items-center gap-1 py-1 px-3 text-emerald-700 font-black"
        >
          <Store className="w-5 h-5" />
          <span className="text-[10px]">Home</span>
        </button>

        <button
          onClick={onOpenQRScanner}
          className="flex flex-col items-center gap-1 py-1 px-3 text-slate-600 hover:text-emerald-700 font-semibold"
        >
          <QrCode className="w-5 h-5" />
          <span className="text-[10px]">Scan QR</span>
        </button>

        <button
          onClick={onOpenCart}
          className="flex flex-col items-center gap-1 py-1 px-3 text-slate-600 hover:text-emerald-700 font-semibold relative"
        >
          <ShoppingBag className="w-5 h-5" />
          <span className="text-[10px]">Cart</span>
          {totalCartItems > 0 && (
            <span className="absolute top-0 right-2 bg-emerald-600 text-white font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
              {totalCartItems}
            </span>
          )}
        </button>

        <button
          onClick={onOpenLogin}
          className="flex flex-col items-center gap-1 py-1 px-3 text-slate-600 hover:text-emerald-700 font-semibold"
        >
          <span className="text-lg">👤</span>
          <span className="text-[10px]">{session.isLoggedIn ? session.name.split(' ')[0] : 'Profile'}</span>
        </button>
      </div>

      {/* AI Recipe Generator Modal */}
      <AIRecipeModal
        isOpen={isAIRecipeOpen}
        onClose={() => setIsAIRecipeOpen(false)}
        cart={cart}
      />
    </div>
  );
};
