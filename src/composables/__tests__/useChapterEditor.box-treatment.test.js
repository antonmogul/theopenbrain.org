/*
 * A breakout box's colour (OPENBRAIN-157): setBoxTreatment writes
 * sections.box_treatment through patchSection, keeps the RLS guard (a
 * refused update comes back as 0 rows), and records an undo.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/api/client", () => ({ authedRequest: vi.fn() }));
import { authedRequest } from "@/services/api/client";
import { useChapterEditor } from "@/composables/useChapterEditor";

function api({ refuse = false } = {}) {
  const patches = [];
  const sections = [
    { id: "s1", slug: "intro", title: "Intro", order_index: 0 },
    {
      id: "b1",
      slug: "box-descartes",
      title: "Descartes",
      order_index: 1,
      box_treatment: "dark",
    },
  ];
  authedRequest.mockImplementation(async (path, init = {}) => {
    if (path.startsWith("modules?"))
      return [{ id: "m1", slug: "s", status: "draft" }];
    if (path.startsWith("sections?module_id"))
      return sections.map((s) => ({ ...s }));
    if (path.startsWith("animations?")) return [];
    if (path.startsWith("paragraphs?")) return [];
    if (init.method === "PATCH" && path.startsWith("sections?id=eq.")) {
      const id = path.slice("sections?id=eq.".length);
      const body = JSON.parse(init.body);
      patches.push({ id, ...body });
      if (refuse) return [];
      const row = sections.find((s) => s.id === id);
      Object.assign(row, body);
      return [{ ...row }];
    }
    return [];
  });
  return { patches, sections };
}

const box = (ed) => ed.sections.value.find((s) => s.id === "b1");

describe("useChapterEditor.setBoxTreatment (OPENBRAIN-157)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stores the choice on the section, shows it at once, and undo puts the old one back", async () => {
    const { patches, sections } = api();
    const ed = useChapterEditor("s");
    await ed.load();
    await ed.setBoxTreatment("b1", "plate");
    expect(patches).toHaveLength(1);
    expect(patches[0]).toMatchObject({ id: "b1", box_treatment: "plate" });
    expect(sections[1].box_treatment).toBe("plate");
    expect(box(ed).box_treatment).toBe("plate");
    expect(ed.undoStack.value.at(-1).label).toBe("Box colour");

    await ed.undo();
    expect(patches).toHaveLength(2);
    expect(patches[1].box_treatment).toBe("dark");
    expect(box(ed).box_treatment).toBe("dark");
    expect(ed.undoStack.value).toHaveLength(0);
  });

  it("Automatic (null or the select's empty value) clears the column", async () => {
    const { patches, sections } = api();
    const ed = useChapterEditor("s");
    await ed.load();
    await ed.setBoxTreatment("b1", "");
    expect(patches[0].box_treatment).toBeNull();
    expect(sections[1].box_treatment).toBeNull();
    await ed.setBoxTreatment("b1", null);
    expect(patches[1].box_treatment).toBeNull();
    await ed.undo();
    await ed.undo();
    expect(sections[1].box_treatment).toBe("dark");
  });

  it("normalises the name and reads the old `violet` as the chapter panel", async () => {
    const { patches } = api();
    const ed = useChapterEditor("s");
    await ed.load();
    await ed.setBoxTreatment("b1", " Chapter ");
    expect(patches[0].box_treatment).toBe("chapter");
    await ed.setBoxTreatment("b1", "violet");
    expect(patches[1].box_treatment).toBe("chapter");
  });

  it("refuses a name that isn't a treatment before any request", async () => {
    const { patches } = api();
    const ed = useChapterEditor("s");
    await ed.load();
    await expect(ed.setBoxTreatment("b1", "magenta")).rejects.toThrow(
      /box colours/
    );
    await expect(ed.setBoxTreatment("b1", "neon")).rejects.toThrow();
    expect(patches).toHaveLength(0);
    expect(ed.undoStack.value).toHaveLength(0);
  });

  it("only colours a breakout box", async () => {
    const { patches } = api();
    const ed = useChapterEditor("s");
    await ed.load();
    await expect(ed.setBoxTreatment("s1", "dark")).rejects.toThrow(
      /breakout box/i
    );
    expect(patches).toHaveLength(0);
  });

  it("reports a refused save (0 rows) and records no undo", async () => {
    const { sections } = api({ refuse: true });
    const ed = useChapterEditor("s");
    await ed.load();
    await expect(ed.setBoxTreatment("b1", "plate")).rejects.toThrow(
      /didn't allow/
    );
    expect(sections[1].box_treatment).toBe("dark");
    expect(box(ed).box_treatment).toBe("dark");
    expect(ed.undoStack.value).toHaveLength(0);
  });
});
