import { computed, ref, watch } from "vue";
import { post } from "@/services/api/client";
import { useAuth } from "@/composables/useAuth";

/*
 * May the highlight toolbar offer "Share with readers"? (OPENBRAIN-128)
 *
 * Merging deploys the switch; 20261007000000_trending_highlights_sync.sql,
 * which keeps a shared highlight row to its owner, only reaches the database
 * with `supabase db push`. In between, the old public-read policy would hand
 * a shared row (who, tags, note) to anyone. That migration adds
 * public.trending_sharing_ready(), callable by signed-in readers, so the
 * switch shows only once the database answers true. Before the push the call
 * is a 404 (PGRST202); that, a network failure or any other error means "not
 * yet", quietly.
 *
 * One call per page load, shared by every toolbar, and only with a session:
 * anon may not call it, and an anonymous "no" must not stick once the reader
 * signs in.
 */
const ready = ref(false);
let probe = null;

function checkSharing() {
  probe ??= post("rpc/trending_sharing_ready", {}).then(
    (answer) => {
      ready.value = answer === true;
    },
    () => {
      ready.value = false;
    }
  );
  return probe;
}

export function useTrendingSharing() {
  const { isAuthenticated } = useAuth();
  watch(
    isAuthenticated,
    (signedIn) => {
      if (signedIn) checkSharing();
    },
    { immediate: true }
  );
  return {
    /** Signed in, and the database keeps shared highlight rows private. */
    sharingReady: computed(() => isAuthenticated.value && ready.value),
  };
}
