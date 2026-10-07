/*
 * Chapter/ReaderShell/TimelineMap — the chapter timeline full screen
 * (OPENBRAIN-128), as the dock's map button opens it, for the real Retina
 * (timelineFixture.js): the bars large, then the chapter section by section
 * with its subsections, widgets, figures and media, the reader's highlights
 * and notes, and trending passages.
 *
 * Rendered open in its own frame (it is fixed over the viewport and locks
 * the page scroll). Close and jump are actions here; in the reader the dock
 * closes it.
 */
import { computed } from "vue";
import { fn } from "storybook/test";
import TimelineMap from "../TimelineMap.vue";
import {
  EMPTY_MODEL,
  RETINA_TITLE,
  emptyLayers,
  positionAt,
  retinaLayers,
  retinaModel,
} from "./timelineFixture";

const model = retinaModel();

export default {
  title: "Chapter/ReaderShell/TimelineMap",
  component: TimelineMap,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: { story: { inline: false, height: "720px" } },
  },
  globals: { chapter: "perc" },
  args: {
    progress: 42,
    signedIn: false,
    empty: false,
    chapterTitle: RETINA_TITLE,
    touch: false,
    onClose: fn(),
    onJump: fn(),
  },
  argTypes: {
    progress: {
      control: { type: "range", min: 0, max: 100, step: 1 },
      description:
        "Story-only: how far the reader is. Sets `position` and `readPercent`.",
    },
    signedIn: {
      control: "boolean",
      description: "Story-only: include the reader's highlights and notes.",
    },
    empty: {
      control: "boolean",
      description: "Story-only: a chapter with no items.",
    },
    chapterTitle: { control: "text" },
    touch: { control: "boolean" },
    model: { control: false },
    position: { control: false },
    readPercent: { control: false },
    layers: { control: false },
    onClose: {
      description:
        "Escape or the close button, with `{ pointer }`: true when a click or tap closed it.",
    },
    onJump: {
      description:
        "Emitted with the item index of an entry, or `{ index, anchorId }` for a section or subsection (its heading), then `{ pointer }`: true when a click or tap made the jump.",
    },
  },
  render: (args) => ({
    components: { TimelineMap },
    setup() {
      const chapter = computed(() => (args.empty ? EMPTY_MODEL : model));
      const position = computed(() => positionAt(chapter.value, args.progress));
      const layers = computed(() =>
        args.empty
          ? emptyLayers()
          : retinaLayers(model, { signedIn: args.signedIn })
      );
      return { args, chapter, position, layers };
    },
    template: `
      <div style="min-height:100vh;">
        <TimelineMap
          :model="chapter"
          :position="position"
          :read-percent="args.progress"
          :layers="layers"
          :chapter-title="args.chapterTitle"
          :touch="args.touch"
          @close="args.onClose"
          @jump="args.onJump"
        />
      </div>`,
  }),
};

/** Signed out: the chapter's structure, widgets, media and trending. */
export const Default = {};

/** Signed in: each section also lists the reader's highlights and notes. */
export const SignedIn = { args: { signedIn: true, progress: 64 } };

/** No chapter ramp: magenta accents. */
export const Neutral = {
  globals: { chapter: "none" },
  args: { signedIn: true },
};

/** 390px: one column of sections under shorter bars. */
export const Phone = {
  globals: { viewport: { value: "phone" } },
  args: { signedIn: true, touch: true },
};

/** A chapter with nothing in it yet. */
export const Empty = { args: { empty: true, progress: 0 } };
