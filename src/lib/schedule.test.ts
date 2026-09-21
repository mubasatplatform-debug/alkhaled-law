import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { OFFICE_SEED_OCC, todayISO } from "./schedule.ts";

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
