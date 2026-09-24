/*
 * Refraction errors: what the chapter page can edit, and the original's
 * content (theopenbrain.org, v0.2.3) as the fallback for anything unset.
 *
 * The number of conditions is fixed: the Lottie has one 72-frame segment per
 * condition after the normal eye, so a fifth label would have nothing to show.
 */
export default {
  id: "refraction-errors",
  name: "Refraction errors",
  animationKey: "animationImpairedVision",
  /** The Lottie artwork this schema was written for (cache key). */
  lottieVersion: "v0.2.3",
  fields: [
    { key: "title", label: "Title", type: "text" },
    {
      key: "infoText",
      label: "Introduction",
      type: "textarea",
      optional: true,
      hint: "Shown over the figure until the reader closes it.",
    },
    {
      key: "states",
      label: "Conditions",
      type: "list",
      itemLabels: [
        "The normal eye",
        "Condition 2",
        "Condition 3",
        "Condition 4",
      ],
      hint: "The first is the normal eye. The others each get a correction button.",
    },
    { key: "toggle", label: "Correction button", type: "text" },
    {
      key: "image",
      label: "Picture seen through the eye",
      type: "image",
      asset: "motif-medium.jpg",
      hint: "Leave empty to keep the Matisse.",
    },
    {
      key: "video",
      label: "Video",
      type: "group",
      optional: true,
      fields: [
        { key: "title", label: "Speaker", type: "text" },
        { key: "text", label: "Subject", type: "text" },
        {
          key: "slug",
          label: "Break video",
          type: "text",
          hint: "The video's name under /chapter/break/.",
        },
      ],
    },
  ],
  defaults: {
    title: "Refraction errors",
    infoText:
      "Despite our body’s best laid plans, a variety of developmental and age-related issues can cause our eyes to improperly focus incoming images onto the retina, resulting in impaired vision. Two common issues result from the image being focused either in front of (myopia) or behind (hyperopia) the retina. Myopia, also commonly referred to as nearsightedness, blurs images of far-away images. In contrast, hyperopia, commonly referred to as farsightedness, blurs images of nearby images. Another common refractive issue is astigmatism, which results in uneven focus of the incoming image on the retina, due to irregular curvature of the cornea, or lens abnormalities. Finally, as we age, the lens becomes less elastic and the ciliary muscles become less effective at accommodating different focal planes, leading to presbyopia, which tends to focus images behind the retina. In general, most types of refractive errors can be addressed with corrective lenses.",
    states: ["Normal eye (emmetropia)", "Myopia", "Hyperopia", "Astigmatism"],
    toggle: "Corrected",
    image: "",
    video: {
      title: "Maureen and Jay Neitz",
      text: "Possible causes and cures for myopia",
      slug: "neitz-myopia",
    },
  },
};
