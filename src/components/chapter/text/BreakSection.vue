<script setup>
import { computed, ref, useId } from "vue";
import { toSlug } from "@/helper/general.js";
import { breakSectionDirections } from "@/helper/breakSectionPresentation";
import FullBleed from "@/components/chapter/FullBleed.vue";

const props = defineProps({ content: Object });
const infoIsOpen = ref(true);
const infoId = `break-info-${useId()}`;
const titleId = `break-title-${useId()}`;
const blindSpot = computed(() => props.content.title === "Blind spot");
const colorBlindness = computed(
  () => props.content.title === "Color blindness"
);
const hasExperiment = computed(() => blindSpot.value || colorBlindness.value);
const steps = computed(() => breakSectionDirections(props.content));
</script>

<template>
  <FullBleed viewport>
    <section
      class="break-demo noHighlight"
      :class="{ 'break-demo--plate': colorBlindness && !infoIsOpen }"
      :data-break-demo="toSlug(content.title)"
      :aria-labelledby="titleId"
    >
      <div
        v-if="hasExperiment"
        class="break-art"
        :class="{ 'break-art--muted': infoIsOpen }"
        :aria-hidden="infoIsOpen"
      >
        <div v-if="blindSpot" class="blind-targets">
          <img
            class="blind-man"
            src="/publicAssets/images/blindSpot/Man_A.png"
            alt="Man: left fixation target"
          />
          <img
            class="blind-dragon"
            src="/publicAssets/images/blindSpot/Dragon_B.png"
            alt="Dragon: right fixation target"
          />
        </div>
        <img
          v-else-if="colorBlindness"
          class="color-plate"
          src="/publicAssets/images/eyeDots.svg"
          alt="Colour vision test plate"
        />
      </div>
      <header class="break-header">
        <h4 :id="titleId">{{ content.title }}</h4>
        <button
          v-if="hasExperiment"
          type="button"
          class="break-toggle"
          :aria-expanded="infoIsOpen"
          :aria-controls="infoId"
          :aria-label="infoIsOpen ? 'Hide explanation' : 'Show explanation'"
          @click="infoIsOpen = !infoIsOpen"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            :class="{ 'is-open': infoIsOpen }"
          >
            <path
              d="M12 5v14M5 12h14"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            />
          </svg>
        </button>
      </header>
      <div
        v-show="infoIsOpen"
        :id="infoId"
        class="break-info"
        role="region"
        :aria-labelledby="titleId"
        tabindex="0"
      >
        <div class="break-copy">
          <p v-html="content.text" />
          <div v-if="steps.length" class="break-directions">
            <p><strong>Directions:</strong></p>
            <ol>
              <li v-for="step in steps" :key="step">{{ step }}</li>
            </ol>
          </div>
        </div>
        <img
          v-if="blindSpot"
          class="blind-diagram"
          src="/publicAssets/images/blind-spot.png"
          alt="Eye cross-section showing the blind spot where the optic nerve exits the retina"
        />
      </div>
    </section>
  </FullBleed>
</template>

<style scoped>
.break-demo {
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: #333;
  color: #fff;
  font-family: var(--font-ui);
  font-size: var(--ui-size-16);
  line-height: 1.55;
  padding: clamp(1rem, 2vw, 2rem);
}
.break-demo--plate {
  background: rgb(var(--color-bg));
  color: rgb(var(--color-ink));
}
.break-header {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
}
.break-header h4 {
  margin: 0;
  font-size: var(--ui-size-20);
  font-weight: 600;
}
.break-toggle {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  margin-block: 1.5rem 1rem;
  padding: 0;
  border: 1px solid rgb(var(--color-line));
  border-radius: 0;
  background: #fff;
  color: #111;
  cursor: pointer;
}
.break-toggle:focus-visible,
.break-info:focus-visible {
  outline: 2px solid rgb(var(--color-chapter));
  outline-offset: 3px;
}
.break-toggle svg {
  width: 24px;
  height: 24px;
}
.break-toggle svg.is-open {
  transform: rotate(45deg);
}
.break-art {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.break-art--muted {
  opacity: 0.12;
  filter: blur(3px);
}
.blind-targets {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  justify-items: center;
  width: 100%;
  height: 100%;
}
.blind-man {
  height: clamp(64px, 12vw, 150px);
  width: auto;
}
.blind-dragon {
  width: clamp(95px, 22vw, 280px);
  height: auto;
}
.color-plate {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 6rem 2rem 2rem;
}
.break-info {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: clamp(1.5rem, 5vw, 5rem);
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  align-content: start;
}
.break-copy {
  max-width: 52rem;
}
.break-copy p {
  margin: 0;
}
.break-directions {
  margin-top: 1.25rem;
}
.break-directions ol {
  list-style: decimal;
  padding-left: 1.5rem;
  margin: 0;
}
.break-directions li {
  padding-left: 0.25rem;
  margin-bottom: 0.75rem;
}
.blind-diagram {
  width: 100%;
  max-width: 28rem;
  height: auto;
  object-fit: contain;
  align-self: start;
}
@media (max-width: 767px) {
  .break-info {
    grid-template-columns: minmax(0, 1fr);
    gap: 1.5rem;
  }
  .blind-diagram {
    max-width: 20rem;
    justify-self: center;
  }
}
</style>
