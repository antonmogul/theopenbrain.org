<script setup>
/*
 * Colours foundation — renders the --color-* token palette from brand.css.
 * Swatches read their value live from CSS custom properties, so this never
 * drifts from the source of truth.
 */
import { ref, onMounted } from "vue";

// Grouped to mirror the brand.css structure. `token` is the CSS var name.
const GROUPS = [
  {
    title: "Surface",
    note: "Backgrounds, paper, ink and hairlines. The neutral scale everything sits on.",
    swatches: [
      { token: "--color-bg", name: "bg", use: "Page background (warm paper)" },
      { token: "--color-paper", name: "paper", use: "Cards / raised surfaces" },
      { token: "--color-ink", name: "ink", use: "Primary text" },
      { token: "--color-mute", name: "mute", use: "Secondary / muted text" },
      { token: "--color-line", name: "line", use: "Hairlines / borders" },
    ],
  },
  {
    title: "Semantic",
    note: "Accent + status colours. Accent is fixed to magenta (the brand primary).",
    swatches: [
      {
        token: "--color-accent",
        name: "accent",
        use: "Brand primary / interactive",
      },
      {
        token: "--color-complete",
        name: "complete",
        use: "Success / takeaway (teal)",
      },
      { token: "--color-warn", name: "warn", use: "Warning / caution (amber)" },
    ],
  },
  {
    title: "Highlighter",
    note: "The four reader highlight colours. Fixed across themes.",
    swatches: [
      { token: "--color-mark1", name: "mark1", use: "Yellow" },
      { token: "--color-mark2", name: "mark2", use: "Pink" },
      { token: "--color-mark3", name: "mark3", use: "Blue" },
      { token: "--color-mark4", name: "mark4", use: "Green" },
    ],
  },
];

/*
 * Chapter ramps. Each chapter owns an identity colour with four steps. Unlike
 * the groups above these live under [data-chapter="n"] rather than :root, so
 * they're resolved off a detached probe element carrying that attribute (see
 * readChapterRamps) instead of from the document root.
 */
const CHAPTERS = [
  { n: 1, name: "Fundamentals" },
  { n: 2, name: "Perception" },
  { n: 3, name: "Movement" },
  { n: 4, name: "Learning, Cognition & Memory" },
  { n: 5, name: "Development & Degeneration" },
];

const RAMP_STEPS = [
  {
    token: "--color-chapter",
    label: "primary",
    use: "Section numbers, buttons, active states",
  },
  {
    token: "--color-chapter-deep",
    label: "deep",
    use: "Hover / pressed, text on light tints",
  },
  { token: "--color-chapter-soft", label: "soft", use: "Fills, selected rows" },
  {
    token: "--color-chapter-pale",
    label: "pale",
    use: "Highlight washes, backgrounds",
  },
];

// Resolve each token's RGB triplet → hex, read live from the document root.
const hexValues = ref({});
const chapterRamps = ref([]);

function tripletToHex(triplet) {
  const parts = triplet.trim().split(/\s+/).map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return "";
  return (
    "#" +
    parts
      .map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

/*
 * The ramps are defined on [data-chapter="n"] selectors, so they only resolve
 * on an element carrying that attribute. Mount one hidden probe per chapter,
 * read the computed values, then remove it — this keeps the swatches sourced
 * from brand.css rather than duplicating the hexes here.
 */
function readChapterRamps() {
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:absolute;visibility:hidden;pointer-events:none";
  document.body.appendChild(probe);

  const ramps = CHAPTERS.map((c) => {
    probe.dataset.chapter = String(c.n);
    const cs = getComputedStyle(probe);
    return {
      ...c,
      steps: RAMP_STEPS.map((s) => ({
        ...s,
        hex: tripletToHex(cs.getPropertyValue(s.token)),
      })),
    };
  });

  probe.remove();
  return ramps;
}

onMounted(() => {
  const cs = getComputedStyle(document.documentElement);
  const out = {};
  for (const g of GROUPS) {
    for (const s of g.swatches) {
      out[s.token] = tripletToHex(cs.getPropertyValue(s.token));
    }
  }
  hexValues.value = out;
  chapterRamps.value = readChapterRamps();
});
</script>

<template>
  <div class="colours">
    <header class="sec-head">
      <p class="t-label sec-eyebrow">Foundations</p>
      <h2 class="t-h2">Colours</h2>
      <p class="t-body-sm sec-note">
        Tokens live in <code>brand.css</code> as space-separated RGB triplets so
        Tailwind's <code>&lt;alpha-value&gt;</code> works. Swatches read live
        from the CSS variables.
      </p>
    </header>

    <section v-for="g in GROUPS" :key="g.title" class="group">
      <p class="t-label group-eyebrow">{{ g.title }}</p>
      <p class="t-body-sm group-note">{{ g.note }}</p>
      <div class="swatch-grid">
        <div v-for="s in g.swatches" :key="s.token" class="swatch">
          <div
            class="swatch-chip"
            :style="{ background: `rgb(var(${s.token}))` }"
          />
          <div class="swatch-meta">
            <span class="t-body-sm swatch-name">{{ s.name }}</span>
            <code class="swatch-hex">{{ hexValues[s.token] || "…" }}</code>
            <span class="t-label swatch-token">{{ s.token }}</span>
            <span class="swatch-use">{{ s.use }}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="group">
      <p class="t-label group-eyebrow">Chapter ramps</p>
      <p class="t-body-sm group-note">
        Each chapter carries its own identity colour, set via
        <code>data-chapter</code> on <code>&lt;html&gt;</code>. Four steps per
        chapter: primary, deep, soft, pale. The router sets the attribute from
        the chapter route's number; outside chapters 1–5 the neutral
        <code>:root</code> ramp applies.
      </p>

      <div class="ramps">
        <!-- data-chapter must sit on the element itself: the swatch backgrounds
             resolve --color-chapter-* through their own ancestry, so without it
             every ramp would fall back to the :root default. -->
        <div
          v-for="c in chapterRamps"
          :key="c.n"
          class="ramp"
          :data-chapter="c.n"
        >
          <p class="t-label ramp-head">
            <span class="ramp-num">Chapter {{ c.n }}</span>
            <span class="ramp-name">{{ c.name }}</span>
          </p>
          <div class="ramp-bar">
            <div
              v-for="s in c.steps"
              :key="s.token"
              class="ramp-step"
              :class="{ 'ramp-step--lead': s.label === 'primary' }"
              :style="{ background: `rgb(var(${s.token}))` }"
              :title="`${s.token} — ${s.use}`"
            />
          </div>
          <dl class="ramp-legend">
            <div v-for="s in c.steps" :key="s.token" class="ramp-legend-row">
              <dt class="t-label">{{ s.label }}</dt>
              <dd>
                <code class="swatch-hex">{{ s.hex || "…" }}</code>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.sec-head {
  margin-bottom: 1.875rem;
}
.sec-eyebrow,
.group-eyebrow {
  color: rgb(var(--color-accent));
  margin-bottom: 0.46875rem;
}
.sec-note,
.group-note {
  color: rgb(var(--color-mute));
  max-width: 62ch;
  margin-top: 0.46875rem;
}
.group {
  margin-bottom: 2.1875rem;
}
.group-eyebrow {
  padding-bottom: 0.46875rem;
  border-bottom: 1px solid rgb(var(--color-line));
}
.group-note {
  margin-bottom: 0.9375rem;
}
.swatch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.9375rem;
}
.swatch {
  display: flex;
  flex-direction: column;
  gap: 0.46875rem;
}
.swatch-chip {
  height: 88px;
  border-radius: 10px;
  border: 1px solid rgb(var(--color-line));
}
.swatch-meta {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}
.swatch-name {
  font-weight: 600;
}
.swatch-hex {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: rgb(var(--color-ink));
}
.swatch-token {
  color: rgb(var(--color-accent));
}
.swatch-use {
  font-size: 0.75rem;
  color: rgb(var(--color-mute));
}

/* Chapter ramps */
.ramps {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1.25rem;
}
.ramp-head {
  display: flex;
  flex-direction: column;
  gap: 0.09375rem;
  padding-bottom: 0.375rem;
  border-bottom: 1px solid rgb(var(--color-line));
  margin-bottom: 0.5rem;
}
.ramp-num {
  color: rgb(var(--color-mute));
}
.ramp-name {
  color: rgb(var(--color-ink));
  font-weight: 600;
}
/* The lead (primary) step is widest, mirroring the Figma board's proportions. */
.ramp-bar {
  display: grid;
  grid-template-columns: 2.6fr 1fr 1fr 1fr;
  height: 76px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgb(var(--color-line));
}
.ramp-legend {
  display: flex;
  justify-content: space-between;
  gap: 0.25rem;
  margin-top: 0.4375rem;
}
.ramp-legend-row {
  display: flex;
  flex-direction: column;
  gap: 0.0625rem;
  min-width: 0;
}
.ramp-legend-row dt {
  color: rgb(var(--color-mute));
}
.ramp-legend-row dd {
  margin: 0;
}
.ramp-legend .swatch-hex {
  font-size: 0.625rem;
}
</style>
