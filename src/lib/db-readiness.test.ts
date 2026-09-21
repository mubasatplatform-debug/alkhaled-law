import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { describeDb } from "./db-readiness.ts";

describe("describeDb", () => {
  it("reports Neon as durable", () => {
    const d = describeDb("neon");
    assert.equal(d.durable, true);
    assert.match(d.title, /دائمة/);
  });

  it("warns for PGLite and names the variable that fixes it", () => {
    const d = describeDb("pglite");
    assert.equal(d.durable, false);
    assert.match(d.title, /مؤقتة/);
    assert.match(d.body, /DATABASE_URL/);
    assert.match(d.body, /Neon/);
  });
});
