<script setup>
/*
 * Further reading: the few things the authors would start with, set at the
 * head of the chapter's back matter, above its references (OPENBRAIN-179).
 * It used to come last, below the whole reference list.
 */
import { computed } from "vue";
import { jumpToReference } from "@/composables/useReferenceJump";

const props = defineProps({
  content: { type: Object, required: true },
});

// Authored per-chapter data is authoritative. In particular, a History
// chapter must never inherit the old hardcoded retinal/Webvision paragraph.
const paragraphs = computed(() => props.content?.paragraphs || []);
function safeLink(url) {
  return typeof url === "string" && /^(https?:\/\/|#)/i.test(url) ? url : null;
}
// The authors' title, without the colon it was written with as a lead-in.
const title = computed(() =>
  String(props.content?.title || "Further reading").replace(/\s*:\s*$/, "")
);

// A link to an entry of the reference list (#ref-N) lands it mid-screen,
// flashed, with a way back; when the list isn't on the page the address
// still works as a plain link.
async function follow(event, url) {
  const m = /^#ref-(\d+)$/.exec(url || "");
  if (!m || event.metaKey || event.ctrlKey || event.shiftKey) return;
  const origin = event.currentTarget;
  event.preventDefault();
  if (!(await jumpToReference(Number(m[1]), origin)))
    window.location.hash = url;
}
</script>

<template>
  <section
    v-if="paragraphs.length"
    id="further-reading"
    class="further-reading"
    aria-labelledby="further-reading-title"
  >
    <div class="further-reading__grid">
      <h4 id="further-reading-title" class="further-reading__title">
        {{ title }}
      </h4>
      <div class="further-reading__body">
        <div
          v-for="(paragraph, index) in paragraphs"
          :key="paragraph.id || index"
          class="further-reading__group"
        >
          <p v-if="paragraph.title" class="further-reading__lead">
            {{ paragraph.title }}
          </p>
          <ul v-if="paragraph.links?.length" class="reading-links" role="list">
            <li v-for="(link, linkIndex) in paragraph.links" :key="linkIndex">
              <a
                v-if="safeLink(link.url)"
                :href="safeLink(link.url)"
                :target="link.url.startsWith('#') ? undefined : '_blank'"
                :rel="
                  link.url.startsWith('#') ? undefined : 'noopener noreferrer'
                "
                @click="follow($event, link.url)"
                >{{ link.text || link.url }}</a
              >
              <span v-else>{{ link.text }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.further-reading {
  container-type: inline-size;
  width: 100%;
  /* The reader gives every <section> a screen's height and 15rem below
     (index.css): this is a short note, not a section of the chapter. */
  min-height: 0;
  padding: 0 0 clamp(2.5rem, 5cqw, 4rem);
  color: rgb(var(--color-ink));
  font-family: var(--font-body);
  letter-spacing: 0.1px;
  hyphens: manual;
}
.further-reading__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1rem 2rem;
}
.further-reading__title {
  margin: 0;
  padding: 0.25rem 0 0;
  font-family: var(--font-mono);
  font-size: var(--ui-size-12);
  font-weight: 600;
  line-height: 1.5;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.further-reading__body {
  display: grid;
  gap: 1.5rem;
}
.further-reading__group {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.75rem 2.5rem;
  align-items: start;
}
.further-reading__lead {
  margin: 0;
  padding: 0;
  max-width: 28rem;
  font-size: var(--type-body-sm-size);
  line-height: 1.5;
  color: rgb(var(--color-ink) / 0.78);
}
.reading-links {
  display: grid;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}
.reading-links li {
  padding: 0.625rem 0;
  border-top: 1px solid rgb(var(--color-line));
  font-size: var(--type-body-sm-size);
  line-height: 1.4;
}
.reading-links li:last-child {
  border-bottom: 1px solid rgb(var(--color-line));
}
a,
a:visited {
  color: rgb(var(--color-accent));
  text-decoration: underline;
  text-underline-offset: 0.2em;
  overflow-wrap: anywhere;
}
a:focus-visible {
  outline: 2px solid rgb(var(--color-accent));
  outline-offset: 2px;
}

@container (min-width: 46rem) {
  .further-reading__grid {
    grid-template-columns: minmax(0, 1fr) minmax(0, 3fr);
  }
}
@container (min-width: 74rem) {
  /* The lead and its links side by side, on the reference list's columns. */
  .further-reading__grid {
    grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
  }
  .further-reading__group {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
