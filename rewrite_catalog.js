import fs from 'fs';
let code = fs.readFileSync('src/components/CustomerCatalog.tsx', 'utf-8');

// The new render function body for CustomerCatalog
const newRender = `
  const userName = session.name || 'Guest';
  const cartBadgeCount = cart.length;

  return (
    <div className="bg-[#f9fafb] min-h-screen pb-32">
      {/* Header Area */}
      <div className="px-6 pt-12 pb-4 bg-[#f9fafb] sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[26px] font-bold text-gray-900 leading-tight">Hi, {userName} 👋</h1>
            <p className="text-[15px] text-gray-500 font-medium mt-0.5">What would you like to buy today?</p>
          </div>
          <button 
            onClick={onOpenCart}
            className="relative w-12 h-12 bg-[#f9fafb] rounded-full flex items-center justify-center border-none"
          >
            <ShoppingBag className="w-7 h-7 text-gray-800" />
            {cartBadgeCount > 0 && (
              <span className="absolute top-1 right-1 w-[18px] h-[18px] bg-[#427A38] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                {cartBadgeCount}
              </span>
            )}
          </button>
        </div>

        {/* Search Bar */}
        <div className="mt-8 relative flex items-center">
          <Search className="w-[22px] h-[22px] text-gray-400 absolute left-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for products"
            className="w-full pl-12 pr-12 py-[18px] bg-white shadow-[0_4px_20px_-8px_rgba(0,0,0,0.05)] rounded-2xl text-[16px] font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-green-500/20 transition-all border border-gray-100"
          />
          <button className="absolute right-4 text-gray-400 hover:text-gray-600">
            <Mic className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="px-6 space-y-8 mt-4">
        {/* Promotional Banner */}
        <div className="relative overflow-hidden bg-[#57864B] rounded-3xl p-6 flex items-center justify-between h-[160px] shadow-sm">
          <div className="relative z-10 w-2/3 flex flex-col justify-center h-full">
            <h2 className="text-[22px] font-bold text-white mb-1.5 tracking-tight">Fresh & Healthy</h2>
            <p className="text-[13px] text-green-50 mb-4 font-medium tracking-wide">Get 20% Off on all vegetables</p>
            <button className="bg-white text-gray-900 px-4 py-2.5 rounded-xl text-[13px] font-bold flex items-center gap-1 hover:bg-gray-50 transition-colors w-fit">
              Shop Now <ChevronRight className="w-4 h-4 ml-0.5" />
            </button>
          </div>
          <div className="absolute right-[-40px] top-[-20px] bottom-[-20px] w-[60%]">
            <img 
              src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80" 
              alt="Fresh vegetables" 
              className="w-full h-full object-cover object-left-top mask-image-gradient" 
              style={{ WebkitMaskImage: 'linear-gradient(to right, transparent, black 30%)' }}
            />
          </div>
        </div>

        {/* Categories */}
        <div>
          <h3 className="text-[20px] font-bold text-gray-900 mb-5">Categories</h3>
          <div className="flex gap-[18px] overflow-x-auto pb-2 scrollbar-none px-1 -mx-1">
            {['Fruits', 'Vegetables', 'Dairy', 'Snacks'].map((cat, i) => (
              <button 
                key={cat}
                onClick={() => setSelectedCategory(cat === 'All' ? 'All' : cat)}
                className="flex flex-col items-center gap-2.5 min-w-[80px]"
              >
                <div className="w-[84px] h-[84px] bg-white rounded-[24px] shadow-[0_8px_20px_-8px_rgba(0,0,0,0.06)] flex items-center justify-center p-3.5 hover:-translate-y-1 transition-transform border border-gray-50">
                  <img 
                    src={
                      cat === 'Fruits' ? 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=200&q=80' :
                      cat === 'Vegetables' ? 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=200&q=80' :
                      cat === 'Dairy' ? 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?auto=format&fit=crop&w=200&q=80' :
                      'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&w=200&q=80'
                    }
                    alt={cat}
                    className="w-full h-full object-contain drop-shadow-sm mix-blend-multiply"
                  />
                </div>
                <span className="text-[14px] font-bold text-gray-900">{cat}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Popular Products */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[20px] font-bold text-gray-900">Popular Products</h3>
            <button className="text-gray-500 text-[14px] font-medium hover:text-green-600 flex items-center">
              See All <ChevronRight className="w-4 h-4 ml-0.5" />
            </button>
          </div>
          
          <div className="flex gap-[18px] overflow-x-auto pb-4 scrollbar-none px-1 -mx-1">
            {filteredItems.map(item => (
              <ProductCard key={item.id} item={item} cart={cart} onAddToCart={onAddToCart} />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#f9fafb] border-t border-gray-200/60 px-8 py-3 flex items-center justify-between pb-8 z-50">
        <button className="flex flex-col items-center gap-1.5 text-[#427A38]">
          <Home className="w-7 h-7 fill-current" />
          <span className="text-[11px] font-bold">Home</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 text-gray-400 hover:text-gray-600 transition-colors">
          <OfferTag className="w-[26px] h-[26px]" />
          <span className="text-[11px] font-bold">Offers</span>
        </button>
        <button onClick={onOpenCart} className="flex flex-col items-center gap-1.5 text-gray-400 hover:text-gray-600 transition-colors relative">
          <ShoppingBag className="w-[26px] h-[26px]" />
          <span className="text-[11px] font-bold">Cart</span>
        </button>
        <button onClick={onLogout} className="flex flex-col items-center gap-1.5 text-gray-400 hover:text-gray-600 transition-colors">
          <User className="w-[26px] h-[26px]" />
          <span className="text-[11px] font-bold">Profile</span>
        </button>
      </div>
    </div>
  );
};
`;

const returnIndex = code.indexOf('return (');
if (returnIndex !== -1) {
  // Find where the function ends. Just finding the last '};'
  const newCode = code.substring(0, returnIndex) + newRender;
  fs.writeFileSync('src/components/CustomerCatalog.tsx', newCode);
  console.log('Successfully replaced CustomerCatalog.tsx render block');
} else {
  console.log('Could not find return block');
}
