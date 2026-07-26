import React, { useState } from 'react';
import { Order, InventoryItem, OrderItem, ProductOffer, CustomerRecord } from '../types';
import { InventoryManager } from './InventoryManager';
import { StoreQRGeneratorModal } from './StoreQRGeneratorModal';
import { SimulateCustomerModal } from './SimulateCustomerModal';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

import {
  Shield,
  ShoppingBag,
  TrendingUp,
  Package,
  QrCode,
  Clock,
  CheckCircle2,
  XCircle,
  Edit3,
  Send,
  AlertCircle,
  Scale,
  Sparkles,
  Phone,
  User,
  DollarSign,
  MessageSquare,
  Download,
  FileText,
  Search,
  UserPlus,
  Users,
  Check,
  Smartphone,
  Filter,
  Zap,
  Plus,
  Trash2,
  Settings,
  Store,
  MapPin,
  Tag,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { 
  formatCurrency, 
  formatWeightOrUnits, 
  getStoredStoreConfig, 
  saveStoredStoreConfig, 
  StoreConfig, 
  registerOrUpdateCustomer, 
  playChimeSound,
  getStoredOffers,
  saveStoredOffers,
  getStoredCustomers
} from '../utils/storageManager';
import { formatOrderWhatsAppMessage, openWhatsAppShare } from '../utils/whatsappHelper';
import { generateOrderPDF } from '../utils/pdfGenerator';

interface ShopkeeperDashboardProps {
  orders: Order[];
  inventory: InventoryItem[];
  onUpdateOrderStatus: (orderId: string, status: Order['status'], rejectionReason?: string) => void;
  onUpdateOrderWeights: (orderId: string, updatedItems: OrderItem[], shopkeeperNote?: string) => void;
  onSaveInventoryItem: (item: InventoryItem) => void;
  onDeleteInventoryItem: (itemId: string) => void;
  onToggleStock: (itemId: string) => void;
  onViewOrderReceipt: (order: Order) => void;
  onAddOrder?: (newOrder: Order) => void;
}

export const ShopkeeperDashboard: React.FC<ShopkeeperDashboardProps> = ({
  orders,
  inventory,
  onUpdateOrderStatus,
  onUpdateOrderWeights,
  onSaveInventoryItem,
  onDeleteInventoryItem,
  onToggleStock,
  onViewOrderReceipt,
  onAddOrder
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'manual_sale' | 'store_settings'>('manual_sale');

  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editedItems, setEditedItems] = useState<OrderItem[]>([]);
  const [shopkeeperNote, setShopkeeperNote] = useState('');
  const [rejectingOrderId, setRejectingOrderId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isSimulateCustomerModalOpen, setIsSimulateCustomerModalOpen] = useState(false);

  // Manual POS Sale State
  const [posCart, setPosCart] = useState<{ item: InventoryItem; qtyOrWeight: number }[]>([]);
  const [posCustomerName, setPosCustomerName] = useState('Walk-in Customer');
  const [posCustomerPhone, setPosCustomerPhone] = useState('9999999999');
  const [posPaymentMethod, setPosPaymentMethod] = useState<'UPI' | 'Cash' | 'Card'>('Cash');
  const [posCategory, setPosCategory] = useState<string>('All');
  const [posSearch, setPosSearch] = useState<string>('');
  const [posView, setPosView] = useState<'catalog' | 'checkout'>('catalog');

  // Store Settings State
  const [storeConfig, setStoreConfig] = useState<StoreConfig>(getStoredStoreConfig());

  // Offers State
  const [offers, setOffers] = useState<ProductOffer[]>(getStoredOffers());
  const [newOfferTitle, setNewOfferTitle] = useState('');
  const [newOfferDiscountPct, setNewOfferDiscountPct] = useState('');
  const [newOfferDiscountAmt, setNewOfferDiscountAmt] = useState('');
  const [newOfferCode, setNewOfferCode] = useState('');
  const [newOfferItemId, setNewOfferItemId] = useState('ALL');

  // Customers State
  const [customersList, setCustomersList] = useState<CustomerRecord[]>(getStoredCustomers());

  // Multi-customer filter state
  const [selectedCustomerFilter, setSelectedCustomerFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleCompletePosSale = () => {
    if (posCart.length === 0) {
      showToast('POS cart is empty. Add items to complete sale.');
      return;
    }

    const orderItems: OrderItem[] = posCart.map((c) => {
      const calcPrice = c.item.unitType === 'kg'
        ? (c.item.pricePerUnit * c.qtyOrWeight) / 1000
        : c.item.pricePerUnit * c.qtyOrWeight;
      return {
        itemId: c.item.id,
        name: c.item.name,
        unitType: c.item.unitType,
        quantityOrWeight: c.qtyOrWeight,
        pricePerUnit: c.item.pricePerUnit,
        totalPrice: calcPrice
      };
    });

    const subtotal = orderItems.reduce((acc, curr) => acc + curr.totalPrice, 0);
    const newOrder: Order = {
      id: `POS-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: posCustomerName.trim() || 'Walk-in Customer',
      customerPhone: posCustomerPhone.trim() || '9999999999',
      storeName: storeConfig.name,
      items: orderItems,
      subtotal,
      tax: 0,
      platformFee: 0,
      grandTotal: subtotal,
      status: 'paid',
      paymentMethod: posPaymentMethod,
      shopkeeperNote: `Direct counter sale processed by shopkeeper via ${posPaymentMethod}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (onAddOrder) {
      onAddOrder(newOrder);
    }
    registerOrUpdateCustomer(newOrder.customerName, newOrder.customerPhone, subtotal);
    setCustomersList(getStoredCustomers());
    playChimeSound('order_approved');
    showToast(`✅ Successfully recorded POS Sale #${newOrder.id} for ${formatCurrency(subtotal)}!`);
    
    // Automatically open receipt view for the generated bill
    onViewOrderReceipt(newOrder);

    setPosCart([]);
    setPosCustomerName('Walk-in Customer');
    setPosCustomerPhone('9999999999');
  };

  const handleSaveStoreSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoredStoreConfig(storeConfig);
    showToast('🏪 Store & Branch settings updated successfully!');
  };

  const handleAddOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOfferTitle.trim()) {
      showToast('Please enter an offer title.');
      return;
    }
    const newOffer: ProductOffer = {
      id: `offer-${Date.now()}`,
      itemId: newOfferItemId,
      title: newOfferTitle.trim(),
      discountPercentage: newOfferDiscountPct ? parseFloat(newOfferDiscountPct) : undefined,
      discountAmount: newOfferDiscountAmt ? parseFloat(newOfferDiscountAmt) : undefined,
      promoCode: newOfferCode.trim().toUpperCase() || undefined,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '2026-12-31',
      isActive: true
    };
    const updated = [newOffer, ...offers];
    setOffers(updated);
    saveStoredOffers(updated);
    setNewOfferTitle('');
    setNewOfferDiscountPct('');
    setNewOfferDiscountAmt('');
    setNewOfferCode('');
    setNewOfferItemId('ALL');
    showToast('🎉 Successfully published store offer on product store!');
  };

  const handleDeleteOffer = (offerId: string) => {
    const updated = offers.filter(o => o.id !== offerId);
    setOffers(updated);
    saveStoredOffers(updated);
    showToast('Offer removed successfully.');
  };

  // Compute analytics metrics
  const pendingOrders = orders.filter((o) => o.status === 'sent_to_shopkeeper');
  const approvedOrders = orders.filter((o) => o.status === 'approved' || o.status === 'paid');
  const todayTotalSales = approvedOrders.reduce((sum, o) => sum + o.grandTotal, 0);
  const totalStockItems = inventory.length;
  const outOfStockItems = inventory.filter((i) => !i.inStock || i.stockQuantity <= 0).length;

  // Compute weekly daily sales data for Recharts
  const getWeeklySalesData = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const now = new Date();
    const currentDayOfWeek = now.getDay();
    const distanceToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + distanceToMonday);
    monday.setHours(0, 0, 0, 0);

    return days.map((dayName, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      const dayString = d.toDateString();

      const dayOrders = orders.filter((o) => {
        if (o.status === 'rejected') return false;
        const orderDate = new Date(o.createdAt);
        return orderDate.toDateString() === dayString;
      });

      const totalSales = dayOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
      const orderCount = dayOrders.length;

      return {
        day: dayName,
        date: `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`,
        sales: totalSales,
        orders: orderCount
      };
    });
  };

  // Filtered orders list
  const filteredOrders = orders.filter((order) => {
    const matchesCustomer =
      selectedCustomerFilter === 'ALL' || order.customerPhone === selectedCustomerFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      order.id.toLowerCase().includes(q) ||
      order.customerName.toLowerCase().includes(q) ||
      order.customerPhone.includes(q) ||
      order.items.some((i) => i.name.toLowerCase().includes(q));

    return matchesCustomer && matchesSearch;
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const startEditOrder = (order: Order) => {
    setEditingOrderId(order.id);
    setEditedItems(JSON.parse(JSON.stringify(order.items)));
    setShopkeeperNote(order.shopkeeperNote || '');
  };

  const handleWeightChange = (itemIdx: number, newGramsOrQty: number) => {
    const updated = [...editedItems];
    const item = updated[itemIdx];
    item.quantityOrWeight = newGramsOrQty;
    item.totalPrice = item.unitType === 'kg'
      ? (item.pricePerUnit * newGramsOrQty) / 1000
      : item.pricePerUnit * newGramsOrQty;
    setEditedItems(updated);
  };

  const saveEditedOrder = (orderId: string) => {
    onUpdateOrderWeights(orderId, editedItems, shopkeeperNote);
    setEditingOrderId(null);
    showToast(`Saved updated produce scale weights for Order #${orderId}`);
  };

  const handleSendWhatsAppToCustomer = (order: Order) => {
    const msg = formatOrderWhatsAppMessage(order);
    openWhatsAppShare(msg, order.customerPhone);
    showToast(`Opened WhatsApp with pre-filled bill for ${order.customerName}!`);
  };

  const handleSendInApp = (order: Order) => {
    if (editingOrderId === order.id) {
      onUpdateOrderWeights(order.id, editedItems, shopkeeperNote);
    }
    onUpdateOrderStatus(order.id, 'approved');
    setEditingOrderId(null);
    showToast(`📱 Bill & Payment QR sent via App to ${order.customerName}! (Order #${order.id})`);
  };

  const handleFinalizeAndSendWhatsApp = (order: Order) => {
    if (editingOrderId === order.id) {
      onUpdateOrderWeights(order.id, editedItems, shopkeeperNote);
    }
    onUpdateOrderStatus(order.id, 'approved');
    setEditingOrderId(null);

    const updatedOrder = { ...order, status: 'approved' as const };
    const msg = formatOrderWhatsAppMessage(updatedOrder);
    openWhatsAppShare(msg, order.customerPhone);
    showToast(`Approved & opened WhatsApp bill for ${order.customerName}!`);
  };

  const handleBulkApproveInApp = () => {
    pendingOrders.forEach((o) => {
      onUpdateOrderStatus(o.id, 'approved');
    });
    showToast(`⚡ Bulk approved and sent all ${pendingOrders.length} pending counter bills in-app!`);
  };

  const handleRejectOrder = (orderId: string) => {
    onUpdateOrderStatus(orderId, 'rejected', rejectionReason || 'Scale weight discrepancy or item out of stock.');
    setRejectingOrderId(null);
    setRejectionReason('');
    showToast(`Declined order #${orderId}. Updated customer screen.`);
  };

  const handleFastReject = (order: Order) => {
    onUpdateOrderStatus(order.id, 'rejected', 'Fast rejected by shopkeeper');
    showToast(`⚡ Fast Rejected order #${order.id.slice(-6)} instantly.`);
  };

  const handleMarkAsPaid = (order: Order) => {
    onUpdateOrderStatus(order.id, 'approved');
    showToast(`💳 Marked order #${order.id.slice(-6)} as Paid & Completed!`);
  };

  return (
    <div className="space-y-6 pb-32 relative">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-5 z-50 max-w-md bg-emerald-950 text-emerald-100 border border-emerald-500/50 p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-fadeIn">
          <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Zepto-Style Modern Quick-Commerce Top Header */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white p-4 sm:p-6 rounded-3xl shadow-xl border border-purple-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full font-black text-xs flex items-center gap-1 shadow-sm">
                <Zap className="w-3.5 h-3.5 fill-current" /> 6 minutes
              </span>
              <span className="text-xs text-purple-200 font-medium">Ultra-Fast Dispatch Hub</span>
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black tracking-tight">{storeConfig.name}</h2>
              <MapPin className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xs text-purple-300 mt-0.5">{storeConfig.address}</p>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            {['zepto', 'MONSOON STORE', 'Fresh Store'].map((storeBadge, i) => (
              <span
                key={storeBadge}
                className={`px-3 py-1.5 rounded-2xl text-xs font-black tracking-wide whitespace-nowrap shadow-sm border ${
                  i === 0
                    ? 'bg-purple-500 text-white border-purple-400 shadow-purple-500/40 shadow-md'
                    : 'bg-white/10 text-purple-100 border-white/20 hover:bg-white/20'
                }`}
              >
                {storeBadge}
              </span>
            ))}
          </div>
        </div>

        {/* Promotional Fee Banners */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5 pt-4 border-t border-white/10">
          <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/15 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-600/50 flex items-center justify-center font-black text-amber-300 text-sm">
                ₹0
              </div>
              <div>
                <p className="font-extrabold text-xs text-white">ZERO FEES</p>
                <p className="text-[10px] text-purple-200">No handling, delivery, or surge fees</p>
              </div>
            </div>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>

          <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/15 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center font-black text-amber-300 text-sm">
                ⚡
              </div>
              <div>
                <p className="font-extrabold text-xs text-white">EVERYDAY LOW PRICES</p>
                <p className="text-[10px] text-purple-200">Wholesale direct farm pricing</p>
              </div>
            </div>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Tab Content: Manual Counter Sale (POS) */}
      {activeTab === 'manual_sale' && (
        <div className="space-y-6 animate-fadeIn pb-24">
          {/* Top POS Sub-header with Catalog / Checkout Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
            <div>
              <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                <Store className="w-5 h-5 text-emerald-600" />
                <span>Counter POS & Billing</span>
              </h3>
              <p className="text-xs text-slate-500">Quickly pick items, build bills, and complete walk-in sales</p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPosView('catalog')}
                className={`px-4 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 ${
                  posView === 'catalog'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>Product Catalog</span>
              </button>
              
              <button
                type="button"
                onClick={() => setPosView('checkout')}
                className={`px-4 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 relative ${
                  posView === 'checkout'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Bill & Checkout</span>
                {posCart.length > 0 && (
                  <span className="bg-rose-500 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                    {posCart.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {posView === 'catalog' ? (
            /* Catalog View (Full Width) */
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-black text-sm text-slate-900">Select Produce for Counter Sale</h4>
                  <p className="text-xs text-slate-500">Filter by category or search items to add to bill</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPosView('checkout')}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>View Bill ({posCart.length})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Search and Category Filter */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={posSearch}
                    onChange={(e) => setPosSearch(e.target.value)}
                    placeholder="Search produce by name..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {['All', 'Daily Essentials', 'Root Vegetables', 'Leafy Greens', 'Exotic Fruits', 'Organic Herbs'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setPosCategory(cat)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all border ${
                        posCategory === cat
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[520px] overflow-y-auto pr-1">
                {inventory
                  .filter((i) => i.inStock)
                  .filter((i) => posCategory === 'All' || i.category === posCategory)
                  .filter((i) => !posSearch.trim() || i.name.toLowerCase().includes(posSearch.toLowerCase().trim()))
                  .map((item) => {
                    const isKg = item.unitType === 'kg';
                    return (
                      <div
                        key={item.id}
                        className="p-3.5 bg-slate-50 hover:bg-emerald-50/40 rounded-2xl border border-slate-200 hover:border-emerald-300 transition-all flex flex-col justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0 flex-1">
                            <h4 className="font-extrabold text-xs text-slate-900 truncate">{item.name}</h4>
                            <p className="text-[11px] text-emerald-700 font-bold mt-0.5">
                              {formatCurrency(item.pricePerUnit)} / {isKg ? 'kg' : item.unitType}
                            </p>
                            <span className="text-[10px] text-slate-400 block truncate">{item.category}</span>
                          </div>
                        </div>

                        {/* Quick Add Presets / Buttons */}
                        <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-200/60">
                          {isKg ? (
                            <div className="flex items-center gap-1">
                              {[
                                { label: '500g', val: 500 },
                                { label: '1kg', val: 1000 },
                                { label: '2kg', val: 2000 }
                              ].map((preset) => (
                                <button
                                  key={preset.label}
                                  type="button"
                                  onClick={() => {
                                    setPosCart((prev) => {
                                      const existing = prev.find((c) => c.item.id === item.id);
                                      if (existing) {
                                        return prev.map((c) =>
                                          c.item.id === item.id
                                            ? { ...c, qtyOrWeight: c.qtyOrWeight + preset.val }
                                            : c
                                        );
                                      }
                                      return [...prev, { item, qtyOrWeight: preset.val }];
                                    });
                                    showToast(`Added ${preset.label} ${item.name} to bill`);
                                  }}
                                  className="px-2 py-1 bg-white hover:bg-emerald-600 hover:text-white text-slate-800 font-black text-[10px] rounded-lg border border-slate-200 shadow-2xs transition-all"
                                >
                                  +{preset.label}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] font-bold text-slate-500">Per {item.unitType}</span>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setPosCart((prev) => {
                                const existing = prev.find((c) => c.item.id === item.id);
                                const defaultQty = isKg ? 1000 : 1;
                                if (existing) {
                                  return prev.map((c) =>
                                    c.item.id === item.id
                                      ? { ...c, qtyOrWeight: c.qtyOrWeight + defaultQty }
                                      : c
                                  );
                                }
                                return [...prev, { item, qtyOrWeight: defaultQty }];
                              });
                              showToast(`Added 1 ${isKg ? 'kg' : item.unitType} ${item.name}`);
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-2xs transition-colors flex items-center gap-1 ml-auto"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Floating Bottom Banner if Cart has items */}
              {posCart.length > 0 && (
                <div className="sticky bottom-6 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between border border-slate-800 mt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
                      {posCart.length}
                    </div>
                    <div>
                      <p className="font-black text-xs">Current Bill Items Ready</p>
                      <p className="text-[11px] text-slate-400">Total: <span className="text-emerald-400 font-bold">{formatCurrency(
                        posCart.reduce((sum, c) => {
                          const p = c.item.unitType === 'kg'
                            ? (c.item.pricePerUnit * c.qtyOrWeight) / 1000
                            : c.item.pricePerUnit * c.qtyOrWeight;
                          return sum + p;
                        }, 0)
                      )}</span></p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPosView('checkout')}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-2"
                  >
                    <span>Proceed to Checkout Page</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Checkout & Bill Page (Full Width & Dedicated) */
            <div className="max-w-3xl mx-auto bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-md space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setPosView('catalog')}
                  className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Produce Catalog</span>
                </button>
                <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                  Checkout & Billing Page
                </span>
              </div>

              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-emerald-600" />
                    <span>Itemized Counter Bill</span>
                  </h3>
                  <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-xl">
                    {posCart.length} Items Selected
                  </span>
                </div>

                {/* Customer Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Customer Name</label>
                    <input
                      type="text"
                      value={posCustomerName}
                      onChange={(e) => setPosCustomerName(e.target.value)}
                      placeholder="Walk-in Customer"
                      className="w-full px-3.5 py-2.5 bg-white text-xs border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Mobile Number</label>
                    <input
                      type="text"
                      value={posCustomerPhone}
                      onChange={(e) => setPosCustomerPhone(e.target.value)}
                      placeholder="9999999999"
                      className="w-full px-3.5 py-2.5 bg-white text-xs border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>

                {/* Cart Items List */}
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {posCart.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-3">
                      <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-600">Your POS bill is currently empty.</p>
                      <button
                        type="button"
                        onClick={() => setPosView('catalog')}
                        className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-sm hover:bg-emerald-700 transition-colors"
                      >
                        Add Produce from Catalog
                      </button>
                    </div>
                  ) : (
                    posCart.map((c) => {
                      const isKg = c.item.unitType === 'kg';
                      const price = isKg
                        ? (c.item.pricePerUnit * c.qtyOrWeight) / 1000
                        : c.item.pricePerUnit * c.qtyOrWeight;
                      return (
                        <div key={c.item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <img
                                src={c.item.image}
                                alt={c.item.name}
                                className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                                referrerPolicy="no-referrer"
                              />
                              <div>
                                <p className="font-black text-xs text-slate-900">{c.item.name}</p>
                                <p className="text-[11px] font-bold text-emerald-700">{formatCurrency(price)}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setPosCart((prev) => prev.filter((item) => item.item.id !== c.item.id))}
                              className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Quantity / Weight input & Quick Presets */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200">
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                step={isKg ? "50" : "0.5"}
                                min={isKg ? "10" : "0.5"}
                                value={c.qtyOrWeight}
                                onChange={(e) => {
                                  const val = Math.max(0, Number(e.target.value));
                                  setPosCart((prev) =>
                                    prev.map((item) =>
                                      item.item.id === c.item.id ? { ...item, qtyOrWeight: val } : item
                                    )
                                  );
                                }}
                                className="w-28 px-3 py-2 bg-white text-xs border border-slate-300 rounded-xl font-bold text-center text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                              <span className="text-xs font-bold text-slate-600">
                                {isKg ? 'grams' : c.item.unitType}
                              </span>
                            </div>

                            {/* Quick Presets for Kg */}
                            {isKg && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {[
                                  { label: '250g', val: 250 },
                                  { label: '500g', val: 500 },
                                  { label: '1kg', val: 1000 },
                                  { label: '1.5kg', val: 1500 },
                                  { label: '2kg', val: 2000 }
                                ].map((preset) => (
                                  <button
                                    key={preset.label}
                                    type="button"
                                    onClick={() => {
                                      setPosCart((prev) =>
                                        prev.map((item) =>
                                          item.item.id === c.item.id ? { ...item, qtyOrWeight: preset.val } : item
                                        )
                                      );
                                    }}
                                    className={`px-2 py-1 text-[11px] font-black rounded-lg border transition-all ${
                                      c.qtyOrWeight === preset.val
                                        ? 'bg-emerald-600 text-white border-emerald-600'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    {preset.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Total and Checkout Options */}
                {posCart.length > 0 && (
                  <div className="space-y-5 pt-4 border-t border-slate-200">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 block">Select Payment Mode</label>
                      <div className="grid grid-cols-3 gap-3">
                        {(['Cash', 'UPI', 'Card'] as const).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setPosPaymentMethod(mode)}
                            className={`py-3 text-xs font-black rounded-2xl border transition-all shadow-xs ${
                              posPaymentMethod === mode
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-105'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-lg font-black text-slate-900 bg-emerald-50 p-4 rounded-2xl border border-emerald-200">
                      <span>Grand Total:</span>
                      <span className="text-emerald-700 font-mono text-xl">
                        {formatCurrency(
                          posCart.reduce((sum, c) => {
                            const p = c.item.unitType === 'kg'
                              ? (c.item.pricePerUnit * c.qtyOrWeight) / 1000
                              : c.item.pricePerUnit * c.qtyOrWeight;
                            return sum + p;
                          }, 0)
                        )}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        handleCompletePosSale();
                        setPosView('catalog');
                      }}
                      className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                      <Check className="w-5 h-5" />
                      <span>Complete Counter Sale & Print Bill</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Live Orders */}
      {activeTab === 'orders' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Multi-Customer Control Bar */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-3.5 shadow-md border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-extrabold text-sm text-white">Live Customer Counter Queue</h3>
                  <p className="text-[11px] text-slate-400">
                    Verify scale checkout weights and finalize bills
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {pendingOrders.length > 1 && (
                  <button
                    onClick={handleBulkApproveInApp}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 active:scale-95"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Approve All ({pendingOrders.length})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-800">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by order ID, customer name or phone..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={selectedCustomerFilter}
                  onChange={(e) => setSelectedCustomerFilter(e.target.value)}
                  className="w-full sm:w-48 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-medium outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="ALL">All Customers</option>
                  {Array.from(new Set(orders.map(o => o.customerPhone))).map((phone) => {
                    const ord = orders.find(o => o.customerPhone === phone);
                    return (
                      <option key={phone} value={phone}>
                        {ord ? `${ord.customerName} (${phone})` : phone}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>

          {/* Orders List */}
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
              <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl mx-auto flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <h4 className="font-extrabold text-sm text-slate-900">No Orders Found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No customer orders match your current filter or search query.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const isPending = order.status === 'sent_to_shopkeeper';
                const isEditingThis = editingOrderId === order.id;

                return (
                  <div
                    key={order.id}
                    className={`bg-white rounded-3xl border transition-all shadow-sm overflow-hidden ${
                      isPending ? 'border-amber-400 ring-1 ring-amber-400/20' : 'border-slate-200'
                    }`}
                  >
                    {/* Order Top Bar */}
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs ${
                          isPending ? 'bg-amber-500 text-slate-950' : 'bg-emerald-600 text-white'
                        }`}>
                          {order.id.slice(-4)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-sm text-slate-900">{order.customerName}</h4>
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                              order.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                              order.status === 'approved' ? 'bg-teal-100 text-teal-800' :
                              order.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {order.status === 'sent_to_shopkeeper' ? 'Pending Approval' : order.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>Phone: <strong className="text-slate-800">{order.customerPhone}</strong></span>
                            <span>•</span>
                            <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500">Total:</span>
                        <span className="text-base font-black text-emerald-700 font-mono">
                          {formatCurrency(order.grandTotal)}
                        </span>
                      </div>
                    </div>

                    {/* Order Items Table */}
                    <div className="p-6 space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100">
                          <span>Produce Item</span>
                          <span>Weighed / Ordered Quantity & Price</span>
                        </div>

                        {(isEditingThis ? editedItems : order.items).map((item, idx) => (
                          <div key={item.itemId + idx} className="flex items-center justify-between py-2 border-b border-slate-100/60 last:border-0">
                            <div>
                              <p className="font-extrabold text-xs text-slate-900">{item.name}</p>
                              <p className="text-[11px] text-slate-500">
                                {formatCurrency(item.pricePerUnit)} / {item.unitType}
                              </p>
                            </div>

                            {isEditingThis ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={item.quantityOrWeight}
                                  onChange={(e) => handleWeightChange(idx, Number(e.target.value))}
                                  className="w-24 px-2.5 py-1 bg-amber-50 border border-amber-300 rounded-lg text-xs font-bold text-center text-slate-900 outline-none"
                                />
                                <span className="text-xs font-bold text-slate-600">
                                  {item.unitType === 'kg' ? 'g' : item.unitType}
                                </span>
                                <span className="text-xs font-black text-emerald-700 w-20 text-right">
                                  {formatCurrency(item.totalPrice)}
                                </span>
                              </div>
                            ) : (
                              <div className="text-right">
                                <p className="font-black text-xs text-slate-900">
                                  {formatWeightOrUnits(item.quantityOrWeight, item.unitType)}
                                </p>
                                <p className="text-xs font-bold text-emerald-700 font-mono">
                                  {formatCurrency(item.totalPrice)}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Action Buttons Bar */}
                      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          {!isEditingThis && isPending && (
                            <button
                              onClick={() => startEditOrder(order)}
                              className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs rounded-xl border border-amber-200 transition-colors flex items-center gap-1.5"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                              <span>Verify & Edit Scale Weight</span>
                            </button>
                          )}

                          {isEditingThis && (
                            <button
                              onClick={() => saveEditedOrder(order.id)}
                              className="px-3 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl transition-colors"
                            >
                              Save Weights
                            </button>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {isPending && (
                            <>
                              <button
                                onClick={() => handleFastReject(order)}
                                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-colors flex items-center gap-1"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Fast Reject</span>
                              </button>

                              <button
                                onClick={() => setRejectingOrderId(order.id)}
                                className="px-3 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-xs rounded-xl transition-colors flex items-center gap-1"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Decline w/ Reason</span>
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => handleMarkAsPaid(order)}
                            className="px-3 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-extrabold text-xs rounded-xl transition-colors flex items-center gap-1 border border-emerald-300"
                          >
                            <DollarSign className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Mark as Paid</span>
                          </button>

                          {isPending ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleSendInApp(order)}
                                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 active:scale-95"
                              >
                                <Smartphone className="w-3.5 h-3.5 text-white" />
                                <span>Send via App</span>
                              </button>

                              <button
                                onClick={() => handleFinalizeAndSendWhatsApp(order)}
                                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-extrabold text-xs rounded-xl border border-emerald-300 transition-all flex items-center gap-1.5 active:scale-95"
                              >
                                <MessageSquare className="w-3.5 h-3.5 fill-emerald-600 text-emerald-900" />
                                <span>WhatsApp</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleSendWhatsAppToCustomer(order)}
                                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 transition-colors flex items-center gap-1.5"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                                <span>WhatsApp</span>
                              </button>

                              <button
                                onClick={() => generateOrderPDF(order, 'download')}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors flex items-center gap-1"
                              >
                                <Download className="w-3.5 h-3.5 text-slate-600" />
                                <span>PDF Receipt</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Rejection Prompt */}
                      {rejectingOrderId === order.id && (
                        <div className="mt-3 p-3 bg-rose-50 rounded-xl border border-rose-200 space-y-2 animate-fadeIn">
                          <label className="block text-xs font-bold text-rose-900">
                            Enter Reason for Declining Order:
                          </label>
                          <input
                            type="text"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="e.g. Tomatoes out of stock / scale weight differed"
                            className="w-full p-2 bg-white text-xs border border-rose-300 rounded-lg outline-none"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setRejectingOrderId(null)}
                              className="px-3 py-1 bg-slate-200 text-slate-700 font-bold text-xs rounded-lg"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleRejectOrder(order.id)}
                              className="px-3 py-1 bg-rose-600 text-white font-bold text-xs rounded-lg"
                            >
                              Confirm Reject
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Inventory CRUD */}
      {activeTab === 'inventory' && (
        <div className="animate-fadeIn">
          <InventoryManager
            inventory={inventory}
            onSaveItem={onSaveInventoryItem}
            onDeleteItem={onDeleteInventoryItem}
            onToggleStock={onToggleStock}
          />
        </div>
      )}

      {/* Tab Content: Store & Hub (Offers, Users, Stats, Settings) */}
      {activeTab === 'store_settings' && (
        <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
          {/* Section 1: Store & Branch Settings */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3.5 pb-5 border-b border-slate-100">
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-200">
                <Settings className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-black text-lg text-slate-900">Store & Branch Configuration</h3>
                <p className="text-xs text-slate-500">
                  Manage your shop profile, address, operating hours, and UPI payment ID
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveStoreSettings} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">Store Name</label>
                  <input
                    type="text"
                    value={storeConfig.name}
                    onChange={(e) => setStoreConfig({ ...storeConfig, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 text-sm border border-slate-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">Branch Designation</label>
                  <input
                    type="text"
                    value={storeConfig.branch}
                    onChange={(e) => setStoreConfig({ ...storeConfig, branch: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 text-sm border border-slate-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">Store Address / Plot Location</label>
                <textarea
                  value={storeConfig.address}
                  onChange={(e) => setStoreConfig({ ...storeConfig, address: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-50 text-sm border border-slate-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">WhatsApp Support Phone</label>
                  <input
                    type="text"
                    value={storeConfig.phone}
                    onChange={(e) => setStoreConfig({ ...storeConfig, phone: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 text-sm border border-slate-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">UPI VPA ID (for payments)</label>
                  <input
                    type="text"
                    value={storeConfig.upiId}
                    onChange={(e) => setStoreConfig({ ...storeConfig, upiId: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 text-sm border border-slate-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">Operating Hours</label>
                <input
                  type="text"
                  value={storeConfig.operatingHours}
                  onChange={(e) => setStoreConfig({ ...storeConfig, operatingHours: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 text-sm border border-slate-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-2xl shadow-md transition-all flex items-center gap-2 active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Store Settings</span>
                </button>
              </div>
            </form>
          </div>

          {/* Section 2: Product Store Offers & Discounts Page */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3.5 pb-5 border-b border-slate-100">
              <div className="p-3 bg-amber-50 text-amber-700 rounded-2xl border border-amber-200">
                <Tag className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-black text-lg text-slate-900">Product Store Offers & Promo Discounts</h3>
                <p className="text-xs text-slate-500">
                  Create discount offers, promo codes, and special sales displayed to customers in the catalog
                </p>
              </div>
            </div>

            {/* Add Offer Form */}
            <form onSubmit={handleAddOffer} className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">Publish New Offer</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">Offer Title / Banner</label>
                  <input
                    type="text"
                    value={newOfferTitle}
                    onChange={(e) => setNewOfferTitle(e.target.value)}
                    placeholder="e.g. 15% Off Organic Tomatoes Weekend Special"
                    className="w-full px-4 py-2.5 bg-white text-xs border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">Target Product / Category</label>
                  <select
                    value={newOfferItemId}
                    onChange={(e) => setNewOfferItemId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white text-xs border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    <option value="ALL">All Store Produce Items (Storewide)</option>
                    {inventory.map((item) => (
                      <option key={item.id} value={item.id}>{item.name} ({item.category})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">Discount % (Optional)</label>
                  <input
                    type="number"
                    value={newOfferDiscountPct}
                    onChange={(e) => setNewOfferDiscountPct(e.target.value)}
                    placeholder="e.g. 10"
                    className="w-full px-4 py-2.5 bg-white text-xs border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">Flat Discount Amount (₹)</label>
                  <input
                    type="number"
                    value={newOfferDiscountAmt}
                    onChange={(e) => setNewOfferDiscountAmt(e.target.value)}
                    placeholder="e.g. 20"
                    className="w-full px-4 py-2.5 bg-white text-xs border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">Promo Code (Optional)</label>
                  <input
                    type="text"
                    value={newOfferCode}
                    onChange={(e) => setNewOfferCode(e.target.value)}
                    placeholder="e.g. FRESH15"
                    className="w-full px-4 py-2.5 bg-white text-xs border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 outline-none uppercase"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Publish Offer on Product Store</span>
                </button>
              </div>
            </form>

            {/* Active Offers List */}
            <div className="space-y-3">
              <h4 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">Active Store Offers ({offers.length})</h4>
              {offers.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No active offers currently published.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {offers.map((offer) => (
                    <div key={offer.id} className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl flex items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md uppercase">
                            {offer.discountPercentage ? `${offer.discountPercentage}% OFF` : offer.discountAmount ? `₹${offer.discountAmount} OFF` : 'SPECIAL'}
                          </span>
                          {offer.promoCode && (
                            <span className="bg-slate-900 text-amber-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded-md">
                              {offer.promoCode}
                            </span>
                          )}
                        </div>
                        <h5 className="font-extrabold text-xs text-slate-900">{offer.title}</h5>
                        <p className="text-[10px] text-slate-500">
                          Applies to: {offer.itemId === 'ALL' ? 'All Store Items' : inventory.find(i => i.id === offer.itemId)?.name || 'Specific Item'}
                        </p>
                      </div>

                      <button
                        onClick={() => handleDeleteOffer(offer.id)}
                        className="p-2 text-rose-600 hover:bg-rose-100 rounded-xl transition-colors shrink-0"
                        title="Delete offer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Customer Directory & Users */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-teal-50 text-teal-700 rounded-2xl border border-teal-200">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">Registered Customers & Users</h3>
                  <p className="text-xs text-slate-500">View customer activity, order counts, and total spend</p>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-xl">
                {customersList.length} Customers
              </span>
            </div>

            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[10px]">
                  <tr>
                    <th className="p-3 rounded-l-xl">Customer Name</th>
                    <th className="p-3">Mobile Number</th>
                    <th className="p-3">Total Orders</th>
                    <th className="p-3 rounded-r-xl">Total Spend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customersList.map((cust) => (
                    <tr key={cust.id} className="hover:bg-slate-50/80">
                      <td className="p-3 font-extrabold text-slate-900 flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{cust.name}</span>
                      </td>
                      <td className="p-3 font-mono text-slate-600">{cust.phone}</td>
                      <td className="p-3 font-bold text-slate-800">{cust.totalOrders || 0} orders</td>
                      <td className="p-3 font-black text-emerald-700 font-mono">{formatCurrency(cust.totalSpent || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Sales Analytics & Statistics */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-200">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">Sales Analytics & Weekly Statistics</h3>
                  <p className="text-xs text-slate-500">Revenue performance charts and order metrics</p>
                </div>
              </div>
              <div className="bg-slate-900 text-emerald-400 px-4 py-2 rounded-xl text-xs font-black font-mono shadow-sm">
                Week Total: {formatCurrency(getWeeklySalesData().reduce((s, d) => s + d.sales, 0))}
              </div>
            </div>

            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getWeeklySalesData()} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    tickFormatter={(val) => `₹${val}`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-800 text-xs space-y-1">
                            <p className="font-black text-amber-400">{label} ({data.date})</p>
                            <p className="font-bold text-emerald-400">Sales: {formatCurrency(data.sales)}</p>
                            <p className="text-slate-300">Orders: {data.orders}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="sales"
                    fill="#10b981"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      <StoreQRGeneratorModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
      />

      {/* Simulate Customer Modal */}
      {onAddOrder && (
        <SimulateCustomerModal
          isOpen={isSimulateCustomerModalOpen}
          onClose={() => setIsSimulateCustomerModalOpen(false)}
          inventory={inventory}
          onAddOrder={(newOrder) => {
            onAddOrder(newOrder);
            showToast(`Created new checkout order #${newOrder.id} for ${newOrder.customerName}!`);
          }}
        />
      )}

      {/* Ultra-Modern, Luxury Floating Bottom Navigation Dock */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 backdrop-blur-2xl border border-slate-700/60 p-2.5 rounded-3xl flex items-center gap-2 shadow-[0_25px_60px_rgba(0,0,0,0.6)] ring-1 ring-white/15">
        <button
          type="button"
          onClick={() => setActiveTab('manual_sale')}
          className={`group relative flex items-center gap-2 px-4 py-3 rounded-2xl transition-all duration-300 ${
            activeTab === 'manual_sale'
              ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-slate-950 font-black shadow-[0_0_25px_rgba(245,158,11,0.5)] scale-105'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/80 font-bold text-xs'
          }`}
        >
          <div className={`p-1 rounded-xl transition-colors ${activeTab === 'manual_sale' ? 'bg-slate-950/10' : 'bg-slate-800/50 group-hover:bg-slate-700/50'}`}>
            <DollarSign className={`w-4 h-4 transition-transform group-hover:scale-110 ${activeTab === 'manual_sale' ? 'text-slate-950' : 'text-amber-400'}`} />
          </div>
          <span className="text-xs tracking-tight">Counter POS</span>
          {activeTab === 'manual_sale' && (
            <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-1.5 bg-white rounded-full blur-[1px] animate-pulse" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`group relative flex items-center gap-2 px-4 py-3 rounded-2xl transition-all duration-300 ${
            activeTab === 'orders'
              ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-slate-950 font-black shadow-[0_0_25px_rgba(245,158,11,0.5)] scale-105'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/80 font-bold text-xs'
          }`}
        >
          <div className={`p-1 rounded-xl transition-colors relative ${activeTab === 'orders' ? 'bg-slate-950/10' : 'bg-slate-800/50 group-hover:bg-slate-700/50'}`}>
            <Clock className={`w-4 h-4 transition-transform group-hover:scale-110 ${activeTab === 'orders' ? 'text-slate-950' : 'text-amber-400'}`} />
            {pendingOrders.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow-lg shadow-rose-500/60 animate-bounce border-2 border-slate-900">
                {pendingOrders.length}
              </span>
            )}
          </div>
          <span className="text-xs tracking-tight">Live Orders</span>
          {activeTab === 'orders' && (
            <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-1.5 bg-white rounded-full blur-[1px] animate-pulse" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          className={`group relative flex items-center gap-2 px-4 py-3 rounded-2xl transition-all duration-300 ${
            activeTab === 'inventory'
              ? 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 text-slate-950 font-black shadow-[0_0_25px_rgba(16,185,129,0.5)] scale-105'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/80 font-bold text-xs'
          }`}
        >
          <div className={`p-1 rounded-xl transition-colors ${activeTab === 'inventory' ? 'bg-slate-950/10' : 'bg-slate-800/50 group-hover:bg-slate-700/50'}`}>
            <Package className={`w-4 h-4 transition-transform group-hover:scale-110 ${activeTab === 'inventory' ? 'text-slate-950' : 'text-emerald-400'}`} />
          </div>
          <span className="text-xs tracking-tight">Product Stock</span>
          {activeTab === 'inventory' && (
            <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-1.5 bg-white rounded-full blur-[1px] animate-pulse" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('store_settings')}
          className={`group relative flex items-center gap-2 px-4 py-3 rounded-2xl transition-all duration-300 ${
            activeTab === 'store_settings'
              ? 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 text-slate-950 font-black shadow-[0_0_25px_rgba(16,185,129,0.5)] scale-105'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/80 font-bold text-xs'
          }`}
        >
          <div className={`p-1 rounded-xl transition-colors ${activeTab === 'store_settings' ? 'bg-slate-950/10' : 'bg-slate-800/50 group-hover:bg-slate-700/50'}`}>
            <Store className={`w-4 h-4 transition-transform group-hover:scale-110 ${activeTab === 'store_settings' ? 'text-slate-950' : 'text-emerald-400'}`} />
          </div>
          <span className="text-xs tracking-tight">Store & Hub</span>
          {activeTab === 'store_settings' && (
            <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-1.5 bg-white rounded-full blur-[1px] animate-pulse" />
          )}
        </button>
      </div>
    </div>
  );
};
