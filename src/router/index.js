import { createRouter, createWebHistory } from "vue-router";
import { useGeneral } from "@/stores";
import HomeView from "@/views/HomeView.vue";

// Helper to get session from localStorage (bypasses supabase-js client issues)
function getSessionFromStorage() {
  try {
    const projectRef = import.meta.env.VITE_SUPABASE_URL?.match(
      /https:\/\/([^.]+)/
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
    path: "/dashboard/chapter/new",
    name: "chapter-wizard",
    redirect: { path: "/dashboard", query: { section: "chapter-wizard" } },
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
    path: "/quiz/:quizId",
    name: "quiz",
    component: () => import("../views/QuizView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/flashcards/:moduleId",
    name: "flashcards",
    component: () => import("../views/FlashcardView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/professor",
    name: "professor-dashboard",
    component: () => import("../views/ProfessorDashboardView.vue"),
    meta: { requiresAuth: true, requiredRole: "professor" },
  },
  {
    path: "/student",
    name: "student-dashboard",
    component: () => import("../views/StudentDashboardView.vue"),
    meta: { requiresAuth: true, requiredRole: "student" },
  },
  {
    path: "/enroll/:courseId",
    name: "enroll",
    component: () => import("../views/EnrollView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/lab/:labId",
    name: "lab",
    component: () => import("../views/LabView.vue"),
    meta: { requiresAuth: true },
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
    const session = getSessionFromStorage();

    if (!session) {
      return { path: "/" };
    }

    // Dev mode: role override bypass
    if (import.meta.env.DEV) {
      const { useAuth } = await import("@/composables/useAuth");
      const { devRoleOverride } = useAuth();
      if (devRoleOverride.value) {
        // Redirect /dashboard to the correct role-specific dashboard
        if (to.name === "dashboard" && devRoleOverride.value !== "creator") {
          if (devRoleOverride.value === "student") return { path: "/student" };
          if (devRoleOverride.value === "professor") return { path: "/professor" };
        }
        // Check requiredRole guard
        if (to.meta.requiredRole) {
          const requiredRoles = Array.isArray(to.meta.requiredRole)
            ? to.meta.requiredRole
            : [to.meta.requiredRole];
          if (!requiredRoles.includes(devRoleOverride.value)) {
            if (devRoleOverride.value === "student") return { path: "/student" };
            if (devRoleOverride.value === "professor") return { path: "/professor" };
            return { path: "/dashboard" };
          }
        }
        return;
      }
    }

    // Role-based route protection and dashboard redirection
    const userId = session.user?.id;

    if (to.meta.requiredRole || to.name === "dashboard") {
      if (!userId) {
        return { path: "/" };
      }

      try {
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
          }
        );

        if (response.ok) {
          const profiles = await response.json();
          const userRole = profiles[0]?.role;

          // Redirect /dashboard to the correct role-specific dashboard
          if (to.name === "dashboard" && userRole !== "creator") {
            if (userRole === "student") return { path: "/student" };
            if (userRole === "professor") return { path: "/professor" };
          }

          // Check requiredRole guard
          if (to.meta.requiredRole) {
            const requiredRoles = Array.isArray(to.meta.requiredRole)
              ? to.meta.requiredRole
              : [to.meta.requiredRole];

            if (!requiredRoles.includes(userRole)) {
              // Redirect to the user's own dashboard instead of generic /dashboard
              if (userRole === "student") return { path: "/student" };
              if (userRole === "professor") return { path: "/professor" };
              return { path: "/dashboard" };
            }
          }
        }
      } catch (err) {
        console.error("Router: Error checking role:", err);
      }
    }
  }
});

export default router;
