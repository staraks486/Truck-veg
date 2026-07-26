import React, { useState } from 'react';
import { InventoryItem, CartItem } from '../types';
import { Plus, Minus, Check, Leaf, ShoppingBag, Scale } from 'lucide-react';
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

  const handleQuickPreset = (val: number, unit: 'g' | 'kg') => {
    if (isKg) {
      setWeightUnit(unit);
      setInputValue(val.toString());
    } else {
      setInputValue(val.toString());
    }
  };

  const fallbackImage = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80';

  const displayQuantityText = isKg
    ? quantityOrWeight >= 1000
      ? `${(quantityOrWeight / 1000).toFixed(quantityOrWeight % 1000 === 0 ? 0 : 3).replace(/\.?0+$/, '')} kg`
      : `${quantityOrWeight} g`
    : `${quantityOrWeight} ${item.unitType}${quantityOrWeight > 1 ? 's' : ''}`;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between group p-3 relative">
      <div>
        {/* Image & Badges */}
        <div className="relative h-28 bg-slate-100 rounded-xl overflow-hidden mb-2.5">
          <img
            src={imgError ? fallbackImage : item.image}
            alt={item.name}
            onError={() => setImgError(true)}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-60 pointer-events-none" />

          {/* Organic Badge */}
          {item.isOrganic && (
            <span className="absolute top-2 left-2 bg-emerald-600/90 backdrop-blur-xs text-white text-[9px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
              <Leaf className="w-2.5 h-2.5 text-emerald-200" /> Organic
            </span>
          )}

          {/* Unit Type Badge */}
          <span className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1">
            <Scale className="w-2.5 h-2.5 text-purple-300" /> Sold per {item.unitType}
          </span>

          {/* In Cart Indicator */}
          {existingCartItem && (
            <span className="absolute top-2 right-2 bg-purple-700 text-white text-[9px] font-black px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1">
              <Check className="w-2.5 h-2.5" /> In Cart
            </span>
          )}
        </div>

        {/* Product Title & Rate */}
        <div className="space-y-0.5">
          <h3 className="font-black text-slate-900 text-xs line-clamp-1 group-hover:text-purple-700 transition-colors">
            {item.name}
          </h3>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-medium">
              {item.origin || 'Farm Fresh'}
            </span>
            <span className="text-[10px] font-black text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded-md border border-purple-100">
              {formatCurrency(item.pricePerUnit)} / {item.unitType}
            </span>
          </div>
        </div>
      </div>

      {/* Quantity & Actions */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-2.5">
        {/* Quick Presets (100g, 250g, 500g, 1kg etc.) */}
        <div className="grid grid-cols-4 gap-1">
          {isKg ? (
            <>
              {[
                { label: '100g', val: 100, unit: 'g' as const },
                { label: '250g', val: 250, unit: 'g' as const },
                { label: '500g', val: 500, unit: 'g' as const },
                { label: '1kg', val: 1, unit: 'kg' as const }
              ].map((p) => {
                const isActive = weightUnit === p.unit && Math.abs(parsedNum - p.val) < 0.001;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => handleQuickPreset(p.val, p.unit)}
                    className={`py-1 text-[9px] font-black rounded-lg transition-all text-center ${
                      isActive
                        ? 'bg-purple-900 text-white shadow-xs scale-105'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </>
          ) : (
            <>
              {[
                { label: '1 pc', val: 1 },
                { label: '2 pcs', val: 2 },
                { label: '3 pcs', val: 3 },
                { label: '5 pcs', val: 5 }
              ].map((p) => {
                const isActive = parsedNum === p.val;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => handleQuickPreset(p.val, 'g')}
                    className={`py-1 text-[9px] font-black rounded-lg transition-all text-center ${
                      isActive
                        ? 'bg-purple-900 text-white shadow-xs scale-105'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Manual Precise Input Box with Unit Switcher */}
        <div className="space-y-1">
          {isKg && (
            <div className="flex items-center justify-between px-1">
              <span className="text-[9px] font-bold text-slate-400">Choose unit:</span>
              <div className="flex bg-slate-100 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    if (weightUnit !== 'g') {
                      setWeightUnit('g');
                      setInputValue((parsedNum * 1000).toString());
                    }
                  }}
                  className={`px-2 py-0.5 text-[9px] font-black rounded-md transition-all ${
                    weightUnit === 'g' ? 'bg-purple-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Grams (g)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (weightUnit !== 'kg') {
                      setWeightUnit('kg');
                      setInputValue((parsedNum / 1000).toFixed(3).replace(/\.?0+$/, ''));
                    }
                  }}
                  className={`px-2 py-0.5 text-[9px] font-black rounded-md transition-all ${
                    weightUnit === 'kg' ? 'bg-purple-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Kilos (kg)
                </button>
              </div>
            </div>
          )}

          <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-purple-600 focus-within:border-purple-600 transition-all">
            <input
              type="number"
              step={isKg && weightUnit === 'kg' ? "0.025" : "1"}
              min="1"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={isKg ? (weightUnit === 'g' ? "e.g. 100 or 725" : "e.g. 1.4 or 0.5") : "e.g. 2"}
              className="w-full px-2.5 py-1.5 text-xs font-black bg-transparent outline-none text-slate-900 text-center"
            />
            <div className="pr-2.5 text-[10px] font-black text-purple-700 bg-purple-50/80 h-full flex items-center px-2.5 py-1.5 border-l border-slate-200 shrink-0">
              {isKg ? weightUnit : item.unitType}
            </div>
          </div>
        </div>

        {/* Price & Add to Cart Button */}
        <div className="flex items-center justify-between pt-0.5">
          <div>
            <span className="text-[9px] text-slate-400 font-bold block uppercase">Total</span>
            <span className="text-xs font-black text-purple-900">
              {formatCurrency(computedPrice)}
            </span>
          </div>

          <button
            onClick={handleAdd}
            disabled={!item.inStock || item.stockQuantity <= 0 || quantityOrWeight <= 0}
            className={`py-1.5 px-3 rounded-xl font-black text-xs flex items-center gap-1 transition-all shadow-xs ${
              !item.inStock || item.stockQuantity <= 0 || quantityOrWeight <= 0
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : isAdded
                ? 'bg-emerald-600 text-white scale-105'
                : 'bg-purple-900 hover:bg-purple-800 text-white active:scale-95 shadow-purple-900/20'
            }`}
          >
            {isAdded ? (
              <>
                <Check className="w-3 h-3 text-emerald-200" />
                <span>Added</span>
              </>
            ) : !item.inStock || item.stockQuantity <= 0 ? (
              <span>Sold Out</span>
            ) : (
              <>
                <ShoppingBag className="w-3 h-3 text-amber-300" />
                <span>Add ({displayQuantityText})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
