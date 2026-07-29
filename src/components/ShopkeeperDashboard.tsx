import React, { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { Order, InventoryItem, OrderItem, ProductOffer, CustomerRecord, ExpenseItem, CampaignTriggerConfig } from '../types';
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
  Receipt,
  Bell,
  BellRing,
  ArrowRight,
  ArrowLeft,
  X,
  MoreHorizontal
} from 'lucide-react';
import { exportToCSV } from '../utils/csvHelper';
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
  getStoredCustomers,
  deleteStoredCustomer,
  clearAllStoredCustomers,
  getDeletedCustomerPhones,
  isPhoneInDeletedList,
  clearDeletedCustomerPhones,
  getStoredExpenses,
  saveStoredExpenses,
  getStoredCampaignTrigger,
  saveStoredCampaignTrigger,
  resetAllAppData
} from '../utils/storageManager';
import { formatOrderWhatsAppMessage, openWhatsAppShare } from '../utils/whatsappHelper';
import { generateOrderPDF } from '../utils/pdfGenerator';

interface ShopkeeperDashboardProps {
  orders: Order[];
  inventory: InventoryItem[];
  onUpdateOrderStatus: (
    orderId: string,
    status: Order['status'],
    paymentMethod?: 'UPI' | 'Cash' | 'Card',
    rejectionReason?: string,
    cancellationReason?: string,
    cancelledBy?: 'customer' | 'shopkeeper',
    paymentReminderSent?: boolean,
    paymentReminderMessage?: string,
    waitingMessage?: string,
    waitingTimeMinutes?: number
  ) => void;
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
  const safeInventory = Array.isArray(inventory) ? inventory : [];
  const [storeConfig, setStoreConfig] = useState<StoreConfig>(getStoredStoreConfig());
  const [activeTab, setActiveTab] = useState<
    'manual_sale' | 'orders' | 'inventory' | 'sales_income' | 'expenses' | 'customers' | 'offers_promo' | 'app_settings' | 'whatsapp_scheduler'
  >('manual_sale');

  const [billSubTab, setBillSubTab] = useState<'checkout' | 'pending' | 'approved' | 'history'>('checkout');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [posSearch, setPosSearch] = useState('');
  const [posCategory, setPosCategory] = useState('All');
  const [posCardStates, setPosCardStates] = useState<Record<string, { qty: number; unit: string }>>({});

  // Multiple Billing Tabs State
  interface BillingTab {
    id: string;
    name: string;
    customerName: string;
    customerPhone: string;
    paymentMethod: 'UPI' | 'Cash' | 'Card' | 'Online';
    cart: { item: InventoryItem; qtyOrWeight: number; unit: string }[];
  }

  const [billingBills, setBillingBills] = useState<BillingTab[]>([
    {
      id: 'bill-1',
      name: 'Bill #1 (Walk-in)',
      customerName: 'Walk-in Customer',
      customerPhone: '9999999999',
      paymentMethod: 'UPI',
      cart: []
    }
  ]);
  const [customerToDelete, setCustomerToDelete] = useState<{ idOrPhone: string; name: string } | null>(null);
  const [isClearAllCustomersModalOpen, setIsClearAllCustomersModalOpen] = useState(false);
  const [selectedCustomerForOffer, setSelectedCustomerForOffer] = useState<CustomerRecord | null>(null);
  const [selectedOfferForSending, setSelectedOfferForSending] = useState<string>('');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const [activeBillId, setActiveBillId] = useState<string>('bill-1');
  const activeBill = billingBills.find((b) => b.id === activeBillId) || billingBills[0];
  const posCart = activeBill.cart;
  const posCustomerName = activeBill.customerName;
  const posCustomerPhone = activeBill.customerPhone;
  const posPaymentMethod = activeBill.paymentMethod;

  const setPosCart = (updater: React.SetStateAction<{ item: InventoryItem; qtyOrWeight: number; unit: string }[]>) => {
    setBillingBills((prev) =>
      prev.map((b) => {
        if (b.id === activeBillId) {
          const newCart = typeof updater === 'function' ? updater(b.cart) : updater;
          return { ...b, cart: newCart };
        }
        return b;
      })
    );
  };

  const setPosCustomerName = (name: string) => {
    setBillingBills((prev) => prev.map((b) => (b.id === activeBillId ? { ...b, customerName: name } : b)));
  };

  const setPosCustomerPhone = (phone: string) => {
    setBillingBills((prev) => prev.map((b) => (b.id === activeBillId ? { ...b, customerPhone: phone } : b)));
  };

  const setPosPaymentMethod = (method: 'UPI' | 'Cash' | 'Card' | 'Online') => {
    setBillingBills((prev) => prev.map((b) => (b.id === activeBillId ? { ...b, paymentMethod: method } : b)));
  };

  const handleNewBillTab = () => {
    const newId = `bill-${Date.now()}`;
    const newTabNum = billingBills.length + 1;
    const newBill: BillingTab = {
      id: newId,
      name: `Bill #${newTabNum}`,
      customerName: `Customer #${newTabNum}`,
      customerPhone: '9999999999',
      paymentMethod: 'UPI',
      cart: []
    };
    setBillingBills((prev) => [...prev, newBill]);
    setActiveBillId(newId);
    toast.success(`Created new billing session: ${newBill.name}`);
  };

  const handleCloseBillTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (billingBills.length <= 1) {
      toast('You must keep at least one active billing session.');
      return;
    }
    const filtered = billingBills.filter((b) => b.id !== id);
    setBillingBills(filtered);
    if (activeBillId === id) {
      setActiveBillId(filtered[0].id);
    }
    toast('Billing session closed.');
  };
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editedItems, setEditedItems] = useState<OrderItem[]>([]);
  const [shopkeeperNote, setShopkeeperNote] = useState('');
  const [editedDeliveryAddress, setEditedDeliveryAddress] = useState('');
  const [addItemSelectId, setAddItemSelectId] = useState('');
  const [rejectingOrderId, setRejectingOrderId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isSimulateCustomerModalOpen, setIsSimulateCustomerModalOpen] = useState(false);
  const [cancelingOrderModal, setCancelingOrderModal] = useState<Order | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState('');
  const [acceptingOrderModal, setAcceptingOrderModal] = useState<Order | null>(null);
  const [customWaitingTime, setCustomWaitingTime] = useState<number>(10);
  const [customWaitingMessage, setCustomWaitingMessage] = useState<string>('We are currently packing and preparing your items.');


  // Automated WhatsApp CRM & Scheduler State & Campaign Trigger Config
  const [schedulerCampaignType, setSchedulerCampaignType] = useState<'vip_reward' | 'win_back' | 'first_time' | 'all'>('vip_reward');
  const [schedulerFrequency, setSchedulerFrequency] = useState<'instant' | 'daily_10am' | 'weekly_sunday'>('daily_10am');
  const [isSchedulerActive, setIsSchedulerActive] = useState<boolean>(true);
  const [campaignConfig, setCampaignConfig] = useState<CampaignTriggerConfig>(getStoredCampaignTrigger());
  const [isEditingCampaignConfig, setIsEditingCampaignConfig] = useState<boolean>(false);

  const [schedulerLogs, setSchedulerLogs] = useState<{ id: string; customerName: string; phone: string; coupon: string; timestamp: string; status: string }[]>([
    { id: 'LOG-01', customerName: 'Ramesh Kumar', phone: '9876543210', coupon: 'VIP20', timestamp: '2026-07-27 10:00 AM', status: 'Sent via WhatsApp' },
    { id: 'LOG-02', customerName: 'Priya Sharma', phone: '9811223344', coupon: 'WELCOME50', timestamp: '2026-07-26 10:00 AM', status: 'Sent via WhatsApp' }
  ]);

  // Expenses State
  const [expensesList, setExpensesList] = useState<ExpenseItem[]>(getStoredExpenses());
  const [newExpTitle, setNewExpTitle] = useState('');
  const [newExpCategory, setNewExpCategory] = useState<ExpenseItem['category']>('Wholesale Purchase');
  const [newExpAmount, setNewExpAmount] = useState('');
  const [newExpDate, setNewExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [newExpMethod, setNewExpMethod] = useState<ExpenseItem['paymentMethod']>('UPI');
  const [newExpNotes, setNewExpNotes] = useState('');

  // Offers State
  const [offers, setOffers] = useState<ProductOffer[]>(getStoredOffers());
  const [newOfferTitle, setNewOfferTitle] = useState('');
  const [newOfferDiscountPct, setNewOfferDiscountPct] = useState('');
  const [newOfferDiscountAmt, setNewOfferDiscountAmt] = useState('');
  const [newOfferCode, setNewOfferCode] = useState('');
  const [newOfferItemId, setNewOfferItemId] = useState('ALL');

  // Customers State
  const [customersList, setCustomersList] = useState<CustomerRecord[]>(getStoredCustomers());

  useEffect(() => {
    const handleStateChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (!customEvent.detail || customEvent.detail.type === 'customers') {
        setCustomersList(getStoredCustomers());
      }
    };
    const handleStorage = (e: StorageEvent) => {
      if (!e.key || e.key.includes('customer') || e.key.includes('order')) {
        setCustomersList(getStoredCustomers());
      }
    };
    const handleFocus = () => {
      setCustomersList(getStoredCustomers());
    };

    window.addEventListener('app-state-change', handleStateChange);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleFocus);
    setCustomersList(getStoredCustomers());

    return () => {
      window.removeEventListener('app-state-change', handleStateChange);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'customers') {
      setCustomersList(getStoredCustomers());
    }
  }, [activeTab]);


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

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpTitle.trim() || !newExpAmount) {
      toast.error('Please enter expense title and amount');
      return;
    }
    const item: ExpenseItem = {
      id: `exp-${Date.now()}`,
      title: newExpTitle.trim(),
      category: newExpCategory,
      amount: parseFloat(newExpAmount) || 0,
      date: newExpDate,
      paymentMethod: newExpMethod,
      notes: newExpNotes.trim()
    };
    const updated = [item, ...expensesList];
    setExpensesList(updated);
    saveStoredExpenses(updated);
    setNewExpTitle('');
    setNewExpAmount('');
    setNewExpNotes('');
    toast.success('Expense recorded successfully!');
  };

  const handleDeleteExpense = (id: string) => {
    const updated = expensesList.filter(e => e.id !== id);
    setExpensesList(updated);
    saveStoredExpenses(updated);
    toast.success('Expense deleted');
  };

  const handleSaveCampaignConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoredCampaignTrigger(campaignConfig);
    setIsEditingCampaignConfig(false);
    toast.success('Automated campaign trigger rules updated successfully!');
  };

  const handleToggleOffer = (id: string) => {
    const updated = offers.map(o => o.id === id ? { ...o, isActive: !o.isActive } : o);
    setOffers(updated);
    saveStoredOffers(updated);
    toast.success('Offer status updated');
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

  const handleExportSalesReportCSV = () => {
    const completed = orders.filter((o) => o.status === 'paid' || o.status === 'approved' || o.status === 'payment_pending_confirmation');
    if (completed.length === 0) {
      toast('No completed sales records available to export.');
      return;
    }
    const csvData = completed.map((o) => ({
      'Order ID': o.id,
      'Customer Name': o.customerName,
      'Customer Phone': o.customerPhone,
      'Items Count': o.items.length,
      'Payment Method': o.paymentMethod || 'UPI',
      'Total Amount (INR)': o.grandTotal,
      'Date': new Date(o.createdAt).toLocaleString()
    }));
    exportToCSV(`sales_report_${new Date().toISOString().slice(0, 10)}.csv`, csvData);
    toast.success('Downloaded sales report CSV successfully!');
  };

  // Compute analytics metrics
  const pendingOrders = orders.filter((o) => o.status === 'sent_to_shopkeeper' || o.status === 'reviewed');
  const approvedOrders = orders.filter((o) => o.status === 'approved' || o.status === 'paid' || o.status === 'payment_pending_confirmation');
  const todayTotalSales = approvedOrders.reduce((sum, o) => sum + o.grandTotal, 0);
  const totalStockItems = safeInventory.length;
  const outOfStockItems = safeInventory.filter((i) => !i.inStock || i.stockQuantity <= 0).length;

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
    const deletedPhones = getDeletedCustomerPhones();
    const map = new Map<string, { name: string; phone: string; orderCount: number; totalSpent: number; lastOrderDate: string; itemsBought: string[] }>();

    orders.forEach(ord => {
      const phone = ord.customerPhone || 'Unknown';
      if (
        ord.customerName === 'Deleted Customer' ||
        ord.customerName === 'Walk-in Customer' ||
        phone === '0000000000' ||
        phone === '9999999999' ||
        isPhoneInDeletedList(phone, deletedPhones) ||
        isPhoneInDeletedList(ord.customerName, deletedPhones)
      ) {
        return; // Exclude deleted or anonymous profiles
      }

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
  }, [orders, customersList]);

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
    const inventoryItem = safeInventory.find(i => i.id === inventoryItemId);
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
    const reason = cancelReasonInput.trim() || 'Cancelled by shopkeeper';
    onUpdateOrderStatus(
      cancelingOrderModal.id,
      'cancelled',
      undefined,
      undefined,
      reason,
      'shopkeeper'
    );
    playChimeSound('order_cancelled');
    toast.error(`❌ Order #${cancelingOrderModal.id.slice(-6)} has been cancelled. Customer notified.`, {
      position: 'top-center'
    });
    setCancelingOrderModal(null);
    setCancelReasonInput('Cancelled by shopkeeper');
  };

  const handleSendWhatsAppToCustomer = (order: Order) => {
    const msg = formatOrderWhatsAppMessage(order);
    openWhatsAppShare(msg, order.customerPhone);
    toast(`Opened WhatsApp with pre-filled bill for ${order.customerName}!`);
  };

  const handleDeleteCustomer = (customerIdOrPhone: string, customerName: string) => {
    setCustomerToDelete({ idOrPhone: customerIdOrPhone, name: customerName });
  };

  const handleClearAllCustomers = () => {
    setIsClearAllCustomersModalOpen(true);
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
    onUpdateOrderStatus(orderId, 'rejected', undefined, rejectionReason || 'Scale weight discrepancy or item out of stock.');
    setRejectingOrderId(null);
    setRejectionReason('');
    toast(`Declined order #${orderId}. Updated customer screen.`);
  };

  const handleFastReject = (order: Order) => {
    onUpdateOrderStatus(order.id, 'rejected', undefined, 'Fast rejected by shopkeeper');
    toast(`⚡ Fast Rejected order #${order.id.slice(-6)} instantly.`);
  };

  const handleMarkAsPaid = (order: Order, paymentMethod: 'UPI' | 'Cash' | 'Card' = 'Cash') => {
    onUpdateOrderStatus(order.id, 'paid', paymentMethod);
    playChimeSound('order_approved');
    toast.success(`💳 Marked order #${order.id.slice(-6)} as Paid via ${paymentMethod}!`);
  };

  const handleAcceptOrder = (order: Order, waitingMessage?: string, waitingTime?: number) => {
    const nextStatus = (waitingMessage || waitingTime) ? 'reviewed' : 'approved';
    onUpdateOrderStatus(
      order.id, 
      nextStatus, 
      undefined, 
      undefined, 
      undefined, 
      undefined, 
      undefined, 
      undefined, 
      waitingMessage, 
      waitingTime
    );
    playChimeSound('order_approved');
    toast.success(`✅ Live Order #${order.id.slice(-6)} Accepted! ${waitingMessage ? 'Waiting message sent.' : 'Customer notified.'}`, {
      position: 'top-center'
    });
    setAcceptingOrderModal(null);
  };

  const handleSendReminder = (order: Order, customMessage?: string) => {
    const defaultMsg = `Please complete your payment of ₹${order.grandTotal.toFixed(2)} to finalize your order. You can pay via UPI QR, Cash or Card.`;
    const finalMsg = customMessage || defaultMsg;
    onUpdateOrderStatus(order.id, 'approved', undefined, undefined, undefined, undefined, true, finalMsg);
    toast.success(`🔔 Sent payment reminder to ${order.customerName}!`);
  };

  return (
    <div className="space-y-4 pb-32 relative">
      {/* POS Quick Controls without top banner */}
      {activeTab === 'manual_sale' && (
        <div className="space-y-6 animate-fadeIn pb-24 w-full">
          {/* Multiple Billing Tabs Bar */}
          <div className="bg-slate-900 text-white p-3.5 rounded-2xl flex items-center justify-between gap-3 overflow-x-auto shadow-md border border-slate-800">
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              {billingBills.map((bill) => {
                const billTotal = bill.cart.reduce((sum, c) => {
                  const p = c.item.unitType === 'kg'
                    ? (c.item.pricePerUnit * c.qtyOrWeight) / 1000
                    : c.item.pricePerUnit * c.qtyOrWeight;
                  return sum + p;
                }, 0);
                const isActive = bill.id === activeBillId;
                return (
                  <div
                    key={bill.id}
                    onClick={() => setActiveBillId(bill.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shrink-0 border ${
                      isActive
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md ring-2 ring-emerald-500/30'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="flex items-center gap-1.5">
                        <span>{bill.name}</span>
                        {bill.cart.length > 0 && (
                          <span className="w-4 h-4 bg-amber-400 text-slate-950 text-[10px] rounded-full flex items-center justify-center font-black">
                            {bill.cart.length}
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] opacity-80 font-normal">
                        {bill.customerName} • {formatCurrency(billTotal)}
                      </span>
                    </div>
                    {billingBills.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => handleCloseBillTab(bill.id, e)}
                        className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-rose-600/50 transition-colors ml-1"
                        title="Close bill"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleNewBillTab}
              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Bill</span>
            </button>
          </div>

          {/* Full Page POS 2-Column Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
            {/* Left Column: Produce Catalog & Item Picker */}
            <div className="lg:col-span-7 xl:col-span-8 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 flex-wrap">
                <div>
                  <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-emerald-600" />
                    <span>Produce Catalog & Produce Search</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Select items, enter quantity/weight, and add to current active bill</p>
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
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
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

              {/* Item Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[620px] overflow-y-auto pr-1">
                {safeInventory
                  .filter((i) => i.inStock)
                  .filter((i) => posCategory === 'All' || i.category === posCategory)
                  .filter((i) => !posSearch.trim() || i.name.toLowerCase().includes(posSearch.toLowerCase().trim()))
                  .map((item) => {
                    const cardState = posCardStates[item.id] || { qty: item.unitType === 'kg' ? 1 : 1, unit: item.unitType };
                    const updateCardState = (updates: Partial<{ qty: number; unit: string }>) => {
                      setPosCardStates(prev => ({
                        ...prev,
                        [item.id]: { ...cardState, ...updates }
                      }));
                    };

                    return (
                      <div
                        key={item.id}
                        className="p-3 bg-white hover:bg-emerald-50/20 rounded-2xl border border-slate-200 hover:border-emerald-300 transition-all flex flex-col justify-between gap-2 shadow-2xs group"
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80';
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <h4 className="font-extrabold text-xs text-slate-950 truncate">{item.name}</h4>
                            <div className="flex items-center justify-between mt-0.5">
                              <p className="text-[11px] text-emerald-700 font-bold">
                                {formatCurrency(item.pricePerUnit)} / {item.unitType}
                              </p>
                              <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                                Stock: {item.stockQuantity} {item.unitType}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Quantity / Weight and Add Button */}
                        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                          <div className="flex items-center gap-1 flex-1">
                            <input
                              type="number"
                              step="0.05"
                              min="0.01"
                              value={cardState.qty}
                              onChange={(e) => updateCardState({ qty: parseFloat(e.target.value) || 1 })}
                              className="w-14 px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 text-center outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500"
                              title="Quantity / Weight"
                            />
                            <select
                              value={cardState.unit}
                              onChange={(e) => updateCardState({ unit: e.target.value })}
                              className="px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500"
                            >
                              {['kg', 'g', 'piece', 'bunch', 'pack', 'dozen', 'liter', item.unitType].filter((v, i, a) => a.indexOf(v) === i).map((u) => (
                                <option key={u} value={u}>{u}</option>
                              ))}
                            </select>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              let finalQtyOrWeight = cardState.qty;
                              if (cardState.unit === 'kg') {
                                finalQtyOrWeight = cardState.qty * 1000;
                              } else {
                                finalQtyOrWeight = cardState.qty;
                              }

                              setPosCart((prev) => {
                                const existing = prev.find((c) => c.item.id === item.id);
                                if (existing) {
                                  return prev.map((c) =>
                                    c.item.id === item.id
                                      ? { ...c, qtyOrWeight: c.qtyOrWeight + finalQtyOrWeight }
                                      : c
                                  );
                                }
                                return [...prev, { item, qtyOrWeight: finalQtyOrWeight }];
                              });
                              toast.success(`Added ${cardState.qty} ${cardState.unit} ${item.name} to bill`);
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-2xs transition-colors flex items-center gap-1 shrink-0 cursor-pointer active:scale-95"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Right Column: Active Counter Bill & Instant Checkout Panel */}
            <div className="lg:col-span-5 xl:col-span-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-md space-y-5 sticky top-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-black text-base text-slate-900">
                    {billingBills.find(b => b.id === activeBillId)?.name || 'Counter Bill'}
                  </h3>
                </div>
                <span className="text-xs font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                  {posCart.length} Items Selected
                </span>
              </div>

              {/* Customer Info Box */}
              <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-emerald-600" />
                    <span>Customer Details</span>
                  </span>
                  {customersList.length > 0 && (
                    <select
                      onChange={(e) => {
                        const sel = customersList.find(c => c.phone === e.target.value || c.id === e.target.value);
                        if (sel) {
                          setPosCustomerName(sel.name);
                          setPosCustomerPhone(sel.phone);
                        }
                      }}
                      className="text-[11px] font-bold bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-700 outline-none max-w-[140px] truncate"
                    >
                      <option value="">Quick Select CRM...</option>
                      {customersList.map(c => (
                        <option key={c.id} value={c.phone}>{c.name} ({c.phone})</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Name</label>
                    <input
                      type="text"
                      value={posCustomerName}
                      onChange={(e) => setPosCustomerName(e.target.value)}
                      placeholder="Walk-in Customer"
                      className="w-full px-3 py-2 bg-white text-xs border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Mobile No.</label>
                    <input
                      type="text"
                      value={posCustomerPhone}
                      onChange={(e) => setPosCustomerPhone(e.target.value)}
                      placeholder="9999999999"
                      className="w-full px-3 py-2 bg-white text-xs border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Cart Items List */}
              <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                {posCart.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-2">
                    <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-600">Bill cart is empty.</p>
                    <p className="text-[11px] text-slate-400">Click "+ Add" on produce items to add them here.</p>
                  </div>
                ) : (
                  posCart.map((c) => {
                    const isKg = c.item.unitType === 'kg';
                    const price = isKg
                      ? (c.item.pricePerUnit * c.qtyOrWeight) / 1000
                      : c.item.pricePerUnit * c.qtyOrWeight;
                    return (
                      <div key={c.item.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={c.item.image}
                              alt={c.item.name}
                              className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                            <div className="min-w-0">
                              <p className="font-extrabold text-xs text-slate-900 truncate">{c.item.name}</p>
                              <p className="text-[11px] font-black text-emerald-700">{formatCurrency(price)}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPosCart((prev) => prev.filter((item) => item.item.id !== c.item.id))}
                            className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Quantity / Weight Controls */}
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200">
                          <div className="flex items-center gap-1.5">
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
                              className="w-20 px-2 py-1 bg-white text-xs border border-slate-300 rounded-lg font-bold text-center text-slate-900 outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                            <span className="text-[11px] font-bold text-slate-600">
                              {isKg ? 'g' : c.item.unitType}
                            </span>
                          </div>

                          {isKg && (
                            <div className="flex items-center gap-1">
                              {[
                                { label: '250g', val: 250 },
                                { label: '500g', val: 500 },
                                { label: '1kg', val: 1000 }
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
                                  className={`px-1.5 py-0.5 text-[10px] font-black rounded border transition-all ${
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

              {/* Payment Mode & Total Box */}
              {posCart.length > 0 && (
                <div className="space-y-4 pt-3 border-t border-slate-200">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold text-slate-700 block">Payment Mode</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Cash', 'UPI', 'Card'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setPosPaymentMethod(mode)}
                          className={`py-2 text-xs font-black rounded-xl border transition-all cursor-pointer ${
                            posPaymentMethod === mode
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-base font-black text-slate-900 bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200">
                    <span>Grand Total:</span>
                    <span className="text-emerald-700 font-mono text-lg font-black">
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

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPosCart([])}
                      className="px-3 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all border border-slate-200 shrink-0 cursor-pointer"
                      title="Clear bill cart"
                    >
                      Clear
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCompletePosSale()}
                      className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <Check className="w-4 h-4" />
                      <span>Complete Sale & Print Bill</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
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
                  {Array.from(new Set(orders.map(o => o.customerPhone as string)))
                    .filter((phone: string) => phone && phone !== '0000000000' && !getDeletedCustomerPhones().includes(phone.replace(/\D/g, '')))
                    .map((phone: string) => {
                      const ord = orders.find(o => o.customerPhone === phone && o.customerName !== 'Deleted Customer');
                      if (!ord) return null;
                      return (
                        <option key={phone} value={phone}>
                          {`${ord.customerName} (${phone})`}
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
                const isReviewed = order.status === 'reviewed';
                const isEditingThis = editingOrderId === order.id;

                return (
                  <div
                    key={order.id}
                    className={`bg-white rounded-3xl border transition-all shadow-sm overflow-hidden ${
                      isPending ? 'border-amber-400 ring-1 ring-amber-400/20' :
                      isReviewed ? 'border-sky-400 ring-1 ring-sky-400/20' :
                      'border-slate-200'
                    }`}
                  >
                    {/* Order Top Bar */}
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs ${
                          isPending ? 'bg-amber-500 text-slate-950' :
                          isReviewed ? 'bg-sky-500 text-white' :
                          'bg-emerald-600 text-white'
                        }`}>
                          {order.id.slice(-4)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-sm text-slate-900">{order.customerName}</h4>
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                              order.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                              order.status === 'payment_pending_confirmation' ? 'bg-amber-100 text-amber-800 border border-amber-400 animate-pulse font-black' :
                              order.status === 'approved' ? 'bg-teal-100 text-teal-800' :
                              order.status === 'reviewed' ? 'bg-sky-100 text-sky-800 border border-sky-300 animate-pulse font-extrabold' :
                              order.status === 'cancelled' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                              order.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {order.status === 'sent_to_shopkeeper'
                                ? 'Pending Approval'
                                : order.status === 'reviewed'
                                ? 'Preparing Order'
                                : order.status === 'payment_pending_confirmation'
                                ? 'Verify Payment'
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
                        {isPending && (
                          <button
                            type="button"
                            onClick={() => {
                              setAcceptingOrderModal(order);
                              setCustomWaitingTime(10);
                              setCustomWaitingMessage('We are currently packing and preparing your items.');
                            }}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1 active:scale-95 cursor-pointer shrink-0"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                            <span>Accept</span>
                          </button>
                        )}
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
                                {safeInventory.map((inv) => (
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
                          {isPending && (
                            <button
                              type="button"
                              onClick={() => {
                                setAcceptingOrderModal(order);
                                setCustomWaitingTime(10);
                                setCustomWaitingMessage('We are currently packing and preparing your items.');
                              }}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4 text-white" />
                              <span>Accept Live Order</span>
                            </button>
                          )}

                          {order.status !== 'rejected' && (
                            <button
                              onClick={() => handleCancelOrder(order)}
                              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs rounded-xl border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer"
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

                          {order.status === 'paid' ? (
                            <div className="px-3 py-1.5 bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold text-xs rounded-xl flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                              <span>Paid via {order.paymentMethod || 'Cash'}</span>
                            </div>
                          ) : order.status === 'payment_pending_confirmation' ? (
                            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 bg-amber-50 p-2 rounded-xl border border-amber-300 w-full">
                              <div className="text-[11px] font-black text-amber-950 px-1 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                                <span>Paid via {order.paymentMethod || 'UPI'} - Needs verification</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleMarkAsPaid(order, order.paymentMethod || 'UPI')}
                                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                                  title="Click to confirm payment received"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                  <span>Confirm Payment</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onUpdateOrderStatus(order.id, 'approved')}
                                  className="px-2 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs rounded-xl border border-rose-200 transition-colors cursor-pointer"
                                  title="Reject payment and let customer retry"
                                >
                                  <span>Reject</span>
                                </button>
                              </div>
                            </div>
                          ) : order.status === 'approved' ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleSendReminder(order)}
                                className={`px-3 py-2 font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer active:scale-95 ${
                                  order.paymentReminderSent
                                    ? 'bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200 animate-pulse'
                                    : 'bg-rose-600 hover:bg-rose-700 text-white'
                                }`}
                                title="Send Payment Reminder notification to customer"
                              >
                                <BellRing className="w-3.5 h-3.5 text-current animate-bounce" />
                                <span>{order.paymentReminderSent ? 'Resend Reminder' : 'Send Reminder'}</span>
                              </button>
                              
                              <div className="h-6 w-[1px] bg-slate-300 mx-0.5 hidden md:block"></div>
                              
                              <button
                                type="button"
                                onClick={() => handleMarkAsPaid(order, 'Cash')}
                                className="px-2.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-extrabold text-[11px] rounded-xl border border-emerald-300 transition-colors cursor-pointer"
                                title="Mark Paid via Cash"
                              >
                                <span>Paid Cash</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMarkAsPaid(order, 'UPI')}
                                className="px-2 py-2 bg-teal-50 hover:bg-teal-100 text-teal-900 font-extrabold text-[11px] rounded-xl border border-teal-200 transition-colors cursor-pointer"
                                title="Mark Paid via UPI"
                              >
                                <span>UPI</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMarkAsPaid(order, 'Card')}
                                className="px-2 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-extrabold text-[11px] rounded-xl border border-indigo-200 transition-colors cursor-pointer"
                                title="Mark Paid via Card"
                              >
                                <span>Card</span>
                              </button>
                            </div>
                          ) : order.status !== 'cancelled' && order.status !== 'rejected' && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleMarkAsPaid(order, 'Cash')}
                                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                                title="Mark Paid via Cash"
                              >
                                <DollarSign className="w-3.5 h-3.5 text-white" />
                                <span>Paid (Cash)</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMarkAsPaid(order, 'UPI')}
                                className="px-2.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-900 font-extrabold text-xs rounded-xl border border-teal-300 transition-colors cursor-pointer"
                                title="Mark Paid via UPI"
                              >
                                <span>UPI</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMarkAsPaid(order, 'Card')}
                                className="px-2.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-extrabold text-xs rounded-xl border border-indigo-300 transition-colors cursor-pointer"
                                title="Mark Paid via Card"
                              >
                                <span>Card</span>
                              </button>
                            </div>
                          )}

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
        <div className="w-full space-y-6">
          {/* Multiple Billing Tabs Bar */}
          <div className="bg-slate-900 text-white p-3 rounded-2xl flex items-center justify-between gap-3 overflow-x-auto shadow-md border border-slate-800">
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              {billingBills.map((bill) => {
                const billTotal = bill.cart.reduce((sum, c) => {
                  const p = c.item.unitType === 'kg'
                    ? (c.item.pricePerUnit * c.qtyOrWeight) / 1000
                    : c.item.pricePerUnit * c.qtyOrWeight;
                  return sum + p;
                }, 0);
                const isActive = bill.id === activeBillId;
                return (
                  <div
                    key={bill.id}
                    onClick={() => setActiveBillId(bill.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shrink-0 border ${
                      isActive
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md ring-2 ring-emerald-500/30'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="flex items-center gap-1.5">
                        <span>{bill.name}</span>
                        {bill.cart.length > 0 && (
                          <span className="w-4 h-4 bg-amber-400 text-slate-950 text-[10px] rounded-full flex items-center justify-center font-black">
                            {bill.cart.length}
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] opacity-80 font-normal">
                        {bill.customerName} • {formatCurrency(billTotal)}
                      </span>
                    </div>
                    {billingBills.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => handleCloseBillTab(bill.id, e)}
                        className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-rose-600/50 transition-colors ml-1"
                        title="Close bill"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleNewBillTab}
              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Bill</span>
            </button>
          </div>

          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-md space-y-6">
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
        </div>
      )}
        </div>
      )}

      {/* Tab Content: Inventory CRUD */}
      {activeTab === 'inventory' && (
        <div className="animate-fadeIn space-y-4">
          <div className="flex justify-end px-4">
            <button
              type="button"
              onClick={() => {
                const csvData = safeInventory.map(item => ({
                  'ID': item.id,
                  'Name': item.name,
                  'Category': item.category,
                  'Price (₹)': item.pricePerUnit,
                  'Unit': item.unitType,
                  'Stock Qty': item.stockQuantity || 0,
                  'In Stock': item.inStock ? 'Yes' : 'No'
                }));
                exportToCSV('inventory_export.csv', csvData);
                toast.success('Inventory exported to CSV successfully.');
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Export Inventory CSV</span>
            </button>
          </div>
          <InventoryManager
            inventory={safeInventory}
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
                onClick={() => setActiveTab('sales_income')}
                className="bg-slate-800/80 hover:bg-slate-700 p-4 rounded-2xl border border-slate-700 text-left transition-all group flex flex-col justify-between cursor-pointer"
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
                onClick={() => setActiveTab('expenses')}
                className="bg-slate-800/80 hover:bg-slate-700 p-4 rounded-2xl border border-slate-700 text-left transition-all group flex flex-col justify-between cursor-pointer"
              >
                <div className="w-10 h-10 bg-rose-500/20 text-rose-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform mb-3">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs sm:text-sm text-white">Expense Tracker</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Log farm & store costs</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('customers')}
                className="bg-slate-800/80 hover:bg-slate-700 p-4 rounded-2xl border border-slate-700 text-left transition-all group flex flex-col justify-between cursor-pointer"
              >
                <div className="w-10 h-10 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform mb-3">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs sm:text-sm text-white">Customer Data</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Directory & CRM</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('offers_promo')}
                className="bg-slate-800/80 hover:bg-slate-700 p-4 rounded-2xl border border-slate-700 text-left transition-all group flex flex-col justify-between cursor-pointer"
              >
                <div className="w-10 h-10 bg-purple-500/20 text-purple-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform mb-3">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs sm:text-sm text-white">Offers & Promo</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Coupons & discounts</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsQRModalOpen(true)}
                className="bg-slate-800/80 hover:bg-slate-700 p-4 rounded-2xl border border-slate-700 text-left transition-all group flex flex-col justify-between cursor-pointer"
              >
                <div className="w-10 h-10 bg-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform mb-3">
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
                className="bg-slate-800/80 hover:bg-slate-700 p-4 rounded-2xl border border-slate-700 text-left transition-all group flex flex-col justify-between cursor-pointer"
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

              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">Home Page Promotional Banner Text & Image</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Banner Title</label>
                    <input
                      type="text"
                      value={storeConfig.bannerTitle || ''}
                      onChange={(e) => setStoreConfig({ ...storeConfig, bannerTitle: e.target.value })}
                      placeholder="e.g. Fresh & Healthy"
                      className="w-full px-4 py-2.5 bg-slate-50 text-xs border border-slate-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Banner Subtitle</label>
                    <input
                      type="text"
                      value={storeConfig.bannerSubtitle || ''}
                      onChange={(e) => setStoreConfig({ ...storeConfig, bannerSubtitle: e.target.value })}
                      placeholder="e.g. Get 20% Off on all vegetables"
                      className="w-full px-4 py-2.5 bg-slate-50 text-xs border border-slate-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Promotional Banner Image (Upload / URL / Presets)</label>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {[
                      { label: 'Fresh Greens', url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80' },
                      { label: 'Harvest Basket', url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80' },
                      { label: 'Organic Harvest', url: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=800&q=80' }
                    ].map(preset => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setStoreConfig({ ...storeConfig, bannerImageUrl: preset.url })}
                        className={`p-1.5 rounded-xl border text-left transition-all ${storeConfig.bannerImageUrl === preset.url ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}
                      >
                        <img src={preset.url} alt={preset.label} className="w-full h-16 object-cover rounded-lg mb-1" />
                        <span className="text-[10px] font-bold text-slate-800 block truncate">{preset.label}</span>
                      </button>
                    ))}
                  </div>
                  <input
                    type="url"
                    value={storeConfig.bannerImageUrl || ''}
                    onChange={(e) => setStoreConfig({ ...storeConfig, bannerImageUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/... or custom image URL"
                    className="w-full px-4 py-2.5 bg-slate-50 text-xs border border-slate-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      saveStoredStoreConfig(storeConfig);
                      toast.success("Home page banner settings saved successfully!");
                    }}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    Save Banner Settings
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">Offer Page Banner & Background Image</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Offer Page Banner Title</label>
                    <input
                      type="text"
                      value={storeConfig.offerPageBannerTitle || ''}
                      onChange={(e) => setStoreConfig({ ...storeConfig, offerPageBannerTitle: e.target.value })}
                      placeholder="e.g. Special Harvest Deals"
                      className="w-full px-4 py-2.5 bg-slate-50 text-xs border border-slate-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Offer Page Banner Subtitle</label>
                    <input
                      type="text"
                      value={storeConfig.offerPageBannerSubtitle || ''}
                      onChange={(e) => setStoreConfig({ ...storeConfig, offerPageBannerSubtitle: e.target.value })}
                      placeholder="e.g. Explore exclusive discounts and seasonal offers"
                      className="w-full px-4 py-2.5 bg-slate-50 text-xs border border-slate-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Offer Page Banner / Background Image (Upload / URL / Presets)</label>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {[
                      { label: 'Harvest Basket', url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80' },
                      { label: 'Super Saver', url: 'https://images.unsplash.com/photo-1534723486361-ec853f0907f3?auto=format&fit=crop&w=800&q=80' },
                      { label: 'Special Produce', url: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=800&q=80' }
                    ].map(preset => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setStoreConfig({ ...storeConfig, offerPageBgUrl: preset.url })}
                        className={`p-1.5 rounded-xl border text-left transition-all ${storeConfig.offerPageBgUrl === preset.url ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}
                      >
                        <img src={preset.url} alt={preset.label} className="w-full h-16 object-cover rounded-lg mb-1" />
                        <span className="text-[10px] font-bold text-slate-800 block truncate">{preset.label}</span>
                      </button>
                    ))}
                  </div>
                  <input
                    type="url"
                    value={storeConfig.offerPageBgUrl || ''}
                    onChange={(e) => setStoreConfig({ ...storeConfig, offerPageBgUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/... or custom image URL"
                    className="w-full px-4 py-2.5 bg-slate-50 text-xs border border-slate-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      saveStoredStoreConfig(storeConfig);
                      toast.success("Offer page banner saved successfully!");
                    }}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    Save Offer Page Banner
                  </button>
                </div>
              </div>

              {/* Reset App Data Card */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h4 className="font-extrabold text-xs text-rose-700 uppercase tracking-wider">Reset Application Data</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Clear all stored orders, inventory, customer records, expenses, and restore default sample data.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsResetModalOpen(true)}
                    className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs rounded-xl border border-rose-200 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>Reset App Data</span>
                  </button>
                </div>
              </div>
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
                  <option value="vip_reward">🌟 VIP Regular Customers (3+ Orders) → {campaignConfig.vipCouponCode} ({campaignConfig.vipDiscount})</option>
                  <option value="win_back">💤 Dormant / Inactive Customers (7+ Days) → {campaignConfig.dormantCouponCode} ({campaignConfig.dormantDiscount})</option>
                  <option value="first_time">🌱 First-Time Buyer Nudge (1 Order) → {campaignConfig.welcomeCouponCode} ({campaignConfig.welcomeDiscount})</option>
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

          {/* Edit Automated Campaign Trigger Rules Card */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-50 text-amber-700 rounded-2xl">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-base text-slate-900">Automated Campaign Trigger Configuration</h4>
                  <p className="text-xs text-slate-500">Customize thresholds for VIP status and dormant customer detection</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingCampaignConfig(!isEditingCampaignConfig)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-4 h-4 text-emerald-600" />
                <span>{isEditingCampaignConfig ? 'Cancel Edit' : 'Edit Trigger Rules'}</span>
              </button>
            </div>

            {isEditingCampaignConfig ? (
              <form onSubmit={handleSaveCampaignConfig} className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700">VIP Minimum Orders Threshold</label>
                    <input
                      type="number"
                      value={campaignConfig.vipMinOrders}
                      onChange={(e) => setCampaignConfig({ ...campaignConfig, vipMinOrders: parseInt(e.target.value) || 3 })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700">Dormant Inactivity Days Threshold</label>
                    <input
                      type="number"
                      value={campaignConfig.dormantDays}
                      onChange={(e) => setCampaignConfig({ ...campaignConfig, dormantDays: parseInt(e.target.value) || 7 })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700">VIP Coupon Code & Discount</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={campaignConfig.vipCouponCode}
                        onChange={(e) => setCampaignConfig({ ...campaignConfig, vipCouponCode: e.target.value.toUpperCase() })}
                        className="w-1/2 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 uppercase"
                      />
                      <input
                        type="text"
                        value={campaignConfig.vipDiscount}
                        onChange={(e) => setCampaignConfig({ ...campaignConfig, vipDiscount: e.target.value })}
                        className="w-1/2 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700">Dormant Win-Back Coupon & Discount</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={campaignConfig.dormantCouponCode}
                        onChange={(e) => setCampaignConfig({ ...campaignConfig, dormantCouponCode: e.target.value.toUpperCase() })}
                        className="w-1/2 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 uppercase"
                      />
                      <input
                        type="text"
                        value={campaignConfig.dormantDiscount}
                        onChange={(e) => setCampaignConfig({ ...campaignConfig, dormantDiscount: e.target.value })}
                        className="w-1/2 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    Save Trigger Rules
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-slate-400 font-bold block">VIP Threshold</span>
                  <strong className="text-slate-900 font-black text-sm">{campaignConfig.vipMinOrders}+ Orders</strong>
                  <span className="block text-emerald-700 font-bold mt-1">Code: {campaignConfig.vipCouponCode} ({campaignConfig.vipDiscount})</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-slate-400 font-bold block">Dormant Inactivity</span>
                  <strong className="text-slate-900 font-black text-sm">{campaignConfig.dormantDays}+ Days Inactive</strong>
                  <span className="block text-emerald-700 font-bold mt-1">Code: {campaignConfig.dormantCouponCode} ({campaignConfig.dormantDiscount})</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-slate-400 font-bold block">Welcome Nudge</span>
                  <strong className="text-slate-900 font-black text-sm">1st Time Buyer</strong>
                  <span className="block text-emerald-700 font-bold mt-1">Code: {campaignConfig.welcomeCouponCode} ({campaignConfig.welcomeDiscount})</span>
                </div>
              </div>
            )}
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

                  <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">Assigned Coupon:</span>
                      <span className="font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">{cust.suggestedCoupon}</span>
                      <span className="text-[11px] text-emerald-700 font-extrabold ml-1.5">({cust.couponDiscount})</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomer(cust.phone, cust.name)}
                        className="px-2.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs rounded-xl border border-rose-200 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                        title="Delete customer record & data"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Delete</span>
                      </button>
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

      {/* Tab Content: Sales & Income */}
      {activeTab === 'sales_income' && (
        <div className="space-y-6 animate-fadeIn pb-24">
          <div className="bg-gradient-to-r from-emerald-900 to-teal-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-black text-xl">Sales & Income Ledger</h3>
              <p className="text-xs text-emerald-200 mt-1">Track total store revenue, payment channels (UPI, Cash, Card), and order histories.</p>
            </div>
            <div className="bg-emerald-800/80 px-5 py-3 rounded-2xl border border-emerald-600 text-right">
              <span className="text-[11px] text-emerald-200 uppercase font-black block">Total Store Revenue</span>
              <span className="font-mono text-2xl font-black text-white">
                {formatCurrency(orders.filter(o => o.status === 'paid' || o.status === 'approved').reduce((acc, o) => acc + o.grandTotal, 0))}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-extrabold text-slate-400 uppercase">Paid / Completed Orders</span>
              <p className="font-mono text-2xl font-black text-slate-900">
                {orders.filter(o => o.status === 'paid' || o.status === 'approved').length}
              </p>
              <span className="text-[11px] text-emerald-600 font-bold">Successful transactions</span>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-extrabold text-slate-400 uppercase">Average Order Value</span>
              <p className="font-mono text-2xl font-black text-slate-900">
                {formatCurrency(
                  orders.filter(o => o.status === 'paid' || o.status === 'approved').length > 0
                    ? orders.filter(o => o.status === 'paid' || o.status === 'approved').reduce((acc, o) => acc + o.grandTotal, 0) /
                      orders.filter(o => o.status === 'paid' || o.status === 'approved').length
                    : 0
                )}
              </p>
              <span className="text-[11px] text-teal-600 font-bold">Per checkout ticket</span>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-extrabold text-slate-400 uppercase">Cash vs Digital (UPI/Card)</span>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-xl">
                  Cash: {orders.filter(o => o.paymentMethod === 'Cash').length}
                </span>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl">
                  UPI/Card: {orders.filter(o => o.paymentMethod !== 'Cash').length}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h4 className="font-black text-base text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <span>Completed Sales Records</span>
              </h4>
              <button
                type="button"
                onClick={handleExportSalesReportCSV}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Export Report</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[10px]">
                  <tr>
                    <th className="p-3 rounded-l-xl">Order ID</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Items</th>
                    <th className="p-3">Payment</th>
                    <th className="p-3">Total Amount</th>
                    <th className="p-3 rounded-r-xl">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.filter(o => o.status === 'paid' || o.status === 'approved').map(order => (
                    <tr key={order.id} className="hover:bg-slate-50/80">
                      <td className="p-3 font-mono font-bold text-slate-900">#{order.id}</td>
                      <td className="p-3 font-bold text-slate-800">
                        {order.customerName}
                        <span className="block text-[10px] text-slate-400 font-normal">{order.customerPhone}</span>
                      </td>
                      <td className="p-3 text-slate-600">{order.items.length} items</td>
                      <td className="p-3">
                        <span className="font-bold px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700">
                          {order.paymentMethod || 'Cash'}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-black text-emerald-700">{formatCurrency(order.grandTotal)}</td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => onViewOrderReceipt(order)}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                        >
                          View Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                  {orders.filter(o => o.status === 'paid' || o.status === 'approved').length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">No completed sales records found yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Expense Tracker */}
      {activeTab === 'expenses' && (
        <div className="space-y-6 animate-fadeIn pb-24">
          <div className="bg-gradient-to-r from-rose-950 via-red-900 to-orange-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-black text-xl">Store Expense Tracker</h3>
              <p className="text-xs text-rose-200 mt-1">Record wholesale produce purchases, utility bills, store rent, and operational costs.</p>
            </div>
            <div className="bg-rose-900/80 px-5 py-3 rounded-2xl border border-rose-700 text-right">
              <span className="text-[11px] text-rose-200 uppercase font-black block">Total Expenses</span>
              <span className="font-mono text-2xl font-black text-white">
                {formatCurrency(expensesList.reduce((acc, e) => acc + e.amount, 0))}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 lg:col-span-1">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Tag className="w-5 h-5 text-rose-600" />
                <h4 className="font-black text-sm text-slate-900">Record New Expense</h4>
              </div>

              <form onSubmit={handleAddExpense} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700">Expense Title / Vendor</label>
                  <input
                    type="text"
                    value={newExpTitle}
                    onChange={(e) => setNewExpTitle(e.target.value)}
                    placeholder="e.g. Wholesale Onion Purchase"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700">Category</label>
                  <select
                    value={newExpCategory}
                    onChange={(e) => setNewExpCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none"
                  >
                    <option value="Wholesale Purchase">🥦 Wholesale Purchase</option>
                    <option value="Rent & Utilities">💡 Rent & Utilities</option>
                    <option value="Delivery & Logistics">🚚 Delivery & Logistics</option>
                    <option value="Packaging">📦 Packaging</option>
                    <option value="Wages & Staff">👥 Wages & Staff</option>
                    <option value="Other">🏷️ Other</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700">Amount (₹)</label>
                    <input
                      type="number"
                      step="1"
                      value={newExpAmount}
                      onChange={(e) => setNewExpAmount(e.target.value)}
                      placeholder="e.g. 2500"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700">Date</label>
                    <input
                      type="date"
                      value={newExpDate}
                      onChange={(e) => setNewExpDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700">Payment Method</label>
                  <select
                    value={newExpMethod}
                    onChange={(e) => setNewExpMethod(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Credit">Credit</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700">Notes / Bill Number</label>
                  <input
                    type="text"
                    value={newExpNotes}
                    onChange={(e) => setNewExpNotes(e.target.value)}
                    placeholder="Optional remarks"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Add Expense Entry
                </button>
              </form>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 lg:col-span-2">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <h4 className="font-black text-base text-slate-900">Expense History Ledger</h4>
                <span className="text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1 rounded-xl">
                  {expensesList.length} Recorded Items
                </span>
              </div>

              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[10px] sticky top-0">
                    <tr>
                      <th className="p-3 rounded-l-xl">Expense Title</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Payment</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3 rounded-r-xl">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expensesList.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-extrabold text-slate-900">
                          {exp.title}
                          {exp.notes && <span className="block text-[10px] text-slate-400 font-normal">{exp.notes}</span>}
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg">
                            {exp.category}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-600 text-[11px]">{exp.date}</td>
                        <td className="p-3 font-semibold text-slate-700">{exp.paymentMethod}</td>
                        <td className="p-3 font-mono font-black text-rose-600">{formatCurrency(exp.amount)}</td>
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-colors cursor-pointer"
                            title="Delete Expense"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {expensesList.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-400">No expenses recorded yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Customers */}
      {activeTab === 'customers' && (
        <div className="space-y-6 animate-fadeIn pb-24">
          <div className="bg-gradient-to-r from-teal-950 via-emerald-900 to-green-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-black text-xl">Customer CRM Directory</h3>
              <p className="text-xs text-emerald-200 mt-1">Manage customer profiles, purchase history, tiers, and instant WhatsApp communication.</p>
            </div>
            <div className="bg-emerald-900/80 px-5 py-3 rounded-2xl border border-emerald-700 text-right">
              <span className="text-[11px] text-emerald-200 uppercase font-black block">Total Customers</span>
              <span className="font-mono text-2xl font-black text-white">{customersList.length}</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <h4 className="font-black text-base text-slate-900">Registered Customer Profiles</h4>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name or phone..."
                    className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none w-60"
                  />
                </div>
                {customersList.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const csvData = customersList.map(c => ({
                          'Customer ID': c.id,
                          'Name': c.name,
                          'Phone': c.phone,
                          'Total Orders': c.totalOrders || 0,
                          'Total Spent (₹)': c.totalSpent || 0,
                          'Last Active': c.lastActive,
                          'Registered On': c.createdAt
                        }));
                        exportToCSV('customers_crm_export.csv', csvData);
                        toast.success('CRM Data exported to CSV successfully.');
                      }}
                      className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Export customer CRM to CSV"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export CSV</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllCustomers}
                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Clear all customer profiles"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear All</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {customersList.length === 0 ? (
              <div className="py-12 px-4 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 space-y-3">
                <Users className="w-10 h-10 text-slate-300 mx-auto" />
                <h5 className="font-extrabold text-sm text-slate-700">No Customer Records Found</h5>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  All customer profiles have been deleted or none exist yet. New customer profiles will automatically register as orders are placed.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    clearDeletedCustomerPhones();
                    const restored = getStoredCustomers();
                    setCustomersList(restored);
                    toast.success('Restored default sample customer profiles.');
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Restore Sample Customer Profiles</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customersList
                  .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone.includes(searchQuery))
                  .map((cust) => {
                    const ordersCount = cust.totalOrders || orders.filter(o => o.customerPhone === cust.phone).length;
                    const spentTotal = cust.totalSpent || orders.filter(o => o.customerPhone === cust.phone).reduce((a, o) => a + o.grandTotal, 0);
                    const tier = ordersCount >= 3 ? 'VIP Regular' : ordersCount === 1 ? 'New Customer' : 'Active Buyer';

                    return (
                      <div key={cust.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:border-emerald-300 transition-all space-y-3 flex flex-col justify-between">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h5 className="font-black text-sm text-slate-900">{cust.name}</h5>
                            <p className="text-xs font-mono text-slate-500 mt-0.5">+91 {cust.phone}</p>
                          </div>
                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                            tier === 'VIP Regular' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          }`}>
                            {tier}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 bg-white p-2.5 rounded-xl border border-slate-200 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">Total Orders</span>
                            <span className="font-black text-slate-900">{ordersCount} orders</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">Lifetime Spent</span>
                            <span className="font-black text-emerald-700 font-mono">{formatCurrency(spentTotal)}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-slate-400 font-medium">Last active: {new Date(cust.lastActive).toLocaleDateString()}</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomer(cust.id || cust.phone, cust.name)}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-[11px] rounded-xl transition-all cursor-pointer border border-rose-200 flex items-center gap-1 active:scale-95"
                              title="Delete customer record & saved data"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              <span>Delete Data</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCustomerForOffer(cust);
                                const activeOffersList = offers.filter(o => o.isActive);
                                setSelectedOfferForSending(activeOffersList[0]?.id || '');
                              }}
                              className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[11px] rounded-xl transition-all cursor-pointer border border-indigo-200 flex items-center gap-1 active:scale-95"
                              title="Send store offer / coupon via WhatsApp"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Send Offer</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const msg = `Hello ${cust.name}, thanks for shopping at ${storeConfig.name}! Enjoy 15% off your next purchase with code COMEBACK15.`;
                                openWhatsAppShare(msg, cust.phone);
                                toast.success(`Opened WhatsApp chat with ${cust.name}`);
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content: Offers & Promotions */}
      {activeTab === 'offers_promo' && (
        <div className="space-y-6 animate-fadeIn pb-24">
          <div className="bg-gradient-to-r from-indigo-950 via-purple-900 to-blue-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-black text-xl">Offers & Promotions Manager</h3>
              <p className="text-xs text-indigo-200 mt-1">Create and manage coupon codes, seasonal discounts, and promotional banners for customers.</p>
            </div>
            <div className="bg-indigo-900/80 px-5 py-3 rounded-2xl border border-indigo-700 text-right">
              <span className="text-[11px] text-indigo-200 uppercase font-black block">Active Offers</span>
              <span className="font-mono text-2xl font-black text-white">{offers.filter(o => o.isActive).length}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 lg:col-span-1">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Tag className="w-5 h-5 text-indigo-600" />
                <h4 className="font-black text-sm text-slate-900">Create New Offer / Coupon</h4>
              </div>

              <form onSubmit={handleAddOffer} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700">Offer Title</label>
                  <input
                    type="text"
                    value={newOfferTitle}
                    onChange={(e) => setNewOfferTitle(e.target.value)}
                    placeholder="e.g. Weekend Monsoon Special 20% Off"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700">Promo Code</label>
                  <input
                    type="text"
                    value={newOfferCode}
                    onChange={(e) => setNewOfferCode(e.target.value)}
                    placeholder="e.g. MONSOON20"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 uppercase outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700">Discount %</label>
                    <input
                      type="number"
                      value={newOfferDiscountPct}
                      onChange={(e) => setNewOfferDiscountPct(e.target.value)}
                      placeholder="e.g. 20"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700">Discount Amount (₹)</label>
                    <input
                      type="number"
                      value={newOfferDiscountAmt}
                      onChange={(e) => setNewOfferDiscountAmt(e.target.value)}
                      placeholder="e.g. 50"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700">Applicable Product Item</label>
                  <select
                    value={newOfferItemId}
                    onChange={(e) => setNewOfferItemId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none"
                  >
                    <option value="ALL">🎁 All Store Inventory (General Coupon)</option>
                    {safeInventory.map(item => (
                      <option key={item.id} value={item.id}>Specific: {item.name}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Publish Offer & Coupon
                </button>
              </form>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 lg:col-span-2">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <h4 className="font-black text-base text-slate-900">Active Offers & Promotions</h4>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-xl">
                  {offers.length} Total Offers
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {offers.map((offer) => (
                  <div key={offer.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:border-indigo-300 transition-all space-y-3 flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h5 className="font-black text-sm text-slate-900">{offer.title}</h5>
                        {offer.promoCode && (
                          <span className="inline-block font-mono font-black text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded mt-1">
                            CODE: {offer.promoCode}
                          </span>
                        )}
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${offer.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                        {offer.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600">
                      {offer.discountPercentage ? <p className="font-bold text-indigo-700">{offer.discountPercentage}% Discount</p> : null}
                      {offer.discountAmount ? <p className="font-bold text-indigo-700">{formatCurrency(offer.discountAmount)} Flat Off</p> : null}
                      <p className="text-[10px] text-slate-400 mt-1">Valid until: {offer.endDate}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => handleToggleOffer(offer.id)}
                        className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-lg border border-slate-200 transition-colors cursor-pointer"
                      >
                        {offer.isActive ? 'Pause' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteOffer(offer.id)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-colors cursor-pointer"
                        title="Delete Offer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
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
          inventory={safeInventory}
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

      {/* Floating Proceed to Checkout Banner Above Bottom Navigation */}
      {posCart.length > 0 && (
        <div className="fixed bottom-16 left-3 right-3 sm:left-6 sm:right-6 z-40 bg-slate-900 text-white p-3.5 rounded-2xl shadow-2xl flex items-center justify-between border border-slate-700 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-xs">
              {posCart.length}
            </div>
            <div>
              <p className="font-black text-xs">{activeBill.name || 'Active Bill'} Items Ready</p>
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
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <span>Proceed to Checkout</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* More Tools Popover Menu */}
      {isMoreMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs animate-fadeIn"
            onClick={() => setIsMoreMenuOpen(false)}
          />
          <div className="fixed bottom-16 right-3 sm:right-6 z-50 bg-white border border-slate-200/90 rounded-3xl p-2.5 shadow-2xl w-64 space-y-1 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1 flex items-center justify-between">
              <span>More Portal Tools</span>
              <button
                type="button"
                onClick={() => setIsMoreMenuOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded-lg cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setActiveTab('customers');
                setIsMoreMenuOpen(false);
              }}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-3 cursor-pointer ${
                activeTab === 'customers'
                  ? 'bg-emerald-600 text-white shadow-xs font-extrabold'
                  : 'text-slate-700 hover:bg-slate-100 font-semibold'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>Customers Data</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('sales_income');
                setIsMoreMenuOpen(false);
              }}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-3 cursor-pointer ${
                activeTab === 'sales_income'
                  ? 'bg-emerald-600 text-white shadow-xs font-extrabold'
                  : 'text-slate-700 hover:bg-slate-100 font-semibold'
              }`}
            >
              <TrendingUp className="w-4 h-4 shrink-0" />
              <span>Sales & Income</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('offers_promo');
                setIsMoreMenuOpen(false);
              }}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-3 cursor-pointer ${
                activeTab === 'offers_promo'
                  ? 'bg-emerald-600 text-white shadow-xs font-extrabold'
                  : 'text-slate-700 hover:bg-slate-100 font-semibold'
              }`}
            >
              <Tag className="w-4 h-4 shrink-0" />
              <span>Offers & Promo</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('store_settings');
                setIsMoreMenuOpen(false);
              }}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-3 cursor-pointer ${
                activeTab === 'store_settings'
                  ? 'bg-emerald-600 text-white shadow-xs font-extrabold'
                  : 'text-slate-700 hover:bg-slate-100 font-semibold'
              }`}
            >
              <Store className="w-4 h-4 shrink-0" />
              <span>Store Settings</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('whatsapp_scheduler');
                setIsMoreMenuOpen(false);
              }}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-3 cursor-pointer ${
                activeTab === 'whatsapp_scheduler'
                  ? 'bg-emerald-600 text-white shadow-xs font-extrabold'
                  : 'text-slate-700 hover:bg-slate-100 font-semibold'
              }`}
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span>Auto WhatsApp</span>
            </button>
          </div>
        </>
      )}

      {/* Fixed Bottom Navigation Bar (5 tabs: Counter POS, Bill, Stock, Expenses, More) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-1.5 flex items-center justify-around shadow-xl max-w-lg mx-auto sm:rounded-t-2xl">
        <button
          type="button"
          onClick={() => {
            setActiveTab('manual_sale');
            setIsMoreMenuOpen(false);
          }}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 transition-colors shrink-0 cursor-pointer ${
            activeTab === 'manual_sale'
              ? 'text-emerald-700 font-black'
              : 'text-slate-600 hover:text-emerald-700 font-semibold'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span className="text-[10px]">Counter POS</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('orders');
            setIsMoreMenuOpen(false);
          }}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 transition-colors shrink-0 relative cursor-pointer ${
            activeTab === 'orders'
              ? 'text-emerald-700 font-black'
              : 'text-slate-600 hover:text-emerald-700 font-semibold'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span className="text-[10px]">Bill</span>
          {pendingOrders.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-emerald-600 text-white font-black text-[9px] px-1 rounded-full flex items-center justify-center">
              {pendingOrders.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('inventory');
            setIsMoreMenuOpen(false);
          }}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 transition-colors shrink-0 cursor-pointer ${
            activeTab === 'inventory'
              ? 'text-emerald-700 font-black'
              : 'text-slate-600 hover:text-emerald-700 font-semibold'
          }`}
        >
          <Package className="w-4 h-4" />
          <span className="text-[10px]">Stock</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('expenses');
            setIsMoreMenuOpen(false);
          }}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 transition-colors shrink-0 cursor-pointer ${
            activeTab === 'expenses'
              ? 'text-emerald-700 font-black'
              : 'text-slate-600 hover:text-emerald-700 font-semibold'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span className="text-[10px]">Expenses</span>
        </button>

        <button
          type="button"
          onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 transition-colors shrink-0 cursor-pointer relative ${
            isMoreMenuOpen || ['customers', 'sales_income', 'offers_promo', 'store_settings', 'whatsapp_scheduler'].includes(activeTab)
              ? 'text-emerald-700 font-black'
              : 'text-slate-600 hover:text-emerald-700 font-semibold'
          }`}
        >
          <MoreHorizontal className="w-4 h-4" />
          <span className="text-[10px]">More</span>
        </button>
      </div>

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

      {/* Accept Order & Send Waiting Message Modal */}
      {acceptingOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-base text-slate-900">Accept Order #{acceptingOrderModal.id.slice(-6)}</h3>
              </div>
              <button
                type="button"
                onClick={() => setAcceptingOrderModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <p>Customer: <strong className="text-slate-900">{acceptingOrderModal.customerName}</strong> ({acceptingOrderModal.customerPhone})</p>
              <p>Total Bill: <strong className="text-emerald-700 font-mono">{formatCurrency(acceptingOrderModal.grandTotal)}</strong> ({acceptingOrderModal.items.length} items)</p>
            </div>

            {/* Waiting Time Presets */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-slate-800 block">Estimated Preparation Time:</label>
              <div className="grid grid-cols-5 gap-1.5">
                {[5, 10, 15, 20, 30].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setCustomWaitingTime(mins)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      customWaitingTime === mins
                        ? 'bg-sky-500 border-sky-600 text-white shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Message Templates */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-800 block">Quick Messages Templates:</label>
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                {[
                  'We are currently packing and preparing your items.',
                  'The store is slightly busy. We are packing your order with care. Thanks for waiting!',
                  'We are weighing your custom products right now. Ready in a few minutes!',
                  'Items are being assembled. Final weight confirmation sent shortly.'
                ].map((msg, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setCustomWaitingMessage(msg)}
                    className={`w-full text-left p-2 rounded-xl text-[11px] font-medium border transition-all cursor-pointer ${
                      customWaitingMessage === msg
                        ? 'bg-sky-50 border-sky-200 text-sky-900'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-100 text-slate-600'
                    }`}
                  >
                    "{msg}"
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Message Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-800 block">Custom Waiting Message:</label>
              <textarea
                value={customWaitingMessage}
                onChange={(e) => setCustomWaitingMessage(e.target.value)}
                placeholder="Type custom waiting details..."
                rows={2}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-sky-500 resize-none"
              />
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleAcceptOrder(acceptingOrderModal)}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Direct Accept</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => handleAcceptOrder(acceptingOrderModal, customWaitingMessage, customWaitingTime)}
                  className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Clock className="w-4 h-4 text-white" />
                  <span>Accept & Wait Msg</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setAcceptingOrderModal(null)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Delete Confirmation Modal */}
      {customerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-600">
                <Trash2 className="w-5 h-5" />
                <h3 className="font-black text-base text-slate-900">Delete Customer Data</h3>
              </div>
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete all stored customer data for <strong className="text-slate-900 font-bold">"{customerToDelete.name}"</strong>? This will remove their record from the CRM directory and marketing analytics.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const updated = deleteStoredCustomer(customerToDelete.idOrPhone);
                  setCustomersList(updated);
                  toast.success(`Customer "${customerToDelete.name}" data deleted successfully.`);
                  setCustomerToDelete(null);
                }}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Customers Confirmation Modal */}
      {isClearAllCustomersModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-600">
                <Trash2 className="w-5 h-5" />
                <h3 className="font-black text-base text-slate-900">Clear All Customer Records</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsClearAllCustomersModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-900 font-bold">ALL</strong> customer records and saved data? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsClearAllCustomersModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  clearAllStoredCustomers();
                  setCustomersList([]);
                  toast.success('All customer records and saved data cleared.');
                  setIsClearAllCustomersModalOpen(false);
                }}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirm Clear All</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Send Offer Modal */}
      {selectedCustomerForOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-indigo-600">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-black text-base text-slate-900">Send Offer to {selectedCustomerForOffer.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomerForOffer(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {offers.filter(o => o.isActive).length === 0 ? (
              <div className="py-6 text-center space-y-3">
                <p className="text-xs text-slate-600">No active offers or coupons found. Please create an active offer in the Offers & Promotions manager first.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomerForOffer(null);
                    setActiveTab('offers_promo');
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Tag className="w-4 h-4" />
                  <span>Go to Offers & Promotions</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1.5">Select Active Offer / Coupon</label>
                  <select
                    value={selectedOfferForSending}
                    onChange={(e) => setSelectedOfferForSending(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none"
                  >
                    {offers.filter(o => o.isActive).map(offer => (
                      <option key={offer.id} value={offer.id}>
                        {offer.title} {offer.promoCode ? `(${offer.promoCode})` : ''} - {offer.discountPercentage ? `${offer.discountPercentage}% OFF` : offer.discountAmount ? `${formatCurrency(offer.discountAmount)} OFF` : 'Special Promo'}
                      </option>
                    ))}
                  </select>
                </div>

                {(() => {
                  const chosenOffer = offers.find(o => o.id === selectedOfferForSending) || offers.filter(o => o.isActive)[0];
                  if (!chosenOffer) return null;

                  const discountText = chosenOffer.discountPercentage ? `${chosenOffer.discountPercentage}% OFF` : chosenOffer.discountAmount ? `${formatCurrency(chosenOffer.discountAmount)} OFF` : 'Special Discount';
                  const message = `🌿 *EXCLUSIVE OFFER FROM ${storeConfig.name.toUpperCase()}* 🌿\n━━━━━━━━━━━━━━━━━━━━━━\nHello *${selectedCustomerForOffer.name}*,\n\n🎁 *${chosenOffer.title}*\n\nWe are delighted to share this exclusive discount with you! Get *${discountText}* on your fresh grocery purchase.\n\n🎟️ *Promo Code:* *${chosenOffer.promoCode || 'SPECIAL'}*\n🗓️ *Valid Until:* ${chosenOffer.endDate}\n\nShop now at ${storeConfig.name} for farm-fresh delivery or store pickup!\n\n_Fresh, organic, and handpicked daily._`;

                  return (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-extrabold text-slate-700 block mb-1">WhatsApp Message Preview</label>
                        <textarea
                          readOnly
                          value={message}
                          rows={6}
                          className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-3 font-mono text-slate-700 outline-none resize-none"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setSelectedCustomerForOffer(null)}
                          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            openWhatsAppShare(message, selectedCustomerForOffer.phone);
                            toast.success(`Opened WhatsApp with offer "${chosenOffer.title}" for ${selectedCustomerForOffer.name}!`);
                            setSelectedCustomerForOffer(null);
                          }}
                          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>Send Offer via WhatsApp</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Reset App Data Confirmation Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-600">
                <Trash2 className="w-5 h-5" />
                <h3 className="font-black text-base text-slate-900">Reset All App Data</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to reset <strong className="text-slate-900 font-bold">ALL application data</strong>? This will clear all custom orders, inventory items, customer profiles, promotional offers, and expenses, returning the app to its fresh initial state. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  resetAllAppData();
                  toast.success('All application data has been reset successfully.');
                  setIsResetModalOpen(false);
                  window.location.reload();
                }}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirm Reset All Data</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
