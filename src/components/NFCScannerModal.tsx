import React, { useState, useEffect } from 'react';
import { X, Wifi, CheckCircle2, ShoppingBag, Sparkles, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import { InventoryItem } from '../types';
import { formatCurrency, formatWeightOrUnits } from '../utils/storageManager';

interface NFCScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  onScanSuccess: (item: InventoryItem, quantityOrWeight: number) => void;
}

export const NFCScannerModal: React.FC<NFCScannerModalProps> = ({
  isOpen,
  onClose,
  inventory,
  onScanSuccess
}) => {
  const [isNfcSupported, setIsNfcSupported] = useState<boolean>(false);
  const [isNfcScanning, setIsNfcScanning] = useState<boolean>(false);
  const [nfcError, setNfcError] = useState<string | null>(null);
  const [scannedItem, setScannedItem] = useState<InventoryItem | null>(null);
  const [weightUnit, setWeightUnit] = useState<'g' | 'kg'>('g');
  const [quantityInput, setQuantityInput] = useState<string>('500');
  const [nfcLogs, setNfcLogs] = useState<string[]>([]);
  const [realReadingActive, setRealReadingActive] = useState<boolean>(false);

  // Sound generator using Web Audio API so it works instantly without external assets
  const playNfcBeep = (type: 'success' | 'error' | 'start') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'success') {
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'error') {
        osc.frequency.setValueAtTime(220, ctx.currentTime); // A3 note
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.stop(ctx.currentTime + 0.3);
      } else {
        osc.frequency.setValueAtTime(440, ctx.currentTime); // A4 note
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.stop(ctx.currentTime + 0.08);
      }
    } catch (e) {
      console.warn('Audio feedback failed', e);
    }
  };

  // Check support on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'NDEFReader' in window) {
      setIsNfcSupported(true);
    }
  }, []);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setScannedItem(null);
      setNfcError(null);
      setNfcLogs(['NFC Scanner initialized.']);
      if ('NDEFReader' in window) {
        startRealNFCScan();
      }
    } else {
      stopRealNFCScan();
    }
  }, [isOpen]);

  let ndefController: AbortController | null = null;

  const startRealNFCScan = async () => {
    if (!('NDEFReader' in window)) return;
    
    try {
      setIsNfcScanning(true);
      setRealReadingActive(true);
      ndefController = new AbortController();
      const ndef = new (window as any).NDEFReader();
      
      setNfcLogs(prev => [...prev, 'Searching for physical NFC tags... Tap tag against back of phone.']);
      await ndef.scan({ signal: ndefController.signal });
      
      ndef.onreadingerror = () => {
        playNfcBeep('error');
        setNfcLogs(prev => [...prev, '⚠️ NFC Read Error. Please realign the tag.']);
      };
      
      ndef.onreading = (event: any) => {
        playNfcBeep('success');
        const serialNumber = event.serialNumber;
        setNfcLogs(prev => [...prev, `Found NFC Tag Serial: ${serialNumber}`]);
        
        // Parse NDEF records
        for (const record of event.message.records) {
          if (record.recordType === 'text') {
            const textDecoder = new TextDecoder(record.encoding);
            const textPayload = textDecoder.decode(record.data);
            setNfcLogs(prev => [...prev, `Decoded NDEF payload: "${textPayload}"`]);
            
            // Match with product in inventory (either by id or name)
            const matchedProduct = inventory.find(
              item => item.id.toLowerCase() === textPayload.trim().toLowerCase() ||
                      item.name.toLowerCase() === textPayload.trim().toLowerCase()
            );
            
            if (matchedProduct) {
              handleItemFound(matchedProduct);
              break;
            } else {
              setNfcLogs(prev => [...prev, `No matching store product found for payload: "${textPayload}"`]);
            }
          }
        }
      };
    } catch (err: any) {
      setIsNfcScanning(false);
      setRealReadingActive(false);
      const errMsg = err.message || err.toString();
      setNfcError(errMsg);
      setNfcLogs(prev => [...prev, `NFC Error: ${errMsg}`]);
    }
  };

  const stopRealNFCScan = () => {
    if (ndefController) {
      ndefController.abort();
      ndefController = null;
    }
    setRealReadingActive(false);
  };

  const handleItemFound = (item: InventoryItem) => {
    playNfcBeep('success');
    setScannedItem(item);
    // Pre-populate sensible defaults
    if (item.unitType === 'kg') {
      setWeightUnit('g');
      setQuantityInput('500');
    } else {
      setWeightUnit('kg'); // used as unit mode
      setQuantityInput('1');
    }
  };

  const handleSimulateTagTap = (item: InventoryItem) => {
    setNfcLogs(prev => [...prev, `Simulating hardware tap: RFID Tag connected to ${item.name}`]);
    handleItemFound(item);
  };

  const handleConfirmAdd = () => {
    if (!scannedItem) return;
    const isKg = scannedItem.unitType === 'kg';
    const parsedNum = parseFloat(quantityInput) || 0;
    
    let finalQty = parsedNum;
    if (isKg && weightUnit === 'kg') {
      finalQty = Math.round(parsedNum * 1000); // convert kg to grams
    } else if (isKg && weightUnit === 'g') {
      finalQty = Math.round(parsedNum);
    }
    
    if (finalQty <= 0) {
      playNfcBeep('error');
      setNfcError('Please specify a positive weight or quantity.');
      return;
    }

    onScanSuccess(scannedItem, finalQty);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-emerald-100 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-850 text-white p-4 flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500 rounded-2xl text-slate-950 animate-pulse">
              <Wifi className="w-5 h-5 rotate-90" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base tracking-tight flex items-center gap-1.5">
                <span>NFC Smart Shelf Scanner</span>
                <span className="bg-emerald-500/20 text-emerald-400 text-[9px] px-1.5 py-0.5 rounded font-black border border-emerald-500/30 uppercase tracking-widest">
                  Web NFC
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">Farmer's Gate • RFID Self-Checkout</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          
          {scannedItem ? (
            /* Item Quantity Selection Screen after Successful NFC Tap */
            <div className="space-y-4 animate-scaleUp">
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-center relative overflow-hidden">
                <div className="absolute top-2 right-2 flex items-center gap-1 text-[9px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full uppercase border border-emerald-300">
                  <Sparkles className="w-3 h-3" /> NFC RFID Read Success
                </div>

                <div className="w-14 h-14 bg-white rounded-2xl mx-auto overflow-hidden shadow-xs border border-emerald-100 flex items-center justify-center">
                  <img
                    src={scannedItem.image}
                    alt={scannedItem.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <h4 className="text-base font-black text-slate-900 mt-2.5">{scannedItem.name}</h4>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">{scannedItem.regionalName || scannedItem.category}</p>
                <div className="mt-2 text-sm font-black text-emerald-800 font-mono">
                  Rate: {formatCurrency(scannedItem.pricePerUnit)} / {scannedItem.unitType}
                </div>
              </div>

              {/* Quantity input fields */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                    Enter Weight or Quantity
                  </label>
                  {scannedItem.unitType === 'kg' && (
                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => { setWeightUnit('g'); setQuantityInput('500'); }}
                        className={`px-2 py-1 rounded-md text-[10px] font-black transition-all ${weightUnit === 'g' ? 'bg-white shadow-xs text-emerald-800' : 'text-slate-500'}`}
                      >
                        Grams (g)
                      </button>
                      <button
                        type="button"
                        onClick={() => { setWeightUnit('kg'); setQuantityInput('1'); }}
                        className={`px-2 py-1 rounded-md text-[10px] font-black transition-all ${weightUnit === 'kg' ? 'bg-white shadow-xs text-emerald-800' : 'text-slate-500'}`}
                      >
                        Kilograms (kg)
                      </button>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="number"
                    step={scannedItem.unitType === 'kg' ? (weightUnit === 'g' ? '50' : '0.1') : '1'}
                    min={scannedItem.unitType === 'kg' ? (weightUnit === 'g' ? '50' : '0.05') : '1'}
                    value={quantityInput}
                    onChange={(e) => setQuantityInput(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-950 rounded-xl text-sm font-black text-black placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono"
                    placeholder={scannedItem.unitType === 'kg' ? (weightUnit === 'g' ? '500' : '0.5') : '1'}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-500 uppercase font-mono bg-slate-200 px-2.5 py-1 rounded-lg">
                    {scannedItem.unitType === 'kg' ? weightUnit : 'units'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setScannedItem(null)}
                    className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 transition-colors cursor-pointer"
                  >
                    Tap Another Tag
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmAdd}
                    className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Add to Checkout Cart</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* NFC Tag Reading/Simulation Screen */
            <div className="space-y-4">
              
              {/* Animation Graphic */}
              <div className="py-6 flex flex-col items-center justify-center text-center bg-slate-50 border border-slate-100 rounded-3xl relative overflow-hidden">
                <div className="absolute inset-0 bg-radial from-emerald-100/10 via-transparent to-transparent pointer-events-none" />
                
                <div className="relative flex items-center justify-center w-20 h-20 mb-3">
                  {/* Rotating wave circles */}
                  <div className="absolute inset-0 rounded-full bg-emerald-500/10 border border-emerald-500/20 animate-ping" />
                  <div className="absolute w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 animate-pulse" />
                  <div className="w-10 h-10 bg-emerald-500 text-slate-950 rounded-full flex items-center justify-center shadow-md relative z-10">
                    <Wifi className="w-5 h-5 rotate-90" />
                  </div>
                </div>

                <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                  {isNfcScanning ? 'Ready to Scan NFC Tag' : 'Hardware Terminal Offline'}
                </h4>
                
                {isNfcSupported ? (
                  <div className="mt-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 text-[10px] font-bold rounded-full border border-emerald-200 flex items-center gap-1 inline-block">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" /> 
                    <span>Web NFC API active. Hold back of phone to RFID shelf-tag.</span>
                  </div>
                ) : (
                  <div className="mt-1.5 px-3 py-1 bg-amber-50 text-amber-800 text-[10px] font-semibold rounded-full border border-amber-200 flex items-center gap-1 inline-block max-w-[90%]">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Browser Web NFC not active. Use the virtual shelf-tag simulator below.</span>
                  </div>
                )}
              </div>

              {/* Hardware Status logs */}
              <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 text-[10px] font-mono text-emerald-400 space-y-1 h-20 overflow-y-auto">
                {nfcLogs.map((log, index) => (
                  <div key={index} className="leading-tight">
                    <span className="text-slate-500 select-none">&gt;</span> {log}
                  </div>
                ))}
                {nfcError && (
                  <div className="text-rose-400 leading-tight">
                    <span className="text-slate-500 select-none">&gt;</span> ⚠️ Error: {nfcError}
                  </div>
                )}
              </div>

              {/* Active list of Virtual NFC RFID tags to Tap */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block">
                    Simulate Tapping Shelf RFID Tags
                  </label>
                  <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                    Smart Shelf Demo
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {inventory.filter(item => item.inStock && item.stockQuantity > 0).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSimulateTagTap(item)}
                      className="text-left p-2 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 bg-white transition-all flex items-center gap-2 group shadow-2xs cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden border border-slate-200 group-hover:border-emerald-300">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-slate-900 group-hover:text-emerald-950 truncate">{item.name}</p>
                        <p className="text-[9px] text-slate-400 font-mono truncate">ID: {item.id}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 text-center text-[10px] text-slate-500 font-medium">
          Farmer's Gate RFID shelf labels use 13.56MHz NDEF tags with plain-text product IDs.
        </div>
      </div>
    </div>
  );
};
