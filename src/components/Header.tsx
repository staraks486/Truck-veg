import React from 'react';
import { UserRole, CustomerSession } from '../types';
import { ShoppingBag, QrCode, Store, UserCheck, Shield, Volume2, VolumeX, LogOut } from 'lucide-react';

interface HeaderProps {
  role: UserRole;
  onRoleChange: (role: UserRole) => void;
  customerSession: CustomerSession;
  onOpenLogin: () => void;
  onOpenQRScanner: () => void;
  cartItemCount: number;
  onOpenCart: () => void;
  pendingOrderCount: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  role,
  onRoleChange,
  customerSession,
  onOpenLogin,
  onOpenQRScanner,
  cartItemCount,
  onOpenCart,
  pendingOrderCount,
  soundEnabled,
  onToggleSound,
  onLogout
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-white shadow-md border-b border-slate-800 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3">
        {/* Store Brand Info */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-bold shrink-0 shadow-sm">
            <Store className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-extrabold tracking-tight text-white">
                Farmer's Gate
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Fresh Produce
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
              Main Market Branch
            </p>
          </div>
        </div>

        {/* Center/Right Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Audio Chime Toggle */}
          <button
            onClick={onToggleSound}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/60"
            title={soundEnabled ? "Mute sound" : "Enable sound"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Item QR Scanner Button (Customer Mode) */}
          {role === 'customer' && (
            <button
              onClick={onOpenQRScanner}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700/60 shadow-xs"
              title="Scan Item Barcode"
            >
              <QrCode className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Scan QR</span>
            </button>
          )}

          {/* User Account / Login Button */}
          {role === 'customer' && (
            <button
              onClick={onOpenLogin}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700/60 transition-all"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="max-w-[80px] sm:max-w-[120px] truncate font-semibold">
                {customerSession.isLoggedIn ? customerSession.name : "Guest"}
              </span>
            </button>
          )}

          {/* Role Toggle Switcher */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center shadow-inner">
            <button
              onClick={() => onRoleChange('customer')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                role === 'customer'
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Customer</span>
            </button>

            <button
              onClick={() => onRoleChange('shopkeeper')}
              className={`relative px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                role === 'shopkeeper'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Shopkeeper</span>
              {pendingOrderCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center animate-bounce shadow-md">
                  {pendingOrderCount}
                </span>
              )}
            </button>
          </div>

          {/* Cart Icon (Customer Mode) */}
          {role === 'customer' && (
            <button
              onClick={onOpenCart}
              className="relative p-2 rounded-xl bg-emerald-500 text-slate-950 font-extrabold hover:bg-emerald-400 transition-all shadow-md flex items-center justify-center"
              title="View Self-Checkout Cart"
            >
              <ShoppingBag className="w-4 h-4 text-slate-950" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white font-extrabold text-[10px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-md">
                  {cartItemCount}
                </span>
              )}
            </button>
          )}

          {/* Logout / Switch Portal Button */}
          <button
            onClick={onLogout}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700/60"
            title="Switch Portal / Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
