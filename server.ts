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

  // AI Recipe & Meal Planner Endpoint using Gemini API
  app.post("/api/generate-recipe", async (req, res) => {
    try {
      const { items } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        // Fallback if API key is not configured
        return res.json({
          recipeName: "Farm Fresh Healthy Salad & Stir Fry",
          prepTime: "15 mins",
          calories: "280 kcal",
          ingredients: items?.map((i: any) => i.name) || ["Fresh Vegetables"],
          instructions: [
            "Wash all fresh farm produce thoroughly in clean running water.",
            "Chop ingredients into bite-sized pieces.",
            "Toss with olive oil, lemon juice, sea salt, and freshly cracked black pepper.",
            "Serve chilled or lightly sautéed for maximum natural flavor and nutrition."
          ],
          chefTip: "Keeping vegetables crisp preserves 90% of active vitamins and antioxidants."
        });
      }

      const ai = new GoogleGenAI({ apiKey });
      const itemNames = items?.map((i: any) => i.name).join(", ") || "fresh vegetables";

      const prompt = `You are an expert master chef and nutritionist. Based on these fresh ingredients: ${itemNames}, create a delightful, healthy, and easy-to-cook recipe.
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
        recipeName: "Quick Farm Fresh Medley",
        prepTime: "10 mins",
        calories: "220 kcal",
        ingredients: ["Fresh Produce"],
        instructions: ["Chop and lightly sauté with olive oil and herbs."],
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
