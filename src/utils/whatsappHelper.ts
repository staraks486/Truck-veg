import { Order } from '../types';
import { formatWeightOrUnits } from './storageManager';

export function formatOrderWhatsAppMessage(order: {
  id?: string;
  customerName: string;
  customerPhone: string;
  storeName?: string;
  items: { name: string; quantityOrWeight: number; unitType: string; totalPrice: number }[];
  grandTotal: number;
  subtotal?: number;
  status?: string;
  fulfillmentType?: 'store_pickup' | 'home_delivery';
  deliveryAddress?: string;
  deliveryFee?: number;
  createdAt?: string;
}): string {
  const store = order.storeName || "Farmer's Gate - Fresh Produce";
  const isHomeDelivery = order.fulfillmentType === 'home_delivery';

  const dateStr = order.createdAt
    ? new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  const fulfillmentHeader = isHomeDelivery ? '🚚 *EXPRESS HOME DELIVERY ORDER*' : '🏪 *STORE PICKUP / COUNTER ORDER*';

  const itemsList = order.items
    .map(
      (item, idx) =>
        `*${idx + 1}. ${item.name}*\n   ▫️ Weight/Qty: ${formatWeightOrUnits(item.quantityOrWeight, item.unitType)}\n   ▫️ Amount: ₹${item.totalPrice.toFixed(2)}`
    )
    .join('\n\n');

  const computedSubtotal = order.subtotal || order.items.reduce((acc, curr) => acc + curr.totalPrice, 0);
  const discountLine = (order as any).discountAmount && (order as any).discountAmount > 0
    ? `• *Promo Discount (${(order as any).promoCode || 'PROMO'}):* -₹${((order as any).discountAmount).toFixed(2)}\n`
    : '';
  const deliveryFee = order.deliveryFee !== undefined
    ? order.deliveryFee
    : (isHomeDelivery ? (computedSubtotal >= 300 ? 0 : 30) : 0);

  let statusBadge = '🕒 *Status:* Order Received (Scale Verification Pending)';
  if (order.status === 'approved') {
    statusBadge = '✅ *Status:* Bill Verified & Approved by Store';
  } else if (order.status === 'paid') {
    statusBadge = '💳 *Status:* Payment Confirmed & Completed';
  } else if (order.status === 'rejected') {
    statusBadge = '❌ *Status:* Order Declined';
  }

  let deliveryAddressSection = '';
  if (isHomeDelivery) {
    deliveryAddressSection = `\n📍 *Delivery Address:*\n${order.deliveryAddress ? order.deliveryAddress.trim() : 'Address provided at checkout'}\n`;
  }

  return `🌿 *${store.toUpperCase()}* 🌿
━━━━━━━━━━━━━━━━━━━━━━
${fulfillmentHeader}
${order.id ? `📋 *Order ID:* #${order.id}\n` : ''}📅 *Date & Time:* ${dateStr}

👤 *CUSTOMER DETAILS*
• *Name:* ${order.customerName}
• *Mobile:* ${order.customerPhone}${deliveryAddressSection}
━━━━━━━━━━━━━━━━━━━━━━
🛍️ *ORDERED PRODUCE ITEMS*

${itemsList}

━━━━━━━━━━━━━━━━━━━━━━
💰 *BILLING SUMMARY*
• *Produce Subtotal:* ₹${computedSubtotal.toFixed(2)}
${discountLine}${isHomeDelivery ? `• *Delivery Fee:* ${deliveryFee === 0 ? 'FREE (Order > ₹300)' : `₹${deliveryFee.toFixed(2)}`}\n` : ''}• *Fresh Produce GST:* ₹0.00 (Tax Exempt)
👉 *GRAND TOTAL:* *₹${order.grandTotal.toFixed(2)}*

${statusBadge}

━━━━━━━━━━━━━━━━━━━━━━
Thank you for choosing *${store}*!
_Fresh, organic, and handpicked quality produce._`;
}

export function openWhatsAppShare(message: string, phone?: string) {
  const encodedText = encodeURIComponent(message);
  const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '';
  
  let formattedPhone = cleanPhone;
  if (cleanPhone.length === 10) {
    formattedPhone = `91${cleanPhone}`;
  }

  const url = formattedPhone
    ? `https://wa.me/${formattedPhone}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;

  window.open(url, '_blank');
}
