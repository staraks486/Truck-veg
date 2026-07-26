import React, { useState, useEffect } from 'react';
import { CustomerRecord, Order } from '../types';
import { getStoredCustomers, saveStoredCustomers, formatCurrency } from '../utils/storageManager';
import { Users, Search, Phone, MessageSquare, Calendar, ShoppingBag, Plus, Trash2, Edit2, Check, Sparkles, UserCheck } from 'lucide-react';
import { openWhatsAppShare } from '../utils/whatsappHelper';

interface CustomerDirectoryManagerProps {
  orders: Order[];
  onSelectCustomerFilter?: (phone: string) => void;
}

export const CustomerDirectoryManager: React.FC<CustomerDirectoryManagerProps> = ({
  orders,
  onSelectCustomerFilter
}) => {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCustId, setEditingCustId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  useEffect(() => {
    loadCustomers();
    const handleStorage = () => loadCustomers();
    window.addEventListener('app-state-change', handleStorage);
    return () => window.removeEventListener('app-state-change', handleStorage);
  }, [orders]);

  const loadCustomers = () => {
    const records = getStoredCustomers();
    // Re-aggregate order totals for accuracy
    const updated = records.map((c) => {
      const custOrders = orders.filter(
        (o) => o.customerPhone.replace(/\D/g, '') === c.phone.replace(/\D/g, '') || o.customerPhone === c.phone
      );
      const totalSpent = custOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
      return {
        ...c,
        totalOrders: Math.max(c.totalOrders || 0, custOrders.length),
        totalSpent: Math.max(c.totalSpent || 0, totalSpent)
      };
    });
    setCustomers(updated);
  };

  const handleSaveNote = (id: string) => {
    const updated = customers.map((c) => (c.id === id ? { ...c, notes: noteText } : c));
    setCustomers(updated);
    saveStoredCustomers(updated);
    setEditingCustId(null);
  };

  const handleDeleteCustomer = (id: string) => {
    if (confirm('Are you sure you want to remove this customer record?')) {
      const updated = customers.filter((c) => c.id !== id);
      setCustomers(updated);
      saveStoredCustomers(updated);
    }
  };

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;

    const newRecord: CustomerRecord = {
      id: `cust-${Date.now()}`,
      name: newName.trim(),
      phone: newPhone.trim(),
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      notes: 'Manually added by shopkeeper',
      totalOrders: 0,
      totalSpent: 0
    };

    const updated = [newRecord, ...customers];
    setCustomers(updated);
    saveStoredCustomers(updated);
    setShowAddModal(false);
    setNewName('');
    setNewPhone('');
  };

  const handleSendWhatsAppPromo = (cust: CustomerRecord) => {
    const text = `Hello ${cust.name}! 🍎 Farmer's Gate Fresh Produce store has restocked farm-fresh vegetables and seasonal fruits! Drop by or order via self-checkout today!`;
    openWhatsAppShare(text, cust.phone);
  };

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.notes && c.notes.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header Bar */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-white">Registered Customer Directory</h3>
            <p className="text-xs text-slate-400">
              {customers.length} total customers logged in via self-checkout or added
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 self-start sm:self-center active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add Customer Record</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <Search className="w-4 h-4 text-slate-400 absolute left-6 top-5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search customer name, mobile number, or notes..."
          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-6 top-4 text-xs text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* Customer List */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-200">
          <UserCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-slate-800">No Customers Found</h4>
          <p className="text-xs text-slate-500 mt-1">
            When customers log in with their Name & Mobile Number, they will be automatically saved here!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredCustomers.map((c) => {
            const isEditing = editingCustId === c.id;
            return (
              <div
                key={c.id}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center text-sm shadow-inner shrink-0">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900">{c.name}</h4>
                      <p className="text-xs font-mono font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-emerald-600" />
                        {c.phone}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteCustomer(c.id)}
                    className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg transition-colors"
                    title="Delete record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">
                      Total Orders
                    </span>
                    <span className="font-extrabold text-slate-800 text-sm">
                      {c.totalOrders || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">
                      Total Value
                    </span>
                    <span className="font-extrabold text-emerald-700 text-sm">
                      {formatCurrency(c.totalSpent || 0)}
                    </span>
                  </div>
                </div>

                {/* Notes section */}
                <div className="text-xs">
                  {isEditing ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="e.g. Likes organic tomatoes, prefers afternoon delivery"
                        className="flex-1 p-1.5 border border-slate-300 rounded-lg text-xs"
                      />
                      <button
                        onClick={() => handleSaveNote(c.id)}
                        className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-slate-600 bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                      <p className="text-[11px] italic text-slate-600 truncate max-w-[200px]">
                        {c.notes || 'No notes added'}
                      </p>
                      <button
                        onClick={() => {
                          setEditingCustId(c.id);
                          setNoteText(c.notes || '');
                        }}
                        className="text-[10px] text-emerald-700 font-bold hover:underline shrink-0"
                      >
                        Edit Note
                      </button>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400 font-mono">
                    Last active: {new Date(c.lastActive).toLocaleDateString()}
                  </span>

                  <div className="flex items-center gap-2">
                    {onSelectCustomerFilter && (
                      <button
                        onClick={() => onSelectCustomerFilter(c.phone)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1"
                        title="Filter orders by this customer"
                      >
                        <ShoppingBag className="w-3 h-3 text-slate-600" />
                        <span>Filter Orders</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleSendWhatsAppPromo(c)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                    >
                      <MessageSquare className="w-3 h-3 fill-emerald-100 text-emerald-900" />
                      <span>WhatsApp Promo</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal to add customer manually */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-extrabold text-base text-slate-900">Add Customer Record</h3>
            <form onSubmit={handleAddCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Customer Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Ananya Roy"
                  className="w-full p-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number</label>
                <input
                  type="tel"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="e.g. +91 98123 45678"
                  className="w-full p-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-md"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
