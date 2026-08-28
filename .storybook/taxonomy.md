# Storybook nav taxonomy

The left nav is built from each story's `title` string, so the taxonomy is a
naming convention, not config. Renaming a group later churns every file in it —
which is why this is written down before the catalog is filled in.

## The five top-level groups

Ordered as they appear in the sidebar (see `storySort` in `preview.js`).

| Group           | What belongs here                                                                                                                                                                                    | Source                                                                           |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Foundations** | Design tokens and primitives with no domain meaning: colour, typography, spacing, icons, and the generic controls (Button, Switch, FormField, Badge). If it could ship in any product, it goes here. | `components/dashboard/shared/`, `styles/brand.css`                               |
| **Student**     | What a learner touches outside the chapter text: flashcards, quizzes, the AI tutor, code labs.                                                                                                       | `components/flashcard/`, `components/quiz/`, `components/ai/`, `components/lab/` |
| **Chapter**     | The reading experience itself: text rendering, highlighting, illustrations, footnotes, the reader sidebar.                                                                                           | `components/chapter/`                                                            |
| **Widgets**     | Interactive science: the ported author widgets and the diagram system.                                                                                                                               | `views/*View.vue` (widget routes), `widgets/`                                    |
| **Admin**       | Creator and professor dashboards: sections, tables, editors, wizards.                                                                                                                                | `components/dashboard/sections/`, `components/dashboard/chapters/`               |

## Naming

`Group/Component` for a flat entry, `Group/Subgroup/Component` where a group is
big enough to need one. Use the component's real name — the nav should be
greppable back to a file.

    Foundations/Button
    Foundations/Colours
    Student/Flashcards/FlashcardCard
    Chapter/Highlighting/HighlightToolbar
    Admin/StatCard

## Where the line falls

The one judgement call that recurs: **Foundations vs. everything else.**

A component belongs in Foundations if it carries no domain knowledge. `Button`
and `StatusBadge` are Foundations even though the dashboard is their only
current consumer, because nothing about them knows what a course or a chapter
is. `QuizProgress` is Student despite looking generic, because it understands
questions and answers.

When genuinely torn, prefer the domain group. A component wrongly in
Foundations implies a reusability contract that doesn't exist, which is the
more expensive mistake.

## Story file placement

Stories live in a `__stories__/` directory beside the component, matching the
existing `__tests__/` convention:

    src/components/flashcard/FlashcardCard.vue
    src/components/flashcard/__stories__/FlashcardCard.stories.js

## Coverage

The catalog now reconciles all 200 Vue files in `src`: 198 are directly or
group-imported by stories, and two legacy re-export-only compatibility shims map
to their directly covered canonical implementations. There are 37 story files
across Foundations, Student, Chapter, Widgets, Admin, full-page views, the app
shell, and the complete icon gallery.

`npm run storybook:coverage` scans the source tree and fails when a Vue file has
neither a story import nor a documented compatibility mapping. This is a CI
gate, so the catalog cannot silently fall behind as components are added.

Grouped catalog stories are deliberate for tightly related primitives, icons,
chapter text blocks, illustrations, and route-level views: comparison in one
canvas is more useful than one near-empty navigation entry per file. High-risk
components also carry loading, empty, error, long-content, mobile, and
interactive variants.

Widget catalog links use `VITE_STORYBOOK_APP_BASE_URL` so a hosted Storybook can
target its matching app deployment. Local builds default to
`http://localhost:4173` (`npm run preview`).
