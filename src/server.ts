import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getMonthlyCost } from "./aws/cost.js";
import { findEc2Opportunities } from "./aws/ec2.js";
import { findEbsOpportunities } from "./aws/ebs.js";
import { listCostOptimizationRecommendations } from "./aws/recommendations.js";
import { generateTerraformPlan } from "./terraform/plan.js";
import type { ChangePlan, SavingsOpportunity } from "./types.js";

export function createServer() {
  const server = new McpServer({ name: "cloud-autopilot", version: "0.1.0" });

  server.tool("scan_costs", "Summarize recent AWS spend by service. Read-only.",
    { days: z.number().int().min(1).max(90).default(30) },
    async ({ days }) => ({ content: [{ type: "text", text: JSON.stringify(await getMonthlyCost(undefined, days), null, 2) }] }));

  server.tool("find_savings",
    "Find AWS cost-saving opportunities using Cost Optimization Hub plus deterministic EC2/EBS checks. Read-only.",
    {}, async () => {
      const [hub, ec2, ebs] = await Promise.all([
        listCostOptimizationRecommendations(), findEc2Opportunities(), findEbsOpportunities(),
      ]);
      const opportunities: SavingsOpportunity[] = [...hub, ...ec2, ...ebs]
        .sort((a, b) => b.estimatedMonthlySavings - a.estimatedMonthlySavings);
      return { content: [{ type: "text", text: JSON.stringify(opportunities, null, 2) }] };
    });

  server.tool("generate_change_plan",
    "Generate a dry-run change plan from supplied opportunities. Never performs AWS mutations.",
    { opportunities: z.array(z.object({
      id: z.string(), action: z.string(), resourceId: z.string(),
      safety: z.enum(["SAFE", "REVIEW", "DO_NOT_AUTOMATE"]), estimatedMonthlySavings: z.number(),
    })) }, async ({ opportunities }) => {
      const plan: ChangePlan = {
        generatedAt: new Date().toISOString(), dryRun: true,
        changes: opportunities.filter(x => x.safety !== "DO_NOT_AUTOMATE").map(x => ({
          opportunityId: x.id, action: x.action, resourceId: x.resourceId, safety: x.safety,
          estimatedMonthlySavings: x.estimatedMonthlySavings, requiresApproval: x.safety !== "SAFE",
        })),
        blocked: opportunities.filter(x => x.safety === "DO_NOT_AUTOMATE").map(x => ({
          opportunityId: x.id, reason: "Resource is protected or requires an unsafe mutation.",
        })),
      };
      return { content: [{ type: "text", text: JSON.stringify(plan, null, 2) }] };
    });

  server.tool("generate_terraform_plan",
    "Generate deterministic Terraform review artifacts for supported opportunities. Never applies Terraform or changes AWS.",
    { opportunities: z.array(z.object({
      id: z.string(), resourceType: z.string(), resourceId: z.string(), action: z.string(),
      reason: z.string(), estimatedMonthlySavings: z.number(),
      safety: z.enum(["SAFE", "REVIEW", "DO_NOT_AUTOMATE"]),
      evidence: z.record(z.unknown()).default({}),
    })) }, async ({ opportunities }) => ({
      content: [{ type: "text", text: JSON.stringify(generateTerraformPlan(opportunities), null, 2) }],
    }));

  return server;
}
