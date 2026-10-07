<script setup>
// Templates T9, T10, T12 and T13: one product screen in a device frame.
// `wide` puts a full-width browser under a title row; otherwise the text
// sits on the left and the browser, tablet or phone on the right.
import { computed } from "vue";
import DeckSlide from "../DeckSlide.vue";
import DeviceFrame from "../DeviceFrame.vue";

const props = defineProps({
  device: {
    type: String,
    default: "browser",
    validator: (v) => ["browser", "phone", "tablet"].includes(v),
  },
  // Full-width browser under a title row (browser only).
  wide: { type: Boolean, default: false },
  eyebrow: { type: String, default: "" },
  title: { type: String, required: true },
  text: { type: String, default: "" },
  // Short lines under the text, each shown with a leading dash.
  details: { type: Array, default: () => [] },
  // { src, alt, placeholder }
  screen: { type: Object, default: () => ({}) },
});

// Frame sizes from the design, per device.
const FRAMES = {
  browser: { width: "100%", height: 680 },
  tablet: { width: 1060, height: 800 },
  phone: { width: 385, height: 820 },
};
const frame = computed(() =>
  props.wide ? { width: "100%", height: 760 } : FRAMES[props.device]
);
</script>

<template>
  <DeckSlide
    class="screen"
    :class="wide ? 'screen--wide' : `screen--${device}`"
  >
    <template v-if="wide">
      <div class="screen__head">
        <div class="screen__titles">
          <span class="deck-eyebrow">{{ eyebrow }}</span>
          <h2 class="deck-title">{{ title }}</h2>
        </div>
        <span v-if="text" class="screen__aside">{{ text }}</span>
      </div>
      <DeviceFrame
        kind="browser"
        v-bind="frame"
        :src="screen.src"
        :alt="screen.alt"
        :placeholder="screen.placeholder || 'Desktop screenshot, 16:9'"
      />
    </template>
    <template v-else>
      <div class="screen__copy">
        <span class="deck-eyebrow">{{ eyebrow }}</span>
        <h2 class="screen__title">{{ title }}</h2>
        <p v-if="text" class="screen__text">{{ text }}</p>
        <div v-if="details.length" class="screen__details">
          <span v-for="d in details" :key="d">— {{ d }}</span>
        </div>
      </div>
      <div class="screen__device">
        <DeviceFrame
          :kind="device"
          v-bind="frame"
          :src="screen.src"
          :alt="screen.alt"
          :placeholder="screen.placeholder || 'Screenshot'"
        />
      </div>
    </template>
  </DeckSlide>
</template>

<style scoped>
.screen--wide {
  padding: 80px 100px 0;
  display: flex;
  flex-direction: column;
}
.screen__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 56px;
}
.screen__titles {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.screen__aside {
  max-width: 640px;
  font-size: 30px;
  text-align: right;
  color: rgb(var(--color-mute));
  text-wrap: pretty;
}

.screen--browser,
.screen--tablet {
  padding: 100px;
  display: grid;
  grid-template-columns: 560px minmax(0, 1fr);
  gap: 80px;
  align-items: center;
}
.screen--phone {
  padding: 100px 160px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 120px;
  align-items: center;
}
.screen__copy {
  display: flex;
  flex-direction: column;
  gap: 32px;
}
.screen--phone .screen__copy {
  max-width: 900px;
}
.screen__title {
  font-size: 72px;
  font-weight: 500;
  letter-spacing: -0.015em;
  line-height: 1.05;
}
.screen--phone .screen__title {
  font-size: 84px;
}
.screen__text {
  font-size: 30px;
  line-height: 1.5;
  color: rgb(var(--deck-body));
  text-wrap: pretty;
}
.screen--phone .screen__text {
  font-size: 32px;
}
.screen__details {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 24px;
  border-top: 1px solid rgb(var(--deck-chrome-line));
  font-size: 28px;
}
.screen__device {
  display: flex;
  justify-content: center;
}
</style>
