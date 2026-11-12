/*
 * Chapter/Text/BreakoutBox — a breakout box's frame (OPENBRAIN-91). In the
 * reader, from 1024px, it floats full width over the figure pane with its
 * title card holding for a short scroll; here (no stage layer) it shows its
 * in-flow form, as on phones: the pale card, or one of the colour panels
 * (OPENBRAIN-153, 157), chosen by the `treatment` arg (in the reader, by
 * the box's own sections.box_treatment from the chapter editor, else
 * helper/breakoutTreatment.js from the chapter and box slugs).
 */
import BreakoutBox from "../BreakoutBox.vue";
import RailPart from "../RailPart.vue";
import { BOX_TREATMENTS } from "@/helper/breakoutTreatment";
import { STAGE_LAYER_ID } from "@/helper/stageLayer";

export default {
  title: "Chapter/Text/BreakoutBox",
  component: BreakoutBox,
  parameters: { layout: "fullscreen" },
  argTypes: {
    treatment: { control: "select", options: [...BOX_TREATMENTS] },
  },
  args: {
    section: {
      id: "box-descartes",
      slug: "box-descartes",
      title: "Separating mind from body: Descartes and dualism",
    },
    label: "A",
    treatment: "pale",
  },
  render: (args) => ({
    components: { BreakoutBox },
    setup: () => ({ args }),
    template: `
      <div data-chapter="fund" class="chapter-reader" style="padding:40px 24px;background:rgb(var(--color-bg));font-family:var(--font-body);color:rgb(var(--color-ink));">
        <div style="max-width:640px;margin:0 auto;">
          <p style="line-height:1.6">René Descartes, a contemporary of Willis, put forward a different view…</p>
          <BreakoutBox v-bind="args">
            <p style="line-height:1.6;margin:0 0 1rem">Descartes is often credited with popularizing the idea of dualism: that the mind and the body are two distinct substances.<sup class="citation-ref">12</sup></p>
            <blockquote>Wherever his skull is, some of Descartes' bones<br>were laid to rest in St Germain des Prés.</blockquote>
            <p style="line-height:1.6;margin:0">In 1649, Descartes was invited by Queen Christina of Sweden to visit and serve as her tutor.</p>
          </BreakoutBox>
          <p style="line-height:1.6">The main text carries on after the box.</p>
        </div>
      </div>`,
  }),
};

/** A ramp other than the frame's fund: the toolbar's Chapter global sets
 *  <html>, but the frame above carries its own data-chapter, so the ramp
 *  goes on the frame. */
const onRamp = (ramp) => ({
  render: (args) => ({
    components: { BreakoutBox },
    setup: () => ({ args, ramp }),
    template: `
      <div :data-chapter="ramp" class="chapter-reader" style="padding:40px 24px;background:rgb(var(--color-bg));font-family:var(--font-body);color:rgb(var(--color-ink));">
        <div style="max-width:640px;margin:0 auto;">
          <p style="line-height:1.6">The text before the box.</p>
          <BreakoutBox v-bind="args">
            <p style="line-height:1.6;margin:0 0 1rem">An aside in this chapter's own colour, its ink chosen by the ramp so it reads on the teal, red and yellow as well as the violet and blue.<sup class="citation-ref">3</sup></p>
            <blockquote>An extract, set as the reader sets it,<br>on the panel's ground.</blockquote>
          </BreakoutBox>
          <p style="line-height:1.6">The main text carries on after the box.</p>
        </div>
      </div>`,
  }),
});

/** History's first box as the pale card: what a chapter the redesign has
 *  not reached still gets, in its own colour. */
export const InHistory = {};

/** The dark panel (Figma 2730:8031): --color-dark-surface, white text, the
 *  kicker in the chapter's colour, no badge. History's boxes render this
 *  way in the reader. */
export const Dark = { args: { treatment: "dark" } };

/** The lighter dark (OPENBRAIN-157): --color-dark-surface-2 (#2A2A2A),
 *  the rest as Dark. A panel beside the dark figure pane rather than the
 *  same black. */
export const Plate = { args: { treatment: "plate" } };

/** The chapter-colour panel (the Figma's violet, 2730:8059): the chapter's
 *  own ground, everything on it in the ramp's ink; white here on fund. */
export const Chapter = {
  args: {
    treatment: "chapter",
    section: {
      id: "box-humoral-theory",
      slug: "box-humoral-theory",
      title: "Humoral theory",
    },
    label: "B",
  },
};

/** The same panel on the Retina's teal: the dark surface as ink (9.5:1),
 *  where white would be 1.8:1. */
export const ChapterInRetina = {
  ...onRamp("perc"),
  args: { treatment: "chapter", section: { id: "box-x", title: "An aside" } },
};

/** On the Movement blue the ground is the ramp's deep step
 *  (--color-chapter-ground, #0E61C4, white 5.96:1): white on its main
 *  (#1A72F2) is 4.44:1, just under AA. */
export const ChapterInMovement = {
  ...onRamp("move"),
  args: { treatment: "chapter", section: { id: "box-x", title: "An aside" } },
};

/** On the Learning red, the dark surface as ink (4.74:1). */
export const ChapterInLearning = {
  ...onRamp("lear"),
  args: { treatment: "chapter", section: { id: "box-x", title: "An aside" } },
};

/** On the Development amber, the dark surface as ink (9.7:1). */
export const ChapterInDevelopment = {
  ...onRamp("deve"),
  args: { treatment: "chapter", section: { id: "box-x", title: "An aside" } },
};

/** The plate on another ramp: the kicker takes the chapter's colour, so
 *  the teal shows the panel's one chapter-specific mark. */
export const PlateInRetina = {
  ...onRamp("perc"),
  args: { treatment: "plate", section: { id: "box-x", title: "An aside" } },
};

/** The same frame in the Retina's teal. */
export const InRetina = {
  args: {
    section: { id: "box-x", title: "An aside in another chapter" },
    label: "B",
  },
  decorators: [
    () => ({ template: `<div data-chapter="perc"><story /></div>` }),
  ],
};

/* The Hippocrates box's two parts, as chapterTransform hands them to the
   reader (the extract shortened to the source's own ellipses). */
const railSection = {
  id: "box-sacred-disease",
  kind: "box",
  slug: "box-sacred-disease",
  title: "Hippocrates: the sacred disease and the four humours",
  paragraphs: [
    {
      id: "p-sacred",
      explore: {
        title: "Hippocrates’ view on epilepsy",
        prompt: "Explore more about Hippocrates’ view on epilepsy",
        image: {
          src: "/publicAssets/images/foundations/narrative/hippocrates-bust.jpg",
          alt: "Marble bust of Hippocrates in profile, from the British Museum.",
        },
        legend:
          "Bust of Hippocrates from the British Museum. Source: The Wellcome Collection.",
      },
      text: `<blockquote>“It is thus with regard to the disease called Sacred [epilepsy]: it appears to me to be nowise more divine nor more sacred than other diseases, but has a natural cause from the originates like other affections… They who first referred this malady to the gods appear to me to have been just such persons as the conjurors, purificators, mountebanks, and charlatans now are, who give themselves out for being excessively religious, and as knowing more than other people… But this disease seems to me to be no more divine than others; but it has its nature such as other diseases have, and a cause whence it originates… But the brain is the cause of this affection, as it is of other very great diseases.”</blockquote>`,
    },
    {
      id: "p-humours",
      explore: {
        title: "Humoral theory",
        prompt: "Explore more about humoral theory",
        image: {
          src: "/publicAssets/images/foundations/thurneysser-four-humours-1574.jpg",
          alt: "A 1574 woodcut: a figure split down the middle, ringed by the four humours with their elements and zodiac signs.",
        },
        legend:
          "The four humours and their corresponding elements and zodiacal signs. Woodcut in Quinta Essentia by Leonhart Thurneysser (1574). Credit: Wikimedia Commons.",
      },
      text: `In ancient Greece, the Pythagoreans were mathematicians who were into numerology, and they had a particular reverence for the number four. Subsequently, Empedocles assembled a cosmology based on tetradic categories. The universe was comprised of four fundamental elements: earth, water, air and fire. There were four cosmic entities: sky, sun, earth and sea. There are four seasons: spring, summer, winter, fall. Hippocrates applied the four seasons to ages of human beings and linked the four elements to four fundamental humors in the body: yellow bile, black bile, phlegm, and blood<sup class="citation-ref">121</sup>. Galen continued the Hippocratic medical practice of considering that illnesses and dispositions were caused by imbalances in the four humors, and patients were treated in a manner that sought to restore humoral balance. Humoral theory would go on to impact medical practice for well over a thousand years.`,
    },
  ],
};

/* The parts a sideways box's text is cut into, as SectionComp renders
   them: a RailPart per part (here without figures, which need the
   database; a part's picture stands in). `layer`: a stage layer for the
   box to float in, as the reader has from 1024px. */
const railFrame =
  ({ layer, intro, outro }) =>
  (args) => ({
    components: { BreakoutBox, RailPart },
    setup: () => ({ args, STAGE_LAYER_ID, layer, intro, outro }),
    template: `
      <div data-chapter="fund" class="chapter-reader" style="position:relative;--reader-topbar-h:0px;background:rgb(var(--color-bg));font-family:var(--font-body);font-size:1.25rem;line-height:1.55;color:rgb(var(--color-ink));">
        <div v-if="layer" :id="STAGE_LAYER_ID" style="position:absolute;top:0;left:0;width:100%;height:0;z-index:1;"></div>
        <div style="max-width:640px;margin:0 auto;padding:40px 24px;">
          <p :style="{ minHeight: layer ? '60vh' : '0' }">{{ intro }}</p>
          <BreakoutBox v-bind="args">
            <div>
              <div class="bx-rail-row">
                <RailPart
                  v-for="(p, i) in args.section.paragraphs"
                  :key="p.id"
                  :part="{ id: p.id, title: p.explore?.title || '', explore: !!p.explore }"
                  :image="p.explore?.image || p.picture || null"
                  :legend="p.explore?.legend || p.pictureLegend || ''"
                  :index="i"
                  :count="args.section.paragraphs.length"
                >
                  <div :id="p.id" :data-paragraph-id="p.id" class="P" v-html="p.text"></div>
                </RailPart>
              </div>
            </div>
          </BreakoutBox>
          <p :style="{ minHeight: layer ? '120vh' : '0' }">{{ outro }}</p>
        </div>
      </div>`,
  });

/** Read sideways (OPENBRAIN-163): a box of Explore parts on one track.
 *  From 1024px the box pins under the top bar and the page's scroll moves
 *  the track, a pixel across per pixel down; the names and the arrows
 *  under it move it too, and so do a sideways swipe and the arrow keys on
 *  the focused track. The frame below stands in for the reader: a stage
 *  layer for the box to float in and a top bar's height to pin under.
 *  Narrower than 1024px (the toolbar's phone and tablet viewports) it is
 *  the phone's swipe track (Swipe, below). */
export const SideScroll = {
  args: { section: railSection, label: "A", treatment: "dark", rail: true },
  render: railFrame({
    layer: true,
    intro:
      "Scroll down: the box pins, and the scroll carries its two parts across. The text before the box…",
    outro: "The main text carries on after the box.",
  }),
};

/* Descartes' box as ordinary paragraphs (OPENBRAIN-187): no part has a
   name, so the nav counts the stops. The skull stands in for Figure A. */
const descartesSection = {
  id: "box-descartes",
  kind: "box",
  slug: "box-descartes",
  title: "Separating mind from body: Descartes and dualism",
  paragraphs: [
    {
      id: "d-dualism",
      text: `Descartes is often credited with popularizing the idea of dualism<sup class="citation-ref">88</sup>—the idea that most of our bodily functions and capabilities arise from our corporeal being, but that our mind, or soul, arises in an ethereal, perhaps spiritual, manner. Even hundreds of years after Descartes’ death, such ideas continue to have traction, particularly in conversations surrounding the basis of consciousness<sup class="citation-ref">89</sup>. Somewhat ironically, in death Descartes also came to embody the idea of separation of mind and body. In 1649, Descartes was invited by Queen Christina of Sweden to visit and serve as her tutor. He went to Sweden but died soon afterward of pneumonia. He was buried in a small Catholic church in the outskirts of otherwise Protestant Stockholm. Several years later, during a period of patriotic fervor, the French decided to bring back their great thinker. A team was sent to bring Descartes’ body back home. However, once back in France, something was wrong with Descartes’ remains. His skull was missing. So was his right index finger.`,
    },
    {
      id: "d-skull",
      picture: {
        src: "/publicAssets/images/foundations/figa-01.jpg",
        alt: "A skull covered in handwritten inscriptions, said to be Descartes'.",
      },
      pictureLegend:
        "A skull, with writing all over it, purported to be Descartes’. Source: Musée de l’homme.",
      text: `Berzilius gave the skull to the French Académie de Sciences. The skull now resides in the Musée de l’homme in Paris (<strong>Figure A</strong>), though there is controversy regarding whether or not it is truly Descartes’ skull, as a museum in Lund, Sweden, also displays a portion of what they claim is the true “Skull of the Philosopher Descartes.”`,
    },
  ],
};

/** A box of ordinary paragraphs on the track (Stuart, 12 Nov: Descartes,
 *  Rafferty, the icepick, Penfield, the developing brain). Each picture
 *  leads its part, once, with its legend and expand button; the nav says
 *  how far along. */
export const SideScrollProse = {
  args: {
    section: descartesSection,
    label: "C",
    treatment: "dark",
    rail: true,
  },
  render: railFrame({
    layer: true,
    intro: "Scroll down: the box pins, and the scroll carries it across…",
    outro: "The main text carries on after the box.",
  }),
};

/** Below 1024px (OPENBRAIN-187): the box stays in the column and nothing
 *  pins. The track is a native swipe, a page at a time, and the reader
 *  decides: "Explore more" turns the page, "Keep going" carries on down.
 *  Best seen in the toolbar's phone viewport. */
export const Swipe = {
  args: {
    section: descartesSection,
    label: "C",
    treatment: "dark",
    rail: true,
  },
  render: railFrame({
    layer: false,
    intro:
      "René Descartes, a contemporary of Willis, put forward a different view…",
    outro: "The main text carries on after the box.",
  }),
};
