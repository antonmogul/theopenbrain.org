/*
 * useFigureLegend — a figure's legend, folded behind its "Legend" control
 * (OPENBRAIN-177, OPENBRAIN-190). One behaviour for every figure in the
 * reader, whoever draws its toolbar: the image shell
 * (IllustrationPlaceholder) and the figure widgets that draw their own row
 * (widgets/figures/shared/FigureBar.vue; OPENBRAIN-195, Stuart, 13 Nov:
 * "the default 'collapsing' of the figure legends is not consistently
 * implemented").
 *
 * - Folded by default. It stays in the document, so screen readers read it
 *   with the figure.
 * - A click keeps it open (`pinned`), in its place under the title, and a
 *   second one folds it again.
 * - Where it can float (`floats()`: in the pane, where there is artwork to
 *   float over), a mouse resting on the heading or keyboard focus on the
 *   control is a look (`peek`): the legend floats over the edge of the
 *   artwork and nothing moves. In the text column there is no look: the
 *   legend opens on a tap.
 *
 * `onMove` is called when keeping it open or folding it changed the page.
 */
import { computed, onBeforeUnmount, ref } from "vue";

/** A pointer crossing the heading on its way elsewhere should not flash
 *  the legend: it opens after this beat. */
const PEEK_AFTER_MS = 140;

export function useFigureLegend({ floats = () => true, onMove } = {}) {
  const pinned = ref(false);
  const peek = ref(false);
  const folded = computed(() => !pinned.value);
  /** Folded where it can float: the panel takes no room of its own. */
  const floating = computed(() => !!floats() && folded.value);
  /** The floating panel is showing. */
  const open = computed(() => floating.value && peek.value);

  let peekTimer = null;
  function clearPeekTimer() {
    clearTimeout(peekTimer);
    peekTimer = null;
  }
  // Only for a mouse: a tap is a click.
  function onHover(e) {
    if (!floats() || e.pointerType !== "mouse" || peek.value) return;
    clearPeekTimer();
    peekTimer = setTimeout(() => {
      peekTimer = null;
      peek.value = true;
    }, PEEK_AFTER_MS);
  }
  function onLeave() {
    clearPeekTimer();
    peek.value = false;
  }
  function onFocus() {
    if (floats()) peek.value = true;
  }
  function onBlur() {
    peek.value = false;
  }
  function toggle() {
    clearPeekTimer();
    pinned.value = !pinned.value;
    // Unpinning closes it even while the pointer is still on the control.
    if (!pinned.value) peek.value = false;
    onMove?.();
  }
  function close() {
    clearPeekTimer();
    const wasOpen = pinned.value;
    pinned.value = false;
    peek.value = false;
    if (wasOpen) onMove?.();
  }
  onBeforeUnmount(clearPeekTimer);

  return {
    pinned,
    peek,
    folded,
    floating,
    open,
    onHover,
    onLeave,
    onFocus,
    onBlur,
    toggle,
    close,
  };
}
