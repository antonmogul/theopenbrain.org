/*
 * Foundations/Typography — the `.t-*` scale from src/index.css.
 *
 * Each specimen reports its own computed size and line-height, so the story
 * documents what the browser actually renders rather than what the stylesheet
 * intends. That distinction matters here: the repo carries two colliding type
 * systems (the book rem-scale redefines `.text-base`), and a specimen that
 * reads its own metrics makes any future collision visible instead of silent.
 */

const SCALE = [
  { cls: "t-display", label: "Display", sample: "The Open Brain" },
  { cls: "t-h1", label: "Heading 1", sample: "How the retina sees" },
  { cls: "t-h2", label: "Heading 2", sample: "Direction selectivity" },
  { cls: "t-h3", label: "Heading 3", sample: "Ganglion cells" },
  { cls: "t-subhead", label: "Subhead", sample: "A summary and discussion" },
  {
    cls: "t-body-lg",
    label: "Body large",
    sample:
      "Each vertical tick is one action potential, evoked by a stimulus moving across the retina.",
  },
  {
    cls: "t-body",
    label: "Body",
    sample:
      "Each vertical tick is one action potential, evoked by a stimulus moving across the retina.",
  },
  {
    cls: "t-body-sm",
    label: "Body small",
    sample:
      "Each vertical tick is one action potential, evoked by a stimulus moving across the retina.",
  },
  { cls: "t-caption", label: "Caption", sample: "Figure 1 — spike rasters" },
  { cls: "t-label", label: "Label", sample: "DIRECTION OF MOTION" },
];

const specimens = (items) => ({
  data: () => ({ items }),
  template: `
    <div style="display:flex; flex-direction:column; gap:28px; max-width:760px;">
      <div v-for="i in items" :key="i.cls">
        <div style="font-family:var(--font-mono); font-size:11px; color:rgb(var(--color-mute)); margin-bottom:6px;">
          .{{ i.cls }} · {{ metrics(i.cls) }}
        </div>
        <div :class="i.cls" style="color:rgb(var(--color-ink));">{{ i.sample }}</div>
      </div>
    </div>`,
  methods: {
    // Measure a throwaway node so the reported metrics are the browser's.
    metrics(cls) {
      const el = document.createElement("div");
      el.className = cls;
      el.style.position = "absolute";
      el.style.visibility = "hidden";
      document.body.appendChild(el);
      const cs = getComputedStyle(el);
      const out = `${cs.fontSize} / ${cs.lineHeight} · ${cs.fontWeight}`;
      el.remove();
      return out;
    },
  },
});

export default {
  title: "Foundations/Typography",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "The `.t-*` type scale. Each specimen reports its own computed " +
          "font-size / line-height / weight, measured at render time.",
      },
    },
  },
};

export const Scale = { render: () => specimens(SCALE) };

/** The three font roles a font-pair swaps. */
export const Families = {
  render: () => ({
    template: `
      <div style="display:flex; flex-direction:column; gap:24px;">
        <div>
          <div style="font-family:var(--font-mono); font-size:11px; color:rgb(var(--color-mute));">--font-body</div>
          <p style="font-family:var(--font-body); font-size:20px; color:rgb(var(--color-ink)); margin:4px 0 0;">
            Body text carries the reading experience.
          </p>
        </div>
        <div>
          <div style="font-family:var(--font-mono); font-size:11px; color:rgb(var(--color-mute));">--font-ui</div>
          <p style="font-family:var(--font-ui); font-size:20px; color:rgb(var(--color-ink)); margin:4px 0 0;">
            UI text labels the controls.
          </p>
        </div>
        <div>
          <div style="font-family:var(--font-mono); font-size:11px; color:rgb(var(--color-mute));">--font-mono</div>
          <p style="font-family:var(--font-mono); font-size:20px; color:rgb(var(--color-ink)); margin:4px 0 0;">
            Mono marks data and code.
          </p>
        </div>
      </div>`,
  }),
};
