import React, { useState } from 'react';
import { InventoryItem, Order, OrderItem } from '../types';
import { X, UserPlus, ShoppingBag, Plus, Trash2, CheckCircle2, User, Phone, Sparkles } from 'lucide-react';
import { formatCurrency, formatWeightOrUnits } from '../utils/storageManager';

interface SimulateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  onAddOrder: (order: Order) => void;
}

export const SimulateCustomerModal: React.FC<SimulateCustomerModalProps> = ({
  isOpen,
  onClose,
  inventory,
  onAddOrder
}) => {
  const safeInventory = Array.isArray(inventory) ? inventory : [];
  const [customerType, setCustomerType] = useState<'priya' | 'rahul' | 'vikram' | 'custom'>('priya');
  const [customName, setCustomName] = useState('');
  const [customPhone, setCustomPhone] = useState('');
  const [customItems, setCustomItems] = useState<{ itemId: string; quantityOrWeight: number }[]>([]);

  if (!isOpen) return null;

  const presetCustomers = {
    priya: {
      name: 'Priya Patel',
      phone: '+91 98222 11000',
      items: [
        { itemId: 'veg-1', weight: 1200 }, // Tomatoes 1.2kg
        { itemId: 'veg-4', weight: 2 }      // Spinach 2 bunches
      ]
    },
    rahul: {
      name: 'Rahul Verma',
      phone: '+91 97333 44555',
      items: [
        { itemId: 'veg-2', weight: 2500 }, // Potatoes 2.5kg
        { itemId: 'veg-3', weight: 1500 }  // Onions 1.5kg
      ]
    },
    vikram: {
      name: 'Vikram Singh',
      phone: '+91 96444 55666',
      items: [
        { itemId: 'veg-7', weight: 1500 }, // Alphonso Mangoes 1.5kg
        { itemId: 'veg-6', weight: 300 }   // Garlic 300g
      ]
    }
  };

  const handleAddItemToCustom = (itemId: string) => {
    const item = safeInventory.find((i) => i.id === itemId);
    if (!item) return;
    const defaultWt = item.unitType === 'kg' ? 1000 : 1;
    setCustomItems((prev) => [...prev, { itemId, quantityOrWeight: defaultWt }]);
  };

  const handleRemoveCustomItem = (index: number) => {
    setCustomItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateCustomWeight = (index: number, weight: number) => {
    setCustomItems((prev) => {
      const copy = [...prev];
      copy[index].quantityOrWeight = weight;
      return copy;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let name = customName || 'New Customer';
    let phone = customPhone || '+91 99999 88888';
    let rawItems: { itemId: string; quantityOrWeight: number }[] = [];

    if (customerType !== 'custom') {
      const preset = presetCustomers[customerType];
      name = preset.name;
      phone = preset.phone;
      rawItems = preset.items.map((i) => ({ itemId: i.itemId, quantityOrWeight: i.weight }));
    } else {
      if (customItems.length === 0) {
        // Fallback default item if none selected
        rawItems = [{ itemId: safeInventory[0]?.id || 'veg-1', quantityOrWeight: 1000 }];
      } else {
        rawItems = customItems;
      }
    }

    const orderItems: OrderItem[] = rawItems
      .map((ri) => {
        const item = safeInventory.find((inv) => inv.id === ri.itemId);
        if (!item) return null;
        const totalPrice =
          item.unitType === 'kg'
            ? (item.pricePerUnit * ri.quantityOrWeight) / 1000
            : item.pricePerUnit * ri.quantityOrWeight;

        return {
          itemId: item.id,
          name: item.name,
          unitType: item.unitType,
          quantityOrWeight: ri.quantityOrWeight,
          pricePerUnit: item.pricePerUnit,
          totalPrice
        };
      })
      .filter((i): i is OrderItem => i !== null);

    const subtotal = orderItems.reduce((s, i) => s + i.totalPrice, 0);

    const newOrder: Order = {
      id: `FG-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: name,
      customerPhone: phone,
      storeName: "Farmer's Gate - Fresh Produce",
      items: orderItems,
      subtotal,
      tax: 0,
      platformFee: 0,
      grandTotal: subtotal,
      status: 'sent_to_shopkeeper',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onAddOrder(newOrder);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 my-auto">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Simulate Customer Order</h3>
              <p className="text-xs text-slate-400">
                Add an incoming customer checkout to test multi-customer counter queues
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Select Customer Persona
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: 'priya', name: 'Priya Patel', phone: '+91 98222 11000', desc: 'Tomatoes & Spinach' },
                  { id: 'rahul', name: 'Rahul Verma', phone: '+91 97333 44555', desc: 'Potatoes & Onions' },
                  { id: 'vikram', name: 'Vikram Singh', phone: '+91 96444 55666', desc: 'Mangoes & Garlic' },
                  { id: 'custom', name: '+ Custom Customer', phone: 'Enter details', desc: 'Choose produce' }
                ] as const
              ).map((preset) => (
                <button
                  type="button"
                  key={preset.id}
                  onClick={() => setCustomerType(preset.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    customerType === preset.id
                      ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/20 text-emerald-950 font-bold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <p className="text-xs font-black">{preset.name}</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">{preset.phone}</p>
                  <p className="text-[10px] text-emerald-700 mt-1">{preset.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Customer Fields */}
          {customerType === 'custom' && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 animate-fadeIn">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    required
                    value={customName || ''}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Ananya Roy"
                    className="w-full p-2 bg-white text-xs border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    required
                    value={customPhone || ''}
                    onChange={(e) => setCustomPhone(e.target.value)}
                    placeholder="e.g. +91 98123 45678"
                    className="w-full p-2 bg-white text-xs border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Produce Items selector */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-700">
                  Select Produce Items
                </label>
                <div className="flex gap-2">
                  <select
                    id="produce-select"
                    className="flex-1 p-2 bg-white text-xs border border-slate-300 rounded-lg outline-none"
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddItemToCustom(e.target.value);
                        e.target.value = '';
                      }
                    }}
                  >
                    <option value="">+ Add item to cart...</option>
                    {safeInventory.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} ({formatCurrency(i.pricePerUnit)}/{i.unitType})
                      </option>
                    ))}
                  </select>
                </div>

                {customItems.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    {customItems.map((ci, idx) => {
                      const item = safeInventory.find((i) => i.id === ci.itemId);
                      if (!item) return null;
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 text-xs"
                        >
                          <span className="font-bold text-slate-800">{item.name}</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step={item.unitType === 'kg' ? 100 : 1}
                              value={ci.quantityOrWeight}
                              onChange={(e) =>
                                handleUpdateCustomWeight(idx, parseFloat(e.target.value) || 0)
                              }
                              className="w-16 p-1 border border-slate-300 rounded text-center text-xs font-bold"
                            />
                            <span className="text-[10px] text-slate-500">{item.unitType === 'kg' ? 'g' : item.unitType}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveCustomItem(idx)}
                              className="p-1 text-rose-500 hover:text-rose-700"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Create Customer Order</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
