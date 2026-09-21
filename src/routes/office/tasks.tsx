import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOfficeTasks } from "@/lib/office-tasks";
import { TASK_TITLE_MAX } from "@/lib/task-title";

export const Route = createFileRoute("/office/tasks")({
  component: TasksPage,
});

function TasksPage() {
  const { tasks, error, add, toggle } = useOfficeTasks();
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const list = tasks ?? [];
  const open = list.filter((t) => !t.done).length;

  return (
    <div>
      <h1 className="text-2xl font-semibold">المهام</h1>
      <p className="mt-1 text-sm text-muted">
        {tasks === null ? "جارٍ التحميل…" : `${open} مفتوحة من ${list.length} · مشتركة بين طاقم المكتب`}
      </p>
      <form
        className="mt-5 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!title.trim() || saving) return;
          setSaving(true);
          setAddError(null);
          try {
            await add(title);
            setTitle("");
          } catch {
            setAddError("تعذّر حفظ المهمة. حاول مرة أخرى.");
          } finally {
            setSaving(false);
          }
        }}
      >
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="مهمة جديدة…"
          maxLength={TASK_TITLE_MAX}
        />
        <Button type="submit" size="sm" variant="forest" disabled={saving}>
          إضافة
        </Button>
      </form>
      {(error || addError) && <p className="mt-2 text-sm text-danger">{error ?? addError}</p>}
      {tasks !== null && list.length === 0 && !error && (
        <p className="mt-6 text-sm text-muted">لا توجد مهام بعد. أضف أول مهمة من الحقل أعلاه.</p>
      )}
      <ul className="mt-4 space-y-2">
        {list.map((t) => (
          <li key={t.id} className="rounded-2xl border border-line bg-card px-4 py-3">
            <label className="flex min-h-11 cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => void toggle(t.id)}
                className="size-4 accent-forest"
              />
              <span className={t.done ? "text-muted line-through" : ""}>{t.title}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
