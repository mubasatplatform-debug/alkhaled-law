import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import {
  TODAY,
  addDays,
  dayName,
  formatTime,
  hasConflict,
  smartSuggest,
  OFFICE_SEED_OCC,
  type Preference,
} from "@/lib/schedule";
import type { Appointment } from "@/lib/types";

export type Occupancy = {
  date: string;
  startMin: number;
  durationMin: number;
};

export type BookingCard = {
  id: string;
  date: string;
  startMin: number;
  durationMin: number;
  kind: "video" | "review" | "followup";
  title: string;
  time: string;
  summary: string;
};

export type ChatTurn = {
  id: string;
  role: "user" | "assistant";
  content: string;
  booking?: BookingCard | null;
};

export type SlotChip = { date: string; startMin: number; label: string };

type AiJson = {
  reply?: string;
  slots?: { date: string; startMin: number; label?: string }[];
  book?: {
    date: string;
    startMin: number;
    kind?: BookingCard["kind"];
    summary?: string;
  } | null;
};

function asAppts(occ: Occupancy[]): Appointment[] {
  return occ.map((o, i) => ({
    id: `occ-${i}`,
    clientId: "occ",
    title: "",
    withLabel: "",
    time: "",
    dateLabel: "",
    date: o.date,
    startMin: o.startMin,
    durationMin: o.durationMin,
    kind: "video" as const,
    status: "confirmed" as const,
  }));
}

function parseJson(raw: string): AiJson | null {
  const trimmed = raw.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1)) as AiJson;
  } catch {
    return null;
  }
}

function preferFrom(text: string): Preference {
  if (/صباح/.test(text)) return "morning";
  if (/مساء|ليل/.test(text)) return "evening";
  return "evening";
}

function kindFrom(text: string): BookingCard["kind"] {
  if (/عقد|مراجعة|بنود/.test(text)) return "review";
  return "video";
}

function labeledSlots(occ: Occupancy[], prefer: Preference, max = 4): SlotChip[] {
  const out: SlotChip[] = [];
  for (let i = 0; i < 12 && out.length < max; i++) {
    const date = addDays(TODAY, i);
    const slots = smartSuggest(asAppts(occ), date, 30, prefer, undefined, 3);
    for (const s of slots) {
      out.push({
        date,
        startMin: s.startMin,
        label: `${dayName(date)} ${formatTime(s.startMin)}`,
      });
      if (out.length >= max) break;
    }
  }
  return out;
}

function slotFromText(text: string, slots: SlotChip[]): SlotChip | undefined {
  const hit = slots.find((s) => text.includes(s.label) || text.includes(formatTime(s.startMin)));
  if (hit) return hit;
  const m = text.match(/(\d{1,2})\s*(?::\s*(\d{2}))?\s*(ص|م)?/);
  if (!m) return undefined;
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (m[3] === "م" && h < 12) h += 12;
  if (m[3] === "ص" && h === 12) h = 0;
  if (!m[3] && h >= 1 && h <= 7) h += 12;
  const startMin = h * 60 + min;
  return (
    slots.find((s) => s.startMin === startMin) ??
    slots.find((s) => Math.abs(s.startMin - startMin) < 30)
  );
}

function consultFallback(text: string): string {
  if (/عقد|بنود|شرط|اتفاق/.test(text)) {
    return "فاهم طلبك على العقد. ابدأ بجرد الأطراف، محل الالتزام، المدة، وآلية الفسخ والتعويض — أي بند غامض يُفسَّر ضد من صاغه. احتفظ بنسخة موقعة وبكل مراسلات التعديل. التوجيه هنا عام؛ المحامي خالد يراجع الصياغة بنداً بنداً في الاستشارة المرئية ويثبّت الملاحظات قبل التوقيع.";
  }
  if (/عمل|فصل|راتب|تأمينات|موظف|استقالة|تعسف/.test(text)) {
    return "في نظام العمل السعودي الفصل يحتاج سبباً مشروعاً وإجراءً نظامياً. احتفظ بعقدك، مسيرات الراتب، وإنذار الفصل أو الاستقالة، ولا توقّع مخالصة قبل فهم أثرها. يمكن التظلّم لمكتب العمل ضمن المدد النظامية. أشرح لك المسار العام هنا، والتفاصيل تُحسم مع المستندات في الغرفة المرئية.";
  }
  if (/طلاق|نفقة|حضانة|خلع|أحوال|زواج/.test(text)) {
    return "قضايا الأحوال الشخصية تُدار وفق الأنظمة السعودية وما يثبت المصلحة — خصوصاً الحضانة والنفقة. جهّز عقد النكاح، ما يثبت الدخل، وأي اتفاقات سابقة. لا تتنازل كتابةً قبل استشارة. أعطيك تصوراً أولياً، والمحامي يضبط الطلبات والمستندات في الاستشارة المرئية.";
  }
  if (/شركة|شريك|سجل|تجاري|تأسيس|عقد تأسيس/.test(text)) {
    return "النزاع أو التأسيس التجاري يُحسم من عقد التأسيس وصلاحيات الإدارة والسجل. حدّد نسبة الحصص، قرارات الأغلبية، وقيود التنازل. أي التزام شفهي ثبّته مكتوباً. أوجّهك هنا بالخطوط العريضة، وصياغة الحماية تتم مع المحامي في الجلسة المرئية.";
  }
  if (/عقار|إيجار|إخلاء|تمليك|مساحة/.test(text)) {
    return "في الإيجار والعقار العبرة بنص العقد وتوثيقه، ومدد الإخلاء والإشعار. احتفظ بعقد الإيجار، إيصالات السداد، وأي إنذارات. لا تُخلِ العقار أو تمتنع عن السداد قبل فهم الأثر النظامي. نراجع الموقف في الاستشارة المرئية ونحدد الإجراء الأنسب.";
  }
  if (/حادث|مروري|تأمين|تعويض/.test(text)) {
    return "بعد الحادث وثّق التقرير، الصور، وبيانات الطرف الآخر وشركة التأمين. لا توقع إبراءً قبل معرفة تقدير الضرر. المسار عادةً: مطالبة التأمين ثم التسوية أو الدعوى. أرسم لك الخطوات العامة، وتقدير الموقف يتم مع المحامي في الغرفة.";
  }
  if (/استشار|موعد|حجز|أوقات|متى/.test(text)) {
    return "حاضر. الاستشارة المرئية داخل النظام — بدون برامج خارجية — ثلاثون دقيقة مع المحامي خالد. اكتب موضوعك بجملة إن أحببت، أو اختر وقتاً من الأوقات المتاحة لأحجزه الآن.";
  }
  return "فاهم موضوعك. أقدّم توجيهاً قانونياً عاماً وفق الأنظمة السعودية، من دون أن يكون بديلاً عن رأي المحامي بعد الاطلاع على المستندات. اشرح التفاصيل المتاحة، وأحجز لك استشارة مرئية داخل النظام لتثبيت الخطوة التالية.";
}

function fallbackReply(text: string, occ: Occupancy[]): AiJson {
  const prefer = preferFrom(text);
  const slots = labeledSlots(occ, prefer);
  const first = slots[0];
  const wantsBook = /احجز|حجز|موافق|أكد|نعم|ثبت|أبغى الموعد/.test(text);
  const nearest = /أقرب|الآن|بسرعة|أول وقت/.test(text);
  const picked = slotFromText(text, slots);
  const kind = kindFrom(text);

  if (wantsBook && (nearest || picked || /هذا|تمام|موافق/.test(text)) && (picked ?? first)) {
    const slot = picked ?? first;
    return {
      reply: `تم. أحجز لك ${kind === "review" ? "مراجعة العقد" : "استشارة مرئية"} ${slot.label}. التوجيه أعلاه يبقى عاماً — المحامي يراجع التفاصيل معك داخل الغرفة.`,
      slots: [],
      book: {
        date: slot.date,
        startMin: slot.startMin,
        kind,
        summary: text.slice(0, 180),
      },
    };
  }

  return {
    reply: `${consultFallback(text)} هذه أقرب الأوقات المتاحة:`,
    slots,
    book: null,
  };
}

async function loadHistory(userId: string): Promise<ChatTurn[]> {
  const sql = await getSql();
  const rows = await sql<{
    id: string;
    role: string;
    content: string;
    booked_json: string | null;
  }>`
    select id, role, content, booked_json
    from concierge_messages
    where user_id = ${userId}
    order by created_at asc
    limit 40
  `;
  return rows
    .filter((r) => r.role === "user" || r.role === "assistant")
    .map((r) => ({
      id: r.id,
      role: r.role as "user" | "assistant",
      content: r.content,
      booking: r.booked_json ? (JSON.parse(r.booked_json) as BookingCard) : null,
    }));
}

async function saveTurn(
  userId: string,
  role: "user" | "assistant",
  content: string,
  booking?: BookingCard | null,
) {
  const sql = await getSql();
  const id = `${role[0]}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  await sql`
    insert into concierge_messages (id, user_id, role, content, booked_json)
    values (
      ${id},
      ${userId},
      ${role},
      ${content},
      ${booking ? JSON.stringify(booking) : null}
    )
  `;
  return id;
}

async function insertBooking(
  userId: string,
  occ: Occupancy[],
  input: { date: string; startMin: number; kind: BookingCard["kind"]; summary: string },
): Promise<BookingCard | { error: string }> {
  const durationMin = 30;
  if (hasConflict(asAppts(occ), input.date, input.startMin, durationMin)) {
    return { error: "هذا الوقت متعارض مع موعد قائم. اختر وقتاً آخر من القائمة." };
  }
  const sql = await getSql();
  const existing = await sql<{ start_min: number; duration_min: number }>`
    select start_min, duration_min from client_bookings
    where date = ${input.date} and status <> 'cancelled'
  `;
  const taken: Occupancy[] = existing.map((r) => ({
    date: input.date,
    startMin: r.start_min,
    durationMin: r.duration_min,
  }));
  if (hasConflict(asAppts(taken), input.date, input.startMin, durationMin)) {
    return { error: "هذا الوقت لم يعد متاحاً. اختر وقتاً آخر." };
  }
  const id = `bk-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const title = input.kind === "review" ? "مراجعة عقد" : "استشارة مرئية";
  await sql`
    insert into client_bookings
      (id, user_id, date, start_min, duration_min, kind, status, title, summary)
    values (
      ${id},
      ${userId},
      ${input.date},
      ${input.startMin},
      ${durationMin},
      ${input.kind},
      ${"confirmed"},
      ${title},
      ${input.summary}
    )
  `;
  return {
    id,
    date: input.date,
    startMin: input.startMin,
    durationMin,
    kind: input.kind,
    title,
    time: formatTime(input.startMin),
    summary: input.summary,
  };
}

async function askModel(history: ChatTurn[], text: string, occ: Occupancy[]): Promise<AiJson> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return fallbackReply(text, occ);
  const slots = labeledSlots(occ, preferFrom(text));
  const slotLines = slots.map((s) => `${s.label} (${s.date} ${s.startMin})`).join(" | ");
  const messages = [
    {
      role: "system" as const,
      content: `أنت مساعد مكتب المحامي خالد العنزي في الرياض. تتحدث عربية مهنية مختصرة بلاMarkdown.

في كل رد افعل الأمرين معاً:
1) استشارة أولية عامة وفق الأنظمة السعودية (3–6 جمل عملية: ما الذي يُحفظ، الخطوة التالية، متى يلزم محامٍ). ليست بديلاً عن رأي المحامي بعد الاطلاع على المستندات.
2) حجز الاستشارة المرئية داخل النظام: الأحد–الخميس 9ص–5م، 30 دقيقة، فاصل 15د. لا تخترع موعداً خارج القائمة.

أرجع JSON فقط:
{"reply":"...","slots":[{"date":"YYYY-MM-DD","startMin":900,"label":"الثلاثاء 3:00 م"}],"book":null}

- إن وصف العميل مشكلة قانونية: أجب ثم أرجع 3–4 أوقات في slots.
- إن طلب أقرب موعد أو أكد وقتاً من القائمة: ضع book {"date","startMin","kind":"video"|"review","summary"} وslots فارغة.
- لا تحجز من دون تأكيد أو طلب صريح للحجز.
- kind=review إذا كان الموضوع عقداً، وإلا video.
الأوقات المتاحة الآن: ${slotLines || "لا خانات"}`,
    },
    ...history.slice(-8).map((t) => ({
      role: t.role as "user" | "assistant",
      content: t.content,
    })),
    { role: "user" as const, content: text },
  ];
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-4.5",
      messages,
      max_tokens: 700,
      temperature: 0.35,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) return fallbackReply(text, occ);
  const body = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const parsed = parseJson(body.choices?.[0]?.message?.content ?? "");
  if (!parsed?.reply) return fallbackReply(text, occ);
  if (!parsed.book && (!parsed.slots || parsed.slots.length === 0)) {
    parsed.slots = slots;
  }
  return parsed;
}

async function globalOcc(extra: Occupancy[]): Promise<Occupancy[]> {
  const sql = await getSql();
  const rows = await sql<{ date: string; start_min: number; duration_min: number }>`
    select date, start_min, duration_min from client_bookings where status <> 'cancelled'
  `;
  return [
    ...OFFICE_SEED_OCC,
    ...extra,
    ...rows.map((r) => ({
      date: r.date,
      startMin: r.start_min,
      durationMin: r.duration_min,
    })),
  ];
}

export const loadConcierge = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ turns: ChatTurn[] }> => {
    const turns = await loadHistory(context.userId);
    return { turns };
  });

export type SendResult = {
  turn: ChatTurn;
  slots?: SlotChip[];
};

export const sendConcierge = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { text: string; occupancy: Occupancy[] }) => input)
  .handler(async ({ data, context }): Promise<SendResult> => {
    const text = data.text.trim().slice(0, 800);
    if (!text) throw new Error("empty");
    const occupancy = await globalOcc(data.occupancy ?? []);
    const history = await loadHistory(context.userId);
    await saveTurn(context.userId, "user", text);
    const ai = await askModel(history, text, occupancy);
    let booking: BookingCard | null = null;
    if (ai.book?.date && typeof ai.book.startMin === "number") {
      const result = await insertBooking(context.userId, occupancy, {
        date: ai.book.date,
        startMin: ai.book.startMin,
        kind: ai.book.kind ?? kindFrom(text),
        summary: (ai.book.summary ?? text).slice(0, 240),
      });
      if ("error" in result) {
        ai.reply = `${ai.reply ?? ""}\n${result.error}`.trim();
        ai.slots = labeledSlots(occupancy, preferFrom(text));
      } else {
        booking = result;
      }
    }
    const slots = (ai.slots ?? []).map((s) => ({
      date: s.date,
      startMin: s.startMin,
      label: s.label ?? `${dayName(s.date)} ${formatTime(s.startMin)}`,
    }));
    const reply = (ai.reply ?? "تفضل، كيف أقدر أساعدك؟").trim();
    const id = await saveTurn(context.userId, "assistant", reply, booking);
    return { turn: { id, role: "assistant", content: reply, booking }, slots };
  });

export const confirmConciergeSlot = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { date: string; startMin: number; occupancy: Occupancy[]; summary?: string }) => input)
  .handler(async ({ data, context }): Promise<{ turn: ChatTurn }> => {
    const occupancy = await globalOcc(data.occupancy ?? []);
    const kind = kindFrom(data.summary ?? "");
    const result = await insertBooking(context.userId, occupancy, {
      date: data.date,
      startMin: data.startMin,
      kind,
      summary: (data.summary ?? "استشارة مرئية").slice(0, 240),
    });
    if ("error" in result) {
      const content = result.error;
      const id = await saveTurn(context.userId, "assistant", content);
      return { turn: { id, role: "assistant", content, booking: null } };
    }
    const content = `تم تثبيت ${result.title} يوم ${dayName(result.date)} الساعة ${result.time}. تدخل الغرفة من داخل النظام — بدون برامج خارجية.`;
    const id = await saveTurn(context.userId, "assistant", content, result);
    return { turn: { id, role: "assistant", content, booking: result } };
  });

export const listMyBookings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<BookingCard[]> => {
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      date: string;
      start_min: number;
      duration_min: number;
      kind: string;
      title: string;
      summary: string | null;
    }>`
      select id, date, start_min, duration_min, kind, title, summary
      from client_bookings
      where user_id = ${context.userId} and status <> 'cancelled'
      order by date asc, start_min asc
    `;
    return rows.map((r) => ({
      id: r.id,
      date: r.date,
      startMin: r.start_min,
      durationMin: r.duration_min,
      kind: r.kind as BookingCard["kind"],
      title: r.title,
      time: formatTime(r.start_min),
      summary: r.summary ?? "",
    }));
  });

const MAX_AUDIO_B64 = 900_000;

function audioExt(mime: string) {
  if (mime.includes("mp4") || mime.includes("m4a")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  if (mime.includes("wav")) return "wav";
  return "webm";
}

export const transcribeVoice = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { audio: string; mime: string }) => input)
  .handler(async ({ data }): Promise<{ text: string } | { error: string }> => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { error: "التفريغ الصوتي غير متاح الآن." };
    if (!data.audio || data.audio.length > MAX_AUDIO_B64) {
      return { error: "التسجيل طويل. اختصر إلى أقل من أربعين ثانية." };
    }
    const mime = data.mime.startsWith("audio/") ? data.mime.split(";")[0] : "audio/webm";
    const buf = Buffer.from(data.audio, "base64");
    if (buf.length < 600) return { error: "التسجيل قصير جداً. أعد التسجيل." };

    const blob = new Blob([buf], { type: mime });
    const file = new File([blob], `voice.${audioExt(mime)}`, { type: mime });

    const tryStt = async (url: string, extra?: Record<string, string>) => {
      const form = new FormData();
      form.append("file", file);
      form.append("language", "ar");
      if (extra) {
        for (const [k, v] of Object.entries(extra)) form.append(k, v);
      }
      return fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      });
    };

    let res = await tryStt("https://api.x.ai/v1/stt");
    if (!res.ok) {
      res = await tryStt("https://api.x.ai/v1/audio/transcriptions", { model: "whisper-1" });
    }
    if (!res.ok) return { error: "تعذّر تفريغ الصوت. أعد المحاولة أو اكتب." };
    const body = (await res.json()) as { text?: string };
    const text = (body.text ?? "").trim();
    if (!text) return { error: "لم أسمع كلاماً واضحاً. أعد التسجيل." };
    return { text: text.slice(0, 800) };
  });

export const speakConcierge = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { text: string }) => input)
  .handler(async ({ data }): Promise<{ audio: string; mime: string } | { error: string }> => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { error: "الصوت غير متاح الآن." };
    const text = data.text.trim().slice(0, 420);
    if (!text) return { error: "لا نص للتشغيل." };
    const res = await fetch("https://api.x.ai/v1/tts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text, voice_id: "eve" }),
    });
    if (!res.ok) return { error: "تعذّر تشغيل الصوت." };
    const buf = Buffer.from(await res.arrayBuffer());
    return {
      audio: buf.toString("base64"),
      mime: res.headers.get("content-type") || "audio/mpeg",
    };
  });
