import { describe, expect, it } from "vitest";
import { classifySafety } from "../src/policy.js";

describe("safety policy", () => {
  it("marks old unattached EBS as safe", () => {
    const safety = classifySafety({
      id: "ebs-unattached-vol-1",
      resourceType: "EBS",
      resourceId: "vol-1",
      action: "delete_unattached_ebs",
      reason: "unattached",
      estimatedMonthlySavings: 0,
      evidence: { ageDays: 45 },
    });

    expect(safety).toBe("SAFE");
  });

  it("requires review for young unattached EBS", () => {
    const safety = classifySafety({
      id: "ebs-unattached-vol-2",
      resourceType: "EBS",
      resourceId: "vol-2",
      action: "delete_unattached_ebs",
      reason: "unattached",
      estimatedMonthlySavings: 0,
      evidence: { ageDays: 3 },
    });

    expect(safety).toBe("REVIEW");
  });

  it("never automates production resources", () => {
    const safety = classifySafety({
      id: "ebs-unattached-production-vol-3",
      resourceType: "EBS",
      resourceId: "vol-3",
      action: "delete_unattached_ebs",
      reason: "production volume",
      estimatedMonthlySavings: 0,
      evidence: { ageDays: 90 },
    });

    expect(safety).toBe("DO_NOT_AUTOMATE");
  });
});
