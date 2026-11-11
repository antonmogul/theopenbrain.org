/*
 * Chapter/ReaderShell/ReadingRail — the marks on the line between the figure
 * pane and the text (OPENBRAIN-175), from 1024px: a pill at every paragraph
 * that brings something into the pane, saying what it is ("FIG 05", "TRY
 * IT", "WATCH", or a bare pointer for the Retina's 2023 figures), a ribbon
 * down the line for as long as the figure that is on stays, and the reading
 * point at mid-screen, a bead on that ribbon. A mark is a button: it brings
 * its paragraph to the reading point; the arrow keys walk the figures.
 *
 * The stories stand in for the reader: IllustrationsComp sets `.active` on
 * a trigger while its figure is on, here it is written into the markup. The
 * one-off pulse at the reading point needs a figure to change, so it shows
 * in the chapter, not here. Below 1024px the rail draws nothing.
 */
import ReadingRail from "../ReadingRail.vue";

const still = (id, figureNumber, title) => ({
  id,
  title,
  ...(figureNumber ? { figureNumber } : {}),
  placeholder: true,
  images: [{ src: "/publicAssets/images/foundations/fig01-01.jpg" }],
});

const HISTORY = [
  still("animationDemoWoodcut", null, "Woodcut from Lorenz Fries, 1519"),
  still("animationDemoFig1", 1, "Trepanned Incan skull"),
  still("animationDemoFig2", 2, "Methods of trepanation"),
  {
    id: "animationDemoLoewi",
    title: "Loewi's Vagusstoff, 1921",
    widgetId: "upload:loewi-vagusstoff",
  },
  {
    id: "animationDemoFilm",
    title: "Rita Levi-Montalcini",
    placeholder: true,
    youtubeID: "WgkAR-vrJpM",
  },
];

// The Retina's 2023 figures: Lotties with no label in the pane.
const RETINA = [
  { id: "animationDemoDragon", title: "The radiating eye" },
  { id: "animationDemoEye", title: "Structure of the eye", scroll: true },
  {
    id: "animationDemoCells",
    title: "Retinal cell types",
    widgetId: "upload:retina-retinal-cell-types",
  },
];

// As in the reader, one trigger runs on to the next: the space between two
// paragraphs is inside the first.
const paragraph = (key, text, active = false) =>
  `<span id="triggerAnimation${key}" class="animationTrigger${
    active ? " active" : ""
  } block noHighlight" style="display:block; padding-bottom:2.5rem;"><p>${text}</p></span>`;

const page = ({ chapter, ground, records, body }) => ({
  components: { ReadingRail },
  setup: () => ({ records }),
  template: `
    <div class="chapter-reader" data-chapter="${chapter}" style="position:relative; min-height:100vh; font-family:var(--font-body);">
      <div class="w-illus figure-pane--${ground}" style="position:fixed; inset:0 auto 0 0; display:grid; place-items:center; font-family:var(--font-mono); font-size:12px;">
        figure pane
      </div>
      <div style="position:absolute; inset:0 0 auto 0; z-index:40; pointer-events:none;">
        <ReadingRail :records="records" />
        <div class="reading-line is-on" aria-hidden="true"></div>
      </div>
      <main id="text" class="w-text" style="position:relative; margin-left:calc(var(--app-w, 100vw) - var(--reader-prose-w)); min-height:100vh; padding:18vh var(--reader-gutter-r) 30vh var(--reader-gutter-l); background:rgb(var(--color-paper)); border-left:1px solid rgb(var(--color-ink)); font-size:1.0625rem; line-height:1.6;">
        <section class="reader-section">${body}</section>
      </main>
    </div>`,
});

export default {
  title: "Chapter/ReaderShell/ReadingRail",
  component: ReadingRail,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "The figure marks, the ribbon of the figure that is on, and the reading point, " +
          "all on the divider at `--app-w` − `--reader-prose-w`.",
      },
    },
  },
};

/** History: the dark pane, the second figure on. */
export const Default = {
  render: () =>
    page({
      chapter: "fund",
      ground: "dark",
      records: HISTORY,
      body:
        paragraph(
          "DemoWoodcut",
          "A figure without a number is FIG, as its label in the pane is."
        ) +
        paragraph(
          "DemoFig1",
          "The figure that is on: its mark is filled in the chapter's colour and a ribbon runs down the line for as long as it stays, here until the next figure. The bead at mid-screen is the reading point, where the pane changes.",
          true
        ) +
        `<p style="margin-bottom:2.5rem;">A paragraph without a figure has no mark; the ribbon passes it, because the figure is still beside it.</p>` +
        paragraph(
          "DemoFig2",
          "The next figure. Its mark is paper with an ink hairline, like the section badge, until it reaches the reading point."
        ) +
        paragraph(
          "DemoLoewi",
          "A widget in the pane says TRY IT rather than FIG."
        ) +
        paragraph("DemoFilm", "A film says WATCH."),
    }),
};

/** The Retina: the paper pane, 2023 figures with no label, a widget. */
export const PaperPane = {
  render: () =>
    page({
      chapter: "perc",
      ground: "paper",
      records: RETINA,
      body:
        paragraph(
          "DemoDragon",
          "A 2023 figure has no FIG label in the pane, so its mark is a bare pointer.",
          true
        ) +
        paragraph("DemoEye", "A scroll-driven figure, the same.") +
        paragraph(
          "DemoCells",
          "The first of three paragraphs one widget stays beside."
        ) +
        paragraph(
          "DemoCells",
          "The second: no second mark, the pane does not change."
        ) +
        paragraph("DemoCells", "The third."),
    }),
};

/** Nothing in the pane: every mark at rest, the reading point hollow. */
export const AtRest = {
  render: () =>
    page({
      chapter: "fund",
      ground: "dark",
      records: HISTORY,
      body:
        paragraph("DemoFig1", "A figure paragraph.") +
        `<p style="margin-bottom:2.5rem;">Text with no figure.</p>` +
        paragraph("DemoFig2", "Another."),
    }),
};
