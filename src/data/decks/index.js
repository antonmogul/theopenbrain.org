/**
 * The decks that ship in the bundle, what a new deck can start from, and the
 * Add-slide gallery (OPENBRAIN-129).
 *
 * BUNDLED_DECKS backs /deck/templates, and /deck when the database has no
 * pinned deck (or can't be reached): see useDeckSource. STARTERS are the New
 * deck dialog's "Start from" choices; each `entries()` returns fresh copies.
 * GALLERY is the Add-slide dialog's tabs: a blank slide per layout, the
 * templates, and the funding deck's slides. The editor gives a picked slide
 * a fresh id with cloneEntry().
 */
import { FUNDING_DECK } from "./funding.js";
import { DECK_TEMPLATES } from "./templates.js";
import { LAYOUT_GROUPS, LAYOUT_SCHEMAS } from "./fields.js";
import { deepClone, defaultsFor, newSlideId } from "./validate.js";

export const BUNDLED_DECKS = {
  funding: { title: "The Open Brain — Funding deck", entries: FUNDING_DECK },
  templates: {
    title: "The Open Brain — Slide templates",
    entries: DECK_TEMPLATES,
  },
};

const TEMPLATE_PREFIX = /^T\d+ · /;

/** Keyed by id, in the dialog's order: blank, funding, templates. */
export const STARTERS = {
  blank: {
    id: "blank",
    label: "Blank",
    description: "One title slide to build from.",
    entries: () => [
      {
        id: newSlideId(),
        label: "Title",
        layout: "hero",
        props: {
          ...defaultsFor("hero"),
          brand: true,
          size: "display",
          title: "Deck title",
        },
      },
    ],
  },
  funding: {
    id: "funding",
    label: "Copy of the funding deck",
    description: `The bundled October copy, ${FUNDING_DECK.length} slides.`,
    entries: () => deepClone(FUNDING_DECK),
  },
  templates: {
    id: "templates",
    label: "Every template",
    description: `All ${DECK_TEMPLATES.length} slide templates, with placeholder copy.`,
    entries: () =>
      deepClone(DECK_TEMPLATES).map((e) => ({
        ...e,
        label: e.label.replace(TEMPLATE_PREFIX, ""),
      })),
  },
};

// A blank slide per layout, grouped Funding / Templates.
const layoutGroups = LAYOUT_GROUPS.map((group) => ({
  label: group,
  entries: Object.entries(LAYOUT_SCHEMAS)
    .filter(([, schema]) => schema.group === group)
    .map(([layout, schema]) => ({
      id: `layout-${layout.toLowerCase()}`,
      label: schema.label,
      layout,
      props: defaultsFor(layout),
    })),
}));

/**
 * The Add-slide dialog's tabs: { id, label, groups: [{ label, entries }],
 * entries } (`entries` is every group's, flattened).
 */
export const GALLERY = [
  {
    id: "layouts",
    label: "Layouts",
    groups: layoutGroups,
    entries: layoutGroups.flatMap((g) => g.entries),
  },
  {
    id: "templates",
    label: "Templates",
    groups: [{ label: "Templates", entries: DECK_TEMPLATES }],
    entries: DECK_TEMPLATES,
  },
  {
    id: "funding",
    label: "From the funding deck",
    groups: [{ label: "Funding deck", entries: FUNDING_DECK }],
    entries: FUNDING_DECK,
  },
];
