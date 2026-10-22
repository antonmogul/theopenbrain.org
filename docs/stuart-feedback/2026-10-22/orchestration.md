# Execution and review tracking

Run: `run_1ea7be7d10b3`. Implementation workers verified as `gpt-6-astra`, high effort, in isolated checkouts from `origin/main` at `3f1bcd81`.

| Task | ID | Dependency |
|---|---|---|
| G1 Reader and Retina runtime | `task_035882eed9ae` | [] |
| G2 Figures galleries and media | `task_786bdc9fd52d` | [] |
| G3 Phrenology maps and content | `task_c9e669958262` | [] |
| G4 Penfield maps and labels | `task_2c44fb8024c6` | [] |
| G5 Loewi layout and widget narration | `task_94cc0bc3e655` | [] |
| G6 Breakout prototypes and reference links | `task_81b9d6c05580` | [] |
| G1 independent PR review | `task_952b3198b264` | ["task_035882eed9ae"] |
| G2 independent PR review | `task_9aae2345d55c` | ["task_786bdc9fd52d"] |
| G3 independent PR review | `task_097e50ad0896` | ["task_c9e669958262"] |
| G4 independent PR review | `task_42199d0dbb30` | ["task_2c44fb8024c6"] |
| G5 independent PR review | `task_0765b32dd937` | ["task_94cc0bc3e655"] |
| G6 independent PR review | `task_4109d02c7e37` | ["task_81b9d6c05580"] |

Independent reviewers start only after the relevant implementation PR/head is available. They do not edit source. Findings go back to an Astra fix owner and a fresh review of the corrected head. No merge/deploy/email is authorized by this execution phase.

## Reserved migration versions

- G2 figures/media: `20261022010000`.
- G4 Penfield title: `20261022020000`.
- G5 Loewi upload: `20261022030000`.

These are reservations for committed, unapplied migrations. Do not confuse file creation with database execution.

## Review routing

- G3 PR144 at `fa232f4c`: independent review requested changes for lost native-control keyboard focus and clipped mobile detail text in the real widget host. Review settled; reviewer released. Astra fix task `task_0b583db39900`, dispatch `ctx_d50c548fd7d7`, in the same G3 checkout; requires exact-new-head re-review.
- G4 PR145 at `7bedea98`: independent review dispatch `ctx_b2f21023e70f`; implementation worker settled and released.
- G5 PR146 at `e63a6ba6`: independent review dispatch `ctx_d43a9fd8c9e8`; implementation worker settled and released.

Review reports currently at `/tmp/openbrain-G3-independent-review.md` and the corresponding G4/G5 paths when those settle. Copy final reports into these coordinator notes for durable retention before final handoff.
