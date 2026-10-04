# Architecture

## Trust boundary

The LLM is an untrusted planner. It does not receive arbitrary AWS mutation capabilities.

The MVP separates:

1. **Observation** — AWS APIs provide facts.
2. **Analysis** — deterministic code converts facts into typed opportunities.
3. **Policy** — deterministic rules classify actions as SAFE, REVIEW, or DO_NOT_AUTOMATE.
4. **Planning** — the MCP server produces a dry-run change plan.
5. **Mutation** — intentionally absent from v0.1.

Future mutation should sit behind an explicit policy engine and preferably create Terraform/GitHub changes before direct AWS mutation.

## Initial scope

- Cost Explorer
- EC2 inventory
- EBS inventory
- basic safety classification
- MCP stdio transport
