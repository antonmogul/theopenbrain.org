/*
 * What a chapter gives its reader to test themselves with (OPENBRAIN-179):
 * its published quiz, if it has one, and how many flashcards it has. The
 * chapter's close (EndOfChapterCallout) offers only what is really there:
 * the old "QUIZ" link went to a route that does not exist, and the quiz
 * route takes a quiz's id, which nothing looked up.
 *
 * Both are plain GETs a signed-out reader may make (RLS: quizzes and cards
 * of a published chapter are readable). A failed request leaves nothing to
 * offer rather than a link that leads nowhere.
 */
import { ref, toValue, watch } from "vue";
import { get } from "@/services/api/client";

/**
 * A quiz row as the close shows it. Its questions come embedded, as a count
 * (`quiz_questions(count)`: [{ count }]) or as the rows themselves. Exported
 * for tests.
 */
export function quizSummary(row) {
  if (!row?.id) return null;
  const embedded = Array.isArray(row.quiz_questions) ? row.quiz_questions : [];
  const questions =
    embedded.length === 1 && "count" in (embedded[0] || {})
      ? Number(embedded[0].count)
      : embedded.length;
  const minutes = Number(row.time_limit_minutes);
  return {
    id: row.id,
    title: row.title || "",
    questionCount: Number.isFinite(questions) && questions > 0 ? questions : 0,
    minutes: Number.isFinite(minutes) && minutes > 0 ? minutes : 0,
  };
}

/**
 * @param {import("vue").MaybeRefOrGetter<string|null>} moduleId
 * @returns {{ quiz: import("vue").Ref<object|null>, flashcardCount: import("vue").Ref<number> }}
 */
export function useChapterStudyTools(moduleId) {
  const quiz = ref(null);
  const flashcardCount = ref(0);

  watch(
    () => toValue(moduleId),
    async (id) => {
      quiz.value = null;
      flashcardCount.value = 0;
      if (!id) return;
      const current = () => toValue(moduleId) === id;
      const [quizzes, cards] = await Promise.all([
        get(
          `quizzes?module_id=eq.${id}&is_published=is.true&select=id,title,time_limit_minutes,quiz_questions(count)&order=order_index.asc.nullslast&limit=1`
        ).catch(() => []),
        get(`flashcards?module_id=eq.${id}&select=id`).catch(() => []),
      ]);
      if (!current()) return;
      quiz.value = quizSummary(quizzes?.[0]);
      flashcardCount.value = Array.isArray(cards) ? cards.length : 0;
    },
    { immediate: true }
  );

  return { quiz, flashcardCount };
}
