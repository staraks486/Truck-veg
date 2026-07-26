import { Order } from '../types';
import { formatWeightOrUnits } from './storageManager';

export function formatOrderWhatsAppMessage(order: {
  id?: string;
  customerName: string;
  customerPhone: string;
  storeName?: string;
  items: { name: string; quantityOrWeight: number; unitType: string; totalPrice: number }[];
  grandTotal: number;
  status?: string;
}): string {
  const store = order.storeName || "Farmer's Gate - Fresh Produce";
  const itemsText = order.items
    .map(
      (item) =>
        `• *${item.name}*: ${formatWeightOrUnits(item.quantityOrWeight, item.unitType)} - ₹${item.totalPrice.toFixed(2)}`
    )
    .join('\n');

  let statusMsg = 'Sent to counter for scale weight verification';
  if (order.status === 'approved') {
    statusMsg = 'Approved by Shopkeeper! UPI Payment active';
  } else if (order.status === 'paid') {
    statusMsg = 'Payment Verified & Completed ✅';
  } else if (order.status === 'rejected') {
    statusMsg = 'Declined by Shopkeeper';
  }

  return `🛒 *PRODUCE ORDER - ${store.toUpperCase()}*
${order.id ? `*Order ID:* #${order.id}\n` : ''}*Customer:* ${order.customerName} (${order.customerPhone})

*Order Items:*
${itemsText}

*Grand Total:* ₹${order.grandTotal.toFixed(2)}
*Status:* ${statusMsg}

_Sent via Farmer's Gate Self-Checkout App_`;
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
