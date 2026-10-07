<script setup>
// The team: one column per person, headshot above name and role.
import DeckSlide from "../DeckSlide.vue";
import DeckImage from "../DeckImage.vue";

defineProps({
  eyebrow: { type: String, default: "" },
  title: { type: String, required: true },
  // [{ name, role, photo?, photoPosition? }]
  people: { type: Array, required: true },
});
</script>

<template>
  <DeckSlide class="deck-pad team">
    <span class="deck-eyebrow team__eyebrow">{{ eyebrow }}</span>
    <h2 class="deck-title team__title">{{ title }}</h2>
    <div
      class="team__grid"
      :style="{
        gridTemplateColumns: `repeat(${people.length}, minmax(0, 1fr))`,
      }"
    >
      <div v-for="person in people" :key="person.name" class="team__person">
        <div class="team__photo">
          <DeckImage
            :src="person.photo"
            :alt="person.name"
            :position="person.photoPosition"
            :placeholder="`${person.name.split(' ')[0]} — headshot`"
          />
        </div>
        <span class="team__name">{{ person.name }}</span>
        <span class="team__role">{{ person.role }}</span>
      </div>
    </div>
  </DeckSlide>
</template>

<style scoped>
.team__eyebrow {
  margin-bottom: 20px;
}
.team__title {
  margin-bottom: 80px;
}
.team__grid {
  display: grid;
  gap: 32px;
  flex: 1;
}
.team__person {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.team__photo {
  position: relative;
  height: 400px;
}
.team__name {
  font-size: 36px;
  font-weight: 500;
  line-height: 1.15;
}
.team__role {
  font-size: 26px;
  line-height: 1.4;
  color: rgb(var(--color-mute));
}
</style>
