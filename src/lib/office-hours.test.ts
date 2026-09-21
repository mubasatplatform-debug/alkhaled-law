import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_OFFICE_HOURS,
  describeDays,
  describeOfficeHours,
  normalizeOfficeHours,
} from "./office-hours.ts";

describe("normalizeOfficeHours", () => {
  it("accepts the default and sorts / de-duplicates days", () => {
    const r = normalizeOfficeHours({ ...DEFAULT_OFFICE_HOURS, workDays: [4, 0, 2, 2, 1, 3] });
    assert.equal(r.ok, true);
    assert.deepEqual(r.ok && r.hours.workDays, [0, 1, 2, 3, 4]);
  });

  it("rejects no days, bad days, off-grid times, short days and odd buffers", () => {
    const base = DEFAULT_OFFICE_HOURS;
    for (const bad of [
      { ...base, workDays: [] },
      { ...base, workDays: [7] },
      { ...base, startMin: 9 * 60 + 15 },
      { ...base, startMin: 17 * 60, endMin: 9 * 60 },
      { ...base, startMin: 9 * 60, endMin: 9 * 60 + 30 },
      { ...base, endMin: 25 * 60 },
      { ...base, bufferMin: 7 },
      null,
      "9-5",
    ]) {
      assert.equal(normalizeOfficeHours(bad).ok, false, JSON.stringify(bad));
    }
  });
});

describe("describeDays", () => {
  it("reads a run as a range, including one that wraps past Saturday", () => {
    assert.equal(describeDays([0, 1, 2, 3, 4]), "الأحد–الخميس");
    assert.equal(describeDays([6, 0, 1, 2, 3]), "السبت–الأربعاء");
  });

  it("lists scattered days and names the whole week", () => {
    assert.equal(describeDays([0, 2, 4]), "الأحد، الثلاثاء، الخميس");
    assert.equal(describeDays([0, 1, 2, 3, 4, 5, 6]), "كل أيام الأسبوع");
  });
});

describe("describeOfficeHours", () => {
  it("renders the default the way the office used to hard-code it", () => {
    assert.equal(
      describeOfficeHours(DEFAULT_OFFICE_HOURS),
      "الأحد–الخميس · 9:00 ص–5:00 م · خانات 30 دقيقة · فاصل 15 دقيقة",
    );
  });
});
