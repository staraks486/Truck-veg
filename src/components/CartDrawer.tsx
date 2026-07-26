import React, { useState } from 'react';
import { CartItem, CustomerSession, Order } from '../types';
import { X, Trash2, ShoppingBag, Send, Scale, ArrowRight, User, Phone, CheckCircle2, Clock, MessageSquare } from 'lucide-react';
import { formatCurrency, formatWeightOrUnits } from '../utils/storageManager';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (itemId: string, newGramsOrCount: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
  customerSession: CustomerSession;
  onOpenLogin: () => void;
  onSubmitOrder: (customerName: string, customerPhone: string, sendViaWhatsApp?: boolean) => void;
  activeOrder: Order | null;
  onViewReceipt: (order: Order) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  customerSession,
  onOpenLogin,
  onSubmitOrder,
  activeOrder,
  onViewReceipt
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const subtotal = cart.reduce((acc, curr) => acc + curr.calculatedPrice, 0);
  const tax = 0; // Fresh produce tax-exempt
  const platformFee = 0; // Free self-checkout
  const grandTotal = subtotal + tax + platformFee;

  const handleSendOrder = (sendViaWhatsApp: boolean = false) => {
    if (cart.length === 0) return;
    if (!customerSession.isLoggedIn) {
      onOpenLogin();
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      onSubmitOrder(customerSession.name, customerSession.phone, sendViaWhatsApp);
      setIsSubmitting(false);
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="p-4 sm:p-5 bg-emerald-900 text-white flex items-center justify-between border-b border-emerald-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-800 rounded-xl text-emerald-300">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">Self-Checkout Cart</h3>
                <p className="text-xs text-emerald-200">
                  {cart.length} produce item{cart.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {cart.length > 0 && (
                <button
                  onClick={onClearCart}
                  className="text-xs text-rose-300 hover:text-white px-2 py-1 rounded bg-emerald-950/60 transition-colors"
                >
                  Clear All
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-emerald-800 text-emerald-200 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Active Pending Order Notification Ticker */}
          {activeOrder && (
            <div className="p-3 bg-amber-50 border-b border-amber-200 flex items-center justify-between text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 animate-spin" />
                <div>
                  <p className="font-bold">Active Order #{activeOrder.id}</p>
                  <p className="text-[11px] text-amber-700 capitalize">
                    Status: {activeOrder.status.replace(/_/g, ' ')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onViewReceipt(activeOrder)}
                className="px-2.5 py-1 bg-amber-600 text-white font-bold text-[11px] rounded-lg hover:bg-amber-700 transition-colors shrink-0"
              >
                View Status &rarr;
              </button>
            </div>
          )}

          {/* Body List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-slate-100">
            {cart.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <ShoppingBag className="w-8 h-8 text-emerald-500" />
                </div>
                <h4 className="font-bold text-slate-800 text-base">Your Cart is Empty</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Scan produce QR or select fresh vegetables and fruits from the store catalog to weigh & checkout.
                </p>
              </div>
            ) : (
              cart.map(({ item, quantityOrWeight, calculatedPrice }) => {
                const isKg = item.unitType === 'kg';
                return (
                  <div key={item.id} className="pt-3 first:pt-0 flex items-start gap-3">
                    <img
                      src={item.image}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 rounded-xl object-cover bg-slate-100 shrink-0 border border-slate-200"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="font-bold text-xs text-slate-900 truncate">
                          {item.name}
                        </h4>
                        <span className="font-extrabold text-xs text-emerald-800 shrink-0">
                          {formatCurrency(calculatedPrice)}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {formatCurrency(item.pricePerUnit)} / {item.unitType}
                      </p>

                      {/* Weight Control */}
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                          <button
                            onClick={() =>
                              onUpdateQuantity(
                                item.id,
                                Math.max(isKg ? 50 : 1, quantityOrWeight - (isKg ? 100 : 1))
                              )
                            }
                            className="w-5 h-5 bg-white text-slate-700 font-bold rounded flex items-center justify-center text-xs shadow-2xs hover:bg-slate-200"
                          >
                            -
                          </button>
                          <span className="text-xs font-bold text-slate-800 px-1.5 font-mono">
                            {formatWeightOrUnits(quantityOrWeight, item.unitType)}
                          </span>
                          <button
                            onClick={() =>
                              onUpdateQuantity(
                                item.id,
                                quantityOrWeight + (isKg ? 100 : 1)
                              )
                            }
                            className="w-5 h-5 bg-white text-slate-700 font-bold rounded flex items-center justify-center text-xs shadow-2xs hover:bg-slate-200"
                          >
                            +
                          </button>
                        </div>

                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Remove item"
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

          {/* Customer Info & Order Summary Footer */}
          {cart.length > 0 && (
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 space-y-4">
              {/* Customer Info Card */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">
                      {customerSession.isLoggedIn ? customerSession.name : "Guest Customer"}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {customerSession.isLoggedIn ? customerSession.phone : "Log in for SMS digital receipt"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={onOpenLogin}
                  className="text-[11px] font-bold text-emerald-700 hover:underline"
                >
                  {customerSession.isLoggedIn ? "Change" : "Log In"}
                </button>
              </div>

              {/* Price Breakdown */}
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Produce Subtotal ({cart.length} items)</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Fresh Produce GST</span>
                  <span className="font-semibold">Exempt (0%)</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Self-Checkout Digital Fee</span>
                  <span className="font-bold uppercase tracking-wider">Free (₹0)</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-extrabold text-slate-900">
                  <span>Grand Total</span>
                  <span className="text-base text-emerald-800">{formatCurrency(grandTotal)}</span>
                </div>
              </div>

              {/* Submit CTA Buttons */}
              <div className="space-y-2">
                {/* Primary: Send via App & WhatsApp */}
                <button
                  onClick={() => handleSendOrder(true)}
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 border border-emerald-500/30"
                >
                  {isSubmitting ? (
                    <span>Sending Order...</span>
                  ) : (
                    <>
                      <MessageSquare className="w-4 h-4 fill-emerald-100 text-emerald-800" />
                      <span>Send via App & WhatsApp ({formatCurrency(grandTotal)})</span>
                    </>
                  )}
                </button>

                {/* Secondary: Send In-App Only */}
                <button
                  onClick={() => handleSendOrder(false)}
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5 text-slate-600" />
                  <span>Send In-App Only</span>
                </button>
              </div>

              <p className="text-[10px] text-center text-slate-500">
                Shopkeeper receives instant notification on counter terminal & WhatsApp to verify produce weights on scale.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
