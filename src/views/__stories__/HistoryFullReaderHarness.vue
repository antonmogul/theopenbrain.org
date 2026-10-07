<script setup>
/** A nested real Vue app gives this story its own browser-history router and
 * Pinia without replacing Storybook's memory router. Only data/auth are doubled
 * by the existing Storybook aliases. App, ChapterView, TextComp and NavDrawer
 * render unchanged. No replica reader geometry or synthetic prose is used. */
import { createApp, markRaw, onBeforeUnmount, onMounted, ref } from "vue";
import { createPinia } from "pinia";
import { createWebHashHistory } from "vue-router";
import { createAppRouter } from "@/router";
import App from "@/App.vue";
import { observeAppWidth } from "@/helper/appWidth";
import { useAnimations } from "@/composables/useAnimations";
import { usePreferences } from "@/composables/usePreferences";

const host = ref(null);
let app;
let stopWidth;
let history;
let router;
let disposed = false;
let mounted = false;
function dispose() {
  if (mounted) {
    app?.unmount();
    mounted = false;
  }
  stopWidth?.();
  stopWidth = null;
  if (router) router.listening = false;
  history?.destroy();
  history = null;
}
const start = "/chapter/1/foundations-of-neuroscience";
onMounted(async () => {
  useAnimations().clearCache();
  // Match main.js typography and reading measure while honoring the story
  // toolbar’s explicit motion preference. Anonymous auth prevents server sync.
  const motion = document.documentElement.dataset.reduceMotion;
  const preferences = usePreferences();
  preferences.init();
  if (motion === "1" || motion === "0")
    preferences.reduceMotion.value = motion === "1" ? "on" : "off";
  history = createWebHashHistory();
  router = createAppRouter({ history });
  // Fresh local-only stores; intentionally anonymous, so no persistence writes.
  app = createApp(App);
  const pinia = createPinia();
  pinia.use(({ store }) => {
    store.router = markRaw(router);
  });
  app.use(pinia);
  app.use(router);
  await router.replace(start);
  await router.isReady();
  if (disposed) {
    dispose();
    return;
  }
  stopWidth = observeAppWidth();
  app.config.globalProperties.$version = window.__VERSION__;
  app.mount(host.value);
  mounted = true;
});
onBeforeUnmount(() => {
  disposed = true;
  dispose();
});
</script>

<template>
  <div ref="host" data-full-reader-fixture />
</template>
