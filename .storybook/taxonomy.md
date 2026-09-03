# Storybook nav taxonomy

The left nav is built from each story's `title` string, so the taxonomy is a
naming convention, not config. Renaming a group later churns every file in it —
which is why this is written down.

## The seven top-level groups

Ordered as they appear in the sidebar (see `storySort` in `preview.js`).

| Group           | What belongs here                                                                                                                                                                                                                                                                                                               | Source                                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Foundations** | Design tokens and primitives with no domain meaning: colour, typography, icons, the generic controls (Button, Switch, FormField, Badge) under `Foundations/Forms`, the app navigation shell, the reading-preference pickers, and the styleguide sections that render the tokens. If it could ship in any product, it goes here. | `components/dashboard/shared/`, `components/Navigation/`, `components/settings/`, `components/styleguide/`, `styles/brand.css` |
| **Chapter**     | The reading experience itself: text rendering, highlighting, illustrations, footnotes, demos, the reader sidebar.                                                                                                                                                                                                               | `components/chapter/`                                                                                                          |
| **Student**     | What a learner touches outside the chapter text: flashcards, quizzes, the AI tutor, code labs, the student dashboard cards.                                                                                                                                                                                                     | `components/flashcard/`, `components/quiz/`, `components/ai/`, `components/lab/`, `components/student/`                        |
| **Dashboard**   | Creator and professor tooling: the dashboard rail and shell, stat tiles, sections, the chapter wizard and block editor, the TipTap editor, the dev toolbar.                                                                                                                                                                     | `components/dashboard/sections/`, `components/dashboard/chapters/`, `components/Editor/`, `components/dev/`                    |
| **Widgets**     | Interactive science as components: the widget catalog gallery and the diagram system. The widget _pages_ live under Views.                                                                                                                                                                                                      | `widgets/`                                                                                                                     |
| **Views**       | Full-page routes mounted in `ViewStoryShell`, grouped by audience: `Views/Student`, `Views/Admin`, `Views/Widgets`, `Views/Foundations`.                                                                                                                                                                                        | `views/*View.vue`                                                                                                              |
| **Legacy**      | The pre-2026 reader controls in `components/UI/` that still ship but are being migrated to `dashboard/shared/`. Kept visible so the migration stays honest; nothing new goes here.                                                                                                                                              | `components/UI/`                                                                                                               |

## Naming

`Group/Component` for a flat entry, `Group/Subgroup/Component` where a group is
big enough to need one. Use the component's real name — the nav should be
greppable back to a file.

    Foundations/Forms/Button
    Foundations/Colours
    Student/Flashcards/FlashcardCard
    Chapter/Highlighting/HighlightToolbar
    Dashboard/StatCard
    Views/Student/StudentDashboardView
    Legacy/PointComp

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

One story file per component or view, beside it, matching the existing
`__tests__/` convention:

    src/components/flashcard/FlashcardCard.vue
    src/components/flashcard/__stories__/FlashcardCard.stories.js

Each file exports a `Default` story plus one named export per state worth
seeing (loading, empty, error, long content, mobile, open, creator mode…), and
declares `args` / `argTypes` for the component's real props so the Controls
panel is useful. Props that cannot be controlled (functions, DOM elements,
store-driven state) are documented in `argTypes` with `control: false` or a
"story-only" note.

The only grouped files left are reference galleries where side-by-side
comparison is the point: `Icons`, `Colours`, `Typography`, `WidgetCatalog`.

## Coverage

`npm run storybook:coverage` scans the source tree and fails when a Vue file has
neither a story import nor a documented compatibility mapping (the two
re-export shims in `components/UI/`). `storybook:coverage:admin` and
`storybook:coverage:student-views` check their areas; the chapter area is
pinned by `.storybook/reports/chapter-components.json` and its test. All are CI
gates. `storybook:smoke:ci` then mounts every story in Chromium with external
requests blocked, so a story that fetches, throws or renders nothing fails the
build.

Widget catalog links use `VITE_STORYBOOK_APP_BASE_URL` so a hosted Storybook can
target its matching app deployment. Local builds default to
`http://localhost:4173` (`npm run preview`).
