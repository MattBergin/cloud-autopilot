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
- no destructive AWS mutations

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

Mutation tools are deliberately not exposed in the MVP.
