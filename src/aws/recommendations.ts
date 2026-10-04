import { CostOptimizationHubClient, ListRecommendationsCommand } from "@aws-sdk/client-cost-optimization-hub";
import type { SavingsOpportunity } from "../types.js";
import { classifySafety } from "../policy.js";

const client = new CostOptimizationHubClient({ region: process.env.AWS_REGION ?? "us-east-1" });

export interface HubRecommendation {
  recommendationId?: string; resourceId?: string; resourceArn?: string; resourceType?: string;
  actionType?: string; region?: string; estimatedMonthlySavings?: number; estimatedMonthlyCost?: number;
  estimatedSavingsPercentage?: number; currencyCode?: string; implementationEffort?: string;
  restartNeeded?: boolean; rollbackPossible?: boolean; currentResourceSummary?: string;
  recommendedResourceSummary?: string; source?: string; tags?: Array<{ key?: string; value?: string }>;
}

export async function listCostOptimizationRecommendations(): Promise<SavingsOpportunity[]> {
  const opportunities: SavingsOpportunity[] = [];
  let nextToken: string | undefined;
  do {
    const response = await client.send(new ListRecommendationsCommand({
      maxResults: 100, includeAllRecommendations: false, nextToken,
    }));
    for (const recommendation of response.items ?? []) {
      const normalized = normalizeRecommendation(recommendation as HubRecommendation);
      if (normalized) opportunities.push(normalized);
    }
    nextToken = response.nextToken;
  } while (nextToken);
  return opportunities.sort((a, b) => b.estimatedMonthlySavings - a.estimatedMonthlySavings);
}

export function normalizeRecommendation(recommendation: HubRecommendation): SavingsOpportunity | null {
  const resourceId = recommendation.resourceId ?? recommendation.resourceArn;
  const actionType = recommendation.actionType;
  if (!resourceId || !actionType || recommendation.estimatedMonthlySavings == null) return null;

  const action = actionType.toLowerCase().replaceAll(" ", "_");
  const base: Omit<SavingsOpportunity, "safety"> = {
    id: recommendation.recommendationId ?? `cost-optimization-hub:${resourceId}:${action}`,
    resourceType: recommendation.resourceType ?? "unknown",
    resourceId,
    region: recommendation.region,
    action: `cost_hub_${action}`,
    reason: recommendation.currentResourceSummary
      ? `${actionType}: ${recommendation.currentResourceSummary}`
      : `AWS Cost Optimization Hub recommends ${actionType}.`,
    estimatedMonthlySavings: recommendation.estimatedMonthlySavings,
    evidence: {
      source: "CostOptimizationHub", recommendationId: recommendation.recommendationId,
      currentResourceSummary: recommendation.currentResourceSummary,
      recommendedResourceSummary: recommendation.recommendedResourceSummary,
      estimatedMonthlyCost: recommendation.estimatedMonthlyCost,
      estimatedSavingsPercentage: recommendation.estimatedSavingsPercentage,
      currencyCode: recommendation.currencyCode, implementationEffort: recommendation.implementationEffort,
      restartNeeded: recommendation.restartNeeded, rollbackPossible: recommendation.rollbackPossible,
      resourceArn: recommendation.resourceArn, sourceSystem: recommendation.source, tags: recommendation.tags,
    },
  };

  return { ...base, safety: classifyHubSafety(base, recommendation) };
}

function classifyHubSafety(
  opportunity: Omit<SavingsOpportunity, "safety">, recommendation: HubRecommendation,
): SavingsOpportunity["safety"] {
  const policySafety = classifySafety(opportunity);
  if (policySafety === "DO_NOT_AUTOMATE") return policySafety;
  if (recommendation.restartNeeded) return "DO_NOT_AUTOMATE";
  return "REVIEW";
}
