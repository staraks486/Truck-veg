import React, { useState, useEffect } from 'react';
import { Order } from '../types';
import { X, CheckCircle2, QrCode, Printer, Clock, AlertTriangle, ShieldCheck, Sparkles, Phone, Download, MessageSquare, FileText, XCircle } from 'lucide-react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { formatCurrency, formatWeightOrUnits } from '../utils/storageManager';
import { formatOrderWhatsAppMessage, openWhatsAppShare } from '../utils/whatsappHelper';
import { generateOrderPDF } from '../utils/pdfGenerator';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onUpdateOrderStatus: (
    orderId: string,
    newStatus: Order['status'],
    paymentMethod?: 'UPI' | 'Cash' | 'Card',
    rejectionReason?: string,
    cancellationReason?: string,
    cancelledBy?: 'customer' | 'shopkeeper'
  ) => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  order,
  onUpdateOrderStatus
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Cancellation Modal state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Changed my mind');
  const [customNote, setCustomNote] = useState('');

  useEffect(() => {
    if (order && order.grandTotal > 0) {
      const upiString = `upi://pay?pa=farmersgate@upi&pn=${encodeURIComponent(order.storeName)}&am=${order.grandTotal.toFixed(2)}&tr=${order.id}&cu=INR`;
      QRCode.toDataURL(upiString, { width: 220, margin: 1 })
        ? QRCode.toDataURL(upiString, { width: 220, margin: 1 }).then(setQrCodeDataUrl).catch(console.error)
        : null;
    }
  }, [order]);

  if (!isOpen || !order) return null;

  const handleSimulatePayment = (method: 'UPI' | 'Cash' | 'Card') => {
    setIsProcessingPayment(true);
    setTimeout(() => {
      onUpdateOrderStatus(order.id, 'paid', method);
      setIsProcessingPayment(false);
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {
        // confetti fallback
      }
    }, 1000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    if (!order) return;
    const msg = formatOrderWhatsAppMessage(order);
    openWhatsAppShare(msg, order.customerPhone);
  };

  const handleDownloadPDF = () => {
    if (!order) return;
    generateOrderPDF(order, 'download');
  };

  const handleViewPDF = () => {
    if (!order) return;
    generateOrderPDF(order, 'open');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 my-auto">
        {/* Top Header Status Bar */}
        <div className={`p-4 text-white flex justify-between items-center ${
          order.status === 'paid'
            ? 'bg-emerald-700'
            : order.status === 'approved'
            ? 'bg-teal-800'
            : order.status === 'rejected'
            ? 'bg-rose-800'
            : 'bg-amber-700'
        }`}>
          <div className="flex items-center gap-2">
            {order.status === 'paid' && <CheckCircle2 className="w-5 h-5 text-emerald-300" />}
            {order.status === 'approved' && <QrCode className="w-5 h-5 text-teal-300" />}
            {order.status === 'sent_to_shopkeeper' && <Clock className="w-5 h-5 text-amber-300 animate-spin" />}
            {order.status === 'rejected' && <AlertTriangle className="w-5 h-5 text-rose-300" />}

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm capitalize">
                  {order.status === 'paid'
                    ? 'Payment Completed & Verified'
                    : order.status === 'approved'
                    ? 'Order Accepted by Shopkeeper'
                    : order.status === 'rejected'
                    ? 'Order Declined'
                    : 'Waiting for Shopkeeper Verification'}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  order.status === 'approved'
                    ? 'bg-emerald-300 text-emerald-950'
                    : order.status === 'sent_to_shopkeeper'
                    ? 'bg-amber-300 text-amber-950'
                    : order.status === 'paid'
                    ? 'bg-emerald-300 text-emerald-950'
                    : 'bg-rose-300 text-rose-950'
                }`}>
                  {order.status === 'approved'
                    ? 'ACCEPTED'
                    : order.status === 'sent_to_shopkeeper'
                    ? 'WAITING'
                    : order.status === 'paid'
                    ? 'COMPLETED'
                    : 'DECLINED'}
                </span>
              </div>
              <p className="text-[11px] text-white/80 font-mono mt-0.5">
                Order ID: #{order.id}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Receipt Container */}
        <div id="printable-receipt" className="p-6 bg-white space-y-5 text-slate-800">
          {/* Store Info */}
          <div className="text-center pb-4 border-b border-dashed border-slate-300">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
              {order.storeName}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Self-Checkout Produce Terminal • Fast Weigh & Pay
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {new Date(order.createdAt).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short'
              })}
            </p>
          </div>

          {/* Customer & Fulfillment Details */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Customer Name</span>
                <span className="font-bold text-slate-900">{order.customerName}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Mobile Number</span>
                <span className="font-mono text-slate-800 font-semibold">{order.customerPhone}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Order Delivery Mode</span>
                <span className="font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                  {order.fulfillmentType === 'home_delivery' ? '🚚 Express Home Delivery' : '🏪 Store Pickup / Self-Checkout'}
                </span>
              </div>

              {order.fulfillmentType === 'home_delivery' && order.deliveryAddress && (
                <div className="mt-1 bg-white p-2 rounded-lg border border-slate-200 text-[11px] text-slate-700">
                  <span className="font-bold text-slate-900 block">📍 Delivery Address:</span>
                  <p className="font-medium text-slate-800 leading-snug">{order.deliveryAddress}</p>
                </div>
              )}
            </div>
          </div>

          {/* Rejection Alert if rejected */}
          {order.status === 'rejected' && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-rose-900">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Reason for rejection:
              </p>
              <p className="text-rose-700 pl-5">
                {order.rejectionReason || "Out of stock or scale weight discrepancy. Please re-check produce items."}
              </p>
            </div>
          )}

          {/* Itemized Table */}
          <div>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-300 text-slate-500 font-bold uppercase text-[10px]">
                  <th className="py-2">Produce Item</th>
                  <th className="py-2 text-center">Qty / Wt</th>
                  <th className="py-2 text-right">Rate</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items.map((item, idx) => (
                  <tr key={idx} className="text-slate-800">
                    <td className="py-2.5 font-bold text-slate-900">
                      {item.name}
                    </td>
                    <td className="py-2.5 text-center font-mono font-medium">
                      {formatWeightOrUnits(item.quantityOrWeight, item.unitType)}
                    </td>
                    <td className="py-2.5 text-right font-mono text-slate-500">
                      {formatCurrency(item.pricePerUnit)}
                    </td>
                    <td className="py-2.5 text-right font-extrabold font-mono text-slate-900">
                      {formatCurrency(item.totalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total Breakdown */}
          <div className="pt-3 border-t border-dashed border-slate-300 space-y-1 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Produce Subtotal</span>
              <span className="font-mono font-semibold">{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-medium">
              <span>Fresh Produce GST (0%)</span>
              <span>₹0.00</span>
            </div>
            {order.fulfillmentType === 'home_delivery' && (
              <div className="flex justify-between text-slate-700 font-semibold">
                <span>Express Home Delivery Fee</span>
                <span className="font-mono">
                  {order.deliveryFee && order.deliveryFee > 0 ? formatCurrency(order.deliveryFee) : 'FREE'}
                </span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-base font-black text-slate-900">
              <span>Grand Total</span>
              <span className="text-lg text-emerald-800 font-mono">
                {formatCurrency(order.grandTotal)}
              </span>
            </div>
          </div>

          {/* Payment Section according to Status */}
          {order.status === 'sent_to_shopkeeper' && (
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-center space-y-3 animate-pulse">
              <Clock className="w-8 h-8 text-amber-600 mx-auto" />
              <div className="inline-block px-3 py-1 bg-amber-200 text-amber-950 font-black text-xs rounded-full uppercase tracking-wider">
                Status: WAITING FOR SHOPKEEPER
              </div>
              <p className="text-xs text-amber-800 max-w-sm mx-auto font-medium leading-relaxed">
                <strong>Status Update Message:</strong> Your self-checkout cart order has been sent to the shopkeeper's scale. Please wait a moment while the shopkeeper accepts your produce items & scale weights.
              </p>

              <button
                type="button"
                onClick={() => setIsCancelModalOpen(true)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-xs inline-flex items-center gap-1.5 active:scale-95 mt-1"
              >
                <XCircle className="w-4 h-4" />
                <span>Cancel Self-Checkout Order</span>
              </button>
            </div>
          )}

          {order.status === 'approved' && (
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-3 animate-fadeIn">
              <div className="inline-block px-3 py-1 bg-emerald-200 text-emerald-950 font-black text-xs rounded-full uppercase tracking-wider">
                Status: ACCEPTED BY SHOPKEEPER
              </div>
              <p className="text-xs text-emerald-900 max-w-sm mx-auto font-semibold leading-relaxed bg-white/80 p-2.5 rounded-xl border border-emerald-200">
                ✅ <strong>Status Update Message:</strong> Order Accepted! The shopkeeper has verified your produce weights and finalized your bill. You can now complete payment below via UPI, Cash, or Card.
              </p>

              {qrCodeDataUrl ? (
                <div className="p-3 bg-white inline-block rounded-xl border border-teal-300 shadow-md">
                  <img src={qrCodeDataUrl} alt="UPI Payment QR" className="w-40 h-40 mx-auto" />
                  <p className="text-[10px] text-slate-500 font-mono mt-1">UPI ID: farmersgate@upi</p>
                </div>
              ) : (
                <div className="w-40 h-40 bg-slate-200 rounded-xl mx-auto flex items-center justify-center text-xs text-slate-500">
                  Generating Payment QR...
                </div>
              )}

              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={() => handleSimulatePayment('UPI')}
                  disabled={isProcessingPayment}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessingPayment ? (
                    <span>Verifying UPI Payment...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Simulate UPI Payment ({formatCurrency(order.grandTotal)})</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(true)}
                  className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Cancel Order Instead</span>
                </button>
              </div>
            </div>
          )}

          {order.status === 'paid' && (
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-300 text-center space-y-2 animate-scaleUp">
              <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="font-extrabold text-emerald-950 text-base">Payment Verified!</h4>
              <p className="text-xs text-emerald-800">
                Paid via {order.paymentMethod || 'UPI'} • Receipt ID #{order.id}
              </p>
              <div className="p-2 bg-white rounded-lg border border-emerald-200 text-[11px] text-emerald-700 font-medium inline-block">
                Thank you for shopping at {order.storeName}!
              </div>
            </div>
          )}

          {order.status === 'cancelled' && (
            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-300 text-center space-y-2.5 animate-fadeIn">
              <div className="w-10 h-10 bg-rose-600 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
                <XCircle className="w-6 h-6" />
              </div>
              <div className="inline-block px-3 py-1 bg-rose-200 text-rose-950 font-black text-xs rounded-full uppercase tracking-wider">
                Status: CANCELLED BY CUSTOMER
              </div>
              <div className="p-3 bg-white rounded-xl border border-rose-200 text-xs text-rose-950 space-y-1 text-left max-w-sm mx-auto shadow-2xs">
                <span className="font-extrabold block text-rose-900 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>Cancellation Message:</span>
                </span>
                <p className="text-slate-800 leading-relaxed font-semibold text-[11px]">
                  {order.cancellationReason || order.rejectionReason || 'Order was cancelled by customer.'}
                </p>
              </div>
            </div>
          )}

          {order.status === 'rejected' && (
            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-300 text-center space-y-2.5 animate-fadeIn">
              <div className="w-10 h-10 bg-rose-600 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="inline-block px-3 py-1 bg-rose-200 text-rose-950 font-black text-xs rounded-full uppercase tracking-wider">
                Status: DECLINED BY SHOPKEEPER
              </div>
              <div className="p-3 bg-white rounded-xl border border-rose-200 text-xs text-rose-950 space-y-1 text-left max-w-sm mx-auto shadow-2xs">
                <span className="font-extrabold block text-rose-900 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>Reason for Cancellation / Decline:</span>
                </span>
                <p className="text-slate-800 leading-relaxed font-semibold text-[11px]">
                  {order.rejectionReason || 'The shopkeeper declined this order. Please check with counter staff or update your items.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Share via WhatsApp */}
            <button
              onClick={handleShareWhatsApp}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
              title="Share Receipt on WhatsApp"
            >
              <MessageSquare className="w-4 h-4 fill-emerald-100 text-emerald-900" />
              <span>WhatsApp</span>
            </button>

            {/* Download PDF */}
            <button
              onClick={handleDownloadPDF}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
              title="Download PDF Receipt"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Download PDF</span>
            </button>

            {/* View PDF */}
            <button
              onClick={handleViewPDF}
              className="px-3 py-2 bg-white hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 transition-colors flex items-center gap-1.5"
              title="Open PDF in new tab"
            >
              <FileText className="w-4 h-4 text-slate-600" />
              <span>View PDF</span>
            </button>

            {/* Print */}
            <button
              onClick={handlePrint}
              className="px-3 py-2 bg-white hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden md:inline">Print</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors text-center"
          >
            Close
          </button>
        </div>

        {/* Cancellation Reason Modal Overlay */}
        {isCancelModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 text-left">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-rose-700 font-black text-base">
                  <XCircle className="w-5 h-5" />
                  <span>Cancel Order #{order.id}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-950 space-y-1">
                <p className="font-extrabold flex items-center justify-between">
                  <span>Self-Checkout Order #{order.id}</span>
                  <span className="font-mono text-rose-900">{formatCurrency(order.grandTotal)}</span>
                </p>
                <p className="text-[11px] text-rose-800 leading-relaxed font-medium">
                  Confirm cancellation? The shopkeeper will be notified immediately and item stock unreserved.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-800 block">
                  Cancellation Reason / Note for Shopkeeper:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Changed my mind",
                    "Selected wrong items or weight",
                    "Will pay directly at counter",
                    "Other reason"
                  ].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setCancelReason(r);
                        if (r !== "Other reason") setCustomNote('');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        cancelReason === r
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                <textarea
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="Enter custom cancellation note for shopkeeper (optional)..."
                  rows={2}
                  className="w-full text-xs font-medium p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all mt-2"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors"
                >
                  Keep Order
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const finalReason = cancelReason === 'Other reason'
                      ? (customNote.trim() || 'Cancelled by customer')
                      : customNote.trim()
                      ? `${cancelReason} - ${customNote.trim()}`
                      : cancelReason;

                    onUpdateOrderStatus(order.id, 'cancelled', undefined, undefined, finalReason, 'customer');
                    setIsCancelModalOpen(false);
                  }}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Confirm Cancellation</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
