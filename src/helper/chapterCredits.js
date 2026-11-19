/*
 * A chapter's credits (OPENBRAIN-200): who funded it, shown under its
 * authors, and its acknowledgements, shown at the end above the
 * references. Stuart, 17 Nov: "underneath the authors, let's put funding
 * info … along with this logo, linked to https://www.mcgill.ca/neuro/",
 * and "at the bottom, above references, an acknowledgements section".
 *
 * Credits are chapter data and resolve like the authors
 * (helper/chapterAuthors.js): the module row's own `funding` /
 * `acknowledgements` once a migration adds those columns, else the map
 * below by slug, else nothing. A chapter without credits shows neither
 * block.
 *
 * Shapes:
 *   funding:          { text, url?, logo?: { src, alt, width, height } }
 *   acknowledgements: [paragraph, …] (plain text)
 */
export const CREDITS_BY_SLUG = Object.freeze({
  "the-retina": {
    funding: {
      text: "This chapter was funded by the Vision Science Research Network.",
      url: "https://visionnetwork.ca/",
      logo: {
        src: "/publicAssets/images/funders/vision-science-research-network.webp",
        alt: "Vision Science Research Network",
        width: 758,
        height: 229,
      },
    },
  },
  "foundations-of-neuroscience": {
    funding: {
      text: "This chapter was funded by The Montreal Neurological Institute (The Neuro).",
      url: "https://www.mcgill.ca/neuro/",
      logo: {
        src: "/publicAssets/images/funders/the-neuro.webp",
        alt: "The Neuro, Montreal Neurological Institute-Hospital",
        width: 640,
        height: 219,
      },
    },
    // Studio Malpeso's people by first name: the book has no surnames for
    // them (the authors' data and the deck's team list carry first names).
    acknowledgements: [
      "Web development by Mogul (Anton Morrison). Graphic design by Studio Malpeso (Sonia, Maura, Karen and Naz). We thank Dr. Joseph Rochford for peer review. ST acknowledges funding from the Canada Research Chairs program.",
    ],
  },
});

/* Only a web address may become a link: the value is chapter data. */
function webUrl(value) {
  if (typeof value !== "string") return "";
  const url = value.trim();
  return /^https?:\/\/[^\s]+$/i.test(url) ? url : "";
}

/* A picture: a path on this site or a web address. */
function imageSrc(value) {
  if (typeof value !== "string") return "";
  const src = value.trim();
  return /^\/(?!\/)[^\s]+$/.test(src) ? src : webUrl(src);
}

function cleanFunding(funding) {
  if (!funding || typeof funding !== "object") return null;
  const text = typeof funding.text === "string" ? funding.text.trim() : "";
  if (!text) return null;
  const logoSrc = imageSrc(funding.logo?.src);
  return {
    text,
    url: webUrl(funding.url),
    logo: logoSrc
      ? {
          src: logoSrc,
          alt: String(funding.logo.alt || "").trim(),
          width: Number(funding.logo.width) || undefined,
          height: Number(funding.logo.height) || undefined,
        }
      : null,
  };
}

function cleanParagraphs(value) {
  const list = typeof value === "string" ? [value] : value;
  if (!Array.isArray(list)) return [];
  return list
    .filter((p) => typeof p === "string")
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * The chapter's credits as the reader shows them.
 *
 * @returns {{ funding: object|null, acknowledgements: string[] }}
 */
export function creditsForModule(module) {
  const fallback = (module && CREDITS_BY_SLUG[module.slug]) || {};
  const funding =
    cleanFunding(module?.funding) || cleanFunding(fallback.funding);
  const own = cleanParagraphs(module?.acknowledgements);
  return {
    funding,
    acknowledgements: own.length
      ? own
      : cleanParagraphs(fallback.acknowledgements),
  };
}
