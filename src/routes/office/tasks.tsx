import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOffice } from "@/lib/store";

export const Route = createFileRoute("/office/tasks")({
  component: TasksPage,
});

function TasksPage() {
  const { tasks, toggleTask, addTask } = useOffice();
  const [title, setTitle] = useState("");
  const open = tasks.filter((t) => !t.done).length;
  return (
    <div>
      <h1 className="text-2xl font-semibold">المهام</h1>
      <p className="mt-1 text-sm text-muted">{open} مفتوحة من {tasks.length}</p>
      <form
        className="mt-5 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          addTask(title);
          setTitle("");
        }}
      >
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="مهمة جديدة…"
        />
        <Button type="submit" size="sm" variant="forest">
          إضافة
        </Button>
      </form>
      <ul className="mt-4 space-y-2">
        {tasks.map((t) => (
          <li key={t.id} className="rounded-2xl border border-line bg-card px-4 py-3">
            <label className="flex min-h-11 cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => toggleTask(t.id)}
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
