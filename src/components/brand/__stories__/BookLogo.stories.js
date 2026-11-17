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
  args: { mark: false, height: 44 },
  argTypes: {
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
    template: `<BookLogo :mark="args.mark" :style="{ '--logo-h': args.height + 'px' }" />`,
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
