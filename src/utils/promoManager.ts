export interface PromoCodeRule {
  code: string;
  type: 'percent' | 'flat';
  value: number; // percentage (e.g. 10 for 10%) or flat amount (e.g. 50 for ₹50)
  label: string;
  icon?: string;
  minSpend?: number;
}

export interface AppliedPromo {
  code: string;
  type: 'percent' | 'flat';
  value: number;
  label: string;
  minSpend?: number;
}

export const PRESET_PROMO_CODES: PromoCodeRule[] = [
  { code: 'FRESH10', type: 'percent', value: 10, label: '10% OFF Fresh Produce', icon: '🏷️', minSpend: 0 },
  { code: 'PERCENT20', type: 'percent', value: 20, label: '20% OFF Super Saver', icon: '⚡', minSpend: 200 },
  { code: 'MEGA15', type: 'percent', value: 15, label: '15% OFF Veggie Basket', icon: '🥦', minSpend: 150 },
  { code: 'WELCOME50', type: 'flat', value: 50, label: '₹50 Flat Welcome Offer', icon: '🎁', minSpend: 250 },
  { code: 'ORGANIC20', type: 'flat', value: 20, label: '₹20 Flat Organic Offer', icon: '🍃', minSpend: 100 },
  { code: 'SAVER100', type: 'flat', value: 100, label: '₹100 Flat Big Order Offer', icon: '🧺', minSpend: 500 },
];

/**
 * Resolves a typed or selected promo code string into an AppliedPromo structure.
 */
export function parsePromoCode(inputCode: string): PromoCodeRule {
  const code = inputCode.trim().toUpperCase();

  // Check preset list first
  const foundPreset = PRESET_PROMO_CODES.find((p) => p.code === code);
  if (foundPreset) {
    return foundPreset;
  }

  // Parse custom code patterns:
  // 1) Percentage patterns e.g. "15OFF", "20PERCENT", "10%", "PCT25", "SAVE15"
  const percentMatch = code.match(/(\d+)\s*(%|PCT|PERCENT|OFF)/) || code.match(/(PCT|PERCENT|OFF|SAVE|PERC)\s*(\d+)/);
  if (percentMatch) {
    const rawVal = parseInt(percentMatch[1] || percentMatch[2], 10);
    if (!isNaN(rawVal) && rawVal > 0 && rawVal <= 90) {
      return {
        code,
        type: 'percent',
        value: rawVal,
        label: `${rawVal}% OFF Custom Promo (${code})`,
        icon: '🏷️',
        minSpend: 0
      };
    }
  }

  // 2) Flat amount patterns e.g. "FLAT50", "RS30", "INR100", "50FLAT", "FLAT20"
  const flatMatch = code.match(/(FLAT|RS|INR)\s*(\d+)/) || code.match(/(\d+)\s*(FLAT|RS|INR)/);
  if (flatMatch) {
    const rawVal = parseInt(flatMatch[2] || flatMatch[1], 10);
    if (!isNaN(rawVal) && rawVal > 0) {
      return {
        code,
        type: 'flat',
        value: rawVal,
        label: `₹${rawVal} Flat Discount (${code})`,
        icon: '🎁',
        minSpend: 0
      };
    }
  }

  // Default fallback for any unrecognized custom code (e.g., "SPECIAL", "VIP", "FARM")
  return {
    code,
    type: 'percent',
    value: 10,
    label: `10% OFF Special Code (${code})`,
    icon: '✨',
    minSpend: 0
  };
}

/**
 * Calculates the exact discount based on current subtotal and applied promo rule.
 * Dynamically re-evaluates whenever subtotal changes.
 */
export function calculatePromoDiscount(promo: AppliedPromo | null, subtotal: number): {
  discount: number;
  isValid: boolean;
  errorReason: string | null;
} {
  if (!promo || subtotal <= 0) {
    return { discount: 0, isValid: true, errorReason: null };
  }

  if (promo.minSpend && subtotal < promo.minSpend) {
    return {
      discount: 0,
      isValid: false,
      errorReason: `Cart subtotal (₹${subtotal.toFixed(0)}) must be at least ₹${promo.minSpend} for ${promo.code}. Add ₹${(promo.minSpend - subtotal).toFixed(0)} more items.`
    };
  }

  let rawDiscount = 0;
  if (promo.type === 'percent') {
    rawDiscount = Math.round((subtotal * promo.value) / 100);
  } else {
    rawDiscount = promo.value;
  }

  const discount = Math.min(subtotal, Math.max(0, rawDiscount));
  return { discount, isValid: true, errorReason: null };
}
