/**
 * Paths into a deck entry, as validation problems and form updates spell
 * them (OPENBRAIN-129): relative to the entry, dot-separated, list items by
 * index, e.g. "label", "props.title", "props.people.2.name".
 */
import { LAYOUT_SCHEMAS } from "@/data/decks/fields.js";

const ENTRY_FIELDS = {
  label: "Label",
  layout: "Layout",
  notes: "Speaker notes",
  hidden: "Hide when presenting",
  id: "Slide id",
};

/** The path of a key beside the one at `path` ("props.screens.0.src" → "props.screens.0.alt"). */
export const siblingPath = (path, key) =>
  `${path.slice(0, path.lastIndexOf(".") + 1)}${key}`;

/**
 * A path in words, from the layout's field labels: "props.people.2.name"
 * on a team slide is "People 3 › Name".
 */
export function fieldLabel(layout, path) {
  if (!path) return "";
  const [head, ...rest] = path.split(".");
  if (head !== "props") return ENTRY_FIELDS[head] || head;
  let fields = LAYOUT_SCHEMAS[layout]?.fields;
  const names = [];
  for (const key of rest) {
    if (/^\d+$/.test(key) && names.length) {
      names[names.length - 1] += ` ${Number(key) + 1}`;
      continue;
    }
    const descriptor = fields?.[key];
    names.push(descriptor?.label || key);
    fields = descriptor?.of || descriptor?.fields;
  }
  return names.join(" › ");
}

/** Problems at exactly `path`, errors first. */
export function problemsAt(problems, path) {
  return (problems || [])
    .filter((p) => p.path === path)
    .sort((a, b) => (a.level === b.level ? 0 : a.level === "error" ? -1 : 1));
}

/**
 * Provided by the deck editor: { updateEntry(slideId, path, value),
 * selectedId(), entryOf(slideId) }. A field whose write finishes after its
 * form is gone (an upload still running when another slide was selected)
 * writes through it, by slide id.
 */
export const DECK_UPDATE_ENTRY = Symbol("deckUpdateEntry");
