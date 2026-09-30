/*
 * Links from stories to the Figma design system file (OPENBRAIN-115).
 *
 * "Open Brain — Design System" mirrors the code's tokens and components one
 * to one (see the Guides/Figma docs page). A story file points at its Figma
 * node with `parameters: { design: { url: figmaNode("1-161") } }`; the
 * Figma button in the toolbar (.storybook/manager.js) opens it.
 */
export const FIGMA_FILE =
  "https://www.figma.com/design/NAjmvySrMHLtWYqn2zi4h4/Open-Brain-Design-System";

/** A link to one node; take the id from the node's Figma URL (`node-id=1-161`). */
export const figmaNode = (nodeId) =>
  `${FIGMA_FILE}?node-id=${String(nodeId).replace(":", "-")}`;

/** The nodes that exist today. Add to this as the Figma file grows. */
export const FIGMA_NODES = {
  cover: "2-227",
  foundations: "2-2",
  typeDesktopVsPhone: "10-2",
  layoutGrid: "12-2",
  button: "1-161",
};
