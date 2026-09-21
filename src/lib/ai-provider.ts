// Which AI backend the concierge talks to, plus the pure pieces of the Gemini
// mapping (kept free of server imports so node:test can load them directly).
//
// Selection: CONCIERGE_PROVIDER=xai|gemini wins when its key is present;
// otherwise xAI if XAI_API_KEY is set, else Gemini if GEMINI_API_KEY is set,
// else null (the concierge falls back to its rule-based replies).
//
// Gemini keys MUST come from a billed project. Google's terms let the free tier
// use prompts for training and human review, and say not to send confidential
// data there — client intake here is covered by legal professional privilege.

export type AiProvider = "xai" | "gemini";

type Env = Record<string, string | undefined>;

const has = (v: string | undefined) => Boolean(v && v.trim());

export function pickProvider(env: Env): AiProvider | null {
  const wanted = env.CONCIERGE_PROVIDER?.trim().toLowerCase();
  if (wanted === "xai" && has(env.XAI_API_KEY)) return "xai";
  if (wanted === "gemini" && has(env.GEMINI_API_KEY)) return "gemini";
  if (has(env.XAI_API_KEY)) return "xai";
  if (has(env.GEMINI_API_KEY)) return "gemini";
  return null;
}

// Verified live 2026-09-21: flash-lite returns the {reply,slots,book} JSON
// contract and transcribes webm/opus, mp4/aac and wav. gemini-3.5-transcribe
// answered 200 with empty text, so it is deliberately not the default.
export function geminiModels(env: Env) {
  const chat = env.GEMINI_CHAT_MODEL?.trim() || "gemini-3.1-flash-lite";
  return {
    chat,
    stt: env.GEMINI_STT_MODEL?.trim() || chat,
    tts: env.GEMINI_TTS_MODEL?.trim() || "gemini-3.1-flash-tts-preview",
    voice: env.GEMINI_TTS_VOICE?.trim() || "Kore",
  };
}

export type GeminiContent = { role: "user" | "model"; parts: { text: string }[] };

// Gemini wants user/model turns; merge neighbours with the same role and drop
// a leading model turn so the request always opens with the user.
export function toGeminiContents(
  history: { role: "user" | "assistant"; content: string }[],
  text: string,
): GeminiContent[] {
  const out: GeminiContent[] = [];
  for (const turn of [...history, { role: "user" as const, content: text }]) {
    const role = turn.role === "assistant" ? "model" : "user";
    if (!turn.content.trim()) continue;
    if (out.length === 0 && role === "model") continue;
    const last = out[out.length - 1];
    if (last && last.role === role) last.parts[0].text += `\n${turn.content}`;
    else out.push({ role, parts: [{ text: turn.content }] });
  }
  return out;
}

type GeminiPart = {
  text?: string;
  thought?: boolean;
  inlineData?: { mimeType?: string; data?: string };
};
export type GeminiResponse = { candidates?: { content?: { parts?: GeminiPart[] } }[] };

export function candidateText(body: GeminiResponse): string {
  const parts = body.candidates?.[0]?.content?.parts ?? [];
  return parts
    .filter((p) => !p.thought && typeof p.text === "string")
    .map((p) => p.text)
    .join("")
    .trim();
}

export function candidateAudio(body: GeminiResponse): { mime: string; data: Buffer } | null {
  const parts = body.candidates?.[0]?.content?.parts ?? [];
  const inline = parts.find((p) => p.inlineData?.data)?.inlineData;
  if (!inline?.data) return null;
  return { mime: inline.mimeType ?? "", data: Buffer.from(inline.data, "base64") };
}

// Gemini TTS answers with raw 16-bit PCM ("audio/l16; rate=24000; channels=1"),
// which browsers cannot play from a data: URL. Wrap it in a WAV header; pass
// any already-containerised format straight through.
export function playableAudio(data: Buffer, mime: string): { audio: Buffer; mime: string } {
  if (!/audio\/(l16|pcm)/i.test(mime)) return { audio: data, mime: mime || "audio/mpeg" };
  const rate = Number(/rate=(\d+)/i.exec(mime)?.[1] ?? 24000);
  const channels = Number(/channels=(\d+)/i.exec(mime)?.[1] ?? 1);
  const blockAlign = channels * 2;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * blockAlign, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return { audio: Buffer.concat([header, data]), mime: "audio/wav" };
}

export async function geminiGenerate(
  apiKey: string,
  model: string,
  body: unknown,
  timeoutMs = 25_000,
): Promise<GeminiResponse | null> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      },
    );
    if (!res.ok) return null;
    return (await res.json()) as GeminiResponse;
  } catch {
    return null;
  }
}
