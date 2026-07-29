import React, { useState } from 'react';
import { UserRole, CustomerSession } from '../types';
import { getStoredStoreConfig } from '../utils/storageManager';
import { Store, UserCheck, Shield, Lock, Phone, ArrowRight, CheckCircle2, Sparkles, Scale, QrCode } from 'lucide-react';
import { motion } from 'motion/react';

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
  const [step, setStep] = useState<'intro' | 'customer-form' | 'shopkeeper-form'>('intro');
  
  const storeConfig = getStoredStoreConfig();
  
  const PHOTOS_LIST = [
    storeConfig.loginPhotoUrl || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=800&q=80'
  ];

  const [currentPhotoIdx, setCurrentPhotoIdx] = useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentPhotoIdx((prev) => (prev + 1) % PHOTOS_LIST.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [PHOTOS_LIST.length]);

  const loginPhoto = PHOTOS_LIST[currentPhotoIdx];

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
    if (shopkeeperPin === '1234' || shopkeeperPin === 'admin' || shopkeeperPin === '0000') {
      onSelectRole('shopkeeper');
    } else {
      setShopkeeperError('Invalid PIN. Try "1234" for demo access.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#4A853B] via-[#569446] to-[#3B6C2F] flex flex-col justify-between text-white relative overflow-hidden font-sans select-none">
      {/* Decorative background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />

      {/* Center Hero Basket Illustration Area & Brand Name below */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 relative z-10 my-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative w-full max-w-[300px] aspect-square flex items-center justify-center"
        >
          {/* Basket Image */}
          <motion.div 
            key={loginPhoto}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="w-64 h-64 sm:w-72 sm:h-72 relative flex items-center justify-center drop-shadow-[0_20px_30px_rgba(0,0,0,0.3)]"
          >
            <img 
              src={loginPhoto} 
              alt="Fresh vegetables in basket" 
              className="w-full h-full object-cover rounded-full border-4 border-white/20 shadow-2xl"
            />
          </motion.div>

          {/* Floating Badge 1 */}
          <motion.div 
            initial={{ opacity: 0, x: -25 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="absolute -left-2 bottom-8 bg-white/95 backdrop-blur-md px-3 py-2 rounded-2xl shadow-xl flex items-center gap-2 border border-white/50 text-slate-800"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-black tracking-tight">No GMOs</span>
          </motion.div>

          {/* Floating Badge 2 */}
          <motion.div 
            initial={{ opacity: 0, x: 25 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="absolute -right-2 bottom-2 bg-white/95 backdrop-blur-md px-3 py-2 rounded-2xl shadow-xl flex items-center gap-2 border border-white/50 text-slate-800"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500 animate-spin" style={{ animationDuration: '6s' }} />
            <span className="text-xs font-black tracking-tight">100% Organic</span>
          </motion.div>
        </motion.div>

        {/* Brand Name Below Photo (Larger & Animated) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.6 }}
          className="mt-6 text-center flex flex-col items-center gap-1.5"
        >
          <div className="bg-white/15 backdrop-blur-md px-3.5 py-1 rounded-full border border-white/30 flex items-center gap-1.5 shadow-md">
            <Store className="w-3.5 h-3.5 text-emerald-200" />
            <span className="text-[11px] font-extrabold tracking-wider uppercase text-emerald-100">Certified Organic Store</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white drop-shadow-lg">
            {storeConfig.name}
          </h2>
        </motion.div>
      </div>

      {/* Bottom Card (White / Frosted Sheet) */}
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="bg-white text-slate-900 rounded-t-[36px] sm:rounded-[32px] px-6 pt-8 pb-8 shadow-[0_-10px_40px_rgba(0,0,0,0.15)] relative z-20 max-w-md mx-auto w-full sm:mb-8 sm:border sm:border-slate-100/80"
      >
        {step === 'intro' && (
          <div className="space-y-6 text-center max-w-sm mx-auto">
            <div>
              <h1 className="text-[26px] sm:text-[30px] font-black tracking-tight text-slate-900 leading-tight">
                Grown Clean On Local Farms, Certified Fresh
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-2.5 leading-relaxed font-medium">
                Small certified farms. No pesticides, nothing artificial Ever.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={() => setStep('customer-form')}
                className="w-full py-4 rounded-2xl font-black text-sm bg-[#57864B] hover:bg-[#476d3d] text-white transition-all shadow-lg shadow-[#57864B]/30 flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => setStep('shopkeeper-form')}
                className="w-full py-3 rounded-2xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center justify-center gap-2"
              >
                <Shield className="w-4 h-4 text-amber-600" />
                <span>Shopkeeper Login (POS Admin)</span>
              </button>
            </div>

            <div className="text-center pt-2">
              <p className="text-xs text-slate-400 font-medium">
                Already have an account?{' '}
                <button 
                  onClick={() => setStep('customer-form')}
                  className="text-[#57864B] font-bold hover:underline"
                >
                  Log In
                </button>
              </p>
            </div>
          </div>
        )}

        {step === 'customer-form' && (
          <form onSubmit={handleCustomerLogin} className="space-y-4 max-w-sm mx-auto">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-black text-slate-900">Customer Access</h2>
              <button 
                type="button" 
                onClick={() => setStep('intro')}
                className="text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                Back
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Your Name <span className="text-emerald-600">*</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  if (customerError) setCustomerError('');
                }}
                placeholder="e.g. Alex Morgan"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#57864B]/30 focus:border-[#57864B] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Indian Mobile Number (+91)
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg text-xs font-bold text-slate-700 border border-slate-200">
                  <span>🇮🇳</span>
                  <span>+91</span>
                </div>
                <input
                  type="tel"
                  maxLength={10}
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="9876543210"
                  className="w-full pl-24 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#57864B]/30 focus:border-[#57864B] transition-all font-mono"
                />
              </div>
            </div>

            {customerError && (
              <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                {customerError}
              </p>
            )}

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-4 rounded-2xl font-black text-sm bg-[#57864B] hover:bg-[#476d3d] text-white transition-all shadow-lg shadow-[#57864B]/30 flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span>Start Shopping & Weighing</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="text-center pt-2">
              <button 
                type="button" 
                onClick={() => setStep('shopkeeper-form')}
                className="text-xs text-amber-700 font-bold hover:underline"
              >
                Switch to Shopkeeper Login
              </button>
            </div>
          </form>
        )}

        {step === 'shopkeeper-form' && (
          <form onSubmit={handleShopkeeperLogin} className="space-y-4 max-w-sm mx-auto">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-black text-slate-900">Shopkeeper Portal</h2>
              <button 
                type="button" 
                onClick={() => setStep('intro')}
                className="text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                Back
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Admin PIN
                </label>
                <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md">Demo PIN: 1234</span>
              </div>
              <div className="relative flex items-center">
                <Lock className="absolute left-3 w-4 h-4 text-slate-400" />
                <input
                  type={isPinVisible ? "text" : "password"}
                  value={shopkeeperPin}
                  onChange={(e) => {
                    setShopkeeperPin(e.target.value);
                    if (shopkeeperError) setShopkeeperError('');
                  }}
                  placeholder="Enter 4-digit PIN (1234)"
                  maxLength={10}
                  className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => setIsPinVisible(!isPinVisible)}
                  className="absolute right-3 text-xs text-slate-500 hover:text-slate-900 font-semibold"
                >
                  {isPinVisible ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {shopkeeperError && (
              <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                {shopkeeperError}
              </p>
            )}

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-4 rounded-2xl font-black text-sm bg-amber-600 hover:bg-amber-700 text-white transition-all shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span>Open Dashboard</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="text-center pt-2">
              <button 
                type="button" 
                onClick={() => setStep('customer-form')}
                className="text-xs text-[#57864B] font-bold hover:underline"
              >
                Switch to Customer Login
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};
