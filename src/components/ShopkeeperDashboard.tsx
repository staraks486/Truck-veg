import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
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
  AlertTriangle,
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
  Truck,
  Tag,
  ArrowRight,
  ArrowLeft,
  X
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
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'manual_sale' | 'store_settings' | 'whatsapp_scheduler'>('manual_sale');

  // Automated WhatsApp CRM & Scheduler State
  const [schedulerCampaignType, setSchedulerCampaignType] = useState<'vip_reward' | 'win_back' | 'first_time' | 'all'>('vip_reward');
  const [schedulerFrequency, setSchedulerFrequency] = useState<'instant' | 'daily_10am' | 'weekly_sunday'>('daily_10am');
  const [isSchedulerActive, setIsSchedulerActive] = useState<boolean>(true);
  const [schedulerLogs, setSchedulerLogs] = useState<{ id: string; customerName: string; phone: string; coupon: string; timestamp: string; status: string }[]>([
    { id: 'LOG-01', customerName: 'Ramesh Kumar', phone: '9876543210', coupon: 'VIP20', timestamp: '2026-07-27 10:00 AM', status: 'Sent via WhatsApp' },
    { id: 'LOG-02', customerName: 'Priya Sharma', phone: '9811223344', coupon: 'WELCOME50', timestamp: '2026-07-26 10:00 AM', status: 'Sent via WhatsApp' }
  ]);

  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editedItems, setEditedItems] = useState<OrderItem[]>([]);
  const [shopkeeperNote, setShopkeeperNote] = useState('');
  const [editedDeliveryAddress, setEditedDeliveryAddress] = useState('');
  const [addItemSelectId, setAddItemSelectId] = useState('');
  const [rejectingOrderId, setRejectingOrderId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [cancelingOrderModal, setCancelingOrderModal] = useState<Order | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState<string>('Cancelled by shopkeeper');
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
  const [billSubTab, setBillSubTab] = useState<'queue' | 'checkout'>('queue');

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

  const handleCompletePosSale = () => {
    if (posCart.length === 0) {
      toast('POS cart is empty. Add items to complete sale.');
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
    toast.success(` Successfully recorded POS Sale #${newOrder.id} for ${formatCurrency(subtotal)}!`);
    
    // Automatically open receipt view for the generated bill
    onViewOrderReceipt(newOrder);

    setPosCart([]);
    setPosCustomerName('Walk-in Customer');
    setPosCustomerPhone('9999999999');
  };

  const handleSaveStoreSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoredStoreConfig(storeConfig);
    toast('🏪 Store & Branch settings updated successfully!');
  };

  const handleAddOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOfferTitle.trim()) {
      toast('Please enter an offer title.');
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
    toast.success(' Successfully published store offer on product store!');
  };

  const handleDeleteOffer = (offerId: string) => {
    const updated = offers.filter(o => o.id !== offerId);
    setOffers(updated);
    saveStoredOffers(updated);
    toast('Offer removed successfully.');
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

  const customerAnalytics = useMemo(() => {
    const map = new Map<string, { name: string; phone: string; orderCount: number; totalSpent: number; lastOrderDate: string; itemsBought: string[] }>();

    orders.forEach(ord => {
      const phone = ord.customerPhone || 'Unknown';
      const existing = map.get(phone) || {
        name: ord.customerName || 'Valued Customer',
        phone,
        orderCount: 0,
        totalSpent: 0,
        lastOrderDate: ord.createdAt,
        itemsBought: []
      };

      existing.orderCount += 1;
      existing.totalSpent += ord.grandTotal || 0;
      if (new Date(ord.createdAt) > new Date(existing.lastOrderDate)) {
        existing.lastOrderDate = ord.createdAt;
      }
      ord.items.forEach(i => {
        if (!existing.itemsBought.includes(i.name)) existing.itemsBought.push(i.name);
      });
      map.set(phone, existing);
    });

    return Array.from(map.values()).map(c => {
      let tier: 'VIP Regular' | 'Active Buyer' | 'Dormant / Inactive' | 'New Customer' = 'Active Buyer';
      let suggestedCoupon = 'FRESH10';
      let couponDiscount = '10% OFF';

      if (c.orderCount >= 3) {
        tier = 'VIP Regular';
        suggestedCoupon = 'VIP20';
        couponDiscount = '20% OFF';
      } else if (c.orderCount === 1) {
        tier = 'New Customer';
        suggestedCoupon = 'WELCOME50';
        couponDiscount = '₹50 OFF';
      } else {
        const daysSinceLastOrder = (Date.now() - new Date(c.lastOrderDate).getTime()) / (1000 * 3600 * 24);
        if (daysSinceLastOrder > 7) {
          tier = 'Dormant / Inactive';
          suggestedCoupon = 'COMEBACK15';
          couponDiscount = '15% OFF';
        }
      }

      return {
        ...c,
        tier,
        suggestedCoupon,
        couponDiscount
      };
    });
  }, [orders]);

  const handleTriggerCampaignForCustomer = (cust: typeof customerAnalytics[0]) => {
    let msg = '';
    if (cust.tier === 'VIP Regular') {
      msg = `🌟 *VIP LOYALTY REWARD - FARMER'S GATE* 🌟\n━━━━━━━━━━━━━━━━━━━━━━\nHello *${cust.name}*,\n\nThank you for being one of our most valued VIP customers with ${cust.orderCount} orders! 🥦🍅\n\n🎉 *Your Exclusive VIP Coupon:* *${cust.suggestedCoupon}* (${cust.couponDiscount})\n\nApply this code on your next fresh grocery order to redeem your reward.\n\n_Fresh, organic, and handpicked daily._`;
    } else if (cust.tier === 'Dormant / Inactive') {
      msg = `🌿 *WE MISS YOU AT FARMER'S GATE!* 🌿\n━━━━━━━━━━━━━━━━━━━━━━\nHello *${cust.name}*,\n\nWe noticed you haven't ordered fresh produce in a while. Come back to farm-fresh goodness! 🍅🥦\n\n🎉 *Your Comeback Coupon:* *${cust.suggestedCoupon}* (${cust.couponDiscount})\n\nShop today and enjoy lightning-fast delivery or store pickup.\n\n_Fresh, organic, and handpicked daily._`;
    } else if (cust.tier === 'New Customer') {
      msg = `🌱 *WELCOME TO FARMER'S GATE!* 🌱\n━━━━━━━━━━━━━━━━━━━━━━\nHello *${cust.name}*,\n\nThanks for your first order! We hope you loved your fresh farm produce. 🥦🍅\n\n🎉 *Your Next-Order Coupon:* *${cust.suggestedCoupon}* (${cust.couponDiscount})\n\nOrder again this week for farm-fresh delivery.\n\n_Fresh, organic, and handpicked daily._`;
    } else {
      msg = `🌿 *FARMER'S GATE SPECIAL REWARD* 🌿\n━━━━━━━━━━━━━━━━━━━━━━\nHello *${cust.name}*,\n\nHere is a special token of appreciation for shopping with Farmer's Gate! 🍅🥦\n\n🎉 *Your Discount Coupon:* *${cust.suggestedCoupon}* (${cust.couponDiscount})\n\nExplore our fresh daily harvest catalog now.\n\n_Fresh, organic, and handpicked daily._`;
    }

    openWhatsAppShare(msg, cust.phone);

    const newLog = {
      id: `LOG-${Date.now().toString().slice(-4)}`,
      customerName: cust.name,
      phone: cust.phone,
      coupon: cust.suggestedCoupon,
      timestamp: new Date().toLocaleString(),
      status: 'Sent via WhatsApp'
    };
    setSchedulerLogs(prev => [newLog, ...prev]);
    toast.success(`WhatsApp campaign triggered for ${cust.name} with code ${cust.suggestedCoupon}!`);
  };

  const handleRunBatchCampaign = () => {
    const matched = customerAnalytics.filter(c => {
      if (schedulerCampaignType === 'vip_reward') return c.tier === 'VIP Regular';
      if (schedulerCampaignType === 'win_back') return c.tier === 'Dormant / Inactive';
      if (schedulerCampaignType === 'first_time') return c.tier === 'New Customer';
      return true;
    });

    if (matched.length === 0) {
      toast('No customers match the selected campaign filter criteria.');
      return;
    }

    handleTriggerCampaignForCustomer(matched[0]);
    toast.success(`Batch campaign started for ${matched.length} customer(s)! First WhatsApp opened.`);
  };
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

  const startEditOrder = (order: Order) => {
    setEditingOrderId(order.id);
    setEditedItems(JSON.parse(JSON.stringify(order.items)));
    setShopkeeperNote(order.shopkeeperNote || '');
    setEditedDeliveryAddress(order.deliveryAddress || '');
    setAddItemSelectId('');
  };

  const handleWeightChange = (itemIdx: number, newGramsOrQty: number) => {
    const updated = [...editedItems];
    const item = updated[itemIdx];
    item.quantityOrWeight = Math.max(1, newGramsOrQty);
    item.totalPrice = item.unitType === 'kg'
      ? (item.pricePerUnit * item.quantityOrWeight) / 1000
      : item.pricePerUnit * item.quantityOrWeight;
    setEditedItems(updated);
  };

  const handleRemoveItemFromOrderDirect = (order: Order, itemIdx: number) => {
    if (order.items.length <= 1) {
      setCancelingOrderModal(order);
      setCancelReasonInput('Item cancelled / out of stock');
      toast(`Removing the last item will cancel Order #${order.id.slice(-4)}.`);
      return;
    }

    const removedItem = order.items[itemIdx];
    const updatedItems = order.items.filter((_, idx) => idx !== itemIdx);
    onUpdateOrderWeights(order.id, updatedItems, order.shopkeeperNote);
    toast(`Removed "${removedItem.name}" from Order #${order.id.slice(-4)}.`);
  };

  const handleRemoveItemFromOrder = (itemIdx: number) => {
    if (editedItems.length <= 1) {
      if (editingOrderId) {
        const currentOrd = orders.find(o => o.id === editingOrderId);
        if (currentOrd) {
          setCancelingOrderModal(currentOrd);
          setCancelReasonInput('All items removed by shopkeeper');
          return;
        }
      }
      toast('An order must contain at least 1 item. Cancel the order if all items are removed.');
      return;
    }
    const removed = editedItems[itemIdx];
    const updated = editedItems.filter((_, idx) => idx !== itemIdx);
    setEditedItems(updated);
    toast(`Removed "${removed?.name || 'item'}" from order draft.`);
  };

  const handleAddItemToOrder = (inventoryItemId: string) => {
    if (!inventoryItemId) return;
    const inventoryItem = inventory.find(i => i.id === inventoryItemId);
    if (!inventoryItem) return;

    const defaultQty = inventoryItem.unitType === 'kg' ? 500 : 1;
    const calcPrice = inventoryItem.unitType === 'kg'
      ? (inventoryItem.pricePerUnit * defaultQty) / 1000
      : inventoryItem.pricePerUnit * defaultQty;

    const newItem: OrderItem = {
      itemId: inventoryItem.id,
      name: inventoryItem.name,
      unitType: inventoryItem.unitType,
      quantityOrWeight: defaultQty,
      pricePerUnit: inventoryItem.pricePerUnit,
      totalPrice: calcPrice
    };

    setEditedItems([...editedItems, newItem]);
    setAddItemSelectId('');
    toast(`Added ${inventoryItem.name} to live order!`);
  };

  const saveEditedOrder = (orderId: string) => {
    onUpdateOrderWeights(orderId, editedItems, shopkeeperNote);
    if (editedDeliveryAddress !== undefined) {
      const targetOrder = orders.find(o => o.id === orderId);
      if (targetOrder) {
        targetOrder.deliveryAddress = editedDeliveryAddress;
      }
    }
    setEditingOrderId(null);
    toast.success(` Saved updated live order details & item weights for Order #${orderId}`);
  };

  const handleCancelOrder = (order: Order) => {
    setCancelingOrderModal(order);
    setCancelReasonInput('Cancelled by shopkeeper');
  };

  const handleConfirmCancelOrder = () => {
    if (!cancelingOrderModal) return;
    onUpdateOrderStatus(
      cancelingOrderModal.id,
      'rejected',
      cancelReasonInput.trim() || 'Cancelled by shopkeeper'
    );
    toast.error(` Order #${cancelingOrderModal.id} has been cancelled.`);
    setCancelingOrderModal(null);
    setCancelReasonInput('Cancelled by shopkeeper');
  };

  const handleSendWhatsAppToCustomer = (order: Order) => {
    const msg = formatOrderWhatsAppMessage(order);
    openWhatsAppShare(msg, order.customerPhone);
    toast(`Opened WhatsApp with pre-filled bill for ${order.customerName}!`);
  };

  const handleSendInApp = (order: Order) => {
    if (editingOrderId === order.id) {
      onUpdateOrderWeights(order.id, editedItems, shopkeeperNote);
    }
    onUpdateOrderStatus(order.id, 'approved');
    setEditingOrderId(null);
    toast(`📱 Bill & Payment QR sent via App to ${order.customerName}! (Order #${order.id})`);
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
    toast(`Approved & opened WhatsApp bill for ${order.customerName}!`);
  };

  const handleBulkApproveInApp = () => {
    pendingOrders.forEach((o) => {
      onUpdateOrderStatus(o.id, 'approved');
    });
    toast(`⚡ Bulk approved and sent all ${pendingOrders.length} pending counter bills in-app!`);
  };

  const handleRejectOrder = (orderId: string) => {
    onUpdateOrderStatus(orderId, 'rejected', rejectionReason || 'Scale weight discrepancy or item out of stock.');
    setRejectingOrderId(null);
    setRejectionReason('');
    toast(`Declined order #${orderId}. Updated customer screen.`);
  };

  const handleFastReject = (order: Order) => {
    onUpdateOrderStatus(order.id, 'rejected', 'Fast rejected by shopkeeper');
    toast(`⚡ Fast Rejected order #${order.id.slice(-6)} instantly.`);
  };

  const handleMarkAsPaid = (order: Order) => {
    onUpdateOrderStatus(order.id, 'approved');
    toast(`💳 Marked order #${order.id.slice(-6)} as Paid & Completed!`);
  };

  return (
    <div className="space-y-4 pb-32 relative">
      {/* POS Quick Controls without top banner */}
      {activeTab === 'manual_sale' && (
        <div className="space-y-6 animate-fadeIn pb-24">
          {/* Catalog View (Full Width) */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h4 className="font-black text-base text-slate-900 flex items-center gap-2">
                  <Store className="w-5 h-5 text-emerald-600" />
                  <span>Select Produce for Counter Sale</span>
                </h4>
                <p className="text-xs text-slate-500">Filter by category or search items to add to bill</p>
              </div>

              <div className="flex items-center gap-2">
                {onAddOrder && (
                  <button
                    type="button"
                    onClick={() => setIsSimulateCustomerModalOpen(true)}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center gap-1.5 border border-slate-200"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Simulate Order</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('orders');
                    setBillSubTab('checkout');
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>View Bill & Checkout ({posCart.length})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
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
                                    toast(`Added ${preset.label} ${item.name} to bill`);
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
                              toast(`Added 1 ${isKg ? 'kg' : item.unitType} ${item.name}`);
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
                      <p className="text-[11px] text-slate-400">
                        Total:{' '}
                        <span className="text-emerald-400 font-bold">
                          {formatCurrency(
                            posCart.reduce((sum, c) => {
                              const p =
                                c.item.unitType === 'kg'
                                  ? (c.item.pricePerUnit * c.qtyOrWeight) / 1000
                                  : c.item.pricePerUnit * c.qtyOrWeight;
                              return sum + p;
                            }, 0)
                          )}
                        </span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('orders');
                      setBillSubTab('checkout');
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-2"
                  >
                    <span>Proceed to Checkout Page</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
        </div>
      )}
      {/* Tab Content: Bill (Contains Live Queue & Counter Bill Checkout) */}
      {activeTab === 'orders' && (
        <div className="space-y-4 animate-fadeIn pb-24">
          {/* Bill Tab Header & Sub-Navigation */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-md border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white">Store Bill & Order Management</h3>
                <p className="text-[11px] text-slate-400">
                  Switch between live customer order queue and walk-in counter bill checkout
                </p>
              </div>
            </div>

            {/* Sub-tab Switcher: Live Queue vs Bill Checkout */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 self-start sm:self-center">
              <button
                type="button"
                onClick={() => setBillSubTab('queue')}
                className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                  billSubTab === 'queue'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Live Queue</span>
                {pendingOrders.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-emerald-800 text-emerald-100 text-[10px] rounded-full font-black">
                    {pendingOrders.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setBillSubTab('checkout')}
                className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                  billSubTab === 'checkout'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Bill & Checkout</span>
                {posCart.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 text-[10px] rounded-full font-black">
                    {posCart.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Sub-Tab 1: Live Customer Queue */}
          {billSubTab === 'queue' && (
            <div className="space-y-4">
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
                              order.status === 'cancelled' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                              order.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {order.status === 'sent_to_shopkeeper'
                                ? 'Pending Approval'
                                : order.status === 'cancelled'
                                ? 'Cancelled by Customer'
                                : order.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                            <span>Phone: <strong className="text-slate-800">{order.customerPhone}</strong></span>
                            <span>•</span>
                            <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <span>•</span>
                            {order.fulfillmentType === 'home_delivery' ? (
                              <span className="font-extrabold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md inline-flex items-center gap-1 border border-amber-200">
                                <Truck className="w-3 h-3 text-amber-700" />
                                <span>Home Delivery</span>
                              </span>
                            ) : (
                              <span className="font-bold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                                <Store className="w-3 h-3 text-slate-500" />
                                <span>Store Pickup</span>
                              </span>
                            )}
                          </p>
                          {order.fulfillmentType === 'home_delivery' && order.deliveryAddress && (
                            <p className="text-xs text-amber-950 font-medium bg-amber-50/80 px-2.5 py-1 rounded-lg border border-amber-200/80 mt-1 flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                              <span className="truncate">Address: <strong>{order.deliveryAddress}</strong></span>
                            </p>
                          )}
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
                          <div key={item.itemId + idx} className="flex items-center justify-between py-2 border-b border-slate-100/60 last:border-0 gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-extrabold text-xs text-slate-900 truncate">{item.name}</p>
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
                                  className="w-20 sm:w-24 px-2 py-1 bg-amber-50 border border-amber-300 rounded-lg text-xs font-bold text-center text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                                />
                                <span className="text-xs font-bold text-slate-600">
                                  {item.unitType === 'kg' ? 'g' : item.unitType}
                                </span>
                                <span className="text-xs font-black text-emerald-700 w-16 sm:w-20 text-right font-mono">
                                  {formatCurrency(item.totalPrice)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItemFromOrder(idx)}
                                  className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Remove item"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <p className="font-black text-xs text-slate-900">
                                    {formatWeightOrUnits(item.quantityOrWeight, item.unitType)}
                                  </p>
                                  <p className="text-xs font-bold text-emerald-700 font-mono">
                                    {formatCurrency(item.totalPrice)}
                                  </p>
                                </div>
                                {order.status !== 'rejected' && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItemFromOrderDirect(order, idx)}
                                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-200"
                                    title={`Cancel item ${item.name}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}

                        {/* Cancelled/Rejected Banner */}
                        {(order.status === 'rejected' || order.status === 'cancelled') && (
                          <div className="mt-3 bg-rose-50 border border-rose-200 p-3 rounded-2xl flex items-start gap-2.5 text-xs text-rose-950">
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-extrabold text-rose-900 block">
                                {order.status === 'cancelled' ? 'Cancelled by Customer Reason / Message:' : 'Cancellation / Decline Reason:'}
                              </span>
                              <p className="font-semibold text-slate-800 mt-0.5">
                                {order.cancellationReason || order.rejectionReason || 'Order was cancelled or declined.'}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* In Live Order Edit Mode: Add Item & Extra Notes */}
                        {isEditingThis && (
                          <div className="mt-3 p-3 bg-amber-50/80 rounded-2xl border border-amber-200/90 space-y-3">
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                              <span className="text-xs font-bold text-amber-950 shrink-0">Add Produce Item:</span>
                              <select
                                value={addItemSelectId}
                                onChange={(e) => setAddItemSelectId(e.target.value)}
                                className="flex-1 text-xs font-medium bg-white border border-amber-300 rounded-xl px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-amber-500"
                              >
                                <option value="">-- Select Produce to Add --</option>
                                {inventory.map((inv) => (
                                  <option key={inv.id} value={inv.id}>
                                    {inv.name} ({formatCurrency(inv.pricePerUnit)}/{inv.unitType})
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => handleAddItemToOrder(addItemSelectId)}
                                disabled={!addItemSelectId}
                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-1 shrink-0"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add</span>
                              </button>
                            </div>

                            {/* Edit Delivery Address */}
                            {order.fulfillmentType === 'home_delivery' && (
                              <div className="space-y-1">
                                <label className="text-[11px] font-bold text-amber-900 block">Edit Delivery Address:</label>
                                <input
                                  type="text"
                                  value={editedDeliveryAddress}
                                  onChange={(e) => setEditedDeliveryAddress(e.target.value)}
                                  placeholder="House/flat no, street, landmark..."
                                  className="w-full text-xs bg-white border border-amber-300 rounded-xl px-2.5 py-1 text-slate-900 outline-none"
                                />
                              </div>
                            )}

                            {/* Shopkeeper Note */}
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-amber-900 block">Shopkeeper Note / Scale Remark:</label>
                              <input
                                type="text"
                                value={shopkeeperNote}
                                onChange={(e) => setShopkeeperNote(e.target.value)}
                                placeholder="e.g. Weighing verified on digital counter scale"
                                className="w-full text-xs bg-white border border-amber-300 rounded-xl px-2.5 py-1 text-slate-900 outline-none"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons Bar */}
                      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          {!isEditingThis ? (
                            order.status !== 'rejected' && (
                              <button
                                onClick={() => startEditOrder(order)}
                                className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs rounded-xl border border-amber-200 transition-colors flex items-center gap-1.5"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                                <span>Edit Live Order & Items</span>
                              </button>
                            )
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => saveEditedOrder(order.id)}
                                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all"
                              >
                                Save Changes
                              </button>
                              <button
                                onClick={() => setEditingOrderId(null)}
                                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                              >
                                Cancel Edit
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {order.status !== 'rejected' && (
                            <button
                              onClick={() => handleCancelOrder(order)}
                              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs rounded-xl border border-rose-200 transition-colors flex items-center gap-1"
                              title="Cancel this order"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              <span>Cancel Order</span>
                            </button>
                          )}

                          {isPending && (
                            <button
                              onClick={() => setRejectingOrderId(order.id)}
                              className="px-3 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-xs rounded-xl transition-colors flex items-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Decline w/ Reason</span>
                            </button>
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

      {/* Sub-Tab 2: Counter Bill & Checkout */}
      {billSubTab === 'checkout' && (
        <div className="max-w-3xl mx-auto bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-md space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('manual_sale')}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Produce Catalog</span>
            </button>
            <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
              Counter Bill & Checkout
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
                    onClick={() => setActiveTab('manual_sale')}
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
                    setBillSubTab('queue');
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
          {/* App Control Hub & Quick Action Icons */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 sm:p-8 rounded-3xl shadow-xl space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-700/60 pb-5">
              <div>
                <span className="bg-emerald-500/20 text-emerald-400 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">Control Panel</span>
                <h3 className="text-xl sm:text-2xl font-black mt-2 tracking-tight">App Control Hub & Management</h3>
                <p className="text-xs text-slate-400 mt-1">Quickly access and control all core POS app modules, checkout flows, and branch integrations.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsQRModalOpen(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  <QrCode className="w-4 h-4 text-amber-300" />
                  <span>View Store QR</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              <button
                type="button"
                onClick={() => setActiveTab('manual_sale')}
                className="bg-slate-800/80 hover:bg-slate-700 p-4 rounded-2xl border border-slate-700 text-left transition-all group flex flex-col justify-between"
              >
                <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform mb-3">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs sm:text-sm text-white">Counter POS</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Weigh & bill walk-in sales</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className="bg-slate-800/80 hover:bg-slate-700 p-4 rounded-2xl border border-slate-700 text-left transition-all group flex flex-col justify-between"
              >
                <div className="w-10 h-10 bg-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform mb-3 relative">
                  <FileText className="w-5 h-5" />
                  {pendingOrders.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white font-bold text-[9px] rounded-full flex items-center justify-center">
                      {pendingOrders.length}
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="font-extrabold text-xs sm:text-sm text-white">Bill Queue</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Manage customer orders</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('inventory')}
                className="bg-slate-800/80 hover:bg-slate-700 p-4 rounded-2xl border border-slate-700 text-left transition-all group flex flex-col justify-between"
              >
                <div className="w-10 h-10 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform mb-3">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs sm:text-sm text-white">Stock & Inventory</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Update prices & stock</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => toast.success('Sales Ledger & Income report opened')}
                className="bg-slate-800/80 hover:bg-slate-700 p-4 rounded-2xl border border-slate-700 text-left transition-all group flex flex-col justify-between"
              >
                <div className="w-10 h-10 bg-emerald-600/20 text-emerald-300 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform mb-3">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs sm:text-sm text-white">Sales & Income</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Revenue & cash flow</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => toast.success('Store Expense Ledger opened')}
                className="bg-slate-800/80 hover:bg-slate-700 p-4 rounded-2xl border border-slate-700 text-left transition-all group flex flex-col justify-between"
              >
                <div className="w-10 h-10 bg-rose-500/20 text-rose-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform mb-3">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs sm:text-sm text-white">Expense Tracker</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Log farm & store costs</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => toast.success('Daily & Monthly Reports generated')}
                className="bg-slate-800/80 hover:bg-slate-700 p-4 rounded-2xl border border-slate-700 text-left transition-all group flex flex-col justify-between"
              >
                <div className="w-10 h-10 bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform mb-3">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs sm:text-sm text-white">Audit Reports</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Download GST & sales logs</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsQRModalOpen(true)}
                className="bg-slate-800/80 hover:bg-slate-700 p-4 rounded-2xl border border-slate-700 text-left transition-all group flex flex-col justify-between"
              >
                <div className="w-10 h-10 bg-purple-500/20 text-purple-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform mb-3">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs sm:text-sm text-white">QR Code Generator</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Store scanner & posters</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsSimulateCustomerModalOpen(true)}
                className="bg-slate-800/80 hover:bg-slate-700 p-4 rounded-2xl border border-slate-700 text-left transition-all group flex flex-col justify-between"
              >
                <div className="w-10 h-10 bg-pink-500/20 text-pink-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform mb-3">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs sm:text-sm text-white">Simulate Customer</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Test mobile shopping view</p>
                </div>
              </button>
            </div>
          </div>

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

          {/* Login Page Photo & Banner Customizer */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3.5 pb-5 border-b border-slate-100">
              <div className="p-3 bg-teal-50 text-teal-700 rounded-2xl border border-teal-200">
                <Smartphone className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-black text-lg text-slate-900">Login Page Basket Photo & Banner</h3>
                <p className="text-xs text-slate-500">
                  Choose or update the featured hero photo displayed on the customer & shopkeeper login welcome screen
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Harvest Basket', url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80' },
                  { label: 'Organic Greens', url: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=800&q=80' },
                  { label: 'Fresh Fruits', url: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=800&q=80' },
                  { label: 'Market Stall', url: 'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=800&q=80' }
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      const updated = { ...storeConfig, loginPhotoUrl: preset.url };
                      setStoreConfig(updated);
                      saveStoredStoreConfig(updated);
                      toast.success(`Login photo updated to "${preset.label}"`);
                    }}
                    className={`relative rounded-2xl overflow-hidden border-2 transition-all p-1.5 text-left group ${storeConfig.loginPhotoUrl === preset.url ? 'border-emerald-600 ring-2 ring-emerald-600/30 bg-emerald-50' : 'border-slate-200 hover:border-slate-300 bg-slate-50'}`}
                  >
                    <img src={preset.url} alt={preset.label} className="w-full h-24 object-cover rounded-xl group-hover:scale-105 transition-transform" />
                    <span className="block text-[11px] font-extrabold text-slate-800 mt-1.5 px-1">{preset.label}</span>
                  </button>
                ))}
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">Custom Login Photo Image URL</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={storeConfig.loginPhotoUrl || ''}
                    onChange={(e) => setStoreConfig({ ...storeConfig, loginPhotoUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 px-4 py-2.5 bg-slate-50 text-xs border border-slate-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      saveStoredStoreConfig(storeConfig);
                      toast.success("Login page photo saved successfully!");
                    }}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
                  >
                    Save Photo
                  </button>
                </div>
              </div>
            </div>
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

      {/* Tab Content: Automated WhatsApp Scheduler */}
      {activeTab === 'whatsapp_scheduler' && (
        <div className="space-y-6 animate-fadeIn pb-24">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-green-950 text-white rounded-3xl p-6 shadow-lg border border-emerald-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-emerald-500/20 text-emerald-300 rounded-2xl border border-emerald-400/30">
                <MessageSquare className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-black text-lg text-white">Automated WhatsApp Coupon Scheduler & CRM</h3>
                <p className="text-xs text-emerald-200 mt-0.5">
                  Trigger personalized WhatsApp messages with unique discount coupons based on purchase frequency and order history.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-emerald-900/80 px-4 py-2 rounded-2xl border border-emerald-700 text-xs font-black">
              <span className={`w-2.5 h-2.5 rounded-full ${isSchedulerActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
              <span>{isSchedulerActive ? 'Auto-Scheduler Active (Cron 10 AM)' : 'Scheduler Paused'}</span>
            </div>
          </div>

          {/* Campaign Config Panel */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-2xl">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-sm text-slate-900">Configure Automated Campaign Trigger</h4>
                <p className="text-xs text-slate-500">Select audience segment and frequency for automated WhatsApp dispatch</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1.5">Target Customer Segment</label>
                <select
                  value={schedulerCampaignType}
                  onChange={(e) => setSchedulerCampaignType(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none"
                >
                  <option value="vip_reward">🌟 VIP Regular Customers (3+ Orders) → VIP20 (20% OFF)</option>
                  <option value="win_back">💤 Dormant / Inactive Customers (7+ Days) → COMEBACK15 (15% OFF)</option>
                  <option value="first_time">🌱 First-Time Buyer Nudge (1 Order) → WELCOME50 (₹50 OFF)</option>
                  <option value="all">🎁 All Customers Broadcast → FRESH10 (10% OFF)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1.5">Automated Scheduling Frequency</label>
                <select
                  value={schedulerFrequency}
                  onChange={(e) => setSchedulerFrequency(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none"
                >
                  <option value="daily_10am">⏰ Daily Auto-Pilot (10:00 AM Every Morning)</option>
                  <option value="weekly_sunday">📅 Weekly Rewards Auto-Trigger (Sunday 9 AM)</option>
                  <option value="instant">⚡ Instant Manual Campaign Run</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="schedulerToggle"
                  checked={isSchedulerActive}
                  onChange={(e) => setIsSchedulerActive(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <label htmlFor="schedulerToggle" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Enable automated background dispatch schedule
                </label>
              </div>
              <button
                type="button"
                onClick={handleRunBatchCampaign}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 active:scale-95"
              >
                <Send className="w-4 h-4" />
                <span>Run Campaign Now ({customerAnalytics.length} Customers)</span>
              </button>
            </div>
          </div>

          {/* Customer Segments & Purchase Frequency Cards */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-teal-50 text-teal-700 rounded-2xl">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-base text-slate-900">Customer Purchase Frequency & Coupon Assignment</h4>
                  <p className="text-xs text-slate-500">Analyzed from order history and activity</p>
                </div>
              </div>
              <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                {customerAnalytics.length} Profiles Tracked
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customerAnalytics.map((cust) => (
                <div key={cust.phone} className="p-4.5 bg-slate-50 rounded-2xl border border-slate-200 hover:border-emerald-300 transition-all space-y-3 flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="font-black text-sm text-slate-900">{cust.name}</h5>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          cust.tier === 'VIP Regular' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                          cust.tier === 'Dormant / Inactive' ? 'bg-rose-100 text-rose-900 border border-rose-300' :
                          cust.tier === 'New Customer' ? 'bg-blue-100 text-blue-900 border border-blue-300' :
                          'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        }`}>
                          {cust.tier}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-slate-500 mt-0.5">+91 {cust.phone}</p>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-black text-emerald-800 text-sm">{formatCurrency(cust.totalSpent)}</span>
                      <p className="text-[10px] text-slate-400">{cust.orderCount} order{cust.orderCount !== 1 ? 's' : ''}</p>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">Assigned Coupon:</span>
                      <span className="font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">{cust.suggestedCoupon}</span>
                      <span className="text-[11px] text-emerald-700 font-extrabold ml-1.5">({cust.couponDiscount})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTriggerCampaignForCustomer(cust)}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 active:scale-95 shrink-0"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Send WhatsApp</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Automated Scheduler Logs */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-2.5 bg-blue-50 text-blue-700 rounded-2xl">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-base text-slate-900">Automated Dispatch Logs</h4>
                <p className="text-xs text-slate-500">History of automated WhatsApp messages and coupon triggers</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[10px]">
                  <tr>
                    <th className="p-3 rounded-l-xl">Customer Name</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">Coupon Assigned</th>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3 rounded-r-xl">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {schedulerLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80">
                      <td className="p-3 font-extrabold text-slate-900">{log.customerName}</td>
                      <td className="p-3 font-mono text-slate-600">+91 {log.phone}</td>
                      <td className="p-3">
                        <span className="font-mono font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                          {log.coupon}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500 font-mono text-[11px]">{log.timestamp}</td>
                      <td className="p-3">
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full text-[10px]">
                          ✓ {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
            toast(`Created new checkout order #${newOrder.id} for ${newOrder.customerName}!`);
          }}
        />
      )}

      {/* Floating Store QR Action Button */}
      <button
        type="button"
        onClick={() => setIsQRModalOpen(true)}
        className="fixed bottom-20 right-5 z-40 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-3 rounded-full shadow-2xl flex items-center gap-2 font-extrabold text-xs transition-all hover:scale-105 active:scale-95 border-2 border-emerald-400 group"
        title="Generate & View Store QR Code"
      >
        <QrCode className="w-5 h-5 text-amber-300 group-hover:rotate-12 transition-transform" />
        <span className="hidden sm:inline font-bold">Store QR</span>
      </button>

      {/* Fixed Bottom Navigation Bar (Matching Customer Page Style) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 flex items-center justify-around shadow-xl">
        <button
          type="button"
          onClick={() => setActiveTab('manual_sale')}
          className={`flex flex-col items-center gap-1 py-1 px-3 transition-colors ${
            activeTab === 'manual_sale'
              ? 'text-emerald-700 font-black'
              : 'text-slate-600 hover:text-emerald-700 font-semibold'
          }`}
        >
          <DollarSign className="w-5 h-5" />
          <span className="text-[10px]">Counter POS</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`flex flex-col items-center gap-1 py-1 px-3 transition-colors relative ${
            activeTab === 'orders'
              ? 'text-emerald-700 font-black'
              : 'text-slate-600 hover:text-emerald-700 font-semibold'
          }`}
        >
          <FileText className="w-5 h-5" />
          <span className="text-[10px]">Bill</span>
          {pendingOrders.length > 0 && (
            <span className="absolute top-0 right-2 bg-emerald-600 text-white font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
              {pendingOrders.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          className={`flex flex-col items-center gap-1 py-1 px-3 transition-colors ${
            activeTab === 'inventory'
              ? 'text-emerald-700 font-black'
              : 'text-slate-600 hover:text-emerald-700 font-semibold'
          }`}
        >
          <Package className="w-5 h-5" />
          <span className="text-[10px]">Stock</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('store_settings')}
          className={`flex flex-col items-center gap-1 py-1 px-3 transition-colors ${
            activeTab === 'store_settings'
              ? 'text-emerald-700 font-black'
              : 'text-slate-600 hover:text-emerald-700 font-semibold'
          }`}
        >
          <Store className="w-5 h-5" />
          <span className="text-[10px]">Store Hub</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('whatsapp_scheduler')}
          className={`flex flex-col items-center gap-1 py-1 px-3 transition-colors ${
            activeTab === 'whatsapp_scheduler'
              ? 'text-emerald-700 font-black'
              : 'text-slate-600 hover:text-emerald-700 font-semibold'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px]">Auto WhatsApp</span>
        </button>
      {/* Cancel Order Confirmation Modal */}
      {cancelingOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-600">
                <XCircle className="w-5 h-5" />
                <h3 className="font-black text-base text-slate-900">Cancel Order #{cancelingOrderModal.id.slice(-6)}</h3>
              </div>
              <button
                type="button"
                onClick={() => setCancelingOrderModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <p>Customer: <strong className="text-slate-900">{cancelingOrderModal.customerName}</strong> ({cancelingOrderModal.customerPhone})</p>
              <p>Total Bill: <strong className="text-emerald-700 font-mono">{formatCurrency(cancelingOrderModal.grandTotal)}</strong> ({cancelingOrderModal.items.length} items)</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-800 block">Reason for Cancellation:</label>
              <input
                type="text"
                value={cancelReasonInput}
                onChange={(e) => setCancelReasonInput(e.target.value)}
                placeholder="e.g. Out of stock / Customer requested cancellation"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelingOrderModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelOrder}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirm Cancel Order</span>
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
