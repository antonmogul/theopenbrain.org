/*
 * Chapter/ReaderShell/ChapterTimeline — the dock at the bottom of a chapter
 * (OPENBRAIN-128), drawn from the real Retina (timelineFixture.js): its
 * paragraphs, videos, breaks and the three widgets the reader places in it.
 *
 * The dock is fixed to the bottom of the frame, over a page of the chapter.
 * Hover it (or Tab to it) to peek; the map button opens the full-screen map;
 * a click on a bar moves the story's reading position there. Peek, SignedIn,
 * Neutral and Phone open it in `play` by focusing the slider, as a keyboard
 * reader would, so the preview card shows the bar being read.
 *
 * The model and layers are built in the render from the story-only controls
 * (progress, signedIn, empty): Maps don't survive Storybook's args.
 */
import { computed, ref, watch } from "vue";
import { fn } from "storybook/test";
import ChapterTimeline from "../ChapterTimeline.vue";
import {
  EMPTY_MODEL,
  RETINA_TITLE,
  emptyLayers,
  firstIndexOf,
  percentAt,
  positionAt,
  retinaLayers,
  retinaModel,
  retinaProse,
} from "./timelineFixture";

const model = retinaModel();
const PAGE = retinaProse(3);
// The colour-vision widget, and a paragraph the reader and others marked.
const WIDGET = firstIndexOf(model, "widget");
const signedInLayers = retinaLayers(model);
const MARKED = [...signedInLayers.highlights.keys()].find((i) =>
  signedInLayers.trending.has(i)
);

const focusSlider = async ({ canvasElement }) => {
  canvasElement.querySelector('[role="slider"]')?.focus();
};

export default {
  title: "Chapter/ReaderShell/ChapterTimeline",
  component: ChapterTimeline,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    // Each story in its own frame: the dock is fixed to the viewport.
    docs: { story: { inline: false, height: "420px" } },
  },
  // The Retina is a Perception chapter.
  globals: { chapter: "perc" },
  args: {
    progress: 42,
    signedIn: false,
    empty: false,
    chapterTitle: RETINA_TITLE,
    hidden: false,
    onJump: fn(),
  },
  argTypes: {
    progress: {
      control: { type: "range", min: 0, max: 100, step: 1 },
      description:
        "Story-only: how far the reader is, in percent. Sets `position` (the fractional item index) and `readPercent`.",
    },
    signedIn: {
      control: "boolean",
      description:
        "Story-only: include the reader's highlights and notes in `layers` (trending shows either way).",
    },
    empty: {
      control: "boolean",
      description: "Story-only: a chapter with no paragraphs yet.",
    },
    chapterTitle: { control: "text" },
    hidden: { control: "boolean" },
    model: {
      control: false,
      description: "buildTimeline() result; built from the Retina here.",
    },
    position: { control: false },
    readPercent: { control: false },
    layers: {
      control: false,
      description:
        "Maps of item index → highlights / notes / trending (useChapterTimeline).",
    },
    onJump: {
      description:
        "Emitted with the item index to scroll to, or `{ index, anchorId }` for a section or subsection picked in the map (its heading), then `{ pointer }`: true when a click or tap made the jump (its focus shows no ring).",
    },
  },
  render: (args) => ({
    components: { ChapterTimeline },
    setup() {
      const chapter = computed(() => (args.empty ? EMPTY_MODEL : model));
      const position = ref(0);
      watch(
        () => [args.progress, args.empty],
        () => (position.value = positionAt(chapter.value, args.progress)),
        { immediate: true }
      );
      const percent = computed(() => percentAt(chapter.value, position.value));
      const layers = computed(() =>
        args.empty
          ? emptyLayers()
          : args.signedIn
            ? signedInLayers
            : retinaLayers(model, { signedIn: false })
      );
      function onJump(target, how) {
        position.value = typeof target === "object" ? target.index : target;
        args.onJump?.(target, how);
      }
      return { args, chapter, position, percent, layers, onJump, PAGE };
    },
    template: `
      <div style="min-height:100vh;background:rgb(var(--color-paper));">
        <article style="max-width:38rem;margin:0 auto;padding:48px 24px 160px;font-family:var(--font-body);font-size:var(--type-body-sm-size);line-height:var(--type-body-sm-lh);color:rgb(var(--color-ink));">
          <p v-for="(text, i) in PAGE" :key="i" style="margin:0 0 1em;">{{ text }}</p>
        </article>
        <ChapterTimeline
          :model="chapter"
          :position="position"
          :read-percent="percent"
          :layers="layers"
          :chapter-title="args.chapterTitle"
          :hidden="args.hidden"
          @jump="onJump"
        />
      </div>`,
  }),
};

/** At rest: the 20px strip, read part in the chapter colour, % at the right. */
export const Default = {};

/** Peek, on the colour-vision widget: its card, thumbnail and credit. */
export const Peek = {
  args: { progress: percentAt(model, WIDGET + 0.4) },
  play: focusSlider,
};

/** Signed in, on a passage the reader highlighted and others trend: the
    "you" lane, the trending caps and both in the card. */
export const SignedIn = {
  args: { signedIn: true, progress: percentAt(model, MARKED + 0.5) },
  play: focusSlider,
};

/** No chapter ramp (a chapter outside the subject map): magenta, the
    fallback accent. */
export const Neutral = {
  globals: { chapter: "none" },
  args: { signedIn: true, progress: percentAt(model, MARKED + 0.5) },
  play: focusSlider,
};

/** 390px: the bars share pixels and the card stays inside the screen. */
export const Phone = {
  globals: { viewport: { value: "phone" } },
  args: { signedIn: true, progress: 88 },
  play: focusSlider,
};

/** A chapter with nothing in it yet: an empty strip at 0%. */
export const Empty = {
  args: { empty: true, progress: 0 },
};
