/*
 * A small chapter and its figure records for the ReaderSearch and
 * ReaderTopBar stories (OPENBRAIN-197), in the shape the reader holds
 * (useText().text), and a play function that types into the field.
 */
export const SEARCH_CHAPTER = {
  slug: "foundations-of-neuroscience",
  intro: [
    {
      id: "story-intro",
      title: "Foundations of Neuroscience",
      sectionTitle: "Introduction",
      paragraphs: [
        {
          id: "story-p-sacks",
          text: "<p>Upon being asked why he decided to specialize in neurology, Oliver Sacks famously answered that the brain was the most interesting thing there is.</p>",
        },
      ],
    },
  ],
  sections: [
    {
      id: "story-mind",
      title: "Where is my mind?",
      paragraphs: [
        {
          id: "story-p-papyrus",
          text: "<p>The Edwin Smith papyrus holds the first written word for the brain, in a surgeon's notes on wounds of the head.</p>",
          animation: { id: "animationStoryPapyrus", title: "The papyrus" },
        },
        {
          subSection: [
            {
              id: "story-hippocrates",
              title: "Hippocrates: the sacred disease and the four humours",
              paragraphs: [
                {
                  id: "story-p-humours",
                  text: "<p>Hippocrates placed thought and feeling in the brain, while Aristotle argued for the heart.</p>",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "story-box-descartes",
      kind: "box",
      title: "Separating mind from body: Descartes and dualism",
      anchored: true,
      anchorParagraphId: "story-p-papyrus",
      paragraphs: [
        {
          id: "story-p-descartes",
          text: "<p>René Descartes chose the pineal gland as the seat of the soul. His skull was missing until 1821.</p>",
        },
      ],
    },
    {
      id: "story-parts",
      title: "Do different parts of the brain do different things?",
      paragraphs: [
        {
          id: "story-p-gall",
          text: "<p>Franz Joseph Gall read character from the bumps of the skull; Santiago Ramón y Cajal would later draw the neurons beneath.</p>",
        },
        {
          id: "story-p-widget",
          type: "widget",
          widget: {
            widgetId: "phrenology",
            title: "Explore phrenology",
            blurb: "Press a faculty on the head to read what Gall claimed.",
          },
        },
      ],
    },
  ],
};

export const SEARCH_FIGURES = [
  {
    id: "animationStoryPapyrus",
    title: "The Edwin Smith papyrus",
    figureNumber: 5,
    caption: "Case six: the first description of the brain, in hieratic.",
  },
];

// Type into the field, as a reader would.
export const typeQuery =
  (query) =>
  async ({ canvasElement }) => {
    const toggle = canvasElement.querySelector(
      '[data-testid="reader-search-toggle"]'
    );
    if (toggle && toggle.offsetParent) toggle.click();
    await new Promise((r) => setTimeout(r, 50));
    const input = canvasElement.querySelector(
      '[data-testid="reader-search-input"]'
    );
    input.focus();
    input.value = query;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 200));
  };
