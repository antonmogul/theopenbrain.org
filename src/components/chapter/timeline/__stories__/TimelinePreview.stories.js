/*
 * Chapter/ReaderShell/TimelinePreview — the card over a timeline bar
 * (OPENBRAIN-128), for items of the real Retina (timelineFixture.js): a
 * paragraph's opening line and figure, a widget's card, a video, and what
 * the reader and other readers marked there.
 *
 * Shown in flow here; in the dock and the map it is anchored over (or under)
 * its bar, as Phone shows at the right edge of a phone, where it clamps.
 */
import { computed } from "vue";
import { fn } from "storybook/test";
import TimelinePreview from "../TimelinePreview.vue";
import { sectionIndexOf } from "@/helper/chapterTimeline";
import { firstIndexOf, retinaLayers, retinaModel } from "./timelineFixture";

const model = retinaModel();
const layers = retinaLayers(model);
const INDEX = {
  text: [...layers.highlights.keys()].find((i) => layers.trending.has(i)),
  widget: firstIndexOf(model, "widget"),
  video: firstIndexOf(model, (item) =>
    item.marks.some((m) => m.type === "video")
  ),
  break: firstIndexOf(
    model,
    (item) => item.kind === "break" && item.marks[0]?.type === "break"
  ),
};

export default {
  title: "Chapter/ReaderShell/TimelinePreview",
  component: TimelinePreview,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  globals: { chapter: "perc" },
  args: {
    kind: "text",
    signedIn: false,
    touch: false,
    anchored: false,
    onGo: fn(),
  },
  argTypes: {
    kind: {
      control: "inline-radio",
      options: Object.keys(INDEX),
      description: "Story-only: which kind of item the card is for.",
    },
    signedIn: {
      control: "boolean",
      description:
        "Story-only: pass the reader's highlights and notes on the item.",
    },
    anchored: {
      control: "boolean",
      description:
        "Story-only: anchor it (`x`) over a point near the right edge.",
    },
    touch: { control: "boolean" },
    item: { control: false },
    section: { control: false },
    subsection: { control: false },
    highlights: { control: false },
    notes: { control: false },
    trending: { control: false },
    x: { control: false },
    placement: { control: false },
    onGo: { description: "Touch: the Go here button." },
  },
  render: (args) => ({
    components: { TimelinePreview },
    setup() {
      const index = computed(() => INDEX[args.kind] ?? INDEX.text);
      const item = computed(() => model.items[index.value]);
      const section = computed(
        () => model.sections[sectionIndexOf(model.sections, index.value)]
      );
      const subsection = computed(() => {
        let found = null;
        for (const sub of model.subsections)
          if (
            sub.sectionKey === item.value.sectionKey &&
            sub.start <= index.value
          )
            found = sub;
        return found;
      });
      const of = (name) => computed(() => layers[name].get(index.value) || []);
      const highlights = of("highlights");
      const notes = of("notes");
      const trending = of("trending");
      return {
        args,
        item,
        section,
        subsection,
        highlights,
        notes,
        trending,
      };
    },
    template: `
      <div v-if="args.anchored" style="position:relative;margin-top:min(70vh, 460px);height:20px;border-top:1px solid rgb(var(--color-line));background:rgb(var(--color-paper));">
        <TimelinePreview
          :item="item" :section="section" :subsection="subsection"
          :highlights="args.signedIn ? highlights : []"
          :notes="args.signedIn ? notes : []"
          :trending="trending"
          :x="100000" :touch="args.touch" @go="args.onGo"
        />
      </div>
      <div v-else style="padding:32px 16px;background:rgb(var(--color-bg));">
        <TimelinePreview
          :item="item" :section="section" :subsection="subsection"
          :highlights="args.signedIn ? highlights : []"
          :notes="args.signedIn ? notes : []"
          :trending="trending"
          :touch="args.touch" @go="args.onGo"
        />
      </div>`,
  }),
};

/** A paragraph: section, subsection, its opening line, other readers. */
export const Default = {};

/** A widget: thumbnail (16:10), kicker, title, blurb, credit. */
export const Widget = { args: { kind: "widget" } };

/** A video break. */
export const Video = { args: { kind: "video" } };

/** Signed in: the reader's highlights and notes, then trending. */
export const SignedIn = { args: { signedIn: true } };

/** Touch: the tapped bar's card offers the jump. */
export const Touch = { args: { kind: "widget", touch: true } };

/** No chapter ramp: magenta accents. */
export const Neutral = {
  globals: { chapter: "none" },
  args: { signedIn: true },
};

/** Anchored at the right edge of a phone: clamped 8px inside. */
export const Phone = {
  globals: { viewport: { value: "phone" } },
  args: { signedIn: true, anchored: true, touch: true },
};
