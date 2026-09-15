import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUp, CalendarClock, Mic, ShieldCheck, Sparkles, Square, Video, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  confirmConciergeSlot,
  loadConcierge,
  sendConcierge,
  speakConcierge,
  transcribeVoice,
  type BookingCard,
  type ChatTurn,
  type Occupancy,
  type SlotChip,
} from "@/lib/concierge";
import { formatDateLabel } from "@/lib/schedule";
import { useOffice } from "@/lib/store";
import { cn } from "@/lib/utils";

const STARTERS = [
  "أبغى استشارة مرئية",
  "عندي عقد أبي أراجعه",
  "فُصلت من العمل وأبي أعرف حقوقي",
  "وش الأوقات المتاحة؟",
];

const MAX_REC_SEC = 40;

function occupancyOf(): Occupancy[] {
  return useOffice
    .getState()
    .appointments.filter((a) => a.status !== "cancelled")
    .map((a) => ({ date: a.date, startMin: a.startMin, durationMin: a.durationMin }));
}

function applyBooking(card: BookingCard, clientName: string) {
  const { ensurePortalClient, addAppointment } = useOffice.getState();
  const clientId = ensurePortalClient(clientName);
  addAppointment({
    id: card.id,
    clientId,
    kind: card.kind,
    date: card.date,
    startMin: card.startMin,
    durationMin: card.durationMin,
    status: "confirmed",
    requestId: card.id,
  });
}

function pickMime() {
  if (typeof MediaRecorder === "undefined") return "";
  const opts = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac"];
  return opts.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result ?? "");
      resolve(s.includes(",") ? s.slice(s.indexOf(",") + 1) : s);
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export function AiConcierge({ clientName }: { clientName: string }) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [slots, setSlots] = useState<SlotChip[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [rec, setRec] = useState<"idle" | "on" | "up">("idle");
  const [recSec, setRecSec] = useState(0);
  const [voiceErr, setVoiceErr] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const lastTopic = useRef("");
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let live = true;
    void loadConcierge()
      .then((r) => {
        if (live) setTurns(r.turns);
      })
      .catch(() => {})
      .finally(() => {
        if (live) setReady(true);
      });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, slots, busy, rec]);

  useEffect(() => {
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioRef.current?.pause();
    };
  }, []);

  const send = async (text: string) => {
    const value = text.trim();
    if (!value || busy) return;
    lastTopic.current = value;
    setDraft("");
    setVoiceErr(null);
    setBusy(true);
    setSlots([]);
    const local: ChatTurn = { id: `u-${Date.now()}`, role: "user", content: value };
    setTurns((t) => [...t, local]);
    try {
      const res = await sendConcierge({ data: { text: value, occupancy: occupancyOf() } });
      setTurns((t) => [...t, res.turn]);
      setSlots(res.slots ?? []);
      if (res.turn.booking) applyBooking(res.turn.booking, clientName);
    } catch {
      setTurns((t) => [
        ...t,
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          content: "تعذّر الرد الآن. أعد المحاولة بعد لحظات.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const finishRec = async (blob: Blob) => {
    setRec("up");
    try {
      const audio = await blobToBase64(blob);
      const out = await transcribeVoice({ data: { audio, mime: blob.type || "audio/webm" } });
      if ("error" in out) {
        setVoiceErr(out.error);
        return;
      }
      await send(out.text);
    } catch {
      setVoiceErr("تعذّر إرسال التسجيل. أعد المحاولة.");
    } finally {
      setRec("idle");
      setRecSec(0);
    }
  };

  const startRec = async () => {
    if (busy || rec !== "idle") return;
    setVoiceErr(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setVoiceErr("المتصفح لا يدعم التسجيل. اكتب رسالتك.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMime();
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      recRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        stopTracks();
        void finishRec(blob);
      };
      mr.start();
      setRec("on");
      setRecSec(0);
      const started = Date.now();
      tickRef.current = window.setInterval(() => {
        const s = Math.floor((Date.now() - started) / 1000);
        setRecSec(s);
        if (s >= MAX_REC_SEC) recRef.current?.stop();
      }, 250);
    } catch {
      setVoiceErr("يلزم السماح للمايكروفون لتسجيل صوتك.");
      stopTracks();
    }
  };

  const stopRec = () => {
    if (recRef.current && recRef.current.state !== "inactive") recRef.current.stop();
  };

  const playTurn = async (turn: ChatTurn) => {
    if (speakingId === turn.id) {
      audioRef.current?.pause();
      setSpeakingId(null);
      return;
    }
    setSpeakingId(turn.id);
    try {
      const out = await speakConcierge({ data: { text: turn.content } });
      if ("error" in out) {
        setVoiceErr(out.error);
        setSpeakingId(null);
        return;
      }
      const url = `data:${out.mime};base64,${out.audio}`;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setSpeakingId(null);
      audio.onerror = () => setSpeakingId(null);
      await audio.play();
    } catch {
      setVoiceErr("تعذّر تشغيل الصوت.");
      setSpeakingId(null);
    }
  };

  const pickSlot = async (s: SlotChip) => {
    if (busy) return;
    setBusy(true);
    setSlots([]);
    setTurns((t) => [...t, { id: `u-${Date.now()}`, role: "user", content: `احجز ${s.label}` }]);
    try {
      const res = await confirmConciergeSlot({
        data: {
          date: s.date,
          startMin: s.startMin,
          occupancy: occupancyOf(),
          summary: lastTopic.current || s.label,
        },
      });
      setTurns((t) => [...t, res.turn]);
      if (res.turn.booking) applyBooking(res.turn.booking, clientName);
    } catch {
      setTurns((t) => [
        ...t,
        { id: `e-${Date.now()}`, role: "assistant", content: "تعذّر تأكيد الموعد." },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const empty = ready && turns.length === 0;
  const recLocked = rec === "on" || rec === "up";

  return (
    <div className="flex min-h-[32rem] flex-col">
      <div className="flex-1 space-y-3">
        {!ready && (
          <div className="space-y-2">
            <div className="h-28 animate-pulse rounded-3xl bg-card" />
            <div className="h-16 w-2/3 animate-pulse rounded-2xl bg-card" />
          </div>
        )}
        {empty && (
          <div className="overflow-hidden rounded-3xl border border-line bg-card shadow-card">
            <div className="flex items-center gap-3 bg-lime px-4 py-4 text-paper">
              <img
                src="/images/lawyer.jpg"
                alt=""
                className="size-12 rounded-full object-cover ring-2 ring-paper/40"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-sm font-semibold">
                  <Sparkles className="size-3.5 text-paper" />
                  مساعد المكتب
                </div>
                <p className="text-xs text-paper/80">اكتب أو سجّل صوتك — يستشير ويحجز في نفس المحادثة</p>
              </div>
            </div>
            <div className="p-4">
              <p className="text-sm leading-relaxed text-muted">
                اكتب موضوعك أو اضغط المايك وتكلم — عقد، عمل، أحوال شخصية، أو أي نزاع. أعطيك توجيهاً أولياً، وأعرض الأوقات المتاحة لجلسة مع المحامي خالد داخل النظام.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    className="min-h-11 rounded-full border border-line bg-paper px-3.5 py-2 text-xs font-medium text-ink transition-colors hover:border-forest/40"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {turns.map((t) => (
          <div key={t.id} className="enter-soft">
            {t.role === "assistant" && (
              <div className="mb-1 flex items-center gap-2 text-xs text-muted">
                <img src="/images/lawyer.jpg" alt="" className="size-5 rounded-full object-cover" />
                مساعد المكتب
              </div>
            )}
            <div
              className={cn(
                "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                t.role === "user"
                  ? "ms-auto rounded-bl-md bg-forest text-paper"
                  : "rounded-br-md border border-line bg-card text-ink",
              )}
            >
              {t.content}
              {t.role === "assistant" && (
                <button
                  type="button"
                  onClick={() => void playTurn(t)}
                  className="mt-2 flex items-center gap-1 text-[11px] text-muted hover:text-forest"
                  aria-label="استمع للرد"
                >
                  <Volume2 className={cn("size-3.5", speakingId === t.id && "text-forest")} />
                  {speakingId === t.id ? "جارٍ التشغيل" : "استمع"}
                </button>
              )}
            </div>
            {t.booking && <BookingCardView card={t.booking} />}
          </div>
        ))}
        {slots.length > 0 && (
          <div className="max-w-[92%] space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
              <CalendarClock className="size-3.5" />
              اختر وقتاً ليثبّت الحجز
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void pickSlot(slots[0])}
                className="min-h-11 rounded-full bg-lime px-3.5 py-2 text-xs font-semibold text-paper"
              >
                أقرب موعد · {slots[0].label}
              </button>
              {slots.slice(1).map((s) => (
                <button
                  key={`${s.date}-${s.startMin}`}
                  type="button"
                  onClick={() => void pickSlot(s)}
                  className="min-h-11 rounded-full border border-line bg-card px-3.5 py-2 text-xs font-medium hover:border-forest/40"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {busy && rec !== "up" && (
          <div className="flex items-center gap-2">
            <img src="/images/lawyer.jpg" alt="" className="size-5 rounded-full object-cover" />
            <div className="flex h-9 items-center gap-1 rounded-2xl border border-line bg-card px-3">
              <span className="typing-dot size-1.5 rounded-full bg-forest" />
              <span className="typing-dot size-1.5 rounded-full bg-forest" />
              <span className="typing-dot size-1.5 rounded-full bg-forest" />
            </div>
          </div>
        )}
        <div ref={bottom} />
      </div>
      <form
        className="sticky bottom-20 z-10 mt-4 bg-cream/95 pt-2 backdrop-blur-sm"
        onSubmit={(e) => {
          e.preventDefault();
          if (!recLocked) void send(draft);
        }}
      >
        <div className="flex items-center gap-2 rounded-full border border-line bg-card p-1.5 shadow-card">
          <input
            value={
              rec === "on"
                ? `جارٍ التسجيل… 0:${String(recSec).padStart(2, "0")}`
                : rec === "up"
                  ? "جارٍ تفريغ الصوت…"
                  : draft
            }
            onChange={(e) => setDraft(e.target.value)}
            placeholder="اكتب أو سجّل سؤالك…"
            disabled={busy || recLocked}
            className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted"
          />
          <button
            type="button"
            onClick={() => (rec === "on" ? stopRec() : void startRec())}
            disabled={busy || rec === "up"}
            aria-label={rec === "on" ? "إيقاف التسجيل" : "تسجيل صوتي"}
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-full transition-colors",
              rec === "on"
                ? "rec-pulse bg-danger text-paper"
                : rec === "up"
                  ? "bg-forest/10 text-forest"
                  : "text-forest hover:bg-paper",
            )}
          >
            {rec === "on" ? <Square className="size-3.5 fill-current" /> : <Mic className="size-4" />}
          </button>
          <Button type="submit" size="icon" disabled={busy || recLocked || !draft.trim()} aria-label="إرسال">
            <ArrowUp className="size-4" />
          </Button>
        </div>
        {voiceErr && <p className="mt-2 text-center text-xs text-danger">{voiceErr}</p>}
        <p className="mt-2 flex items-center justify-center gap-1 text-center text-xs text-muted">
          <ShieldCheck className="size-3" />
          توجيه عام · الرأي النهائي في الاستشارة المرئية
        </p>
      </form>
    </div>
  );
}

function BookingCardView({ card }: { card: BookingCard }) {
  return (
    <div className="mt-2 max-w-[88%] overflow-hidden rounded-2xl border border-forest/15 bg-card shadow-card">
      <div className="bg-lime px-3.5 py-2 text-xs font-medium text-paper">تم تثبيت الموعد</div>
      <div className="p-3.5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Video className="size-4 text-forest" />
          {card.title}
        </div>
        <p className="mt-1 text-xs text-muted">
          {formatDateLabel(card.date)} · {card.time} · {card.durationMin} د
        </p>
        {card.summary && <p className="mt-2 text-xs leading-relaxed text-ink/80">{card.summary}</p>}
        <p className="mt-2 text-[11px] text-muted">تذكير داخل البوابة قبل الموعد بساعتين.</p>
        <Button asChild variant="lime" size="sm" className="mt-3 w-full">
          <Link to="/consult/$id" params={{ id: card.id }} search={{ as: "client" }}>
            دخول الغرفة المرئية
          </Link>
        </Button>
      </div>
    </div>
  );
}
