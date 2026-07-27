import React, { useState, useEffect } from 'react';
import { CartItem, CustomerSession, Order } from '../types';
import { X, Trash2, ShoppingBag, Send, Scale, ArrowRight, User, Phone, CheckCircle2, Clock, MessageSquare, Truck, MapPin, Store, AlertTriangle, Tag, Percent, Sparkles, Gift, Check } from 'lucide-react';
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
  onSubmitOrder: (
    customerName: string,
    customerPhone: string,
    sendViaWhatsApp?: boolean,
    fulfillmentType?: 'store_pickup' | 'home_delivery',
    deliveryAddress?: string,
    deliveryFee?: number,
    promoCode?: string,
    discountAmount?: number
  ) => void;
  activeOrder: Order | null;
  onViewReceipt: (order: Order) => void;
}

const PRESET_OFFERS = [
  { code: 'FRESH10', label: '10% OFF Fresh Produce', icon: '🏷️', type: 'percent', val: 10, minSpend: 0 },
  { code: 'WELCOME50', label: '₹50 OFF (Min ₹250)', icon: '🎁', type: 'flat', val: 50, minSpend: 250 },
  { code: 'ORGANIC20', label: '₹20 OFF Organic Veggies', icon: '🥦', type: 'flat', val: 20, minSpend: 100 },
];

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
  const [fulfillmentType, setFulfillmentType] = useState<'store_pickup' | 'home_delivery'>('store_pickup');
  const [deliveryAddress, setDeliveryAddress] = useState(customerSession.deliveryAddress || '');

  // Promo Code & Offers State
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number; label: string } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  useEffect(() => {
    if (customerSession.deliveryAddress && !deliveryAddress) {
      setDeliveryAddress(customerSession.deliveryAddress);
    }
  }, [customerSession.deliveryAddress]);

  if (!isOpen) return null;

  const subtotal = cart.reduce((acc, curr) => acc + curr.calculatedPrice, 0);
  const tax = 0; // Fresh produce tax-exempt
  
  // Recalculate promo discount if cart changes
  const computedDiscount = appliedPromo ? Math.min(subtotal, appliedPromo.discount) : 0;
  const deliveryFee = fulfillmentType === 'home_delivery' ? (subtotal >= 300 ? 0 : 30) : 0;
  const grandTotal = Math.max(0, subtotal - computedDiscount + tax + deliveryFee);

  const handleApplyPromoCode = (codeToApply?: string) => {
    const code = (codeToApply || promoInput).trim().toUpperCase();
    setPromoError(null);

    if (!code) {
      setPromoError('Please enter a valid coupon code.');
      return;
    }

    if (code === 'FRESH10') {
      const discount = Math.round(subtotal * 0.10);
      setAppliedPromo({ code: 'FRESH10', discount, label: '10% OFF Fresh Produce' });
      setPromoInput('');
    } else if (code === 'WELCOME50') {
      if (subtotal < 250) {
        setPromoError('Cart subtotal must be at least ₹250 for WELCOME50.');
        return;
      }
      setAppliedPromo({ code: 'WELCOME50', discount: 50, label: '₹50 Flat Welcome Offer' });
      setPromoInput('');
    } else if (code === 'ORGANIC20') {
      if (subtotal < 100) {
        setPromoError('Cart subtotal must be at least ₹100 for ORGANIC20.');
        return;
      }
      setAppliedPromo({ code: 'ORGANIC20', discount: 20, label: '₹20 Organic Discount' });
      setPromoInput('');
    } else {
      // Custom promo code fallback (5% discount)
      const discount = Math.min(subtotal, Math.max(10, Math.round(subtotal * 0.05)));
      setAppliedPromo({ code, discount, label: `${code} Applied (Special Discount)` });
      setPromoInput('');
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoError(null);
  };

  const handleSendOrder = (sendViaWhatsApp: boolean = false) => {
    if (cart.length === 0) return;
    if (!customerSession.isLoggedIn) {
      onOpenLogin();
      return;
    }

    if (fulfillmentType === 'home_delivery' && !deliveryAddress.trim()) {
      alert('Please enter your complete delivery address for home delivery.');
      return;
    }

    // Always require WhatsApp confirmation for home delivery orders
    const actualWhatsApp = fulfillmentType === 'home_delivery' ? true : sendViaWhatsApp;

    setIsSubmitting(true);
    setTimeout(() => {
      onSubmitOrder(
        customerSession.name,
        customerSession.phone,
        actualWhatsApp,
        fulfillmentType,
        deliveryAddress.trim(),
        deliveryFee,
        appliedPromo?.code,
        computedDiscount
      );
      setIsSubmitting(false);
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="p-3.5 sm:p-5 bg-emerald-900 text-white flex items-center justify-between border-b border-emerald-800">
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
                  className="text-xs text-rose-300 hover:text-white px-2.5 py-1.5 rounded-lg bg-emerald-950/60 transition-colors font-semibold"
                >
                  Clear All
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-emerald-800 text-emerald-200 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Mobile Number Linkage Status Bar */}
          <div className="bg-emerald-950 text-emerald-100 px-3.5 py-2 flex items-center justify-between text-xs border-b border-emerald-800/80 shadow-inner">
            <div className="flex items-center gap-2 overflow-hidden">
              <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="font-semibold text-[11px] text-emerald-200 shrink-0">Linked Mobile:</span>
              {customerSession.phone ? (
                <span className="font-mono font-black text-white bg-emerald-900 px-2 py-0.5 rounded-md border border-emerald-700/60 text-[11px] truncate">
                  +91 {customerSession.phone}
                </span>
              ) : (
                <span className="text-[11px] font-bold text-amber-300 italic bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/50">
                  Not Linked (Tap to Link)
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onOpenLogin}
              className="text-[11px] font-bold text-emerald-300 hover:text-white underline underline-offset-2 flex items-center gap-1 shrink-0 ml-2"
            >
              <User className="w-3 h-3" />
              <span>{customerSession.isLoggedIn ? 'Change' : 'Link Mobile'}</span>
            </button>
          </div>

          {/* Active Self-Checkout Cart Order Status Card */}
          {activeOrder && (
            <div className={`p-4 border-b flex flex-col gap-2.5 text-xs transition-all ${
              activeOrder.status === 'approved'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : activeOrder.status === 'sent_to_shopkeeper'
                ? 'bg-amber-50 border-amber-200 text-amber-950'
                : activeOrder.status === 'paid'
                ? 'bg-teal-50 border-teal-200 text-teal-950'
                : 'bg-rose-50 border-rose-200 text-rose-950'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${
                    activeOrder.status === 'approved'
                      ? 'bg-emerald-600 text-white'
                      : activeOrder.status === 'sent_to_shopkeeper'
                      ? 'bg-amber-500 text-white animate-pulse'
                      : activeOrder.status === 'paid'
                      ? 'bg-teal-600 text-white'
                      : 'bg-rose-600 text-white'
                  }`}>
                    {activeOrder.status === 'approved' && <CheckCircle2 className="w-4 h-4" />}
                    {activeOrder.status === 'sent_to_shopkeeper' && <Clock className="w-4 h-4 animate-spin" />}
                    {activeOrder.status === 'paid' && <CheckCircle2 className="w-4 h-4" />}
                    {activeOrder.status === 'rejected' && <AlertTriangle className="w-4 h-4" />}
                  </div>

                  <div>
                    <span className="font-extrabold text-slate-900 block text-xs">
                      Self-Checkout Order #{activeOrder.id}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {activeOrder.items.length} items • Total: {formatCurrency(activeOrder.grandTotal)}
                    </span>
                  </div>
                </div>

                {/* Explicit Status Badge: ACCEPTED vs WAITING */}
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  activeOrder.status === 'approved'
                    ? 'bg-emerald-200 text-emerald-900 border border-emerald-300'
                    : activeOrder.status === 'sent_to_shopkeeper'
                    ? 'bg-amber-200 text-amber-950 border border-amber-300'
                    : activeOrder.status === 'paid'
                    ? 'bg-teal-200 text-teal-950 border border-teal-300'
                    : 'bg-rose-200 text-rose-950 border border-rose-300'
                }`}>
                  {activeOrder.status === 'approved'
                    ? 'ACCEPTED'
                    : activeOrder.status === 'sent_to_shopkeeper'
                    ? 'WAITING'
                    : activeOrder.status === 'paid'
                    ? 'COMPLETED'
                    : 'DECLINED'}
                </span>
              </div>

              {/* Status Update & Cancel Reason Message Box */}
              <div className="bg-white/90 p-2.5 rounded-xl border border-slate-200/80 text-[11px] space-y-1">
                <span className="font-bold text-slate-900 block flex items-center justify-between">
                  <span>Status Update Message:</span>
                  {activeOrder.status === 'rejected' && (
                    <span className="text-rose-600 font-black text-[10px] uppercase">Order Cancelled</span>
                  )}
                </span>

                {activeOrder.status === 'approved' && (
                  <p className="text-emerald-900 leading-snug font-medium">
                    ✅ Order Accepted by Shopkeeper! Scale weights & bill verified. Please proceed to payment.
                  </p>
                )}
                {activeOrder.status === 'sent_to_shopkeeper' && (
                  <p className="text-amber-900 leading-snug font-medium">
                    ⏳ Order submitted and waiting for shopkeeper verification on counter scale.
                  </p>
                )}
                {activeOrder.status === 'paid' && (
                  <p className="text-teal-900 leading-snug font-medium">
                    🎉 Payment verified & completed successfully!
                  </p>
                )}

                {/* Cancel Reason Display Position */}
                {activeOrder.status === 'rejected' && (
                  <div className="bg-rose-100/80 p-2 rounded-lg border border-rose-300 text-rose-950 space-y-0.5">
                    <span className="font-extrabold block text-rose-900 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>Reason for Cancellation / Decline:</span>
                    </span>
                    <p className="text-slate-900 font-semibold leading-relaxed text-[11px]">
                      {activeOrder.rejectionReason || 'Order was declined by shopkeeper on scale counter.'}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  onClick={() => onViewReceipt(activeOrder)}
                  className={`px-3 py-1.5 rounded-xl font-extrabold text-[11px] transition-all flex items-center gap-1 shadow-2xs active:scale-95 ${
                    activeOrder.status === 'approved'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-slate-800 hover:bg-slate-900 text-white'
                  }`}
                >
                  <span>{activeOrder.status === 'approved' ? 'Pay Now & View Receipt' : 'View Full Receipt'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Body List */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3 divide-y divide-slate-100">
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
                const maxStockGramsOrUnits = isKg ? Math.round(item.stockQuantity * 1000) : item.stockQuantity;
                const isAtMaxStock = quantityOrWeight >= maxStockGramsOrUnits;

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

                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-0.5">
                        <span>{formatCurrency(item.pricePerUnit)} / {item.unitType}</span>
                        <span className="text-[10px] font-semibold text-slate-400">
                          Available: {item.stockQuantity} {item.unitType}
                        </span>
                      </div>

                      {/* Weight Control */}
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateQuantity(
                                  item.id,
                                  Math.max(isKg ? 50 : 1, quantityOrWeight - (isKg ? 100 : 1))
                                )
                              }
                              className="w-6 h-6 bg-white text-slate-700 font-bold rounded flex items-center justify-center text-xs shadow-2xs hover:bg-slate-200 active:scale-95"
                            >
                              -
                            </button>
                            <span className="text-xs font-bold text-slate-800 px-1.5 font-mono">
                              {formatWeightOrUnits(quantityOrWeight, item.unitType)}
                            </span>
                            <button
                              type="button"
                              disabled={isAtMaxStock}
                              onClick={() =>
                                onUpdateQuantity(
                                  item.id,
                                  Math.min(maxStockGramsOrUnits, quantityOrWeight + (isKg ? 100 : 1))
                                )
                              }
                              className={`w-6 h-6 bg-white text-slate-700 font-bold rounded flex items-center justify-center text-xs shadow-2xs transition-all ${
                                isAtMaxStock
                                  ? 'opacity-40 cursor-not-allowed bg-slate-200'
                                  : 'hover:bg-slate-200 active:scale-95'
                              }`}
                              title={isAtMaxStock ? `Reached max shopkeeper stock (${item.stockQuantity} ${item.unitType})` : 'Increase quantity'}
                            >
                              +
                            </button>
                          </div>

                          {isAtMaxStock && (
                            <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                              Max Stock
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
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

          {/* Customer Info, Offers & Order Summary Footer */}
          {cart.length > 0 && (
            <div className="p-3.5 sm:p-5 bg-slate-50 border-t border-slate-200 space-y-3.5 overflow-y-auto max-h-[60vh] sm:max-h-none">
              
              {/* Offers, Promotions & Discounts Section */}
              <div className="bg-amber-50/80 border border-amber-200/90 p-3 rounded-2xl space-y-2.5 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-amber-950 font-extrabold text-xs">
                    <Tag className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Offers, Promotions & Discounts</span>
                  </div>
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                </div>

                {/* Promo Input & Apply Button */}
                {!appliedPromo ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={promoInput}
                        onChange={(e) => {
                          setPromoInput(e.target.value);
                          if (promoError) setPromoError(null);
                        }}
                        placeholder="Enter Promo Code (e.g. FRESH10)"
                        className="flex-1 px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-mono uppercase text-slate-900 placeholder:text-slate-400 placeholder:normal-case outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyPromoCode()}
                        className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all active:scale-95 shrink-0"
                      >
                        Apply
                      </button>
                    </div>

                    {promoError && (
                      <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>{promoError}</span>
                      </p>
                    )}

                    {/* Single-Tap Available Promo Chips */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">
                        Tap offer code to apply instantly:
                      </span>
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                        {PRESET_OFFERS.map((offer) => (
                          <button
                            key={offer.code}
                            type="button"
                            onClick={() => handleApplyPromoCode(offer.code)}
                            className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-950 border border-amber-300 rounded-lg text-[11px] font-extrabold shrink-0 flex items-center gap-1 shadow-2xs transition-all active:scale-95"
                          >
                            <span>{offer.icon}</span>
                            <span className="font-mono text-amber-900">{offer.code}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Applied Coupon Banner */
                  <div className="bg-emerald-100/90 border border-emerald-300 p-2.5 rounded-xl flex items-center justify-between text-xs text-emerald-950">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-emerald-600 text-white rounded-lg shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 font-black text-emerald-900">
                          <span className="font-mono uppercase bg-white px-1.5 py-0.5 rounded border border-emerald-300 text-[10px]">
                            {appliedPromo.code}
                          </span>
                          <span>- {formatCurrency(computedDiscount)} Saved</span>
                        </div>
                        <p className="text-[10px] text-emerald-800 font-medium">{appliedPromo.label}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleRemovePromo}
                      className="p-1 text-emerald-700 hover:text-rose-600 hover:bg-emerald-200/50 rounded-lg transition-colors"
                      title="Remove coupon discount"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Fulfillment Option Switcher */}
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                  Select Order Delivery Mode:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFulfillmentType('store_pickup')}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                      fulfillmentType === 'store_pickup'
                        ? 'bg-emerald-900 text-white border-emerald-900 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-extrabold text-xs">
                      <Store className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                      <span>Store Pickup</span>
                    </div>
                    <span className="text-[10px] opacity-80 leading-tight">Self-checkout in store • ₹0</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFulfillmentType('home_delivery')}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                      fulfillmentType === 'home_delivery'
                        ? 'bg-emerald-900 text-white border-emerald-900 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-extrabold text-xs">
                      <Truck className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                      <span>Home Delivery</span>
                    </div>
                    <span className="text-[10px] opacity-80 leading-tight">
                      {subtotal >= 300 ? 'FREE (Over ₹300)' : '₹30 Express Delivery'}
                    </span>
                  </button>
                </div>

                {/* Home Delivery Address Input */}
                {fulfillmentType === 'home_delivery' && (
                  <div className="bg-emerald-50/90 border border-emerald-200 p-3 rounded-2xl space-y-1.5 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-extrabold text-emerald-950 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Delivery Address <span className="text-rose-600">*</span></span>
                      </label>
                      {subtotal < 300 && (
                        <span className="text-[10px] font-bold text-emerald-800">
                          Add {formatCurrency(300 - subtotal)} more for FREE delivery
                        </span>
                      )}
                    </div>
                    <textarea
                      rows={2}
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Enter flat/house no., street name, landmark & area..."
                      className="w-full text-xs font-medium bg-white border border-emerald-300 rounded-xl p-2 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
                    />
                  </div>
                )}
              </div>

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
                  type="button"
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

                {computedDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      <span>Offer Discount ({appliedPromo?.code})</span>
                    </span>
                    <span>-{formatCurrency(computedDiscount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-emerald-700">
                  <span>Fresh Produce GST</span>
                  <span className="font-semibold">Exempt (0%)</span>
                </div>

                {fulfillmentType === 'home_delivery' ? (
                  <div className="flex justify-between text-emerald-800 font-medium">
                    <span>Express Home Delivery Fee</span>
                    <span className="font-bold">
                      {deliveryFee === 0 ? <span className="text-emerald-700 uppercase">FREE</span> : formatCurrency(deliveryFee)}
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between text-emerald-700">
                    <span>Self-Checkout Digital Fee</span>
                    <span className="font-bold uppercase tracking-wider">Free (₹0)</span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-extrabold text-slate-900">
                  <span>Grand Total</span>
                  <span className="text-base text-emerald-800">{formatCurrency(grandTotal)}</span>
                </div>
              </div>

              {/* Submit CTA Buttons */}
              <div className="space-y-2 pt-1">
                {/* Primary: Send via App & WhatsApp */}
                <button
                  type="button"
                  onClick={() => handleSendOrder(true)}
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 border border-emerald-500/30"
                >
                  {isSubmitting ? (
                    <span>Sending Order...</span>
                  ) : (
                    <>
                      <MessageSquare className="w-4 h-4 fill-emerald-100 text-emerald-800" />
                      <span>
                        {fulfillmentType === 'home_delivery'
                          ? `Place Home Delivery Order via WhatsApp (${formatCurrency(grandTotal)})`
                          : `Send via App & WhatsApp (${formatCurrency(grandTotal)})`}
                      </span>
                    </>
                  )}
                </button>

                {/* Secondary: Send In-App Only - Hidden for Home Delivery */}
                {fulfillmentType !== 'home_delivery' && (
                  <button
                    type="button"
                    onClick={() => handleSendOrder(false)}
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5 text-slate-600" />
                    <span>Send In-App Only</span>
                  </button>
                )}
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

