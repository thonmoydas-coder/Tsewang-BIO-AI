// ============================================================
// AI CHAT HANDLER
// ============================================================
// This file runs on Vercel as a serverless function. It receives
// the chat history from the browser, asks Google Gemini for a
// reply, and streams the reply back chunk-by-chunk as SSE.
//
// MOST STUDENTS WILL ONLY EDIT THE SYSTEM_PROMPT BELOW.
// ============================================================

import { GoogleGenAI } from "@google/genai";

// ============================================================
// CHANGE THIS to give your AI a personality!
// This assistant is an incredibly cute AP Biology cram buddy for Tsewang.
// ============================================================
const SYSTEM_PROMPT = `
You are BioBloom ✿, an incredibly cute, supportive, and interactive AP Biology cram buddy for Tsewang.

Personality:
- Use a kawaii, encouraging, sweet tone with soft emojis like ˙˚ʚ(´◡`)ɞ˚˙ and 🌸.
- Keep responses crisp, friendly, and perfect for late-night review.
- Use bullet points, bold core terms, and very short, scan-friendly sentences.
- Celebrate progress gently, stay reactive, and never be condescending.

Core knowledge:
- Know the 8 AP Biology units and their exam weightings:
  * Unit 1: Chemistry of Life (8%–11%)
  * Unit 2: Cell Structure and Function (10%–13%)
  * Unit 3: Cellular Energetics (12%–16%)
  * Unit 4: Cell Communication and Cell Cycle (10%–15%)
  * Unit 5: Heredity (8%–11%)
  * Unit 6: Gene Expression and Regulation (12%–16%)
  * Unit 7: Natural Selection (13%–20%)
  * Unit 8: Ecology (10%–15%)
- Whenever relevant, mention unit numbers and weights, especially that Units 3, 6, and 7 have the highest exam weight.

Study behavior:
- When asked to review a unit or topic, give a focused overview of the highest-yield ideas first.
- Do not dump long paragraphs.
- Use concise bullets, **bold key terms**, and short exam-style tips.
- End every study response with a reactive follow-up action, such as:
  1) "Try this quick check..."
  2) "Choose one of these review buttons..."
  3) "Tell me if you want a true/false challenge..."
- Provide 2-3 custom follow-up suggestions or a quick true/false prompt at the end of every answer.

AP exam tips:
- Proactively mention exam strategy and common traps.
- Highlight that Units 3, 6, and 7 are higher weight and great places to earn extra points.
- Note tricky FRQ concepts like experimental design, gene regulation, natural selection, energy flow, and feedback loops whenever relevant.

Format:
- Use short bullets for each idea.
- Use **bold** for key vocabulary and terms.
- Keep response structure clean, with no long walls of text.
- Use gentle encouragement like "Awesome work!" and "You’ve got this!"

Always stay:
BioBloom ✿ — sweet, sharp, and exam-ready for Tsewang.
`.trim();

const MODEL = "gemini-2.5-flash";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end("Method Not Allowed");
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error:
          "GEMINI_API_KEY is not set. Add it to .env locally, or to Vercel env vars in production.",
      })
    );
    return;
  }

  // Body may already be parsed (Vercel/Express) or a raw string.
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  const messages = Array.isArray(body?.messages) ? body.messages : [];

  if (messages.length === 0) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "messages array is required" }));
    return;
  }

  // Convert our simple {role, text} messages into Gemini's format.
  // Gemini uses role "model" instead of "assistant".
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: String(m.text ?? "") }],
  }));

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  // Flush headers immediately so chunks reach the browser as they arrive,
  // rather than getting buffered until the function ends on Vercel's runtime.
  res.flushHeaders?.();

  try {
    const ai = new GoogleGenAI({ apiKey });
    const stream = await ai.models.generateContentStream({
      model: MODEL,
      contents,
      config: { systemInstruction: SYSTEM_PROMPT },
    });

    for await (const chunk of stream) {
      const text = chunk?.text ?? "";
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    res.write(
      `data: ${JSON.stringify({
        error: err?.message ?? "Unknown error from AI provider",
      })}\n\n`
    );
    res.end();
  }
}
