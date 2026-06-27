<script setup>
// Pill toggle matching the prototype Switch (profile.jsx): 44×24, magenta-on,
// sliding 18px thumb, role=switch for a11y. v-model:checked.
defineProps({
  checked: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
});
const emit = defineEmits(["update:checked"]);
function toggle(checked) {
  emit("update:checked", !checked);
}
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="checked"
    :disabled="disabled"
    class="switch"
    :class="{ on: checked }"
    @click="toggle(checked)"
  >
    <span class="thumb" />
  </button>
</template>

<style scoped>
.switch {
  width: 44px;
  height: 24px;
  border-radius: 999px;
  border: 0;
  padding: 0;
  position: relative;
  cursor: pointer;
  flex: none;
  background: rgb(var(--color-ink) / 0.18);
  transition: background 200ms ease;
}

.switch.on {
  background: rgb(var(--color-accent));
}

.switch:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  transition: left 200ms ease;
}

.switch.on .thumb {
  left: 23px;
}
</style>
