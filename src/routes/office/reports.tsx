import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/office/reports")({
  component: ReportsPage,
});

const DATA = [
  { name: "استشارة مرئية", n: 8 },
  { name: "مراجعة", n: 5 },
  { name: "صياغة", n: 3 },
  { name: "دراسة", n: 2 },
];

function ReportsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">التقارير</h1>
      <p className="mt-1 text-sm text-muted">توزيع الطلبات هذا الشهر — الاستشارة المرئية هي القناة الأولى.</p>
      <div className="mt-6 h-72 rounded-3xl border border-line bg-card p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={DATA}>
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="n" fill="var(--color-forest)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
