import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getMonthlyCost } from "./aws/cost.js";
import { findEc2Opportunities } from "./aws/ec2.js";
import { findEbsOpportunities } from "./aws/ebs.js";
import type { ChangePlan, SavingsOpportunity } from "./types.js";

export function createServer() {
  const server = new McpServer({
    name: "cloud-autopilot",
    version: "0.1.0",
  });

  server.tool(
    "scan_costs",
    "Summarize recent AWS spend by service. Read-only.",
    { days: z.number().int().min(1).max(90).default(30) },
    async ({ days }) => {
      const summary = await getMonthlyCost(undefined, days);
      return {
        content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      };
    },
  );

  server.tool(
    "find_savings",
    "Find initial AWS cost-saving opportunities from EC2 and EBS inventory. Read-only. Findings are deterministic and include a safety classification.",
    {},
    async () => {
      const [ec2, ebs] = await Promise.all([
        findEc2Opportunities(),
        findEbsOpportunities(),
      ]);
      const opportunities: SavingsOpportunity[] = [...ec2, ...ebs];
      return {
        content: [{ type: "text", text: JSON.stringify(opportunities, null, 2) }],
      };
    },
  );

  server.tool(
    "generate_change_plan",
    "Generate a dry-run change plan from supplied opportunities. Never performs AWS mutations.",
    {
      opportunities: z.array(z.object({
        id: z.string(),
        action: z.string(),
        resourceId: z.string(),
        safety: z.enum(["SAFE", "REVIEW", "DO_NOT_AUTOMATE"]),
        estimatedMonthlySavings: z.number(),
      })),
    },
    async ({ opportunities }) => {
      const plan: ChangePlan = {
        generatedAt: new Date().toISOString(),
        dryRun: true,
        changes: opportunities
          .filter((x) => x.safety !== "DO_NOT_AUTOMATE")
          .map((x) => ({
            opportunityId: x.id,
            action: x.action,
            resourceId: x.resourceId,
            safety: x.safety,
            estimatedMonthlySavings: x.estimatedMonthlySavings,
            requiresApproval: x.safety !== "SAFE",
          })),
        blocked: opportunities
          .filter((x) => x.safety === "DO_NOT_AUTOMATE")
          .map((x) => ({
            opportunityId: x.id,
            reason: "Resource is protected by the safety policy.",
          })),
      };

      return {
        content: [{ type: "text", text: JSON.stringify(plan, null, 2) }],
      };
    },
  );

  return server;
}
