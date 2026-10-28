/*
 * Chapter/Text/BreakoutBox — a breakout box's frame (OPENBRAIN-91). In the
 * reader, from 1024px, it floats full width over the figure pane with its
 * title card holding for a short scroll; here (no stage layer) it shows its
 * in-flow form, as on phones: the pale card, or one of the colour panels
 * (OPENBRAIN-153, 157), chosen by the `treatment` arg (in the reader, by
 * the box's own sections.box_treatment from the chapter editor, else
 * helper/breakoutTreatment.js from the chapter and box slugs).
 */
import BreakoutBox from "../BreakoutBox.vue";
import { BOX_TREATMENTS } from "@/helper/breakoutTreatment";

export default {
  title: "Chapter/Text/BreakoutBox",
  component: BreakoutBox,
  parameters: { layout: "fullscreen" },
  argTypes: {
    treatment: { control: "select", options: [...BOX_TREATMENTS] },
  },
  args: {
    section: {
      id: "box-descartes",
      slug: "box-descartes",
      title: "Separating mind from body: Descartes and dualism",
    },
    label: "A",
    treatment: "pale",
  },
  render: (args) => ({
    components: { BreakoutBox },
    setup: () => ({ args }),
    template: `
      <div data-chapter="fund" class="chapter-reader" style="padding:40px 24px;background:rgb(var(--color-bg));font-family:var(--font-body);color:rgb(var(--color-ink));">
        <div style="max-width:640px;margin:0 auto;">
          <p style="line-height:1.6">René Descartes, a contemporary of Willis, put forward a different view…</p>
          <BreakoutBox v-bind="args">
            <p style="line-height:1.6;margin:0 0 1rem">Descartes is often credited with popularizing the idea of dualism: that the mind and the body are two distinct substances.<sup class="citation-ref">12</sup></p>
            <blockquote>Wherever his skull is, some of Descartes' bones<br>were laid to rest in St Germain des Prés.</blockquote>
            <p style="line-height:1.6;margin:0">In 1649, Descartes was invited by Queen Christina of Sweden to visit and serve as her tutor.</p>
          </BreakoutBox>
          <p style="line-height:1.6">The main text carries on after the box.</p>
        </div>
      </div>`,
  }),
};

/** A ramp other than the frame's fund: the toolbar's Chapter global sets
 *  <html>, but the frame above carries its own data-chapter, so the ramp
 *  goes on the frame. */
const onRamp = (ramp) => ({
  render: (args) => ({
    components: { BreakoutBox },
    setup: () => ({ args, ramp }),
    template: `
      <div :data-chapter="ramp" class="chapter-reader" style="padding:40px 24px;background:rgb(var(--color-bg));font-family:var(--font-body);color:rgb(var(--color-ink));">
        <div style="max-width:640px;margin:0 auto;">
          <p style="line-height:1.6">The text before the box.</p>
          <BreakoutBox v-bind="args">
            <p style="line-height:1.6;margin:0 0 1rem">An aside in this chapter's own colour, its ink chosen by the ramp so it reads on the teal, red and yellow as well as the violet and blue.<sup class="citation-ref">3</sup></p>
            <blockquote>An extract, set as the reader sets it,<br>on the panel's ground.</blockquote>
          </BreakoutBox>
          <p style="line-height:1.6">The main text carries on after the box.</p>
        </div>
      </div>`,
  }),
});

/** History's first box as the pale card: what a chapter the redesign has
 *  not reached still gets, in its own colour. */
export const InHistory = {};

/** The dark panel (Figma 2730:8031): --color-dark-surface, white text, the
 *  kicker in the chapter's colour, no badge. History's boxes render this
 *  way in the reader. */
export const Dark = { args: { treatment: "dark" } };

/** The lighter dark (OPENBRAIN-157): --color-dark-surface-2 (#2A2A2A),
 *  the rest as Dark. A panel beside the dark figure pane rather than the
 *  same black. */
export const Plate = { args: { treatment: "plate" } };

/** The chapter-colour panel (the Figma's violet, 2730:8059): the chapter's
 *  own ground, everything on it in the ramp's ink; white here on fund. */
export const Chapter = {
  args: {
    treatment: "chapter",
    section: {
      id: "box-humoral-theory",
      slug: "box-humoral-theory",
      title: "Humoral theory",
    },
    label: "B",
  },
};

/** The same panel on the Retina's teal: the dark surface as ink (9.5:1),
 *  where white would be 1.8:1. */
export const ChapterInRetina = {
  ...onRamp("perc"),
  args: { treatment: "chapter", section: { id: "box-x", title: "An aside" } },
};

/** On the Movement blue the ground is the ramp's deep step
 *  (--color-chapter-ground, #0E61C4, white 5.96:1): white on its main
 *  (#1A72F2) is 4.44:1, just under AA. */
export const ChapterInMovement = {
  ...onRamp("move"),
  args: { treatment: "chapter", section: { id: "box-x", title: "An aside" } },
};

/** On the Learning red, the dark surface as ink (4.74:1). */
export const ChapterInLearning = {
  ...onRamp("lear"),
  args: { treatment: "chapter", section: { id: "box-x", title: "An aside" } },
};

/** On the Development amber, the dark surface as ink (9.7:1). */
export const ChapterInDevelopment = {
  ...onRamp("deve"),
  args: { treatment: "chapter", section: { id: "box-x", title: "An aside" } },
};

/** The plate on another ramp: the kicker takes the chapter's colour, so
 *  the teal shows the panel's one chapter-specific mark. */
export const PlateInRetina = {
  ...onRamp("perc"),
  args: { treatment: "plate", section: { id: "box-x", title: "An aside" } },
};

/** The same frame in the Retina's teal. */
export const InRetina = {
  args: {
    section: { id: "box-x", title: "An aside in another chapter" },
    label: "B",
  },
  decorators: [
    () => ({ template: `<div data-chapter="perc"><story /></div>` }),
  ],
};
