import { describe, expect, it, vi } from "vitest";
import type { ApprovalManifest } from "../src/approval/manifest.js";
import { executeApprovedEbsDeletion } from "../src/executor/ebs.js";
import type { SavingsOpportunity } from "../src/types.js";

const opportunity: SavingsOpportunity = {
  id: "ebs-unattached-vol-123",
  resourceType: "EBS",
  resourceId: "vol-123",
  action: "delete_unattached_ebs",
  reason: "EBS volume has no attachments and has existed for approximately 45 days.",
  estimatedMonthlySavings: 8,
  safety: "SAFE",
  evidence: { ageDays: 45, state: "available" },
};

const manifest: ApprovalManifest = {
  manifestVersion: 1,
  generatedAt: "2026-10-04T00:00:00.000Z",
  approvalId: "approval-test",
  approvedBy: "human@example.com",
  source: "human",
  opportunities: [{
    opportunityId: opportunity.id,
    action: opportunity.action,
    resourceId: opportunity.resourceId,
    expectedMonthlySavings: opportunity.estimatedMonthlySavings,
    safety: "SAFE",
  }],
};

function clientFor(volume: Record<string, unknown>) {
  return {
    send: vi.fn(async (command: { constructor: { name: string } }) => {
      if (command.constructor.name === "DescribeVolumesCommand") return { Volumes: [volume] };
      return {};
    }),
  } as never;
}

describe("executeApprovedEbsDeletion", () => {
  it("deletes only after approval and live unattached checks", async () => {
    const client = clientFor({
      VolumeId: "vol-123",
      State: "available",
      Attachments: [],
      CreateTime: new Date(Date.now() - 45 * 86400000),
    });

    const result = await executeApprovedEbsDeletion(manifest, [opportunity], opportunity.id, client);

    expect(result.executed).toBe(true);
    expect(client.send).toHaveBeenCalledTimes(2);
  });

  it("refuses an attached volume even when it was previously approved", async () => {
    const client = clientFor({
      VolumeId: "vol-123",
      State: "in-use",
      Attachments: [{ InstanceId: "i-123" }],
      CreateTime: new Date(Date.now() - 45 * 86400000),
    });

    await expect(
      executeApprovedEbsDeletion(manifest, [opportunity], opportunity.id, client),
    ).rejects.toThrow("no longer unattached");
    expect(client.send).toHaveBeenCalledTimes(1);
  });

  it("refuses when the approved savings estimate changed", async () => {
    const changed = { ...opportunity, estimatedMonthlySavings: 9 };

    await expect(
      executeApprovedEbsDeletion(manifest, [changed], opportunity.id, clientFor({
        VolumeId: "vol-123",
        State: "available",
        Attachments: [],
        CreateTime: new Date(Date.now() - 45 * 86400000),
      })),
    ).rejects.toThrow("Savings estimate changed");
  });

  it("refuses protected resources", async () => {
    const protectedOpportunity = {
      ...opportunity,
      resourceId: "vol-production-db",
      reason: "production EBS volume",
    };
    const protectedManifest = {
      ...manifest,
      opportunities: [{
        ...manifest.opportunities[0],
        opportunityId: protectedOpportunity.id,
        resourceId: protectedOpportunity.resourceId,
      }],
    };

    await expect(
      executeApprovedEbsDeletion(protectedManifest, [protectedOpportunity], protectedOpportunity.id, clientFor({
        VolumeId: protectedOpportunity.resourceId,
        State: "available",
        Attachments: [],
        CreateTime: new Date(Date.now() - 45 * 86400000),
      })),
    ).rejects.toThrow("not currently SAFE");
  });
});
