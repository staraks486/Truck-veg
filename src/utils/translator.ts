// Utility for auto-translating Indian produce and grocery item names into Hindi (Devanagari) and Punjabi (Gurmukhi)

export interface TranslationResult {
  hindi: string;
  punjabi: string;
  combined: string;
  oneLine: string;
}

interface ProduceDictionaryEntry {
  keywords: string[];
  hindi: string;
  punjabi: string;
}

const PRODUCE_DICTIONARY: ProduceDictionaryEntry[] = [
  // Daily Essentials & Veggies
  {
    keywords: ['tomato', 'tomatoes', 'tamatar'],
    hindi: 'Tamatar (टमाटर)',
    punjabi: 'Tamatar (ਟਮਾਟਰ)'
  },
  {
    keywords: ['potato', 'potatoes', 'aloo', 'alu'],
    hindi: 'Aloo (आलू)',
    punjabi: 'Aloo (ਆਲੂ)'
  },
  {
    keywords: ['onion', 'onions', 'pyaz', 'piaz'],
    hindi: 'Pyaz (प्याज़)',
    punjabi: 'Pyaz (ਪਿਆਜ਼)'
  },
  {
    keywords: ['spinach', 'palak'],
    hindi: 'Palak (पालक)',
    punjabi: 'Palak (ਪਾਲਕ)'
  },
  {
    keywords: ['ginger', 'adrak'],
    hindi: 'Adrak (अदरक)',
    punjabi: 'Adrak (ਅਦਰਕ)'
  },
  {
    keywords: ['garlic', 'lahsun', 'lehsun'],
    hindi: 'Lahsun (लहसुन)',
    punjabi: 'Lahsun (ਲਸਣ)'
  },
  {
    keywords: ['cauliflower', 'gobi', 'gobhi', 'phool gobi', 'phool gobhi'],
    hindi: 'Phool Gobhi (फूल गोभी)',
    punjabi: 'Phool Gobhi (ਫੁੱਲ ਗੋਭੀ)'
  },
  {
    keywords: ['cabbage', 'patta gobi', 'patta gobhi', 'bandh gobi'],
    hindi: 'Patta Gobhi (पत्ता गोभी)',
    punjabi: 'Band Gobhi (ਬੰਦ ਗੋਭੀ)'
  },
  {
    keywords: ['carrot', 'carrots', 'gajar'],
    hindi: 'Gajar (गाजर)',
    punjabi: 'Gajar (ਗਾਜਰ)'
  },
  {
    keywords: ['cucumber', 'kheera', 'khira'],
    hindi: 'Kheera (खीरा)',
    punjabi: 'Kheera (ਖੀਰਾ)'
  },
  {
    keywords: ['coriander', 'cilantro', 'dhaniya'],
    hindi: 'Dhaniya (धनिया)',
    punjabi: 'Dhaniya (ਧਨੀਆ)'
  },
  {
    keywords: ['chili', 'chilli', 'chillies', 'chilies', 'mirch', 'green chili', 'red chili'],
    hindi: 'Mirch (मिर्च)',
    punjabi: 'Mirch (ਮਿਰਚ)'
  },
  {
    keywords: ['capsicum', 'bell pepper', 'shimla mirch'],
    hindi: 'Shimla Mirch (शिमला मिर्च)',
    punjabi: 'Shimla Mirch (ਸ਼ਿਮਲਾ ਮਿਰਚ)'
  },
  {
    keywords: ['brinjal', 'eggplant', 'aubergine', 'baingan', 'baingain'],
    hindi: 'Baingan (बैंगन)',
    punjabi: 'Baingan (ਬੈਂਗਣ)'
  },
  {
    keywords: ['peas', 'green peas', 'matar', 'muttar'],
    hindi: 'Matar (मटर)',
    punjabi: 'Matar (ਮਟਰ)'
  },
  {
    keywords: ['radish', 'mooli', 'muli'],
    hindi: 'Mooli (मूली)',
    punjabi: 'Mooli (ਮੂਲੀ)'
  },
  {
    keywords: ['bhindi', 'lady finger', 'ladyfinger', 'okra'],
    hindi: 'Bhindi (भिंडी)',
    punjabi: 'Bhindi (ਭਿੰਡੀ)'
  },
  {
    keywords: ['bitter gourd', 'karela'],
    hindi: 'Karela (करेला)',
    punjabi: 'Karela (ਕਰੇਲਾ)'
  },
  {
    keywords: ['bottle gourd', 'lauki', 'ghia', 'giya'],
    hindi: 'Lauki (लौकी)',
    punjabi: 'Ghia / Lauki (ਘੀਆ)'
  },
  {
    keywords: ['pumpkin', 'kaddu', 'petha'],
    hindi: 'Kaddu (कद्दू)',
    punjabi: 'Kaddu (ਕੱਦੂ)'
  },
  {
    keywords: ['mint', 'pudina'],
    hindi: 'Pudina (पुदीना)',
    punjabi: 'Pudina (ਪੁਦੀਨਾ)'
  },
  {
    keywords: ['mushroom', 'mushrooms', 'khumbi'],
    hindi: 'Khumbi (मशरूम)',
    punjabi: 'Khumbi (ਮਸ਼ਰੂਮ)'
  },
  {
    keywords: ['corn', 'sweetcorn', 'sweet corn', 'bhutta', 'makki'],
    hindi: 'Makki (मक्की / भुट्टा)',
    punjabi: 'Makki (ਮੱਕੀ)'
  },
  {
    keywords: ['lemon', 'lemons', 'lime', 'nimbu'],
    hindi: 'Nimbu (नींबू)',
    punjabi: 'Nimbu (ਨੀਂਬੂ)'
  },
  {
    keywords: ['fenugreek', 'methi'],
    hindi: 'Methi (मेथी)',
    punjabi: 'Methi (ਮੇਥੀ)'
  },
  {
    keywords: ['beetroot', 'beet', 'chukandar'],
    hindi: 'Chukandar (चुकंदर)',
    punjabi: 'Chukandar (ਚੁਕੰਦਰ)'
  },
  {
    keywords: ['turnip', 'shalgam', 'salgam'],
    hindi: 'Shalgam (शलजम)',
    punjabi: 'Shalgam (ਸ਼ਲਗਮ)'
  },
  {
    keywords: ['sweet potato', 'shakarkandi'],
    hindi: 'Shakarkandi (शकरकंदी)',
    punjabi: 'Shakarkandi (ਸ਼ਕਰਕੰਦੀ)'
  },
  {
    keywords: ['sarson', 'mustard greens', 'saag'],
    hindi: 'Sarson Saag (सरसों का साग)',
    punjabi: 'Sarson da Saag (ਸਰ੍ਹੋਂ ਦਾ ਸਾਗ)'
  },

  // Fruits
  {
    keywords: ['apple', 'apples', 'seb'],
    hindi: 'Seb (सेब)',
    punjabi: 'Seb (ਸੇਬ)'
  },
  {
    keywords: ['banana', 'bananas', 'kela'],
    hindi: 'Kela (केला)',
    punjabi: 'Kela (ਕੇਲਾ)'
  },
  {
    keywords: ['mango', 'mangoes', 'aam'],
    hindi: 'Aam (आम)',
    punjabi: 'Amb (ਅੰਬ)'
  },
  {
    keywords: ['orange', 'oranges', 'santra', 'kinoo', 'kinnow'],
    hindi: 'Santra (संतरा / किन्नू)',
    punjabi: 'Santra / Kinnow (ਸੰਤਰਾ)'
  },
  {
    keywords: ['grapes', 'grape', 'angoor'],
    hindi: 'Angoor (अंगूर)',
    punjabi: 'Angoor (ਅੰਗੂਰ)'
  },
  {
    keywords: ['watermelon', 'tarbooz', 'tarbuz'],
    hindi: 'Tarbooz (तरबूज)',
    punjabi: 'Tarbooz (ਤਰਬੂਜ)'
  },
  {
    keywords: ['papaya', 'papita'],
    hindi: 'Papita (पपीता)',
    punjabi: 'Papita (ਪਪੀਤਾ)'
  },
  {
    keywords: ['pomegranate', 'anar'],
    hindi: 'Anar (अनार)',
    punjabi: 'Anar (ਅਨਾਰ)'
  },
  {
    keywords: ['guava', 'amrood', 'amrud'],
    hindi: 'Amrood (अमरूद)',
    punjabi: 'Amrood (ਅਮਰੂਦ)'
  },
  {
    keywords: ['coconut', 'nariyal'],
    hindi: 'Nariyal (नारियल)',
    punjabi: 'Nariyal (ਨਾਰੀਅਲ)'
  },
  {
    keywords: ['pineapple', 'ananas'],
    hindi: 'Ananas (अनानास)',
    punjabi: 'Ananas (ਅਨਾਨਾਸ)'
  },
  {
    keywords: ['pear', 'pears', 'nashpati'],
    hindi: 'Nashpati (नाशपाती)',
    punjabi: 'Nashpati (ਨਾਸ਼ਪਾਤੀ)'
  },
  {
    keywords: ['peach', 'peaches', 'aadoo', 'aadu'],
    hindi: 'Aadoo (आड़ू)',
    punjabi: 'Aadoo (ਆੜੂ)'
  },
  {
    keywords: ['plum', 'plums', 'aloo bukhara'],
    hindi: 'Aloo Bukhara (आलू बुखारा)',
    punjabi: 'Aloo Bukhara (ਆਲੂ ਬੁਖ਼ਾਰਾ)'
  },
  {
    keywords: ['chikoo', 'chiku', 'sapodilla'],
    hindi: 'Chikoo (चीकू)',
    punjabi: 'Chikoo (ਚੀਕੂ)'
  },
  {
    keywords: ['strawberry', 'strawberries'],
    hindi: 'Strawberry (स्ट्रॉबेरी)',
    punjabi: 'Strawberry (ਸਟ੍ਰਾਬੇਰੀ)'
  },

  // Dairy & Grocery Essentials
  {
    keywords: ['milk', 'doodh', 'dudh'],
    hindi: 'Doodh (दूध)',
    punjabi: 'Doodh (ਦੁੱਧ)'
  },
  {
    keywords: ['paneer', 'cottage cheese'],
    hindi: 'Paneer (पनीर)',
    punjabi: 'Paneer (ਪਨੀਰ)'
  },
  {
    keywords: ['curd', 'dahi', 'yogurt'],
    hindi: 'Dahi (दही)',
    punjabi: 'Dahi (ਦਹੀ)'
  },
  {
    keywords: ['butter', 'makhan', 'makkhan'],
    hindi: 'Makhan (मक्खन)',
    punjabi: 'Makhan (ਮੱਖਣ)'
  },
  {
    keywords: ['ghee'],
    hindi: 'Ghee (घी)',
    punjabi: 'Ghee (ਘਿਓ)'
  },
  {
    keywords: ['lassi'],
    hindi: 'Lassi (लस्सी)',
    punjabi: 'Lassi (ਲੱਸੀ)'
  },
  {
    keywords: ['wheat', 'flour', 'atta', 'gehun'],
    hindi: 'Atta / Gehun (आटा / गेहूं)',
    punjabi: 'Atta / Kanak (ਆਟਾ / ਕਣਕ)'
  },
  {
    keywords: ['rice', 'chawal'],
    hindi: 'Chawal (चावल)',
    punjabi: 'Chawal (ਚੌਲ)'
  },
  {
    keywords: ['sugar', 'cheeni', 'chini'],
    hindi: 'Cheeni (चीनी)',
    punjabi: 'Cheeni (ਚੀਨੀ)'
  },
  {
    keywords: ['jaggery', 'gur', 'gud'],
    hindi: 'Gur (गुड़)',
    punjabi: 'Gur (ਗੁੜ)'
  },
  {
    keywords: ['salt', 'namak', 'loon'],
    hindi: 'Namak (नमक)',
    punjabi: 'Loon / Namak (ਲੂਣ / ਨਮਕ)'
  },
  {
    keywords: ['turmeric', 'haldi'],
    hindi: 'Haldi (हल्दी)',
    punjabi: 'Haldi (ਹਲਦੀ)'
  },
  {
    keywords: ['cumin', 'jeera'],
    hindi: 'Jeera (जीरा)',
    punjabi: 'Jeera (ਜੀਰਾ)'
  },
  {
    keywords: ['oil', 'cooking oil', 'tel'],
    hindi: 'Tel (तेल)',
    punjabi: 'Tel (ਤੇਲ)'
  },
  {
    keywords: ['mustard oil', 'sarson oil'],
    hindi: 'Sarson ka Tel (सरसों का तेल)',
    punjabi: 'Sarson da Tel (ਸਰ੍ਹੋਂ ਦਾ ਤੇਲ)'
  }
];

// Helper to sanitize common descriptive words
function cleanNameForMatching(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(fresh|organic|farm|red|green|yellow|white|sweet|ripe|local|imported|daily|hygienic|premium|pure|whole|sliced|diced|raw|washed|natural)\b/gi, '')
    .trim();
}

// Helper to extract script word from parentheses e.g. "Tamatar (टमाटर)" -> "टमाटर"
export function extractScriptWord(str: string): string {
  if (!str) return '';
  const match = str.match(/\(([^)]+)\)/);
  if (match && match[1]) {
    return match[1].trim();
  }
  return str.trim();
}

/**
 * Auto-translates an item name into Hindi (Devanagari) and Punjabi (Gurmukhi).
 */
export function autoTranslateProduce(englishName: string): TranslationResult {
  if (!englishName || !englishName.trim()) {
    return {
      hindi: '',
      punjabi: '',
      combined: '',
      oneLine: ''
    };
  }

  const rawEng = englishName.trim();
  const cleaned = cleanNameForMatching(englishName);
  const words = cleaned.split(/\s+/).filter(Boolean);

  const buildOneLine = (h: string, p: string) => {
    return [rawEng, h, p].filter(Boolean).join(' / ');
  };

  // 1. Try full phrase match or keyword match
  for (const entry of PRODUCE_DICTIONARY) {
    if (entry.keywords.some(k => cleaned.includes(k) || k.includes(cleaned))) {
      const hScript = extractScriptWord(entry.hindi);
      const pScript = extractScriptWord(entry.punjabi);
      return {
        hindi: hScript,
        punjabi: pScript,
        combined: [hScript, pScript].filter(Boolean).join(' • '),
        oneLine: buildOneLine(hScript, pScript)
      };
    }
  }

  // 2. Try word-by-word match
  for (const word of words) {
    for (const entry of PRODUCE_DICTIONARY) {
      if (entry.keywords.some(k => k === word)) {
        const hScript = extractScriptWord(entry.hindi);
        const pScript = extractScriptWord(entry.punjabi);
        return {
          hindi: hScript,
          punjabi: pScript,
          combined: [hScript, pScript].filter(Boolean).join(' • '),
          oneLine: buildOneLine(hScript, pScript)
        };
      }
    }
  }

  // 3. Fallback: capitalized phonetics
  const fallbackCap = rawEng.charAt(0).toUpperCase() + rawEng.slice(1);
  return {
    hindi: `${fallbackCap}`,
    punjabi: `${fallbackCap}`,
    combined: `${fallbackCap}`,
    oneLine: buildOneLine(fallbackCap, fallbackCap)
  };
}
