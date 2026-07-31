import React, { useState } from 'react';
import { UserRole, CustomerSession } from '../types';
import { getStoredStoreConfig, getStoredCustomers, registerOrUpdateCustomer, saveStoredCustomers } from '../utils/storageManager';
import { Store, UserCheck, Shield, Lock, Phone, ArrowRight, CheckCircle2, Sparkles, Scale, QrCode, MessageCircle, Wifi, Award, X } from 'lucide-react';
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
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [selfVerifyPin, setSelfVerifyPin] = useState('');
  const [selfVerifyError, setSelfVerifyError] = useState('');

  // Shopkeeper form state
  const [shopkeeperPin, setShopkeeperPin] = useState('');
  const [shopkeeperError, setShopkeeperError] = useState('');
  const [isPinVisible, setIsPinVisible] = useState(false);

  // NFC Loyalty login state
  const [showNfcLogin, setShowNfcLogin] = useState(false);
  const [nfcLoginStatus, setNfcLoginStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [nfcLoginError, setNfcLoginError] = useState('');

  const handleNfcLoginSuccess = (name: string, phone: string) => {
    const customers = getStoredCustomers();
    const cleanPhone = phone.trim();
    const inputDigits = cleanPhone.replace(/\D/g, '');
    const existing = customers.find(c => c.phone.replace(/\D/g, '') === inputDigits);

    const now = new Date().toISOString();
    const record = {
      id: existing ? existing.id : `cust-${Date.now()}`,
      name: name,
      phone: cleanPhone,
      createdAt: existing ? existing.createdAt : now,
      lastActive: now,
      totalOrders: existing ? existing.totalOrders || 0 : 0,
      totalSpent: existing ? existing.totalSpent || 0 : 0,
      notes: existing ? existing.notes : 'Logged in via NFC Loyalty Card',
      isWhatsAppVerified: true,
      status: 'active' as const
    };

    const updated = [...customers];
    if (existing) {
      const idx = updated.findIndex(c => c.id === existing.id);
      if (idx >= 0) updated[idx] = record;
    } else {
      updated.push(record);
    }
    saveStoredCustomers(updated);

    onSaveSession({
      ...customerSession,
      name,
      phone: cleanPhone,
      isLoggedIn: true
    });
    onSelectRole('customer', name, cleanPhone);
  };

  // Poll local storage for verification approval in real-time
  React.useEffect(() => {
    if (!showVerification || !customerPhone) return;

    const interval = setInterval(() => {
      const customers = getStoredCustomers();
      const inputDigits = customerPhone.trim().replace(/\D/g, '');
      const currentCust = customers.find(c => {
        const cDigits = c.phone.replace(/\D/g, '');
        return cDigits === inputDigits || (cDigits.slice(-10) === inputDigits.slice(-10) && inputDigits.length >= 10);
      });

      if (currentCust && currentCust.isWhatsAppVerified) {
        clearInterval(interval);
        onSaveSession({
          ...customerSession,
          name: currentCust.name,
          phone: customerPhone.trim(),
          isLoggedIn: true
        });
        onSelectRole('customer', currentCust.name, customerPhone.trim());
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [showVerification, customerPhone, customerSession, onSaveSession, onSelectRole]);

  const handleCustomerLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const phoneToUse = customerPhone.trim();
    if (!phoneToUse || phoneToUse.length < 10) {
      setCustomerError('Please enter a valid 10-digit mobile number');
      return;
    }

    // Generate code and initiate verification flow
    const randomCode = Math.floor(1000 + Math.random() * 9000).toString();
    setVerificationCode(randomCode);
    setSelfVerifyPin('');
    setSelfVerifyError('');

    // Register customer record in DB with pending status
    const customers = getStoredCustomers();
    const inputDigits = phoneToUse.replace(/\D/g, '');
    const existingCustomer = customers.find(c => {
      const cDigits = c.phone.replace(/\D/g, '');
      return cDigits === inputDigits || (cDigits.slice(-10) === inputDigits.slice(-10) && inputDigits.length >= 10);
    });

    const finalName = customerName.trim() || (existingCustomer ? existingCustomer.name : `WhatsApp Guest #${phoneToUse.slice(-4)}`);
    const updatedCustomers = [...customers];
    const now = new Date().toISOString();

    const record = {
      id: existingCustomer ? existingCustomer.id : `cust-${Date.now()}`,
      name: finalName,
      phone: phoneToUse,
      createdAt: existingCustomer ? existingCustomer.createdAt : now,
      lastActive: now,
      totalOrders: existingCustomer ? existingCustomer.totalOrders || 0 : 0,
      totalSpent: existingCustomer ? existingCustomer.totalSpent || 0 : 0,
      notes: existingCustomer ? existingCustomer.notes : 'Registered via self-checkout',
      verificationCode: randomCode,
      isWhatsAppVerified: false,
      status: 'pending_verification' as const
    };

    if (existingCustomer) {
      const idx = updatedCustomers.findIndex(c => c.id === existingCustomer.id);
      if (idx >= 0) updatedCustomers[idx] = record;
    } else {
      updatedCustomers.push(record);
    }

    saveStoredCustomers(updatedCustomers);
    setShowVerification(true);
  };

  const handleSelfVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const phoneToUse = customerPhone.trim();
    const cleanPhone = phoneToUse.replace(/\D/g, '');
    
    // Calculate deterministic expected confirmation PIN
    const expectedPIN = ((parseInt(verificationCode) * 31 + parseInt(cleanPhone.slice(-4))) % 9000 + 1000).toString();
    
    if (selfVerifyPin.trim() === expectedPIN) {
      const customers = getStoredCustomers();
      const inputDigits = phoneToUse.replace(/\D/g, '');
      const existingCustomer = customers.find(c => {
        const cDigits = c.phone.replace(/\D/g, '');
        return cDigits === inputDigits || (cDigits.slice(-10) === inputDigits.slice(-10) && inputDigits.length >= 10);
      });

      const finalName = customerName.trim() || (existingCustomer ? existingCustomer.name : `WhatsApp Guest #${phoneToUse.slice(-4)}`);
      const updatedCustomers = [...customers];
      const now = new Date().toISOString();

      const record = {
        id: existingCustomer ? existingCustomer.id : `cust-${Date.now()}`,
        name: finalName,
        phone: phoneToUse,
        createdAt: existingCustomer ? existingCustomer.createdAt : now,
        lastActive: now,
        totalOrders: existingCustomer ? existingCustomer.totalOrders || 0 : 0,
        totalSpent: existingCustomer ? existingCustomer.totalSpent || 0 : 0,
        notes: existingCustomer ? existingCustomer.notes : 'Registered via self-checkout',
        isWhatsAppVerified: true,
        status: 'active' as const
      };

      if (existingCustomer) {
        const idx = updatedCustomers.findIndex(c => c.id === existingCustomer.id);
        if (idx >= 0) updatedCustomers[idx] = record;
      } else {
        updatedCustomers.push(record);
      }

      saveStoredCustomers(updatedCustomers);

      onSaveSession({
        ...customerSession,
        name: finalName,
        phone: phoneToUse,
        isLoggedIn: true
      });
      onSelectRole('customer', finalName, phoneToUse);
    } else {
      setSelfVerifyError('Invalid Confirmation PIN. Please wait for shopkeeper approval or check the correct PIN.');
    }
  };

  const handlePhoneChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 10);
    setCustomerPhone(clean);
    if (customerError) setCustomerError('');
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
                onClick={() => {
                  setStep('customer-form');
                }}
                className="w-full py-4 rounded-2xl font-black text-sm bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 group cursor-pointer"
              >
                <MessageCircle className="w-4.5 h-4.5 text-emerald-100 animate-pulse" />
                <span>⚡ Free Instant WhatsApp Access</span>
              </button>

              <button
                onClick={() => setStep('shopkeeper-form')}
                className="w-full py-2.5 rounded-xl font-semibold text-[11px] bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors flex items-center justify-center gap-1.5 border border-slate-200"
              >
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                <span>Shopkeeper Login (POS Admin)</span>
              </button>
            </div>
          </div>
        )}

        {step === 'customer-form' && (
          showVerification ? (
            <div className="space-y-4 max-w-sm mx-auto text-left w-full">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-1.5">
                  <MessageCircle className="w-5 h-5 text-emerald-600 animate-pulse" />
                  <span>Verify Number</span>
                </h2>
                <button 
                  type="button" 
                  onClick={() => setShowVerification(false)}
                  className="text-xs text-[#57864B] hover:text-[#476d3d] font-bold"
                >
                  Edit Number
                </button>
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3 shadow-xs">
                <div className="text-center py-2 bg-white rounded-xl border border-emerald-100 p-2">
                  <span className="text-[9px] uppercase tracking-wider text-emerald-800 font-extrabold bg-emerald-100 px-2 py-0.5 rounded-full">
                    Your Verification Code
                  </span>
                  <div className="text-3xl font-mono font-black text-emerald-950 mt-1.5 tracking-widest bg-emerald-50/50 py-1.5 rounded-lg border-2 border-dashed border-emerald-300">
                    {verificationCode}
                  </div>
                </div>

                <div className="space-y-2 text-[11px] font-semibold text-slate-700 leading-relaxed">
                  <p className="flex items-start gap-2">
                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] shrink-0 font-extrabold mt-0.5">1</span>
                    <span>Tap <b>Open WhatsApp</b> below &amp; send the pre-filled message with your code.</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] shrink-0 font-extrabold mt-0.5">2</span>
                    <span><b>Option A:</b> Wait here. The screen will instantly log you in once approved!</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] shrink-0 font-extrabold mt-0.5">3</span>
                    <span><b>Option B:</b> Enter the 4-digit confirmation PIN received from our auto-reply.</span>
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {/* Main WhatsApp Button */}
                <button
                  type="button"
                  onClick={() => {
                    const storePhoneRaw = storeConfig.phone || '9876543210';
                    const cleanedStorePhone = storePhoneRaw.replace(/\D/g, '');
                    const finalStorePhone = (cleanedStorePhone.length === 10) ? `91${cleanedStorePhone}` : cleanedStorePhone;
                    const messageText = `Hello! Please verify my WhatsApp number: +91 ${customerPhone}. (Verification Code: ${verificationCode})`;
                    const waUrl = `https://wa.me/${finalStorePhone}?text=${encodeURIComponent(messageText)}`;
                    window.open(waUrl, '_blank');
                  }}
                  className="w-full py-3.5 rounded-2xl font-black text-sm transition-all shadow-md bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <MessageCircle className="w-5 h-5 text-emerald-100 animate-bounce" />
                  <span>💬 Open WhatsApp &amp; Send</span>
                </button>

                {/* Option A: Real-time Spinner status */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-center">
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin shrink-0"></div>
                    <span className="text-[11px] font-bold text-slate-600 animate-pulse">
                      Waiting for Shopkeeper's WhatsApp Approval...
                    </span>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => {
                      const phoneToUse = customerPhone.trim();
                      const customers = getStoredCustomers();
                      const inputDigits = phoneToUse.replace(/\D/g, '');
                      const existingCustomer = customers.find(c => {
                        const cDigits = c.phone.replace(/\D/g, '');
                        return cDigits === inputDigits || (cDigits.slice(-10) === inputDigits.slice(-10) && inputDigits.length >= 10);
                      });

                      const finalName = customerName.trim() || (existingCustomer ? existingCustomer.name : `WhatsApp Guest #${phoneToUse.slice(-4)}`);
                      const updatedCustomers = [...customers];
                      const now = new Date().toISOString();

                      const record = {
                        id: existingCustomer ? existingCustomer.id : `cust-${Date.now()}`,
                        name: finalName,
                        phone: phoneToUse,
                        createdAt: existingCustomer ? existingCustomer.createdAt : now,
                        lastActive: now,
                        totalOrders: existingCustomer ? existingCustomer.totalOrders || 0 : 0,
                        totalSpent: existingCustomer ? existingCustomer.totalSpent || 0 : 0,
                        notes: existingCustomer ? existingCustomer.notes : 'Registered via self-checkout (Bypassed)',
                        isWhatsAppVerified: true,
                        status: 'active' as const
                      };

                      if (existingCustomer) {
                        const idx = updatedCustomers.findIndex(c => c.id === existingCustomer.id);
                        if (idx >= 0) updatedCustomers[idx] = record;
                      } else {
                        updatedCustomers.push(record);
                      }

                      saveStoredCustomers(updatedCustomers);
                      onSaveSession({
                        ...customerSession,
                        name: finalName,
                        phone: phoneToUse,
                        isLoggedIn: true
                      });
                      onSelectRole('customer', finalName, phoneToUse);
                    }}
                    className="w-full py-2 px-3 rounded-xl font-bold text-[10px] bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>⚡ Instantly Verify & Log In (Demo Bypass)</span>
                  </button>
                </div>

                {/* Option B: Self-verification PIN input */}
                <form onSubmit={handleSelfVerify} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-left">
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider flex justify-between items-center">
                    <span>Or Enter 4-Digit Confirmation PIN:</span>
                    <span className="text-emerald-700 font-bold bg-emerald-100/80 px-2 py-0.5 rounded text-[9px] normal-case border border-emerald-200">
                      Testing PIN: {((parseInt(verificationCode) * 31 + parseInt(customerPhone.trim().replace(/\D/g, '').slice(-4) || '0')) % 9000 + 1000).toString()}
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={4}
                      value={selfVerifyPin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setSelfVerifyPin(val);
                        if (selfVerifyError) setSelfVerifyError('');
                      }}
                      placeholder="e.g. 5821"
                      className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-center font-mono focus:outline-none focus:border-emerald-600 text-black placeholder-slate-300"
                    />
                    <button
                      type="submit"
                      disabled={selfVerifyPin.length !== 4}
                      className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-black rounded-lg disabled:bg-slate-300 disabled:text-slate-500 transition-colors cursor-pointer"
                    >
                      Verify PIN
                    </button>
                  </div>
                  {selfVerifyError && (
                    <p className="text-[10px] font-bold text-rose-600 leading-tight">
                      {selfVerifyError}
                    </p>
                  )}
                </form>
              </div>

              <p className="text-[9px] text-slate-400 font-medium text-center leading-normal">
                Bypass options are provided above for quick testing in development.
              </p>
            </div>
          ) : (
            <form onSubmit={handleCustomerLogin} className="space-y-4 max-w-sm mx-auto">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-1.5">
                  <MessageCircle className="w-5 h-5 text-emerald-600 animate-pulse" />
                  <span>WhatsApp Login</span>
                </h2>
                <button 
                  type="button" 
                  onClick={() => {
                    setStep('intro');
                    setCustomerError('');
                  }}
                  className="text-xs text-[#57864B] hover:text-[#476d3d] font-bold"
                >
                  Back to Home
                </button>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <h4 className="text-xs font-black text-emerald-800 flex items-center gap-1">
                    <span>100% Free Quick Access</span>
                    <span className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.5 rounded-full font-extrabold uppercase">Free</span>
                  </h4>
                  <p className="text-[11px] font-semibold text-emerald-600/95 mt-0.5 leading-relaxed">
                    No password required. Enter your 10-digit WhatsApp number to instantly access your orders and start shopping!
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  WhatsApp Mobile Number (+91) <span className="text-emerald-600 font-extrabold">*</span>
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg text-xs font-bold text-slate-700 border border-slate-300">
                    <span>🇮🇳</span>
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    maxLength={10}
                    value={customerPhone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="9876543210"
                    className="w-full pl-24 pr-4 py-3 border-2 border-slate-950 rounded-xl text-sm font-bold font-mono transition-all bg-white text-black placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#57864B]/30 focus:border-[#57864B]"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Your Name <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <span className="text-[9px] text-emerald-600 font-extrabold uppercase bg-emerald-50 px-1.5 py-0.5 rounded-sm">Instant Setup</span>
                </div>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    if (customerError) setCustomerError('');
                  }}
                  placeholder="e.g. Alex Morgan"
                  className="w-full px-4 py-3 bg-white border-2 border-slate-950 rounded-xl text-sm font-bold text-black placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#57864B]/30 focus:border-[#57864B] transition-all"
                />
              </div>

              {customerError && (
                <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                  {customerError}
                </p>
              )}

               <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-4 rounded-2xl font-black text-sm transition-all shadow-lg flex items-center justify-center gap-2 group cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30"
                >
                  <span>⚡ Start Shopping Instantly (Free)</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {/* NFC Fast Loyalty Sign-in Button */}
              <div className="pt-2 text-center">
                <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2 select-none">&mdash; Or Tap NFC Loyalty &mdash;</div>
                <button
                  type="button"
                  onClick={() => {
                    setShowNfcLogin(true);
                    setNfcLoginStatus('scanning');
                    setNfcLoginError('');
                    
                    // Attempt real Web NFC if browser supports it
                    if ('NDEFReader' in window) {
                      const ndef = new (window as any).NDEFReader();
                      ndef.scan().then(() => {
                        ndef.onreading = (event: any) => {
                          const textDecoder = new TextDecoder();
                          for (const rec of event.message.records) {
                            if (rec.recordType === 'text') {
                              const text = textDecoder.decode(rec.data);
                              const parts = text.split(',');
                              if (parts.length >= 2) {
                                handleNfcLoginSuccess(parts[0].trim(), parts[1].trim());
                              } else {
                                handleNfcLoginSuccess(text, '9876540000');
                              }
                            }
                          }
                        };
                      }).catch((err: any) => {
                        console.warn('Real Web NFC scan error, falling back to simulator', err);
                      });
                    }
                  }}
                  className="w-full py-3 bg-slate-950 hover:bg-black text-white rounded-xl text-xs font-bold border border-slate-800 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm relative overflow-hidden"
                >
                  <Wifi className="w-4 h-4 text-emerald-400 rotate-90 animate-pulse shrink-0" />
                  <span>Tap NFC Loyalty Card to Sign-In</span>
                  <span className="absolute top-0.5 right-1.5 text-[8px] bg-emerald-500 text-slate-950 font-black px-1.5 py-0.5 rounded-full uppercase scale-85 border border-emerald-400/20">
                    RFID
                  </span>
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
          )
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
                  className="w-full pl-10 pr-12 py-3 bg-white border-2 border-slate-950 rounded-xl text-sm font-bold text-black placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all tracking-widest"
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

      {/* NFC Loyalty Login Overlay/Modal */}
      {showNfcLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm animate-fadeIn text-slate-800">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-emerald-500 rounded-xl text-slate-950 animate-pulse">
                  <Wifi className="w-4.5 h-4.5 rotate-90" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-950">NFC Loyalty Fast Login</h3>
                  <p className="text-[10px] text-slate-400 font-semibold font-mono">Contactless Loyalty Check</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNfcLogin(false)}
                className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Antenna animation */}
            <div className="py-6 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-radial from-emerald-100/10 via-transparent to-transparent pointer-events-none" />
              
              <div className="relative flex items-center justify-center w-16 h-16 mb-2">
                <div className="absolute inset-0 rounded-full bg-emerald-500/10 border border-emerald-500/20 animate-ping" />
                <div className="absolute w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 animate-pulse" />
                <div className="w-8 h-8 bg-emerald-500 text-slate-950 rounded-full flex items-center justify-center shadow-md relative z-10">
                  <Wifi className="w-4 h-4 rotate-90" />
                </div>
              </div>

              <p className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
                Hold Card to Phone
              </p>
              <p className="text-[10px] text-slate-400 font-semibold mt-1 max-w-[80%] mx-auto leading-normal">
                Place your physical 13.56MHz NFC loyalty card or keyfob against the back of your device.
              </p>
            </div>

            {/* Simulated Loyalty Cards */}
            <div className="space-y-2">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                Or Simulate Loyalty Card Tap:
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    // sound
                    try {
                      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                      const osc = ctx.createOscillator();
                      const gain = ctx.createGain();
                      osc.connect(gain);
                      gain.connect(ctx.destination);
                      osc.frequency.setValueAtTime(880, ctx.currentTime);
                      gain.gain.setValueAtTime(0.1, ctx.currentTime);
                      osc.start();
                      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
                      osc.stop(ctx.currentTime + 0.15);
                    } catch (e) {}
                    
                    setNfcLoginStatus('success');
                    setTimeout(() => {
                      handleNfcLoginSuccess('Vikram Singh', '9812345678');
                      setShowNfcLogin(false);
                    }, 600);
                  }}
                  className="w-full text-left p-3 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-50 hover:border-amber-400 transition-all flex items-center justify-between group shadow-2xs cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-amber-100 text-amber-800">
                      <Award className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 leading-none">Gold Loyalty Card</p>
                      <p className="text-[9px] text-slate-500 font-medium mt-1">Vikram Singh (+91 98123 45678)</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-black bg-amber-200 text-amber-950 px-2 py-0.5 rounded-md">
                    TAP
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    // sound
                    try {
                      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                      const osc = ctx.createOscillator();
                      const gain = ctx.createGain();
                      osc.connect(gain);
                      gain.connect(ctx.destination);
                      osc.frequency.setValueAtTime(880, ctx.currentTime);
                      gain.gain.setValueAtTime(0.1, ctx.currentTime);
                      osc.start();
                      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
                      osc.stop(ctx.currentTime + 0.15);
                    } catch (e) {}

                    setNfcLoginStatus('success');
                    setTimeout(() => {
                      handleNfcLoginSuccess('Rohan Mehra', '9911223344');
                      setShowNfcLogin(false);
                    }, 600);
                  }}
                  className="w-full text-left p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-all flex items-center justify-between group shadow-2xs cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-slate-200 text-slate-800">
                      <Award className="w-4.5 h-4.5 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 leading-none">Silver Loyalty Card</p>
                      <p className="text-[9px] text-slate-500 font-medium mt-1">Rohan Mehra (+91 99112 23344)</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-black bg-slate-200 text-slate-800 px-2 py-0.5 rounded-md">
                    TAP
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
