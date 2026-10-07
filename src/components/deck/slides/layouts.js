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
