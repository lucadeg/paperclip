---
name: "Evidence baseline: Consent-Based Comments and Direct Message Orchestrator"
slug: "initial-comment-dm-workflow-manager"
assignee: "comment-dm-workflow-manager"
project: "marketing-evidence-program"
recurring: false
---

Establish a real tenant-scoped, read-only baseline for **Consent-Based Comments and Direct Message Orchestrator**. Required data: platform signed webhooks, opt-in consent, interaction thread.

Produce comment-to-DM state machine with idempotent safe response and test no unsolicited DMs; no posting without provider authorization.

If not connected, leave a precise BLOCKED report of missing permissions, source IDs and required configuration; do not create metrics. No side effects.
