import { describe, it, expect, beforeEach, vi } from "vitest";

// fetchAnimations issues three parallel REST calls (animations, animation_states,
// animation_variants). Route the mock by endpoint substring.
vi.mock("@/services/api/client", () => ({
  apiRequest: vi.fn(),
}));

import { apiRequest } from "@/services/api/client";
import { useAnimations } from "@/composables/useAnimations";

function mockRest({ animations, states = [], variants = [] }) {
  apiRequest.mockImplementation((endpoint) => {
    if (endpoint.startsWith("animations?")) return Promise.resolve(animations);
    if (endpoint.startsWith("animation_states?"))
      return Promise.resolve(states);
    if (endpoint.startsWith("animation_variants?"))
      return Promise.resolve(variants);
    return Promise.resolve([]);
  });
}

describe("useAnimations switch flag (CODE-FIX #3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    // Clear the module-level cache between tests so each fetch re-transforms.
    const { clearCache } = useAnimations();
    clearCache();
  });

  it("derives switch:true and a switches[] array for a switch interaction", async () => {
    mockRest({
      animations: [
        {
          id: "a1",
          animation_key: "animationDirectionSelectivity",
          title: "Direction selectivity",
          interaction_type: "switch",
          config: { loop: true },
        },
      ],
      variants: [
        { animation_id: "a1", variant_label: "Prefered", order_index: 0 },
        { animation_id: "a1", variant_label: "Null", order_index: 1 },
      ],
    });

    const { fetchAnimations, getAnimation } = useAnimations();
    await fetchAnimations();
    const anim = getAnimation("animationDirectionSelectivity");

    expect(anim.switch).toBe(true);
    expect(anim.switches).toEqual(["Prefered", "Null"]);
  });

  it("sets switch:true even before variants are backfilled (code fix works without data)", async () => {
    mockRest({
      animations: [
        {
          id: "a2",
          animation_key: "animationRodVsConeCircuits",
          title: "Rod vs cone",
          interaction_type: "switch",
          config: {},
        },
      ],
      variants: [], // variant table still empty in prod
    });

    const { fetchAnimations, getAnimation } = useAnimations();
    await fetchAnimations();
    const anim = getAnimation("animationRodVsConeCircuits");

    expect(anim.switch).toBe(true);
    expect(anim.switches).toBeUndefined();
  });

  it("does NOT set switch on non-switch animations", async () => {
    mockRest({
      animations: [
        {
          id: "a3",
          animation_key: "animationEyeStructur",
          title: "Eye structure",
          interaction_type: "click_states",
          config: { clickTriggered: true },
        },
      ],
    });

    const { fetchAnimations, getAnimation } = useAnimations();
    await fetchAnimations();
    const anim = getAnimation("animationEyeStructur");

    expect(anim.switch).toBeUndefined();
  });

  it("partitions states by is_highlight_state (states vs statesHighlight)", async () => {
    // Guards the transform contract the seed script depends on (#2/#5).
    mockRest({
      animations: [
        {
          id: "a4",
          animation_key: "animationPhototransduction",
          title: "Phototransduction",
          interaction_type: "fullscreen_states",
          config: {},
        },
      ],
      states: [
        {
          animation_id: "a4",
          state_label: "Step 1",
          state_description: "Rod is in the dark",
          order_index: 0,
          is_highlight_state: false,
        },
        {
          animation_id: "a4",
          state_label: "Rhodopsin",
          order_index: 100,
          is_highlight_state: true,
        },
      ],
    });

    const { fetchAnimations, getAnimation } = useAnimations();
    await fetchAnimations();
    const anim = getAnimation("animationPhototransduction");

    // Regular state uses state_description || state_label.
    expect(anim.states).toEqual(["Rod is in the dark"]);
    // Highlight uses state_label.
    expect(anim.statesHighlight).toEqual(["Rhodopsin"]);
  });
});
