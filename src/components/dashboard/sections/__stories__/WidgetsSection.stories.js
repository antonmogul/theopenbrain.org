/*
 * Dashboard/Sections/WidgetsSection — the widget library with where each
 * widget is used (OPENBRAIN-71). The catalog is the real one; usage comes
 * from the mocked API: phrenology as a text block in History, case files
 * as a panel figure, and the Retina's code placements.
 */
import WidgetsSection from "../WidgetsSection.vue";

const api = {
  "modules?": [
    {
      id: "m1",
      title: "Foundations of Neuroscience",
      slug: "foundations-of-neuroscience",
    },
    { id: "m2", title: "The Retina", slug: "the-retina" },
    {
      id: "m3",
      title: "Attention and Working Memory",
      slug: "attention-and-working-memory",
    },
  ],
  "sections?": [
    {
      id: "s1",
      module_id: "m1",
      title: "Do different parts of the brain do different things?",
    },
  ],
  "paragraphs?content=cs": [
    {
      id: "p1",
      section_id: "s1",
      content: { blocks: [{ type: "widget", widgetId: "phrenology" }] },
    },
  ],
  "animations?media_type=eq.widget": [
    { id: "w1", config: { widgetId: "case-cabinet" } },
  ],
  "paragraphs?animation_id": [
    { id: "p2", section_id: "s1", animation_id: "w1" },
  ],
};

export default {
  title: "Dashboard/Sections/WidgetsSection",
  component: WidgetsSection,
  parameters: { layout: "padded", api, auth: { role: "creator" } },
};

export const Default = {};
