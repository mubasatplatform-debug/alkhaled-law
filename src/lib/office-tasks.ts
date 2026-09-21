import { useCallback, useEffect, useState } from "react";
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { isStaff } from "@/lib/office-live";
import { normalizeTaskTitle } from "@/lib/task-title";
import type { TaskItem } from "@/lib/types";

/** Shared by the whole office: open first, newest first. */
export const listOfficeTasks = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<TaskItem[]> => {
    if (!(await isStaff(context.userId))) return [];
    const sql = await getSql();
    const rows = await sql<{ id: string; title: string; done: boolean }>`
      select id, title, done from office_tasks
      order by done asc, created_at desc
      limit 200
    `;
    return rows.map((r) => ({ id: r.id, title: r.title, done: Boolean(r.done) }));
  });

export const addOfficeTask = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { title: string }) => input)
  .handler(async ({ data, context }): Promise<TaskItem> => {
    if (!(await isStaff(context.userId))) throw new Error("staff only");
    const title = normalizeTaskTitle(data.title);
    if (!title) throw new Error("empty title");
    const id = crypto.randomUUID();
    const sql = await getSql();
    await sql`
      insert into office_tasks (id, title, created_by)
      values (${id}, ${title}, ${context.userId})
    `;
    return { id, title, done: false };
  });

export const toggleOfficeTask = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    if (!(await isStaff(context.userId))) return { ok: false };
    const id = String(data.id).slice(0, 64);
    const sql = await getSql();
    // In an UPDATE the right-hand side sees the old row, so `done` here is the
    // value before the flip.
    const rows = await sql`
      update office_tasks
      set done = not done,
          done_at = case when done then null else now() end
      where id = ${id}
      returning id
    `;
    return { ok: rows.length > 0 };
  });

/**
 * Tasks as the office sees them. Toggling is optimistic; any failure reloads
 * from the server so the list never drifts from what is stored.
 */
export function useOfficeTasks() {
  const [tasks, setTasks] = useState<TaskItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    void listOfficeTasks()
      .then((rows) => {
        setTasks(rows);
        setError(null);
      })
      .catch(() => setError("تعذّر تحميل المهام. حدّث الصفحة."));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = async (title: string) => {
    const created = await addOfficeTask({ data: { title } });
    setTasks((cur) => [created, ...(cur ?? [])]);
  };

  const toggle = async (id: string) => {
    setTasks((cur) => cur?.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) ?? cur);
    try {
      const res = await toggleOfficeTask({ data: { id } });
      if (!res.ok) refresh();
    } catch {
      refresh();
    }
  };

  return { tasks, error, add, toggle };
}
