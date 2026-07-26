import React, { useState } from 'react';
import { X, User, Phone, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import { CustomerSession } from '../types';
import { registerOrUpdateCustomer, playChimeSound } from '../utils/storageManager';

interface CustomerLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: CustomerSession;
  onSaveSession: (session: CustomerSession) => void;
}

export const CustomerLoginModal: React.FC<CustomerLoginModalProps> = ({
  isOpen,
  onClose,
  session,
  onSaveSession
}) => {
  const [name, setName] = useState(session.name || '');
  const [phone, setPhone] = useState(session.phone || '');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleDirectLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!phone.trim() || phone.length < 8) {
      setError('Please enter a valid mobile number');
      return;
    }

    // Save customer name and mobile into shopkeeper database
    registerOrUpdateCustomer(name.trim(), phone.trim());

    onSaveSession({
      ...session,
      name: name.trim(),
      phone: phone.trim(),
      isLoggedIn: true
    });

    playChimeSound('click');
    onClose();
  };

  const handleQuickDemoLogin = () => {
    const demoName = 'Priya Sharma';
    const demoPhone = '9876543210';
    setName(demoName);
    setPhone(demoPhone);

    registerOrUpdateCustomer(demoName, demoPhone);

    onSaveSession({
      ...session,
      name: demoName,
      phone: demoPhone,
      isLoggedIn: true
    });

    playChimeSound('click');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-emerald-100">
        {/* Header */}
        <div className="bg-emerald-900 text-white p-5 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-800 rounded-xl text-emerald-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">Customer Express Checkout</h3>
              <p className="text-xs text-emerald-200">Enter Name & Mobile Number to Start Shopping</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-emerald-800 text-emerald-200 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <span className="font-bold">!</span> {error}
            </div>
          )}

          <form onSubmit={handleDirectLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mobile Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-mono font-bold"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 active:scale-98"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Login & Start Produce Checkout</span>
            </button>

            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-wider font-extrabold">
                <span className="bg-white px-2 text-slate-400">Quick Demo</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleQuickDemoLogin}
              className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 transition-colors flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Instant Demo Fill (Priya Sharma • 9876543210)
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

