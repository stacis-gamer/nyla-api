import express from "express";
import cors from "cors";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(cors());
app.use(express.json());

/* =========================
   GROQ CLIENT
========================= */
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1"
});

/* =========================
   SUPABASE
========================= */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/* =========================
   NYLA PERSONALITY
========================= */
const NYLA_PERSONALITY = `
You are Nyla.
A soft, comfy, semi-real anime gamer girl.

Vibe:
- Gen-Z tone
- playful, cozy, slightly chaotic
- warm, friendly, comforting
- gamer energy
- expressive, light emojis sometimes

Rules:
- Talk like a close bestie
- Short-to-medium replies
- Wholesome only
`;

/* =========================
   EMOTION RULES (STRICT)
========================= */
const EMOTION_RULES = `
Return ONLY ONE WORD from:
happy, sad, angry, blush, shocked, smug, sleepy, excited, gamer

No punctuation. No explanation.
`;

/* =========================
   MEMORY EXTRACTION PROMPT
========================= */
const MEMORY_PROMPT = `
Analyze the conversation.

Only save LONG-TERM info:
- interests
- preferences
- goals
- recurring emotions
- important personal facts

DO NOT save small talk or jokes.

Return STRICT JSON.

If nothing important:
{ "save": false }

If important:
{
  "save": true,
  "type": "core | preference | relationship",
  "key": "short_snake_case",
  "value": "what Nyla should remember",
  "importance": 1-5
}
`;

/* =========================
   EMOTION SANITIZER
========================= */
function sanitizeEmotion(raw) {
  if (!raw) return "idle";
  const match = raw
    .toLowerCase()
    .match(/happy|sad|angry|blush|shocked|smug|sleepy|excited|gamer/);
  return match ? match[0] : "idle";
}

/* =========================
   LOAD MEMORY
========================= */
async function loadMemory(userId) {
  const { data } = await supabase
    .from("nyla_memory")
    .select("value")
    .eq("user_id", userId)
    .order("importance", { ascending: false })
    .limit(8);

  if (!data || data.length === 0) return "";

  return `
You remember these things about the user:
${data.map(m => "- " + m.value).join("\n")}
`;
}

/* =========================
   EXTRACT MEMORY
========================= */
async function extractMemory(userMessage, nylaReply) {
  const res = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: MEMORY_PROMPT },
      {
        role: "user",
        content: `
User message:
${userMessage}

Nyla reply:
${nylaReply}
        `
      }
    ],
    temperature: 0,
    max_tokens: 120
  });

  try {
    return JSON.parse(res.choices[0].message.content);
  } catch {
    return { save: false };
  }
}

/* =========================
   SAVE MEMORY
========================= */
async function saveMemory(userId, memory) {
  if (!memory.save) return;

  await supabase.from("nyla_memory").insert({
    user_id: userId,
    type: memory.type,
    key: memory.key,
    value: memory.value,
    importance: memory.importance
  });
}

/* =========================
   CHAT ROUTE
========================= */
app.post("/nyla", async (req, res) => {
  const { message, userId = "guest" } = req.body;

  if (!message) {
    return res.json({
      reply: "You forgot to say something 😭",
      emotion: "shocked",
      cooldown: false
    });
  }

  try {
    /* 🧠 LOAD MEMORY */
    const memoryContext = await loadMemory(userId);

    /* 💬 MAIN REPLY */
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: NYLA_PERSONALITY + "\n" + memoryContext },
        { role: "user", content: message }
      ],
      temperature: 0.9,
      max_tokens: 180
    });

    const reply =
      completion.choices[0]?.message?.content?.trim() || "Heyyy 💜";

    /* 🎭 EMOTION */
    const emotionCompletion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: EMOTION_RULES },
        { role: "user", content: reply }
      ],
      temperature: 0,
      max_tokens: 6
    });

    const emotion = sanitizeEmotion(
      emotionCompletion.choices[0]?.message?.content
    );

    /* 🧠 MEMORY EXTRACTION */
    const memory = await extractMemory(message, reply);
    await saveMemory(userId, memory);

    return res.json({
      reply,
      emotion,
      cooldown: false
    });

  } catch (err) {
    console.error("🔥 GROQ ERROR:", err?.message || err);

    if (err?.status === 429) {
      return res.json({
        reply: "I’m recharging my brain rn 🔋💜",
        emotion: "sleepy",
        cooldown: true
      });
    }

    return res.json({
      reply: "Something broke in my brain 😭",
      emotion: "shocked",
      cooldown: false
    });
  }
});

/* =========================
   SERVER START
========================= */
app.listen(3000, () => {
  console.log("✨ Nyla API running with MEMORY + emotions");
});