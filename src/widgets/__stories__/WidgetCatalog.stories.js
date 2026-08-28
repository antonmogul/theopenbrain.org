/*
 * Widgets/Catalog — an index of the interactive widgets, generated from
 * src/widgets/catalog.js.
 *
 * Why an index rather than one story per widget: the widgets are full-page
 * views (RetINaBoxView is 2,724 lines; VisualPathwayLesionsView 3,224), each
 * owning its own viewport, canvas/WebGL context or Pyodide runtime. Mounting
 * one inside a Storybook docs frame renders it wrong and, for the WebGL and
 * Python cases, expensively.
 *
 * So this group documents *what exists and where it lives*, and links out to
 * the running route. When the widgets are decomposed into components — the
 * cleanup this Storybook exists to drive — those components get real stories
 * here and this index shrinks to a contents page.
 */
import { WIDGETS, widgetsByChapter } from "@/widgets/catalog";

const APP_BASE_URL =
  import.meta.env.VITE_STORYBOOK_APP_BASE_URL || "http://localhost:4173";

function appUrl(path) {
  const base = APP_BASE_URL.endsWith("/") ? APP_BASE_URL : `${APP_BASE_URL}/`;
  return new URL(path.replace(/^\//, ""), base).href;
}

export default {
  title: "Widgets/Catalog",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Generated from `src/widgets/catalog.js` — the single source of truth for " +
          "interactive widgets. Widgets with a Vue port link to their route; the rest " +
          "are still author HTML only.",
      },
    },
  },
};

const table = (groups) => ({
  data: () => ({ groups, appUrl }),
  template: `
    <div style="font-family:var(--font-body); color:rgb(var(--color-ink)); max-width:900px;">
      <section v-for="g in groups" :key="g.chapter" style="margin-bottom:32px;">
        <h3 style="font-family:var(--font-mono); font-size:12px; letter-spacing:.08em;
                   text-transform:uppercase; color:rgb(var(--color-mute)); margin:0 0 12px;">
          {{ g.chapter }}
        </h3>
        <div v-for="w in g.widgets" :key="w.id"
             style="display:flex; gap:16px; padding:12px 0; border-top:1px solid rgb(var(--color-line));">
          <div style="flex:1;">
            <div style="font-weight:600;">{{ w.title }}</div>
            <div style="font-size:13px; color:rgb(var(--color-mute)); margin-top:2px;">{{ w.desc }}</div>
            <div style="font-family:var(--font-mono); font-size:11px; color:rgb(var(--color-mute)); margin-top:6px;">
              by {{ w.author }}<span v-if="w.deps?.length"> · deps: {{ w.deps.join(', ') }}</span>
            </div>
          </div>
          <div style="width:180px; flex-shrink:0; font-family:var(--font-mono); font-size:11px;">
            <a v-if="w.vuePath" :href="appUrl(w.vuePath)" target="_blank" rel="noreferrer"
               style="color:rgb(var(--color-accent)); text-decoration:none;">
              {{ w.vuePath }} ↗
            </a>
            <span v-else style="color:rgb(var(--color-mute));">not yet ported</span>
          </div>
        </div>
      </section>
    </div>`,
});

/** Every widget, grouped by chapter, in catalog order. */
export const AllWidgets = { render: () => table(widgetsByChapter()) };

/** Only the ones still awaiting a Vue port — the outstanding work. */
export const NotYetPorted = {
  render: () =>
    table([
      {
        chapter: "Awaiting a Vue port",
        widgets: WIDGETS.filter((w) => !w.vuePath),
      },
    ]),
};
