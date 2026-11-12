/*
 * Chapter/Text/RailPart — one part of a breakout box read sideways
 * (OPENBRAIN-187): its picture first, once, with its legend and expand
 * button, then its text in columns as tall as the track. The frame stands
 * in for BreakoutBox's track: a size container of a fixed height, which
 * the part's lengths (cqw, cqh) are measured against, and the mode it
 * provides ("track" from 1024px, "swipe" on a phone). Figures from the
 * database are left out here (they would fetch); an Explore part's own
 * picture shows the layout. In the reader, BreakoutBox's stories show the
 * whole box.
 */
import { computed, provide, ref } from "vue";
import RailPart from "../RailPart.vue";

const text = `In ancient Greece, the Pythagoreans were mathematicians who were into numerology, and they had a particular reverence for the number four. Subsequently, Empedocles assembled a cosmology based on tetradic categories. The universe was comprised of four fundamental elements: earth, water, air and fire. There were four cosmic entities: sky, sun, earth and sea. There are four seasons: spring, summer, winter, fall. Hippocrates applied the four seasons to ages of human beings and linked the four elements to four fundamental humors in the body: yellow bile, black bile, phlegm, and blood<sup class="citation-ref">121</sup>. Galen continued the Hippocratic medical practice of considering that illnesses and dispositions were caused by imbalances in the four humors, and patients were treated in a manner that sought to restore humoral balance. Humoral theory would go on to impact medical practice for well over a thousand years.`;

const frame = (mode, width) => (args) => ({
  components: { RailPart },
  setup() {
    provide("exploreRail", ref(mode));
    // The part's props; the text is its slot.
    const part = computed(() => {
      // eslint-disable-next-line no-unused-vars
      const { text, ...props } = args;
      return props;
    });
    return { args, part, width, mode };
  },
  template: `
    <div data-chapter="fund" class="chapter-reader" style="background:rgb(var(--color-dark-surface));color:#fff;padding:32px 0;font-family:var(--font-body);font-size:1.15rem;line-height:1.55;--bx-ink:#fff;--bx-ink-soft:rgb(255 255 255 / 0.7);--bx-hairline:rgb(255 255 255 / 0.22);">
      <div :style="{ width, maxWidth: '100%', height: '30rem', margin: '0 auto', paddingLeft: mode === 'track' ? '2rem' : 0, overflowX: 'auto', overflowY: 'hidden', containerType: 'size' }">
        <div style="display:flex;height:100%;width:max-content">
          <RailPart v-bind="part">
            <div class="P" v-html="args.text"></div>
          </RailPart>
        </div>
      </div>
    </div>`,
});

export default {
  title: "Chapter/Text/RailPart",
  component: RailPart,
  parameters: { layout: "fullscreen" },
  args: {
    part: { id: "p-humours", title: "Humoral theory", explore: true },
    image: {
      src: "/publicAssets/images/foundations/thurneysser-four-humours-1574.jpg",
      alt: "A 1574 woodcut: a figure split down the middle, ringed by the four humours with their elements and zodiac signs.",
    },
    legend:
      "The four humours and their corresponding elements and zodiacal signs. Woodcut in Quinta Essentia by Leonhart Thurneysser (1574). Credit: Wikimedia Commons.",
    figures: [],
    index: 1,
    count: 2,
    text,
  },
  render: frame("track", "1200px"),
};

/** On the pinned track (from 1024px): the picture a column of its own,
 *  then the title and the text in columns. */
export const Track = {};

/** A part with no name (a box of ordinary paragraphs): only its text. */
export const Unnamed = {
  args: {
    part: { id: "p-prose", title: "", explore: false },
    image: null,
    legend: "",
  },
};

/** On a phone's swipe track: the picture one page, every column of text
 *  another, each as wide as the track. */
export const Swipe = { render: frame("swipe", "390px") };
