<script setup>
// A browser window, phone or tablet around a screenshot, for showing the
// product on a slide. Sizes are design pixels; the screen fills whatever the
// frame leaves.
import DeckImage from "./DeckImage.vue";

defineProps({
  kind: {
    type: String,
    default: "browser",
    validator: (v) => ["browser", "phone", "tablet"].includes(v),
  },
  width: { type: [Number, String], default: "100%" },
  height: { type: [Number, String], required: true },
  src: { type: String, default: "" },
  alt: { type: String, default: "" },
  placeholder: { type: String, default: "Screenshot" },
  // Address bar text (browser only).
  url: { type: String, default: "theopenbrain.org" },
});

const px = (v) => (typeof v === "number" ? `${v}px` : v);
</script>

<template>
  <div
    class="device"
    :class="`device--${kind}`"
    :style="{ width: px(width), height: px(height) }"
  >
    <div v-if="kind === 'browser'" class="device__bar">
      <div class="device__dots" aria-hidden="true">
        <span /><span /><span />
      </div>
      <div class="device__url">{{ url }}</div>
    </div>
    <div class="device__screen">
      <DeckImage :src="src" :alt="alt" :placeholder="placeholder" />
      <div v-if="kind === 'phone'" class="device__notch" aria-hidden="true" />
    </div>
  </div>
</template>

<style scoped>
.device {
  flex: none;
  display: flex;
  flex-direction: column;
  box-shadow: 0 30px 60px -30px rgb(0 0 0 / 0.45);
}
.device__screen {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: rgb(var(--color-line));
}

.device--browser {
  background: rgb(var(--color-paper));
  border: 1px solid rgb(var(--deck-chrome-line));
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 30px 60px -30px rgb(0 0 0 / 0.35);
}
.device__bar {
  flex: none;
  height: 56px;
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 0 22px;
  background: rgb(var(--deck-chrome));
  border-bottom: 1px solid rgb(var(--deck-chrome-line));
}
.device__dots {
  display: flex;
  gap: 10px;
}
.device__dots span {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: rgb(var(--deck-chrome-dot));
}
.device__url {
  flex: 1;
  max-width: 560px;
  height: 34px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-radius: 8px;
  background: rgb(var(--color-paper));
  font-family: "IBM Plex Mono", ui-monospace, monospace;
  font-size: 18px;
  color: rgb(var(--color-mute));
}

.device--phone,
.device--tablet {
  background: rgb(10 10 10);
}
.device--phone {
  border-radius: 52px;
  padding: 14px;
}
.device--phone .device__screen {
  border-radius: 40px;
}
.device__notch {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  width: 96px;
  height: 28px;
  border-radius: 999px;
  background: rgb(10 10 10);
  pointer-events: none;
}
.device--tablet {
  border-radius: 40px;
  padding: 22px;
}
.device--tablet .device__screen {
  border-radius: 20px;
}
</style>
