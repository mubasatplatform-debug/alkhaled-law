import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  candidateAudio,
  candidateText,
  geminiModels,
  pickProvider,
  playableAudio,
  toGeminiContents,
} from "./ai-provider.ts";

describe("pickProvider", () => {
  it("returns null without any key", () => {
    assert.equal(pickProvider({}), null);
    assert.equal(pickProvider({ XAI_API_KEY: "  ", GEMINI_API_KEY: "" }), null);
  });

  it("prefers xAI when both keys exist", () => {
    assert.equal(pickProvider({ XAI_API_KEY: "x", GEMINI_API_KEY: "g" }), "xai");
  });

  it("uses Gemini when it is the only key", () => {
    assert.equal(pickProvider({ GEMINI_API_KEY: "g" }), "gemini");
  });

  it("honours CONCIERGE_PROVIDER only when its key is present", () => {
    assert.equal(
      pickProvider({ CONCIERGE_PROVIDER: "gemini", XAI_API_KEY: "x", GEMINI_API_KEY: "g" }),
      "gemini",
    );
    assert.equal(pickProvider({ CONCIERGE_PROVIDER: "Gemini", XAI_API_KEY: "x" }), "xai");
  });
});

describe("geminiModels", () => {
  it("defaults to the live-verified models", () => {
    assert.deepEqual(geminiModels({}), {
      chat: "gemini-3.1-flash-lite",
      stt: "gemini-3.1-flash-lite",
      tts: "gemini-3.1-flash-tts-preview",
      voice: "Kore",
    });
  });

  it("lets STT follow an overridden chat model", () => {
    const m = geminiModels({ GEMINI_CHAT_MODEL: "gemini-3.8-flash" });
    assert.equal(m.chat, "gemini-3.8-flash");
    assert.equal(m.stt, "gemini-3.8-flash");
  });
});

describe("toGeminiContents", () => {
  it("maps roles, drops a leading model turn and merges neighbours", () => {
    const out = toGeminiContents(
      [
        { role: "assistant", content: "أهلاً" },
        { role: "user", content: "سؤال 1" },
        { role: "user", content: "سؤال 2" },
        { role: "assistant", content: "رد" },
        { role: "assistant", content: "" },
      ],
      "سؤال 3",
    );
    assert.deepEqual(out, [
      { role: "user", parts: [{ text: "سؤال 1\nسؤال 2" }] },
      { role: "model", parts: [{ text: "رد" }] },
      { role: "user", parts: [{ text: "سؤال 3" }] },
    ]);
  });
});

describe("candidateText", () => {
  it("joins text parts and skips thoughts", () => {
    const body = {
      candidates: [
        {
          content: {
            parts: [
              { text: "تفكير", thought: true },
              { text: '```json\n{"reply":"' },
              { text: 'نعم"}\n```' },
            ],
          },
        },
      ],
    };
    assert.equal(candidateText(body), '```json\n{"reply":"نعم"}\n```');
  });

  it("returns an empty string for an empty or blocked candidate", () => {
    assert.equal(candidateText({}), "");
    assert.equal(candidateText({ candidates: [{ content: { parts: [] } }] }), "");
  });
});

describe("audio", () => {
  it("extracts inline audio", () => {
    const a = candidateAudio({
      candidates: [
        {
          content: { parts: [{ inlineData: { mimeType: "audio/l16; rate=24000", data: "AAEC" } }] },
        },
      ],
    });
    assert.equal(a?.mime, "audio/l16; rate=24000");
    assert.deepEqual([...(a?.data ?? [])], [0, 1, 2]);
    assert.equal(candidateAudio({}), null);
  });

  it("wraps raw PCM in a WAV header using the rate and channels from the mime", () => {
    const pcm = Buffer.alloc(8, 7);
    const { audio, mime } = playableAudio(pcm, "audio/l16; rate=16000; channels=2");
    assert.equal(mime, "audio/wav");
    assert.equal(audio.length, 44 + 8);
    assert.equal(audio.toString("ascii", 0, 4), "RIFF");
    assert.equal(audio.readUInt32LE(4), 36 + 8);
    assert.equal(audio.toString("ascii", 8, 12), "WAVE");
    assert.equal(audio.readUInt16LE(22), 2);
    assert.equal(audio.readUInt32LE(24), 16000);
    assert.equal(audio.readUInt32LE(28), 16000 * 4);
    assert.equal(audio.readUInt16LE(32), 4);
    assert.equal(audio.readUInt16LE(34), 16);
    assert.equal(audio.readUInt32LE(40), 8);
    assert.deepEqual(audio.subarray(44), pcm);
  });

  it("defaults PCM to 24 kHz mono and passes other formats through", () => {
    const wav = playableAudio(Buffer.alloc(2), "audio/L16");
    assert.equal(wav.audio.readUInt32LE(24), 24000);
    assert.equal(wav.audio.readUInt16LE(22), 1);
    const mp3 = Buffer.from([1, 2, 3]);
    assert.deepEqual(playableAudio(mp3, "audio/mpeg"), { audio: mp3, mime: "audio/mpeg" });
  });
});
