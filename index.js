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

No punctuation.
No explanation.
`;

/* =========================
   MEMORY EXTRACTION PROMPT
========================= */
const MEMORY_PROMPT = `
Analyze the conversation.

Only save LONG-TERM information:
- interests
- preferences
- goals
- recurring emotional states
- important personal facts

DO NOT save:
- small talk
- jokes
- greetings

Return STRICT JSON.

If nothing important:
{ "save": false }

If important:
{
  "save": true,
  "type": "core | preference | relationship",
  "key": "short_snake_case_identifier",
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
   MEMORY ACKNOWLEDGEMENT
========================= */
function memoryAck(memory) {
  if (!memory?.save) return "";

  const lines = [
    "okay wait— I’ll remember that 💜",
    "got it… saving this in my brain 🧠✨",
    "mmhm, noted forever 🥹💜",
    "that feels important… locking it in 🔒💜",
    "I’ll keep that in mind, promise 💫"
  ];

  return "\n\n" + lines[Math.floor(Math.random() * lines.length)];
}

/* =========================
   FORGET COMMAND DETECTOR
========================= */
function isForgetCommand(text) {
  return /forget|delete that|don'?t remember/i.test(text);
}

/* =========================
   LOAD MEMORY (EMOTION-AWARE)
========================= */
async function loadMemory(userId, emotion) {
  let query = supabase
    .from("nyla_memory")
    .select("value")
    .eq("user_id", userId);

  // Emotion-weighted recall
  if (emotion === "sad" || emotion === "sleepy") {
    query = query.order("importance", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data } = await query.limit(6);

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
   SAVE / UPDATE MEMORY
========================= */
async function saveMemory(userId, memory) {
  if (!memory.save) return;

  // Check if this memory already exists
  const { data: existing } = await supabase
    .from("nyla_memory")
    .select("id")
    .eq("user_id", userId)
    .eq("key", memory.key)
    .limit(1);

  if (existing && existing.length > 0) {
    // UPDATE existing memory
    await supabase
      .from("nyla_memory")
      .update({
        value: memory.value,
        importance: memory.importance
      })
      .eq("id", existing[0].id);
  } else {
    // INSERT new memory
    await supabase.from("nyla_memory").insert({
      user_id: userId,
      type: memory.type,
      key: memory.key,
      value: memory.value,
      importance: memory.importance
    });
  }
}

/* =========================
   FORGET LAST MEMORY
========================= */
async function forgetLastMemory(userId) {
  const { data } = await supabase
    .from("nyla_memory")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (data && data.length > 0) {
    await supabase
      .from("nyla_memory")
      .delete()
      .eq("id", data[0].id);
    return true;
  }
  return false;
}

/* =========================
   CHAT ROUTE
========================= */
app.post("/nyla", async (req, res) => {
  const { message, userId = "guest" } = req.body;

  if (!message) {
    return res.json({
      reply: "you forgot to say something 😭",
      emotion: "shocked",
      cooldown: false
    });
  }

  try {
    /* 🗑️ FORGET COMMAND */
    if (isForgetCommand(message)) {
      const removed = await forgetLastMemory(userId);
      return res.json({
        reply: removed
          ? "okay… I’ve let that go 💭"
          : "hmm… there’s nothing to forget rn 🤍",
        emotion: "sleepy",
        cooldown: false
      });
    }

    /* 💬 MAIN REPLY (with memory) */
    const memoryContext = await loadMemory(userId, "neutral");

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: NYLA_PERSONALITY + "\n" + memoryContext },
        { role: "user", content: message }
      ],
      temperature: 0.9,
      max_tokens: 180
    });

    let reply =
      completion.choices[0]?.message?.content?.trim() || "heyyy 💜";

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

    /* 🧠 MEMORY EXTRACTION + SAVE */
    const memory = await extractMemory(message, reply);
    await saveMemory(userId, memory);

    /* 💜 ACKNOWLEDGE MEMORY */
    reply += memoryAck(memory);

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
      reply: "something broke in my brain 😭",
      emotion: "shocked",
      cooldown: false
    });
  }
});

/* =========================
   SERVER START
========================= */
app.listen(3000, () => {
  console.log("✨ Nyla API running with FULL MEMORY SYSTEM");
});