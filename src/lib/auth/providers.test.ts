import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { brokerUsable } from "./providers.ts";

describe("brokerUsable", () => {
  it("allows the shared preview client when there is no public URL (preview / local dev)", () => {
    assert.equal(brokerUsable({}), true);
  });

  it("refuses the shared preview client on a deployment with its own public URL", () => {
    assert.equal(brokerUsable({ publicUrl: "https://alkhaled-law.vercel.app" }), false);
  });

  it("allows a per-app client injected by the deployer", () => {
    assert.equal(
      brokerUsable({ perAppClientId: "app-client", publicUrl: "https://app.grok.me" }),
      true,
    );
  });
});
