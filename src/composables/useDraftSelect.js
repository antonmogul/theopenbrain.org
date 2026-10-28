/*
 * A <select> that saves once per choice (OPENBRAIN-131, 157). Arrow keys on
 * a closed select fire `change` at every step (Chromium on Linux and
 * Windows), so every step is a draft the select shows; the choice is saved
 * after a pause (`delay`), on Enter, or when the select loses focus. One
 * save and one undo entry per choice, and on a published chapter the
 * confirmation opens only then, not at the first arrow key. The chapter
 * editor's figure "Stays" and breakout-box "Colour" selects are both this.
 *
 * Saved, the row holds the value; refused or cancelled, the select goes
 * back to what is stored. A newer choice made meanwhile keeps its own
 * draft. The caller's `save(key, draft)` runs the write (through whatever
 * confirmation it needs) and must end by calling `settle(key, draft)`,
 * whether the write succeeded, failed or was cancelled.
 */
import { ref } from "vue";

/**
 * @param {object} options
 * @param {number} options.delay ms of quiet before a draft is saved
 * @param {(key: string) => string} options.stored the select's stored value
 * @param {(key: string, draft: string) => void} options.save the write
 */
export function useDraftSelect({ delay, stored, save }) {
  const drafts = ref({}); // key → the select's value, not yet stored
  const timers = new Map();
  const saving = new Map(); // key → the draft handed to the save

  const shown = (key) => drafts.value[key] ?? stored(key);

  function drop(key) {
    clearTimeout(timers.get(key));
    timers.delete(key);
    if (!(key in drafts.value)) return;
    const rest = { ...drafts.value };
    delete rest[key];
    drafts.value = rest;
  }

  function settle(key, draft) {
    if (saving.get(key) === draft) saving.delete(key);
    if (drafts.value[key] === draft) drop(key);
  }

  /** The select changed: keep the draft and save it after the pause. */
  function choose(key, value) {
    drafts.value = { ...drafts.value, [key]: value };
    clearTimeout(timers.get(key));
    timers.set(
      key,
      setTimeout(() => flush(key), delay)
    );
  }

  /** Save the draft now (Enter, blur, or the pause ending). */
  function flush(key) {
    clearTimeout(timers.get(key));
    timers.delete(key);
    const draft = drafts.value[key];
    if (draft === undefined || saving.get(key) === draft) return;
    if (draft === stored(key)) return drop(key);
    saving.set(key, draft);
    save(key, draft);
  }

  function dispose() {
    timers.forEach((timer) => clearTimeout(timer));
    timers.clear();
  }

  return { shown, choose, flush, settle, dispose };
}
