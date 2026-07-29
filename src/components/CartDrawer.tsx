import React, { useState, useEffect } from 'react';
import { CartItem, CustomerSession, Order } from '../types';
import { X, Trash2, ShoppingBag, Send, ArrowRight, User, Phone, CheckCircle2, Clock, MessageSquare, Truck, MapPin, Store, AlertTriangle, Tag, Sparkles, Gift, Check, Zap, ShieldCheck, Receipt, Flame, ChevronRight, XCircle, Percent, DollarSign } from 'lucide-react';
import { formatCurrency, formatWeightOrUnits } from '../utils/storageManager';
import { AppliedPromo, PRESET_PROMO_CODES, parsePromoCode, calculatePromoDiscount } from '../utils/promoManager';

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
  onCancelOrder?: (orderId: string, reason: string) => void;
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
  const [fulfillmentType, setFulfillmentType] = useState<'store_pickup' | 'home_delivery'>('store_pickup');
  const [deliveryAddress, setDeliveryAddress] = useState(customerSession.deliveryAddress || '');

  // Promo Code & Offers State (Supports Percentage & Flat Rate Discounts)
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);

  useEffect(() => {
    if (customerSession.deliveryAddress && !deliveryAddress) {
      setDeliveryAddress(customerSession.deliveryAddress);
    }
  }, [customerSession.deliveryAddress]);

  if (!isOpen) return null;

  const subtotal = cart.reduce((acc, curr) => acc + curr.calculatedPrice, 0);
  const tax = 0; // Fresh produce tax-exempt
  
  // Recalculate promo discount dynamically based on current cart subtotal
  const { discount: computedDiscount, isValid: promoIsValid, errorReason: activePromoError } = calculatePromoDiscount(appliedPromo, subtotal);
  const deliveryFee = fulfillmentType === 'home_delivery' ? (subtotal >= 300 ? 0 : 30) : 0;
  const grandTotal = Math.max(0, subtotal - computedDiscount + tax + deliveryFee);

  // Free delivery progress calculation
  const freeDeliveryThreshold = 300;
  const progressToFreeDelivery = Math.min(100, (subtotal / freeDeliveryThreshold) * 100);
  const amountNeededForFreeDelivery = Math.max(0, freeDeliveryThreshold - subtotal);

  const handleApplyPromoCode = (codeToApply?: string) => {
    const code = (codeToApply || promoInput).trim().toUpperCase();
    setPromoError(null);

    if (!code) {
      setPromoError('Please enter a valid promo or coupon code.');
      return;
    }

    const rule = parsePromoCode(code);
    if (rule.minSpend && subtotal < rule.minSpend) {
      setPromoError(`Cart subtotal (₹${subtotal.toFixed(0)}) must be at least ₹${rule.minSpend} to use ${code}. Add ₹${(rule.minSpend - subtotal).toFixed(0)} more items.`);
      return;
    }

    setAppliedPromo({
      code: rule.code,
      type: rule.type,
      value: rule.value,
      label: rule.label,
      minSpend: rule.minSpend
    });
    setPromoInput('');
    setPromoError(null);
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
      setAddressError('Please enter your complete delivery address for home delivery.');
      return;
    }

    setAddressError(null);
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
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/75 backdrop-blur-md animate-fadeIn">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-0 sm:pl-6">
        <div className="w-screen max-w-md bg-slate-50 shadow-2xl flex flex-col justify-between overflow-hidden">
          
          {/* Zepto Brand Header - Light Green Theme */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-950 via-teal-900 to-green-950 text-white flex items-center justify-between border-b border-emerald-800/60 shadow-lg relative overflow-hidden">
            {/* Background Accent Glow */}
            <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center gap-3 relative z-10">
              <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-2xl text-white shadow-md border border-emerald-300/40">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-black text-base tracking-tight text-white">Farmer's Gate Cart</h3>
                </div>
                <p className="text-[11px] text-emerald-200 font-medium mt-0.5">
                  {cart.length === 0 ? 'Your basket is empty' : `${cart.length} fresh item${cart.length !== 1 ? 's' : ''} in basket`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 relative z-10">
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={onClearCart}
                  className="text-[11px] text-rose-200 hover:text-white px-2.5 py-1 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/30 transition-all font-bold"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full hover:bg-emerald-800/60 text-emerald-200 hover:text-white transition-all active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Account / Delivery Bar */}
          <div className="bg-emerald-950 text-emerald-100 px-4 py-2 flex items-center justify-between text-xs border-b border-emerald-800/50 shadow-inner">
            <div className="flex items-center gap-2 overflow-hidden">
              <Phone className="w-3.5 h-3.5 text-lime-400 shrink-0" />
              <span className="font-bold text-[11px] text-emerald-200 shrink-0">Account:</span>
              {customerSession.phone ? (
                <span className="font-mono font-black text-white bg-emerald-900 px-2 py-0.5 rounded-lg border border-emerald-700/60 text-[11px] truncate flex items-center gap-1">
                  <span>+91 {customerSession.phone}</span>
                  <Check className="w-3 h-3 text-lime-400" />
                </span>
              ) : (
                <span className="text-[10px] font-extrabold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-lg border border-amber-800/60">
                  Guest Mode
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onOpenLogin}
              className="text-[11px] font-black text-lime-300 hover:text-white bg-emerald-900/80 hover:bg-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-700/50 flex items-center gap-1 shrink-0 ml-2 transition-all active:scale-95"
            >
              <User className="w-3 h-3" />
              <span>{customerSession.isLoggedIn ? 'Account' : 'Link Phone'}</span>
            </button>
          </div>

          {/* Free Delivery Progress Indicator (Light Green Zepto Style) */}
          {cart.length > 0 && fulfillmentType === 'home_delivery' && (
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-lime-50 border-b border-emerald-200 px-4 py-2.5 space-y-1.5 animate-fadeIn shadow-2xs">
              <div className="flex items-center justify-between text-[11px] font-extrabold text-emerald-950">
                <span className="flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-emerald-700" />
                  {amountNeededForFreeDelivery <= 0 ? (
                    <span className="text-emerald-800 font-black flex items-center gap-1">
                      <span>🎉 You've unlocked FREE Express Delivery!</span>
                    </span>
                  ) : (
                    <span>Add <strong className="text-emerald-900 font-black">{formatCurrency(amountNeededForFreeDelivery)}</strong> more for FREE Delivery</span>
                  )}
                </span>
                <span className="font-mono text-[10px] font-black text-emerald-800 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                  {Math.round(progressToFreeDelivery)}%
                </span>
              </div>
              <div className="w-full h-2 bg-emerald-200/80 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-lime-500 rounded-full transition-all duration-500 shadow-xs"
                  style={{ width: `${progressToFreeDelivery}%` }}
                />
              </div>
            </div>
          )}



          {/* Cart Item Cards Body */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto border border-emerald-100 shadow-inner">
                  <ShoppingBag className="w-10 h-10 text-emerald-600" />
                </div>
                <h4 className="font-black text-slate-800 text-lg">Your Cart is Empty</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  Scan produce QR codes or tap fresh vegetables & fruits from the store catalog to weigh & checkout.
                </p>
              </div>
            ) : (
              cart.map(({ item, quantityOrWeight, calculatedPrice }) => {
                const isKg = item.unitType === 'kg';
                const maxStockGramsOrUnits = isKg ? Math.round(item.stockQuantity * 1000) : item.stockQuantity;
                const isAtMaxStock = quantityOrWeight >= maxStockGramsOrUnits;

                return (
                  <div key={item.id} className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-emerald-300 transition-all flex gap-3 group relative">
                    <img
                      src={item.image}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-2xl object-cover bg-slate-100 shrink-0 border border-slate-200/80 group-hover:scale-105 transition-transform"
                    />

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="font-black text-xs text-slate-900 truncate group-hover:text-emerald-900 transition-colors">
                            {item.name}
                          </h4>
                          <span className="font-black text-xs text-emerald-900 shrink-0 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                            {formatCurrency(calculatedPrice)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-0.5">
                          <span>{formatCurrency(item.pricePerUnit)} / {item.unitType}</span>
                          <span className="font-semibold text-slate-400">
                            Stock: {item.stockQuantity} {item.unitType}
                          </span>
                        </div>
                      </div>

                      {/* Light Green Stepper Control */}
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center bg-emerald-50 p-0.5 rounded-xl border border-emerald-200">
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateQuantity(
                                  item.id,
                                  Math.max(isKg ? 50 : 1, quantityOrWeight - (isKg ? 100 : 1))
                                )
                              }
                              className="w-7 h-7 bg-white text-emerald-900 font-black rounded-lg flex items-center justify-center text-xs shadow-2xs hover:bg-emerald-100 active:scale-95 transition-all border border-emerald-100"
                            >
                              -
                            </button>
                            <span className="text-xs font-black text-emerald-950 px-2.5 font-mono">
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
                              className={`w-7 h-7 bg-white text-emerald-900 font-black rounded-lg flex items-center justify-center text-xs shadow-2xs transition-all border border-emerald-100 ${
                                isAtMaxStock
                                  ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border-none'
                                  : 'hover:bg-emerald-100 active:scale-95'
                              }`}
                              title={isAtMaxStock ? `Reached max shopkeeper stock (${item.stockQuantity} ${item.unitType})` : 'Increase quantity'}
                            >
                              +
                            </button>
                          </div>

                          {isAtMaxStock && (
                            <span className="text-[9px] font-black text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-md border border-amber-300">
                              Max Limit
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
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

          {/* Checkout Footer & Zepto Bill Summary */}
          {cart.length > 0 && (
            <div className="p-4 sm:p-5 bg-white border-t border-slate-200/90 space-y-3.5 overflow-y-auto max-h-[60vh] sm:max-h-none shadow-xl">
              
              {/* Offers & Coupons Card */}
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-lime-50 border border-emerald-200/90 p-3.5 rounded-2xl space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-emerald-950 font-black text-xs">
                    <Tag className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>Apply Promo Code & Coupons</span>
                  </div>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                </div>

                {!appliedPromo ? (
                  <div className="space-y-2">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleApplyPromoCode();
                      }}
                      className="flex items-center gap-1.5"
                    >
                      <input
                        type="text"
                        value={promoInput}
                        onChange={(e) => {
                          setPromoInput(e.target.value);
                          if (promoError) setPromoError(null);
                        }}
                        placeholder="Enter promo code (e.g. FRESH10, 20OFF, WELCOME50)"
                        className="flex-1 px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-mono uppercase text-slate-900 placeholder:text-slate-400 placeholder:font-sans outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-black text-xs rounded-xl shadow-xs transition-all active:scale-95 shrink-0"
                      >
                        Apply
                      </button>
                    </form>

                    {promoError && (
                      <p className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 p-2 rounded-xl flex items-center gap-1.5 animate-fadeIn">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                        <span>{promoError}</span>
                      </p>
                    )}

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 block">Quick Promo Presets:</span>
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                        {PRESET_PROMO_CODES.map((offer) => (
                          <button
                            key={offer.code}
                            type="button"
                            onClick={() => handleApplyPromoCode(offer.code)}
                            className="px-2.5 py-1.5 bg-white hover:bg-emerald-100 text-emerald-950 border border-emerald-300 rounded-xl text-[10px] font-extrabold shrink-0 flex items-center gap-1 transition-all active:scale-95 shadow-2xs group"
                          >
                            <span>{offer.icon || '🏷️'}</span>
                            <span className="font-mono text-emerald-900 font-bold">{offer.code}</span>
                            <span className={`px-1 py-0.2 rounded text-[9px] font-black ${
                              offer.type === 'percent'
                                ? 'bg-teal-100 text-teal-800 border border-teal-200'
                                : 'bg-amber-100 text-amber-900 border border-amber-200'
                            }`}>
                              {offer.type === 'percent' ? `${offer.value}% OFF` : `₹${offer.value} OFF`}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="bg-emerald-100/90 border border-emerald-300 p-3 rounded-xl flex items-center justify-between text-xs text-emerald-950 shadow-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-emerald-700 text-white rounded-xl shrink-0 shadow-2xs">
                          {appliedPromo.type === 'percent' ? (
                            <Percent className="w-4 h-4" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 font-black text-emerald-950">
                            <span className="font-mono uppercase bg-white px-2 py-0.5 rounded-md border border-emerald-300 text-xs text-emerald-900">
                              {appliedPromo.code}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-200/80 text-[10px] font-black uppercase text-emerald-900">
                              {appliedPromo.type === 'percent' ? `${appliedPromo.value}% Percentage Discount` : `₹${appliedPromo.value} Flat Discount`}
                            </span>
                          </div>
                          <p className="text-[11px] text-emerald-900 font-extrabold mt-1 flex items-center gap-1">
                            <span>{appliedPromo.label}</span>
                            <strong className="text-emerald-950 bg-emerald-300/80 px-1.5 py-0.2 rounded font-mono font-black">
                              Saved {formatCurrency(computedDiscount)}
                            </strong>
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleRemovePromo}
                        className="p-1.5 text-emerald-800 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-emerald-200 hover:border-rose-300"
                        title="Remove promo code"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {activePromoError && (
                      <p className="text-[11px] font-bold text-amber-900 bg-amber-100/90 border border-amber-300 p-2 rounded-xl flex items-center gap-1.5 animate-fadeIn">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-700" />
                        <span>{activePromoError}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Delivery Mode Selector */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  Select Order Fulfillment Mode:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFulfillmentType('store_pickup')}
                    className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col gap-1 ${
                      fulfillmentType === 'store_pickup'
                        ? 'bg-emerald-950 text-white border-emerald-900 shadow-md ring-2 ring-emerald-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-black text-xs">
                      <Store className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                      <span>Store Pickup</span>
                    </div>
                    <span className="text-[10px] opacity-80 leading-tight">Instant self-checkout • FREE</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFulfillmentType('home_delivery')}
                    className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col gap-1 ${
                      fulfillmentType === 'home_delivery'
                        ? 'bg-emerald-950 text-white border-emerald-900 shadow-md ring-2 ring-emerald-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-black text-xs">
                      <Truck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Home Delivery</span>
                    </div>
                    <span className="text-[10px] opacity-80 leading-tight">
                      {subtotal >= 300 ? 'FREE (Over ₹300)' : '₹30 Delivery Fee'}
                    </span>
                  </button>
                </div>

                {/* Delivery Address Input */}
                {fulfillmentType === 'home_delivery' && (
                  <div className="bg-white border border-emerald-200 p-3 rounded-2xl space-y-1.5 animate-fadeIn shadow-2xs">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black text-emerald-950 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Delivery Address <span className="text-rose-600">*</span></span>
                      </label>
                      {subtotal < 300 && (
                        <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                          Add {formatCurrency(300 - subtotal)} for FREE delivery
                        </span>
                      )}
                    </div>
                    <textarea
                      rows={2}
                      value={deliveryAddress}
                      onChange={(e) => {
                        setDeliveryAddress(e.target.value);
                        if (addressError) setAddressError(null);
                      }}
                      placeholder="Enter flat/house no., street name, landmark & area..."
                      className={`w-full text-xs font-medium bg-slate-50 border rounded-xl p-2 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 transition-all ${
                        addressError ? 'border-rose-400 focus:ring-rose-500' : 'border-emerald-300 focus:ring-emerald-600 focus:bg-white'
                      }`}
                    />
                    {addressError && (
                      <p className="text-[10px] font-bold text-rose-600 flex items-center gap-1 animate-fadeIn">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>{addressError}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Zepto Bill Details Card */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2 text-xs text-slate-600 shadow-2xs">
                <div className="flex items-center gap-1.5 text-slate-900 font-black text-xs pb-1 border-b border-slate-200/80">
                  <Receipt className="w-4 h-4 text-emerald-700" />
                  <span>Bill Details</span>
                </div>

                <div className="flex justify-between pt-0.5">
                  <span>Item Total ({cart.length} items)</span>
                  <span className="font-bold text-slate-900">{formatCurrency(subtotal)}</span>
                </div>

                {computedDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-black">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      <span>Product Discount ({appliedPromo?.code})</span>
                    </span>
                    <span>-{formatCurrency(computedDiscount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-500">
                  <span>Fresh Produce GST</span>
                  <span className="font-semibold text-emerald-700">Exempt (0%)</span>
                </div>

                {fulfillmentType === 'home_delivery' ? (
                  <div className="flex justify-between text-slate-700 font-medium">
                    <span>Delivery Partner Fee</span>
                    <span className="font-black text-emerald-700">
                      {deliveryFee === 0 ? 'FREE' : formatCurrency(deliveryFee)}
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between text-slate-500">
                    <span>Handling & Packaging Fee</span>
                    <span className="font-black text-emerald-700 uppercase">FREE</span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline font-black text-slate-900">
                  <span className="text-sm">To Pay</span>
                  <span className="text-xl text-emerald-900 font-black">{formatCurrency(grandTotal)}</span>
                </div>

                {computedDiscount > 0 && (
                  <div className="bg-emerald-100/80 text-emerald-950 px-2.5 py-1.5 rounded-xl border border-emerald-300 text-[11px] font-black flex items-center gap-1.5 mt-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>Yay! You saved total {formatCurrency(computedDiscount)} on this order</span>
                  </div>
                )}
              </div>

              {/* Zepto Bottom Sticky Action Bar */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleSendOrder(true)}
                  disabled={isSubmitting}
                  className="w-full py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-sm rounded-2xl shadow-xl transition-all flex items-center justify-between px-5 active:scale-98 disabled:opacity-50 border border-emerald-400/30 group"
                >
                  {isSubmitting ? (
                    <span className="mx-auto">Processing Order...</span>
                  ) : (
                    <>
                      <div className="flex flex-col text-left">
                        <span className="text-base font-black text-white leading-tight">
                          {formatCurrency(grandTotal)}
                        </span>
                        <span className="text-[10px] text-emerald-200 font-medium tracking-wide">
                          TOTAL AMOUNT
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase tracking-wider font-extrabold text-white">
                          {fulfillmentType === 'home_delivery' ? 'Place Delivery Order' : 'Checkout Order'}
                        </span>
                        <div className="p-1 bg-white/20 rounded-lg group-hover:translate-x-1 transition-transform">
                          <ChevronRight className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    </>
                  )}
                </button>

                {fulfillmentType !== 'home_delivery' && (
                  <button
                    type="button"
                    onClick={() => handleSendOrder(false)}
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all border border-slate-200"
                  >
                    Submit In-App Only (No WhatsApp)
                  </button>
                )}
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 pt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                <span>Verified scale counter & 100% Quality Assurance</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};



