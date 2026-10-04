import {
  DescribeInstancesCommand,
  EC2Client,
  type Instance,
} from "@aws-sdk/client-ec2";
import type { SavingsOpportunity } from "../types.js";
import { classifySafety, type Policy } from "../policy.js";

function tagMap(instance: Instance): Record<string, string> {
  return Object.fromEntries(
    (instance.Tags ?? [])
      .filter((tag) => tag.Key)
      .map((tag) => [tag.Key!, tag.Value ?? ""]),
  );
}

export async function findEc2Opportunities(
  client = new EC2Client({}),
  policy?: Policy,
): Promise<SavingsOpportunity[]> {
  const response = await client.send(new DescribeInstancesCommand({}));
  const opportunities: SavingsOpportunity[] = [];

  for (const reservation of response.Reservations ?? []) {
    for (const instance of reservation.Instances ?? []) {
      const tags = tagMap(instance);
      if (instance.State?.Name === "stopped") {
        const id = instance.InstanceId ?? "unknown";
        const raw = {
          id: `ec2-stopped-${id}`,
          resourceType: "EC2",
          resourceId: id,
          region: instance.Placement?.AvailabilityZone,
          action: "stop_idle_ec2",
          reason: "EC2 instance is currently stopped and may have attached storage or other ongoing costs worth reviewing.",
          estimatedMonthlySavings: 0,
          evidence: { state: "stopped", tags },
        };
        opportunities.push({ ...raw, safety: classifySafety(raw, policy) });
      }
    }
  }

  return opportunities;
}
