import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { summarizeBookings } from "./reports.ts";

const TODAY = "2026-09-21";

describe("summarizeBookings", () => {
  it("is empty and honest when there are no bookings", () => {
    const s = summarizeBookings([], TODAY);
    assert.equal(s.monthTotal, 0);
    assert.equal(s.upcoming, 0);
    assert.equal(s.topKind, null);
    assert.ok(s.byKind.every((r) => r.n === 0));
  });

  it("counts this month only and keeps cancelled out of the breakdown", () => {
    const s = summarizeBookings(
      [
        { date: "2026-09-02", kind: "video", status: "confirmed" },
        { date: "2026-09-25", kind: "video", status: "pending" },
        { date: "2026-09-26", kind: "review", status: "cancelled" },
        { date: "2026-08-30", kind: "review", status: "confirmed" },
      ],
      TODAY,
    );
    assert.equal(s.monthTotal, 3);
    assert.equal(s.cancelled, 1);
    assert.deepEqual(
      s.byKind.map((r) => [r.kind, r.n]),
      [
        ["video", 2],
        ["review", 0],
        ["followup", 0],
      ],
    );
    assert.equal(s.topKind, "استشارة مرئية");
  });

  it("treats today as upcoming and ignores cancelled future bookings", () => {
    const s = summarizeBookings(
      [
        { date: TODAY, kind: "followup", status: "confirmed" },
        { date: "2026-10-01", kind: "video", status: "confirmed" },
        { date: "2026-10-02", kind: "video", status: "cancelled" },
        { date: "2026-09-20", kind: "video", status: "confirmed" },
      ],
      TODAY,
    );
    assert.equal(s.upcoming, 2);
  });
});
