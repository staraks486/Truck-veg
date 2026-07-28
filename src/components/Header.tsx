import React, { useState } from 'react';
import { UserRole, CustomerSession, Order } from '../types';
import { ShoppingBag, QrCode, Store, UserCheck, Shield, Volume2, VolumeX, LogOut, Bell } from 'lucide-react';

interface HeaderProps {
  role: UserRole;
  customerSession: CustomerSession;
  onOpenLogin: () => void;
  onOpenQRScanner: () => void;
  cartItemCount: number;
  onOpenCart: () => void;
  pendingOrderCount: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onLogout: () => void;
  orders: Order[];
}

export const Header: React.FC<HeaderProps> = ({
  role,
  customerSession,
  onOpenLogin,
  onOpenQRScanner,
  cartItemCount,
  onOpenCart,
  pendingOrderCount,
  soundEnabled,
  onToggleSound,
  onLogout,
  orders
}) => {
  const [showNotifications, setShowNotifications] = useState(false);

  const getNotifications = () => {
    if (role === 'shopkeeper') {
       return orders
         .filter(o => o.status === 'sent_to_shopkeeper')
         .map(o => ({
           id: o.id,
           title: 'New Order Received',
           message: `Order #${o.id.slice(-4)} from ${o.customerName}`,
           date: o.createdAt,
           type: 'info'
         }));
    } else {
       return orders
         .filter(o => o.customerPhone === customerSession.phone && (o.status === 'approved' || o.status === 'rejected' || o.status === 'cancelled'))
         .map(o => ({
           id: o.id,
           title: `Order ${o.status.charAt(0).toUpperCase() + o.status.slice(1)}`,
           message: `Your order #${o.id.slice(-4)} was ${o.status}.`,
           date: o.updatedAt,
           type: o.status === 'approved' ? 'success' : 'error'
         }));
    }
  };

  const notifications = getNotifications();
  const unreadCount = notifications.length; // Basic implementation assuming all generated are unread for simplicity

  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-white shadow-md border-b border-slate-800 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3 relative">
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
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
              Main Market Branch
            </p>
          </div>
        </div>

        {/* Center/Right Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/60"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white font-extrabold text-[10px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-md">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 sm:right-0 w-[calc(100vw-2rem)] max-w-xs sm:w-80 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 text-slate-900">
                <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-sm">Notifications</h3>
                  <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{notifications.length}</span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-sm">
                      No new notifications
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <div key={notif.id} className="p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${notif.type === 'success' ? 'bg-emerald-500' : notif.type === 'error' ? 'bg-rose-500' : 'bg-blue-500'}`} />
                          <h4 className="font-semibold text-sm">{notif.title}</h4>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 pl-4">{notif.message}</p>
                        <p className="text-[10px] text-slate-400 mt-1 pl-4">{new Date(notif.date).toLocaleString()}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Account Button */}
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
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
