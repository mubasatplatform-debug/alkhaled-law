/** Matches the `office_tasks.title` check constraint (counted in characters). */
export const TASK_TITLE_MAX = 200;

/**
 * Collapse whitespace and cap the length the database accepts. Returns null for
 * anything that would leave an empty task, so callers can refuse it up front
 * instead of letting the check constraint reject the insert.
 */
export function normalizeTaskTitle(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const title = input.replace(/\s+/g, " ").trim();
  if (!title) return null;
  const chars = Array.from(title);
  return chars.length > TASK_TITLE_MAX ? chars.slice(0, TASK_TITLE_MAX).join("") : title;
}
