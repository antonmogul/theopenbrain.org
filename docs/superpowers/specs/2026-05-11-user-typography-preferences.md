# Track 2 — User typography & accent preferences + Settings page scaffold

**Date:** 2026-05-22 (drafted retroactively — partial implementation already on `dev`)
**Status:** Draft — pending review
**Parent:** `2026-05-11-design-refresh-overview.md`
**Depends on:** Track 1 (tokens + typography) — Track 2 consumes the `data-*` attributes Track 1 wires up.
**Implementation state:** ~70% landed; this spec documents what's in, what's missing, what changes from the umbrella, and what "done" looks like.

## Purpose

Make Track 1's token system *visible and controllable* to end users. Ship a Settings page where users pick their theme, accent, font pair, reading size, line length, and motion preference, with those choices persisting across devices when signed in.

The umbrella spec frames this as "the visible payoff of Track 1" — Track 1's tokens are invisible plumbing; Track 2 is the UI that exercises them.

## Scope

In scope:
- A `usePreferences` composable that owns six user prefs (`theme`, `accent`, `fontPair`, `readingSize`, `lineLength`, `reduceMotion`).
- `localStorage` as the always-on source of truth on the client.
- `user_preferences` Supabase table with RLS, debounced 800ms server sync for signed-in users, hydrate-from-server on auth.
- A `/settings` route hosting a Settings page with one card per preference.
- Reusable settings primitives: `ThemeCards`, `AccentSwatches`, `FontPairPicker`, `SegmentedControl`.
- An entry point to `/settings` from the global nav (currently missing — see Risk 2).

Out of scope (handled by other tracks):
- `@font-face` declarations and `[data-fontpair]` font swap rules → **Track 1** (still pending).
- Reader-side consumption of `--reading-size` / `--reading-measure` → **Track 3** (some baseline already wired through `.prose-measure` and `.text-base`).
- Email preferences, account, data & privacy sections of the brief's full Settings vision → **later phase**.
- Highlighter palette toggles → **later phase or Track 3** (we ship the tokens in Track 1 but the user-facing toggle is deferred).

Explicitly deferred:
- A full left-rail Settings nav (Reading / Theme / Email / Account / Privacy). The current single-column layout with cards is enough for this round.
- "Reset to defaults" button. Useful but not load-bearing; defer to follow-up.

## Resolved open questions (from umbrella spec)

The umbrella left two questions open for this track. Both got answered in code; this spec ratifies the decisions:

**Q1: Route name → `/settings`.** Picked over `/profile`. Rationale: this page is about device/display preferences, not identity. A separate `/profile` route may exist later for username, avatar, account info, etc.

**Q2: Preference storage shape → separate `user_preferences` table.** Picked over adding columns to `profiles`. Rationale: prefs are display state, not identity; they may grow (more fonts, more accents, future per-chapter pref overrides); keeping them on their own table keeps the `profiles` schema lean and the RLS surface small.

Trade-off accepted: this is one extra round-trip on login (hydrate from `user_preferences` after the existing `profiles` fetch). Acceptable.

## Current state (as of 2026-05-22)

| Piece | File | Status |
|---|---|---|
| `usePreferences` composable | `src/composables/usePreferences.js` | **Done.** Module-scope refs; 800ms debounced sync; `matchMedia` listener for system mode; hydrate-on-auth; all six prefs. |
| `/settings` route | `src/router/index.js` | **Done** but gated by `requiresAuth: true` — anonymous users can't reach the page. See Risk 1. |
| `SettingsView` | `src/views/SettingsView.vue` | **Done structurally.** Six cards: Appearance, Accent, Reading size, Line length, Motion, Font. |
| `ThemeCards` | `src/components/settings/ThemeCards.vue` | **Done.** System / Light / Dark with mini previews; selected state styled. |
| `AccentSwatches` | `src/components/settings/AccentSwatches.vue` | **Done.** Magenta / Teal / Amber / Mono swatches. |
| `SegmentedControl` | `src/components/settings/SegmentedControl.vue` | **Done.** Generic 3-option control used by reading-size, line-length, motion. |
| `FontPairPicker` | `src/components/settings/FontPairPicker.vue` | **Stub.** All four cards `disabled`; `title="Coming in Track 2"`. No `v-model` binding. **Needs to be wired.** |
| `user_preferences` Supabase table | `supabase/migrations/20260521000000_create_user_preferences.sql` | **Done.** RLS policies for own read/insert/update/delete; CHECK constraints on enum values. |
| Pre-paint sync | `index.html` | **Partial.** Reads `ob.theme`, `ob.accent`, `ob.fontPair`, `ob.reduceMotion`. Does NOT pre-apply `ob.typeSize` / `ob.lineLength`. Same gap as flagged in Track 1. |
| Settings entry point in global nav | `src/components/Navigation/*` | **Missing.** No link to `/settings` anywhere user-discoverable. See Risk 2. |
| `init()` called at app start | `src/main.js` | **Done.** `usePreferences().init();` runs before app mount. |

## Target deliverables

### D1. FontPairPicker wired to `usePreferences`

Replace the stub. The component should:
- Bind to `fontPair` from `usePreferences()`.
- Render the five pairs declared in the umbrella spec: `newsreader` (default), `literata`, `georgia`, `sans`, `ibm-plex-legacy`.
- Active card shows a sample (`Aa`) in its target font + the label.
- Click selects the pair, which triggers the `usePreferences` watcher → writes LS → applies `data-fontpair` → schedules server sync.
- Show a visible indication when the underlying font hasn't loaded yet (e.g., `[data-fontpair="literata"]` is selected but Literata isn't installed — show a `Fallback` chip).

Acceptance: clicking each pair visibly swaps the body font across the Settings page within one render tick.

```vue
<script setup>
import { usePreferences } from "@/composables/usePreferences";
const { fontPair } = usePreferences();
const options = [
  { value: "ibm-plex-legacy", label: "IBM Plex (current)", sample: "Aa" },
  { value: "newsreader", label: "Newsreader + Inter Tight", sample: "Aa" },
  { value: "literata", label: "Literata + Inter", sample: "Aa" },
  { value: "georgia", label: "Georgia + System UI", sample: "Aa" },
  { value: "sans", label: "Inter Tight (sans-only)", sample: "Aa" },
];
</script>
```

### D2. `/settings` accessible to anonymous users

Drop `requiresAuth: true` from the `/settings` route. Rationale:
- The composable already operates anonymously: LS is the source of truth; server sync silently no-ops when there's no session.
- Anonymous users picking dark mode or a font pair is reasonable; nothing on the page leaks personal data.
- The hydrate-on-auth watcher in `usePreferences` correctly merges server values *over* anonymous LS values once the user signs in, so the anonymous → signed-in transition is clean.

The route stays at `/settings`. Just remove the auth guard.

### D3. Settings link in the global nav

Add a "Settings" entry to the main navigation. The current candidates for placement:
- `MenuHome.vue` — main menu shown on `HomeView`.
- `MenuNav.vue` — top-level reader nav.
- `BottomNav.vue` — mobile / persistent bottom strip (already exists per the recent commit).

Recommendation: add to `BottomNav.vue` first (already gets rendered on most routes) as a gear icon → `/settings`. Optionally also surface in the main menu drop-down for desktop.

Acceptance: from any chapter or the home view, a user can click an icon and land on `/settings` in two clicks or fewer.

### D4. Pre-paint script handles reading-size and line-length

Already flagged in Track 1 D4. Restated here because it's load-bearing for *this* track: without it, switching reading-size in Settings, then reloading any reader page, causes a visible jump from default text size to the user's chosen size after JS hydrates.

The pre-paint script in `index.html` should read `ob.typeSize` and `ob.lineLength` from localStorage, look them up in the same maps that `usePreferences.js` uses (`READING_SIZE_SCALE`, `LINE_LENGTH_MEASURE`), and set `--reading-size` and `--reading-measure` as inline `style.setProperty` calls before CSS loads.

Constraint: keep the inline script under ~1KB minified. If the maps grow, factor to a tiny inline IIFE that imports nothing.

### D5. Hydrate-from-server respects unsaved local changes

Current behavior: when `isAuthenticated` flips true, `hydrateFromServer()` overwrites every local pref with whatever the server has. Edge case: user changes a setting anonymously, then signs in — their just-made change gets clobbered by their previous server-saved preference.

Fix: track which prefs have been *user-touched* in this session (not just defaults) and prefer the touched value over the server value. Simplest implementation: a `dirty` Set updated in each `watch` callback; in `hydrateFromServer`, skip applying server values for keys present in `dirty`.

This is a subtle correctness fix, not load-bearing for v1. Can defer with a `// TODO` if it complicates the PR.

### D6. Reset button (optional, recommend defer)

A "Reset to defaults" button at the bottom of the page that clears all six prefs from LS + server. Useful for support / troubleshooting. Recommend deferring to a follow-up.

### D7. Settings page typography uses the new tokens

Audit `SettingsView.vue` styles. Currently uses `rgb(var(--color-ink))`, `rgb(var(--color-mute))`, etc. — already token-correct. One thing to confirm: when the user changes their *own* font pair from Settings, the Settings page itself should re-render in the new font immediately. The current `<style scoped>` block uses no `font-family` declarations, so it inherits from `html`. Confirm this works once font pairs are actually wired.

### D8. Accessibility pass

Add to each card / control:
- Keyboard navigation: Tab through cards/swatches/segments; Space/Enter activates.
- ARIA: `role="radiogroup"` + `role="radio"` + `aria-checked` on `ThemeCards`, `AccentSwatches`, `FontPairPicker`. `SegmentedControl` already uses real `<button>` elements — add `aria-pressed`.
- Focus styles distinct from selected styles. Currently `:focus` falls back to UA default; add a visible outline using `rgb(var(--color-accent))`.
- Color contrast: confirm selected `.dot` border + hint text on dark theme meets WCAG AA.

### D9. Documentation

Add a section to `CLAUDE.md` (under the existing State Management description) describing:
- That `usePreferences` is the user-prefs equivalent of a Pinia store but implemented as a composable with module-scope refs.
- LS keys are `ob.*` namespaced.
- `data-*` attributes on `<html>` are the rendering contract — components style off them, not off composable values.
- How to add a new preference (LS key, default, watch, apply function, table column, migration, hydration field).

## Files touched

New:
- `docs/superpowers/specs/2026-05-11-user-typography-preferences.md` (this file)

Modified:
- `src/components/settings/FontPairPicker.vue` — wire to composable (D1)
- `src/router/index.js` — drop `requiresAuth` from `/settings` (D2)
- `src/components/Navigation/BottomNav.vue` — add Settings link (D3)
- `index.html` — extend pre-paint script for reading-size + line-length (D4)
- `src/composables/usePreferences.js` — dirty-tracking for hydrate (D5, optional)
- `src/views/SettingsView.vue` — accessibility attributes (D8)
- `src/components/settings/{ThemeCards,AccentSwatches,SegmentedControl}.vue` — accessibility (D8)
- `CLAUDE.md` — state-management section (D9)

Not touched:
- Supabase migration (already complete)
- The composable's core logic (only D5 dirty-tracking, optional)

## Test plan

Existing Cypress coverage of this area: none.

Manual verification:
1. **Anonymous theme switching.** Sign out (or open incognito), visit `/settings`. Confirm: page loads (D2). Flip theme to dark; confirm immediate visual update. Reload `/`; confirm dark persists.
2. **Sign-in merges server prefs.** As an anonymous user, set theme=light, accent=teal. Then sign in to an account whose server prefs are theme=dark, accent=amber. Expected (per D5): the just-set anonymous prefs win; if D5 is deferred, server prefs win. PR description should state which behavior is shipping.
3. **Cross-device sync.** Sign in on Browser A; change accent to amber. Wait 1s. Sign in on Browser B (incognito or different browser); confirm accent is amber within one full reload.
4. **Font pair selection.** From `/settings`, click each font pair card. Each click should:
   - Visually swap the body font (requires Track 1 fonts loaded — for `ibm-plex-legacy` the swap is a no-op; for others it depends on Track 1 progress)
   - Persist (`localStorage.getItem("ob.fontPair")` reflects the choice)
   - Sync (after 800ms, the `user_preferences` row reflects the choice — verify via Supabase dashboard)
5. **Reading-size / line-length pre-paint.** Set reading-size = comfortable, line-length = wide. Reload `/chapter/1/the-retina`. Expected: first paint shows the larger text + wider column. No visible jump.
6. **Reduce-motion override.** Set OS reduce-motion = on. Visit a chapter; confirm scroll animations are reduced. Then from Settings set motion = "Allow"; confirm animations resume despite OS pref.
7. **Sign-out behavior.** Sign in; set accent = mono; sign out. The page should keep accent = mono (LS retains the last value). This is the documented behavior — confirm it matches.
8. **RLS isolation.** Try to read another user's `user_preferences` row by hitting the REST endpoint with `user_id=eq.<other-uuid>`. Expected: empty array, never their data.
9. **Keyboard navigation.** Tab through every Settings control. Confirm focus is visible at every stop and activation works without a mouse.

Cypress (defer to Track 2.1):
- `cypress/e2e/settings.cy.js` — automate steps 1, 3, 4, 5.

## Handover checklist

- [ ] `FontPairPicker` is wired to `fontPair` from `usePreferences`; all five pairs selectable; visible font swap on each pick (where Track 1 fonts have loaded).
- [ ] `/settings` is accessible without authentication.
- [ ] Global nav has a discoverable Settings entry point.
- [ ] Pre-paint script handles reading-size and line-length.
- [ ] (Optional) Dirty-tracking implemented so anonymous → signed-in transitions don't clobber unsaved changes; if deferred, an issue exists.
- [ ] Accessibility pass complete (ARIA roles, keyboard nav, focus styles, contrast).
- [ ] `CLAUDE.md` documents the prefs system.
- [ ] Manual test plan steps 1–9 pass on Chrome + Safari.
- [ ] PR description explicitly states whether D5 (dirty-tracking) is in or deferred.

## Risks and call-outs

1. **Anonymous `/settings` access.** Removing `requiresAuth` from `/settings` exposes a route to logged-out users. Audit confirms the page has no sensitive content and the composable handles no-session correctly (server sync silently no-ops). Low risk, but verify there's no implicit assumption elsewhere that a `requiresAuth` route means "user is real."

2. **No nav entry point.** Even after wiring everything, users will not be able to *find* the page without typing `/settings`. D3 is non-optional for the track to feel done.

3. **Settings UI not styled for new tokens yet.** Current `SettingsView` uses token-correct CSS variables. Confirm that when an anonymous user changes accent, the page itself updates (it should — `border-color: rgb(var(--color-accent))` etc. is reactive to data-attr). Confirm in test step 1.

4. **`hydrateFromServer` race.** If the user opens the Settings page during the 800ms debounce window for a previous change, then changes another setting, the in-flight server sync and the hydrate response can interleave. Today's code: every change scheduled separately; the latest scheduled call wins (timer reset). Server response can't overwrite a more-recent local change because watches fire synchronously and hydrate is async. Should be fine in practice; flag for review.

5. **Server payload always upserts every field.** `syncToServer` sends all six fields on every change. Wasteful but cheap. Optimizing to PATCH-only-changed-fields is a follow-up if it ever becomes load-bearing (it won't).

6. **Default `fontPair = "ibm-plex-legacy"` mismatches `usePreferences` default.** The composable's `DEFAULTS.fontPair = "ibm-plex-legacy"` and the umbrella spec's "Newsreader is the default" are in tension. Track 1 resolved this by keeping IBM Plex default for now (Q4); ratify the same here. When Newsreader is wired and a separate commit flips the default, update both `DEFAULTS.fontPair` *and* the `user_preferences` table default in a coordinated migration.

7. **`reading_size text not null default 'regular'` constraint vs `usePreferences` default `'regular'`.** Match. Confirmed.

## Definition of done

Track 2 is done when:
- A first-time visitor can land on `/settings`, pick a theme, font, accent, and reading size, and see those choices apply immediately and persist on reload.
- A signed-in user changing the same settings on a second device sees them sync within ~1s.
- A user can reach the Settings page from the global nav without typing the URL.
- No flash of unstyled / wrong-color content on first paint for any of the six prefs.
- Keyboard-only users can navigate and use every control.
