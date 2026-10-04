import { describe, expect, it } from "vitest";
import { GetCostAndUsageCommand } from "@aws-sdk/client-cost-explorer";
import { getMonthlyCost, type CostClient } from "../src/aws/cost.js";

describe("cost aggregation", () => {
  it("aggregates service spend", async () => {
    const client: CostClient = {
      async send(command: GetCostAndUsageCommand) {
        expect(command.input.Granularity).toBe("MONTHLY");
        return {
          ResultsByTime: [{
            Groups: [
              {
                Keys: ["Amazon EC2"],
                Metrics: { UnblendedCost: { Amount: "100", Unit: "USD" } },
              },
              {
                Keys: ["Amazon EBS"],
                Metrics: { UnblendedCost: { Amount: "25", Unit: "USD" } },
              },
            ],
          }],
        };
      },
    };

    const result = await getMonthlyCost(client, 30);
    expect(result.total).toBe(125);
    expect(result.byService[0]).toEqual({ service: "Amazon EC2", amount: 100 });
  });
});
