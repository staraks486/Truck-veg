import React, { useState, useEffect } from 'react';
import { X, QrCode, CheckCircle2, Store, Sparkles, Scale, ShoppingBag } from 'lucide-react';
import { DEFAULT_STORE } from '../data/mockData';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (store: typeof DEFAULT_STORE) => void;
}

const PRODUCE_WEIGHT_TAGS = [
  { tag: 'FG-TOMATO-1KG', name: 'Fresh Red Tomatoes (1.0 kg)', price: '₹40' },
  { tag: 'FG-POTATO-1.5KG', name: 'Organic Farm Potatoes (1.5 kg)', price: '₹45' },
  { tag: 'FG-SPINACH-2B', name: 'Tender Green Spinach (2 Bunches)', price: '₹50' },
  { tag: 'FG-CARROT-500G', name: 'Crunchy Orange Carrots (500 g)', price: '₹25' },
];

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess
}) => {
  const [scannedResult, setScannedResult] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setScannedResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSimulateScan = (tagLabel: string) => {
    setScannedResult(tagLabel);
    setTimeout(() => {
      onScanSuccess(DEFAULT_STORE);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-emerald-100 flex flex-col">
        {/* Header */}
        <div className="bg-emerald-900 text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-800 rounded-xl text-emerald-300">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Barcode & QR Tag Scanner</h3>
              <p className="text-xs text-emerald-200">Farmer's Gate - Main Counter #402</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-emerald-800 text-emerald-200 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport */}
        <div className="p-6 flex flex-col items-center bg-slate-50">
          {scannedResult ? (
            <div className="py-8 flex flex-col items-center text-center animate-scaleUp">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3 shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">Tag Scanned Successfully!</h4>
              <p className="text-sm font-semibold text-emerald-700 mt-1">{scannedResult}</p>
              <p className="text-xs text-slate-500 mt-0.5">{DEFAULT_STORE.name}</p>
              <div className="mt-4 px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-full border border-emerald-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Connected to Self-Checkout Terminal
              </div>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center">
              {/* Camera Scanner Viewport */}
              <div className="relative w-full h-56 bg-slate-950 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-inner flex flex-col items-center justify-center">
                {/* Corner Markers */}
                <div className="absolute top-3 left-3 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-sm"></div>
                <div className="absolute top-3 right-3 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-sm"></div>
                <div className="absolute bottom-3 left-3 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-sm"></div>
                <div className="absolute bottom-3 right-3 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-sm"></div>

                {/* Laser Scanning Line */}
                <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#34d399] animate-[ping_2s_infinite] top-1/2"></div>

                {/* Simulated QR Pattern inside viewport */}
                <div className="p-3 bg-white/10 rounded-xl backdrop-blur-xs border border-white/20 flex flex-col items-center gap-1.5">
                  <QrCode className="w-16 h-16 text-emerald-300 opacity-80 animate-pulse" />
                  <span className="text-[10px] text-emerald-200 font-mono tracking-widest">COUNTER_SCALE_ACTIVE</span>
                </div>

                <div className="absolute bottom-3 text-[10px] text-slate-300 font-medium px-2.5 py-0.5 bg-black/70 rounded-full flex items-center gap-1">
                  <Scale className="w-3 h-3 text-emerald-400" /> Align item weight sticker or counter QR
                </div>
              </div>

              {/* Quick Barcode Tag Simulator */}
              <div className="mt-5 w-full">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block">
                    Simulate Tag / Barcode Scan
                  </label>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    One-Tap Demo
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {PRODUCE_WEIGHT_TAGS.map((item) => (
                    <button
                      key={item.tag}
                      onClick={() => handleSimulateScan(item.name)}
                      className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/60 bg-white transition-all flex items-center justify-between group shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                          <ShoppingBag className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-950">{item.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">Code: {item.tag}</p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-emerald-700 group-hover:translate-x-1 transition-transform">
                        {item.price} &rarr;
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 text-center">
          <p className="text-xs text-slate-500">
            Click any tag above to simulate scanning produce weight barcodes at Farmer's Gate
          </p>
        </div>
      </div>
    </div>
  );
};
