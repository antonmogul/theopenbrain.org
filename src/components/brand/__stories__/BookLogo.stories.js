/*
 * Foundations/Brand/BookLogo — the book's logo (OPENBRAIN-197): the open
 * book with the brain in it and "the open brain .org", the designers' file
 * (public/publicAssets/images/logo.svg) inlined so it takes the ink of the
 * ground it is on. The reader's top bar and the nav drawer use it as the
 * link home; `mark` is the book alone, which the bar shows below 640px.
 */
import BookLogo from "../BookLogo.vue";

export default {
  title: "Foundations/Brand/BookLogo",
  component: BookLogo,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: { mark: false, icon: false, height: 44 },
  argTypes: {
    icon: {
      control: "boolean",
      description:
        "A line icon: strokes in screen pixels, the brain's a little heavier.",
    },
    mark: {
      control: "boolean",
      description: "The book and brain alone, without the words.",
    },
    height: {
      control: { type: "range", min: 24, max: 160, step: 4 },
      description: "Story-only: the `--logo-h` custom property, in px.",
    },
  },
  render: (args) => ({
    components: { BookLogo },
    setup: () => ({ args }),
    template: `<BookLogo :mark="args.mark" :icon="args.icon" :style="{ '--logo-h': args.height + 'px' }" />`,
  }),
};

/** As in the reader's top bar: 40 to 44px tall. */
export const Default = {};

/** The book alone: the bar on a phone. */
export const Mark = { args: { mark: true } };

/** Large, as a title block would set it. */
export const Large = { args: { height: 120 } };

/** On the chapter's dark surface it takes the light ink: one artwork. */
export const OnDark = {
  render: (args) => ({
    components: { BookLogo },
    setup: () => ({ args }),
    template: `
      <div style="display:inline-block; padding:24px; background:var(--color-dark-surface, #1c1c1c); color:#fff;">
        <BookLogo :mark="args.mark" :style="{ '--logo-h': args.height + 'px' }" />
      </div>`,
  }),
  args: { height: 64 },
};

/**
 * The mark as a line icon (OPENBRAIN-92), as the reader's top bar draws it:
 * 32px tall beside the search icon. The upper row is the icon, the lower
 * the artwork's own hairline at the same size. The book's lines are
 * 0.85px and the brain's 1.25px, the weight of the icons beside it.
 */
export const Icon = {
  render: () => ({
    components: { BookLogo },
    template: `
      <div style="display:grid; gap:16px; width:max-content; padding:16px 20px; background:rgb(var(--color-topbar, 19 19 19)); color:#fff;">
        <div v-for="icon in [true, false]" :key="icon" style="display:flex; align-items:center; gap:20px;">
          <BookLogo mark :icon="icon" style="--logo-h:32px" />
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" />
          </svg>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3.5 11 12 4l8.5 7" /><path d="M5.5 9.5V20h4.75v-5.5h3.5V20h4.75V9.5" />
          </svg>
        </div>
      </div>`,
  }),
};
