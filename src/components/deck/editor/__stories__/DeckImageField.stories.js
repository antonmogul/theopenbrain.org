/*
 * Deck/Editor/DeckImageField — an image in a slide's form (OPENBRAIN-129):
 * a preview, upload (to decks/<slug>/ in chapter-media), the media library
 * (read-only, the `animations?` fixture) or an address, with alt text and
 * the placeholder funders see until there is an image. An address the
 * site's CSP blocks is flagged and never fetched.
 */
import { computed, ref } from "vue";
import DeckImageField from "../DeckImageField.vue";
import { LAYOUT_SCHEMAS } from "@/data/decks/fields.js";
import { validateSlide } from "@/data/decks/validate.js";
import {
  STORY_IMAGES,
  creatorParameters,
  setAtPath,
} from "@/stories/deckFixtures.js";

const harness = (image) => () => ({
  components: { DeckImageField },
  setup() {
    const entry = ref({
      id: "story",
      label: "Image and text",
      layout: "imageText",
      props: { title: "Headline", image },
    });
    return {
      entry,
      descriptor: LAYOUT_SCHEMAS.imageText.fields.image,
      problems: computed(() => validateSlide(entry.value, { position: 1 })),
      update: (path, value) =>
        (entry.value = setAtPath(entry.value, path, value)),
    };
  },
  template: `
    <div style="width: 420px; max-width: 100%">
      <DeckImageField
        :descriptor="descriptor"
        :value="entry.props.image"
        :context="entry.props"
        path="props.image"
        slide-id="story"
        :problems="problems"
        deck-id="0b4f6d1e-5c2a-4c1e-9d3b-1a2b3c4d5e6f"
        @update="update"
      />
    </div>`,
});

export default {
  title: "Deck/Editor/DeckImageField",
  component: DeckImageField,
  parameters: creatorParameters(),
  argTypes: {
    descriptor: { control: false, description: "An image or imageSrc field." },
    value: { control: false },
    context: { control: false },
    path: { control: false },
    slideId: { control: false },
    problems: { control: false },
    deckId: { control: false },
  },
};

/** No image yet: the placeholder shows on the slide. */
export const Empty = { render: harness({ src: "", alt: "" }) };

/** An image from the library, with its alt text. */
export const WithImage = {
  render: harness({
    src: STORY_IMAGES.phrenology,
    alt: "A phrenology bust mapped into faculties",
    figure: "image-phrenology",
  }),
};

/** An address the CSP blocks: warned, and not fetched for the preview. */
export const BlockedUrl = {
  render: harness({
    src: "https://images.example.com/team/stuart.jpg",
    alt: "Stuart Trenholm",
  }),
};
