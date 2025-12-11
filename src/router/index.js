import { createRouter, createWebHistory } from "vue-router";
import { useGeneral } from "@/stores";
import HomeView from "@/views/HomeView.vue";

// Helper to get session from localStorage (bypasses supabase-js client issues)
function getSessionFromStorage() {
  try {
    const projectRef = import.meta.env.VITE_SUPABASE_URL?.match(
      /https:\/\/([^.]+)/,
    )?.[1];
    const storageKey = `sb-${projectRef}-auth-token`;
    const sessionData = localStorage.getItem(storageKey);

    if (!sessionData) {
      return null;
    }

    const session = JSON.parse(sessionData);

    // Check if session is expired
    if (session.expires_at && session.expires_at * 1000 < Date.now()) {
      console.log("Router: Session expired");
      localStorage.removeItem(storageKey);
      return null;
    }

    return session;
  } catch (err) {
    console.error("Router: Error reading session:", err);
    return null;
  }
}

const routes = [
  {
    path: "/",
    name: "home",
    component: HomeView,
    // TODO: Re-enable redirect when ready for production
    // redirect: () => {
    //   return { path: "/chapter/1/the-retina" };
    // },
  },
  {
    path: "/dashboard",
    name: "dashboard",
    component: () => import("../views/DashboardView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/editor",
    name: "editor",
    component: () => import("../views/EditorView.vue"),
    meta: { requiresAuth: true, requiredRole: "creator" },
  },
  {
    path: "/chapter/:number/:slug",
    name: "chapter",
    component: () => import("../views/ChapterView.vue"),
  },
  {
    path: "/chapter/break/:video?",
    name: "break",
    component: () => import("../views/BreakView.vue"),
  },
  {
    path: "/quiz",
    name: "quiz",
    component: () => import("../views/QuizView.vue"),
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    const store = useGeneral();
    if (savedPosition || store.savedPosition) {
      return savedPosition || store.savedPosition;
    } else {
      return { top: 0 };
    }
  },
});

router.beforeEach(async (to, from) => {
  const store = useGeneral();

  // Handle scroll position for chapter view
  if (from.name === "chapter") {
    let scrollOffset = { top: window.scrollY };
    store.savedPosition = scrollOffset;
  }

  // Handle transitions
  if (from.name === "about") {
    to.meta = { ...to.meta, transitionName: "aboutLeave" };
  }
  if (to.name === "about") {
    to.meta = { ...to.meta, transitionName: "aboutTo" };
  }
  if (to.name == "home" && from.name == "chapter") {
    store.activeMenu = true;
  }

  // Auth guard for protected routes
  if (to.meta.requiresAuth) {
    console.log("Router: Checking auth for protected route:", to.path);

    const session = getSessionFromStorage();

    if (!session) {
      console.log("Router: No valid session, redirecting to home");
      return { path: "/" };
    }

    console.log("Router: Session valid for user:", session.user?.email);

    // Role-based route protection
    if (to.meta.requiredRole) {
      const userId = session.user?.id;

      if (!userId) {
        console.log("Router: No user ID, redirecting to dashboard");
        return { path: "/dashboard" };
      }

      try {
        // Fetch profile using REST API
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey =
          import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
          import.meta.env.VITE_SUPABASE_ANON_KEY;

        const response = await fetch(
          `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=role`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
          },
        );

        if (response.ok) {
          const profiles = await response.json();
          const userRole = profiles[0]?.role;
          const requiredRoles = Array.isArray(to.meta.requiredRole)
            ? to.meta.requiredRole
            : [to.meta.requiredRole];

          if (!requiredRoles.includes(userRole)) {
            console.log(
              "Router: User role",
              userRole,
              "not in required roles",
              requiredRoles,
            );
            return { path: "/dashboard" };
          }
        }
      } catch (err) {
        console.error("Router: Error checking role:", err);
      }
    }
  }
});

export default router;
