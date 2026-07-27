import { jsPDF } from 'jspdf';
import { Order } from '../types';
import { formatWeightOrUnits } from './storageManager';

export function generateOrderPDF(order: Order, action: 'download' | 'open' = 'download') {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 180] // Receipt thermal format 80mm wide or standard A6
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 10;

  // Header / Store Branding
  doc.setFillColor(6, 78, 59); // Emerald 900
  doc.rect(0, 0, pageWidth, 18, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text("FARMER'S GATE", pageWidth / 2, 7, { align: 'center' });
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('SELF-CHECKOUT PRODUCE RECEIPT', pageWidth / 2, 12, { align: 'center' });

  y = 23;
  doc.setTextColor(30, 41, 59); // Slate 800

  // Order Info
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`Receipt ID: #${order.id}`, 6, y);
  
  y += 4;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  const orderDate = new Date(order.createdAt).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
  doc.text(`Date: ${orderDate}`, 6, y);

  y += 4;
  doc.text(`Customer: ${order.customerName} (${order.customerPhone})`, 6, y);

  if (order.fulfillmentType === 'home_delivery') {
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.text(`Delivery: Home Delivery`, 6, y);
    if (order.deliveryAddress) {
      y += 3.5;
      doc.setFont('helvetica', 'normal');
      let addrText = order.deliveryAddress;
      if (addrText.length > 32) addrText = addrText.substring(0, 30) + '..';
      doc.text(`Address: ${addrText}`, 6, y);
    }
  } else {
    y += 4;
    doc.text(`Delivery: Store Self-Checkout / Pickup`, 6, y);
  }

  y += 4;
  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.setLineWidth(0.3);
  doc.line(6, y, pageWidth - 6, y);

  // Table Headers
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('Item', 6, y);
  doc.text('Qty/Wt', 42, y, { align: 'center' });
  doc.text('Amt (₹)', pageWidth - 6, y, { align: 'right' });

  y += 2;
  doc.line(6, y, pageWidth - 6, y);

  // Items
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  order.items.forEach((item) => {
    y += 5;
    if (y > 165) {
      doc.addPage();
      y = 10;
    }

    // Truncate long item names
    let itemName = item.name;
    if (itemName.length > 18) {
      itemName = itemName.substring(0, 16) + '..';
    }

    doc.text(itemName, 6, y);
    doc.text(formatWeightOrUnits(item.quantityOrWeight, item.unitType), 42, y, { align: 'center' });
    doc.text(`₹${item.totalPrice.toFixed(2)}`, pageWidth - 6, y, { align: 'right' });
  });

  y += 4;
  doc.line(6, y, pageWidth - 6, y);

  // Totals
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', 6, y);
  doc.text(`₹${order.subtotal.toFixed(2)}`, pageWidth - 6, y, { align: 'right' });

  y += 4;
  doc.text('Produce GST (0%):', 6, y);
  doc.text('₹0.00', pageWidth - 6, y, { align: 'right' });

  if (order.fulfillmentType === 'home_delivery') {
    y += 4;
    doc.text('Delivery Fee:', 6, y);
    doc.text(order.deliveryFee && order.deliveryFee > 0 ? `₹${order.deliveryFee.toFixed(2)}` : 'FREE', pageWidth - 6, y, { align: 'right' });
  }

  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Grand Total:', 6, y);
  doc.text(`₹${order.grandTotal.toFixed(2)}`, pageWidth - 6, y, { align: 'right' });

  // Status Badge
  y += 7;
  let statusText = 'STATUS: PENDING VERIFICATION';
  if (order.status === 'paid') {
    statusText = `PAID VIA ${order.paymentMethod || 'UPI'} ✅`;
  } else if (order.status === 'approved') {
    statusText = 'FINALIZED - APPROVED BY STORE';
  } else if (order.status === 'rejected') {
    statusText = 'DECLINED BY STORE';
  }

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(241, 245, 249);
  doc.rect(6, y, pageWidth - 12, 6, 'F');
  doc.setTextColor(15, 23, 42);
  doc.text(statusText, pageWidth / 2, y + 4, { align: 'center' });

  // Footer
  y += 11;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Thank you for shopping at Farmer's Gate!", pageWidth / 2, y, { align: 'center' });

  if (action === 'open') {
    const blobUrl = doc.output('bloburl');
    window.open(blobUrl, '_blank');
  } else {
    doc.save(`Receipt_FG_${order.id}.pdf`);
  }
}
