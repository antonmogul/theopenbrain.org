/*
 * Chapter/SectionCards: what the figure pane shows while the reader crosses
 * into a section (OPENBRAIN-174).
 *
 * SectionCard is the card itself, in a box the pane's shape: the section's
 * picture, its title and its number, with `progress` (the picture settling)
 * and `titleShare` (the title giving way to the heading) as controls.
 *
 * InAReader mounts SectionCards beside a stand-in for the reader's text: two
 * sections with the gap between them. Scroll the story and the card comes in
 * as the first section's text ends, and leaves where the second's first
 * figure would take over.
 */
import SectionCard from "../SectionCard.vue";
import SectionCards from "../SectionCards.vue";
import { sectionArtFor } from "@/helper/sectionArt";

const HISTORY = "foundations-of-neuroscience";
const art = (slug) => sectionArtFor(HISTORY, { slug });

export default {
  title: "Chapter/SectionCards",
  component: SectionCard,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  argTypes: {
    progress: { control: { type: "range", min: 0, max: 1, step: 0.01 } },
    titleShare: { control: { type: "range", min: 0, max: 1, step: 0.01 } },
  },
  args: {
    art: art("basic-functional-unit"),
    label: "3",
    title: "What's the basic functional unit of the brain?",
    progress: 0.4,
    titleShare: 1,
    still: false,
  },
  render: (args) => ({
    components: { SectionCard },
    setup: () => ({ args }),
    template: `<div data-chapter="fund" style="position: relative; width: min(100%, 720px); height: 100vh; min-height: 520px"><SectionCard v-bind="args" /></div>`,
  }),
};

export const Card = {};

/** The heading has arrived beside it: the title has handed over. */
export const TitleHandedOver = { args: { titleShare: 0, progress: 0.9 } };

/** Reduced motion: the picture at its size, nothing rises. */
export const Still = { args: { still: true } };

export const TwoDigits = {
  args: {
    art: art("how-neurons-communicate"),
    label: "12",
    title: "How do neurons communicate?",
  },
};

const text = {
  intro: [{ id: "sc-intro", title: "History", sectionTitle: "Introduction" }],
  sections: [
    {
      id: "sc-one",
      slug: "do-different-parts",
      kind: "section",
      title: "Do different parts of the brain do different things?",
      paragraphs: [],
    },
    {
      id: "sc-two",
      slug: "basic-functional-unit",
      kind: "section",
      title: "What's the basic functional unit of the brain?",
      paragraphs: [],
    },
  ],
};
const filler =
  "While the debate about localization of function was taking place at the level of what are now called brain regions, a similar debate occurred at the microscopic level. ";

export const InAReader = {
  render: () => ({
    components: { SectionCards },
    setup: () => ({ text, module: { slug: HISTORY }, filler }),
    template: `
      <div class="chapter-reader" data-chapter="fund" style="position: relative">
        <SectionCards :module="module" :text="text" />
        <div id="container" style="margin-left: 50%; padding: 6rem 3rem 0">
          <section
            v-for="(s, i) in text.sections"
            :id="s.id"
            :key="s.id"
            class="reader-section"
            :data-section-slug="s.slug"
            style="min-height: 0; padding-bottom: 20rem"
          >
            <h2 class="TN" style="display: inline-grid; place-items: center; width: 3.5rem; height: 3.5rem; border: 1px solid; border-radius: 999px; margin: 0 0 1rem">{{ i + 1 }}</h2>
            <h2 class="subChapter" style="font-size: 2.5rem; line-height: 1.15; margin: 0 0 1rem">{{ s.title }}</h2>
            <p v-for="n in 3" :key="n" style="max-width: 34rem; line-height: 1.6; margin: 0 0 1rem">{{ filler.repeat(3) }}</p>
            <div :id="'triggerAnimationStory' + i" class="animationTrigger" style="max-width: 34rem; line-height: 1.6">
              <p v-for="n in 6" :key="n" style="margin: 0 0 1rem">{{ filler.repeat(4) }}</p>
            </div>
          </section>
        </div>
      </div>`,
  }),
};
