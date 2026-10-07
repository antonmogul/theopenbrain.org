/*
 * Chapter/Text/BreakoutBox — a breakout box's frame (OPENBRAIN-91). In the
 * reader, from 1024px, it floats full width over the figure pane with its
 * title card holding for a short scroll; here (no stage layer) it shows its
 * in-flow form, a tinted card, as on phones.
 */
import BreakoutBox from "../BreakoutBox.vue";

export default {
  title: "Chapter/Text/BreakoutBox",
  component: BreakoutBox,
  parameters: { layout: "fullscreen" },
  args: {
    section: {
      id: "box-descartes",
      title: "Separating mind from body: Descartes and dualism",
    },
    label: "A",
  },
  render: (args) => ({
    components: { BreakoutBox },
    setup: () => ({ args }),
    template: `
      <div data-chapter="fund" style="padding:40px 24px;background:rgb(var(--color-bg));font-family:var(--font-body);color:rgb(var(--color-ink));">
        <div style="max-width:640px;margin:0 auto;">
          <p style="line-height:1.6">René Descartes, a contemporary of Willis, put forward a different view…</p>
          <BreakoutBox v-bind="args">
            <p style="line-height:1.6;margin:0 0 1rem">Descartes is often credited with popularizing the idea of dualism: that the mind and the body are two distinct substances.</p>
            <p style="line-height:1.6;margin:0">In 1649, Descartes was invited by Queen Christina of Sweden to visit and serve as her tutor.</p>
          </BreakoutBox>
          <p style="line-height:1.6">The main text carries on after the box.</p>
        </div>
      </div>`,
  }),
};

/** History's first box, in the chapter's violet. */
export const InHistory = {};

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
