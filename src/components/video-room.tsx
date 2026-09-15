import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  MessageSquare,
  StickyNote,
  MonitorUp,
  Shield,
  Clock,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useConsult } from "@/lib/use-consult";
import { formatDuration } from "@/lib/utils";
import { useOffice } from "@/lib/store";
import type { Role } from "@/lib/types";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { BrandMark } from "@/components/brand";

function MediaTile({
  stream,
  muted,
  poster,
  demoSrc,
  label,
  sub,
  mirror,
}: {
  stream: MediaStream | null;
  muted?: boolean;
  poster?: string;
  demoSrc?: string;
  label: string;
  sub?: string;
  mirror?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (stream) {
      el.srcObject = stream;
      void el.play().catch(() => undefined);
    } else {
      el.srcObject = null;
    }
  }, [stream]);

  const showDemo = !stream && demoSrc;

  return (
    <div className="relative h-full w-full overflow-hidden bg-night-panel">
      {stream ? (
        <video
          ref={ref}
          autoPlay
          playsInline
          muted={muted}
          className={`h-full w-full object-cover ${mirror ? "scale-x-[-1]" : ""}`}
        />
      ) : showDemo ? (
        <video
          src={demoSrc}
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-cover"
        />
      ) : poster ? (
        <img src={poster} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <BrandMark inverse className="size-16 opacity-40" />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-night/80 to-transparent p-4">
        <div className="text-sm font-medium text-paper">{label}</div>
        {sub && <div className="text-xs text-paper/70">{sub}</div>}
      </div>
    </div>
  );
}

function Control({
  onClick,
  danger,
  active,
  label,
  children,
}: {
  onClick: () => void;
  danger?: boolean;
  active?: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`flex size-12 items-center justify-center rounded-full transition-colors ${
        danger
          ? "bg-danger text-paper hover:bg-danger/90"
          : active
            ? "bg-paper text-ink"
            : "bg-paper/10 text-paper hover:bg-paper/20"
      }`}
    >
      {children}
    </button>
  );
}

export function VideoRoom({
  roomId,
  role,
}: {
  roomId: string;
  role: Role;
}) {
  const navigate = useNavigate();
  const { clients, requests, saveCall } = useOffice();
  const user = useCurrentUser();
  const request = requests.find((r) => r.id === roomId);
  const client = request ? clients.find((c) => c.id === request.clientId) : undefined;
  const selfId = role === "lawyer" ? "lawyer" : "client";
  const selfName =
    role === "lawyer" ? "خالد العنزي" : (user?.displayName ?? client?.name ?? "عميل");
  const otherName =
    role === "lawyer" ? (client?.name ?? "العميل") : "المحامي خالد العنزي";
  const otherPoster =
    role === "lawyer" ? client?.avatar || undefined : "/images/lawyer.jpg";

  const call = useConsult(roomId, selfId, selfName);
  const [notes, setNotes] = useState("");
  const [draft, setDraft] = useState("");
  const [panel, setPanel] = useState<"notes" | "chat">("notes");
  const [showPanel, setShowPanel] = useState(role === "lawyer");
  const messages = call.chat;
  const chat = messages;

  const endAndSave = () => {
    saveCall({
      requestId: request?.id ?? roomId,
      durationSec: call.elapsed,
      notes,
      at: "اليوم",
    });
    call.hangup();
  };

  const sendChat = () => {
    const text = draft.trim();
    if (!text) return;
    call.sendChat(text);
    setDraft("");
  };

  if (call.phase === "ended") {
    const backTo = role === "lawyer" ? "/office" : "/portal";
    return (
      <div className="flex min-h-dvh items-center justify-center bg-night px-5 text-paper">
        <div className="enter-soft w-full max-w-md rounded-3xl bg-night-panel p-8 text-center">
          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-lime text-paper">
            <Clock className="size-6" />
          </div>
          <h1 className="text-2xl font-semibold">انتهت الاستشارة</h1>
          <p className="mt-2 text-sm text-paper/70">
            المدة {formatDuration(call.elapsed)} · حُفظت الملاحظات في الملف
          </p>
          {notes.trim() && (
            <p className="mt-4 rounded-2xl bg-white/5 p-4 text-right text-sm text-paper/80">
              {notes}
            </p>
          )}
          <Button
            className="mt-6 w-full"
            variant="lime"
            onClick={() => navigate({ to: backTo })}
          >
            العودة إلى {role === "lawyer" ? "لوحة المكتب" : "بوابة العميل"}
          </Button>
        </div>
      </div>
    );
  }

  if (call.phase === "lobby" || call.phase === "connecting") {
    return (
      <div className="flex min-h-dvh flex-col bg-night text-paper">
        <header className="flex items-center justify-between px-5 py-4">
          <BrandMark inverse className="size-9" />
          <span className="text-xs text-paper/60">غرفة مشفّرة داخل النظام</span>
        </header>
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-8">
          <div className="enter-soft overflow-hidden rounded-3xl bg-night-panel aspect-[4/3]">
            <MediaTile
              stream={call.localStream}
              muted
              mirror
              poster={role === "lawyer" ? "/images/lawyer.jpg" : otherPoster}
              label="معاينة الكاميرا"
              sub={call.camError ?? "جاهز للدخول"}
            />
          </div>
          <h1 className="mt-6 text-2xl font-semibold">استشارة مرئية</h1>
          <p className="mt-1 text-sm text-paper/70">
            {otherName} · غرفة واحدة بين جوال العميل ومكتب المحامي
          </p>
          {call.camError && (
            <p className="mt-3 rounded-xl bg-white/5 px-3 py-2 text-xs text-paper/70">
              {call.camError}
            </p>
          )}
          <ul className="mt-5 space-y-2 text-sm text-paper/80">
            <li className="flex items-center gap-2">
              <Shield className="size-4 text-lime" /> الاتصال من أي جهاز — داخل النظام، بلا زووم
            </li>
            <li className="flex items-center gap-2">
              <StickyNote className="size-4 text-lime" /> الملاحظات تُحفظ تلقائياً في ملف العميل
            </li>
            <li className="flex items-center gap-2">
              <MessageSquare className="size-4 text-lime" /> محادثة نصية مرافقة أثناء الجلسة
            </li>
          </ul>
          <div className="mt-auto flex gap-2 pt-6">
            <Button
              variant="lime"
              className="flex-1"
              size="lg"
              disabled={call.phase === "connecting"}
              onClick={() => void call.join()}
            >
              {call.phase === "connecting" ? "جارٍ الدخول…" : "دخول الغرفة"}
            </Button>
            <Button
              variant="outline"
              className="shrink-0 border-white/15 text-paper hover:bg-white/10"
              onClick={() => navigate({ to: role === "lawyer" ? "/office" : "/portal" })}
            >
              لاحقاً
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const remoteLabel = call.remoteName ?? otherName;
  const remoteSub = call.peerLive
    ? "متصل مباشرة"
    : call.natFailed
      ? "تعذّر الاتصال — أعد المحاولة على شبكة أخرى"
      : call.peerSeen
        ? "جارٍ الاتصال…"
        : "بانتظار انضمام الطرف الآخر";

  return (
    <div className="flex h-dvh flex-col bg-night text-paper md:flex-row">
      <div className="relative min-h-0 flex-1">
        <MediaTile
          stream={call.remoteStream}
          poster={otherPoster}
          label={remoteLabel}
          sub={remoteSub}
        />
        <div className="absolute left-4 top-4 right-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 rounded-full bg-night/70 px-3 py-1.5 text-xs backdrop-blur-sm">
            <span className="live-dot size-2 rounded-full bg-lime" />
            <span className="tabular-nums">{formatDuration(call.elapsed)}</span>
            <span className="text-paper/50">|</span>
            <Shield className="size-3" />
            مشفّر
          </div>
          <div className="rounded-full bg-night/70 px-3 py-1.5 text-xs backdrop-blur-sm">
            {request?.number} · {request?.serviceLabel}
          </div>
        </div>
        <div className="absolute bottom-24 left-4 overflow-hidden rounded-2xl border border-white/10 shadow-lg size-28 md:bottom-8 md:size-36">
          <MediaTile
            stream={call.localStream}
            muted
            mirror
            poster={role === "lawyer" ? "/images/lawyer.jpg" : client?.avatar}
            label="أنت"
            sub={call.camOn ? undefined : "الكاميرا مغلقة"}
          />
        </div>
        <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2 px-4">
          <Control label="الميكروفون" onClick={call.toggleMic} active={!call.micOn}>
            {call.micOn ? <Mic className="size-5" /> : <MicOff className="size-5" />}
          </Control>
          <Control label="الكاميرا" onClick={call.toggleCam} active={!call.camOn}>
            {call.camOn ? <Video className="size-5" /> : <VideoOff className="size-5" />}
          </Control>
          <Control label="مشاركة الشاشة" onClick={() => void call.toggleShare()} active={call.sharing}>
            <MonitorUp className="size-5" />
          </Control>
          <Control
            label="الملاحظات"
            onClick={() => setShowPanel((v: boolean) => !v)}
            active={showPanel}
          >
            <StickyNote className="size-5" />
          </Control>
          <Control label="إنهاء" danger onClick={endAndSave}>
            <PhoneOff className="size-5" />
          </Control>
        </div>
      </div>

      {showPanel && (
        <aside className="flex h-[42%] flex-col border-t border-white/10 bg-night-panel md:h-full md:w-96 md:border-t-0 md:border-r">
          <div className="flex items-center gap-1 p-3">
            <button
              type="button"
              onClick={() => setPanel("notes")}
              className={`flex-1 rounded-full py-2 text-sm ${panel === "notes" ? "bg-white/10 text-paper" : "text-paper/60"}`}
            >
              ملاحظات الجلسة
            </button>
            <button
              type="button"
              onClick={() => setPanel("chat")}
              className={`flex-1 rounded-full py-2 text-sm ${panel === "chat" ? "bg-white/10 text-paper" : "text-paper/60"}`}
            >
              محادثة
            </button>
            <button
              type="button"
              className="md:hidden p-2 text-paper/60"
              onClick={() => setShowPanel(false)}
              aria-label="إغلاق"
            >
              <ChevronDown className="size-4" />
            </button>
          </div>
          {panel === "notes" ? (
            <div className="flex min-h-0 flex-1 flex-col p-4 pt-0">
              <p className="mb-2 text-xs text-paper/50">
                تُحفظ الملاحظات في الملف عند إنهاء المكالمة
              </p>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="بنود للنقاش، التزامات، الخطوة التالية…"
                className="min-h-0 flex-1 border-white/10 bg-white/5 text-paper placeholder:text-paper/40"
              />
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4">
                {chat.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      m.from === selfId
                        ? "ms-auto bg-lime text-paper"
                        : "bg-white/10 text-paper"
                    }`}
                  >
                    {m.text}
                  </div>
                ))}
              </div>
              <form
                className="flex gap-2 p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  sendChat();
                }}
              >
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="رسالة…"
                  className="h-11 flex-1 rounded-full border border-white/10 bg-white/5 px-4 text-sm text-paper outline-none placeholder:text-paper/40"
                />
                <Button type="submit" variant="lime" size="sm">
                  إرسال
                </Button>
              </form>
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
