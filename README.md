# Cloud Autopilot

Cloud Autopilot is an MCP server that helps Claude inspect AWS infrastructure, identify cost-saving opportunities, and produce safe, reviewable remediation plans.

## MVP

The first release is intentionally read-only:

- AWS Cost Explorer summary
- AWS Cost Optimization Hub recommendations
- EC2 inventory and basic idle/stopped signals
- EBS inventory and unattached-volume signals
- deterministic safety classification
- structured change plans
- Terraform/GitHub review artifacts
- human approval manifests
- read-only approval revalidation
- no destructive AWS mutations exposed through MCP

## Requirements

- Node.js 20+
- AWS credentials with read-only access
- AWS region configured (Cost Explorer is queried in us-east-1 by default)

## Development

```bash
npm install
npm test
npm run build
npm run dev
```

## MCP

The server communicates over stdio and exposes:

- `scan_costs`
- `find_savings`
- `generate_change_plan`
- `generate_terraform_plan`
- `generate_github_change_bundle`
- `create_approval_manifest`
- `validate_approval_manifest`

The repository contains a narrowly scoped EBS deletion executor for testing the mutation boundary, but it is deliberately **not exposed through MCP** and the IAM policy remains read-only.
