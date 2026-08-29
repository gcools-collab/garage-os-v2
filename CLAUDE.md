@AGENTS.md

# Claude Code role

Use the `agent/claude` branch in the dedicated Claude worktree described in
`docs/AGENT_WORKFLOW.md`.

Default assignment: architecture review, test design, documentation, and an
explicitly assigned isolated feature. Start with analysis only unless the user
clearly authorizes implementation.

Before every task:

1. State the files or feature area you expect to touch.
2. Confirm `git status --short --branch` shows `agent/claude` and no unrelated changes.
3. Stop if another agent appears to be editing the same area.
4. Do not use Supabase mutation commands, deployment commands, live PayPlug calls,
   legacy imports, tenant resets, or production credentials without explicit approval.

Keep commits small and task-specific. Do not push or merge unless asked.
