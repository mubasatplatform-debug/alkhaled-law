import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  BUFFER_CHOICES,
  clockLabel,
  describeOfficeHours,
  SLOT_MIN,
  WEEKDAY_NAMES,
  type OfficeHours,
} from "@/lib/office-hours";
import { useOfficeHours } from "@/lib/office-hours-api";
import { cn } from "@/lib/utils";

// Half-hour steps across the whole day, shared by the start and end selects.
const TIMES = Array.from({ length: (24 * 60) / SLOT_MIN + 1 }, (_, i) => i * SLOT_MIN);

export function OfficeHoursForm() {
  const { hours, save } = useOfficeHours();
  const [draft, setDraft] = useState<OfficeHours>(hours);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  // Adopt the saved hours when they arrive, unless the form is mid-edit.
  useEffect(() => {
    if (!touched) setDraft(hours);
  }, [hours, touched]);

  const update = (patch: Partial<OfficeHours>) => {
    setTouched(true);
    setStatus(null);
    setDraft((d) => ({ ...d, ...patch }));
  };

  const toggleDay = (day: number) =>
    update({
      workDays: draft.workDays.includes(day)
        ? draft.workDays.filter((d) => d !== day)
        : [...draft.workDays, day].sort((a, b) => a - b),
    });

  const submit = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const res = await save(draft);
      if (res.ok) {
        setTouched(false);
        setStatus({ ok: true, text: "حُفظت ساعات العمل، ويعتمدها الحجز والمساعد من الآن." });
      } else {
        setStatus({ ok: false, text: res.error });
      }
    } catch {
      setStatus({ ok: false, text: "تعذّر الحفظ. حاول مرة أخرى." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 space-y-4">
      <p className="text-sm text-muted">{describeOfficeHours(hours)}</p>

      <fieldset>
        <legend className="text-xs font-medium text-muted">أيام العمل</legend>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {WEEKDAY_NAMES.map((name, day) => {
            const on = draft.workDays.includes(day);
            return (
              <button
                key={name}
                type="button"
                aria-pressed={on}
                onClick={() => toggleDay(day)}
                className={cn(
                  "h-9 rounded-full border px-3 text-sm",
                  on
                    ? "border-forest bg-forest text-paper"
                    : "border-line text-muted hover:bg-tile",
                )}
              >
                {name}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid grid-cols-3 gap-3">
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted">البداية</span>
          <select
            value={draft.startMin}
            onChange={(e) => update({ startMin: Number(e.target.value) })}
            className="h-10 w-full rounded-xl border border-line bg-paper px-2 text-sm"
          >
            {TIMES.slice(0, -1).map((t) => (
              <option key={t} value={t}>
                {clockLabel(t)}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted">النهاية</span>
          <select
            value={draft.endMin}
            onChange={(e) => update({ endMin: Number(e.target.value) })}
            className="h-10 w-full rounded-xl border border-line bg-paper px-2 text-sm"
          >
            {TIMES.slice(1).map((t) => (
              <option key={t} value={t}>
                {t === 24 * 60 ? "منتصف الليل" : clockLabel(t)}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted">الفاصل</span>
          <select
            value={draft.bufferMin}
            onChange={(e) => update({ bufferMin: Number(e.target.value) })}
            className="h-10 w-full rounded-xl border border-line bg-paper px-2 text-sm"
          >
            {BUFFER_CHOICES.map((b) => (
              <option key={b} value={b}>
                {b ? `${b} دقيقة` : "بلا فاصل"}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="sm"
          variant="forest"
          disabled={busy || !touched}
          onClick={submit}
        >
          {busy ? "جارٍ الحفظ…" : "حفظ ساعات العمل"}
        </Button>
        {status && (
          <p className={cn("text-sm", status.ok ? "text-forest" : "text-danger")}>{status.text}</p>
        )}
      </div>
    </div>
  );
}
