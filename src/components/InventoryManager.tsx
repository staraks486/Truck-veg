import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { InventoryItem, Category, UnitType } from '../types';
import {
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Leaf,
  Camera,
  Upload,
  Link,
  FolderPlus,
  Search,
  Tag,
  Settings2,
  Sparkles,
  AlertTriangle,
  Star,
  Globe
} from 'lucide-react';
import { formatCurrency } from '../utils/storageManager';
import { autoTranslateProduce } from '../utils/translator';

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

const QUICK_PRICES = [10, 20, 30, 40, 50, 80, 100, 120, 150, 200];
const QUICK_UNITS = ['kg', 'g', 'piece', 'bunch', 'pack', 'dozen', 'pouch', 'tray'];

interface ProducePreset {
  label: string;
  name: string;
  regionalName: string;
  category: string;
  price: number;
  unit: string;
  stock: number;
  image: string;
  description: string;
  isOrganic: boolean;
}

const INDIAN_PRODUCE_PRESETS: ProducePreset[] = [
  {
    label: 'Potato 🥔',
    name: 'Fresh Potato (Aloo)',
    regionalName: 'Aloo (आलू)',
    category: 'Root Vegetables',
    price: 30,
    unit: 'kg',
    stock: 50,
    image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=600&q=80',
    description: 'Fresh farm potatoes, ideal for daily curry and snacks.',
    isOrganic: false
  },
  {
    label: 'Tomato 🍅',
    name: 'Desi Red Tomatoes',
    regionalName: 'Tamatar (टमाटर)',
    category: 'Daily Essentials',
    price: 40,
    unit: 'kg',
    stock: 40,
    image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80',
    description: 'Ripe red organic tomatoes harvested fresh.',
    isOrganic: true
  },
  {
    label: 'Onion 🧅',
    name: 'Nashik Red Onions',
    regionalName: 'Pyaz (प्याज़)',
    category: 'Daily Essentials',
    price: 35,
    unit: 'kg',
    stock: 60,
    image: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=600&q=80',
    description: 'Crisp red onions sourced directly from Nashik mandi.',
    isOrganic: false
  },
  {
    label: 'Spinach 🥬',
    name: 'Fresh Palak Bunch',
    regionalName: 'Palak (पालक)',
    category: 'Leafy Greens',
    price: 20,
    unit: 'bunch',
    stock: 30,
    image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=600&q=80',
    description: 'Nutritious tender spinach leaves.',
    isOrganic: true
  },
  {
    label: 'Banana 🍌',
    name: 'Sweet Yellow Bananas',
    regionalName: 'Kela (केला)',
    category: 'Exotic Fruits',
    price: 50,
    unit: 'dozen',
    stock: 25,
    image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=600&q=80',
    description: 'Naturally ripened sweet bananas.',
    isOrganic: false
  },
  {
    label: 'Apple 🍎',
    name: 'Shimla Red Apples',
    regionalName: 'Seb (सेब)',
    category: 'Exotic Fruits',
    price: 140,
    unit: 'kg',
    stock: 15,
    image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=600&q=80',
    description: 'Crunchy sweet red apples from Himachal orchards.',
    isOrganic: true
  },
  {
    label: 'Ginger 🫚',
    name: 'Fresh Ginger Root',
    regionalName: 'Adrak (अदरक)',
    category: 'Organic Herbs',
    price: 120,
    unit: 'kg',
    stock: 10,
    image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=600&q=80',
    description: 'Aromatic fresh ginger root.',
    isOrganic: true
  },
  {
    label: 'Cauliflower 🥦',
    name: 'Fresh Cauliflower',
    regionalName: 'Phool Gobhi (फूल गोभी)',
    category: 'Daily Essentials',
    price: 40,
    unit: 'piece',
    stock: 20,
    image: 'https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?auto=format&fit=crop&w=600&q=80',
    description: 'Clean whole cauliflower head.',
    isOrganic: false
  },
  {
    label: 'Dairy Milk 🥛',
    name: 'Pasteurized Dairy Milk',
    regionalName: 'Doodh (दूध)',
    category: 'Daily Essentials',
    price: 32,
    unit: 'pouch',
    stock: 40,
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80',
    description: 'Fresh pasteurized 500ml pouch milk.',
    isOrganic: false
  },
  {
    label: 'Paneer 🧀',
    name: 'Soft Malai Paneer',
    regionalName: 'Paneer (पनीर)',
    category: 'Daily Essentials',
    price: 100,
    unit: 'pack',
    stock: 15,
    image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80',
    description: 'Fresh soft cottage cheese 200g pack.',
    isOrganic: true
  }
];

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  inventory,
  onSaveItem,
  onDeleteItem,
  onToggleStock
}) => {
  const safeInventory = Array.isArray(inventory) ? inventory : [];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Category Manager Modal
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [editingCategoryName, setEditingCategoryName] = useState<string | null>(null);
  const [newCatNameInput, setNewCatNameInput] = useState('');
  const [addedNewCategoryInput, setAddedNewCategoryInput] = useState('');
  const [categoryToDeleteConfirm, setCategoryToDeleteConfirm] = useState<{ name: string; itemCount: number } | null>(null);

  // Managed Categories List (saved in local storage)
  const [categoriesList, setCategoriesList] = useState<string[]>(() => {
    const saved = localStorage.getItem('mandi_custom_categories');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return DEFAULT_CATEGORIES;
  });

  // Item Form State
  const [name, setName] = useState('');
  const [regionalName, setRegionalName] = useState('');
  const [hindiName, setHindiName] = useState('');
  const [punjabiName, setPunjabiName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Daily Essentials');
  const [customCategory, setCustomCategory] = useState('');
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);

  // Auto Translate Handlers
  const handleItemNameChange = (newNameVal: string) => {
    setName(newNameVal);
    if (newNameVal.trim()) {
      const translation = autoTranslateProduce(newNameVal);
      setHindiName(translation.hindi);
      setPunjabiName(translation.punjabi);
      setRegionalName(translation.combined);
    } else {
      setHindiName('');
      setPunjabiName('');
      setRegionalName('');
    }
  };

  const handleManualAutoTranslate = () => {
    if (name.trim()) {
      const translation = autoTranslateProduce(name);
      setHindiName(translation.hindi);
      setPunjabiName(translation.punjabi);
      setRegionalName(translation.combined);
    }
  };

  const [pricePerUnit, setPricePerUnit] = useState<number>(40);
  const [selectedUnitType, setSelectedUnitType] = useState<string>('kg');
  const [customUnitType, setCustomUnitType] = useState('');

  const [stockQuantity, setStockQuantity] = useState<number>(25);
  const [minStockAlert, setMinStockAlert] = useState<number>(5);
  const [inStock, setInStock] = useState(true);
  const [image, setImage] = useState('');
  const [description, setDescription] = useState('');
  const [isOrganic, setIsOrganic] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  // Camera & Image state
  const [imageTab, setImageTab] = useState<'camera' | 'upload' | 'url'>('url');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Filter & Grouping State
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Collect all unique categories present in inventory + managed categories list
  const allCategories = Array.from(
    new Set([...categoriesList, ...safeInventory.map((i) => i.category)])
  ).filter(Boolean);

  const categoriesInInventory = Array.from(
    new Set(safeInventory.map((item) => item.category))
  ).filter(Boolean);

  const favoriteCount = safeInventory.filter((i) => i.isFavorite).length;

  // Quick toggle item favorite status
  const handleToggleFavoriteItem = (item: InventoryItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onSaveItem({
      ...item,
      isFavorite: !item.isFavorite
    });
  };

  // Filter inventory
  const filteredInventory = safeInventory.filter((item) => {
    const matchesCategory =
      selectedCategoryFilter === 'All'
        ? true
        : selectedCategoryFilter === 'Favorites'
        ? item.isFavorite
        : item.category === selectedCategoryFilter;
    const matchesSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.regionalName && item.regionalName.toLowerCase().includes(searchQuery.toLowerCase())) ||
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
    setHindiName('');
    setPunjabiName('');
    setRegionalName('');
    setSelectedCategory('Daily Essentials');
    setCustomCategory('');
    setIsAddingNewCategory(false);

    setPricePerUnit(40);
    setSelectedUnitType('kg');
    setCustomUnitType('');

    setStockQuantity(20);
    setMinStockAlert(5);
    setInStock(true);
    setImage('https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80');
    setDescription('Fresh organic produce harvest.');
    setIsOrganic(true);
    setIsFavorite(false);
    setImageTab('url');
    setCameraError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: InventoryItem) => {
    stopCameraStream();
    setEditingItem(item);
    setName(item.name);
    setRegionalName(item.regionalName || '');

    if (item.hindiName) setHindiName(item.hindiName);
    if (item.punjabiName) setPunjabiName(item.punjabiName);

    if (!item.hindiName || !item.punjabiName) {
      const tr = autoTranslateProduce(item.name);
      if (!item.hindiName) setHindiName(tr.hindi);
      if (!item.punjabiName) setPunjabiName(tr.punjabi);
    }

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
    setMinStockAlert(item.minStockAlert !== undefined ? item.minStockAlert : 5);
    setInStock(item.inStock);
    setImage(item.image);
    setDescription(item.description);
    setIsOrganic(!!item.isOrganic);
    setIsFavorite(!!item.isFavorite);
    setImageTab('url');
    setCameraError(null);
    setIsModalOpen(true);
  };

  const applyPreset = (preset: ProducePreset) => {
    setName(preset.name);
    setSelectedCategory(preset.category);
    setIsAddingNewCategory(false);
    setPricePerUnit(preset.price);
    setSelectedUnitType(preset.unit);
    setStockQuantity(preset.stock);
    setImage(preset.image);
    setDescription(preset.description);
    setIsOrganic(preset.isOrganic);
    setIsFavorite(true);

    const translation = autoTranslateProduce(preset.name);
    setHindiName(translation.hindi);
    setPunjabiName(translation.punjabi);
    setRegionalName(preset.regionalName || translation.combined);
  };

  // Category Manager Actions
  const handleRenameCategory = (oldCategory: string) => {
    if (!newCatNameInput.trim() || newCatNameInput.trim() === oldCategory) {
      setEditingCategoryName(null);
      return;
    }
    const updatedCategory = newCatNameInput.trim();

    // Update categoriesList state & local storage
    setCategoriesList((prev) => {
      const updated = prev.map((c) => (c === oldCategory ? updatedCategory : c));
      if (!updated.includes(updatedCategory)) {
        updated.push(updatedCategory);
      }
      localStorage.setItem('mandi_custom_categories', JSON.stringify(updated));
      return updated;
    });

    // Update all inventory items under this category
    safeInventory.forEach((item) => {
      if (item.category === oldCategory) {
        onSaveItem({
          ...item,
          category: updatedCategory
        });
      }
    });

    if (selectedCategoryFilter === oldCategory) {
      setSelectedCategoryFilter(updatedCategory);
    }

    setEditingCategoryName(null);
    setNewCatNameInput('');
    toast.success(`Category renamed to "${updatedCategory}"`);
  };

  const handleAddNewCategoryFromManager = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addedNewCategoryInput.trim()) return;
    const cat = addedNewCategoryInput.trim();
    if (!allCategories.includes(cat)) {
      setCategoriesList((prev) => {
        const updated = [...prev, cat];
        localStorage.setItem('mandi_custom_categories', JSON.stringify(updated));
        return updated;
      });
      setSelectedCategoryFilter(cat);
      toast.success(`New category "${cat}" added`);
    } else {
      toast.info(`Category "${cat}" already exists`);
    }
    setAddedNewCategoryInput('');
  };

  const handleExecuteDeleteCategory = (catToDelete: string) => {
    const remainingCategories = allCategories.filter((c) => c !== catToDelete);
    const fallbackCat = remainingCategories[0] || 'Daily Essentials';

    // 1. Reassign items to fallback category if any exist
    let reassignedCount = 0;
    safeInventory.forEach((item) => {
      if (item.category === catToDelete) {
        onSaveItem({
          ...item,
          category: fallbackCat
        });
        reassignedCount++;
      }
    });

    // 2. Remove category from categoriesList & local storage
    setCategoriesList((prev) => {
      const updated = prev.filter((c) => c !== catToDelete);
      localStorage.setItem('mandi_custom_categories', JSON.stringify(updated));
      return updated;
    });

    // 3. Reset category filter if active
    if (selectedCategoryFilter === catToDelete) {
      setSelectedCategoryFilter('All');
    }

    setCategoryToDeleteConfirm(null);
    if (reassignedCount > 0) {
      toast.success(`Category "${catToDelete}" deleted. ${reassignedCount} item(s) moved to "${fallbackCat}".`);
    } else {
      toast.success(`Category "${catToDelete}" deleted successfully.`);
    }
  };

  // Start live camera
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
      console.warn('Unable to access camera stream:', err);
      setCameraError('Camera preview restricted in browser sandbox. Click below to snap on device.');
      setIsCameraActive(false);
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

    let finalCategory: Category = selectedCategory;
    if (isAddingNewCategory || selectedCategory === '__custom__') {
      finalCategory = customCategory.trim() || 'General Produce';
    }

    let finalUnitType: UnitType = selectedUnitType;
    if (selectedUnitType === 'custom') {
      finalUnitType = customUnitType.trim() || 'item';
    }

    // Auto-translate in background if Hindi or Punjabi name is empty
    let finalHindi = hindiName.trim();
    let finalPunjabi = punjabiName.trim();

    if (!finalHindi || !finalPunjabi) {
      const translation = autoTranslateProduce(name.trim());
      if (!finalHindi) finalHindi = translation.hindi;
      if (!finalPunjabi) finalPunjabi = translation.punjabi;
    }

    const combinedReg = [finalHindi, finalPunjabi].filter(Boolean).join(' • ') || regionalName.trim() || undefined;

    const newItem: InventoryItem = {
      id: editingItem ? editingItem.id : `veg-${Date.now()}`,
      name: name.trim(),
      regionalName: combinedReg,
      hindiName: finalHindi || undefined,
      punjabiName: finalPunjabi || undefined,
      category: finalCategory,
      pricePerUnit: Number(pricePerUnit),
      unitType: finalUnitType,
      stockQuantity: Number(stockQuantity),
      minStockAlert: Number(minStockAlert),
      inStock,
      image: image.trim() || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
      description,
      origin: 'Local Mandi / Farm',
      isOrganic,
      isFavorite
    };

    stopCameraStream();
    onSaveItem(newItem);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Hidden Canvas for Camera Snapshot */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Hidden File Inputs */}
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

      {/* Compact Top Header & Quick Actions Banner */}
      <div className="bg-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-emerald-100/80 text-emerald-800 shrink-0 border border-emerald-200/80 hidden xs:flex">
            <Tag className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                Store Produce Inventory (₹ INR)
              </h3>
              <span className="bg-emerald-100 text-emerald-900 text-[9px] font-black px-1.5 py-0.2 rounded-full border border-emerald-200/80 shrink-0">
                Indian Mandi Standard
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate hidden sm:block">
              Organized category-wise • Auto-translations (Hindi & Punjabi) • Fast presets & alerts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsCategoryManagerOpen(true)}
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs rounded-lg transition-all flex items-center gap-1 border border-slate-200/80 cursor-pointer"
          >
            <Settings2 className="w-3.5 h-3.5 text-emerald-700" />
            <span>Categories</span>
          </button>

          <button
            onClick={openCreateModal}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-lg shadow-xs transition-all flex items-center gap-1 cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Produce Item</span>
          </button>
        </div>
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
              placeholder="Search produce name, Hindi name (Aloo, Pyaz), category..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
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
            {filteredInventory.length} Total Items Listed
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
              {safeInventory.length}
            </span>
          </button>

          {/* Starred / Favorites Quick Filter */}
          <button
            type="button"
            onClick={() => setSelectedCategoryFilter('Favorites')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all shrink-0 flex items-center gap-1.5 ${
              selectedCategoryFilter === 'Favorites'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${selectedCategoryFilter === 'Favorites' ? 'fill-slate-950 text-slate-950' : 'fill-amber-500 text-amber-500'}`} />
            <span>Favorites</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
              selectedCategoryFilter === 'Favorites' ? 'bg-amber-700 text-amber-100' : 'bg-amber-200 text-amber-900'
            }`}>
              {favoriteCount}
            </span>
          </button>

          {allCategories.map((cat) => {
            const count = safeInventory.filter((i) => i.category === cat).length;
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
                        <th className="p-3">Produce Item</th>
                        <th className="p-3">Price / Unit</th>
                        <th className="p-3">Stock Qty</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {group.items.map((item) => {
                        const isLowStock = item.inStock && item.stockQuantity <= (item.minStockAlert !== undefined ? item.minStockAlert : 5);
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <div className="relative shrink-0">
                                  <img
                                    src={item.image}
                                    alt={item.name}
                                    referrerPolicy="no-referrer"
                                    className="w-10 h-10 rounded-xl object-cover bg-slate-100 border border-slate-200"
                                  />
                                  <button
                                    type="button"
                                    onClick={(e) => handleToggleFavoriteItem(item, e)}
                                    title={item.isFavorite ? "Unstar Favorite" : "Mark as Favorite"}
                                    className={`absolute -top-1.5 -right-1.5 p-1 rounded-full shadow-2xs transition-transform hover:scale-110 ${
                                      item.isFavorite
                                        ? 'bg-amber-400 text-slate-950 border border-amber-300'
                                        : 'bg-white/90 text-slate-400 hover:text-amber-500 border border-slate-200'
                                    }`}
                                  >
                                    <Star className={`w-3 h-3 ${item.isFavorite ? 'fill-slate-950 text-slate-950' : ''}`} />
                                  </button>
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                                    <span>{item.name}</span>
                                    {item.isFavorite && (
                                      <span className="text-[9px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-black border border-amber-300 flex items-center gap-0.5">
                                        <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-600" /> Favorite
                                      </span>
                                    )}
                                    {item.regionalName && (
                                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-md font-medium border border-slate-200">
                                        {item.regionalName}
                                      </span>
                                    )}
                                    {item.isOrganic && (
                                      <Leaf className="w-3.5 h-3.5 text-emerald-600 shrink-0" title="Organic" />
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

                            <td className="p-3 font-extrabold text-emerald-800 font-mono text-sm">
                              {formatCurrency(item.pricePerUnit)} <span className="text-xs text-slate-500 font-normal">/ {item.unitType}</span>
                            </td>

                            <td className="p-3 font-mono text-slate-800 font-bold">
                              <span>{item.stockQuantity} {item.unitType}</span>
                              {isLowStock && (
                                <span className="ml-2 inline-flex items-center gap-1 text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-black border border-amber-300">
                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                  Low Stock
                                </span>
                              )}
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

                            <td className="p-3 text-right space-x-1.5">
                              <button
                                onClick={(e) => handleToggleFavoriteItem(item, e)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  item.isFavorite
                                    ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-500'
                                }`}
                                title={item.isFavorite ? "Unmark Favorite" : "Mark as Favorite"}
                              >
                                <Star className={`w-3.5 h-3.5 ${item.isFavorite ? 'fill-amber-500 text-amber-600' : ''}`} />
                              </button>

                              <button
                                onClick={() => openEditModal(item)}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                                title="Edit Produce Item"
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
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full mx-auto flex items-center justify-center">
            <Search className="w-6 h-6" />
          </div>
          <p className="font-extrabold text-slate-800 text-sm">No produce items match your search</p>
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

      {/* Category Management Modal */}
      {isCategoryManagerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-emerald-400" />
                <h3 className="font-extrabold text-sm">Manage Categories</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoryManagerOpen(false)}
                className="p-1 rounded-full hover:bg-slate-800 text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Add New Category Form */}
              <form onSubmit={handleAddNewCategoryFromManager} className="space-y-1.5">
                <label className="block font-bold text-slate-700">Add New Category</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={addedNewCategoryInput}
                    onChange={(e) => setAddedNewCategoryInput(e.target.value)}
                    placeholder="e.g. Dairy & Milk, Exotic Fruits, Spices"
                    className="flex-1 p-2 border border-slate-300 rounded-xl font-medium outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </form>

              <hr className="border-slate-100" />

              {/* Delete Category Confirmation Alert */}
              {categoryToDeleteConfirm && (
                <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl space-y-2 animate-fadeIn text-xs">
                  <div className="flex items-center gap-1.5 text-rose-900 font-extrabold">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Delete Category "{categoryToDeleteConfirm.name}"?</span>
                  </div>
                  {categoryToDeleteConfirm.itemCount > 0 ? (
                    <p className="text-[11px] text-rose-800 leading-snug">
                      This category contains <strong>{categoryToDeleteConfirm.itemCount} produce item(s)</strong>. Deleting it will reassign those items to another available category.
                    </p>
                  ) : (
                    <p className="text-[11px] text-rose-800 leading-snug">
                      This category has 0 items and will be permanently removed.
                    </p>
                  )}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setCategoryToDeleteConfirm(null)}
                      className="px-2.5 py-1 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg text-xs hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExecuteDeleteCategory(categoryToDeleteConfirm.name)}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-lg text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Confirm Delete</span>
                    </button>
                  </div>
                </div>
              )}

              {/* List of Existing Categories */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-700">
                  Existing Categories ({allCategories.length})
                </label>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {allCategories.map((cat) => {
                    const count = safeInventory.filter((i) => i.category === cat).length;
                    const isEditingThis = editingCategoryName === cat;

                    return (
                      <div
                        key={cat}
                        className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl gap-2"
                      >
                        {isEditingThis ? (
                          <div className="flex items-center gap-1.5 flex-1">
                            <input
                              type="text"
                              value={newCatNameInput}
                              onChange={(e) => setNewCatNameInput(e.target.value)}
                              className="w-full p-1.5 border border-emerald-500 rounded-lg text-xs font-bold text-slate-900 bg-white"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleRenameCategory(cat)}
                              className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer"
                              title="Save Name"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCategoryName(null)}
                              className="p-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 cursor-pointer"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 min-w-0">
                              <Tag className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="font-bold text-slate-800 truncate text-xs">{cat}</span>
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-full shrink-0">
                                {count} {count === 1 ? 'item' : 'items'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCategoryName(cat);
                                  setNewCatNameInput(cat);
                                }}
                                className="p-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg font-bold text-[11px] flex items-center gap-1 shrink-0 cursor-pointer"
                                title="Rename Category"
                              >
                                <Edit2 className="w-3 h-3 text-slate-500" />
                                <span className="hidden sm:inline">Rename</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setCategoryToDeleteConfirm({ name: cat, itemCount: count })}
                                className="p-1.5 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 hover:text-rose-900 rounded-lg font-bold text-[11px] flex items-center gap-1 shrink-0 cursor-pointer"
                                title="Delete Category"
                              >
                                <Trash2 className="w-3 h-3 text-rose-600" />
                                <span className="hidden sm:inline">Delete</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsCategoryManagerOpen(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Create/Edit Item (Ultra-Compact & Mobile Optimized) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full flex flex-col max-h-[92vh] overflow-hidden border border-slate-200 my-auto">
            {/* Modal Header (Fixed at top) */}
            <div className="bg-emerald-950 text-white px-3.5 py-2.5 flex justify-between items-center border-b border-emerald-800 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded-lg bg-emerald-800 text-emerald-200 shrink-0">
                  <Plus className="w-4 h-4 text-emerald-300" />
                </div>
                <h3 className="font-extrabold text-xs sm:text-sm truncate">
                  {editingItem ? `Edit: ${editingItem.name}` : 'Add New Produce Item'}
                </h3>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Favorite Star Toggle directly in Header */}
                <button
                  type="button"
                  onClick={() => setIsFavorite(!isFavorite)}
                  className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                    isFavorite
                      ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                      : 'bg-emerald-900 text-emerald-200 hover:bg-emerald-800'
                  }`}
                  title="Mark as Favorite Item"
                >
                  <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-slate-950 text-slate-950' : 'text-emerald-300'}`} />
                  <span className="hidden sm:inline">{isFavorite ? 'Starred' : 'Favorite'}</span>
                </button>

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
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 text-xs">
                {/* Quick Fill Indian Produce Presets (Shown on create mode) */}
                {!editingItem && (
                  <div className="bg-emerald-50/80 p-2 rounded-xl border border-emerald-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-emerald-950 flex items-center gap-1 text-[10px] sm:text-[11px]">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Quick 1-Tap Presets (Top Produce):</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                      {INDIAN_PRODUCE_PRESETS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => applyPreset(preset)}
                          className="px-2 py-0.5 bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-lg font-bold text-[10px] shrink-0 transition-all shadow-2xs"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Item Name (English) */}
                <div>
                  <label className="block font-extrabold text-slate-800 mb-0.5 text-[11px]">
                    Item Name (English) *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => handleItemNameChange(e.target.value)}
                    placeholder="e.g. Tomatoes"
                    className="w-full p-2 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs shadow-2xs"
                  />
                </div>

                {/* Hindi & Punjabi Translations in 1 Line */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-0.5 text-[11px]">
                      🇮🇳 Hindi (Auto)
                    </label>
                    <input
                      type="text"
                      value={hindiName}
                      onChange={(e) => setHindiName(e.target.value)}
                      placeholder="e.g. टमाटर"
                      className="w-full p-2 border border-amber-300/80 bg-amber-50/40 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500 text-xs shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-0.5 text-[11px]">
                      🌾 Punjabi (Auto)
                    </label>
                    <input
                      type="text"
                      value={punjabiName}
                      onChange={(e) => setPunjabiName(e.target.value)}
                      placeholder="e.g. ਟਮਾਟਰ"
                      className="w-full p-2 border border-amber-300/80 bg-amber-50/40 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500 text-xs shadow-2xs"
                    />
                  </div>
                </div>

                {/* Category Selection */}
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="block font-bold text-slate-700 text-[11px]">Category *</label>
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
                      className="text-[10px] font-extrabold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5"
                    >
                      <FolderPlus className="w-3 h-3" />
                      <span>{isAddingNewCategory ? 'Existing' : '+ Custom Cat'}</span>
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
                      className="w-full p-1.5 border border-slate-300 rounded-lg font-medium outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-xs"
                    >
                      {allCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                      <option value="__custom__">+ Add Custom Category...</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="e.g. Dairy & Milk, Spices"
                      className="w-full p-1.5 border border-emerald-400 bg-emerald-50/50 rounded-lg font-bold text-slate-900 outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
                    />
                  )}
                </div>

                {/* Price, Unit Type & Stock Quantity Grid */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-0.5 text-[11px]">Price (₹) *</label>
                    <input
                      type="number"
                      min={0.1}
                      step="any"
                      required
                      value={pricePerUnit}
                      onChange={(e) => setPricePerUnit(parseFloat(e.target.value) || 0)}
                      className="w-full p-1.5 border border-slate-300 rounded-lg font-bold text-slate-900 outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
                    />
                    {/* Quick Price Chips */}
                    <div className="flex items-center gap-1 overflow-x-auto pt-1 scrollbar-none">
                      {QUICK_PRICES.slice(0, 4).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPricePerUnit(p)}
                          className={`px-1 py-0.2 rounded text-[9px] font-extrabold border transition-colors shrink-0 ${
                            pricePerUnit === p ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          ₹{p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-0.5 text-[11px]">Unit *</label>
                    <select
                      value={selectedUnitType}
                      onChange={(e) => setSelectedUnitType(e.target.value)}
                      className="w-full p-1.5 border border-slate-300 rounded-lg font-medium outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-xs"
                    >
                      {UNIT_OPTIONS.map((u) => (
                        <option key={u.value} value={u.value}>
                          {u.value}
                        </option>
                      ))}
                    </select>

                    {/* Quick Unit Chips */}
                    <div className="flex items-center gap-1 overflow-x-auto pt-1 scrollbar-none">
                      {QUICK_UNITS.slice(0, 4).map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setSelectedUnitType(u)}
                          className={`px-1 py-0.2 rounded text-[9px] font-extrabold border transition-colors shrink-0 ${
                            selectedUnitType === u ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-0.5 text-[11px]">Stock Qty *</label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      required
                      value={stockQuantity}
                      onChange={(e) => setStockQuantity(parseFloat(e.target.value) || 0)}
                      className="w-full p-1.5 border border-slate-300 rounded-lg font-bold text-slate-900 outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
                    />
                    <div className="pt-1 flex items-center justify-between text-[9px] text-slate-500 font-medium">
                      <span>Alert &lt;</span>
                      <input
                        type="number"
                        value={minStockAlert}
                        onChange={(e) => setMinStockAlert(parseFloat(e.target.value) || 0)}
                        className="w-8 text-center p-0.2 border border-slate-300 rounded font-bold text-slate-800 text-[10px]"
                      />
                    </div>
                  </div>
                </div>

                {/* Custom Unit Input if selected */}
                {selectedUnitType === 'custom' && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-0.5 text-[11px]">Custom Unit Name *</label>
                    <input
                      type="text"
                      required
                      value={customUnitType}
                      onChange={(e) => setCustomUnitType(e.target.value)}
                      placeholder="e.g. bottle, bundle, roll"
                      className="w-full p-1.5 border border-emerald-400 bg-emerald-50/50 rounded-lg font-bold text-slate-900 outline-none text-xs"
                    />
                  </div>
                )}

                {/* Product Photo Options (Compact) */}
                <div className="space-y-1 border border-slate-200 p-2 rounded-xl bg-slate-50/70">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800 flex items-center gap-1 text-[11px]">
                      <Camera className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Product Photo</span>
                    </label>

                    {/* Mode Selector */}
                    <div className="flex items-center gap-0.5 bg-white p-0.5 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => {
                          stopCameraStream();
                          setImageTab('camera');
                        }}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold transition-all flex items-center gap-0.5 ${
                          imageTab === 'camera' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                        }`}
                      >
                        <Camera className="w-2.5 h-2.5" />
                        <span>Camera</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          stopCameraStream();
                          setImageTab('upload');
                        }}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold transition-all flex items-center gap-0.5 ${
                          imageTab === 'upload' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                        }`}
                      >
                        <Upload className="w-2.5 h-2.5" />
                        <span>Upload</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          stopCameraStream();
                          setImageTab('url');
                        }}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold transition-all flex items-center gap-0.5 ${
                          imageTab === 'url' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                        }`}
                      >
                        <Link className="w-2.5 h-2.5" />
                        <span>URL</span>
                      </button>
                    </div>
                  </div>

                  {/* Camera Tab Content */}
                  {imageTab === 'camera' && (
                    <div className="pt-0.5">
                      {!isCameraActive ? (
                        <div className="text-center p-2 bg-white rounded-lg border border-dashed border-slate-300">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={startCamera}
                              className="px-2.5 py-1 bg-emerald-600 text-white font-bold text-[10px] rounded-lg flex items-center gap-1"
                            >
                              <Camera className="w-3 h-3" />
                              <span>Open Camera</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => nativeCameraInputRef.current?.click()}
                              className="px-2 py-1 bg-slate-100 text-slate-700 font-bold text-[10px] rounded-lg"
                            >
                              Mobile Snap
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="relative rounded-lg overflow-hidden bg-slate-950">
                          <video ref={videoRef} className="w-full h-28 object-cover" playsInline muted />
                          <div className="absolute bottom-1.5 left-0 right-0 flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={capturePhoto}
                              className="px-2.5 py-0.5 bg-emerald-500 text-slate-950 font-black text-[10px] rounded-md shadow"
                            >
                              Capture
                            </button>
                            <button
                              type="button"
                              onClick={stopCameraStream}
                              className="px-2 py-0.5 bg-slate-900/90 text-white font-bold text-[10px] rounded-md"
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
                    <div className="pt-0.5">
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="cursor-pointer border border-dashed border-slate-300 bg-white p-2 rounded-lg text-center hover:border-emerald-500"
                      >
                        <Upload className="w-4 h-4 text-slate-400 mx-auto" />
                        <p className="text-[10px] font-bold text-slate-700">Click to upload photo file</p>
                      </div>
                    </div>
                  )}

                  {/* URL Tab Content */}
                  {imageTab === 'url' && (
                    <div className="pt-0.5">
                      <input
                        type="url"
                        value={image}
                        onChange={(e) => setImage(e.target.value)}
                        placeholder="https://images.unsplash.com/photo-..."
                        className="w-full p-1.5 border border-slate-300 bg-white rounded-lg font-medium outline-none text-[11px]"
                      />
                    </div>
                  )}

                  {/* Image Preview Thumbnail */}
                  {image && (
                    <div className="flex items-center gap-2 pt-0.5 bg-white p-1 rounded-lg border border-slate-200">
                      <img
                        src={image}
                        alt="Preview"
                        className="w-7 h-7 rounded-md object-cover bg-slate-100 border border-slate-200 shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80';
                        }}
                      />
                      <span className="text-[10px] font-bold text-slate-800 truncate flex-1">Photo Attached</span>
                      <button
                        type="button"
                        onClick={() => setImage('')}
                        className="p-0.5 text-rose-500 hover:bg-rose-50 rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Checkboxes: Organic, In Stock & Star Favorite */}
                <div className="flex items-center justify-between gap-2 pt-1 bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                  <label className="flex items-center gap-1.5 font-bold text-slate-700 cursor-pointer text-[11px]">
                    <input
                      type="checkbox"
                      checked={isOrganic}
                      onChange={(e) => setIsOrganic(e.target.checked)}
                      className="w-3.5 h-3.5 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <span className="flex items-center gap-0.5">
                      <Leaf className="w-3 h-3 text-emerald-600" /> Organic
                    </span>
                  </label>

                  <label className="flex items-center gap-1.5 font-bold text-slate-700 cursor-pointer text-[11px]">
                    <input
                      type="checkbox"
                      checked={inStock}
                      onChange={(e) => setInStock(e.target.checked)}
                      className="w-3.5 h-3.5 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <span>In Stock</span>
                  </label>

                  <label className="flex items-center gap-1.5 font-black text-amber-900 cursor-pointer text-[11px]">
                    <input
                      type="checkbox"
                      checked={isFavorite}
                      onChange={(e) => setIsFavorite(e.target.checked)}
                      className="w-3.5 h-3.5 text-amber-500 rounded focus:ring-amber-400"
                    />
                    <span className="flex items-center gap-0.5">
                      <Star className={`w-3 h-3 ${isFavorite ? 'fill-amber-500 text-amber-600' : 'text-slate-400'}`} /> Favorite
                    </span>
                  </label>
                </div>

                {/* Description / Notes */}
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5 text-[11px]">Notes / Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Fresh Mandi harvest"
                    className="w-full p-1.5 border border-slate-300 rounded-lg font-medium outline-none text-xs"
                  />
                </div>
              </div>

              {/* Fixed Bottom Action Bar */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    stopCameraStream();
                    setIsModalOpen(false);
                  }}
                  className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 font-bold rounded-xl text-slate-700 text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 font-extrabold rounded-xl text-white text-xs shadow-xs transition-all flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Item</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
