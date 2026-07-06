/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { calculateBalances, generateSettlementSuggestions } from "./src/lib/settleEngine";

// Lazily initialize Gemini client so we do not crash if API key is temporarily missing
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing. Please add it in the Secrets panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for body parsing
  app.use(express.json({ limit: "15mb" }));

  // API 1: Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // API 2: Scan Receipt via Gemini Multimodal OCR
  app.post("/api/receipt/scan", async (req, res) => {
    try {
      const { imgBase64, mimeType } = req.body;
      if (!imgBase64) {
        return res.status(400).json({ error: "Missing required parameter 'imgBase64'" });
      }

      const ai = getGeminiClient();
      const imagePart = {
        inlineData: {
          mimeType: mimeType || "image/jpeg",
          data: imgBase64,
        }
      };

      const textPart = {
        text: "You are an expert OCR invoice scanner. Analyze the receipt photo, extract the store or vendor name, date (YYYY-MM-DD), category (food, travel, rent, entertainment, others), total bill amount, and individual purchase items with their costs. If values aren't clear, estimate intelligently. Format output strictly according to the requested JSON structure.",
      };

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: { parts: [imagePart, textPart] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Name of the merchant/store" },
              amount: { type: Type.NUMBER, description: "Total bill transaction amount" },
              category: { type: Type.STRING, description: "Category: food, travel, rent, entertainment, others, healthcare" },
              date: { type: Type.STRING, description: "Y-M-D date of purchase format" },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: "Product item title" },
                    amount: { type: Type.NUMBER, description: "Item price cost" }
                  },
                  required: ["name", "amount"]
                }
              }
            },
            required: ["title", "amount", "category", "date"]
          }
        }
      });

      const textOutput = response.text;
      if (!textOutput) {
        return res.status(500).json({ error: "No response text generated from model" });
      }

      const parsed = JSON.parse(textOutput.trim());
      res.json(parsed);

    } catch (err: any) {
      console.error("Receipt Scan OCR Error:", err);
      res.status(500).json({ error: err.message || "Failed to scan receipt image using Gemini OCR" });
    }
  });

  // API 3: Generate Witty Gen-Z Insights & Warnings from group expenses
  app.post("/api/gemini/insights", async (req, res) => {
    try {
      const { expenses, budget, memberNames } = req.body;
      const ai = getGeminiClient();

      const textPrompt = `Configure short bullet insights analyzing this group expenses state.
Group overall budget is ₹${budget || 0}.
The group members are: ${JSON.stringify(memberNames || {})}.
Here is the JSON of logged transactions: ${JSON.stringify(expenses || [])}.
Generate exactly 3 insights/tips. Keep them short (1-2 sentences), stylish, using modern Gen Z premium slang (clean, e.g. "Goa plans are eating up budget", "Chai spend looking suspicious"). Format as an array of structured JSON.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: textPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, description: "one of: budget, warning, tip, chill" },
                title: { type: Type.STRING, description: "Short micro title" },
                message: { type: Type.STRING, description: "Funny or premium advice / status review" }
              },
              required: ["type", "title", "message"]
            }
          }
        }
      });

      const textOutput = response.text;
      if (!textOutput) {
        return res.status(500).json({ error: "No insights received" });
      }

      res.json(JSON.parse(textOutput.trim()));
    } catch (err: any) {
      console.error("Gemini Insights Error:", err);
      res.status(500).json({ error: err.message || "Failed to fetch AI insights" });
    }
  });

  // API 4: Optimize debts & suggestions
  app.post("/api/settlements/suggest", (req, res) => {
    try {
      const { members, expenses, groupId } = req.body;
      if (!members || !expenses || !groupId) {
        return res.status(400).json({ error: "Missing parameters members, expenses, or groupId" });
      }

      const balances = calculateBalances(members, expenses);
      const suggestions = generateSettlementSuggestions(groupId, balances);
      res.json({ balances, suggestions });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Integration with Vite development middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Dispute full-stack server running securely on port ${PORT}`);
    console.log(`  > Local:            http://localhost:${PORT}`);
    console.log(`  > On Your Network:  http://127.0.0.1:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Sever startup crashed:", error);
});
