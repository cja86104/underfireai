# CLAUDE.md — UnderFireAI Project Rules

## File editing
- Never use placeholder, fake, mock, dummy, stub, or “TODO later” code unless the task explicitly asks for test doubles.
- Never leave code looking finished when it is not finished.
- Never claim a fix is complete unless you have verified it by reading the modified file back and running the relevant commands.

## Editing on this mount
- Never use `Write` or `Edit` tools on files in this project.
- Always use `mcp__workspace__bash` with a heredoc or shell-based editing commands.
- For large files, use `sed`, `awk`, `python -c`, or heredoc writes through bash.
- This rule applies to every file in the project.

## Production discipline
- Treat every change as production-bound.
- No mock data unless explicitly requested.
- No placeholders.
- No unfinished branches presented as complete.
- No skipped validation.
- No “should work” claims.
- No silent assumptions.

## Required verification flow
For every task:
1. Read the relevant file(s).
2. Make the smallest safe change.
3. Read the modified file back.
4. Run the narrowest relevant test or validation command.
5. If it fails, fix it and rerun.
6. Run lint if the change touches application code.
7. Run the relevant integration or E2E test if the change affects user flow.
8. Only then report completion.

## Test rules
- Every new behavior must have an automated test.
- Every bug fix must include a test that fails before the fix and passes after.
- Do not add code without a way to verify it.
- Do not skip tests because they seem unnecessary.
- Do not rely on manual inspection when an automated test is possible.
- Do not use fake data in place of real verification unless the task explicitly asks for a test double.
- Never say “done” unless the exact command output shows success.

## Command discipline
- Use the repo’s documented test scripts first.
- Prefer targeted tests before full-suite runs.
- Example order:
  - `pnpm lint`
  - `pnpm test <targeted-file-or-pattern>`
  - `pnpm test:e2e <targeted-flow>`
  - `pnpm test:coverage` when coverage matters
- If a command name is unclear, inspect `package.json` or repo docs instead of guessing.

## ESLint discipline
- Do not add `eslint-disable` comments unless absolutely necessary.
- Any `eslint-disable` must include a short reason.
- Track every suppression and remove it once the issue is fixed.
- Prefer fixing the code over suppressing the rule.

## Audit workflow
- The standing verification artifact is `underfireai-audit-checklist-v1.md` at the repo root.
- Walk it top-down.
- Fix the first failure before moving to the next item.
- Do not silently skip items.
- Do not mark an item complete unless it has been verified.

## Client-ready verification summary
Before answering the client, always produce a short verification summary with these fields:

- Files changed:
- Commands run:
- Results:
- Known limitations:

Rules:
- Do not leave any field blank.
- If no files changed, say `none`.
- If no commands were run, say `none` and explain why.
- If a command failed, include the exact failing command and the failure reason.
- Do not claim completion without at least one real verification command.
- Do not replace real test results with guesses, summaries, or “looks good” language.
- If something is not verified, list it under `Known limitations`.

## Required final response format
When reporting work, always end with this block:

- Files changed:
- Commands run:
- Results:
- Known limitations:
- Ready for client: yes/no

Rules for the final response:
- The summary must reflect real commands that were executed in the current session.
- The summary must mention the exact command names, not generic descriptions.
- If a command was not run, say why.
- If any test or lint step failed, stop and report failure instead of presenting the work as complete.
- If the code was changed but not tested, state that it is unverified.
- Never present unverified code as client-ready.