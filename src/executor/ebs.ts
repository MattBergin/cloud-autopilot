import {
  DeleteVolumeCommand,
  DescribeVolumesCommand,
  EC2Client,
} from "@aws-sdk/client-ec2";
import type { ApprovalManifest } from "../approval/manifest.js";
import { validateApprovalManifest } from "../approval/manifest.js";
import { classifySafety, type Policy } from "../policy.js";
import type { SavingsOpportunity } from "../types.js";

export interface EbsDeletionResult {
  executed: boolean;
  opportunityId: string;
  resourceId: string;
  reason: string;
}

export async function executeApprovedEbsDeletion(
  manifest: ApprovalManifest,
  currentOpportunities: SavingsOpportunity[],
  opportunityId: string,
  client = new EC2Client({}),
  policy?: Policy,
): Promise<EbsDeletionResult> {
  const validation = validateApprovalManifest(manifest, currentOpportunities);
  if (!validation.valid) {
    throw new Error("Approval manifest is invalid: " + validation.reasons.join("; "));
  }

  const opportunity = currentOpportunities.find((item) => item.id === opportunityId);
  if (!opportunity) throw new Error("Opportunity is not present: " + opportunityId);
  if (opportunity.action !== "delete_unattached_ebs") {
    throw new Error("Unsupported execution action: " + opportunity.action);
  }
  if (opportunity.safety === "DO_NOT_AUTOMATE") {
    throw new Error("Opportunity is blocked by safety policy.");
  }

  const safety = classifySafety(opportunity, policy);
  if (safety !== "SAFE") {
    throw new Error("EBS deletion is not currently SAFE.");
  }

  const response = await client.send(new DescribeVolumesCommand({
    VolumeIds: [opportunity.resourceId],
  }));
  const volume = response.Volumes?.[0];
  if (!volume) throw new Error("EBS volume no longer exists: " + opportunity.resourceId);
  if ((volume.Attachments ?? []).length > 0 || volume.State !== "available") {
    throw new Error("EBS volume is no longer unattached: " + opportunity.resourceId);
  }

  const createdAt = volume.CreateTime?.getTime();
  if (!createdAt) throw new Error("EBS volume has no creation timestamp.");
  const ageDays = Math.max(0, Math.floor((Date.now() - createdAt) / 86400000));
  const minimumDays = policy?.minimumUnattachedEbsDays ?? 30;
  if (ageDays < minimumDays) {
    throw new Error("EBS volume no longer meets the minimum age policy.");
  }

  const currentSafety = classifySafety({
    ...opportunity,
    evidence: { ...opportunity.evidence, ageDays, state: volume.State },
  }, policy);
  if (currentSafety !== "SAFE") {
    throw new Error("EBS volume is blocked by the current safety policy.");
  }

  await client.send(new DeleteVolumeCommand({ VolumeId: opportunity.resourceId }));

  return {
    executed: true,
    opportunityId,
    resourceId: opportunity.resourceId,
    reason: "Deleted an unattached EBS volume after approval and live safety checks.",
  };
}
