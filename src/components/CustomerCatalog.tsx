import React, { useState, useMemo, useEffect } from 'react';
import { InventoryItem, Category, CartItem, CustomerSession } from '../types';
import { ProductCard } from './ProductCard';
import { AIRecipeModal } from './AIRecipeModal';
import { Search, Filter, ShoppingBag, QrCode, Sparkles, Store, Heart, Quote, RefreshCw, Leaf, ShieldCheck, Sun, ChefHat } from 'lucide-react';
import { formatCurrency } from '../utils/storageManager';

interface CustomerCatalogProps {
  inventory: InventoryItem[];
  cart: CartItem[];
  onAddToCart: (item: CartItem) => void;
  onOpenCart: () => void;
  session: CustomerSession;
  onOpenQRScanner: () => void;
  onOpenLogin: () => void;
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
  onOpenLogin
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
    <div className="space-y-4 pb-32">
      {/* Top Instamart / Zepto Header Bar */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-4 sm:p-5 shadow-xl border border-purple-800/60">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-400 text-slate-950 rounded-2xl font-black flex items-center gap-1 shadow-md">
              <Sparkles className="w-4 h-4 fill-slate-950" />
              <span className="text-xs font-black tracking-tight">6 mins</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs text-purple-200 font-bold cursor-pointer hover:text-white transition-colors">
                <span>Work - Central Farm Hub, Sector 14</span>
              </div>
              <p className="text-[11px] text-purple-300 font-medium">
                ⚡ Lightning delivery in 6 minutes • Direct Farm Fresh
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAIRecipeOpen(true)}
              className="px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
              title="Gemini AI Chef Assistant"
            >
              <ChefHat className="w-4 h-4" />
              <span className="hidden sm:inline">AI Chef</span>
            </button>
            <button
              onClick={onOpenQRScanner}
              className="px-3 py-2 bg-purple-800 hover:bg-purple-700 text-purple-100 font-bold text-xs rounded-xl border border-purple-700 transition-all flex items-center gap-1.5 shadow-xs"
            >
              <QrCode className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Scan QR</span>
            </button>
            <button
              onClick={onOpenLogin}
              className="w-10 h-10 rounded-full bg-purple-800/80 hover:bg-purple-700 flex items-center justify-center border border-purple-600 shadow-md text-white font-bold"
            >
              {session.isLoggedIn ? (
                <span className="text-xs font-black">{session.name.charAt(0)}</span>
              ) : (
                <span className="text-xs font-black text-amber-300">👤</span>
              )}
            </button>
          </div>
        </div>

        {/* Store Mode Switcher Pills */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-purple-800/80 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveStoreMode('zepto')}
            className={`px-4 py-1.5 rounded-full text-xs font-black tracking-wide transition-all ${
              activeStoreMode === 'zepto'
                ? 'bg-purple-500 text-white shadow-md'
                : 'bg-purple-950/60 text-purple-300 hover:bg-purple-800/50'
            }`}
          >
            instamart
          </button>
          <button
            onClick={() => setActiveStoreMode('monsoon')}
            className={`px-4 py-1.5 rounded-full text-xs font-black tracking-wide transition-all ${
              activeStoreMode === 'monsoon'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'bg-purple-950/60 text-cyan-200 hover:bg-purple-800/50'
            }`}
          >
            MONSOON STORE
          </button>
          <button
            onClick={() => setActiveStoreMode('fresh')}
            className={`px-4 py-1.5 rounded-full text-xs font-black tracking-wide transition-all ${
              activeStoreMode === 'fresh'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'bg-purple-950/60 text-emerald-200 hover:bg-purple-800/50'
            }`}
          >
            Fresh & Organic
          </button>
        </div>
      </div>

      {/* Search Bar & Promo Banner Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 relative bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for 'Fresh Tomatoes', 'Hydroponic Greens', 'Exotic Fruits'..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all font-medium text-slate-800"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 text-xs text-slate-400 hover:text-slate-600 bg-slate-200 rounded-full w-5 h-5 flex items-center justify-center font-bold"
            >
              ×
            </button>
          )}
        </div>

        <div className="bg-gradient-to-r from-pink-500 to-rose-600 text-white p-3 rounded-2xl shadow-sm flex items-center justify-between text-xs font-bold">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
            <div>
              <p className="font-black">WEEKEND FRESH SALE</p>
              <p className="text-[10px] text-pink-100 font-medium">Flat 20% OFF on all leafy greens</p>
            </div>
          </div>
          <span className="bg-white text-rose-700 px-2 py-1 rounded-lg text-[10px] font-black shadow-xs">
            LIVE
          </span>
        </div>
      </div>

      {/* 0 Fee & Low Price Benefit Banners */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 font-black flex items-center justify-center text-xs">
              ₹0
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900">ZERO FEES</h4>
              <p className="text-[10px] text-slate-500">No Handling or Surge Fee</p>
            </div>
          </div>
          <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 text-[10px] flex items-center justify-center font-black">✓</span>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 font-black flex items-center justify-center text-xs">
              🏷️
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900">EVERYDAY LOW PRICES</h4>
              <p className="text-[10px] text-slate-500">Directly from farm gate</p>
            </div>
          </div>
          <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 text-[10px] flex items-center justify-center font-black">✓</span>
        </div>
      </div>

      {/* Category Pills Slider */}
      <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 shadow-2xs ${
              selectedCategory === cat
                ? 'bg-purple-900 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
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

      {/* Floating Bottom Cart Bar for Desktop/Quick Access */}
      {totalCartItems > 0 && (
        <div className="hidden sm:block fixed bottom-6 right-6 w-96 z-30 animate-slideUp">
          <button
            onClick={onOpenCart}
            className="w-full bg-purple-900 text-white p-3.5 rounded-2xl shadow-xl border border-purple-500/40 hover:bg-purple-800 transition-all flex items-center justify-between group active:scale-98"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 font-black flex items-center justify-center text-sm shadow-inner">
                {totalCartItems}
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-purple-200">Total Bill Amount</p>
                <p className="text-sm font-black text-white">
                  {totalCartItems} {totalCartItems === 1 ? 'Item' : 'Items'} in Cart
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-base font-black text-amber-300">
                {formatCurrency(totalCartPrice)}
              </span>
              <span className="px-3 py-1 bg-amber-400 text-slate-950 font-extrabold text-xs rounded-lg group-hover:bg-amber-300 transition-colors">
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
          className="flex flex-col items-center gap-1 py-1 px-3 text-purple-800 font-black"
        >
          <Store className="w-5 h-5" />
          <span className="text-[10px]">Home</span>
        </button>

        <button
          onClick={onOpenQRScanner}
          className="flex flex-col items-center gap-1 py-1 px-3 text-slate-600 hover:text-purple-800 font-semibold"
        >
          <QrCode className="w-5 h-5" />
          <span className="text-[10px]">Scan QR</span>
        </button>

        <button
          onClick={onOpenCart}
          className="flex flex-col items-center gap-1 py-1 px-3 text-slate-600 hover:text-purple-800 font-semibold relative"
        >
          <ShoppingBag className="w-5 h-5" />
          <span className="text-[10px]">Cart</span>
          {totalCartItems > 0 && (
            <span className="absolute top-0 right-2 bg-rose-600 text-white font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
              {totalCartItems}
            </span>
          )}
        </button>

        <button
          onClick={onOpenLogin}
          className="flex flex-col items-center gap-1 py-1 px-3 text-slate-600 hover:text-purple-800 font-semibold"
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
