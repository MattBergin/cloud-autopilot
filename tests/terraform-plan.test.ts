import { describe, expect, it } from "vitest";
import { generateTerraformPlan } from "../src/terraform/plan.js";

const opportunity = {
  id: "vol-123",
  resourceType: "EBS",
  resourceId: "vol-123",
  action: "delete_unattached_ebs",
  reason: "Unattached for 45 days",
  estimatedMonthlySavings: 12.5,
  safety: "SAFE" as const,
  evidence: { ageDays: 45, sizeGiB: 100, volumeType: "gp3", availabilityZone: "eu-west-1a" },
};

describe("Terraform plan renderer", () => {
  it("creates a review artifact without an executable deletion", () => {
    const plan = generateTerraformPlan([opportunity]);
    expect(plan.dryRun).toBe(true);
    expect(plan.files).toHaveLength(1);
    expect(plan.files[0].content).toContain("Intended action: delete vol-123");
    expect(plan.files[0].content).not.toContain("lifecycle");
  });

  it("does not render blocked opportunities", () => {
    const plan = generateTerraformPlan([{ ...opportunity, safety: "DO_NOT_AUTOMATE" as const }]);
    expect(plan.files).toHaveLength(0);
    expect(plan.skipped[0].reason).toContain("Blocked");
  });
});
