/*
 * Chapter/Text/ExploreCard — an "Explore more" segment of a breakout box
 * (OPENBRAIN-142): the image beside a title and a button that reveals the
 * paragraph. In the reader the card sits inside a BreakoutBox on the
 * chapter's pale ground; the panel holds the paragraph's own text and
 * figure. Here the Hippocrates pair from the History chapter.
 */
import ExploreCard from "../ExploreCard.vue";
import IllustrationPlaceholder from "../../Illus/IllustrationPlaceholder.vue";
import history from "@/stories/historyFullReaderData.json";

const hippocrates = {
  title: "Hippocrates’ view on epilepsy",
  prompt: "Explore more about Hippocrates’ view on epilepsy",
  image: {
    src: "/publicAssets/images/foundations/narrative/hippocrates-bust.jpg",
    alt: "Marble bust of Hippocrates in profile, from the British Museum.",
  },
  legend:
    "Bust of Hippocrates from the British Museum. Source: The Wellcome Collection.",
};

const humours = {
  title: "Humoral theory",
  prompt: "Explore more about humoral theory",
  image: {
    src: "/publicAssets/images/foundations/thurneysser-four-humours-1574.jpg",
    alt: "A 1574 woodcut: a figure split down the middle, ringed by the four humours with their elements and zodiac signs.",
  },
  legend:
    "The four humours and their corresponding elements and zodiacal signs. Woodcut in Quinta Essentia by Leonhart Thurneysser (1574). Credit: Wikimedia Commons.",
};

const quote = `<blockquote>“It is thus with regard to the disease called Sacred [epilepsy]: it appears to me to be nowise more divine nor more sacred than other diseases, but has a natural cause from the originates like other affections… But the brain is the cause of this affection, as it is of other very great diseases.”</blockquote>`;

export default {
  title: "Chapter/Text/ExploreCard",
  component: ExploreCard,
  parameters: { layout: "fullscreen" },
  args: { explore: hippocrates, paragraphId: "p-sacred", defaultOpen: false },
  render: (args) => ({
    components: { ExploreCard },
    setup: () => ({ args, quote }),
    template: `
      <div data-chapter="fund" style="padding:40px 24px;background:rgb(var(--color-chapter-pale));font-family:var(--font-body);color:rgb(var(--color-ink));">
        <div class="chapter-reader" style="max-width:720px;margin:0 auto;">
          <ExploreCard v-bind="args">
            <div class="P" data-paragraph-id="p-sacred" v-html="quote"></div>
          </ExploreCard>
        </div>
      </div>`,
  }),
};

/** Closed, as the reader first meets it. */
export const Closed = {};

/** The panel open: the quote in the editorial blockquote style. */
export const Open = { args: { defaultOpen: true } };

/** The second segment of the same box, a landscape-leaning woodcut. */
export const Humours = {
  args: { explore: humours, paragraphId: "p-humours" },
  render: (args) => ({
    components: { ExploreCard },
    setup: () => ({ args }),
    template: `
      <div data-chapter="fund" style="padding:40px 24px;background:rgb(var(--color-chapter-pale));font-family:var(--font-body);color:rgb(var(--color-ink));">
        <div class="chapter-reader" style="max-width:720px;margin:0 auto;">
          <ExploreCard v-bind="args">
            <div class="P" data-paragraph-id="p-humours">In ancient Greece, the Pythagoreans were mathematicians who were into numerology, and they had a particular reverence for the number four…</div>
          </ExploreCard>
        </div>
      </div>`,
  }),
};

/** Without an image the lead takes the whole card. */
export const NoImage = {
  args: {
    explore: {
      title: "The rete mirabile",
      prompt: "Explore more about the rete mirabile",
    },
    paragraphId: "p-rete",
  },
};

/** The same card in the Retina's teal. */
export const InRetina = {
  decorators: [
    () => ({ template: `<div data-chapter="perc"><story /></div>` }),
  ],
};

/** The complete authored figure inside a disclosure, including its legend. */
export const InlineFigure = {
  args: {
    explore: {
      title: "The rete mirabile",
      prompt: "Explore the rete mirabile",
    },
    paragraphId: "nested-figure",
    defaultOpen: true,
    paired: true,
  },
  render: (args) => ({
    components: { ExploreCard, IllustrationPlaceholder },
    setup() {
      const row = history.animations.find(
        (animation) => animation.animation_key === "animationFoundationsFigC"
      );
      return { args, animation: { ...row, ...row.config } };
    },
    template: `
      <div class="chapter-reader" data-chapter="fund" style="padding:24px;max-width:640px;margin:auto;">
        <ExploreCard v-bind="args">
          <IllustrationPlaceholder :animation="animation" inline />
        </ExploreCard>
      </div>`,
  }),
};
