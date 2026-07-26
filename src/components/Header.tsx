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
    <header className="sticky top-0 z-40 bg-emerald-900 text-white shadow-lg border-b border-emerald-800">
      {/* Top Notice Bar */}
      <div className="bg-emerald-950/80 px-4 py-1.5 text-xs flex justify-between items-center text-emerald-200 border-b border-emerald-800/50">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-semibold text-white">
            Farmer's Gate Fresh Produce
          </span>
          <span className="hidden sm:inline text-emerald-400">• Self-Checkout Terminal #402</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSound}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 hover:text-white transition-colors"
            title={soundEnabled ? "Disable audio chimes" : "Enable audio chimes"}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-300" /> : <VolumeX className="w-3.5 h-3.5 text-emerald-400" />}
            <span className="hidden sm:inline text-[11px] font-medium">{soundEnabled ? "Sound On" : "Muted"}</span>
          </button>
          <span className="text-emerald-700 hidden sm:inline">|</span>
          <span className="text-emerald-300 text-[11px] hidden md:inline">Instant Weigh & Self-Pay</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-2">
        {/* Single Store Brand Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 p-0.5 shadow-md flex items-center justify-center text-emerald-950 font-bold shrink-0">
            <Store className="w-6 h-6 text-emerald-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold tracking-tight text-white flex items-center gap-1.5">
                Farmer's Gate <span className="text-emerald-300 text-xs px-2 py-0.5 rounded-full bg-emerald-800/90 font-bold border border-emerald-600/50">Produce Store</span>
              </h1>
            </div>
            <p className="text-xs text-emerald-200 flex items-center gap-1 font-medium">
              <span>Main Market Branch #402</span>
            </p>
          </div>
        </div>

        {/* Center/Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Item QR Scanner Button (Customer Mode) */}
          {role === 'customer' && (
            <button
              onClick={onOpenQRScanner}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-emerald-100 text-xs font-semibold transition-all border border-emerald-600/60 shadow-xs"
              title="Scan Item Weight Sticker or Barcode"
            >
              <QrCode className="w-4 h-4 text-emerald-300" />
              <span className="hidden sm:inline">Scan Item Barcode</span>
            </button>
          )}

          {/* User Account / Login Button */}
          {role === 'customer' && (
            <button
              onClick={onOpenLogin}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 text-xs font-medium text-emerald-200 border border-emerald-700/60 transition-all"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="max-w-[80px] sm:max-w-[120px] truncate font-semibold">
                {customerSession.isLoggedIn ? customerSession.name : "Guest"}
              </span>
            </button>
          )}

          {/* Role Toggle Switcher */}
          <div className="bg-emerald-950/90 p-1 rounded-xl border border-emerald-700/80 flex items-center shadow-inner">
            <button
              onClick={() => onRoleChange('customer')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                role === 'customer'
                  ? 'bg-emerald-500 text-emerald-950 shadow-md'
                  : 'text-emerald-300 hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Customer</span>
            </button>

            <button
              onClick={() => onRoleChange('shopkeeper')}
              className={`relative px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                role === 'shopkeeper'
                  ? 'bg-amber-500 text-amber-950 shadow-md'
                  : 'text-emerald-300 hover:text-white'
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
              className="relative p-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-emerald-950 font-extrabold hover:scale-105 active:scale-95 transition-all shadow-md flex items-center justify-center"
              title="View Self-Checkout Cart"
            >
              <ShoppingBag className="w-5 h-5 text-emerald-950" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white font-extrabold text-xs w-5 h-5 rounded-full flex items-center justify-center border-2 border-emerald-900 shadow-md">
                  {cartItemCount}
                </span>
              )}
            </button>
          )}

          {/* Logout / Switch Portal Button */}
          <button
            onClick={onLogout}
            className="p-2 rounded-xl bg-emerald-950 hover:bg-emerald-800 text-emerald-300 hover:text-white transition-colors border border-emerald-700/60"
            title="Switch Portal / Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
