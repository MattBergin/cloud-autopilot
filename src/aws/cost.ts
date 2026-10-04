import {
  CostExplorerClient,
  GetCostAndUsageCommand,
  type ResultByTime,
} from "@aws-sdk/client-cost-explorer";
import type { CostSummary } from "../types.js";

export interface CostClient {
  send(command: GetCostAndUsageCommand): Promise<{ ResultsByTime?: ResultByTime[] }>;
}

export async function getMonthlyCost(
  client: CostClient = new CostExplorerClient({ region: "us-east-1" }),
  days = 30,
): Promise<CostSummary> {
  const end = new Date();
  const start = new Date(end.getTime() - days * 86400000);

  const response = await client.send(new GetCostAndUsageCommand({
    TimePeriod: {
      Start: start.toISOString().slice(0, 10),
      End: end.toISOString().slice(0, 10),
    },
    Granularity: "MONTHLY",
    Metrics: ["UnblendedCost"],
    GroupBy: [{ Type: "DIMENSION", Key: "SERVICE" }],
  }));

  const groups = response.ResultsByTime?.flatMap((period) => period.Groups ?? []) ?? [];
  const byService = groups
    .map((group) => ({
      service: group.Keys?.[0] ?? "Unknown",
      amount: Number(group.Metrics?.UnblendedCost?.Amount ?? 0),
    }))
    .filter((x) => x.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    total: byService.reduce((sum, x) => sum + x.amount, 0),
    currency: groups[0]?.Metrics?.UnblendedCost?.Unit ?? "USD",
    byService,
  };
}
