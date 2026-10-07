/**
 * Keyboard and focus helpers shared by the deck editor's parts
 * (OPENBRAIN-129, spec section 8).
 *
 * - onRadioKeydown: arrow keys, Home and End for a radio group built from
 *   buttons with role="radio" (the icon grid, the role swatches). Focus moves
 *   and the option is chosen, as with native radios.
 * - focusChecked / focusFirst: a radio group or a fieldset carries the
 *   field's DOM id so the Problems drawer can focus it; the group itself
 *   only takes programmatic focus (tabindex -1) and hands it on to the
 *   checked option, or its first control.
 * - useDialogFocus (src/composables/useDialogFocus.js, re-exported here):
 *   BaseModal moves no focus of its own, so each deck dialog moves focus to
 *   its first control when it opens and back to whatever opened it when it
 *   closes. `forget()` skips that return, for a dialog that closes by
 *   sending focus somewhere on purpose (Problems jumping to a field).
 *   ConfirmDialog uses it too.
 */
export { useDialogFocus } from "@/composables/useDialogFocus.js";

const STEP = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

export function onRadioKeydown(event, choose) {
  const group = event.currentTarget;
  const options = [...group.querySelectorAll('[role="radio"]')];
  if (!options.length) return;
  const current = Math.max(options.indexOf(document.activeElement), 0);
  let next;
  if (STEP[event.key]) {
    next = (current + STEP[event.key] + options.length) % options.length;
  } else if (event.key === "Home") next = 0;
  else if (event.key === "End") next = options.length - 1;
  else return;
  event.preventDefault();
  options[next].focus();
  choose(next);
}

/** A group with the field id hands programmatic focus to its first control. */
export function focusFirst(event) {
  if (event.target !== event.currentTarget) return;
  event.currentTarget
    .querySelector("input, select, textarea, button:not([disabled])")
    ?.focus();
}

export function focusChecked(event) {
  if (event.target !== event.currentTarget) return;
  const group = event.currentTarget;
  const target =
    group.querySelector('[role="radio"][aria-checked="true"]') ||
    group.querySelector('[role="radio"]');
  target?.focus();
}
