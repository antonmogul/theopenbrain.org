import { createRouter, createWebHistory } from "vue-router";
import { useGeneral } from "@/stores";
import { supabase } from "@/lib/supabase";
import HomeView from "@/views/HomeView.vue";

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
  {
    path: "/test-supabase",
    name: "test-supabase",
    component: () => import("../components/TestSupabaseConnection.vue"),
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
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      // Redirect to home if not authenticated
      // The dashboard will show an "access denied" message anyway,
      // but this provides an extra layer of protection
      return { path: "/" };
    }

    // Role-based route protection (for future use)
    if (to.meta.requiredRole) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      const userRole = profile?.role;
      const requiredRoles = Array.isArray(to.meta.requiredRole)
        ? to.meta.requiredRole
        : [to.meta.requiredRole];

      if (!requiredRoles.includes(userRole)) {
        // Redirect to dashboard if user doesn't have required role
        return { path: "/dashboard" };
      }
    }
  }
});

export default router;
