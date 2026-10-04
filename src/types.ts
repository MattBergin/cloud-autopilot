export type SafetyClass = "SAFE" | "REVIEW" | "DO_NOT_AUTOMATE";

export interface CostSummary {
  startDate: string;
  endDate: string;
  total: number;
  currency: string;
  byService: Array<{ service: string; amount: number }>;
}

export interface SavingsOpportunity {
  id: string;
  resourceType: string;
  resourceId: string;
  region?: string;
  action: string;
  reason: string;
  estimatedMonthlySavings: number;
  safety: SafetyClass;
  evidence: Record<string, unknown>;
}

export interface ChangePlan {
  generatedAt: string;
  dryRun: true;
  changes: Array<{
    opportunityId: string;
    action: string;
    resourceId: string;
    safety: SafetyClass;
    estimatedMonthlySavings: number;
    requiresApproval: boolean;
  }>;
  blocked: Array<{
    opportunityId: string;
    reason: string;
  }>;
}
