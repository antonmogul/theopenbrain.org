<script>
let instances = 0;
</script>

<script setup>
/*
 * Animations: on / off / follow my device (OPENBRAIN-189).
 *
 * The one control for the reader's motion preference (useMotionPreference,
 * which stores it through usePreferences as `reduceMotion`). Three native
 * radios drawn as one segmented control, so the arrow keys, the single tab
 * stop and the group's name come from the browser. The line under it says
 * what is happening now and why, since "follow my device" means nothing
 * until you know what the device asks for.
 */
import { computed } from "vue";
import { useMotionPreference } from "@/composables/useMotionPreference";

const { animations, systemReduced, setAnimations } = useMotionPreference();

const OPTIONS = [
  { value: "on", label: "On" },
  { value: "off", label: "Off" },
  { value: "device", label: "Follow my device" },
];

// One name per instance: two switches on a page must not share a group.
// A module counter, not useId(), which restarts per app (Storybook's docs
// page mounts each story as its own app on one page).
const name = `ob-motion-${++instances}`;

const status = computed(() => {
  if (animations.value === "on") {
    return systemReduced.value
      ? "On in this book, although your device asks for less motion."
      : "Figures, covers and page effects move.";
  }
  if (animations.value === "off") {
    return "Figures, covers and page effects hold still.";
  }
  return systemReduced.value
    ? "Your device asks for less motion, so animations are off."
    : "Your device allows motion, so animations are on.";
});
</script>

<template>
  <fieldset class="motion" :aria-describedby="`${name}-status`">
    <legend class="motion__legend">Animations</legend>
    <div class="motion__options">
      <label
        v-for="option in OPTIONS"
        :key="option.value"
        class="motion__option"
        :class="{ 'motion__option--wide': option.value === 'device' }"
      >
        <input
          class="motion__input"
          type="radio"
          :name="name"
          :value="option.value"
          :checked="animations === option.value"
          @change="setAnimations(option.value)"
        />
        <span class="motion__label">{{ option.label }}</span>
      </label>
    </div>
    <p
      :id="`${name}-status`"
      class="motion__status"
      data-testid="motion-status"
    >
      {{ status }}
    </p>
  </fieldset>
</template>

<style scoped>
.motion {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}
.motion__legend {
  padding: 0;
  margin-bottom: 0.5rem;
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgb(var(--color-mute));
}
.motion__options {
  display: flex;
  border: 1px solid rgb(var(--color-ink));
  border-radius: var(--radius-control);
}
.motion__option {
  position: relative;
  flex: 1 1 0;
  min-width: 0;
  cursor: pointer;
}
.motion__option--wide {
  flex: 2.4 1 0;
}
.motion__option + .motion__option {
  border-left: 1px solid rgb(var(--color-ink));
}
/* The radio itself covers its segment, invisible: the whole segment is the
   target and the browser still owns focus and the arrow keys. */
.motion__input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}
.motion__label {
  display: grid;
  place-items: center;
  min-height: 44px;
  padding: 0 0.5rem;
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  letter-spacing: 0.06em;
  line-height: 1.2;
  text-align: center;
  text-transform: uppercase;
  color: rgb(var(--color-ink));
  transition:
    background 0.12s ease,
    color 0.12s ease;
}
.motion__input:hover + .motion__label {
  background: rgb(var(--color-ink) / 0.05);
}
.motion__input:checked + .motion__label {
  background: rgb(var(--color-ink));
  color: rgb(var(--color-paper));
}
.motion__input:focus-visible + .motion__label {
  outline: 3px solid rgb(var(--color-accent));
  outline-offset: 2px;
}
.motion__status {
  margin: 0.5rem 0 0;
  font-family: var(--font-ui);
  font-size: var(--ui-size-13);
  line-height: 1.4;
  color: rgb(var(--color-mute));
}
</style>
