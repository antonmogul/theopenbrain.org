<script setup>
// The kinds of users side by side: a colour block per role (icon, audience,
// role name) over a one-line value statement and three feature chips.
import DeckSlide from "../DeckSlide.vue";
import DeckIcon from "../DeckIcon.vue";

defineProps({
  eyebrow: { type: String, default: "" },
  title: { type: String, required: true },
  // [{ role: "creator"|"professor"|"student"|"public", icon, audience,
  //    name, value, features: [String] }]
  roles: { type: Array, required: true },
});
</script>

<template>
  <DeckSlide class="deck-pad audience">
    <span class="deck-eyebrow audience__eyebrow">{{ eyebrow }}</span>
    <h2 class="deck-title audience__title">{{ title }}</h2>
    <div
      class="audience__grid"
      :style="{
        gridTemplateColumns: `repeat(${roles.length}, minmax(0, 1fr))`,
      }"
    >
      <div
        v-for="r in roles"
        :key="r.role"
        class="audience__card"
        :class="`deck-role--${r.role}`"
      >
        <div class="audience__block">
          <DeckIcon :name="r.icon" :size="80" :stroke-width="1.4" />
          <div class="audience__names">
            <span class="audience__audience">{{ r.audience }}</span>
            <span class="audience__name">{{ r.name }}</span>
          </div>
        </div>
        <div class="audience__body">
          <p class="audience__value">{{ r.value }}</p>
          <div class="audience__chips">
            <span v-for="f in r.features" :key="f" class="audience__chip">{{
              f
            }}</span>
          </div>
        </div>
      </div>
    </div>
  </DeckSlide>
</template>

<style scoped>
.audience__eyebrow {
  margin-bottom: 20px;
}
.audience__title {
  margin-bottom: 56px;
}
.audience__grid {
  display: grid;
  gap: 32px;
  flex: 1;
}
.audience__card {
  display: flex;
  flex-direction: column;
  background: rgb(var(--color-paper));
  border: 1px solid rgb(var(--color-line));
}
.audience__block {
  height: 250px;
  padding: 32px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: rgb(var(--role));
  color: rgb(var(--role-on));
}
.audience__names {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.audience__audience {
  font-family: "IBM Plex Mono", ui-monospace, monospace;
  font-size: 20px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.audience__name {
  font-size: 52px;
  font-weight: 500;
  line-height: 1;
}
.audience__body {
  padding: 28px 32px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.audience__value {
  font-size: 28px;
  line-height: 1.4;
  text-wrap: pretty;
}
.audience__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.audience__chip {
  font-family: "IBM Plex Mono", ui-monospace, monospace;
  font-size: 22px;
  padding: 5px 12px;
  border-radius: 999px;
  background: rgb(var(--role) / 0.14);
}
.deck-role--public .audience__chip {
  background: rgb(var(--deck-chrome));
}
</style>
