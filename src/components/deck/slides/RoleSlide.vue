<script setup>
// One role in depth (the appendix): a white panel with the role's icon, name
// and value statement, beside six feature cards. The role colour is only on
// the icons and the label, so the slide stays quiet.
import DeckSlide from "../DeckSlide.vue";
import DeckIcon from "../DeckIcon.vue";

defineProps({
  role: {
    type: String,
    required: true,
    validator: (v) => ["creator", "professor", "student", "public"].includes(v),
  },
  eyebrow: { type: String, default: "" },
  icon: { type: String, required: true },
  name: { type: String, required: true },
  value: { type: String, default: "" },
  // [{ icon, name, detail }] — laid out two across, three down.
  features: { type: Array, required: true },
});
</script>

<template>
  <DeckSlide class="role" :class="`deck-role--${role}`">
    <div class="role__panel">
      <span class="deck-eyebrow role__eyebrow">{{ eyebrow }}</span>
      <div class="role__intro">
        <DeckIcon
          class="role__ink"
          :name="icon"
          :size="160"
          :stroke-width="1.3"
        />
        <h2 class="role__name">{{ name }}</h2>
        <p class="role__value">{{ value }}</p>
      </div>
    </div>
    <div class="role__features">
      <div v-for="f in features" :key="f.name" class="role__feature">
        <div class="role__tile">
          <DeckIcon class="role__ink" :name="f.icon" />
        </div>
        <div class="role__copy">
          <span class="role__feature-name">{{ f.name }}</span>
          <span class="role__detail">{{ f.detail }}</span>
        </div>
      </div>
    </div>
  </DeckSlide>
</template>

<style scoped>
.role {
  display: grid;
  grid-template-columns: 640px 1fr;
}
.role__panel {
  padding: 100px 80px 80px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: rgb(var(--color-paper));
  border-right: 1px solid rgb(var(--color-line));
}
.role__eyebrow,
.role__ink {
  color: rgb(var(--role-ink));
}
.role__intro {
  display: flex;
  flex-direction: column;
  gap: 36px;
}
.role__name {
  font-size: 120px;
  font-weight: 500;
  line-height: 1;
  letter-spacing: -0.02em;
}
.role__value {
  font-size: 38px;
  line-height: 1.35;
  color: rgb(var(--color-mute));
  text-wrap: pretty;
}
.role__features {
  padding: 100px 100px 80px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(3, minmax(0, 1fr));
  gap: 28px;
}
.role__feature {
  padding: 32px 36px;
  display: flex;
  align-items: center;
  gap: 28px;
  background: rgb(var(--color-paper));
  border: 1px solid rgb(var(--color-line));
}
.role__tile {
  flex: none;
  width: 96px;
  height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(var(--role) / 0.14);
}
.deck-role--public .role__tile {
  background: rgb(var(--deck-chrome));
}
.role__copy {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.role__feature-name {
  font-size: 36px;
  font-weight: 500;
  line-height: 1.15;
}
.role__detail {
  font-size: 26px;
  line-height: 1.4;
  color: rgb(var(--color-mute));
  text-wrap: pretty;
}
</style>
