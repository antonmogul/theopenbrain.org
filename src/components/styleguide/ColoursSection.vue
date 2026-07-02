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
      { token: "--color-accent", name: "accent", use: "Brand primary / interactive" },
      { token: "--color-complete", name: "complete", use: "Success / takeaway (teal)" },
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

// Resolve each token's RGB triplet → hex, read live from the document root.
const hexValues = ref({});

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

onMounted(() => {
  const cs = getComputedStyle(document.documentElement);
  const out = {};
  for (const g of GROUPS) {
    for (const s of g.swatches) {
      out[s.token] = tripletToHex(cs.getPropertyValue(s.token));
    }
  }
  hexValues.value = out;
});
</script>

<template>
  <div class="colours">
    <header class="sec-head">
      <p class="t-label sec-eyebrow">Foundations</p>
      <h2 class="t-h2">Colours</h2>
      <p class="t-body-sm sec-note">
        Tokens live in <code>brand.css</code> as space-separated RGB triplets so
        Tailwind's <code>&lt;alpha-value&gt;</code> works. Swatches read live from
        the CSS variables.
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
  </div>
</template>

<style scoped>
.sec-head {
  margin-bottom: 3rem;
}
.sec-eyebrow,
.group-eyebrow {
  color: rgb(var(--color-accent));
  margin-bottom: 0.75rem;
}
.sec-note,
.group-note {
  color: rgb(var(--color-mute));
  max-width: 62ch;
  margin-top: 0.75rem;
}
.group {
  margin-bottom: 3.5rem;
}
.group-eyebrow {
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgb(var(--color-line));
}
.group-note {
  margin-bottom: 1.5rem;
}
.swatch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1.5rem;
}
.swatch {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.swatch-chip {
  height: 88px;
  border-radius: 10px;
  border: 1px solid rgb(var(--color-line));
}
.swatch-meta {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.swatch-name {
  font-weight: 600;
}
.swatch-hex {
  font-family: var(--font-mono);
  font-size: 1.2rem;
  color: rgb(var(--color-ink));
}
.swatch-token {
  color: rgb(var(--color-accent));
}
.swatch-use {
  font-size: 1.2rem;
  color: rgb(var(--color-mute));
}
</style>
