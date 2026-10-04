import { describe, expect, it } from "vitest";
import { createPullRequestBundle } from "../src/github/pull-request.js";

describe("GitHub pull request bundle", () => {
  it("summarizes savings and preserves the review boundary", () => {
    const result = createPullRequestBundle([{
      id: "vol-123", resourceType: "EBS", resourceId: "vol-123",
      action: "delete_unattached_ebs", reason: "Unattached for 45 days",
      estimatedMonthlySavings: 12.5, safety: "SAFE", evidence: { ageDays: 45 },
    }]);
    expect(result.title).toContain("review 1");
    expect(result.body).toContain("12.50");
    expect(result.body).toContain("does not apply AWS mutations");
    expect(result.files).toHaveLength(1);
  });
});