<script setup>
/*
 * The reader's help (OPENBRAIN-189): what the "?" in the top bar opens.
 *
 * The "?" used to sit on the chapter cover and open the signed-in Info
 * panel, so it scrolled away with the cover and did nothing for a reader
 * who was not signed in. This is its own small panel, the same for
 * everyone: how the book reads, in three lines, and the reader's one
 * display setting, animations (MotionSwitch).
 *
 * ReaderTopBar places it, opens it and returns focus; this is the content
 * and the dialog's name. It is not modal: nothing behind it is inert, and
 * Escape, the close button or a press outside closes it.
 *
 * Its root is a <div>, not a <section>: the reader's global
 * `.chapter-reader section` rule (index.css) gives every section a screen
 * of height. And one root, no comment beside it, so the class and the
 * listeners ReaderTopBar puts on it fall through.
 */
import MotionSwitch from "@/components/settings/MotionSwitch.vue";
import CloseIcon from "@/icons/custom/CloseIcon.vue";

defineEmits(["close"]);

const WAYS = [
  {
    title: "Figures follow the text",
    body: "Scroll, and the figure changes to match the paragraph you are reading.",
  },
  {
    title: "Find your way",
    body: "The strip along the bottom is the whole chapter: press it to jump anywhere. The menu button, top left, lists every chapter and section.",
  },
  {
    title: "Mark it up",
    body: "Sign in, then select any text to highlight it, add a note or tag it. Your place in each chapter is kept for you.",
  },
];
</script>

<template>
  <div
    id="reader-help"
    class="reader-help"
    role="dialog"
    aria-labelledby="reader-help-title"
    tabindex="-1"
    data-testid="reader-help"
  >
    <header class="reader-help__head">
      <h2 id="reader-help-title" class="reader-help__title">
        How to read this book
      </h2>
      <button
        type="button"
        class="reader-help__close"
        aria-label="Close help"
        @click="$emit('close')"
      >
        <CloseIcon :width="16" :height="16" />
      </button>
    </header>

    <ol class="reader-help__ways">
      <li v-for="(way, i) in WAYS" :key="way.title" class="reader-help__way">
        <span class="reader-help__num" aria-hidden="true">{{ i + 1 }}</span>
        <div>
          <h3 class="reader-help__way-title">{{ way.title }}</h3>
          <p class="reader-help__way-body">{{ way.body }}</p>
        </div>
      </li>
    </ol>

    <div class="reader-help__setting">
      <MotionSwitch />
    </div>
  </div>
</template>

<style scoped>
.reader-help {
  background: rgb(var(--color-paper));
  color: rgb(var(--color-ink));
  border: 1px solid rgb(var(--color-line));
  border-radius: var(--radius-control);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.14);
  overflow-y: auto;
  overscroll-behavior: contain;
  /* The page hyphenates (index.css); a 23rem panel of UI copy should not. */
  hyphens: manual;
  -webkit-hyphens: manual;
}
/* Focus lands on the panel itself when it opens, so a screen reader starts
   at its name; the panel is not a control and shows no ring for it. */
.reader-help:focus {
  outline: none;
}
.reader-help__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.25rem 0.25rem 0.25rem 1.125rem;
  border-bottom: 1px solid rgb(var(--color-line));
}
.reader-help__title {
  margin: 0;
  padding: 0;
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  font-weight: 400;
  letter-spacing: 0.1em;
  line-height: 1.4;
  text-transform: uppercase;
  color: rgb(var(--color-ink));
}
.reader-help__close {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  color: rgb(var(--color-mute));
  cursor: pointer;
  transition:
    color 0.12s ease,
    background 0.12s ease;
}
.reader-help__close:hover {
  color: rgb(var(--color-ink));
  background: rgb(var(--color-ink) / 0.05);
}
.reader-help__close:focus-visible {
  outline: 3px solid rgb(var(--color-accent));
  outline-offset: -3px;
}
.reader-help__ways {
  margin: 0;
  padding: 0.375rem 1.125rem 0;
  list-style: none;
}
.reader-help__way {
  display: grid;
  grid-template-columns: 1.25rem 1fr;
  gap: 0.625rem;
  padding: 0.75rem 0;
}
.reader-help__way + .reader-help__way {
  border-top: 1px solid rgb(var(--color-line));
}
.reader-help__num {
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  line-height: 1.5;
  color: rgb(var(--color-mute));
}
.reader-help__way-title {
  margin: 0;
  padding: 0;
  font-family: var(--font-ui);
  font-size: var(--ui-size-14);
  font-weight: 600;
  line-height: 1.3;
  color: rgb(var(--color-ink));
}
.reader-help__way-body {
  margin: 0.25rem 0 0;
  font-family: var(--font-ui);
  font-size: var(--ui-size-13);
  line-height: 1.45;
  color: rgb(var(--color-mute));
}
.reader-help__setting {
  margin-top: 0.375rem;
  padding: 1rem 1.125rem 1.125rem;
  border-top: 1px solid rgb(var(--color-line));
}
</style>
