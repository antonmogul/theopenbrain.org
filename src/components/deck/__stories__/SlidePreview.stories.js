/*
 * Deck/SlidePreview — one slide drawn from its deck entry and scaled to the
 * width it is given (OPENBRAIN-129): the deck editor's live preview, the
 * rail's thumbnails and the Decks list's cards. It never mounts DeckStage.
 * The stories show what it reports back: `overflow` when text runs off the
 * slide, `error` when the slide can't be drawn.
 */
import { ref } from "vue";
import SlidePreview from "../SlidePreview.vue";
import { FUNDING_DECK } from "@/data/decks/funding.js";
import { creatorParameters } from "@/stories/deckFixtures.js";

const entry = (id) => structuredClone(FUNDING_DECK.find((e) => e.id === id));

const render = (width) => (args) => ({
  components: { SlidePreview },
  setup() {
    const overflow = ref(false);
    const error = ref(null);
    return { args, overflow, error, width };
  },
  template: `
    <div :style="{ width: width + 'px', maxWidth: '100%', display: 'grid', gap: '8px' }">
      <SlidePreview v-bind="args" @overflow="overflow = $event" @error="error = $event" />
      <p v-if="!args.thumb" style="margin: 0; font: var(--ui-size-12) var(--font-mono); color: rgb(var(--color-mute))">
        overflow: {{ overflow ? "yes" : "no" }} · error: {{ error || "none" }}
      </p>
    </div>`,
});

export default {
  title: "Deck/SlidePreview",
  component: SlidePreview,
  parameters: creatorParameters(),
  argTypes: {
    entry: { control: "object", description: "A deck entry." },
    thumb: { control: "boolean" },
    debounce: { control: { type: "number", min: 0, step: 50 } },
    label: { control: "text" },
  },
  args: {
    entry: entry("team"),
    thumb: false,
    debounce: 0,
    label: "Preview of slide 2: Team",
  },
  render: render(720),
};

/** The editor's centre pane: a full preview with its accessible name. */
export const Default = {};

/** A rail thumbnail: inert, no overflow check, no video fetched. */
export const Thumb = {
  args: { entry: entry("users"), thumb: true, label: "" },
  render: render(200),
};

/** A title too long for the display size runs off the slide: overflow. */
export const Overflow = {
  args: {
    entry: {
      ...entry("intro"),
      props: {
        ...entry("intro").props,
        title:
          "The Open Brain: an interactive, open-access neuroscience textbook",
      },
    },
    label: "Preview of slide 1: Intro",
  },
};

/** A slide whose layout the editor doesn't know: the error, not a crash. */
export const BrokenSlide = {
  args: {
    entry: {
      id: "s-0badc0de",
      label: "Chart",
      layout: "chart",
      props: { title: "Readers per month" },
    },
    label: "Preview of slide 4: Chart",
  },
};
