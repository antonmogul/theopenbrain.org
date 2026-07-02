<script setup>
/*
 * Type foundation — exercises the .t-* role classes (sizes from --type-* tokens
 * in brand.css). Single source of truth for sizes is brand.css; this just
 * renders the roles at true size plus families, weights and the legacy mapping.
 */
const scale = [
  { cls: "t-display", role: "Display / hero", px: "112px", family: "body", sample: "16" },
  { cls: "t-h1", role: "Chapter title (h1)", px: "84px", family: "body", sample: "The Retina" },
  { cls: "t-h2", role: "Section heading (h2)", px: "63px", family: "body", sample: "How the eye sees" },
  { cls: "t-h3", role: "Subsection (h3)", px: "47px", family: "body", sample: "Rods and cones" },
  { cls: "t-subhead", role: "Subhead / lead-in", px: "36px", family: "body", sample: "A layered sheet of neurons" },
  { cls: "t-body-lg", role: "Standfirst / intro", px: "27px", family: "body", sample: "Light enters the eye and lands on the retina, where the work of seeing begins." },
  { cls: "t-body", role: "Body — base reading", px: "20px × reading-size", family: "body", sample: "The retina is not a passive screen. It is the first stage of vision, compressing and sharpening the signal before it ever reaches the brain." },
  { cls: "t-body-sm", role: "Secondary / table cell", px: "17px", family: "body", sample: "Ada Lovelace · enrolled 3 Jun · 64% complete" },
  { cls: "t-caption", role: "Caption / footnote (mono)", px: "13px", family: "mono", sample: "Figure 1 — a schematic cross-section of the retina." },
  { cls: "t-label", role: "Label / eyebrow / badge (mono)", px: "11px", family: "mono", sample: "Chapter 01 · updated 2d ago" },
];

const families = [
  { cls: "font-serif", token: "--font-body", desc: "Body / headings — IBM Plex Sans" },
  { cls: "font-mono", token: "--font-mono", desc: "Captions, labels, code — IBM Plex Mono" },
];

const weights = [
  { cls: "font-normal", label: "400 Regular — body" },
  { cls: "font-medium", label: "500 Medium — labels" },
  { cls: "font-semibold", label: "600 Semibold — h2/h3" },
  { cls: "font-bold", label: "700 Bold — h1/display" },
];

const legacy = [
  { cls: "text-biggest", maps: "→ t-display", px: "160px" },
  { cls: "text-h2", maps: "→ t-h2", px: "48px" },
  { cls: "text-h3", maps: "→ t-h3", px: "30px" },
  { cls: "text-base", maps: "→ t-body  (⚠ collides w/ Tailwind name)", px: "20px" },
  { cls: "text-medium", maps: "→ t-body-sm", px: "16px" },
  { cls: "text-small", maps: "→ t-caption", px: "13.5px" },
  { cls: "text-smaller", maps: "→ t-label", px: "11px" },
];
</script>

<template>
  <div class="type">
    <header class="sec-head">
      <p class="t-label sec-eyebrow">Foundations</p>
      <h2 class="t-h2">Typography</h2>
      <p class="t-body-sm sec-note">
        One unified modular scale · Perfect Fourth (1.333) · base 20px · IBM Plex.
        Apply the <code>.t-*</code> role classes — never raw Tailwind
        <code>text-*</code> or the legacy <code>.text-base</code> scale.
      </p>
    </header>

    <!-- Scale -->
    <section class="block">
      <p class="t-label block-eyebrow">The scale</p>
      <div v-for="row in scale" :key="row.cls" class="row">
        <div class="meta">
          <code class="cls">.{{ row.cls }}</code>
          <span class="t-body-sm role">{{ row.role }}</span>
          <span class="t-label px">{{ row.px }} · {{ row.family }}</span>
        </div>
        <div class="sample" :class="row.cls">{{ row.sample }}</div>
      </div>
    </section>

    <!-- Families -->
    <section class="block">
      <p class="t-label block-eyebrow">Families</p>
      <div v-for="f in families" :key="f.cls" class="row">
        <div class="meta">
          <code class="cls">{{ f.token }}</code>
          <span class="t-body-sm role">{{ f.desc }}</span>
        </div>
        <div class="sample sample--fam" :class="f.cls">
          The quick brown fox jumps over 0123456789
        </div>
      </div>
    </section>

    <!-- Weights -->
    <section class="block">
      <p class="t-label block-eyebrow">Weights</p>
      <div class="weights">
        <div v-for="w in weights" :key="w.cls" class="weight">
          <span class="weight-glyph" :class="w.cls">Ag</span>
          <span class="t-label">{{ w.label }}</span>
        </div>
      </div>
    </section>

    <!-- Legacy -->
    <section class="block block--legacy">
      <p class="t-label block-eyebrow">Legacy scale — migrating away</p>
      <p class="t-body-sm legacy-note">
        The book's old <code>index.css</code> classes and where each maps.
        <code>.text-base</code> retires first — it shadows Tailwind's utility.
      </p>
      <div v-for="row in legacy" :key="row.cls" class="legacy-row">
        <code class="cls">.{{ row.cls }}</code>
        <span class="legacy-px">{{ row.px }}</span>
        <span class="legacy-map">{{ row.maps }}</span>
      </div>
    </section>
  </div>
</template>

<style scoped>
.sec-head {
  margin-bottom: 3rem;
}
.sec-eyebrow,
.block-eyebrow {
  color: rgb(var(--color-accent));
  margin-bottom: 0.75rem;
}
.sec-note {
  color: rgb(var(--color-mute));
  max-width: 62ch;
  margin-top: 0.75rem;
}
.block {
  margin-bottom: 3.5rem;
}
.block-eyebrow {
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgb(var(--color-line));
  margin-bottom: 1.5rem;
}
.row {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 2rem;
  align-items: baseline;
  padding: 1.5rem 0;
  border-bottom: 1px solid rgb(var(--color-line) / 0.6);
}
.meta {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.cls {
  font-family: var(--font-mono);
  font-size: 1.2rem;
  color: rgb(var(--color-accent));
}
.role {
  font-weight: 500;
}
.px {
  color: rgb(var(--color-mute));
}
.sample {
  overflow-wrap: anywhere;
}
.sample--fam {
  font-size: 2.4rem;
}
.weights {
  display: flex;
  gap: 3rem;
  flex-wrap: wrap;
}
.weight {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}
.weight-glyph {
  font-size: 4.8rem;
  font-family: var(--font-body);
}
.block--legacy {
  opacity: 0.85;
}
.legacy-note {
  color: rgb(var(--color-mute));
  margin-bottom: 1.5rem;
  max-width: 62ch;
}
.legacy-row {
  display: grid;
  grid-template-columns: 200px 100px 1fr;
  gap: 1.5rem;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgb(var(--color-line) / 0.5);
  font-family: var(--font-mono);
  font-size: 1.3rem;
}
.legacy-px {
  color: rgb(var(--color-mute));
}
.legacy-map {
  color: rgb(var(--color-accent));
}
</style>
