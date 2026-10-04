import type { SavingsOpportunity } from "../types.js";

export interface TerraformPlan {
  generatedAt: string;
  dryRun: true;
  format: "terraform";
  files: Array<{ path: string; content: string }>;
  skipped: Array<{ opportunityId: string; reason: string }>;
}

export function generateTerraformPlan(opportunities: SavingsOpportunity[]): TerraformPlan {
  const files: TerraformPlan["files"] = [];
  const skipped: TerraformPlan["skipped"] = [];

  for (const opportunity of opportunities) {
    if (opportunity.safety === "DO_NOT_AUTOMATE") {
      skipped.push({ opportunityId: opportunity.id, reason: "Blocked by safety policy." });
      continue;
    }

    const resource = terraformResource(opportunity);
    if (!resource) {
      skipped.push({ opportunityId: opportunity.id, reason: "No deterministic Terraform renderer exists for this action yet." });
      continue;
    }

    files.push({
      path: `changes/${safeName(opportunity.id)}.tf`,
      content: `# Cloud Autopilot dry-run change
# Opportunity: ${opportunity.id}
# Estimated monthly savings: ${opportunity.estimatedMonthlySavings}
# Safety: ${opportunity.safety}

${resource}
`,
    });
  }

  return { generatedAt: new Date().toISOString(), dryRun: true, format: "terraform", files, skipped };
}

function terraformResource(opportunity: SavingsOpportunity): string | null {
  if (opportunity.action === "delete_unattached_ebs") {
    const volumeId = opportunity.resourceId;
    return `# Review before applying. Terraform cannot safely adopt/delete an existing
# volume without an explicit import/state decision.
#
# resource "aws_ebs_volume" "candidate" {
#   availability_zone = "${String(opportunity.evidence.availabilityZone ?? "REVIEW")}"
#   size              = ${Number(opportunity.evidence.sizeGiB ?? 0)}
#   type              = "${String(opportunity.evidence.volumeType ?? "gp3")}"
# }
#
# Intended action: delete ${volumeId}
# This is intentionally emitted as a review artifact, not an executable deletion.`;
  }

  if (opportunity.action === "stop_idle_ec2") {
    return `# Review artifact only.
# Intended action: stop instance ${opportunity.resourceId}
# Cloud Autopilot does not generate an executable destroy/stop resource
# because stopping an existing instance is an operational mutation.`;
  }

  if (opportunity.action.startsWith("cost_hub_")) {
    const summary = String(opportunity.evidence.recommendedResourceSummary ?? "See AWS Cost Optimization Hub recommendation.");
    return `# Review artifact only.
# AWS recommendation: ${summary}
# Resource: ${opportunity.resourceId}
# Action: ${opportunity.action}
# Cloud Autopilot deliberately does not invent Terraform arguments from
# an LLM or an opaque recommendation. A service-specific renderer is required.`;
  }

  return null;
}

function safeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "opportunity";
}
