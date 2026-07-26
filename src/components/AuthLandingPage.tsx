import React, { useState } from 'react';
import { UserRole, CustomerSession } from '../types';
import { Store, UserCheck, Shield, Lock, Phone, ArrowRight, CheckCircle2, Sparkles, Scale, QrCode } from 'lucide-react';

interface AuthLandingPageProps {
  onSelectRole: (role: UserRole, customerName?: string, customerPhone?: string) => void;
  customerSession: CustomerSession;
  onSaveSession: (session: CustomerSession) => void;
}

export const AuthLandingPage: React.FC<AuthLandingPageProps> = ({
  onSelectRole,
  customerSession,
  onSaveSession
}) => {
  const [activeTab, setActiveTab] = useState<'customer' | 'shopkeeper'>('customer');
  
  // Customer form state
  const [customerName, setCustomerName] = useState(customerSession.name || '');
  const [customerPhone, setCustomerPhone] = useState(customerSession.phone || '');
  const [customerError, setCustomerError] = useState('');

  // Shopkeeper form state
  const [shopkeeperPin, setShopkeeperPin] = useState('');
  const [shopkeeperError, setShopkeeperError] = useState('');
  const [isPinVisible, setIsPinVisible] = useState(false);

  const handleCustomerLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setCustomerError('Please enter your name to proceed');
      return;
    }
    const phoneToUse = customerPhone.trim() || '9876543210';
    onSaveSession({
      ...customerSession,
      name: customerName.trim(),
      phone: phoneToUse,
      isLoggedIn: true
    });
    onSelectRole('customer', customerName.trim(), phoneToUse);
  };

  const handleShopkeeperLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Default PIN: 1234 or admin
    if (shopkeeperPin === '1234' || shopkeeperPin === 'admin' || shopkeeperPin === '0000') {
      onSelectRole('shopkeeper');
    } else {
      setShopkeeperError('Invalid PIN. Try "1234" for demo access.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 flex flex-col items-center justify-center p-4 sm:p-6 text-slate-100">
      {/* Background Decorative glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Brand */}
      <div className="text-center mb-8 relative z-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-slate-950 shadow-xl mb-4 font-black">
          <Store className="w-9 h-9" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center justify-center gap-2">
          Farmer's Gate <span className="text-emerald-400 text-xs sm:text-sm px-2.5 py-1 rounded-full bg-emerald-900/80 border border-emerald-600/50 uppercase font-extrabold tracking-wider">Self-Pay & POS</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-md mx-auto">
          Smart fresh produce weigh-and-pay system for customers and shopkeepers.
        </p>
      </div>

      {/* Main Auth Card Container */}
      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-2xl overflow-hidden relative z-10">
        {/* Role Selector Tabs */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-950/80 border-b border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('customer')}
            className={`py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
              activeTab === 'customer'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Customer Portal</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('shopkeeper')}
            className={`py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
              activeTab === 'shopkeeper'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Shopkeeper Login</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 sm:p-8">
          {activeTab === 'customer' ? (
            <form onSubmit={handleCustomerLogin} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    Your Name
                  </label>
                  <span className="text-[10px] text-emerald-400 font-semibold">Required for quick order</span>
                </div>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    if (customerError) setCustomerError('');
                  }}
                  placeholder="e.g. Alex Morgan"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Mobile Number (Optional)
                </label>
                <div className="relative flex items-center">
                  <Phone className="absolute left-3 w-4 h-4 text-slate-500" />
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. 98765 43210"
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
              </div>

              {customerError && (
                <p className="text-xs font-bold text-rose-400 bg-rose-950/40 p-2.5 rounded-lg border border-rose-900/50">
                  {customerError}
                </p>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 px-4 rounded-xl font-black text-xs sm:text-sm bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:opacity-95 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <span>Start Shopping & Weighing</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              <div className="pt-4 border-t border-slate-800/80 grid grid-cols-2 gap-3 text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Precise grams / units</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Scan store item QR</span>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleShopkeeperLogin} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    Shopkeeper Admin PIN
                  </label>
                  <span className="text-[10px] text-amber-400 font-semibold">Demo PIN: 1234</span>
                </div>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3 w-4 h-4 text-slate-500" />
                  <input
                    type={isPinVisible ? "text" : "password"}
                    value={shopkeeperPin}
                    onChange={(e) => {
                      setShopkeeperPin(e.target.value);
                      if (shopkeeperError) setShopkeeperError('');
                    }}
                    placeholder="Enter 4-digit PIN (1234)"
                    maxLength={10}
                    className="w-full pl-10 pr-12 py-3 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all tracking-widest"
                  />
                  <button
                    type="button"
                    onClick={() => setIsPinVisible(!isPinVisible)}
                    className="absolute right-3 text-[11px] text-slate-400 hover:text-white font-semibold"
                  >
                    {isPinVisible ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {shopkeeperError && (
                <p className="text-xs font-bold text-rose-400 bg-rose-950/40 p-2.5 rounded-lg border border-rose-900/50">
                  {shopkeeperError}
                </p>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 px-4 rounded-xl font-black text-xs sm:text-sm bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:opacity-95 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <span>Open Shopkeeper Dashboard</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              <div className="pt-4 border-t border-slate-800/80 space-y-2 text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Approve & reject customer orders</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Manage inventory prices and weights</span>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-8 text-center text-xs text-slate-500 relative z-10">
        <p>Farmer's Gate Fresh Produce POS • Secure Terminal Session</p>
      </div>
    </div>
  );
};
