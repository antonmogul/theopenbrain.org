/*
 * The brain atlas's areas (OPENBRAIN-127): names, the book's subject ramp
 * each belongs to, and the chapters that cover it.
 *
 * The ids match the `areas` list stored in the model
 * (public/publicAssets/models/brain/brain-v1.glb, built by
 * scripts/brain/build-brain-asset.mjs); the model carries only geometry and
 * a per-vertex area index, everything a reader sees lives here.
 *
 * The surface is FreeSurfer's fsaverage cortex with the Destrieux atlas
 * grouped into nine areas. Names say what the faces are: the source repo
 * called two groups "hippocampus" and "amygdala", but those structures are
 * deep and not on this surface, so they are named for the gyri that are.
 *
 * Colours are the subject ramps from brand.css, read from tokens/tokens.json
 * (generated from brand.css and kept equal by src/__tests__/tokens.test.js),
 * so a ramp change in the design system reaches the 3D model too. Areas in
 * one system take different steps of its ramp so neighbours stay apart.
 */
import tokens from "../../../tokens/tokens.json";
import { RAMPS, RAMP_NAMES } from "@/helper/chapterTheme";

export const AREAS = Object.freeze([
  {
    id: "occipital",
    name: "Visual cortex",
    where: "Occipital lobe",
    system: "perc",
    tone: "chapter",
    blurb:
      "The back of the brain. Primary visual cortex (V1) lines the calcarine sulcus on the medial surface and receives the eyes' signals by way of the thalamus; the areas around it build up form, colour and motion.",
    chapters: [{ slug: "the-retina", title: "The Retina" }],
  },
  {
    id: "ventral-temporal",
    name: "Ventral temporal cortex",
    where: "Fusiform and inferior temporal gyri, temporal pole",
    system: "perc",
    tone: "chapter-deep",
    blurb:
      "The underside of the temporal lobe, at the end of the visual “what” pathway. Neurons here respond to whole objects, faces and written words.",
    chapters: [],
  },
  {
    id: "lateral-temporal",
    name: "Auditory cortex and insula",
    where: "Superior and middle temporal gyri, insula",
    system: "perc",
    tone: "chapter-soft",
    blurb:
      "Heschl's gyrus, on the upper bank of the temporal lobe, is primary auditory cortex; the cortex around it analyses sound and speech. Folded inside the lateral fissure, the insula tracks the body's internal state.",
    chapters: [],
  },
  {
    id: "parietal",
    name: "Parietal cortex",
    where: "Postcentral gyrus and parietal lobe",
    system: "perc",
    tone: "chapter-deep",
    blurb:
      "Just behind the central sulcus, the postcentral gyrus is primary somatosensory cortex: touch, position and pain, mapped body part by body part. Further back, parietal cortex locates things in space and steers spatial attention.",
    chapters: [
      {
        slug: "attention-and-working-memory",
        title: "Attention and Working Memory",
      },
    ],
  },
  {
    id: "motor",
    name: "Motor cortex",
    where: "Precentral gyrus",
    system: "move",
    tone: "chapter",
    blurb:
      "The strip in front of the central sulcus. Primary motor cortex maps the body from the feet, on the medial wall, to the face, near the lateral fissure, and sends movement commands down the spinal cord.",
    chapters: [],
  },
  {
    id: "prefrontal",
    name: "Prefrontal cortex",
    where: "Frontal lobe, with the anterior cingulate",
    system: "lear",
    tone: "chapter",
    blurb:
      "The front of the frontal lobe. It keeps goals and information in mind, directs attention to what matters, and holds back the irrelevant. It is also where stress hormones change how we think.",
    chapters: [
      {
        slug: "attention-and-working-memory",
        title: "Attention and Working Memory",
      },
      { slug: "stress", title: "Understanding Stress" },
    ],
  },
  {
    id: "broca",
    name: "Broca's area",
    where: "Left inferior frontal gyrus",
    system: "lear",
    tone: "chapter-deep",
    blurb:
      "The inferior frontal gyrus of the left hemisphere. Damage here leaves understanding largely intact but makes speech slow and effortful, as Paul Broca described in 1861.",
    chapters: [
      {
        slug: "foundations-of-neuroscience",
        title: "Foundations of Neuroscience",
      },
    ],
  },
  {
    id: "wernicke",
    name: "Wernicke's area",
    where: "Left posterior superior temporal and supramarginal gyri",
    system: "lear",
    tone: "chapter-soft",
    blurb:
      "Where the temporal lobe meets the parietal, in the left hemisphere. Damage here leaves speech fluent but empty of meaning and makes language hard to understand, as Carl Wernicke described in 1874.",
    chapters: [],
  },
  {
    id: "parahippocampal",
    name: "Parahippocampal gyrus",
    where: "Medial temporal lobe",
    system: "lear",
    tone: "chapter-soft",
    blurb:
      "On the inner underside of the temporal lobe, the cortical gateway to the hippocampus, which lies deeper and is not shown on this surface. Together they lay down new memories of places and events.",
    chapters: [{ slug: "stress", title: "Understanding Stress" }],
  },
]);

/* The bare cortex: gyral crowns in the page's paper tone, the depths of the
   sulci in its muted grey, like a plaster model on the dark stage. */
export const SURFACE = Object.freeze({
  gyrus: tokens.color.light.bg,
  sulcus: tokens.color.light.mute,
});

const BY_ID = new Map(AREAS.map((a) => [a.id, a]));

export function areaById(id) {
  return BY_ID.get(id) || null;
}

/** Hex colour of a ramp step, e.g. rampHex("perc", "chapter-deep"). */
export function rampHex(ramp, tone = "chapter") {
  return tokens.chapter[ramp]?.[tone] || null;
}

export function areaHex(area) {
  return rampHex(area.system, area.tone);
}

/** The systems that have areas, in the book's ramp order, with their areas. */
export function systemsWithAreas() {
  return RAMPS.map((ramp) => ({
    ramp,
    name: RAMP_NAMES[ramp],
    hex: rampHex(ramp),
    areas: AREAS.filter((a) => a.system === ramp),
  })).filter((s) => s.areas.length);
}

/**
 * The chapters to offer for an area. A chapter the public catalog has
 * links to its reader route, built from the module row (never a hard-coded
 * number); one it does not have (a draft) is listed as in preparation.
 * `findBySlug` is useChapterCatalog's.
 */
export function chapterLinks(area, findBySlug) {
  return (area?.chapters || []).map(({ slug, title }) => {
    const mod = findBySlug ? findBySlug(slug) : null;
    return mod
      ? {
          slug,
          title: mod.title || title,
          to: `/chapter/${mod.order_index}/${mod.slug}`,
        }
      : { slug, title, to: null };
  });
}
