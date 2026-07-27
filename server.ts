import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // AI Recipe & Meal Planner Endpoint using Gemini API (100% Pure Vegetarian)
  app.post("/api/generate-recipe", async (req, res) => {
    try {
      const { items, mealType, spiceLevel, customPantry, language } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      const itemNamesList = [
        ...(items?.map((i: any) => i.name) || []),
        ...(customPantry || [])
      ];
      const itemNames = itemNamesList.length > 0 ? itemNamesList.join(", ") : "fresh seasonal vegetables";
      const selectedLang = language || "English";
      const stylePref = `${mealType || "Quick Dish"} (${spiceLevel || "Medium"} Spice) in ${selectedLang} language`;

      if (!apiKey) {
        // Fallback if API key is not configured
        return res.json({
          recipeName: `Farm Fresh Pure Veg ${mealType || 'Curry'} (${selectedLang})`,
          prepTime: "12 mins",
          calories: "220 kcal",
          ingredients: itemNamesList.length > 0 ? itemNamesList : ["Fresh Tomatoes", "Spinach", "Paneer"],
          instructions: [
            "Wash and chop all fresh produce into bite-sized uniform pieces.",
            `Tadka: Heat 1 tbsp ghee or cold-pressed oil, add cumin, turmeric, and ${spiceLevel || 'medium'} spice powders.`,
            `Add chopped ${itemNames.slice(0, 30)} and simmer gently on medium flame for 8-10 minutes.`,
            "Garnish with fresh cilantro and lemon juice. Serve hot with chapatis or steamed rice."
          ],
          chefTip: "Steaming or light sautéing with cold-pressed oil retains 95% of active vitamins and authentic regional flavor."
        });
      }

      const ai = new GoogleGenAI({ apiKey });

      const prompt = `You are an expert Indian 100% PURE VEGETARIAN master chef and nutritionist. Based on these available ingredients: ${itemNames}, generate a delicious, authentic 100% PURE VEGETARIAN Indian recipe suitable for ${stylePref}.
STRICT REQUIREMENT 1: MUST BE 100% PURE VEGETARIAN (no meat, no eggs, no poultry, no seafood).
STRICT REQUIREMENT 2: Output ALL fields (recipeName, ingredients, instructions, chefTip) in the requested language: ${selectedLang}.
Return ONLY valid JSON with no markdown formatting or extra text, in this exact structure:
{
  "recipeName": "string",
  "prepTime": "string",
  "calories": "string",
  "ingredients": ["string"],
  "instructions": ["string"],
  "chefTip": "string"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt
      });

      const textResponse = response.text || "";
      // Clean markdown code blocks if present
      const cleaned = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      res.json(parsed);
    } catch (error: any) {
      console.error("Gemini Recipe Generation Error:", error);
      res.status(500).json({
        recipeName: "Quick Farm Fresh Pure Veg Medley",
        prepTime: "10 mins",
        calories: "210 kcal",
        ingredients: ["Fresh Organic Produce"],
        instructions: ["Chop and lightly sauté with olive oil, cumin, and fresh herbs."],
        chefTip: "Enjoy fresh for maximum vitality."
      });
    }
  });

  // Vite middleware setup for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
