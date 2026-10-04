import type { SafetyClass, SavingsOpportunity } from "./types.js";

export interface Policy {
  minimumUnattachedEbsDays: number;
  allowAutomaticSafeChanges: boolean;
  protectedResourcePatterns: string[];
}

const DEFAULT_POLICY: Policy = {
  minimumUnattachedEbsDays: 30,
  allowAutomaticSafeChanges: false,
  protectedResourcePatterns: ["prod", "production"],
};

export function classifySafety(
  opportunity: Omit<SavingsOpportunity, "safety">,
  policy: Policy = DEFAULT_POLICY,
): SafetyClass {
  const haystack = `${opportunity.resourceId} ${opportunity.reason} ${JSON.stringify(opportunity.evidence)}`.toLowerCase();

  if (policy.protectedResourcePatterns.some((pattern) => haystack.includes(pattern.toLowerCase()))) {
    return "DO_NOT_AUTOMATE";
  }

  if (opportunity.action === "delete_unattached_ebs") {
    const ageDays = Number(opportunity.evidence.ageDays ?? 0);
    return ageDays >= policy.minimumUnattachedEbsDays ? "SAFE" : "REVIEW";
  }

  if (opportunity.action === "stop_idle_ec2") {
    return "REVIEW";
  }

  return "REVIEW";
}
