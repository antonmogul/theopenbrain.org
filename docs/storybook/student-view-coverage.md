# Student and view Storybook coverage

This lane directly covers every Vue component in the AI tutor, flashcard, lab,
quiz, student, and styleguide component folders, plus every full-page Vue view.

| Scope                         | Covered | Excluded |
| ----------------------------- | ------: | -------: |
| Student/styleguide components |      25 |        0 |
| Full-page and widget views    |      31 |        0 |
| **Total**                     |  **56** |    **0** |

Every component and view has its own story file beside it
(`__stories__/<Name>.stories.js`), titled `Student/…`, `Foundations/…`,
`Views/Student/…`, `Views/Widgets/…` or `Views/Foundations/…` per
`.storybook/taxonomy.md`, so each has a page with controls rather than one
entry in a catalog.

Component stories expose real props as `args`/`argTypes` and carry the loading,
empty, error, long-content and responsive states as named exports. Components
that fetch on mount (QuizCard, FlashcardDeck, AITutorSidebar,
SettingsProfileSection, SettingsPanels) drive those states through
`parameters.api` / `parameters.supabase` / `parameters.auth` instead. Views
mount the real component inside `ViewStoryShell`, which provides a full-height
canvas, route context, and a visible capability error boundary for browser-only
features; view states (anonymous, empty library, not enrolled, the Python
playground's deterministic run) are parameter-driven the same way. The
Storybook API, Supabase SDK, direct Supabase fetch, and auth seams are
deterministic and never contact the live backend.

Run `npm run storybook:coverage:student-views` to enumerate the exact source to
story mapping and fail if a scoped Vue file is uncovered or the inventory
changes without updating the manifest.
