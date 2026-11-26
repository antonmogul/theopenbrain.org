/* Read the prose DOM, never the surrounding reader/figure UI. No mutations,
 * layout reads or speech side effects: callers choose the starting passage. */
const OMIT =
  'script, style, button, input, select, textarea, nav, figure, figcaption, [hidden], [aria-hidden="true"], .sr-only, [data-reader-end], .chapter-front-credits, .reference-list, .ref-list-box, [data-section-slug="references"], .footnotes, .illustration-inline, [data-listen-skip]';
const HEADING = "h1, h2.subChapter, h3.subT, .bx-title, .rp-title";

function proseText(element) {
  const copy = element.cloneNode(true);
  copy.querySelectorAll(OMIT).forEach((node) => node.remove());
  // Citation superscripts only: keep scientific powers such as x².
  copy.querySelectorAll("sup").forEach((node) => {
    if (/^[\s\d,;[\]()–—-]+$/.test(node.textContent)) node.remove();
  });
  copy.querySelectorAll("br").forEach((node) => node.replaceWith(" "));
  copy.querySelectorAll("p, li, h1, h2, h3, h4, h5, h6").forEach((node) => {
    node.append(" ");
  });
  return (copy.textContent || "").replace(/\s+/g, " ").trim();
}

/** Entries retain their source element for highlighting and readerJump. A
 * desktop box is teleported out of #text: visit it at its in-flow slot. */
export function extractChapterSpeech(root, { includeBoxes = true } = {}) {
  if (!root) return [];
  const entries = [];
  const visited = new Set();
  const walk = (element) => {
    if (visited.has(element) || element.matches(OMIT)) return;
    visited.add(element);
    const boxId = element.getAttribute("data-listen-box-slot");
    if (boxId !== null) {
      if (!includeBoxes) return;
      const box = [
        ...root.ownerDocument.querySelectorAll("[data-breakout-box]"),
      ].find((node) => node.getAttribute("data-breakout-box") === boxId);
      if (box) {
        walk(box);
        return;
      }
    }
    if (!includeBoxes && element.matches("[data-breakout-box], .bx")) return;
    if (element.matches("[data-paragraph-id], " + HEADING)) {
      const text = proseText(element);
      if (text)
        entries.push({
          element,
          text,
          kind: element.matches(HEADING) ? "heading" : "paragraph",
        });
      return;
    }
    for (const child of element.children) walk(child);
  };
  walk(root);
  return entries;
}

/** First passage intersecting the reading line, otherwise the next one.
 * Rects are supplied so this choice stays pure and testable. */
export function speechStartIndex(rects, line) {
  const index = rects.findIndex((rect) => rect.bottom > line);
  return index < 0 ? Math.max(0, rects.length - 1) : index;
}

/** Sentence-sized utterances, bounded even for long unpunctuated prose.
 * Keep a strong reference to each one in the player until it ends (Safari). */
export function speechChunks(text, limit = 220) {
  const sentences = text.match(/[\s\S]+?(?:[.!?]+(?=\s|$)|$)/g) || [text];
  return sentences.flatMap((sentence) => {
    const chunks = [];
    let rest = sentence.trim();
    while (rest.length > limit) {
      const space = rest.lastIndexOf(" ", limit);
      const cut = space > limit / 2 ? space : limit;
      chunks.push(rest.slice(0, cut).trim());
      rest = rest.slice(cut).trim();
    }
    if (rest) chunks.push(rest);
    return chunks;
  });
}

/*
 * The Listen panel's voice list (OPENBRAIN-92; Maura, 25 Nov: "keep a
 * smaller voice library").
 *
 * The panel offers every English voice the device has. A Mac has 43, most
 * of them novelties (Bells, Boing, Zarvox, eight Eloquence voices twice
 * over), and Chrome adds three of its own. The short list keeps the few a
 * reader would choose, by name, since every device has a different set.
 *
 * 0 offers every voice. Four since 26 Nov (Maura's note d62a283f, approved
 * by Anton): the preferred voices the device has, then its other voices.
 */
export const LISTEN_VOICE_LIMIT = 4;

// The voices worth offering, best first. A device has only some of them:
// Apple's (macOS, iOS), Chrome's, then Microsoft's (Windows, Edge).
const PREFERRED_VOICES = [
  /^Samantha\b/i, // en-US
  /^Daniel\b/i, // en-GB
  /^Karen\b/i, // en-AU
  /^Google US English/i,
  /^Google UK English Female/i,
  /^Google UK English Male/i,
  /^Moira\b/i, // en-IE
  /^Microsoft (?:Aria|Jenny|Sonia|Guy|Ryan|Libby)\b/i,
];
// Apple's novelty and Eloquence voices: never chosen to fill the list.
const NOVELTY_VOICES =
  /^(?:Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Wobble|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Zarvox|Fred|Junior|Kathy|Ralph|Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley)\b/i;

/**
 * At most `limit` of a device's voices, in the device's order: the reader's
 * saved voice first of all (a choice is never taken away), then the
 * preferred names, the device's default, and any voice that is not a
 * novelty. `limit` 0, or a device with no more than `limit`, gives them all.
 * @param {Array<{ voiceURI: string, name: string, default?: boolean }>} voices
 * @param {{ limit?: number, keep?: string }} [options] keep: a voiceURI
 */
export function shortVoiceList(
  voices,
  { limit = LISTEN_VOICE_LIMIT, keep = "" } = {}
) {
  if (!limit || voices.length <= limit) return voices;
  const picked = new Set();
  const add = (voice) => {
    if (voice && picked.size < limit) picked.add(voice);
  };
  add(voices.find((v) => keep && v.voiceURI === keep));
  for (const name of PREFERRED_VOICES)
    add(voices.find((v) => name.test(v.name)));
  add(voices.find((v) => v.default));
  for (const v of voices) if (!NOVELTY_VOICES.test(v.name)) add(v);
  for (const v of voices) add(v);
  return voices.filter((v) => picked.has(v));
}
