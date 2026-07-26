import React, { useState } from 'react';
import { InventoryItem, Category, UnitType } from '../types';
import { Plus, Edit2, Trash2, Check, X, Leaf, AlertCircle, Image as ImageIcon, Scale, Tag } from 'lucide-react';
import { formatCurrency, formatWeightOrUnits } from '../utils/storageManager';

interface InventoryManagerProps {
  inventory: InventoryItem[];
  onSaveItem: (item: InventoryItem) => void;
  onDeleteItem: (itemId: string) => void;
  onToggleStock: (itemId: string) => void;
}

const CATEGORIES: Category[] = [
  'Daily Essentials',
  'Root Vegetables',
  'Leafy Greens',
  'Exotic Fruits',
  'Organic Herbs'
];

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  inventory,
  onSaveItem,
  onDeleteItem,
  onToggleStock
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('Daily Essentials');
  const [pricePerUnit, setPricePerUnit] = useState<number>(40);
  const [unitType, setUnitType] = useState<UnitType>('kg');
  const [stockQuantity, setStockQuantity] = useState<number>(25);
  const [inStock, setInStock] = useState(true);
  const [image, setImage] = useState('');
  const [description, setDescription] = useState('');
  const [origin, setOrigin] = useState('');
  const [isOrganic, setIsOrganic] = useState(false);

  const openCreateModal = () => {
    setEditingItem(null);
    setName('');
    setCategory('Daily Essentials');
    setPricePerUnit(40);
    setUnitType('kg');
    setStockQuantity(20);
    setInStock(true);
    setImage('https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80');
    setDescription('Fresh organic farm produce harvest.');
    setOrigin('Local Farmer Collective');
    setIsOrganic(true);
    setIsModalOpen(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setName(item.name);
    setCategory(item.category);
    setPricePerUnit(item.pricePerUnit);
    setUnitType(item.unitType);
    setStockQuantity(item.stockQuantity);
    setInStock(item.inStock);
    setImage(item.image);
    setDescription(item.description);
    setOrigin(item.origin);
    setIsOrganic(!!item.isOrganic);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newItem: InventoryItem = {
      id: editingItem ? editingItem.id : `veg-${Date.now()}`,
      name,
      category,
      pricePerUnit: Number(pricePerUnit),
      unitType,
      stockQuantity: Number(stockQuantity),
      inStock,
      image: image.trim() || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
      description,
      origin: origin || 'Local Farm',
      isOrganic
    };

    onSaveItem(newItem);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h3 className="font-extrabold text-slate-900 text-base">Store Produce Inventory</h3>
          <p className="text-xs text-slate-500">
            Manage produce prices, stock availability, and categories in real-time.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 self-start sm:self-center shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Produce Item</span>
        </button>
      </div>

      {/* Inventory Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
              <tr>
                <th className="p-3.5">Produce Details</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Price / Unit</th>
                <th className="p-3.5">Stock Qty</th>
                <th className="p-3.5">Stock Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inventory.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3.5">
                    <div className="flex items-center gap-3">
                      <img
                        src={item.image}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0"
                      />
                      <div>
                        <p className="font-bold text-slate-900 flex items-center gap-1">
                          {item.name}
                          {item.isOrganic && (
                            <Leaf className="w-3 h-3 text-emerald-600 shrink-0" />
                          )}
                        </p>
                        <p className="text-[11px] text-slate-400">{item.origin}</p>
                      </div>
                    </div>
                  </td>

                  <td className="p-3.5 font-medium text-slate-700">
                    <span className="px-2 py-0.5 bg-slate-100 rounded-md font-semibold text-[11px]">
                      {item.category}
                    </span>
                  </td>

                  <td className="p-3.5 font-extrabold text-emerald-800 font-mono">
                    {formatCurrency(item.pricePerUnit)} / {item.unitType}
                  </td>

                  <td className="p-3.5 font-mono text-slate-800 font-semibold">
                    {item.stockQuantity} {item.unitType}
                  </td>

                  <td className="p-3.5">
                    <button
                      onClick={() => onToggleStock(item.id)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 transition-all ${
                        item.inStock
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}
                    >
                      {item.inStock ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" /> In Stock
                        </>
                      ) : (
                        <>
                          <X className="w-3 h-3 text-rose-600" /> Out of Stock
                        </>
                      )}
                    </button>
                  </td>

                  <td className="p-3.5 text-right space-x-2">
                    <button
                      onClick={() => openEditModal(item)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                      title="Edit Item"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onDeleteItem(item.id)}
                      className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                      title="Delete Item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Create/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 my-auto">
            <div className="bg-emerald-900 text-white p-4 flex justify-between items-center">
              <h3 className="font-extrabold text-sm">
                {editingItem ? `Edit Produce: ${editingItem.name}` : 'Add New Produce Item'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full hover:bg-emerald-800 text-emerald-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Item Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Fresh Red Tomatoes"
                    className="w-full p-2 border border-slate-300 rounded-xl font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Category)}
                    className="w-full p-2 border border-slate-300 rounded-xl font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Price (₹)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={pricePerUnit}
                    onChange={(e) => setPricePerUnit(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-300 rounded-xl font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit Type</label>
                  <select
                    value={unitType}
                    onChange={(e) => setUnitType(e.target.value as UnitType)}
                    className="w-full p-2 border border-slate-300 rounded-xl font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="kg">per Kg</option>
                    <option value="bunch">per Bunch</option>
                    <option value="piece">per Piece</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Stock Qty</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-300 rounded-xl font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Image URL</label>
                <input
                  type="url"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full p-2 border border-slate-300 rounded-xl font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Farm Source / Origin</label>
                  <input
                    type="text"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="e.g. Nashik Organic Farms"
                    className="w-full p-2 border border-slate-300 rounded-xl font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-4 pt-5">
                  <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isOrganic}
                      onChange={(e) => setIsOrganic(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <span>Organic Certified</span>
                  </label>

                  <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={inStock}
                      onChange={(e) => setInStock(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <span>In Stock</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                ></textarea>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 font-bold rounded-xl text-white shadow-md"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
