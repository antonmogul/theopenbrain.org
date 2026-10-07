/*
 * Shared render for the Deck stories: a 1920×1080 slide shown at half size,
 * so a whole slide fits the canvas the way it does on /deck.
 */
export const SLIDE_SCALE = 0.5;

export function renderSlide(component) {
  return (args) => ({
    components: { Slide: component },
    setup: () => ({ args, scale: SLIDE_SCALE }),
    template: `
      <div :style="{ width: 1920 * scale + 'px', height: 1080 * scale + 'px', overflow: 'hidden', boxShadow: '0 0 0 1px rgb(0 0 0 / 0.1)' }">
        <div :style="{ width: '1920px', height: '1080px', transform: 'scale(' + scale + ')', transformOrigin: '0 0' }">
          <Slide v-bind="args" />
        </div>
      </div>`,
  });
}

/** The props of a deck data entry, by id, for a story's args. */
export const propsOf = (entries, id) => entries.find((e) => e.id === id).props;
