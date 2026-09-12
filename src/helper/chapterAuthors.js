/*
 * Chapter authors for the intro block (OPENBRAIN-33).
 *
 * The Retina's author lines used to be hardcoded in TextComp behind an
 * `isChapter1` route check. Authors are chapter data, so they resolve like
 * the cover and the ramp: modules.authors (migration 20260911000200) →
 * code-side map by slug → none. Any chapter with authors renders them; a
 * chapter without them renders nothing.
 *
 * Shape: [{ name, affiliation }]
 */
export const AUTHORS_BY_SLUG = Object.freeze({
  "the-retina": [
    {
      name: "Arjun Krishnaswamy",
      affiliation:
        "Department of Physiology, McGill University, Montreal, Canada",
    },
    {
      name: "Stuart Trenholm",
      affiliation:
        "Montreal Neurological Institute, McGill University, Montreal, Canada",
    },
  ],
  "attention-and-working-memory": [
    {
      name: "Arjun Krishnaswamy",
      affiliation:
        "Department of Physiology, McGill University, Montreal, Canada",
    },
  ],
});

function isAuthorList(value) {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((a) => a && typeof a.name === "string" && a.name.trim())
  );
}

export function authorsForModule(module) {
  if (!module || typeof module !== "object") return [];
  if (isAuthorList(module.authors)) return module.authors;
  return AUTHORS_BY_SLUG[module.slug] || [];
}
