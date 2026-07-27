import React, { useState, useRef, useEffect } from 'react';
import { InventoryItem, Category, UnitType } from '../types';
import { Plus, Edit2, Trash2, Check, X, Leaf, Camera, Upload, Link, RefreshCw, FolderPlus, Search, Tag, Filter } from 'lucide-react';
import { formatCurrency } from '../utils/storageManager';

interface InventoryManagerProps {
  inventory: InventoryItem[];
  onSaveItem: (item: InventoryItem) => void;
  onDeleteItem: (itemId: string) => void;
  onToggleStock: (itemId: string) => void;
}

const DEFAULT_CATEGORIES = [
  'Daily Essentials',
  'Root Vegetables',
  'Leafy Greens',
  'Exotic Fruits',
  'Organic Herbs'
];

const UNIT_OPTIONS = [
  { value: 'kg', label: 'per Kg (Kilogram)' },
  { value: 'g', label: 'per Gram' },
  { value: 'piece', label: 'per Piece' },
  { value: 'bunch', label: 'per Bunch' },
  { value: 'pack', label: 'per Pack' },
  { value: 'dozen', label: 'per Dozen' },
  { value: 'box', label: 'per Box' },
  { value: 'liter', label: 'per Liter' },
  { value: 'pouch', label: 'per Pouch' },
  { value: 'tray', label: 'per Tray' },
  { value: 'custom', label: '+ Add Custom Unit...' }
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
  const [selectedCategory, setSelectedCategory] = useState<string>('Daily Essentials');
  const [customCategory, setCustomCategory] = useState('');
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);

  const [pricePerUnit, setPricePerUnit] = useState<number>(40);
  const [selectedUnitType, setSelectedUnitType] = useState<string>('kg');
  const [customUnitType, setCustomUnitType] = useState('');

  const [stockQuantity, setStockQuantity] = useState<number>(25);
  const [inStock, setInStock] = useState(true);
  const [image, setImage] = useState('');
  const [description, setDescription] = useState('');
  const [isOrganic, setIsOrganic] = useState(false);

  // Camera & Image state
  const [imageTab, setImageTab] = useState<'camera' | 'upload' | 'url'>('url');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Filter & Grouping State
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Collect all unique categories present in inventory
  const categoriesInInventory = Array.from(
    new Set(inventory.map((item) => item.category))
  ).filter(Boolean);

  // Filter inventory based on search and selected category filter
  const filteredInventory = inventory.filter((item) => {
    const matchesCategory =
      selectedCategoryFilter === 'All' || item.category === selectedCategoryFilter;
    const matchesSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Group filtered items by category
  const groupedInventory = categoriesInInventory
    .map((cat) => ({
      categoryName: cat,
      items: filteredInventory.filter((item) => item.category === cat)
    }))
    .filter((group) => group.items.length > 0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Collect all categories (default + existing from inventory)
  const allCategories = Array.from(
    new Set([...DEFAULT_CATEGORIES, ...inventory.map((i) => i.category)])
  ).filter(Boolean);

  // Stop camera when modal closes or tab changes
  const stopCameraStream = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const openCreateModal = () => {
    stopCameraStream();
    setEditingItem(null);
    setName('');
    setSelectedCategory('Daily Essentials');
    setCustomCategory('');
    setIsAddingNewCategory(false);

    setPricePerUnit(40);
    setSelectedUnitType('kg');
    setCustomUnitType('');

    setStockQuantity(20);
    setInStock(true);
    setImage('https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80');
    setDescription('Fresh organic produce harvest.');
    setIsOrganic(true);
    setImageTab('url');
    setCameraError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: InventoryItem) => {
    stopCameraStream();
    setEditingItem(item);
    setName(item.name);

    if (allCategories.includes(item.category)) {
      setSelectedCategory(item.category);
      setIsAddingNewCategory(false);
      setCustomCategory('');
    } else {
      setSelectedCategory('__custom__');
      setIsAddingNewCategory(true);
      setCustomCategory(item.category);
    }

    const matchedUnit = UNIT_OPTIONS.find((u) => u.value === item.unitType);
    if (matchedUnit && matchedUnit.value !== 'custom') {
      setSelectedUnitType(item.unitType);
      setCustomUnitType('');
    } else {
      setSelectedUnitType('custom');
      setCustomUnitType(item.unitType);
    }

    setPricePerUnit(item.pricePerUnit);
    setStockQuantity(item.stockQuantity);
    setInStock(item.inStock);
    setImage(item.image);
    setDescription(item.description);
    setIsOrganic(!!item.isOrganic);
    setImageTab('url');
    setCameraError(null);
    setIsModalOpen(true);
  };

  // Start live webcam stream
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err) {
      console.warn('Unable to access live webcam stream:', err);
      setCameraError('Live webcam preview restricted in browser sandbox. Click below to snap using device camera.');
      setIsCameraActive(false);
      // Trigger native camera capture input
      if (nativeCameraInputRef.current) {
        nativeCameraInputRef.current.click();
      }
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setImage(dataUrl);
        stopCameraStream();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Resolve Category
    let finalCategory: Category = selectedCategory;
    if (isAddingNewCategory || selectedCategory === '__custom__') {
      finalCategory = customCategory.trim() || 'General Produce';
    }

    // Resolve Unit Type
    let finalUnitType: UnitType = selectedUnitType;
    if (selectedUnitType === 'custom') {
      finalUnitType = customUnitType.trim() || 'item';
    }

    const newItem: InventoryItem = {
      id: editingItem ? editingItem.id : `veg-${Date.now()}`,
      name: name.trim(),
      category: finalCategory,
      pricePerUnit: Number(pricePerUnit),
      unitType: finalUnitType,
      stockQuantity: Number(stockQuantity),
      inStock,
      image: image.trim() || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
      description,
      origin: 'Local Farm', // default farm source
      isOrganic
    };

    stopCameraStream();
    onSaveItem(newItem);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Hidden Canvas for Camera Snapshot */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Hidden File Inputs for Camera Snap & File Upload */}
      <input
        type="file"
        ref={nativeCameraInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFileUpload}
        className="hidden"
      />
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h3 className="font-extrabold text-slate-900 text-base">Store Produce Inventory</h3>
          <p className="text-xs text-slate-500">
            Organized category-wise. Manage prices, stock, custom categories, and photos in real-time.
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

      {/* Category Wise Filter Pills & Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search produce name or category..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <span className="text-xs font-extrabold text-slate-500 shrink-0 self-center">
            {filteredInventory.length} Total Produce Items
          </span>
        </div>

        {/* Category Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategoryFilter('All')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all shrink-0 flex items-center gap-1.5 ${
              selectedCategoryFilter === 'All'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>All Categories</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
              selectedCategoryFilter === 'All' ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-200 text-slate-700'
            }`}>
              {inventory.length}
            </span>
          </button>

          {categoriesInInventory.map((cat) => {
            const count = inventory.filter((i) => i.category === cat).length;
            const isSelected = selectedCategoryFilter === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60'
                }`}
              >
                <span>{cat}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  isSelected ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-200 text-slate-700'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Category-Wise Inventory Display Sections */}
      {groupedInventory.length > 0 ? (
        <div className="space-y-4">
          {groupedInventory.map((group) => {
            const inStockCount = group.items.filter((i) => i.inStock).length;
            return (
              <div
                key={group.categoryName}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs space-y-0"
              >
                {/* Category Header */}
                <div className="bg-slate-50/90 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                      <Tag className="w-4 h-4" />
                    </div>
                    <h4 className="font-extrabold text-slate-900 text-sm">{group.categoryName}</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                    <span className="text-emerald-700 font-bold">{inStockCount}</span> In Stock
                  </p>
                </div>

                {/* Items Table for this Category */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="p-3">Produce Details</th>
                        <th className="p-3">Price / Unit</th>
                        <th className="p-3">Stock Qty</th>
                        <th className="p-3">Stock Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {group.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3">
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
                                {item.description && (
                                  <p className="text-[11px] text-slate-400 font-normal line-clamp-1">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="p-3 font-extrabold text-emerald-800 font-mono">
                            {formatCurrency(item.pricePerUnit)} / {item.unitType}
                          </td>

                          <td className="p-3 font-mono text-slate-800 font-semibold">
                            {item.stockQuantity} {item.unitType}
                          </td>

                          <td className="p-3">
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

                          <td className="p-3 text-right space-x-2">
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
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 space-y-3">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full mx-auto flex items-center justify-center">
            <Search className="w-6 h-6" />
          </div>
          <p className="font-extrabold text-slate-800 text-sm">No produce items match your criteria</p>
          <p className="text-xs text-slate-500">Try adjusting your search query or selecting another category.</p>
          <button
            onClick={() => {
              setSelectedCategoryFilter('All');
              setSearchQuery('');
            }}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Modal for Create/Edit Item */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 my-auto">
            <div className="bg-emerald-950 text-white p-4 flex justify-between items-center border-b border-emerald-800">
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>{editingItem ? `Edit Produce: ${editingItem.name}` : 'Add New Produce Item'}</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  stopCameraStream();
                  setIsModalOpen(false);
                }}
                className="p-1 rounded-full hover:bg-emerald-800 text-emerald-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              {/* Item Name */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Fresh Organic Shimla Apples"
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Category Selection & Custom Category Option */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-700">Category *</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingNewCategory(!isAddingNewCategory);
                      if (!isAddingNewCategory) {
                        setSelectedCategory('__custom__');
                      } else {
                        setSelectedCategory(allCategories[0] || 'Daily Essentials');
                      }
                    }}
                    className="text-[11px] font-extrabold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>{isAddingNewCategory ? 'Choose Existing Category' : '+ Create Custom Category'}</span>
                  </button>
                </div>

                {!isAddingNewCategory && selectedCategory !== '__custom__' ? (
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        setIsAddingNewCategory(true);
                      } else {
                        setSelectedCategory(e.target.value);
                      }
                    }}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-medium outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    {allCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="__custom__">+ Add Custom Category...</option>
                  </select>
                ) : (
                  <div className="space-y-1">
                    <input
                      type="text"
                      required
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="e.g. Dairy & Milk, Spices, Bakery, Exotic"
                      className="w-full p-2.5 border border-emerald-400 bg-emerald-50/50 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <p className="text-[10px] text-emerald-700 font-medium">
                      Enter new category name. It will be saved for future items.
                    </p>
                  </div>
                )}
              </div>

              {/* Price, Unit Type & Stock Quantity */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    min={0.1}
                    step="any"
                    required
                    value={pricePerUnit}
                    onChange={(e) => setPricePerUnit(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit Type *</label>
                  <select
                    value={selectedUnitType}
                    onChange={(e) => setSelectedUnitType(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-medium outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-xs"
                  >
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Stock Qty *</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    required
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Custom Unit Input if selected */}
              {selectedUnitType === 'custom' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Custom Unit Name *</label>
                  <input
                    type="text"
                    required
                    value={customUnitType}
                    onChange={(e) => setCustomUnitType(e.target.value)}
                    placeholder="e.g. bottle, jar, bundle, roll, set"
                    className="w-full p-2.5 border border-emerald-400 bg-emerald-50/50 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}

              {/* Product Photo: Camera / Upload / URL Options */}
              <div className="space-y-2 border border-slate-200 p-3.5 rounded-2xl bg-slate-50/70">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-emerald-600" />
                    <span>Product Photo</span>
                  </label>

                  {/* Mode Selector */}
                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        stopCameraStream();
                        setImageTab('camera');
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all flex items-center gap-1 ${
                        imageTab === 'camera' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Camera className="w-3 h-3" />
                      <span>Camera</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        stopCameraStream();
                        setImageTab('upload');
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all flex items-center gap-1 ${
                        imageTab === 'upload' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Upload className="w-3 h-3" />
                      <span>Upload</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        stopCameraStream();
                        setImageTab('url');
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all flex items-center gap-1 ${
                        imageTab === 'url' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Link className="w-3 h-3" />
                      <span>URL</span>
                    </button>
                  </div>
                </div>

                {/* Camera Tab Content */}
                {imageTab === 'camera' && (
                  <div className="space-y-3 pt-1">
                    {!isCameraActive ? (
                      <div className="text-center p-4 bg-white rounded-xl border border-dashed border-slate-300 space-y-2">
                        <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl mx-auto flex items-center justify-center">
                          <Camera className="w-6 h-6" />
                        </div>
                        <p className="text-xs text-slate-600 font-medium">
                          Take a photo of the produce item directly using your device camera
                        </p>

                        {cameraError && (
                          <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                            {cameraError}
                          </p>
                        )}

                        <div className="flex items-center justify-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={startCamera}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                          >
                            <Camera className="w-4 h-4" />
                            <span>Open Camera</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => nativeCameraInputRef.current?.click()}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
                          >
                            Snap on Mobile
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                        <video ref={videoRef} className="w-full h-48 object-cover" playsInline muted />
                        <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={capturePhoto}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-xl flex items-center gap-1.5"
                          >
                            <Camera className="w-4 h-4 text-slate-950" />
                            <span>Capture Photo</span>
                          </button>
                          <button
                            type="button"
                            onClick={stopCameraStream}
                            className="px-3 py-2 bg-slate-900/90 text-white font-bold text-xs rounded-xl"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Upload Tab Content */}
                {imageTab === 'upload' && (
                  <div className="pt-1">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="cursor-pointer border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-white p-4 rounded-xl text-center transition-all space-y-1"
                    >
                      <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                      <p className="text-xs font-bold text-slate-700">Click to choose image file</p>
                      <p className="text-[10px] text-slate-400">Supports JPG, PNG, WEBP</p>
                    </div>
                  </div>
                )}

                {/* URL Tab Content */}
                {imageTab === 'url' && (
                  <div className="pt-1">
                    <input
                      type="url"
                      value={image}
                      onChange={(e) => setImage(e.target.value)}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="w-full p-2.5 border border-slate-300 bg-white rounded-xl font-medium outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                    />
                  </div>
                )}

                {/* Active Image Thumbnail Preview */}
                {image && (
                  <div className="flex items-center gap-3 pt-2 bg-white p-2 rounded-xl border border-slate-200">
                    <img
                      src={image}
                      alt="Preview"
                      className="w-12 h-12 rounded-lg object-cover bg-slate-100 border border-slate-200 shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80';
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">Image Preview Loaded</p>
                      <p className="text-[10px] text-emerald-600 font-semibold">Ready to save with produce item</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setImage('')}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Clear photo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Checkboxes: Organic & In Stock */}
              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isOrganic}
                    onChange={(e) => setIsOrganic(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <span className="flex items-center gap-1">
                    <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Organic Certified</span>
                  </span>
                </label>

                <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inStock}
                    onChange={(e) => setInStock(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <span>Currently In Stock</span>
                </label>
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Fresh farm-picked crisp harvest, rich in nutrients."
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                ></textarea>
              </div>

              {/* Form Action Buttons */}
              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    stopCameraStream();
                    setIsModalOpen(false);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 font-extrabold rounded-xl text-white shadow-md transition-all"
                >
                  Save Produce Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
