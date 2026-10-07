import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reactive, ref, nextTick } from "vue";
import { flushPromises, shallowMount } from "@vue/test-utils";

const state = vi.hoisted(() => ({ auth: null, route: null, push: vi.fn() }));
vi.mock("@/composables/useAuth", () => ({ useAuth: () => state.auth }));
vi.mock("vue-router", () => ({
  useRoute: () => state.route,
  useRouter: () => ({ push: state.push }),
}));
vi.mock("@/services/api/client", () => ({
  authedRequest: vi.fn(),
  getSession: vi.fn(),
}));
import { authedRequest } from "@/services/api/client";
import DashboardView from "../DashboardView.vue";
import FeedbackSection from "@/components/dashboard/sections/FeedbackSection.vue";
import AnalyticsSection from "@/components/dashboard/sections/AnalyticsSection.vue";

let wrapper;
beforeEach(() => {
  vi.clearAllMocks();
  state.auth = {
    user: ref({ id: "creator" }),
    profile: ref({ id: "creator", role: "creator" }),
    loading: ref(false),
    profileLoading: ref(false),
    isAuthenticated: ref(true),
  };
  state.route = reactive({ query: { section: "feedback" } });
  state.push.mockImplementation(async (target) => {
    state.route.query = target.query || {};
  });
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  authedRequest.mockImplementation(async (endpoint) => {
    if (Number(new URLSearchParams(endpoint.split("?")[1]).get("offset")) > 0)
      return [];
    if (endpoint.startsWith("feedback?"))
      return [
        {
          id: "f1",
          module_id: "retina",
          kind: "bug",
          message: "Figure missing",
        },
      ];
    if (endpoint.startsWith("analytics_events?"))
      return [
        {
          id: "event-one",
          event_type: "page_view",
          module_id: "retina",
          user_id: "reader",
          created_at: new Date().toISOString(),
        },
      ];
    if (endpoint.startsWith("modules?"))
      return [{ id: "retina", title: "The Retina" }];
    return [];
  });
});
afterEach(() => {
  wrapper?.unmount();
  vi.restoreAllMocks();
});
const mountView = async () => {
  wrapper = shallowMount(DashboardView, {
    global: {
      stubs: {
        "router-link": true,
        DashboardShell: { template: "<div><slot /></div>" },
      },
    },
  });
  await flushPromises();
  return wrapper;
};

describe("creator dashboard feedback integration", () => {
  it("opens a feedback deep link, wires filters, and follows Back/Forward section changes", async () => {
    const w = await mountView();
    const section = w.findComponent(FeedbackSection);
    expect(section.props("filteredFeedback")).toHaveLength(1);
    section.vm.$emit("chapter-change", "unassigned");
    await nextTick();
    expect(section.props("filteredFeedback")).toEqual([]);
    section.vm.$emit("chapter-change", "all");
    section.vm.$emit("kind-change", "idea");
    await nextTick();
    expect(section.props("filteredFeedback")).toEqual([]);
    state.route.query = { section: "analytics" };
    await flushPromises();
    expect(w.findComponent(AnalyticsSection).exists()).toBe(true);
    expect(w.findComponent(FeedbackSection).exists()).toBe(false);
    state.route.query = { section: "feedback" };
    await flushPromises();
    expect(w.findComponent(FeedbackSection).exists()).toBe(true);
    expect(
      authedRequest.mock.calls.filter(
        ([q]) => q.startsWith("feedback?") && q.endsWith("offset=0")
      )
    ).toHaveLength(2);
  });

  it("waits for creator identity before reading feedback and hides it on sign-out", async () => {
    state.auth.profile.value = null;
    const w = await mountView();
    expect(w.findComponent(FeedbackSection).props("feedbackAccessDenied")).toBe(
      true
    );
    expect(authedRequest).not.toHaveBeenCalled();
    state.auth.profile.value = { id: "creator", role: "creator" };
    await flushPromises();
    expect(
      w.findComponent(FeedbackSection).props("filteredFeedback")
    ).toHaveLength(1);
    state.auth.isAuthenticated.value = false;
    await flushPromises();
    expect(w.findComponent(FeedbackSection).exists()).toBe(false);
    expect(w.findComponent({ name: "ErrorState" }).props("title")).toBe(
      "Access denied"
    );
  });

  it.each(["user change", "role demotion", "sign-out", "pending profile"])(
    "removes creator analytics on %s without reading under the stale identity",
    async (change) => {
      state.route.query = { section: "analytics" };
      const w = await mountView();
      expect(
        w.findComponent(AnalyticsSection).props("analyticsMetrics")
          .totalPageViews
      ).toBe(1);
      const priorCalls = authedRequest.mock.calls.length;
      if (change === "user change") {
        state.auth.user.value = { id: "student" };
        state.auth.profile.value = { id: "student", role: "student" };
      } else if (change === "role demotion") {
        state.auth.profile.value = { id: "creator", role: "student" };
      } else if (change === "sign-out") {
        state.auth.isAuthenticated.value = false;
      } else {
        state.auth.profileLoading.value = true;
      }
      await flushPromises();
      const analytics = w.findComponent(AnalyticsSection);
      expect(
        analytics.exists() ? analytics.props("contentPerformance") : []
      ).toEqual([]);
      if (analytics.exists())
        expect(analytics.props("analyticsAccessDenied")).toBe(true);
      expect(authedRequest.mock.calls).toHaveLength(priorCalls);
    }
  );

  it("waits for a matching, loaded creator profile before reading analytics for a new account", async () => {
    state.route.query = { section: "analytics" };
    state.auth.profileLoading.value = true;
    const w = await mountView();
    expect(authedRequest).not.toHaveBeenCalled();
    state.auth.profileLoading.value = false;
    await flushPromises();
    expect(
      w.findComponent(AnalyticsSection).props("analyticsMetrics").totalPageViews
    ).toBe(1);
    authedRequest.mockClear();
    state.auth.user.value = { id: "new-creator" };
    await flushPromises();
    expect(
      w.findComponent(AnalyticsSection).props("contentPerformance")
    ).toEqual([]);
    expect(authedRequest).not.toHaveBeenCalled();
    state.auth.profile.value = { id: "new-creator", role: "creator" };
    await flushPromises();
    expect(
      w.findComponent(AnalyticsSection).props("analyticsMetrics").totalPageViews
    ).toBe(1);
    expect(authedRequest).toHaveBeenCalled();
  });
});
