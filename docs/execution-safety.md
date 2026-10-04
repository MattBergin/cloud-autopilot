# Execution safety

Cloud Autopilot treats model output as an untrusted request, not as permission to mutate AWS.

The first executor is deliberately narrow:

- action must be exactly `delete_unattached_ebs`
- a human approval manifest must match the current opportunity
- the current resource is re-read from AWS before mutation
- the volume must still be `available` and have no attachments
- the volume must still satisfy the minimum age policy
- the resource must still classify as `SAFE`
- protected resources remain blocked

The executor is implemented separately from the MCP server. The current MCP surface remains read-only, so the repository IAM policy does not yet grant `ec2:DeleteVolume`.

This separation is intentional: we can test the mutation boundary before exposing it to an AI agent or expanding AWS permissions.
