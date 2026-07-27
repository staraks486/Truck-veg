import React, { useState, useEffect } from 'react';
import { CartItem } from '../types';
import {
  Sparkles, X, ChefHat, Clock, Flame, CheckCircle2, Utensils, Lightbulb,
  Copy, Check, RefreshCw, Plus, Minus, Volume2, VolumeX, Mic, Globe, Play, Square
} from 'lucide-react';

interface AIRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
}

interface RecipeData {
  recipeName: string;
  prepTime: string;
  calories: string;
  ingredients: string[];
  instructions: string[];
  chefTip: string;
}

const LANGUAGES = [
  { id: 'English', label: 'English', langCode: 'en-US' },
  { id: 'Hindi', label: 'हिंदी (Hindi)', langCode: 'hi-IN' },
  { id: 'Hinglish', label: 'Hinglish (Mix)', langCode: 'hi-IN' },
  { id: 'Tamil', label: 'தமிழ் (Tamil)', langCode: 'ta-IN' },
  { id: 'Telugu', label: 'తెలుగు (Telugu)', langCode: 'te-IN' },
  { id: 'Marathi', label: 'मराठी (Marathi)', langCode: 'mr-IN' },
  { id: 'Gujarati', label: 'ગુજરાતી (Gujarati)', langCode: 'gu-IN' },
  { id: 'Bengali', label: 'বাংলা (Bengali)', langCode: 'bn-IN' },
  { id: 'Kannada', label: 'ಕನ್ನಡ (Kannada)', langCode: 'kn-IN' },
  { id: 'Spanish', label: 'Español', langCode: 'es-ES' },
];

const MEAL_TYPES = [
  { id: 'Curry', label: '🍛 Main Curry', desc: 'Gravy or Sabzi' },
  { id: 'Stir Fry', label: '🥗 Quick Stir Fry', desc: 'Crispy & Dry' },
  { id: 'Soup', label: '🍲 Comfort Soup', desc: 'Warm & Healthy' },
  { id: 'Snack', label: '🥪 Quick Snack', desc: '10-Min Bites' },
];

const SPICE_LEVELS = [
  { id: 'Mild', label: '🌶️ Mild' },
  { id: 'Medium', label: '🌶️🌶️ Medium' },
  { id: 'Spicy', label: '🌶️🌶️🌶️ Spicy' },
];

const COMMON_PANTRY = ['Paneer', 'Ginger-Garlic', 'Butter / Ghee', 'Fresh Cilantro', 'Green Chillies', 'Lemon Juice'];

export const AIRecipeModal: React.FC<AIRecipeModalProps> = ({ isOpen, onClose, cart }) => {
  const [loading, setLoading] = useState(false);
  const [recipe, setRecipe] = useState<RecipeData | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [selectedMealType, setSelectedMealType] = useState('Curry');
  const [selectedSpice, setSelectedSpice] = useState('Medium');
  const [selectedPantry, setSelectedPantry] = useState<string[]>(['Ginger-Garlic', 'Fresh Cilantro']);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [copied, setCopied] = useState(false);
  const [servings, setServings] = useState(2);

  // Voice narration states
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingStepIndex, setSpeakingStepIndex] = useState<number | null>(null);

  // Voice recognition states
  const [isListening, setIsListening] = useState(false);
  const [voicePantryInput, setVoicePantryInput] = useState('');

  // Stop speech synthesis when modal closes
  useEffect(() => {
    if (!isOpen && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setSpeakingStepIndex(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const togglePantryItem = (item: string) => {
    setSelectedPantry(prev =>
      prev.includes(item) ? prev.filter(p => p !== item) : [...prev, item]
    );
  };

  const toggleStep = (idx: number) => {
    setCompletedSteps(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const handleGenerateRecipe = async () => {
    // Stop any ongoing speech
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    setLoading(true);
    setCompletedSteps([]);
    setCopied(false);

    try {
      const res = await fetch('/api/generate-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(c => c.item),
          mealType: selectedMealType,
          spiceLevel: selectedSpice,
          customPantry: selectedPantry,
          language: selectedLanguage
        })
      });
      const data = await res.json();
      setRecipe(data);
    } catch (err) {
      console.error(err);
      const cartNames = cart.map(c => c.item.name);
      const allIngs = [...cartNames, ...selectedPantry];
      setRecipe({
        recipeName: `Farm Fresh Pure Veg ${selectedMealType} (${selectedLanguage})`,
        prepTime: `${10 + servings * 2} mins`,
        calories: `${180 + servings * 40} kcal`,
        ingredients: allIngs.length > 0 ? allIngs : ["Fresh Organic Produce", "Spices", "Cilantro"],
        instructions: [
          "Wash and chop all fresh vegetables into bite-sized uniform pieces.",
          `Sautéing: Heat 1 tbsp cold-pressed oil or ghee in a pan. Add cumin seeds and ${selectedSpice.toLowerCase()} spice powder.`,
          `Add ${allIngs.slice(0, 3).join(', ') || 'vegetables'} and cook covered on medium heat for 8-10 minutes.`,
          "Garnish with fresh cilantro, lemon zest, and serve hot with chapatis or rice."
        ],
        chefTip: "100% pure vegetarian cooking with fresh local produce retains maximum active nutrition and vibrant natural colors."
      });
    } finally {
      setLoading(false);
    }
  };

  // Voice Narration (Text-to-Speech)
  const handleSpeakRecipe = (textToSpeak?: string, stepIdx?: number) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert("Text-to-speech is not supported on this browser.");
      return;
    }

    if (isSpeaking && stepIdx === undefined) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setSpeakingStepIndex(null);
      return;
    }

    window.speechSynthesis.cancel();

    const langObj = LANGUAGES.find(l => l.id === selectedLanguage) || LANGUAGES[0];

    const fullText = textToSpeak || (recipe ? `${recipe.recipeName}. ${recipe.instructions.join('. ')}. Chef tip: ${recipe.chefTip}` : '');
    if (!fullText) return;

    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.lang = langObj.langCode;
    utterance.rate = 0.95;

    utterance.onstart = () => {
      setIsSpeaking(true);
      if (stepIdx !== undefined) setSpeakingStepIndex(stepIdx);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeakingStepIndex(null);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeakingStepIndex(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Voice Dictation (Speech Recognition for custom pantry items)
  const handleVoiceInput = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    const langObj = LANGUAGES.find(l => l.id === selectedLanguage) || LANGUAGES[0];
    recognition.lang = langObj.langCode;
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        setSelectedPantry(prev => Array.from(new Set([...prev, transcript.trim()])));
        setVoicePantryInput(transcript);
      }
    };

    recognition.start();
  };

  const handleCopyRecipe = () => {
    if (!recipe) return;
    const text = `🌱 ${recipe.recipeName} (100% Pure Veg - ${selectedLanguage})
⏱️ Prep: ${recipe.prepTime} | 🔥 ${recipe.calories} (Serves ${servings})

🛒 Ingredients:
${recipe.ingredients.map(i => `• ${i}`).join('\n')}

👨‍🍳 Step-by-Step Method:
${recipe.instructions.map((step, idx) => `${idx + 1}. ${step}`).join('\n')}

💡 Chef Tip: ${recipe.chefTip}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-emerald-100 relative overflow-hidden max-h-[92vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-2xl shadow-md">
              <ChefHat className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  🌱 100% Pure Veg
                </span>
                <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight mt-0.5">
                AI Recipe Generator
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto py-3.5 space-y-3.5 pr-1 scrollbar-thin">

          {/* Interactive Recipe Controls / Customizer */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-3">
            
            {/* Language Selector Dropdown Row */}
            <div className="flex items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Globe className="w-4 h-4 text-emerald-600" />
                <span>Recipe Language:</span>
              </div>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="text-xs font-black bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-lg px-2.5 py-1 outline-none cursor-pointer focus:ring-2 focus:ring-emerald-500"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.id} value={lang.id}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Meal Type Pills */}
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Dish Category:
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {MEAL_TYPES.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMealType(m.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all text-left border ${
                      selectedMealType === m.id
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Spice Level & Servings Row */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
              <div className="flex items-center gap-1">
                {SPICE_LEVELS.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSpice(s.id)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      selectedSpice === s.id
                        ? 'bg-amber-500 text-slate-950 font-black shadow-2xs'
                        : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Servings Counter */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2 py-1 rounded-lg">
                <span className="text-[10px] font-bold text-slate-500">Serves:</span>
                <button
                  onClick={() => setServings(Math.max(1, servings - 1))}
                  className="w-4 h-4 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs"
                >
                  <Minus className="w-2.5 h-2.5" />
                </button>
                <span className="text-xs font-black text-slate-800 w-3 text-center">{servings}</span>
                <button
                  onClick={() => setServings(servings + 1)}
                  className="w-4 h-4 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs"
                >
                  <Plus className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>

            {/* Pantry Staples + Voice Dictation Row */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Add Pantry Items (Click or Speak):
                </span>
                <button
                  onClick={handleVoiceInput}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                    isListening
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                  }`}
                  title="Speak ingredients to add"
                >
                  <Mic className="w-3 h-3" />
                  <span>{isListening ? 'Listening...' : 'Voice Add'}</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {COMMON_PANTRY.map(item => {
                  const isSelected = selectedPantry.includes(item);
                  return (
                    <button
                      key={item}
                      onClick={() => togglePantryItem(item)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
                        isSelected
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
                          : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-100'
                      }`}
                    >
                      {isSelected ? '✓ ' : '+ '} {item}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {!recipe && !loading && (
            <div className="text-center py-6 px-4 bg-emerald-50/60 rounded-2xl border border-emerald-100/80">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-2.5 shadow-inner text-2xl">
                🥗
              </div>
              <h4 className="font-extrabold text-slate-800 text-sm">Ready to Cook Pure Veg Delights?</h4>
              <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto">
                Generate custom 100% vegetarian recipes in <b>{selectedLanguage}</b> with voice readout.
              </p>
              <button
                onClick={handleGenerateRecipe}
                className="mt-4 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mx-auto active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Generate Recipe ({selectedLanguage})</span>
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center py-10 space-y-3">
              <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-bold text-emerald-900">
                Gemini AI is crafting your {selectedMealType.toLowerCase()} recipe in {selectedLanguage}...
              </p>
            </div>
          )}

          {recipe && !loading && (
            <div className="space-y-3.5 animate-fadeIn">
              
              {/* Recipe Header Card + Voice Audio Controls */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-4 rounded-2xl shadow-md border border-slate-800 relative">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-black text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      🌱 100% Pure Veg • {selectedLanguage}
                    </span>
                    <h4 className="text-base font-black text-white mt-1.5">{recipe.recipeName}</h4>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Voice Readout Play/Stop Button */}
                    <button
                      onClick={() => handleSpeakRecipe()}
                      className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isSpeaking
                          ? 'bg-amber-500 text-slate-950 shadow-md animate-pulse'
                          : 'bg-emerald-600/90 hover:bg-emerald-500 text-white'
                      }`}
                      title={isSpeaking ? "Stop Voice Readout" : "Listen to Full Recipe (Text-to-Speech)"}
                    >
                      {isSpeaking ? <Square className="w-4 h-4 fill-current" /> : <Volume2 className="w-4 h-4" />}
                      <span className="text-[11px] hidden sm:inline">
                        {isSpeaking ? 'Stop Voice' : 'Listen'}
                      </span>
                    </button>

                    {/* Copy Button */}
                    <button
                      onClick={handleCopyRecipe}
                      className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-1.5"
                      title="Copy Recipe"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-3 pt-2.5 border-t border-slate-700/80 text-xs font-semibold text-slate-300">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Clock className="w-3.5 h-3.5" /> {recipe.prepTime}
                  </span>
                  <span className="flex items-center gap-1 text-amber-400">
                    <Flame className="w-3.5 h-3.5" /> {recipe.calories}
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    Serves {servings} {servings === 1 ? 'person' : 'people'}
                  </span>
                </div>
              </div>

              {/* Ingredients List */}
              <div>
                <h5 className="text-xs font-black uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-emerald-600" />
                  Ingredients ({recipe.ingredients.length})
                </h5>
                <div className="flex flex-wrap gap-1.5">
                  {recipe.ingredients.map((ing, idx) => (
                    <span key={idx} className="text-xs font-medium bg-emerald-50 text-emerald-900 px-2.5 py-1 rounded-xl border border-emerald-200/80 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {ing}
                    </span>
                  ))}
                </div>
              </div>

              {/* Step-by-Step Instructions with Individual Step Voice Speaker */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Step-by-Step Method
                  </h5>
                  <span className="text-[10px] font-bold text-slate-500">
                    {completedSteps.length}/{recipe.instructions.length} completed
                  </span>
                </div>

                <div className="space-y-2">
                  {recipe.instructions.map((step, idx) => {
                    const isDone = completedSteps.includes(idx);
                    const isCurrentStepSpeaking = isSpeaking && speakingStepIndex === idx;

                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-2xl border transition-all flex items-start justify-between gap-2.5 ${
                          isDone
                            ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900 opacity-80'
                            : isCurrentStepSpeaking
                            ? 'bg-amber-50 border-amber-400 text-slate-900 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-emerald-300 text-slate-800'
                        }`}
                      >
                        <div
                          onClick={() => toggleStep(idx)}
                          className="flex items-start gap-2.5 cursor-pointer flex-1"
                        >
                          <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold transition-colors ${
                            isDone ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {isDone ? '✓' : idx + 1}
                          </div>
                          <p className={`text-xs leading-relaxed ${isDone ? 'line-through text-emerald-800' : 'font-medium'}`}>
                            {step}
                          </p>
                        </div>

                        {/* Individual Step Speaker Button */}
                        <button
                          onClick={() => handleSpeakRecipe(step, idx)}
                          className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                            isCurrentStepSpeaking
                              ? 'bg-amber-500 text-slate-950 animate-bounce'
                              : 'bg-slate-100 hover:bg-emerald-100 text-slate-500 hover:text-emerald-800'
                          }`}
                          title="Read this step out loud"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chef Tip */}
              <div className="bg-amber-50 border border-amber-200/80 p-3.5 rounded-2xl flex items-start gap-2.5">
                <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[11px] font-extrabold text-amber-900 uppercase tracking-wide">Master Chef Secret</p>
                  <p className="text-[11px] text-amber-800/90 mt-0.5 italic leading-relaxed">{recipe.chefTip}</p>
                </div>
                <button
                  onClick={() => handleSpeakRecipe(recipe.chefTip)}
                  className="p-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs transition-colors shrink-0"
                  title="Read tip out loud"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Regenerate Button */}
              <button
                onClick={handleGenerateRecipe}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 active:scale-98"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Generate New Recipe in {selectedLanguage}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
