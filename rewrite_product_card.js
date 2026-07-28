import fs from 'fs';
let code = fs.readFileSync('src/components/ProductCard.tsx', 'utf-8');

const newRender = `
  return (
    <div className="bg-white rounded-2xl shadow-[0_8px_20px_-8px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col justify-between p-3 min-w-[140px] border border-gray-50 shrink-0">
      <div className="relative h-28 bg-white rounded-xl overflow-hidden mb-3">
        <img
          src={imgError ? fallbackImage : item.image}
          alt={item.name}
          onError={() => setImgError(true)}
          referrerPolicy="no-referrer"
          className="w-full h-full object-contain object-center"
        />
      </div>
      <div className="space-y-1">
        <h3 className="font-bold text-gray-900 text-[13px] line-clamp-1">
          {item.name}
        </h3>
        <div className="flex items-center text-[13px]">
          <span className="font-bold text-gray-900">{formatCurrency(item.pricePerUnit)}</span>
          <span className="text-gray-500 ml-1 text-[11px]">/ {item.unitType === 'kg' ? 'kg' : item.unitType}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onAddToCart({
            itemId: item.id,
            item,
            quantityOrWeight: item.unitType === 'kg' ? 1000 : 1, // Default 1kg or 1 unit
            calculatedPrice: item.pricePerUnit
          });
          setIsAdded(true);
          setTimeout(() => setIsAdded(false), 1200);
        }}
        disabled={!item.inStock || remainingStockGramsOrUnits <= 0}
        className={\`mt-3 w-full py-2 rounded-xl font-bold text-[13px] flex items-center justify-center transition-all \${
          !item.inStock || remainingStockGramsOrUnits <= 0
            ? 'bg-gray-100 text-gray-400'
            : isAdded
            ? 'bg-[#57864B] text-white'
            : 'bg-[#639c55] hover:bg-[#57864B] text-white shadow-sm'
        }\`}
      >
        {isAdded ? 'Added' : '+ Add'}
      </button>
    </div>
  );
};
`;

const returnIndex = code.indexOf('return (');
if (returnIndex !== -1) {
  const newCode = code.substring(0, returnIndex) + newRender;
  fs.writeFileSync('src/components/ProductCard.tsx', newCode);
  console.log('Successfully replaced ProductCard.tsx render block');
} else {
  console.log('Could not find return block');
}
