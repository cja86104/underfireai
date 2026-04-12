# UnderFireAI — Claude Code Instructions

## Blueprint Guardian (MANDATORY)

**At the start of every session, invoke the blueprint-guardian agent before writing any code:**
```
/agent blueprint-guardian
```

**After completing any phase or batch, invoke it again to verify completion and get the next step.**

The blueprint guardian will:
- Read the full master blueprint (`UNDERFIREAI-BLUEPRINT.md`)
- Confirm current position in the build sequence
- Flag any deviations from the blueprint
- Deliver the next steps and active rules

Do not write code, create files, or make architectural decisions until the guardian has run.

## Master Blueprint

All project decisions, specifications, phases, and rules are defined in:
```
UNDERFIREAI-BLUEPRINT.md
```

This is the single source of truth. If anything in conversation conflicts with the blueprint, the blueprint wins.
