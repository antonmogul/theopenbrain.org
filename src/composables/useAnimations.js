import { ref } from "vue";
import { apiRequest as supabaseRest } from "@/services/api/client";

// Module-level cache so multiple components share the same data
const animationsCache = new Map();

/**
 * Composable to fetch animations from Supabase and transform them
 * to match the existing animations.json format used by Vue components.
 */
export function useAnimations() {
  const animations = ref([]);
  const loading = ref(false);
  const error = ref(null);

  /**
   * Fetch all animations (with states and variants) and transform
   * to the format expected by IllustrationsComp.vue and child components.
   *
   * The transform ensures backward compatibility: each animation object
   * has the same shape as entries in animations.json (id, title, fullscreen,
   * loop, states, switches, etc.).
   */
  async function fetchAnimations() {
    // Check cache first
    const cacheKey = "all";
    if (animationsCache.has(cacheKey)) {
      animations.value = animationsCache.get(cacheKey);
      return { data: animations.value, error: null };
    }

    loading.value = true;
    error.value = null;

    try {
      // Fetch animations, states, and variants in parallel
      const [animRows, stateRows, variantRows] = await Promise.all([
        supabaseRest("animations?select=*&order=created_at"),
        supabaseRest("animation_states?select=*&order=animation_id,order_index"),
        supabaseRest("animation_variants?select=*&order=animation_id,order_index"),
      ]);

      // Group states and variants by animation_id
      const statesByAnim = {};
      for (const s of stateRows) {
        if (!statesByAnim[s.animation_id]) statesByAnim[s.animation_id] = [];
        statesByAnim[s.animation_id].push(s);
      }

      const variantsByAnim = {};
      for (const v of variantRows) {
        if (!variantsByAnim[v.animation_id]) variantsByAnim[v.animation_id] = [];
        variantsByAnim[v.animation_id].push(v);
      }

      // Transform each DB row to match the legacy animations.json format
      const transformed = animRows.map((row) => {
        const config = row.config || {};
        const states = statesByAnim[row.id] || [];
        const variants = variantsByAnim[row.id] || [];

        // Base object — matches the shape components expect
        const anim = {
          id: row.animation_key,
          title: row.title || "",
          ...config, // Spread all config flags (fullscreen, loop, flip, etc.)
        };

        // Add states (non-highlight states only, for states array)
        const regularStates = states.filter((s) => !s.is_highlight_state);
        if (regularStates.length > 0) {
          anim.states = regularStates.map(
            (s) => s.state_description || s.state_label
          );
        }

        // Add highlight states (statesHighlight array)
        const highlightStates = states.filter((s) => s.is_highlight_state);
        if (highlightStates.length > 0) {
          anim.statesHighlight = highlightStates.map((s) => s.state_label);
        }

        // Add switch variants
        if (variants.length > 0 && row.interaction_type === "switch") {
          anim.switches = variants.map((v) => v.variant_label);
        }

        // Preserve source from config or add from DB
        if (row.video_file_url) {
          anim.videoUrl = row.video_file_url;
        }
        if (row.image_file_url) {
          anim.imageUrl = row.image_file_url;
        }
        if (row.youtube_id) {
          anim.youtubeID = row.youtube_id;
        }

        return anim;
      });

      animations.value = transformed;
      animationsCache.set(cacheKey, transformed);
      loading.value = false;
      return { data: transformed, error: null };
    } catch (err) {
      console.error("useAnimations: fetch failed:", err);
      error.value = err.message;
      loading.value = false;
      return { data: null, error: err.message };
    }
  }

  /**
   * Get a single animation by its key (e.g. "animationEyeStructur")
   */
  function getAnimation(animationKey) {
    return animations.value.find((a) => a.id === animationKey) || null;
  }

  /**
   * Clear the cache (e.g. after admin edits)
   */
  function clearCache() {
    animationsCache.clear();
  }

  return {
    animations,
    loading,
    error,
    fetchAnimations,
    getAnimation,
    clearCache,
  };
}
