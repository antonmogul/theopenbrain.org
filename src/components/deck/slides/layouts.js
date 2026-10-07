/**
 * Slide layouts by the name deck data uses (src/data/decks/*.js). The main
 * deck uses the first six; the rest are the templates at /deck/templates.
 */
import HeroSlide from "./HeroSlide.vue";
import TeamSlide from "./TeamSlide.vue";
import VideoSlide from "./VideoSlide.vue";
import AudienceSlide from "./AudienceSlide.vue";
import TrajectorySlide from "./TrajectorySlide.vue";
import RoleSlide from "./RoleSlide.vue";
import SectionSlide from "./SectionSlide.vue";
import TextSlide from "./TextSlide.vue";
import ColumnsSlide from "./ColumnsSlide.vue";
import StatementSlide from "./StatementSlide.vue";
import ImageTextSlide from "./ImageTextSlide.vue";
import FiguresSlide from "./FiguresSlide.vue";
import ScreenSlide from "./ScreenSlide.vue";
import PhonesSlide from "./PhonesSlide.vue";
import DevicesSlide from "./DevicesSlide.vue";
import QuoteSlide from "./QuoteSlide.vue";
import { normalizeSlide } from "@/data/decks/validate.js";

export const SLIDE_LAYOUTS = {
  hero: HeroSlide,
  team: TeamSlide,
  video: VideoSlide,
  audience: AudienceSlide,
  trajectory: TrajectorySlide,
  role: RoleSlide,
  section: SectionSlide,
  text: TextSlide,
  columns: ColumnsSlide,
  statement: StatementSlide,
  imageText: ImageTextSlide,
  figures: FiguresSlide,
  screen: ScreenSlide,
  phones: PhonesSlide,
  devices: DevicesSlide,
  quote: QuoteSlide,
};

/** Deck data entries → DeckStage slides. Throws on an unknown layout. */
export function toSlides(entries) {
  return entries.map(({ layout, ...entry }) => {
    const component = SLIDE_LAYOUTS[layout];
    if (!component) throw new Error(`Unknown slide layout "${layout}"`);
    return { ...entry, component };
  });
}

/**
 * Deck entries from the database → DeckStage slides, without ever throwing
 * (OPENBRAIN-129). Each entry is normalised (validate.js); hidden ones are
 * skipped. An entry that can't be shown (not an object, an unknown layout)
 * is skipped with a console.warn in `public` mode, so a funder never sees a
 * broken slide; in `draft` mode (the creator's presenter) it becomes a
 * section slide saying what is wrong. `problems` lists those entries.
 * DeckStage keys slides by id, so a missing or repeated id (possible in a
 * draft) gets a unique stand-in.
 */
export function safeSlides(entries, { mode = "public" } = {}) {
  const slides = [];
  const problems = [];
  const used = new Set();
  const uniqueId = (id, index) => {
    let key = id || `slide-${index + 1}`;
    for (let n = 2; used.has(key); n += 1) key = `${id || "slide"}-${n}`;
    used.add(key);
    return key;
  };
  (Array.isArray(entries) ? entries : []).forEach((raw, index) => {
    const slideId = typeof raw?.id === "string" ? raw.id : null;
    try {
      if (!raw || typeof raw !== "object" || Array.isArray(raw))
        throw new Error("The slide is empty.");
      const { layout, ...entry } = normalizeSlide(raw);
      if (entry.hidden === true) return;
      const component = Object.hasOwn(SLIDE_LAYOUTS, layout)
        ? SLIDE_LAYOUTS[layout]
        : null;
      if (!component) throw new Error(`Unknown slide layout "${layout}"`);
      slides.push({ ...entry, id: uniqueId(entry.id, index), component });
    } catch (err) {
      const message = err?.message || String(err);
      problems.push({ slideId, index, message });
      if (mode === "draft")
        slides.push({
          id: uniqueId(slideId, index),
          label: typeof raw?.label === "string" ? raw.label : "Problem",
          component: SectionSlide,
          props: {
            eyebrow: "Problem",
            title: `Slide ${index + 1} can't be shown`,
            lead: message,
          },
        });
      else
        console.warn(
          `[deck] Skipped slide ${index + 1}${slideId ? ` (${slideId})` : ""}: ${message}`
        );
    }
  });
  return { slides, problems };
}
