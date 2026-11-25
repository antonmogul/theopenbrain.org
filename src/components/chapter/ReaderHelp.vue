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
 * Signed in, it is also where Info, Notebook and Chat are (OPENBRAIN-197).
 * They were three words in the top bar beside the "?"; Stuart, 11 Nov:
 * "replace 'info', 'notebook', and 'chat' on the top right with a question
 * mark, which all accomplishes the same thing." With `tools` the panel
 * opens with them, each a button that asks ReaderTopBar (`tool`) to open
 * that tab of the reader's floating panel; the one showing is marked.
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

defineProps({
  /* Signed in: offer Info, Notebook and Chat. */
  tools: { type: Boolean, default: false },
  /* The tab the reader's panel is showing: "info" | "notebook" | "chat". */
  activeTool: { type: String, default: null },
});
defineEmits(["close", "tool"]);

const TOOLS = [
  {
    key: "info",
    title: "Info",
    body: "This chapter: its sections, your progress, the references.",
  },
  {
    key: "notebook",
    title: "Notebook",
    body: "Your highlights and notes in this chapter.",
  },
  {
    key: "chat",
    title: "Chat",
    body: "Ask the tutor about what you are reading.",
  },
];

const WAYS = [
  {
    title: "Figures follow the text",
    body: "Scroll, and the figure changes to match the paragraph you are reading.",
  },
  {
    title: "Find your way",
    body: "The strip along the bottom is the whole chapter: press it to jump anywhere. Search the chapter from the top bar (press /). The book, top left, lists every chapter and section.",
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

    <div
      v-if="tools"
      class="reader-help__tools"
      data-testid="reader-help-tools"
    >
      <h3 id="reader-help-tools-title" class="reader-help__label">
        Your tools
      </h3>
      <ul
        class="reader-help__tool-list"
        aria-labelledby="reader-help-tools-title"
      >
        <li v-for="tool in TOOLS" :key="tool.key">
          <button
            type="button"
            class="reader-help__tool"
            :class="{ 'is-active': activeTool === tool.key }"
            aria-controls="reader-sidebar"
            :aria-current="activeTool === tool.key ? 'true' : undefined"
            :data-tool="tool.key"
            @click="$emit('tool', tool.key)"
          >
            <span class="reader-help__tool-title">{{ tool.title }}</span>
            <span class="reader-help__tool-body">{{ tool.body }}</span>
            <svg
              class="reader-help__tool-go"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </li>
      </ul>
    </div>

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
/* Info / Notebook / Chat: three rows, each a 44px target or taller. */
.reader-help__tools {
  padding: 0.75rem 0.5rem 0.5rem;
  border-bottom: 1px solid rgb(var(--color-line));
}
.reader-help__label {
  margin: 0;
  padding: 0 0.625rem 0.375rem;
  font-family: var(--font-mono);
  font-size: var(--ui-size-10);
  font-weight: 400;
  letter-spacing: 0.1em;
  line-height: 1.4;
  text-transform: uppercase;
  color: rgb(var(--color-mute));
}
.reader-help__tool-list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.reader-help__tool {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  column-gap: 0.75rem;
  width: 100%;
  min-height: 44px;
  padding: 0.5rem 0.625rem;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: rgb(var(--color-ink));
  text-align: left;
  cursor: pointer;
  transition: background 0.12s ease;
}
.reader-help__tool:hover {
  background: rgb(var(--color-ink) / 0.05);
}
.reader-help__tool.is-active {
  background: rgb(var(--color-ink) / 0.08);
}
.reader-help__tool:focus-visible {
  outline: 3px solid rgb(var(--color-accent));
  outline-offset: -3px;
}
.reader-help__tool-title {
  grid-column: 1;
  font-family: var(--font-ui);
  font-size: var(--ui-size-14);
  font-weight: 600;
  line-height: 1.3;
}
.reader-help__tool-body {
  grid-column: 1;
  font-family: var(--font-ui);
  font-size: var(--ui-size-13);
  line-height: 1.4;
  color: rgb(var(--color-mute));
}
.reader-help__tool-go {
  grid-column: 2;
  grid-row: 1 / span 2;
  color: rgb(var(--color-mute));
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
