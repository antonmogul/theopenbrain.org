import { computed } from "vue";
import { useAuth } from "./useAuth";

// Returns the route a "home" link (wordmark, brand element) should target.
// Anonymous → marketing HomeView at /. Signed-in → library at /chapters.
export function useHomeRoute() {
  const { isAuthenticated } = useAuth();
  return computed(() => (isAuthenticated.value ? "/chapters" : "/"));
}
