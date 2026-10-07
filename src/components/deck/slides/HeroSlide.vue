<script setup>
// Dark slide with a full-height image on the right: the deck's opening and
// closing slides. The left column runs top (brand mark or eyebrow), middle
// (title and lead), bottom (a footnote, or a contact name and role).
import DeckSlide from "../DeckSlide.vue";
import DeckImage from "../DeckImage.vue";

defineProps({
  // Shows "the open brain" mark at the top instead of the eyebrow.
  brand: { type: Boolean, default: false },
  eyebrow: { type: String, default: "" },
  // Teal line above the title.
  kicker: { type: String, default: "" },
  title: { type: String, required: true },
  // "display" for the opening slide (150px), "large" otherwise (112px).
  size: {
    type: String,
    default: "large",
    validator: (v) => ["display", "large"].includes(v),
  },
  lead: { type: String, default: "" },
  footnote: { type: String, default: "" },
  // { name, role } — the contact on a closing slide.
  person: { type: Object, default: null },
  image: { type: Object, default: () => ({ src: "", alt: "" }) },
});
</script>

<template>
  <DeckSlide tone="dark" class="hero">
    <div class="hero__text">
      <div v-if="brand" class="hero__brand">
        <span class="hero__mark" aria-hidden="true" />
        <span class="deck-mono">the open brain</span>
      </div>
      <span v-else class="deck-eyebrow">{{ eyebrow }}</span>

      <div class="hero__middle">
        <span v-if="kicker" class="hero__kicker">{{ kicker }}</span>
        <component
          :is="size === 'display' ? 'h1' : 'h2'"
          :class="size === 'display' ? 'deck-display' : 'hero__title'"
        >
          {{ title }}
        </component>
        <p
          v-if="lead"
          class="hero__lead"
          :class="{ 'hero__lead--display': size === 'display' }"
        >
          {{ lead }}
        </p>
      </div>

      <div v-if="person" class="hero__person">
        <span class="hero__name">{{ person.name }}</span>
        <span class="hero__role">{{ person.role }}</span>
      </div>
      <span v-else class="hero__footnote">{{ footnote }}</span>
    </div>
    <div class="hero__image">
      <DeckImage
        :src="image.src"
        :alt="image.alt"
        :placeholder="image.placeholder || 'Full-height image'"
      />
    </div>
  </DeckSlide>
</template>

<style scoped>
.hero {
  display: grid;
  grid-template-columns: 1fr 760px;
}
.hero__text {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 100px;
}
.hero__brand {
  display: flex;
  align-items: center;
  gap: 18px;
  font-size: 30px;
}
.hero__mark {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 3px solid rgb(var(--color-ink));
}
.hero__middle {
  display: flex;
  flex-direction: column;
  gap: 40px;
}
.hero__kicker {
  font-family: "IBM Plex Mono", ui-monospace, monospace;
  font-size: 26px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(var(--color-complete));
}
.hero__title {
  font-size: 112px;
  font-weight: 500;
  line-height: 1;
  letter-spacing: -0.02em;
}
.hero__lead {
  max-width: 900px;
  font-size: 40px;
  line-height: 1.4;
  text-wrap: pretty;
}
.hero__lead--display {
  font-size: 42px;
  line-height: 1.35;
}
.hero__footnote {
  font-family: "IBM Plex Mono", ui-monospace, monospace;
  font-size: 24px;
  letter-spacing: 0.06em;
  color: rgb(var(--color-mute));
}
.hero__person {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.hero__name {
  font-size: 34px;
  font-weight: 500;
}
.hero__role {
  font-family: "IBM Plex Mono", ui-monospace, monospace;
  font-size: 26px;
  color: rgb(var(--color-complete));
}
.hero__image {
  position: relative;
}
</style>
