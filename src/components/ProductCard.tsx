import React, { useState } from 'react';
import { InventoryItem, CartItem } from '../types';
import { Plus, Check, Leaf } from 'lucide-react';
import { formatCurrency } from '../utils/storageManager';

interface ProductCardProps {
  item: InventoryItem;
  cart: CartItem[];
  onAddToCart: (cartItem: CartItem) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ item, cart, onAddToCart }) => {
  const isKg = item.unitType === 'kg';
  
  // Weight unit mode: 'g' or 'kg' for kg items
  const [weightUnit, setWeightUnit] = useState<'g' | 'kg'>('g');
  const [inputValue, setInputValue] = useState<string>(isKg ? '500' : '1');
  const [isAdded, setIsAdded] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Check if this item is already in cart
  const existingCartItem = cart.find((c) => c.itemId === item.id);

  const parsedNum = parseFloat(inputValue) || 0;

  // Compute quantity in grams for kg items, or count for unit items
  const quantityOrWeight = isKg
    ? weightUnit === 'g'
      ? Math.round(parsedNum)
      : Math.round(parsedNum * 1000)
    : parsedNum;

  const computedPrice = isKg
    ? (item.pricePerUnit * quantityOrWeight) / 1000
    : item.pricePerUnit * quantityOrWeight;

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (quantityOrWeight <= 0) return;
    onAddToCart({
      itemId: item.id,
      item,
      quantityOrWeight,
      calculatedPrice: computedPrice
    });

    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1200);
  };

  const toggleWeightUnit = () => {
    if (!isKg) return;
    const newUnit = weightUnit === 'g' ? 'kg' : 'g';
    setWeightUnit(newUnit);
    if (newUnit === 'kg') {
      const kgVal = (parsedNum / 1000).toFixed(2).replace(/\.?0+$/, '');
      setInputValue(kgVal || '0.5');
    } else {
      const gVal = Math.round(parsedNum * 1000).toString();
      setInputValue(gVal || '500');
    }
  };

  const fallbackImage = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80';

  const displayQuantityText = isKg
    ? quantityOrWeight >= 1000
      ? `${(quantityOrWeight / 1000).toFixed(quantityOrWeight % 1000 === 0 ? 0 : 2).replace(/\.?0+$/, '')} kg`
      : `${quantityOrWeight} g`
    : `${quantityOrWeight} ${item.unitType}`;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-500/50 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between p-2.5 group relative">
      {/* Product Image & Badges */}
      <div>
        <div className="relative h-24 bg-slate-50 rounded-xl overflow-hidden mb-2 border border-slate-100">
          <img
            src={imgError ? fallbackImage : item.image}
            alt={item.name}
            onError={() => setImgError(true)}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />

          {/* Organic Badge */}
          {item.isOrganic && (
            <span className="absolute top-1.5 left-1.5 bg-emerald-700/90 backdrop-blur-xs text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-2xs">
              <Leaf className="w-2.5 h-2.5 text-emerald-200" /> Organic
            </span>
          )}

          {/* In Cart Badge */}
          {existingCartItem && (
            <span className="absolute top-1.5 right-1.5 bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-2xs flex items-center gap-0.5">
              <Check className="w-2.5 h-2.5" /> In Cart
            </span>
          )}
        </div>

        {/* Product Title & Rate */}
        <div className="space-y-0.5 px-0.5">
          <h3 className="font-black text-slate-900 text-xs line-clamp-1 group-hover:text-emerald-700 transition-colors">
            {item.name}
          </h3>
          <div className="text-[11px] font-black text-slate-800">
            {formatCurrency(item.pricePerUnit)} <span className="text-[10px] text-slate-400 font-normal">/ {item.unitType}</span>
          </div>
        </div>
      </div>

      {/* Action Controls - Compact & Clean */}
      <div className="mt-2 pt-2 border-t border-slate-100 space-y-1.5">
        <div className="flex items-center gap-1.5">
          {/* Quantity Input Box */}
          <div className="relative flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition-all">
            <input
              type="number"
              step={isKg && weightUnit === 'kg' ? "0.1" : "1"}
              min="1"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full px-2 py-1 text-xs font-black bg-transparent outline-none text-slate-900 text-center"
            />
            {isKg ? (
              <button
                type="button"
                onClick={toggleWeightUnit}
                className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200 px-1.5 py-1 border-l border-slate-200 shrink-0 transition-colors"
                title="Tap to switch between grams (g) and kilograms (kg)"
              >
                {weightUnit}
              </button>
            ) : (
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-1 border-l border-slate-200 shrink-0">
                {item.unitType}
              </span>
            )}
          </div>

          {/* Add Button */}
          <button
            onClick={handleAdd}
            disabled={!item.inStock || item.stockQuantity <= 0 || quantityOrWeight <= 0}
            className={`py-1 px-2.5 rounded-lg font-black text-xs flex items-center justify-center gap-1 transition-all shrink-0 ${
              !item.inStock || item.stockQuantity <= 0 || quantityOrWeight <= 0
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : isAdded
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 shadow-xs shadow-emerald-600/20'
            }`}
          >
            {isAdded ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Added</span>
              </>
            ) : !item.inStock || item.stockQuantity <= 0 ? (
              <span>Sold Out</span>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </>
            )}
          </button>
        </div>

        {/* Total Price for Selected Quantity */}
        <div className="flex items-center justify-between text-[10px] px-0.5 text-slate-500 font-medium">
          <span>{displayQuantityText}</span>
          <span className="font-black text-emerald-700">{formatCurrency(computedPrice)}</span>
        </div>
      </div>
    </div>
  );
};
