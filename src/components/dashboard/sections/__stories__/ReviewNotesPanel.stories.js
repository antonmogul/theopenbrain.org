/*
 * Dashboard/Sections/ReviewNotesPanel: Feedback → Review notes
 * (OPENBRAIN-203). The notes authors and designers leave in a chapter with
 * the review widget, chapter → section, each with its place, "Open in
 * chapter", and a status + reply form. Filters and saves work in memory.
 */
import { computed, reactive } from "vue";
import ReviewNotesPanel from "../ReviewNotesPanel.vue";
import {
  groupReviewNotes,
  matchesReviewFilters,
} from "@/helper/reviewNotes.mjs";
import {
  REVIEW_MODULES,
  REVIEW_NOTES,
  REVIEW_REPLIES,
  REVIEW_SECTIONS,
} from "@/stories/reviewNoteFixtures.js";

function live(args) {
  const state = reactive({
    notes: args.notes.map((n) => ({ ...n })),
    filters: { ...args.filters },
    savingIds: [],
  });
  // As useReviewNotes: filters pick notes, replies follow their note.
  const filtered = computed(() =>
    state.notes.filter(
      (n) => !n.parent_id && matchesReviewFilters(n, state.filters)
    )
  );
  const shown = computed(() => {
    const ids = new Set(filtered.value.map((n) => n.id));
    return [
      ...filtered.value,
      ...state.notes.filter((n) => n.parent_id && ids.has(n.parent_id)),
    ];
  });
  return {
    state,
    groups: computed(() =>
      groupReviewNotes(shown.value, REVIEW_MODULES, REVIEW_SECTIONS)
    ),
    count: computed(() => filtered.value.length),
    open: computed(
      () =>
        state.notes.filter(
          (n) => !n.parent_id && matchesReviewFilters(n, { status: "open" })
        ).length
    ),
    chapters: REVIEW_MODULES.map((m) => ({ slug: m.slug, title: m.title })),
    save({ id, status, reply }) {
      state.notes = state.notes.map((n) =>
        n.id === id
          ? {
              ...n,
              status,
              reply: reply.trim() || null,
              replied_at: new Date().toISOString(),
            }
          : n
      );
    },
  };
}

export default {
  title: "Dashboard/Sections/ReviewNotesPanel",
  component: ReviewNotesPanel,
  parameters: { layout: "padded" },
  args: {
    notes: [...REVIEW_NOTES, ...REVIEW_REPLIES],
    filters: { chapter: "all", type: "all", status: "all" },
    loading: false,
    error: null,
    missingTable: false,
    accessDenied: false,
  },
  render: (args) => ({
    components: { ReviewNotesPanel },
    setup: () => ({ args, ...live(args) }),
    template: `<ReviewNotesPanel
      :groups="groups" :chapters="chapters" :filters="state.filters"
      :filtered-count="count" :open-count="open"
      :loading="args.loading" :error="args.error"
      :missing-table="args.missingTable" :access-denied="args.accessDenied"
      :saving-ids="state.savingIds"
      @filter-change="state.filters = $event" @save="save" />`,
  }),
};

/**
 * Every note: History first (chapter 1), then the Retina by section. Sonia's
 * and Stuart's replies sit under Maura's figure note, oldest first.
 */
export const Default = {};

/** The dashboard's default: only what still needs someone. */
export const OpenOnly = {
  args: { filters: { chapter: "all", type: "all", status: "open" } },
};

export const Empty = { args: { notes: [] } };
export const Loading = { args: { loading: true } };
export const LoadError = {
  name: "Error",
  args: { error: "Review notes could not be loaded. Please try again." },
};

/** The migration isn't pushed yet: no retry, a push instead. */
export const MigrationMissing = {
  args: {
    missingTable: true,
    error:
      "Review notes need a database update: run `supabase db push` for 20261118150000_review_feedback.sql.",
  },
};

export const AccessDenied = { args: { accessDenied: true } };

export const Mobile = {
  globals: { viewport: { value: "phone", isRotated: false } },
};
