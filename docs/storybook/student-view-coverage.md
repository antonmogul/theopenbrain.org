# Student and view Storybook coverage

This lane directly covers every Vue component in the AI tutor, flashcard, lab,
quiz, student, and styleguide component folders, plus every full-page Vue view.

| Scope                         | Covered | Excluded |
| ----------------------------- | ------: | -------: |
| Student/styleguide components |      25 |        0 |
| Full-page and widget views    |      31 |        0 |
| **Total**                     |  **56** |    **0** |

Component stories use realistic Foundations of Neuroscience fixtures. Views
mount the real component inside `ViewStoryShell`, which provides a full-height
canvas, route context, and a visible capability error boundary for browser-only
features. The Storybook API, Supabase SDK, direct Supabase fetch, and auth seams
are deterministic and never contact the live backend.

Run `npm run storybook:coverage:student-views` to enumerate the exact source to
story mapping and fail if a scoped Vue file is uncovered or the inventory
changes without updating the manifest.
