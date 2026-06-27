/**
 * withAsyncState — wraps an async function with the loading/error try-catch
 * triple used verbatim across the dashboard composables.
 *
 * Semantics (matched EXACTLY to the existing dashboard composables, e.g.
 * useVersions.fetchVersions, useDashboardMedia.fetchMedia,
 * useDashboardAnalytics.fetchAnalytics):
 *
 *   loading.value = true;
 *   error.value = null;
 *   try {
 *       ...await fn()...
 *   } catch (err) {
 *       console.error(logLabel, err);  // e.g. "Error fetching versions:"
 *       error.value = err.message;
 *   } finally {
 *       loading.value = false;
 *   }
 *
 * The error is swallowed (not re-thrown), exactly as the originals did. The
 * wrapped fn's resolved value is returned on success; on failure undefined is
 * returned (the catch path produces no value).
 *
 * @param {object}   refs            - { loading, error } Vue refs to manage
 * @param {import('vue').Ref} refs.loading
 * @param {import('vue').Ref} refs.error
 * @param {string}   logLabel        - prefix passed to console.error on failure
 * @param {() => Promise<any>} fn    - the async work to run inside the triple
 * @returns {Promise<any>} the fn's resolved value, or undefined on error
 */
export async function withAsyncState({ loading, error }, logLabel, fn) {
    loading.value = true;
    error.value = null;

    try {
        return await fn();
    } catch (err) {
        console.error(logLabel, err);
        error.value = err.message;
    } finally {
        loading.value = false;
    }
}
