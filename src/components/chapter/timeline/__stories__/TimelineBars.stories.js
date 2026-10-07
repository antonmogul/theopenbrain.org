/*
 * Chapter/ReaderShell/TimelineBars — the chapter as bars (OPENBRAIN-128), as
 * the dock (rest and peek) and the map draw it, from the real Retina
 * (timelineFixture.js). One bar per paragraph, widget or break, as tall as
 * the paragraph is long; widgets and breaks are full-height hatched blocks.
 *
 * Point at the bars: the bar under the pointer turns ink (the story feeds
 * `hover` back as `cursor`, as the dock does).
 */
import { computed, ref, watch } from "vue";
import { fn } from "storybook/test";
import TimelineBars from "../TimelineBars.vue";
import {
  EMPTY_MODEL,
  emptyLayers,
  positionAt,
  retinaLayers,
  retinaModel,
} from "./timelineFixture";

const model = retinaModel();

export default {
  title: "Chapter/ReaderShell/TimelineBars",
  component: TimelineBars,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  globals: { chapter: "perc" },
  args: {
    progress: 42,
    barHeight: 12,
    expanded: false,
    signedIn: false,
    empty: false,
    onPick: fn(),
  },
  argTypes: {
    progress: {
      control: { type: "range", min: 0, max: 100, step: 1 },
      description: "Story-only: sets `position` to this percent of the items.",
    },
    barHeight: {
      control: { type: "range", min: 8, max: 120, step: 2 },
      description: "px, a full-height bar (12 at rest, 52 in the peek).",
    },
    expanded: {
      control: "boolean",
      description: "Section labels, trending caps and the two lanes.",
    },
    signedIn: {
      control: "boolean",
      description: "Story-only: include the reader's highlights and notes.",
    },
    empty: {
      control: "boolean",
      description: "Story-only: a chapter with no items.",
    },
    model: { control: false },
    position: { control: false },
    cursor: { control: false, description: "Fed from `hover` here." },
    layers: { control: false },
    interactive: { control: "boolean" },
    onPick: { description: "Emitted with { index, x } on a click." },
  },
  render: (args) => ({
    components: { TimelineBars },
    setup() {
      const chapter = computed(() => (args.empty ? EMPTY_MODEL : model));
      const position = computed(() => positionAt(chapter.value, args.progress));
      const layers = computed(() =>
        args.empty
          ? emptyLayers()
          : retinaLayers(model, { signedIn: args.signedIn })
      );
      const cursor = ref(-1);
      watch(chapter, () => (cursor.value = -1));
      const onHover = (hit) => (cursor.value = hit ? hit.index : -1);
      return { args, chapter, position, layers, cursor, onHover };
    },
    template: `
      <div style="padding:32px 16px;background:rgb(var(--color-paper));">
        <TimelineBars
          :model="chapter"
          :position="position"
          :bar-height="args.barHeight"
          :expanded="args.expanded"
          :cursor="cursor"
          :layers="layers"
          :interactive="args.interactive ?? true"
          @hover="onHover"
          @pick="args.onPick"
        />
      </div>`,
  }),
};

/** The dock at rest: 12px bars, nothing else. */
export const Default = {};

/** The dock's peek: 52px bars, section labels, the content lane. */
export const Peek = { args: { expanded: true, barHeight: 52 } };

/** Peek with the layers: your highlights and notes, trending caps. */
export const SignedIn = {
  args: { expanded: true, barHeight: 52, signedIn: true },
};

/** The map's size. */
export const Large = {
  args: { expanded: true, barHeight: 96, signedIn: true, progress: 64 },
};

/** No chapter ramp: the played part in magenta. */
export const Neutral = {
  globals: { chapter: "none" },
  args: { expanded: true, barHeight: 52, signedIn: true },
};

/** 390px: under 3px an item, neighbours share a bar. */
export const Phone = {
  globals: { viewport: { value: "phone" } },
  args: { expanded: true, barHeight: 52, signedIn: true },
};

/** No items: nothing drawn. */
export const Empty = { args: { empty: true, expanded: true, barHeight: 52 } };
