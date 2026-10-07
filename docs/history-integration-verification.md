# History integration verification

The integration restores History appendix content and assets, repairs cabinet
and skull interactions, and improves reader navigation, dialogs, figure lifecycle,
flashcard completion, AI availability messaging, and Creator dashboard reads.
Optional navigation designs remain previews. AI preview behavior is not evidence
of live AI service delivery.

Fresh local checks on 7 October 2026, using Node 20.19.5:

- 1,399 tests passed in 154 files, including all 16 isolated SQL execution tests
  with PGlite 0.5.8 supplied explicitly.
- ESLint passed with zero errors and seven existing warnings; formatting passed.
- Architecture check passed with zero errors and one existing orphan warning.
- Application production build and Storybook build passed.
- Storybook coverage: 241/241 components/views, 210 story files.
- Independent code and migration reviews completed; browser-driven cabinet focus
  and layout corrections have corresponding regression coverage.

The new History browser workflow exercises mocked, isolated fixtures and retains
settled-state screenshots and timestamped motion traces for review. Hosted checks and screenshot inspection must be assessed
on the PR head; local unit/build results do not establish visual acceptance or
live Supabase parity. There is no separate TypeScript check script in this project.

Acceptance remains open for the correct Matisse/tumi hero assets, source map and
caption ambiguities, remaining artwork, and actual audio/AI service behavior.
No substitute hero art or source decisions are introduced by this integration.
Broader development-tooling follow-up remains in the private maintainer review;
this PR is not security signoff.

See [database rollout instructions](history-integration-migrations.md). The two
content migrations have not been applied to production. Merging main can trigger
the Railway frontend deployment, but does not run Supabase migrations. Deployment,
live content changes, and merge require separate authorization.
