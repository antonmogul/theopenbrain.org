import { ref } from "vue";

/**
 * useCrudResource — small shared scaffold for list-backed Supabase resources.
 *
 * This is deliberately narrow. It only captures the byte-identical bits that
 * useHighlights / useNotes / useTrendingHighlights repeated verbatim:
 *
 *   1. the (list, loading, error) ref triple,
 *   2. the "load a query into the list" wrapper with its try/catch/finally
 *      (set loading, clear error, assign `data || []`, on error log + record
 *      message + reset list, always clear loading),
 *   3. the "DELETE by id then drop from local state" wrapper.
 *
 * Anything that varies meaningfully between the composables — create/update
 * payload shape, joined-highlight fetches, updated_at stamping, reactivity
 * tricks, scroll/format helpers — is intentionally left inline in each
 * composable. Do NOT grow this into a generic ORM.
 *
 * NOTE: this overlaps conceptually with withAsyncState (owned elsewhere), but
 * is kept separate on purpose for now — withAsyncState wraps a single async
 * op's loading/error, whereas this also owns the list ref + the resource's
 * fetch/delete semantics (data || [], reset-to-[] on error, local-state splice).
 *
 * @param {Object}   opts
 * @param {Function} opts.request   The API client function (authedRequest / apiRequest).
 * @param {string}   [opts.table]   Table/endpoint name, used by removeById.
 * @param {string}   [opts.logLabel] Prefix for console.error logs.
 * @param {*}        [opts.initial]  Initial list value (default []).
 */
export function useCrudResource({ request, table, logLabel = "useCrudResource", initial = [] } = {}) {
  const list = ref(initial);
  const loading = ref(false);
  const error = ref(null);

  /**
   * Run a read query and load the result into `list`.
   * Mirrors the original fetch* bodies exactly: on error, logs, records the
   * message on `error`, and resets the list to [].
   * @param {string} query PostgREST query string.
   */
  async function runFetch(query) {
    loading.value = true;
    error.value = null;

    try {
      const data = await request(query);
      list.value = data || [];
    } catch (e) {
      console.error(`${logLabel}: Error fetching:`, e);
      error.value = e.message;
      list.value = [];
    } finally {
      loading.value = false;
    }
  }

  /**
   * DELETE a row by id, then remove it from local state.
   * Rethrows on failure (after logging), matching the originals.
   * @param {string|number} id
   */
  async function removeById(id) {
    try {
      await request(`${table}?id=eq.${id}`, { method: "DELETE" });
      list.value = list.value.filter((item) => item.id !== id);
    } catch (e) {
      console.error(`${logLabel}: Error deleting:`, e);
      throw e;
    }
  }

  return { list, loading, error, runFetch, removeById };
}
