import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeTaskTitle, TASK_TITLE_MAX } from "./task-title.ts";

describe("normalizeTaskTitle", () => {
  it("rejects empty, blank and non-string input", () => {
    assert.equal(normalizeTaskTitle(""), null);
    assert.equal(normalizeTaskTitle("   \n\t "), null);
    assert.equal(normalizeTaskTitle(undefined), null);
    assert.equal(normalizeTaskTitle(42), null);
  });

  it("trims and collapses inner whitespace", () => {
    assert.equal(normalizeTaskTitle("  مراجعة   مسودة \n العقد "), "مراجعة مسودة العقد");
  });

  it("caps the length in characters, as the database counts them", () => {
    const long = "م".repeat(TASK_TITLE_MAX + 50);
    const out = normalizeTaskTitle(long);
    assert.equal(out && Array.from(out).length, TASK_TITLE_MAX);
  });
});
