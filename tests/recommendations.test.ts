import { describe, expect, it } from "vitest";
import { normalizeRecommendation } from "../src/aws/recommendations.js";

describe("Cost Optimization Hub normalization", () => {
  it("preserves AWS savings evidence and requires approval", () => {
    const opportunity = normalizeRecommendation({
      recommendationId: "rec-123", resourceId: "i-123", resourceType: "Ec2Instance",
      actionType: "Rightsize", region: "eu-west-1", estimatedMonthlySavings: 125.5,
      estimatedMonthlyCost: 400, estimatedSavingsPercentage: 31.4, currencyCode: "EUR",
      implementationEffort: "Low", restartNeeded: false, rollbackPossible: true,
      currentResourceSummary: "m6i.large", recommendedResourceSummary: "m6i.medium", source: "ComputeOptimizer",
    });
    expect(opportunity?.estimatedMonthlySavings).toBe(125.5);
    expect(opportunity?.safety).toBe("REVIEW");
    expect(opportunity?.evidence).toMatchObject({ source: "CostOptimizationHub", recommendationId: "rec-123", currencyCode: "EUR" });
  });
  it("blocks recommendations that require a restart", () => {
    const opportunity = normalizeRecommendation({
      recommendationId: "rec-456", resourceId: "i-prod", resourceType: "Ec2Instance",
      actionType: "Rightsize", estimatedMonthlySavings: 50, restartNeeded: true, rollbackPossible: true,
    });
    expect(opportunity?.safety).toBe("DO_NOT_AUTOMATE");
  });
  it("ignores incomplete recommendations", () => {
    expect(normalizeRecommendation({ recommendationId: "rec-missing-savings", resourceId: "i-123", actionType: "Rightsize" })).toBeNull();
  });
});
