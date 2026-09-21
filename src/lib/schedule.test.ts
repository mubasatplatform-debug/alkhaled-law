import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_OFFICE_HOURS } from "./office-hours.ts";
import {
  freeSlots,
  isWorkday,
  OFFICE_SEED_OCC,
  setActiveOfficeHours,
  todayISO,
  withinOfficeHours,
} from "./schedule.ts";

describe("todayISO", () => {
  it("uses the Riyadh day, not UTC", () => {
    // 21:30Z is already 00:30 of the next day in Riyadh (+03).
    assert.equal(todayISO(new Date("2026-09-20T21:30:00Z")), "2026-09-21");
    assert.equal(todayISO(new Date("2026-09-20T20:59:59Z")), "2026-09-20");
  });

  it("returns a plain ISO date", () => {
    assert.match(todayISO(new Date("2026-01-05T09:00:00Z")), /^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("OFFICE_SEED_OCC", () => {
  it("never sits in the past", () => {
    const today = todayISO();
    for (const occ of OFFICE_SEED_OCC) {
      assert.ok(occ.date >= today, `seed occupancy ${occ.date} is before ${today}`);
    }
  });
});

describe("scheduler follows the saved office hours", () => {
  // 2026-09-26 is a Saturday, 2026-09-27 a Sunday.
  const saturdayOnly = { workDays: [6], startMin: 10 * 60, endMin: 12 * 60, bufferMin: 0 };

  it("opens only the saved days and window", () => {
    setActiveOfficeHours(saturdayOnly);
    try {
      assert.equal(isWorkday("2026-09-26"), true);
      assert.equal(isWorkday("2026-09-27"), false);
      assert.deepEqual(
        freeSlots([], "2026-09-26", 30).map((s) => s.startMin),
        [600, 630, 660, 690],
      );
      assert.deepEqual(freeSlots([], "2026-09-27", 30), []);
    } finally {
      setActiveOfficeHours(DEFAULT_OFFICE_HOURS);
    }
  });

  it("rejects bookings outside the window or off the half-hour grid", () => {
    setActiveOfficeHours(saturdayOnly);
    try {
      assert.equal(withinOfficeHours("2026-09-26", 600, 30), true);
      assert.equal(withinOfficeHours("2026-09-26", 690, 30), true);
      assert.equal(withinOfficeHours("2026-09-26", 705, 30), false);
      assert.equal(withinOfficeHours("2026-09-26", 720, 30), false);
      assert.equal(withinOfficeHours("2026-09-27", 600, 30), false);
    } finally {
      setActiveOfficeHours(DEFAULT_OFFICE_HOURS);
    }
  });
});
