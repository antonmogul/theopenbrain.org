<script setup>
import { onErrorCaptured, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

const props = defineProps({
  path: { type: String, default: "/" },
  label: { type: String, required: true },
});

const router = useRouter();
const caughtError = ref("");
const ready = ref(false);

onMounted(async () => {
  await router.replace(props.path);
  ready.value = true;
});

onErrorCaptured((error) => {
  caughtError.value = error?.message || String(error);
  return false;
});
</script>

<template>
  <main class="view-story-shell">
    <header class="story-context">
      <span>Full-page view</span>
      <strong>{{ label }}</strong>
      <code>{{ path }}</code>
    </header>
    <div v-if="caughtError" class="story-error" role="alert">
      <strong>The view reached an unsupported browser capability.</strong>
      <span>{{ caughtError }}</span>
    </div>
    <div v-else-if="ready" class="view-stage">
      <slot />
    </div>
    <div v-else class="story-loading" aria-live="polite">
      Loading story route…
    </div>
  </main>
</template>

<style scoped>
.view-story-shell {
  min-height: 900px;
  background: rgb(var(--color-bg));
  color: rgb(var(--color-ink));
}
.story-context {
  position: relative;
  z-index: 2000;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  padding: 8px 16px;
  border-bottom: 1px solid rgb(var(--color-line));
  background: rgb(var(--color-paper));
  font-family: var(--font-mono);
  font-size: 11px;
}
.story-context span {
  color: rgb(var(--color-mute));
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.story-context code {
  margin-left: auto;
  color: rgb(var(--color-mute));
}
.view-stage {
  position: relative;
  min-height: 856px;
}
.story-loading {
  display: grid;
  min-height: 320px;
  place-items: center;
  color: rgb(var(--color-mute));
  font-family: var(--font-mono);
  font-size: 12px;
}
.story-error {
  margin: 32px;
  padding: 20px;
  border: 1px solid rgb(var(--color-warn));
  background: rgb(var(--color-paper));
  display: grid;
  gap: 8px;
}
</style>
