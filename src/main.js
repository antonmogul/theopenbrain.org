import { createApp, markRaw } from "vue";
import App from "./App.vue";
import router from "./router";
import { createPinia } from "pinia";
import { usePreferences } from "@/composables/usePreferences";

import "@/index.css";

usePreferences().init();

const app = createApp(App);
const pinia = createPinia();

pinia.use(({ store }) => {
  store.router = markRaw(router);
});

app.use(pinia);
app.use(router);

app.config.globalProperties.$version = window.__VERSION__;

app.mount("#app");
