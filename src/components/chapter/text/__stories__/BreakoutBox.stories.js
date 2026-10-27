/*
 * Chapter/Text/BreakoutBox — a breakout box's frame (OPENBRAIN-91). In the
 * reader, from 1024px, it floats full width over the figure pane with its
 * title card holding for a short scroll; here (no stage layer) it shows its
 * in-flow form, as on phones: the pale card, or one of the History
 * redesign's colour panels (OPENBRAIN-153), chosen by the `treatment` arg
 * (in the reader, by helper/breakoutTreatment.js from the chapter and box
 * slugs).
 */
import BreakoutBox from "../BreakoutBox.vue";

export default {
  title: "Chapter/Text/BreakoutBox",
  component: BreakoutBox,
  parameters: { layout: "fullscreen" },
  argTypes: {
    treatment: { control: "select", options: ["pale", "dark", "violet"] },
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

/** History's first box as the pale card: what a chapter the redesign has
 *  not reached still gets, in its own colour. */
export const InHistory = {};

/** The dark panel (Figma 2730:8031): --color-dark-surface, white text, the
 *  kicker in the chapter's colour, no badge. History's boxes render this
 *  way in the reader. */
export const Dark = { args: { treatment: "dark" } };

/** The violet panel (Figma 2730:8059): the chapter's colour as ground,
 *  everything on it white. */
export const Violet = {
  args: {
    treatment: "violet",
    section: {
      id: "box-humoral-theory",
      slug: "box-humoral-theory",
      title: "Humoral theory",
    },
    label: "B",
  },
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
