import {
  DescribeVolumesCommand,
  EC2Client,
  type Volume,
} from "@aws-sdk/client-ec2";
import type { SavingsOpportunity } from "../types.js";
import { classifySafety, type Policy } from "../policy.js";

function ageInDays(volume: Volume): number {
  const created = volume.CreateTime?.getTime() ?? Date.now();
  return Math.max(0, Math.floor((Date.now() - created) / 86400000));
}

export async function findEbsOpportunities(
  client = new EC2Client({}),
  policy?: Policy,
): Promise<SavingsOpportunity[]> {
  const response = await client.send(new DescribeVolumesCommand({}));
  const opportunities: SavingsOpportunity[] = [];

  for (const volume of response.Volumes ?? []) {
    if ((volume.Attachments ?? []).length > 0) continue;

    const id = volume.VolumeId ?? "unknown";
    const ageDays = ageInDays(volume);
    const raw = {
      id: `ebs-unattached-${id}`,
      resourceType: "EBS",
      resourceId: id,
      region: volume.AvailabilityZone,
      action: "delete_unattached_ebs",
      reason: `EBS volume has no attachments and has existed for approximately ${ageDays} days.`,
      estimatedMonthlySavings: 0,
      evidence: {
        ageDays,
        sizeGiB: volume.Size,
        volumeType: volume.VolumeType,
        state: volume.State,
      },
    };

    opportunities.push({ ...raw, safety: classifySafety(raw, policy) });
  }

  return opportunities;
}
