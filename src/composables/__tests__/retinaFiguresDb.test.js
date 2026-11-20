import { beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "@/__tests__/fixtures/retinaFiguresDb.json";
import legacy from "@/assets/json_backend/animations.json";
import { useAnimations } from "../useAnimations";
import { apiRequest } from "@/services/api/client";
vi.mock("@/services/api/client", () => ({ apiRequest: vi.fn() }));

// Reviewed differences are authoritative DB edits (19 Nov), not missing data.
const reviewed = {
  animationDragon: ["title"],
  animationEyeStructur: ["states"],
  animationPupillaryLightreflex: ["states"],
  animationPhototransduction: ["infoText", "states"],
  animationTheVisualCycle: ["infoText", "states"],
  animationSynapticArchitecture: ["states"],
  animationRetinalCellTypes: ["states"],
  animationCenterSurroundReceptiveFields: ["legend"],
  animationDirectionSelectivity: ["legend"],
  animationObjectMotionSensitivity: ["legend"],
  animationRodVsConeCircuits: ["legend"],
  animationLightSensitiveGanglionCells: ["legend"],
  animationPlaceholder: ["title"],
};

beforeEach(() => {
  useAnimations().clearCache();
});
async function records(migrated) {
  apiRequest.mockImplementation(async (endpoint) => {
    const table = endpoint.split("?")[0];
    const rows = structuredClone(fixture[table]);
    if (table === "animations" && migrated)
      rows
        .filter((r) => r.config.flip && !Object.hasOwn(r.config, "states"))
        .forEach((r) => {
          r.config.states = [];
        });
    return table === "animations"
      ? rows
      : rows.sort((a, b) => a.order_index - b.order_index);
  });
  const loader = useAnimations();
  await loader.fetchAnimations();
  return loader.animations.value;
}

describe("Retina database figure inventory", () => {
  it.each([false, true])(
    "supplies every legacy display field and interaction before/after SQL (migrated=%s)",
    async (migrated) => {
      const list = await records(migrated);
      expect(list).toHaveLength(legacy.animations.length);
      for (const source of legacy.animations) {
        const record = list.find((r) => r.id === source.id);
        expect(record, source.id).toBeTruthy();
        for (const [key, value] of Object.entries(source)) {
          // Empty states are behaviorally absent; SQL makes the emptiness explicit.
          if (
            !migrated &&
            key === "states" &&
            Array.isArray(value) &&
            !value.length
          ) {
            expect(record.states).toBeUndefined();
            continue;
          }
          if ((reviewed[source.id] || []).includes(key)) {
            expect(record[key], `${source.id}.${key}`).toBeDefined();
            continue;
          }
          expect(record[key], `${source.id}.${key}`).toEqual(value);
        }
      }
      expect(list.find((r) => r.id === "animationEyeStructur").states).toEqual([
        "Cornea",
        "Aqueous humour",
        "Iris",
        "Pupil",
        "Lens",
        "Ciliary muscle",
        "Vitreous humour",
        "Retina",
        "Fovea",
        "Choroid",
        "Sclera",
        "Optic nerve",
      ]);
      expect(
        list.find((r) => r.id === "animationWavesOfActivity").youtubeID
      ).toBe("k0_HXpcH4zI");
    }
  );
});
