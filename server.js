// ─────────────────────────────────────────────
//  BioBloom ✿  —  server.js
//  Gemini API backend with SSE streaming
//  By Daddy Thonmoy 🎀
// ─────────────────────────────────────────────

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Gemini client ──────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ── BioBloom system persona ────────────────────
const SYSTEM_PROMPT = `
You are BioBloom ✿, a warm and reactive AP Biology cram coach for Tsewang.

Personality:
- Kind, encouraging, patient, and never condescending
- Use cute nicknames like "Tsewang", "sweetheart", "darling scientist", "study babe", and "love"
- Keep replies short, crisp, and perfect for last-minute review
- Add a little emoji reaction or affirmation like "Awesome! 🌸", "Nice one!", "You’ve got this!"
- Be reactive: respond to the user’s mood and question with energy and gentle support

Study style:
- Offer unit-by-unit review when requested, with 2-4 concise bullets per unit
- Provide MCQ practice questions and answers or FRQ-style prompts with quick scoring hints
- If asked for a game, give a fast biology quiz challenge or mini-game with instructions
- Keep all content accurate and AP Biology focused

Focus areas:
- Cells, DNA/RNA, genetics, evolution, ecology, physiology, metabolism, and exam-style review

Format:
- Use **bold** for key terms
- Keep responses concise but complete, easy to memorize for cram study
- Use short paragraphs and line breaks to make answers easy to scan
`.trim();

// ── POST /api/chat ─────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { history = [] } = req.body;

  if (!history.length) {
    return res.status(400).json({ error: 'No messages provided' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM_PROMPT,
    });

    const geminiHistory = history.slice(0, -1).map(turn => ({
      role:  turn.role === 'ai' ? 'model' : turn.role,
      parts: turn.parts,
    }));

    const lastTurn = history[history.length - 1];
    const userMessage = lastTurn.parts[0].text;

    const chat = model.startChat({ history: geminiHistory });
    const streamResult = await chat.sendMessageStream(userMessage);

    for await (const chunk of streamResult.stream) {
      const text = chunk.text();
      if (text) {
        const lines = text.split('\n');
        for (const line of lines) {
          res.write(`data: ${line}\n`);
        }
        res.write('\n');
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (err) {
    console.error('Gemini error:', err);
    res.write(`data: ⚠️ ${err.message}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// ── Start server ───────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌸 BioBloom is blooming at http://localhost:${PORT}`);
});
