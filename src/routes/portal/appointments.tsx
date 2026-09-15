import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, Sparkles, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Countdown } from "@/components/countdown";
import { listMyBookings, type BookingCard } from "@/lib/concierge";
import { useOffice } from "@/lib/store";
import { formatDateLabel, minutesUntil } from "@/lib/schedule";

export const Route = createFileRoute("/portal/appointments")({
  component: PortalAppointments,
});

function PortalAppointments() {
  const appointments = useOffice((s) => s.appointments);
  const mine = appointments.filter((a) => a.clientId === "portal-self" && !a.live && a.status !== "cancelled");
  const [remote, setRemote] = useState<BookingCard[]>([]);

  useEffect(() => {
    void listMyBookings()
      .then(setRemote)
      .catch(() => setRemote([]));
  }, [appointments.length]);

  const cards: BookingCard[] = [
    ...remote,
    ...mine
      .filter((a) => !remote.some((r) => r.date === a.date && r.startMin === a.startMin))
      .map((a) => ({
        id: a.id,
        date: a.date,
        startMin: a.startMin,
        durationMin: a.durationMin,
        kind: a.kind,
        title: a.title,
        time: a.time,
        summary: "",
      })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin);

  const next = cards.find((c) => minutesUntil(c.date, c.startMin) > -15);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">المواعيد</h1>
        <p className="text-sm text-muted">المساعد يحجز لك ويستشيرك في نفس المحادثة.</p>
      </div>

      {next && (
        <div className="rounded-3xl bg-ok p-4 shadow-card">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Clock className="size-4" />
            موعدك القادم
          </div>
          <div className="mt-1 font-medium">
            {next.title} · {next.time}
          </div>
          <div className="text-xs text-muted">
            {formatDateLabel(next.date)} · <Countdown date={next.date} startMin={next.startMin} />
          </div>
          {minutesUntil(next.date, next.startMin) <= 120 && minutesUntil(next.date, next.startMin) > 0 && (
            <p className="mt-2 text-xs font-medium text-forest">تذكير: موعدك خلال الساعتين القادمتين.</p>
          )}
          {(next.kind === "video" || next.kind === "review") && (
            <Button asChild variant="lime" className="mt-3 w-full" size="sm">
              <Link to="/consult/$id" params={{ id: next.id }} search={{ as: "client" }}>
                <Video className="size-4" />
                انضم للغرفة المرئية
              </Link>
            </Button>
          )}
        </div>
      )}

      <Link
        to="/portal"
        className="flex min-h-14 items-center gap-3 rounded-3xl border border-line bg-card p-4 shadow-card"
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-lime text-paper">
          <Sparkles className="size-5" />
        </span>
        <div className="flex-1">
          <div className="font-medium">حجز عبر المساعد</div>
          <p className="text-xs text-muted">يسألك، يستشيرك، ويثبّت الموعد.</p>
        </div>
      </Link>

      <ul className="space-y-2">
        {cards.map((a) => (
          <li key={a.id} className="rounded-3xl border border-line bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm text-muted">{formatDateLabel(a.date)}</div>
                <div className="font-medium">
                  {a.time} · {a.title}
                </div>
              </div>
              <Badge tone="ok">مؤكد</Badge>
            </div>
            {a.kind !== "followup" && (
              <Button asChild variant="outline" size="sm" className="mt-3 w-full">
                <Link to="/consult/$id" params={{ id: a.id }} search={{ as: "client" }}>
                  الغرفة المرئية
                </Link>
              </Button>
            )}
          </li>
        ))}
        {cards.length === 0 && (
          <div className="rounded-3xl border border-line bg-card px-4 py-10 text-center">
            <p className="text-sm text-muted">لا مواعيد بعد.</p>
            <Button asChild variant="lime" size="sm" className="mt-3">
              <Link to="/portal">ابدأ من المساعد</Link>
            </Button>
          </div>
        )}
      </ul>
    </div>
  );
}
