import { createRouter, createWebHistory } from "vue-router";
import { useGeneral } from "@/stores";
import {
  applyChapterRamp,
  clearChapterRamp,
  moduleForRoute,
} from "@/helper/chapterTheme";
import { useChapterCatalog } from "@/composables/useChapterCatalog";
import { ensureFreshSession } from "@/utils/authHelpers";
import { apiRequest } from "@/services/api/client";
import { createAuthGuard } from "./guards";
import HomeView from "@/views/HomeView.vue";

export const routes = [
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
    // The old flat block editor (382 blocks titled "Paragraph 1", "Paragraph
    // 2"…, chapters interleaved). Dashboard → Chapters → Edit chapter replaces
    // it (OPENBRAIN-50). beforeEnter runs after the global role guard, so the
    // route keeps its creator gate; EditorView stays until it is retired.
    path: "/editor",
    name: "editor",
    component: () => import("../views/EditorView.vue"),
    meta: { requiresAuth: true, requiredRole: "creator" },
    beforeEnter: () => ({ path: "/dashboard", query: { section: "chapters" } }),
  },
  {
    // The chapter block page (OPENBRAIN-60): every block rendered as the
    // reader shows it, edited in place.
    path: "/dashboard/chapters/:slug",
    name: "chapter-editor",
    component: () => import("../views/ChapterEditorView.vue"),
    meta: { requiresAuth: true, requiredRole: "creator" },
  },
  {
    path: "/dashboard/chapter/new",
    name: "chapter-wizard",
    redirect: { path: "/dashboard", query: { section: "chapter-wizard" } },
  },
  {
    path: "/chapters",
    name: "chapters",
    component: () => import("../views/ChaptersView.vue"),
  },
  {
    path: "/chapter/:number(\\d+)",
    name: "chapter-overview",
    component: () => import("../views/ChapterOverviewView.vue"),
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
  {
    path: "/playground",
    name: "playground",
    component: () => import("../views/PythonPlaygroundView.vue"),
  },
  {
    path: "/settings",
    name: "settings",
    component: () => import("../views/SettingsView.vue"),
    meta: { requiresAuth: true },
  },
  {
    // Internal design-system reference. Not linked in nav; open /styleguide directly.
    path: "/styleguide",
    name: "styleguide",
    component: () => import("../views/StyleGuideView.vue"),
  },
  {
    // Case Cabinet prototype (History chapter). Reads mock data from
    // src/mocks/caseFiles.js until the case_files tables exist. Not linked in
    // nav; open /case-cabinet directly.
    path: "/case-cabinet",
    name: "case-cabinet",
    component: () => import("../views/CaseCabinetView.vue"),
  },
  {
    // Phrenology skull prototype (History chapter, Widget 1). Placeholder SVG
    // skull art until the Figma engravings are exported. Not linked in nav;
    // open /phrenology directly.
    path: "/phrenology",
    name: "phrenology",
    component: () => import("../views/PhrenologyView.vue"),
  },
  {
    // 3D skull prototype (model-viewer). Companion to /phrenology (2D).
    // Needs a skull.glb in public/publicAssets/models/. Not linked in nav.
    path: "/phrenology-3d",
    name: "phrenology-3d",
    component: () => import("../views/Phrenology3DView.vue"),
  },
  {
    // Signal Detection Theory widget prototype (Attention chapter).
    // OPENBRAIN-13: pilot for the widget hosting pattern. Not linked in nav;
    // open /sdt directly.
    path: "/sdt",
    name: "sdt",
    component: () => import("../views/SdtWidgetView.vue"),
  },
  {
    // Biased Competition widget (Attention chapter). OPENBRAIN-13: second
    // widget port. Not linked in nav; open /biased-competition directly.
    path: "/biased-competition",
    name: "biased-competition",
    component: () => import("../views/BiasedCompetitionView.vue"),
  },
  {
    // Contrast Response Gain widget (Attention chapter). OPENBRAIN-13: third
    // widget port. Not linked in nav; open /contrast-response directly.
    path: "/contrast-response",
    name: "contrast-response",
    component: () => import("../views/ContrastResponseGainView.vue"),
  },
  {
    // Posner Spatial Cueing Task widget (Attention chapter). OPENBRAIN-13:
    // fourth widget port. Not linked in nav; open /posner-cueing directly.
    path: "/posner-cueing",
    name: "posner-cueing",
    component: () => import("../views/PosnerCueingView.vue"),
  },
  {
    // TMT Feature Attention widget (Attention chapter). OPENBRAIN-13:
    // fifth widget port. Not linked in nav; open /feature-attention directly.
    path: "/feature-attention",
    name: "feature-attention",
    component: () => import("../views/TmtFeatureAttentionView.vue"),
  },
  {
    // Corbetta PET attention widget (Attention chapter). OPENBRAIN-88. Not
    // linked in nav; open /corbetta-pet directly.
    path: "/corbetta-pet",
    name: "corbetta-pet",
    component: () => import("../views/CorbettaPetView.vue"),
  },
  {
    // Hillyard auditory attention ERP widget (Attention chapter). OPENBRAIN-88.
    // Not linked in nav; open /hillyard-erp directly.
    path: "/hillyard-erp",
    name: "hillyard-erp",
    component: () => import("../views/HillyardErpView.vue"),
  },
  {
    // Normalization model of attention (Attention chapter). OPENBRAIN-88:
    // port of Arjun's v2. Not linked in nav; open /normalization-model
    // directly.
    path: "/normalization-model",
    name: "normalization-model",
    component: () => import("../views/NormalizationModelView.vue"),
  },
  {
    // Color Vision Explorer (Retina chapter). OPENBRAIN-14: first Stuart
    // widget port. Not linked in nav; open /color-vision directly.
    path: "/color-vision",
    name: "color-vision",
    component: () => import("../views/ColorVisionView.vue"),
  },
  {
    // Visual Pathway Lesions (Retina chapter). OPENBRAIN-14: second Stuart
    // widget port. Not linked in nav; open /visual-pathway directly.
    path: "/visual-pathway",
    name: "visual-pathway",
    component: () => import("../views/VisualPathwayLesionsView.vue"),
  },
  {
    // Direction Selectivity (Retina chapter). OPENBRAIN-14: third Stuart
    // widget port. Pyodide-powered. Not linked in nav; open /direction-selectivity directly.
    path: "/direction-selectivity",
    name: "direction-selectivity",
    component: () => import("../views/DirectionSelectivityView.vue"),
  },
  {
    // V1 Camera — "What V1 sees" (V1 chapter). OPENBRAIN-14: fourth Stuart
    // widget port. WebGL2 Gabor filter bank. Not linked in nav; open
    // /v1-camera directly.
    path: "/v1-camera",
    name: "v1-camera",
    component: () => import("../views/V1CameraView.vue"),
  },
  {
    // Widget library — browsable gallery of every interactive widget from
    // all chapters. Not linked in main nav; open /widgets directly.
    // Share this URL with authors (Stuart, Arjun) and design (Sonia).
    path: "/widgets",
    name: "widgets",
    component: () => import("../views/WidgetLibraryView.vue"),
  },
  {
    // RetINaBox — interactive retinal circuit simulator (Retina chapter).
    // OPENBRAIN-14: fifth Stuart widget port (merges both variants).
    // Not linked in nav; open /retinabox directly.
    path: "/retinabox",
    name: "retinabox",
    component: () => import("../views/RetINaBoxView.vue"),
  },
];

/*
 * Role lookup for the auth guard. Goes through the shared REST client so a
 * non-2xx response throws — the guard turns a throw (or an empty result) into
 * a fail-closed redirect. The bearer token is passed explicitly rather than
 * relying on the client's session holder, which is only populated once
 * useAuth has been imported and is not guaranteed on the first navigation of
 * a hard refresh.
 */
async function fetchRoleForSession(session) {
  const userId = encodeURIComponent(session.user.id);
  const profiles = await apiRequest(`profiles?id=eq.${userId}&select=role`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  return Array.isArray(profiles) ? (profiles[0]?.role ?? null) : null;
}

/*
 * DEV-only role override (useAuth().devRoleOverride). Imported lazily so the
 * composable's module-load side effects stay out of the router's import graph
 * in production, where import.meta.env.DEV is statically false.
 */
async function getDevRoleOverride() {
  const { useAuth } = await import("@/composables/useAuth");
  return useAuth().devRoleOverride.value ?? null;
}

export const authGuard = createAuthGuard({
  // An expired but refreshable session is renewed, not treated as signed
  // out (OPENBRAIN-77).
  getSession: () => ensureFreshSession(),
  fetchRole: fetchRoleForSession,
  isDev: import.meta.env.DEV,
  getDevRoleOverride,
});

/**
 * Build the app router. The history is injectable so tests can drive the real
 * route table and guard registrations with createMemoryHistory().
 */
// Tab titles for routes that don't set their own (the reader does).
export const ROUTE_TITLES = {
  dashboard: "Creator console",
  "chapter-editor": "Edit chapter",
  chapters: "Chapters",
  "chapter-overview": "Chapter overview",
  "professor-dashboard": "Professor dashboard",
  "student-dashboard": "My courses",
  settings: "Settings",
  playground: "Python playground",
  quiz: "Quiz",
  flashcards: "Flashcards",
  lab: "Code lab",
  enroll: "Enrol",
  styleguide: "Styleguide",
  widgets: "Widget library",
};

export function createAppRouter({
  history = createWebHistory(import.meta.env.BASE_URL),
} = {}) {
  const router = createRouter({
    history,
    routes,
    scrollBehavior(to, from, savedPosition) {
      const store = useGeneral();

      // Continue Reading is restored by ChapterView only after the chapter's
      // fonts and images have settled. Do not race it with browser/store offsets.
      if (to.name === "chapter" && to.query.resume === "1") {
        store.savedPosition = undefined;
        return { top: 0 };
      }

      if (savedPosition) return savedPosition;

      // The legacy store position is a one-shot return target. It must never be
      // applied globally to a different chapter or unrelated route.
      const pendingPosition = store.savedPosition;
      store.savedPosition = undefined;
      if (pendingPosition?.route === to.fullPath) {
        return pendingPosition.position;
      }

      return { top: 0 };
    },
  });

  // Auth/role boundary first. When it redirects, Vue Router re-runs every
  // beforeEach against the redirect target with the same `from`, so the
  // scroll-memory guard below still sees the chapter it is leaving.
  router.beforeEach(authGuard);

  router.beforeEach((to, from) => {
    const store = useGeneral();

    // Handle scroll position for chapter view
    if (from.name === "chapter") {
      store.savedPosition = {
        route: from.fullPath,
        position: { top: window.scrollY },
      };
    }

    if (to.name == "home" && from.name == "chapter") {
      store.activeMenu = true;
    }
  });

  // Chapter colour ramps: brand.css switches on data-chapter on <html>. Runs
  // afterEach (not beforeEach) so a guard redirect can't leave a stale value.
  // The ramp is a property of the module (subject), not of the route number
  // (OPENBRAIN-30), so it is resolved through the catalog. Drafts are not in
  // the public catalog; ChapterView applies the ramp again from the module
  // row it loads, which also lets the DB `ramp` column win.
  router.afterEach((to) => {
    // Tab title (OPENBRAIN-56): ChapterView sets the chapter's own title once
    // it loads; every other route gets a fixed one, so a chapter's title no
    // longer sticks to the dashboard, settings or library.
    if (to.name !== "chapter") {
      document.title = ROUTE_TITLES[to.name]
        ? `${ROUTE_TITLES[to.name]} · The Open Brain`
        : "The Open Brain";
    }

    // Clear first, unconditionally: if the catalog fails, comes back empty, or
    // the route names a module it does not know, the previous chapter's colour
    // must not survive. The catalog is cached after its first fetch, so on
    // chapter-to-chapter navigation the re-apply below lands a tick later.
    clearChapterRamp();
    if (to.name !== "chapter" && to.name !== "chapter-overview") return;
    const catalog = useChapterCatalog();
    catalog.fetchCatalog().then(() => {
      // The catalog fetch is async: only paint if we are still on this route.
      if (router.currentRoute.value.fullPath !== to.fullPath) return;
      const module = moduleForRoute(to, catalog);
      if (module) applyChapterRamp(module);
    });
  });

  return router;
}

const router = createAppRouter();

export default router;
