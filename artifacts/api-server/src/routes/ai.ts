import { Router } from "express";
import { requireAuth } from "../lib/auth.js";

const router = Router();

const AI_BASE_URL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ?? "";
const AI_API_KEY = process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? "";

async function chat(system: string, user: string): Promise<string> {
  const resp = await fetch(`${AI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: 150,
    }),
  });
  if (!resp.ok) throw new Error(`AI API error: ${resp.status}`);
  const data = await resp.json() as any;
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

// POST /api/ai/adventure-speak
router.post("/adventure-speak", requireAuth, async (req, res) => {
  try {
    const { plainText } = req.body;
    if (!plainText) { res.status(400).json({ error: "plainText required" }); return; }
    const result = await chat(
      "You are a fantasy RPG narrator. Transform plain household chores into epic quest titles. Keep it under 10 words. Be dramatic and fun. Return ONLY the quest title, nothing else.",
      plainText
    );
    res.json({ adventureText: result });
  } catch {
    res.status(500).json({ error: "AI unavailable" });
  }
});

// POST /api/ai/project-breakdown
router.post("/project-breakdown", requireAuth, async (req, res) => {
  try {
    const { projectName, description } = req.body;
    if (!projectName) { res.status(400).json({ error: "projectName required" }); return; }
    const result = await chat(
      "You are a fantasy RPG quest designer. Break down a project into 3-5 individual quest tasks. Return a JSON array of objects with fields: plainTitle, adventureTitle, difficulty (easy/normal/hard/epic). Return ONLY valid JSON.",
      `Project: ${projectName}\n${description ?? ""}`
    );
    let tasks = [];
    try { tasks = JSON.parse(result); } catch { tasks = []; }
    res.json({ tasks });
  } catch {
    res.status(500).json({ error: "AI unavailable" });
  }
});

// POST /api/ai/suggest-difficulty
router.post("/suggest-difficulty", requireAuth, async (req, res) => {
  try {
    const { taskDescription } = req.body;
    if (!taskDescription) { res.status(400).json({ error: "taskDescription required" }); return; }
    const result = await chat(
      "You are a quest difficulty rater. Given a household chore or task, rate its difficulty as one of: easy, normal, hard, epic. Return ONLY the single word.",
      taskDescription
    );
    const difficulty = ["easy","normal","hard","epic"].includes(result.toLowerCase())
      ? result.toLowerCase() : "normal";
    res.json({ difficulty });
  } catch {
    res.status(500).json({ error: "AI unavailable" });
  }
});

export default router;
