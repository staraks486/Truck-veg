import React, { useState, useEffect } from 'react';
import { X, QrCode, Printer, Download, Store, Sparkles, CheckCircle2 } from 'lucide-react';
import QRCode from 'qrcode';
import { DEFAULT_STORE } from '../data/mockData';

interface StoreQRGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StoreQRGeneratorModal: React.FC<StoreQRGeneratorModalProps> = ({
  isOpen,
  onClose
}) => {
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    if (isOpen) {
      const storeUrl = window.location.href;
      QRCode.toDataURL(storeUrl, { width: 300, margin: 2, color: { dark: '#064e3b', light: '#ffffff' } })
        .then(setQrUrl)
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!qrUrl) return;
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = 'farmers-gate-store-qr.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-emerald-100">
        <div className="bg-emerald-900 text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-emerald-300" />
            <h3 className="font-extrabold text-sm">Store Counter Entry QR Code</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-emerald-800 text-emerald-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 text-center space-y-4">
          <div className="p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-300 shadow-inner inline-block">
            <h4 className="text-base font-extrabold text-emerald-950 uppercase">{DEFAULT_STORE.name}</h4>
            <p className="text-xs text-emerald-800 font-semibold">{DEFAULT_STORE.branch}</p>

            {qrUrl ? (
              <img src={qrUrl} alt="Store QR Code" className="w-48 h-48 mx-auto my-3 p-2 bg-white rounded-xl shadow-md border border-emerald-200" />
            ) : (
              <div className="w-48 h-48 bg-slate-100 animate-pulse rounded-xl mx-auto my-3" />
            )}

            <p className="text-[11px] text-emerald-900 font-bold bg-emerald-200/80 px-3 py-1 rounded-full inline-block">
              Scan to Start Weighing & Self-Checkout
            </p>
          </div>

          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Print and place this QR poster at your shop entrance counter or weighing scale table.
          </p>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleDownload}
              className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download QR</span>
            </button>
            <button
              onClick={handlePrint}
              className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
