# Completion notes for Stuart

Do not send yet. Scope: the two follow-up emails of 22 October, not the preceding meeting backlog.

| Group | Research / plan | Implementation PR | Independent review | Validation | Database / deployment | Plain-English note |
|---|---|---|---|---|---|---|
| G1 Reader/Retina | Astra researching | Pending | Pending | Pending | Not deployed | Pending evidence |
| G2 Figures/media | Astra researching | Pending | Pending | Pending | Not deployed | Pending evidence |
| G3 Phrenology | Astra researching | Pending | Pending | Pending | Not deployed | Pending evidence |
| G4 Penfield | Astra researching | Pending | Pending | Pending | Not deployed | Pending evidence |
| G5 Loewi/audio | Astra researching | Pending | Pending | Pending | Not deployed | Pending evidence |
| G6 Breakouts/links | Astra researching | Pending | Pending | Pending | Prototype decisions remain open | Pending evidence |

Final reply should name actual fixes, tested browsers/sizes, remaining design decisions, content migrations and what is genuinely live. PR creation or passing local tests alone is not deployment acceptance.

## First research checkpoints

- G1: current main already includes PR143 trigger/sequence fixes; investigates missing rendered artwork rather than duplicating those fixes.
- G2: current gallery interval is 10 seconds; the reported short figure window is the validated-in-primates paragraph (Figure 11), not the previously spaced Figure 10.
- G3: reproduced seven reported selections; parser promotes stroke-only SVG details to filled regions. Dropdown and editorial-text requests remain valid on main.
- G4: PR143 already fixes much of map fitting; remaining work is presentation labels and title, with an unapplied guarded title migration.
- G5: investigates inherited parent CSP blocking embedded data-MP3 narration; minimal media policy repair requires served-browser confirmation.
- G6: independent expansion already exists; missing behavior is desktop pairing. Lateral format remains an opt-in prototype and discussion item.
