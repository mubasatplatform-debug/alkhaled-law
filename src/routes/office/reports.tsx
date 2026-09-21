import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useMergedOffice } from "@/lib/office-live";
import { summarizeBookings } from "@/lib/reports";
import { todayISO } from "@/lib/schedule";

export const Route = createFileRoute("/office/reports")({
  component: ReportsPage,
});

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-line bg-card p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function ReportsPage() {
  const { appointments } = useMergedOffice();
  // Live bookings only: the store also carries demo appointments for previews.
  const summary = useMemo(
    () =>
      summarizeBookings(
        appointments.filter((a) => a.live),
        todayISO(),
      ),
    [appointments],
  );
  const active = summary.byKind.reduce((sum, r) => sum + r.n, 0);

  return (
    <div>
      <h1 className="text-2xl font-semibold">التقارير</h1>
      <p className="mt-1 text-sm text-muted">
        {summary.topKind
          ? `حجوزات هذا الشهر من النظام مباشرة — الأكثر طلباً: ${summary.topKind}.`
          : "لا توجد حجوزات حقيقية هذا الشهر بعد. تظهر الأرقام هنا فور أول حجز."}
      </p>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Stat label="حجوزات هذا الشهر" value={summary.monthTotal} />
        <Stat label="القادمة" value={summary.upcoming} />
        <Stat label="ملغاة هذا الشهر" value={summary.cancelled} />
      </div>

      {active > 0 && (
        <div className="mt-4 h-72 rounded-3xl border border-line bg-card p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summary.byKind}>
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="n" name="حجوزات" fill="var(--color-forest)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
