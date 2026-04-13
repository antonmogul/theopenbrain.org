import { ref, computed } from "vue";
import { useAuth } from "./useAuth";

// Supabase REST API config
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

export function useFlashcards() {
  const flashcards = ref([]);
  const flashcardDecks = ref([]);
  const dueCardsCount = ref(0);
  const currentSession = ref(null);
  const currentCardIndex = ref(0);
  const isFlipped = ref(false);
  const loading = ref(false);
  const error = ref(null);
  const sessionStats = ref({ correct: 0, incorrect: 0, skipped: 0 });
  const sessionStartTime = ref(null);

  const { user, session } = useAuth();

  // Helper for REST API calls
  async function supabaseRest(endpoint, options = {}) {
    const accessToken = session.value?.access_token;
    if (!accessToken && options.method !== "GET") {
      throw new Error("No access token available");
    }

    const { headers: optionHeaders, ...restOptions } = options;

    const response = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
      ...restOptions,
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${accessToken || supabaseKey}`,
        "Content-Type": "application/json",
        ...optionHeaders,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const text = await response.text();
    if (!text) return options.method === "POST" ? [] : { success: true };
    return JSON.parse(text);
  }

  // Fetch flashcards for a module
  async function fetchFlashcards(moduleId) {
    loading.value = true;
    error.value = null;

    try {
      const query = `flashcards?module_id=eq.${moduleId}&select=*&order=created_at.asc`;
      const data = await supabaseRest(query);
      flashcards.value = data || [];
    } catch (e) {
      console.error("useFlashcards: Error fetching flashcards:", e);
      error.value = e.message;
      flashcards.value = [];
    } finally {
      loading.value = false;
    }
  }

  // Fetch flashcards prioritized by spaced repetition (SM-2 algorithm)
  async function fetchFlashcardsWithPriority(moduleId) {
    if (!user.value) {
      await fetchFlashcards(moduleId);
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      // Get all cards for module
      const cards = await supabaseRest(
        `flashcards?module_id=eq.${moduleId}&select=*`
      );

      if (!cards || cards.length === 0) {
        flashcards.value = [];
        return;
      }

      // Get user's response history
      const cardIds = cards.map((c) => `"${c.id}"`).join(",");
      const responses = await supabaseRest(
        `flashcard_responses?student_id=eq.${user.value.id}&flashcard_id=in.(${cardIds})&select=*&order=created_at.desc`
      );

      // Create a map of latest response per card
      const latestResponses = {};
      for (const response of responses || []) {
        if (!latestResponses[response.flashcard_id]) {
          latestResponses[response.flashcard_id] = response;
        }
      }

      const now = new Date();

      // Calculate priority based on SM-2 spaced repetition
      const prioritizedCards = cards.map((card) => {
        const lastResponse = latestResponses[card.id];
        let priority = 100; // New cards: high priority

        if (lastResponse) {
          const daysSinceReview =
            (now - new Date(lastResponse.created_at)) / (1000 * 60 * 60 * 24);
          const easeFactor = lastResponse.ease_factor || 2.5;
          const interval = lastResponse.interval_days || 1;

          // Due for review if days since >= interval
          if (daysSinceReview >= interval) {
            // Overdue cards get higher priority
            priority = 50 + Math.min((daysSinceReview - interval) * 10, 50);
          } else {
            // Not due yet - low priority
            priority = 10;
          }

          // Lower ease factor = struggling with card = higher priority
          if (easeFactor < 2.0) priority += 20;
          if (easeFactor < 1.5) priority += 10;
        }

        return { ...card, priority, lastResponse };
      });

      // Sort by priority (highest first) then shuffle cards with same priority
      prioritizedCards.sort((a, b) => {
        if (b.priority !== a.priority) {
          return b.priority - a.priority;
        }
        return Math.random() - 0.5;
      });

      flashcards.value = prioritizedCards;
    } catch (e) {
      console.error("useFlashcards: Error fetching prioritized flashcards:", e);
      error.value = e.message;
      // Fallback to simple fetch
      await fetchFlashcards(moduleId);
    } finally {
      loading.value = false;
    }
  }

  // Fetch available flashcard decks for multiple modules (for dashboard)
  async function fetchAvailableDecks(moduleIds) {
    loading.value = true;
    error.value = null;

    try {
      if (!moduleIds || moduleIds.length === 0) {
        flashcardDecks.value = [];
        return;
      }

      // Get flashcard counts per module
      const moduleIdList = moduleIds.join(",");
      const query = `modules?id=in.(${moduleIdList})&select=id,title,flashcards(count)`;

      const data = await supabaseRest(query);

      // Transform data to deck format
      flashcardDecks.value = (data || [])
        .map((module) => ({
          module_id: module.id,
          module_title: module.title,
          card_count: module.flashcards?.[0]?.count || 0,
        }))
        .filter((deck) => deck.card_count > 0);
    } catch (e) {
      console.error("useFlashcards: Error fetching available decks:", e);
      error.value = e.message;
      flashcardDecks.value = [];
    } finally {
      loading.value = false;
    }
  }

  // Fetch count of cards due for review across multiple modules
  async function fetchDueCardsCount(moduleIds) {
    if (!user.value || !moduleIds || moduleIds.length === 0) {
      dueCardsCount.value = 0;
      return 0;
    }

    try {
      // Get all flashcards for modules
      const moduleIdList = moduleIds.join(",");
      const cards = await supabaseRest(
        `flashcards?module_id=in.(${moduleIdList})&select=id`
      );

      if (!cards || cards.length === 0) {
        dueCardsCount.value = 0;
        return 0;
      }

      // Get user's response history
      const cardIds = cards.map((c) => `"${c.id}"`).join(",");
      const responses = await supabaseRest(
        `flashcard_responses?student_id=eq.${user.value.id}&flashcard_id=in.(${cardIds})&select=flashcard_id,interval_days,created_at&order=created_at.desc`
      );

      // Get latest response per card
      const latestResponses = {};
      for (const r of responses || []) {
        if (!latestResponses[r.flashcard_id]) {
          latestResponses[r.flashcard_id] = r;
        }
      }

      // Count due cards
      const now = new Date();
      let dueCount = 0;

      for (const card of cards) {
        const resp = latestResponses[card.id];
        if (!resp) {
          dueCount++; // New card
        } else {
          const daysSince =
            (now - new Date(resp.created_at)) / (1000 * 60 * 60 * 24);
          if (daysSince >= resp.interval_days) {
            dueCount++;
          }
        }
      }

      dueCardsCount.value = dueCount;
      return dueCount;
    } catch (e) {
      console.error("useFlashcards: Error fetching due cards count:", e);
      dueCardsCount.value = 0;
      return 0;
    }
  }

  // Start a study session
  async function startSession(moduleId) {
    if (!user.value) {
      throw new Error("User not authenticated");
    }

    loading.value = true;
    error.value = null;

    try {
      // Fetch cards first so we can include card_ids in session
      await fetchFlashcardsWithPriority(moduleId);

      const cardIds = flashcards.value.map((c) => c.id);

      // Create session record
      const sessionData = await supabaseRest("flashcard_sessions", {
        method: "POST",
        headers: {
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          student_id: user.value.id,
          card_ids: cardIds,
        }),
      });

      const newSession = Array.isArray(sessionData)
        ? sessionData[0]
        : sessionData;
      currentSession.value = newSession;
      currentCardIndex.value = 0;
      isFlipped.value = false;
      sessionStats.value = { correct: 0, incorrect: 0, skipped: 0 };
      sessionStartTime.value = new Date();

      return {
        session: currentSession.value,
        cards: flashcards.value,
      };
    } catch (e) {
      console.error("useFlashcards: Error starting session:", e);
      error.value = e.message;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  // Flip current card
  function flipCard() {
    isFlipped.value = !isFlipped.value;
  }

  // Rate card using SM-2 algorithm
  // rating: 1 = Again, 2 = Hard, 3 = Good, 4 = Easy
  async function rateCard(rating) {
    if (!user.value || !currentSession.value) {
      throw new Error("No active session");
    }

    const card = flashcards.value[currentCardIndex.value];
    if (!card) return;

    try {
      // Get previous response data
      const prevResponse = card.lastResponse;

      // SM-2 algorithm calculations
      let easeFactor = prevResponse?.ease_factor || 2.5;
      let interval = prevResponse?.interval_days || 1;
      let repetitions = prevResponse?.repetitions || 0;

      switch (rating) {
        case 1: // Again - Complete reset
          interval = 1;
          repetitions = 0;
          easeFactor = Math.max(1.3, easeFactor - 0.2);
          sessionStats.value.incorrect++;
          break;

        case 2: // Hard - Small interval increase
          if (repetitions === 0) {
            interval = 1;
          } else if (repetitions === 1) {
            interval = 3;
          } else {
            interval = Math.max(1, Math.round(interval * 1.2));
          }
          easeFactor = Math.max(1.3, easeFactor - 0.15);
          repetitions++;
          sessionStats.value.correct++;
          break;

        case 3: // Good - Normal progression
          if (repetitions === 0) {
            interval = 1;
          } else if (repetitions === 1) {
            interval = 6;
          } else {
            interval = Math.round(interval * easeFactor);
          }
          repetitions++;
          sessionStats.value.correct++;
          break;

        case 4: // Easy - Accelerated progression
          if (repetitions === 0) {
            interval = 4;
          } else if (repetitions === 1) {
            interval = 10;
          } else {
            interval = Math.round(interval * easeFactor * 1.3);
          }
          easeFactor = Math.min(3.0, easeFactor + 0.15);
          repetitions++;
          sessionStats.value.correct++;
          break;
      }

      // Save response
      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + interval);

      await supabaseRest("flashcard_responses", {
        method: "POST",
        body: JSON.stringify({
          session_id: currentSession.value.id,
          flashcard_id: card.id,
          student_id: user.value.id,
          was_correct: rating >= 3,
          ease_factor: easeFactor,
          interval_days: interval,
          repetitions: repetitions,
          next_review_date: nextReview.toISOString().split("T")[0],
        }),
      });

      // Update local card data for potential re-review
      card.lastResponse = {
        ease_factor: easeFactor,
        interval_days: interval,
        repetitions: repetitions,
        created_at: new Date().toISOString(),
      };

      // Move to next card
      nextCard();
    } catch (e) {
      console.error("useFlashcards: Error rating card:", e);
      throw e;
    }
  }

  // Skip card
  function skipCard() {
    sessionStats.value.skipped++;
    nextCard();
  }

  // Next card
  function nextCard() {
    isFlipped.value = false;
    if (currentCardIndex.value < flashcards.value.length - 1) {
      currentCardIndex.value++;
    }
  }

  // Previous card
  function previousCard() {
    isFlipped.value = false;
    if (currentCardIndex.value > 0) {
      currentCardIndex.value--;
    }
  }

  // End session
  async function endSession() {
    if (!currentSession.value) return null;

    const endTime = new Date();
    const sessionDuration = Math.floor(
      (endTime - sessionStartTime.value) / 1000
    );

    try {
      await supabaseRest(`flashcard_sessions?id=eq.${currentSession.value.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          completed_at: endTime.toISOString(),
          cards_reviewed:
            sessionStats.value.correct + sessionStats.value.incorrect,
          cards_correct: sessionStats.value.correct,
          duration_seconds: sessionDuration,
        }),
      });

      const summary = {
        ...sessionStats.value,
        duration: sessionDuration,
        totalCards: flashcards.value.length,
      };

      // Reset session state
      currentSession.value = null;
      sessionStartTime.value = null;

      return summary;
    } catch (e) {
      console.error("useFlashcards: Error ending session:", e);
      throw e;
    }
  }

  // Reset session state
  function resetSession() {
    currentSession.value = null;
    currentCardIndex.value = 0;
    isFlipped.value = false;
    sessionStats.value = { correct: 0, incorrect: 0, skipped: 0 };
    sessionStartTime.value = null;
  }

  // Fetch session history
  async function fetchSessionHistory(limit = 10) {
    if (!user.value) return [];

    try {
      const query = `flashcard_sessions?student_id=eq.${user.value.id}&completed_at=not.is.null&select=*&order=started_at.desc&limit=${limit}`;
      const data = await supabaseRest(query);
      return data || [];
    } catch (e) {
      console.error("useFlashcards: Error fetching session history:", e);
      return [];
    }
  }

  // Get study stats for a module
  async function getStudyStats(moduleId) {
    if (!user.value) return null;

    try {
      // Get total cards
      const cards = await supabaseRest(
        `flashcards?module_id=eq.${moduleId}&select=id`
      );
      const totalCards = cards?.length || 0;

      // Get cards due for review
      const cardIds = cards?.map((c) => `"${c.id}"`).join(",");
      if (!cardIds) return { totalCards: 0, dueCards: 0, masteredCards: 0 };

      const responses = await supabaseRest(
        `flashcard_responses?student_id=eq.${user.value.id}&flashcard_id=in.(${cardIds})&select=flashcard_id,ease_factor,interval_days,created_at&order=created_at.desc`
      );

      // Get latest response per card
      const latestResponses = {};
      for (const r of responses || []) {
        if (!latestResponses[r.flashcard_id]) {
          latestResponses[r.flashcard_id] = r;
        }
      }

      const now = new Date();
      let dueCards = 0;
      let masteredCards = 0;

      for (const card of cards || []) {
        const resp = latestResponses[card.id];
        if (!resp) {
          dueCards++; // New card
        } else {
          const daysSince =
            (now - new Date(resp.created_at)) / (1000 * 60 * 60 * 24);
          if (daysSince >= resp.interval_days) {
            dueCards++;
          }
          // Consider mastered if interval > 21 days
          if (resp.interval_days >= 21) {
            masteredCards++;
          }
        }
      }

      return {
        totalCards,
        dueCards,
        masteredCards,
        reviewedCards: Object.keys(latestResponses).length,
      };
    } catch (e) {
      console.error("useFlashcards: Error getting study stats:", e);
      return null;
    }
  }

  // Computed properties
  const currentCard = computed(
    () => flashcards.value[currentCardIndex.value] || null
  );

  const progress = computed(() => ({
    current: currentCardIndex.value + 1,
    total: flashcards.value.length,
    percentage:
      flashcards.value.length > 0
        ? Math.round(
            ((currentCardIndex.value + 1) / flashcards.value.length) * 100
          )
        : 0,
  }));

  const isLastCard = computed(
    () => currentCardIndex.value === flashcards.value.length - 1
  );

  const isFirstCard = computed(() => currentCardIndex.value === 0);

  const hasCards = computed(() => flashcards.value.length > 0);

  const sessionDuration = computed(() => {
    if (!sessionStartTime.value) return 0;
    return Math.floor((new Date() - sessionStartTime.value) / 1000);
  });

  return {
    // State
    flashcards,
    flashcardDecks,
    dueCardsCount,
    currentCard,
    currentCardIndex,
    isFlipped,
    loading,
    error,
    sessionStats,
    currentSession,

    // Computed
    progress,
    isLastCard,
    isFirstCard,
    hasCards,
    sessionDuration,

    // Methods
    fetchFlashcards,
    fetchFlashcardsWithPriority,
    fetchAvailableDecks,
    fetchDueCardsCount,
    startSession,
    flipCard,
    rateCard,
    skipCard,
    nextCard,
    previousCard,
    endSession,
    resetSession,
    fetchSessionHistory,
    getStudyStats,
  };
}
