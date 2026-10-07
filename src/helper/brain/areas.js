/*
 * The brain atlas's areas and the chapters that own them (OPENBRAIN-127).
 *
 * The idea is that the brain is the book's contents: every chapter is a part
 * of the brain. CHAPTER_PARTS says which part each chapter owns; the brain
 * wears that chapter's colour there, and pointing at it names the chapter.
 * Areas no chapter owns yet stay bare and say which part of the book they
 * would belong to.
 *
 * Area ids match the `areas` list stored in the model
 * (public/publicAssets/models/brain/brain-v1.glb, built by
 * scripts/brain/build-brain-asset.mjs); the model carries only geometry and a
 * per-vertex area index, everything a reader sees lives here.
 *
 * The surface is FreeSurfer's fsaverage cortex with the Destrieux atlas
 * grouped into nine areas. Names say what the faces are: the source repo
 * called two groups "hippocampus" and "amygdala", but those structures are
 * deep and not on this surface, so they are named for the gyri that are.
 *
 * Colours are the subject ramps from brand.css, read from tokens/tokens.json
 * (generated from brand.css and kept equal by src/__tests__/tokens.test.js),
 * so a ramp change in the design system reaches the 3D model too.
 */
import tokens from "../../../tokens/tokens.json";
import { rampForModule } from "@/helper/chapterTheme";

export const AREAS = Object.freeze([
  {
    id: "occipital",
    name: "Visual cortex",
    where: "Occipital lobe",
    system: "perc",
    view: "open",
    blurb:
      "The back of the brain. Primary visual cortex (V1) lines the calcarine sulcus on the medial surface and receives the eyes' signals by way of the thalamus; the areas around it build up form, colour and motion.",
  },
  {
    id: "ventral-temporal",
    name: "Ventral temporal cortex",
    where: "Fusiform and inferior temporal gyri, temporal pole",
    system: "perc",
    view: "open",
    blurb:
      "The underside of the temporal lobe, at the end of the visual “what” pathway. Neurons here respond to whole objects, faces and written words. At its front tip, the temporal pole ties objects and faces to what we know about them.",
  },
  {
    id: "lateral-temporal",
    name: "Lateral temporal cortex and insula",
    where: "Superior and middle temporal gyri, insula",
    system: "perc",
    view: "closed",
    blurb:
      "Heschl's gyrus, on the upper surface of the temporal lobe inside the lateral fissure, is primary auditory cortex; the cortex around it analyses sound and speech, and the middle temporal gyrus below ties sounds and words to meaning. Folded inside the fissure, the insula tracks the body's internal state.",
  },
  {
    id: "parietal",
    name: "Parietal cortex",
    where: "Postcentral gyrus, parietal lobe and posterior cingulate",
    system: "perc",
    view: "closed",
    blurb:
      "Just behind the central sulcus, the postcentral gyrus is primary somatosensory cortex: touch, position and pain, mapped body part by body part. Further back, parietal cortex locates things in space and steers spatial attention.",
  },
  {
    id: "motor",
    name: "Motor cortex",
    where: "Precentral gyrus, central sulcus and paracentral lobule",
    system: "move",
    view: "closed",
    blurb:
      "The strip in front of the central sulcus. Primary motor cortex maps the body from the feet, on the medial wall, to the face, near the lateral fissure, and sends movement commands down to the brainstem and spinal cord.",
  },
  {
    id: "prefrontal",
    name: "Prefrontal cortex",
    where:
      "Frontal lobe in front of the motor strip, with premotor cortex and the anterior and middle cingulate",
    system: "lear",
    view: "closed",
    blurb:
      "The front of the frontal lobe. It keeps goals and information in mind, directs attention to what matters, and holds back the irrelevant.",
  },
  {
    id: "broca",
    name: "Broca's area",
    where:
      "Pars opercularis and triangularis of the left inferior frontal gyrus",
    system: "lear",
    view: "closed",
    blurb:
      "The back of the left inferior frontal gyrus. Damage here and to the cortex around it leaves understanding largely intact but makes speech slow and effortful, as Paul Broca described in 1861.",
  },
  {
    id: "wernicke",
    name: "Wernicke's area",
    where: "Left posterior superior temporal and supramarginal gyri",
    system: "lear",
    view: "closed",
    blurb:
      "Where the temporal lobe meets the parietal, in the left hemisphere. Damage here leaves speech fluent but empty of meaning and makes language hard to understand, as Carl Wernicke described in 1874.",
  },
  {
    id: "parahippocampal",
    name: "Parahippocampal gyrus",
    where: "Medial temporal lobe",
    system: "lear",
    view: "open",
    blurb:
      "On the inner underside of the temporal lobe, the cortical gateway to the hippocampus, which lies deeper and is not shown on this surface. Together they lay down new memories of places and events.",
  },
]);

/*
 * Which part of the brain each chapter is, in book order. An area belongs to
 * at most one chapter (pointing at it names one chapter); a chapter may own
 * several areas. `title` and `ramp` are fallbacks for chapters the public
 * catalog does not list yet (drafts); the module row wins when it has them.
 * `why` is the one line that ties the chapter to its part.
 */
export const CHAPTER_PARTS = Object.freeze([
  {
    slug: "foundations-of-neuroscience",
    title: "Foundations of Neuroscience",
    ramp: "fund",
    areas: ["broca"],
    why: "Where the brain's map began: in 1861 Broca traced lost speech to this patch of the left frontal lobe, one of the first functions pinned to a place.",
  },
  {
    slug: "the-retina",
    title: "The Retina",
    ramp: "perc",
    areas: ["occipital"],
    why: "The retina's signals travel through the thalamus to here, the visual cortex at the back of the brain.",
  },
  {
    slug: "attention-and-working-memory",
    title: "Attention and Working Memory",
    ramp: "lear",
    areas: ["prefrontal", "parietal"],
    why: "Within these lobes, the frontal eye fields and the intraparietal sulcus steer attention, and lateral prefrontal cortex holds what matters in mind.",
  },
  {
    slug: "stress",
    title: "Understanding Stress",
    ramp: "deve",
    areas: ["parahippocampal"],
    why: "The parahippocampal gyrus, beside the hippocampus: the hippocampus is one of the brain's main targets of stress hormones, and a brake on the stress response.",
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

/**
 * The chapters with their parts, merged with the public catalog: a chapter
 * the catalog lists takes its title, ramp, number and reader route from the
 * module row (the route is built from the row, never hard-coded); one it does
 * not list (a draft) has no number and no route. Sorted in book order.
 * `modules` is useChapterCatalog's.
 */
export function bookChapters(modules = []) {
  const bySlug = new Map(modules.map((m) => [m.slug, m]));
  return CHAPTER_PARTS.map((part, i) => {
    const mod = bySlug.get(part.slug) || null;
    return {
      ...part,
      title: mod?.title || part.title,
      ramp: rampForModule(mod) || part.ramp,
      number: mod ? mod.order_index : null,
      to: mod ? `/chapter/${mod.order_index}/${mod.slug}` : null,
      order: mod ? mod.order_index : 1000 + i,
    };
  }).sort((a, b) => a.order - b.order);
}

export function chapterForArea(chapters, areaId) {
  return chapters.find((c) => c.areas.includes(areaId)) || null;
}

/**
 * Which way to show a set of areas: "open" (the book open, from behind and
 * above, for the medial and ventral surfaces) when every one of them is best
 * seen that way, else "closed" (the left side).
 */
export function viewForAreas(ids) {
  return ids.length && ids.every((id) => areaById(id)?.view === "open")
    ? "open"
    : "closed";
}

/** Areas no chapter owns yet, in AREAS order. */
export function unclaimedAreas(chapters) {
  const owned = new Set(chapters.flatMap((c) => c.areas));
  return AREAS.filter((a) => !owned.has(a.id));
}

/** An area's colour: its chapter's ramp, or its subject's if unclaimed. */
export function areaHex(areaId, chapters) {
  const chapter = chapterForArea(chapters, areaId);
  if (chapter) return rampHex(chapter.ramp);
  const area = areaById(areaId);
  return area ? rampHex(area.system) : null;
}
