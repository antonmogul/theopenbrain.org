/*
 * Chapter authors for the intro block (OPENBRAIN-33).
 *
 * The Retina's author lines used to be hardcoded in TextComp behind an
 * `isChapter1` route check. Authors are chapter data, so they resolve like
 * the cover and the ramp: modules.authors (migration 20260911000200) →
 * code-side map by slug → none. Any chapter with authors renders them; a
 * chapter without them renders nothing.
 *
 * Shape: [{ name, affiliation, url?, photo? }]
 *
 * `url` is the author's lab site and `photo` a picture of their face
 * (OPENBRAIN-197; Stuart, 11 Nov: "add a circle to the left of the
 * name/affiliation with the face. And when clicked on, should take you to
 * the author's lab site. I'll get Maura to work on face images."). Both are
 * data: on the author's entry in modules.authors (migration
 * 20261117197000_author_links.sql writes the links), else from
 * AUTHOR_PROFILES below by name, so a link shows before that migration is
 * pushed and an entry the chapter editor wrote without one still has it.
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
    {
      name: "Erik Cook",
      affiliation:
        "Department of Physiology, McGill University, Montreal, Canada",
    },
  ],
});

/*
 * What the book knows about each author, by name: the lab site Stuart
 * gave (11 Nov) and the face. `photo` is a path under public/, by
 * convention /publicAssets/images/authors/<first>-<last>.webp, square, at
 * least 192px; null until Maura's pictures arrive, and the reader shows
 * the author's initials in the chapter colour meanwhile. To add a face,
 * drop the file there and set its path here (or on the author's entry in
 * modules.authors, which wins).
 */
export const AUTHOR_PROFILES = Object.freeze({
  "Stuart Trenholm": { url: "https://www.trenholmlab.com", photo: null },
  "Naguib Mechawar": {
    url: "https://douglas.research.mcgill.ca/naguib-mechawar",
    photo: null,
  },
  "Arjun Krishnaswamy": { url: "https://www.swamylab.com/", photo: null },
  "Erik Cook": {
    url: "https://www.mcgill.ca/physiology/directory/core-faculty/erik-cook",
    photo: null,
  },
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

/* Only a web address may become a link: the value is chapter data. */
function webUrl(value) {
  if (typeof value !== "string") return "";
  const url = value.trim();
  return /^https?:\/\/[^\s]+$/i.test(url) ? url : "";
}

/* A picture: a path on this site or a web address. */
function photoSrc(value) {
  if (typeof value !== "string") return "";
  const src = value.trim();
  return /^\/(?!\/)[^\s]+$/.test(src) ? src : webUrl(src);
}

/** "Stuart Trenholm" → "ST"; "Santiago Ramón y Cajal" → "SC". */
export function authorInitials(name) {
  const words = String(name || "")
    .trim()
    .split(/\s+/)
    .filter((w) => /^\p{Lu}/u.test(w));
  if (!words.length)
    return String(name || "")
      .trim()
      .slice(0, 1)
      .toUpperCase();
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/**
 * The chapter's authors as the reader shows them: each with its lab site,
 * face and initials resolved (the entry's own `url` / `photo`, else
 * AUTHOR_PROFILES by name, else none).
 *
 * @returns {Array<{ name, affiliation, url, photo, initials }>}
 */
export function authorCardsForModule(module) {
  return authorsForModule(module).map((author) => {
    const name = author.name.trim();
    const profile = AUTHOR_PROFILES[name] || {};
    return {
      name,
      affiliation:
        typeof author.affiliation === "string" ? author.affiliation.trim() : "",
      url: webUrl(author.url) || webUrl(profile.url),
      photo: photoSrc(author.photo) || photoSrc(profile.photo),
      initials: authorInitials(name),
    };
  });
}
