# CLAUDE.md

Claude Code connector. All project instructions live in `AGENTS.md` — the shared source of truth for every
AI tool — and the documents it routes to under `rules/`. Do not add project rules here; change `AGENTS.md`
(and `rules/17-ai-agent-prompts.md`) instead.

@AGENTS.md

## Claude Code specifics

- Read only the `rules/*.md` documents the routing table in `AGENTS.md` names for the task; re-read them
  at the start of a resumed or long task instead of relying on earlier context.
- Run the completion gate (`pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, `pnpm exec expo install --check`) after the
  last edit and report each result.
