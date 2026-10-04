import type { SavingsOpportunity } from "../types.js";

export interface ApprovalManifest {
  manifestVersion: 1;
  generatedAt: string;
  approvalId: string;
  approvedBy: string;
  source: "human";
  opportunities: Array<{
    opportunityId: string;
    action: string;
    resourceId: string;
    expectedMonthlySavings: number;
    safety: "SAFE" | "REVIEW";
  }>;
}

export function createApprovalManifest(
  opportunities: SavingsOpportunity[],
  approvedBy: string,
): ApprovalManifest {
  const eligible = opportunities.filter(o => o.safety !== "DO_NOT_AUTOMATE");
  if (eligible.length === 0) throw new Error("No eligible opportunities to approve.");
  if (!approvedBy.trim()) throw new Error("approvedBy is required.");

  return {
    manifestVersion: 1,
    generatedAt: new Date().toISOString(),
    approvalId: createApprovalId(eligible),
    approvedBy: approvedBy.trim(),
    source: "human",
    opportunities: eligible.map(o => ({
      opportunityId: o.id,
      action: o.action,
      resourceId: o.resourceId,
      expectedMonthlySavings: o.estimatedMonthlySavings,
      safety: o.safety as "SAFE" | "REVIEW",
    })),
  };
}

export function validateApprovalManifest(
  manifest: ApprovalManifest,
  current: SavingsOpportunity[],
): { valid: boolean; reasons: string[] } {
  const reasons: string[] = [];

  for (const approved of manifest.opportunities) {
    const found = current.find(o => o.id === approved.opportunityId);
    if (!found) {
      reasons.push("Opportunity is no longer present: " + approved.opportunityId);
      continue;
    }
    if (found.action !== approved.action) reasons.push("Action changed: " + approved.opportunityId);
    if (found.resourceId !== approved.resourceId) reasons.push("Resource changed: " + approved.opportunityId);
    if (found.estimatedMonthlySavings !== approved.expectedMonthlySavings) {
      reasons.push("Savings estimate changed: " + approved.opportunityId);
    }
    if (found.safety === "DO_NOT_AUTOMATE") reasons.push("Opportunity is now blocked: " + approved.opportunityId);
  }

  return { valid: reasons.length === 0, reasons };
}

function createApprovalId(opportunities: SavingsOpportunity[]): string {
  const material = opportunities
    .map(o => [o.id, o.action, o.resourceId, o.estimatedMonthlySavings].join("|"))
    .sort()
    .join("\n");
  let hash = 2166136261;
  for (const char of material) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return "approval-" + (hash >>> 0).toString(16).padStart(8, "0");
}
