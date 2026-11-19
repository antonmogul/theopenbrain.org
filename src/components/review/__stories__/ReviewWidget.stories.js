/*
 * Chapter/Review/ReviewWidget — reviewers' notes on the chapter
 * (OPENBRAIN-204): the Feedback button, the panel (a bottom sheet on a
 * phone), "My notes". Notes go to a transport that stays in the page.
 */
import {
  REVIEW_KEYS,
  reloadReviewState,
  setReviewTransport,
} from "@/composables/useReviewFeedback";
import ReviewWidget from "../ReviewWidget.vue";
import { NOTES, offlineTransport } from "./reviewFixtures";

function seed({ identity = null, notes = [] } = {}) {
  try {
    if (identity)
      localStorage.setItem(REVIEW_KEYS.identity, JSON.stringify(identity));
    else localStorage.removeItem(REVIEW_KEYS.identity);
    localStorage.setItem(REVIEW_KEYS.queue, JSON.stringify(notes));
  } catch {
    // private mode
  }
  reloadReviewState();
  setReviewTransport(offlineTransport);
}

const PAGE = `<main id="text" style="max-width:640px;margin:0 auto;padding:24px;font-family:var(--font-body);">
  <section class="reader-section" data-section-slug="where-is-my-mind" style="min-height:0;padding:0;">
    <h2 class="T">Where is my mind?</h2>
    <div class="P" data-paragraph-id="11111111-0000-4000-8000-000000000002">
      Select some of these words before opening the panel: the note picks
      them up as the passage it is about.
    </div>
  </section>
</main>`;

export default {
  title: "Chapter/Review/ReviewWidget",
  component: ReviewWidget,
  parameters: { layout: "fullscreen" },
  args: {
    chapterSlug: "foundations-of-neuroscience",
    force: true,
    startOpen: false,
    figureRecords: [],
  },
  argTypes: {
    chapterSlug: { control: "text" },
    force: { control: "boolean" },
    startOpen: { control: "boolean" },
  },
  render: (args, { parameters }) => ({
    components: { ReviewWidget },
    setup() {
      seed(parameters.reviewSeed);
      return { args, page: PAGE };
    },
    template: `<div style="min-height:100vh;background:rgb(var(--color-bg));">
      <div v-html="page"></div>
      <ReviewWidget v-bind="args" />
    </div>`,
  }),
};

export const FirstVisit = {
  args: { startOpen: true },
};

export const Closed = {
  parameters: {
    reviewSeed: {
      identity: { name: "Stuart Trenholm", role: "author" },
      notes: NOTES,
    },
  },
};

export const Writing = {
  args: { startOpen: true },
  parameters: {
    reviewSeed: { identity: { name: "Stuart Trenholm", role: "author" } },
  },
};

export const Phone = {
  args: { startOpen: true },
  globals: { viewport: { value: "phone" } },
  parameters: {
    reviewSeed: { identity: { name: "Arjun", role: "author" }, notes: NOTES },
  },
};

export const AwaitingYourCheck = {
  parameters: {
    reviewSeed: {
      identity: { name: "Stuart", role: "author" },
      notes: [NOTES[0]],
    },
  },
};
