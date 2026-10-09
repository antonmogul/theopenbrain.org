/*
 * Widgets/Uploads from the book — every widget published in Dashboard →
 * Widgets, read live from the book's database (OPENBRAIN-135). Nothing to
 * rebuild: a widget shows here as soon as it is published. Pick one in the
 * list, or open a link with `&args=slug:<slug>`.
 *
 * Reads the public REST API with the publishable key, like the reader, so it
 * sees published uploads only (drafts are creator-only by RLS). Tagged
 * `live`: the story smoke test, which allows no outside requests, skips it.
 */
import { ref, computed } from "vue";
import WidgetFrame from "../../uploaded/WidgetFrame.vue";
import ScaledFrame from "../../uploaded/ScaledFrame.vue";

const URL_ = import.meta.env.VITE_SUPABASE_URL;
const KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

async function fetchPublished() {
  // Storybook mocks Supabase fetches for every story; this one is `live` and
  // uses the browser's own fetch (.storybook/mocks/fetch.js keeps it).
  const realFetch = globalThis.__liveFetch || globalThis.fetch;
  const res = await realFetch(
    `${URL_}/rest/v1/widget_uploads?status=eq.published` +
      `&select=slug,title,description,author,ramp,html,updated_at&order=updated_at.desc`,
    { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }
  );
  if (!res.ok) throw new Error(`widget_uploads: HTTP ${res.status}`);
  return res.json();
}

/** A link to this story with one widget chosen (the manager's own URL). */
function linkFor(slug) {
  try {
    const top = window.top.location;
    return `${top.origin}${top.pathname}?path=/story/widgets-uploads-from-the-book--published&args=slug:${slug}`;
  } catch {
    return "";
  }
}

export default {
  title: "Widgets/Uploads from the book",
  tags: ["live"],
  parameters: { layout: "fullscreen" },
  args: { slug: "", ramp: "" },
  argTypes: {
    slug: { control: "text", description: "upload:<slug> to show" },
    ramp: {
      control: "inline-radio",
      options: ["", "fund", "perc", "move", "lear", "deve"],
      description: "Chapter colour (blank: the widget's own)",
    },
  },
};

export const Published = {
  render: (args) => ({
    components: { WidgetFrame, ScaledFrame },
    setup() {
      const rows = ref([]);
      const error = ref(
        URL_ && KEY ? "" : "No Supabase URL/key in this build."
      );
      const pick = ref(args.slug);
      if (URL_ && KEY)
        fetchPublished()
          .then((r) => {
            rows.value = r;
            if (!pick.value && r.length) pick.value = r[0].slug;
          })
          .catch((e) => (error.value = e.message));
      const current = computed(
        () => rows.value.find((r) => r.slug === pick.value) || null
      );
      const ramp = computed(() => args.ramp || current.value?.ramp || "fund");
      return { rows, error, pick, current, ramp, linkFor };
    },
    template: `
      <div style="padding:24px;display:grid;gap:24px;grid-template-columns:240px minmax(0,1fr) 260px;align-items:start;font-family:var(--font-body)">
        <nav aria-label="Published widgets">
          <p style="margin:0 0 8px;font:500 11px/1.4 var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:rgb(var(--color-mute))">
            Published · {{ rows.length }}
          </p>
          <p v-if="error" role="alert" style="font-size:13px">{{ error }}</p>
          <button v-for="r in rows" :key="r.slug" type="button" @click="pick = r.slug"
            :aria-current="r.slug === pick ? 'true' : undefined"
            :style="{display:'block',width:'100%',textAlign:'left',padding:'8px 10px',marginBottom:'4px',cursor:'pointer',
              border:'1px solid rgb(var(--color-line))',background: r.slug === pick ? 'rgb(var(--color-ink))' : 'rgb(var(--color-paper))',
              color: r.slug === pick ? 'rgb(var(--color-paper))' : 'rgb(var(--color-ink))',font:'14px/1.35 var(--font-body)'}">
            {{ r.title }}<br /><small style="font:11px var(--font-mono);opacity:.7">upload:{{ r.slug }}</small>
          </button>
        </nav>
        <div v-if="current" style="min-width:0">
          <p style="margin:0 0 4px;font:500 11px/1.4 var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:rgb(var(--color-mute))">
            upload:{{ current.slug }} · {{ current.author }} · updated {{ current.updated_at?.slice(0, 10) }}
          </p>
          <p style="margin:0 0 8px;font-size:15px;line-height:1.5;max-width:48rem">{{ current.description }}</p>
          <p v-if="linkFor(current.slug)" style="margin:0 0 16px;font:12px var(--font-mono)">
            <a :href="linkFor(current.slug)" target="_top">Link to this widget</a>
          </p>
          <WidgetFrame :key="current.slug + ramp" :html="current.html" :ramp="ramp" :title="current.title" />
        </div>
        <ScaledFrame v-if="current" :key="'p' + current.slug + ramp" :html="current.html" :ramp="ramp" :width="390" label="Phone" />
      </div>`,
  }),
};
