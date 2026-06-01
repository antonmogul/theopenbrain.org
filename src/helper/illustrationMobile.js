// Mobile render-mode classifier for Chapter-1 illustrations.
//
// On desktop, figures live in a fixed sticky pane (`IllustrationsComp.vue`) that
// is `hidden` below the `xl` breakpoint, so mobile users see no figures at all —
// except `fullscreen: true` figures, which already render inline-in-flow via
// `FullScreenIllustration.vue`. `IllustrationInline.vue` uses this classifier to
// decide how to render each figure on mobile.
//
// The mode is derived from the animation's OWN flags (the same flags the desktop
// render paths branch on), so this stays in sync with how figures actually
// behave. Only the handful that genuinely can't reflow inline are pinned to
// `fullscreen` via FULLSCREEN_FALLBACK.

// Figures that can't reflow inline on a phone and must open in a fullscreen
// overlay instead. The split figures render two side-by-side Lottie panes driven
// by scrubbed scroll (`FullScreenIllustrationSplit.vue`) — they collapse below
// ~768px, so they get a poster + tap-to-view.
export const FULLSCREEN_FALLBACK = new Set([
  "animationLatteralOrganization", // split (note: legacy spelling in data)
  "animationLateralOrganization", // scroll + split
]);

/**
 * Classify an animation into a mobile render mode.
 *
 * @param {Object} animation - the animation object (from Supabase or animations.json)
 * @returns {"skip"|"static"|"fullscreen"|"scroll"|"interactive"}
 *   - skip:        scene transitions; not a standalone figure, don't render inline
 *   - static:      a plain image or embedded video; render as-is at full width
 *   - fullscreen:  can't reflow inline; show a poster + tap-to-view overlay
 *   - scroll:      scroll-driven figure; keep scroll behavior in an inline box
 *   - interactive: clickable / auto-playing figure; render inline with its controls
 */
export function mobileMode(animation) {
  if (!animation) return "skip";

  // Scene transitions are choreography between figures, not figures themselves.
  if (animation.isTransition) return "skip";

  // Explicit per-figure escape hatch for the ones that break inline.
  if (FULLSCREEN_FALLBACK.has(animation.id)) return "fullscreen";

  // Plain image or embedded YouTube — trivially full-width inline.
  if (animation.illuImage || animation.youtubeID) return "static";

  // `fullscreen: true` figures render via FullScreenIllustration, which is
  // scroll-driven (a tall scroll block with a sticky inner pane).
  if (animation.fullscreen) return "scroll";

  // `scroll: true` without fullscreen (e.g. IllustrationOnScroll) is still
  // scroll-driven.
  if (animation.scroll) return "scroll";

  // Everything else — clickTriggered state figures, switch figures, flip video
  // cards, plain loops — is interactive/auto-playing and not scroll-bound.
  return "interactive";
}
