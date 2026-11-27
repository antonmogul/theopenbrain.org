/* OPENBRAIN-99. Deploy-interval defaults for the reviewed Retina placements.
 * The guarded SQL stores the same choices. Explicit author choices win, and
 * these corrections never enter a breakout box or another chapter.
 */
const FLAGS = {
  "8db9c849-1cbf-4217-a4cd-d0da1597705e": { hold: "next" },
  "63f9a3e3-1f34-46a0-b973-92e282d5f386": { room: 1 },
  "bfb594df-a813-4762-8dfa-8c81d470d38a": { room: 1 },
  "901b315e-65f7-457d-8526-0b537fae86e4": { hold: "next" },
  "25028da1-b944-46b7-b049-fc8ebbb86484": { hold: "next" },
};
const EXPECTED = {
  "8db9c849-1cbf-4217-a4cd-d0da1597705e": "animationAccommodationVergence",
  "63f9a3e3-1f34-46a0-b973-92e282d5f386":
    "widget-upload:retina-object-motion-sensitivity",
  "bfb594df-a813-4762-8dfa-8c81d470d38a":
    "widget-upload:retina-rod-vs-cone-circuits",
  "901b315e-65f7-457d-8526-0b537fae86e4":
    "widget-upload:retina-light-sensitive-ganglion-cells",
  "25028da1-b944-46b7-b049-fc8ebbb86484": "animationEyeMovements",
};
const DIRECTION = {
  id: "5089d277-4e6b-4b95-a353-613e81d60011",
  key: "widget-upload:retina-direction-selectivity",
};
export function retinaReaderChapter(module) {
  if (module.slug !== "the-retina") return module;
  return {
    ...module,
    sections: module.sections.map((section) => {
      if (section.slug?.startsWith("box-")) return section;
      const paragraphs = (section.paragraphs || []).map((p) => {
        const defaults = FLAGS[p.id];
        let row =
          defaults && p.animation_key === EXPECTED[p.id]
            ? {
                ...p,
                content: {
                  ...p.content,
                  animationFlags: { ...defaults, ...p.content?.animationFlags },
                },
              }
            : p;
        if (
          [
            "03f92733-17dd-46a2-9131-c3c64875dba1",
            "2371e7b0-c86e-4f5b-9fc2-cd07ba6d8e39",
          ].includes(p.id) &&
          section.slug ===
            "amacrine-and-ganglion-cells-circuits-computations-and-output" &&
          !p.animation_id
        )
          row = {
            ...row,
            animation_id: DIRECTION.id,
            animation_key: DIRECTION.key,
            animation_title: "Direction selectivity",
            content: {
              ...row.content,
              animationFlags: { hold: "next", ...row.content?.animationFlags },
            },
          };
        return row;
      });
      // Remove only the old, otherwise empty, stand-alone copy, once its
      // preceding prose really carries this same interactive.
      const placed = paragraphs.filter((p) =>
        [
          "03f92733-17dd-46a2-9131-c3c64875dba1",
          "2371e7b0-c86e-4f5b-9fc2-cd07ba6d8e39",
        ].includes(p.id)
      );
      return {
        ...section,
        paragraphs: paragraphs.map((p) =>
          p.id === "4fd08f62-00c0-4ebe-8000-000000000002" &&
          placed.length === 2 &&
          placed.every((p) => p.animation_key === DIRECTION.key) &&
          p.content?.blocks?.length === 1 &&
          p.content.blocks[0].type === "widget" &&
          p.content.blocks[0].widgetId === "upload:retina-direction-selectivity"
            ? { ...p, content: { ...p.content, blocks: [] } }
            : p
        ),
      };
    }),
  };
}

export function retinaFigureConfig(key, config = {}, youtube, imageUrl) {
  if (
    ["animationRetinalCellTypes2", "animationRetinalCellTypes3"].includes(
      key
    ) &&
    !Object.hasOwn(config, "widgetId")
  )
    return { ...config, widgetId: "upload:retina-retinal-cell-types" };
  if (key === "animationRetinaDevelopment")
    return { paperBlend: true, ...config };
  if (
    key === "animationWavesOfActivity" &&
    youtube === "k0_HXpcH4zI" &&
    (!Object.hasOwn(config, "images") ||
      (Array.isArray(config.images) && config.images.length === 0)) &&
    !Object.hasOwn(config, "imageUrl") &&
    !imageUrl
  )
    return {
      ...config,
      placeholder: true,
      images: [
        {
          src: "/publicAssets/images/the-retina/video-posters/retinal-waves.jpg",
          youtube,
          play: "player",
          posterPlay: "chapter",
          alt: "Spontaneous waves of activity",
        },
      ],
    };
  return config;
}
