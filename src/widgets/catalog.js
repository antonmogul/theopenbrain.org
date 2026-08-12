/*
 * Widget catalog — the single source of truth for every interactive widget
 * in the Open Brain textbook.
 *
 * Each entry describes one widget: its source HTML, which chapter it belongs
 * to, a human-readable title and description, the original author, and any
 * external dependencies the raw HTML relies on.
 *
 * The WidgetLibraryView reads this catalog to render the browsable gallery.
 * Individual chapter views will also use it to embed the right widget.
 *
 * Hosting: widgets are loaded via iframe srcdoc (the HTML is imported as a
 * raw string at build time). This preserves the author's original maths and
 * interaction verbatim — no accidental breakage from a Vue rewrite. Widgets
 * that have been rewritten as Vue SFCs (like SDT) get a `vuePath` field
 * instead of (or in addition to) `srcFile`.
 *
 * To add a widget: drop the HTML into src/widgets/source/ and add an entry
 * here. The library page will pick it up automatically.
 */

/* eslint-disable import/no-unresolved -- Vite ?raw suffix is valid but not resolvable by ESLint */
// Raw HTML imports — Vite serves these as strings via ?raw suffix.
import sdtHtml from "./source/sdt_widget.html?raw";
import posnerHtml from "./source/posner_cueing_widget.html?raw";
import biasedCompHtml from "./source/biased_competition_widget.html?raw";
import contrastGainHtml from "./source/contrast_response_gain_widget.html?raw";
import tmtHtml from "./source/tmt_feature_attention_widget.html?raw";
import normModelHtml from "./source/normalization_model_widget_v2.html?raw";
import retinaboxHtml from "./source/retinabox-web.html?raw";
import retinaboxAppHtml from "./source/retinabox-web_app.html?raw";
import dirSelectHtml from "./source/retina_direction_selectivity_data_widget.html?raw";
import v1CameraHtml from "./source/v1-camera-widget.html?raw";
import colorVisionHtml from "./source/color-vision-widget.html?raw";
import visualLesionsHtml from "./source/visual-pathway-lesions-widget.html?raw";
/* eslint-enable import/no-unresolved */

/**
 * @typedef {Object} Widget
 * @property {string}  id          Unique slug (kebab-case)
 * @property {string}  title       Human-readable name
 * @property {string}  desc        One-sentence description
 * @property {string}  chapter     Chapter this belongs to
 * @property {string}  author      Original author name
 * @property {string}  [srcHtml]   Raw HTML string (iframe srcdoc)
 * @property {string}  [vuePath]   Route path if a Vue SFC rewrite exists
 * @property {string}  [height]    Suggested iframe height (CSS value)
 * @property {string[]} [deps]     External dependencies (for documentation)
 */

/** @type {Widget[]} */
export const WIDGETS = [
  // ── Retina chapter (Stuart Trenholm) ──────────────────────────────────
  {
    id: "retinabox",
    title: "RetINaBox — Interactive retinal circuit",
    desc: "Explore how different retinal cell types process a visual stimulus. Adjust parameters to see how photoreceptors, bipolar cells, and ganglion cells respond.",
    chapter: "The Retina",
    author: "Stuart Trenholm",
    srcHtml: retinaboxHtml,
    height: "820px",
    deps: [],
  },
  {
    id: "retinabox-app",
    title: "RetINaBox — Retinal circuit (compact)",
    desc: "Compact version of the RetINaBox interactive retinal circuit simulator, adapted from the published eNeuro education tool.",
    chapter: "The Retina",
    author: "Stuart Trenholm",
    srcHtml: retinaboxAppHtml,
    height: "780px",
    deps: [],
  },
  {
    id: "direction-selectivity",
    title: "Direction selective retinal ganglion cells",
    desc: "Real electrophysiology data showing how direction-selective ganglion cells respond to motion. Scrub through stimulus directions to see spike rasters, polar plots, and tuning curves.",
    chapter: "The Retina",
    author: "Stuart Trenholm",
    srcHtml: dirSelectHtml,
    height: "900px",
    deps: ["Google Fonts (IBM Plex)"],
  },
  {
    id: "color-vision",
    title: "Color vision explorer",
    desc: "Explore cone spectral sensitivities, color matching, opponent channels, metamers, and color blindness simulations — all interactive.",
    chapter: "The Retina",
    author: "Stuart Trenholm",
    srcHtml: colorVisionHtml,
    height: "1200px",
    deps: [],
  },

  // ── V1 / Visual cortex chapter (Stuart Trenholm) ─────────────────────
  {
    id: "v1-camera",
    title: "What V1 sees — live camera",
    desc: "Point your camera at the world and see what a V1 simple cell would detect: oriented edges via Gabor filters applied in real time.",
    chapter: "Visual Cortex (V1)",
    author: "Stuart Trenholm",
    srcHtml: v1CameraHtml,
    height: "700px",
    deps: [],
  },
  {
    id: "visual-pathway-lesions",
    title: "Visual pathway lesions",
    desc: "Click lesion sites along the visual pathway — from retina to cortex — and see the resulting visual field defect. Includes both anatomical and projection views.",
    chapter: "Visual Cortex (V1)",
    author: "Stuart Trenholm",
    srcHtml: visualLesionsHtml,
    height: "1000px",
    deps: [],
  },

  // ── Attention chapter (Arjun Krishnaswamy) ───────────────────────────
  {
    id: "sdt",
    title: "Signal Detection Theory",
    desc: "Drag the criterion, adjust d′, and watch the ROC curve respond. Demonstrates how sensitivity and bias are independent.",
    chapter: "Attention & Working Memory",
    author: "Arjun Krishnaswamy",
    srcHtml: sdtHtml,
    vuePath: "/sdt",
    height: "520px",
    deps: [],
  },
  {
    id: "posner-cueing",
    title: "Posner spatial cueing task",
    desc: "Run a block of 50 trials to measure your own reaction-time cost and benefit for valid versus invalid spatial cues.",
    chapter: "Attention & Working Memory",
    author: "Arjun Krishnaswamy",
    srcHtml: posnerHtml,
    height: "680px",
    deps: ["Chart.js (CDN)"],
  },
  {
    id: "biased-competition",
    title: "Biased competition model",
    desc: "Visualise how top-down attention biases competition between neural representations. Adjust attention weights and see the effect on population responses.",
    chapter: "Attention & Working Memory",
    author: "Arjun Krishnaswamy",
    srcHtml: biasedCompHtml,
    height: "600px",
    deps: [],
  },
  {
    id: "contrast-response-gain",
    title: "Contrast response & gain modulation",
    desc: "Compare contrast-gain and response-gain models of attention. Adjust parameters to see how attention changes contrast sensitivity curves.",
    chapter: "Attention & Working Memory",
    author: "Arjun Krishnaswamy",
    srcHtml: contrastGainHtml,
    height: "600px",
    deps: [],
  },
  {
    id: "tmt-feature-attention",
    title: "Feature-based attention (TMT)",
    desc: "Treisman's Feature Integration Theory in action: pop-out search vs. conjunction search, and how feature-based attention guides binding.",
    chapter: "Attention & Working Memory",
    author: "Arjun Krishnaswamy",
    srcHtml: tmtHtml,
    height: "700px",
    deps: [],
  },
  {
    id: "normalization-model",
    title: "Normalization model of attention",
    desc: "Interactive normalization model showing how attention modulates neural responses through divisive normalisation — the unifying computation.",
    chapter: "Attention & Working Memory",
    author: "Arjun Krishnaswamy",
    srcHtml: normModelHtml,
    height: "700px",
    deps: [],
  },
];

/**
 * Group widgets by chapter, preserving catalog order.
 * @returns {{ chapter: string, widgets: Widget[] }[]}
 */
export function widgetsByChapter() {
  const map = new Map();
  for (const w of WIDGETS) {
    if (!map.has(w.chapter)) {
      map.set(w.chapter, []);
    }
    map.get(w.chapter).push(w);
  }
  return Array.from(map, ([chapter, widgets]) => ({ chapter, widgets }));
}
