import { describe, expect, it } from "vitest";
import { createApprovalManifest, validateApprovalManifest } from "../src/approval/manifest.js";

const opportunity = {
  id: "rec-1", resourceType: "Ec2Instance", resourceId: "i-123",
  action: "cost_hub_rightsize", reason: "Rightsize", estimatedMonthlySavings: 100,
  safety: "REVIEW" as const, evidence: {},
};

describe("approval manifest", () => {
  it("binds approval to the exact proposed action and savings", () => {
    const manifest = createApprovalManifest([opportunity], "owner");
    expect(manifest.source).toBe("human");
    expect(manifest.approvalId).toMatch(/^approval-/);
    expect(validateApprovalManifest(manifest, [opportunity]).valid).toBe(true);
  });

  it("invalidates approval when the recommendation changes", () => {
    const manifest = createApprovalManifest([opportunity], "owner");
    const changed = { ...opportunity, estimatedMonthlySavings: 80 };
    const result = validateApprovalManifest(manifest, [changed]);
    expect(result.valid).toBe(false);
    expect(result.reasons[0]).toContain("Savings estimate changed");
  });

  it("rejects blocked opportunities", () => {
    const manifest = createApprovalManifest([opportunity], "owner");
    const blocked = { ...opportunity, safety: "DO_NOT_AUTOMATE" as const };
    expect(validateApprovalManifest(manifest, [blocked]).valid).toBe(false);
  });
});
