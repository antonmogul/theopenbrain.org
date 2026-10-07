<script setup>
// Template T14: browser, tablet and phone together, to show the book works
// on every screen. The browser sits behind; tablet and phone overlap it.
import DeckSlide from "../DeckSlide.vue";
import DeviceFrame from "../DeviceFrame.vue";

defineProps({
  eyebrow: { type: String, default: "" },
  title: { type: String, required: true },
  // { browser, tablet, phone } — each { src, alt }.
  screens: { type: Object, default: () => ({}) },
});
</script>

<template>
  <DeckSlide class="devices">
    <span class="deck-eyebrow devices__eyebrow">{{ eyebrow }}</span>
    <h2 class="deck-title">{{ title }}</h2>
    <div class="devices__stage">
      <div class="devices__browser">
        <DeviceFrame
          kind="browser"
          :height="660"
          :src="screens.browser?.src"
          :alt="screens.browser?.alt"
          placeholder="Desktop screenshot"
        />
      </div>
      <div class="devices__tablet">
        <DeviceFrame
          kind="tablet"
          :width="560"
          :height="420"
          :src="screens.tablet?.src"
          :alt="screens.tablet?.alt"
          placeholder="Tablet screenshot"
        />
      </div>
      <div class="devices__phone">
        <DeviceFrame
          kind="phone"
          :width="235"
          :height="500"
          :src="screens.phone?.src"
          :alt="screens.phone?.alt"
          placeholder="Phone screen"
        />
      </div>
    </div>
  </DeckSlide>
</template>

<style scoped>
.devices {
  padding: 80px 100px 0;
  display: flex;
  flex-direction: column;
}
.devices__eyebrow {
  margin-bottom: 20px;
}
.devices__stage {
  position: relative;
  flex: 1;
}
.devices__browser {
  position: absolute;
  left: 120px;
  right: 300px;
  bottom: -40px;
  display: flex;
}
.devices__tablet {
  position: absolute;
  right: 120px;
  bottom: 60px;
}
.devices__phone {
  position: absolute;
  left: 40px;
  bottom: 40px;
}
</style>
