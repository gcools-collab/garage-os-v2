<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Garage OS agent rules

Read `docs/AGENT_WORKFLOW.md` before changing the repository.

- Work only in your assigned worktree and branch. Never develop directly on `main`.
- Do not modify business code unless the user explicitly authorizes the specific task.
- Keep each task isolated by feature area; do not absorb unrelated cleanup.
- Never read, print, copy, edit, commit, or expose `.env*`, credentials, tokens, private keys, or production data.
- Never mutate remote databases or call live payment, deployment, or third-party production services without explicit approval.
- Treat migrations, tenant resets, imports, webhooks, payments, and destructive Git operations as high-risk.
- Before editing, run `git status --short --branch` and confirm the branch and worktree are correct.
- Before committing, inspect the staged diff, scan for secrets, and run focused tests plus lint/type/build checks proportional to the change.
- Do not push, merge, rebase, delete branches, or alter another agent's worktree unless explicitly asked.
- Report changed files, validations, commit SHA (if any), and any skipped or blocked checks.
