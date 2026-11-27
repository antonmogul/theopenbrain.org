// Pending OPENBRAIN-98 content, separately labelled from the published export.
import published from "./retinaFullReaderData.json";
import manifest from "../__tests__/fixtures/retinaRailBoxes.json";
export function retinaRailFixture() {
  const fixture = structuredClone(published);
  for (const box of manifest.boxes) {
    const parent = fixture.sections.find((s) => s.slug === box.parentSlug);
    const id = `retina-section-${box.slug}`;
    fixture.sections.push({
      ...box,
      id,
      module_id: fixture.module.id,
      parent_section_id: parent.id,
      anchor_paragraph_id: `${parent.id}-p${box.anchorOrder}`,
    });
    for (const move of manifest.moves.filter((m) => m.to === box.id)) {
      const p = fixture.paragraphs.find(
        (p) => p.section_id === parent.id && p.order_index === move.beforeOrder
      );
      p.section_id = id;
      p.order_index = move.order;
      p.subsection_level = 0;
      p.is_subsection_header = false;
      for (const block of p.content.blocks)
        if (block.type === "widget" || block.type === "break_section")
          block.railPart = true;
      // Preserve the source fixture ID too: jumps must survive the move.
      if (box.slug === "box-colour-vision" && move.order === 0)
        p.content.blocks = p.content.blocks.filter(
          (b) => b.type !== "break_section"
        );
      if (box.slug === "box-colour-vision" && move.order === 1) {
        const block = p.content.blocks.find((b) => b.type === "widget");
        for (const [i, [part, title]] of manifest.parts.entries()) {
          if (i === 0) {
            block.part = part;
            block.title = title;
            continue;
          }
          fixture.paragraphs.push({
            ...p,
            id: `${id}-part-${part}`,
            order_index: i + 1,
            content: {
              blocks: [
                {
                  ...block,
                  part,
                  title,
                  placementId: `retina-color-vision-${part}`,
                },
              ],
            },
          });
        }
      }
    }
  }
  fixture.boundary =
    "Pending Retina rail migration preview on the published fixture; not a deployed content claim.";
  return fixture;
}
