import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import HighlightToolbar from "@/components/chapter/HighlightToolbar.vue";

// The database is ready for sharing (HighlightToolbar.share.test.js has the gate).
vi.mock("@/composables/useTrendingSharing", async () => {
  const { ref } = await import("vue");
  return { useTrendingSharing: () => ({ sharingReady: ref(true) }) };
});

// Above a highlight, the edit toolbar (pill + the "Share with
// readers" row, ~111px) was placed by a top edge guessed for the 40px pill,
// so the share row covered the passage. useTextSelection now gives the
// bottom edge (position.above) and the toolbar lifts itself by its own
// rendered height.
const mountToolbar = (position) =>
  mount(HighlightToolbar, {
    props: {
      visible: true,
      position,
      mode: "edit",
      activeHighlight: { id: "h1", paragraph_id: "p1", tags: [] },
    },
    global: { stubs: { Teleport: true, Transition: false } },
  });

const source = readFileSync(
  resolve(__dirname, "../HighlightToolbar.vue"),
  "utf8"
);
const rule = (selector) => {
  const at = source.indexOf(`${selector} {`);
  return at < 0 ? "" : source.slice(at, source.indexOf("}", at));
};

describe("HighlightToolbar placement", () => {
  it("grows upward from position.y when it sits above the passage", () => {
    const w = mountToolbar({ x: 120, y: 660, above: true });
    const bar = w.get('[data-testid="highlight-toolbar"]');
    expect(bar.classes()).toContain("is-above");
    expect(bar.attributes("style")).toContain("top: 660px");
    // The share row is part of what it lifts.
    expect(w.find('[data-testid="share-row"]').exists()).toBe(true);
  });

  it("hangs down from position.y when it sits under the passage", () => {
    const w = mountToolbar({ x: 120, y: 340, above: false });
    expect(w.get('[data-testid="highlight-toolbar"]').classes()).not.toContain(
      "is-above"
    );
  });

  // happy-dom has no layout, so the lift itself is held by its CSS: its own
  // height (translate's %), not a guess, and the pill nearest the passage.
  it("lifts itself by its rendered height, pill nearest the passage", () => {
    const above = rule(".hl-toolbar.is-above");
    expect(above).toMatch(/translate:\s*0\s+-100%/);
    expect(above).toMatch(/flex-direction:\s*column-reverse/);
  });
});
