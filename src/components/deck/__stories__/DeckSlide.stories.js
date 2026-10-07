/*
 * Deck/DeckSlide — the 1920×1080 canvas every layout renders into, in its
 * two tones. Shown at half size.
 */
import DeckSlide from "../DeckSlide.vue";
import { SLIDE_SCALE } from "./slideFrame.js";

export default {
  title: "Deck/DeckSlide",
  component: DeckSlide,
  argTypes: { tone: { control: "inline-radio", options: ["paper", "dark"] } },
  args: { tone: "paper" },
  render: (args) => ({
    components: { DeckSlide },
    setup: () => ({ args, scale: SLIDE_SCALE }),
    template: `
      <div :style="{ width: 1920 * scale + 'px', height: 1080 * scale + 'px', overflow: 'hidden' }">
        <div :style="{ transform: 'scale(' + scale + ')', transformOrigin: '0 0' }">
          <DeckSlide v-bind="args" class="deck-pad">
            <span class="deck-eyebrow">00 · Eyebrow</span>
            <h2 class="deck-title" style="margin: 20px 0 40px">Slide title</h2>
            <p class="deck-body">Body copy on the slide surface.</p>
          </DeckSlide>
        </div>
      </div>`,
  }),
};

export const Paper = {};

/** The dark tone (opening, closing and section slides). */
export const Dark = { args: { tone: "dark" } };
