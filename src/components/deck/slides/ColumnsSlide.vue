<script setup>
// Templates T3–T5: numbered, ruled text columns. Two or three items sit in
// one row; four items make a two-by-two grid.
import { computed } from "vue";
import DeckSlide from "../DeckSlide.vue";

const props = defineProps({
  eyebrow: { type: String, default: "" },
  title: { type: String, required: true },
  // [{ heading, text }] — numbered 01, 02, … in order.
  items: {
    type: Array,
    required: true,
    validator: (items) => items.length >= 2 && items.length <= 4,
  },
});

const columns = computed(() => (props.items.length === 3 ? 3 : 2));
const index = (i) => String(i + 1).padStart(2, "0");
</script>

<template>
  <DeckSlide class="deck-pad columns">
    <span class="deck-eyebrow columns__eyebrow">{{ eyebrow }}</span>
    <h2
      class="deck-title columns__title"
      :class="{ 'columns__title--tight': items.length === 4 }"
    >
      {{ title }}
    </h2>
    <div
      class="columns__grid"
      :class="`columns__grid--${columns}`"
      :style="{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }"
    >
      <div v-for="(item, i) in items" :key="i" class="deck-ruled">
        <span class="deck-ruled__index">{{ index(i) }}</span>
        <span class="deck-ruled__heading">{{ item.heading }}</span>
        <p class="deck-body">{{ item.text }}</p>
      </div>
    </div>
  </DeckSlide>
</template>

<style scoped>
.columns__eyebrow {
  margin-bottom: 20px;
}
.columns__title {
  margin-bottom: 64px;
}
.columns__title--tight {
  margin-bottom: 48px;
}
.columns__grid {
  display: grid;
  gap: 48px 100px;
}
.columns__grid--3 {
  gap: 64px;
}
</style>
