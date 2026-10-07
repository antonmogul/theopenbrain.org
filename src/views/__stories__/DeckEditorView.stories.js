/*
 * Views/Admin/DeckEditorView — the deck editor at /dashboard/decks/:slug
 * (OPENBRAIN-129): the slide rail, the live preview and the selected
 * slide's form. Backed by the in-memory decks API in
 * src/stories/deckFixtures.js, so edits autosave, undo, publish and share
 * as they would live. At 1024–1279px the rail becomes a strip of
 * thumbnails; below 1024px there is only Present draft and Share.
 */
import ViewStoryShell from "@/stories/ViewStoryShell.vue";
import { creatorParameters, decksApi } from "@/stories/deckFixtures.js";
import DeckEditorView from "../DeckEditorView.vue";

export default {
  title: "Views/Admin/DeckEditorView",
  component: DeckEditorView,
  parameters: { layout: "fullscreen" },
  args: { slug: "funding" },
  render: (args) => ({
    components: { DeckEditorView, ViewStoryShell },
    setup: () => ({ args }),
    template: `
      <ViewStoryShell label="DeckEditorView" :path="'/dashboard/decks/' + args.slug">
        <DeckEditorView :slug="args.slug" />
      </ViewStoryShell>`,
  }),
};

/**
 * The funding deck: published, shown at /deck, with changes since it was
 * published (so "Publish changes" is on).
 */
export const Default = { parameters: creatorParameters(decksApi()) };

// Wait for the editor, retitle the deck and save with Ctrl+S: the in-memory
// API lets "another tab" save first, so the save comes back with 0 rows.
async function saveAgainstAnotherTab({ canvasElement }) {
  let input = null;
  for (let i = 0; i < 50 && !input; i += 1) {
    input = canvasElement.querySelector('input[aria-label="Deck title"]');
    if (!input) await new Promise((r) => setTimeout(r, 100));
  }
  if (!input) return;
  input.value = "The Open Brain — Funding deck (edited)";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input
    .closest(".de")
    ?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "s", ctrlKey: true, bubbles: true })
    );
}

/**
 * Another tab saved first: Load theirs, or Keep mine to save over it.
 * Closing the dialog leaves the deck unsaved, with Resolve in the header.
 */
export const Conflict = {
  parameters: creatorParameters(decksApi({ conflict: true })),
  play: saveAgainstAnotherTab,
};

/** A slug with no deck behind it. */
export const NotFound = {
  args: { slug: "no-such-deck" },
  parameters: creatorParameters(decksApi()),
};
