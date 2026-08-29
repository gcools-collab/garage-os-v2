# Garage OS multi-agent workflow

## Workspaces

The main checkout is the integration and review workspace. Development happens
only in dedicated local worktrees:

- Codex: `agent/codex`
- Cursor: `agent/cursor`
- Claude Code: `agent/claude`

Each branch starts from the same reviewed `main` commit. One agent owns one
worktree; never open two agents on the same worktree.

## Task allocation

- Codex: backend, Supabase, security, payments, and critical business logic.
- Cursor: frontend, UX, responsive behavior, loading/error/empty states.
- Claude Code: architecture, audits, tests, documentation, or an isolated feature.

These are defaults, not authorization. Every implementation still needs a clear
task with an owned file or feature area. Record the owner and expected files before
starting. If scopes overlap, stop and reassign before editing.

## Start of task

1. Update local knowledge of `main` only when the user authorizes network access.
2. Confirm the assigned branch and a clean status.
3. Rebase or recreate the task branch from the accepted integration commit before work.
4. State the scope, expected files, validation plan, and forbidden areas.

## Safety boundaries

- Never expose or commit secrets; `.env*`, `.local/`, `.vercel/`, and private keys stay local.
- No remote database writes, migrations, resets, imports, deployments, or live payment calls
  without explicit, task-specific approval.
- Test payment flows only in an explicitly approved sandbox/test environment.
- Do not use destructive Git commands or rewrite shared history.
- Do not touch unrelated changes. Ask the owner when unexpected modifications appear.

## Finish and integration

1. Review `git diff` and the staged file list.
2. Run focused tests, then lint, TypeScript, and build when appropriate.
3. Scan the staged diff for secrets and forbidden files.
4. Commit on the agent branch with a focused message; do not push unless asked.
5. Report base SHA, commit SHA, files, checks, skipped checks, and risks.
6. Integrate one branch at a time into `main`, validate after each integration, then begin
   the next merge. Resolve conflicts in the owning branch, not directly on `main`.
