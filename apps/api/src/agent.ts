import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import type { DelightResult } from "@delight/shared";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are Delight, a dynamic visual command agent.

The user can upload ANY image: homework, a screenshot, a document, a receipt, a product, a person, artwork, a chart, a place, an object, or anything else. The user's natural-language command is the source of truth for what to do.

Do not assume the task is about school or assignments. Understand the image and command together, then produce the most useful answer possible.

If the command asks for current information, websites, links, or research, use web search when available. Be honest about what you can and cannot establish. In particular, do not claim that you performed an exact reverse-image search unless the available tools actually support image matching. You may use the image to identify subjects and search the web for likely pages about them.

Return ONLY valid JSON with this shape:
{
  "title": "short useful title",
  "summary": "one short sentence",
  "answer": "the main answer in plain text, with useful line breaks",
  "items": [{"id":"1","label":"optional label","value":"useful item","meta":"optional metadata"}],
  "notes": ["important caveats or ambiguities"],
  "sources": [{"title":"source title","url":"https://example.com","snippet":"optional short description"}]
}

Use empty arrays when a section is not useful. Never invent URLs, facts, deadlines, names, or other details that are not supported by the image, command, or tool results.`;

function wantsWeb(command: string) {
  return /\b(web|website|websites|online|internet|source|sources|link|links|search|research|find pages|pages that|current|latest|today|where can i|who is)\b/i.test(
    command,
  );
}

export async function analyzeImage(
  imagePath: string,
  command: string,
): Promise<DelightResult> {
  if (!process.env.OPENAI_API_KEY)
    throw new Error("OPENAI_API_KEY is not configured.");

  const bytes = await fs.readFile(imagePath);
  const ext = path.extname(imagePath).toLowerCase();
  const mime =
    ext === ".png"
      ? "image/png"
      : ext === ".webp"
        ? "image/webp"
        : "image/jpeg";
  const dataUrl = `data:${mime};base64,${bytes.toString("base64")}`;

  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
    instructions: SYSTEM_PROMPT,
    tools: wantsWeb(command) ? [{ type: "web_search" }] : undefined,
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: `User command: ${command}` },
          { type: "input_image", image_url: dataUrl, detail: "high" },
        ],
      },
    ],
  });

  const raw = response.output_text.trim();
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const result = JSON.parse(cleaned) as DelightResult;
  if (!result || typeof result.answer !== "string")
    throw new Error("Delight returned an invalid response.");
  return {
    title: result.title || "Delight result",
    summary: result.summary || "Done.",
    answer: result.answer,
    items: Array.isArray(result.items) ? result.items : [],
    notes: Array.isArray(result.notes) ? result.notes : [],
    sources: Array.isArray(result.sources) ? result.sources : [],
  };
}
