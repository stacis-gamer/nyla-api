import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

app.post("/nyla", async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Missing 'message' in request body" });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: message
    });

    res.json({
      reply: response.text
    });

  } catch (err) {
    console.error("🔥 Gemini Error:", err);
    res.status(500).json({
      error: "Gemini API error",
      details: err.message
    });
  }
});

app.listen(3000, () => {
  console.log("✨ Nyla API running on Gemini 2.5 Flash");
});