// Historical figure presentation that predates the CMS metadata. Keep these
// reader corrections separate from playback config and the database title.
const PRESENTATION = {
  animationEyeMovements: {
    caption:
      "Saccadic eye movements shift our gaze rapidly. Reflex eye movements stabilize our gaze as our head moves, while microsaccades and drift continually update the image on the retina.",
  },
  animationDragon: {
    hideTitle: true,
    accessibleName: "Johann Zahn’s radiating eye illustration",
    caption:
      "An artistic recreation inspired by Johann Zahn’s depiction of the radiating eye from his Oculus Artificialis Teledioptricus Sive Telescopium, 1685",
  },
};

export function figurePresentation(animation) {
  const defaults = PRESENTATION[animation?.id];
  return {
    title: defaults?.hideTitle ? "" : animation?.title || "",
    accessibleName:
      defaults?.accessibleName || animation?.title || "Illustration",
    caption: animation?.caption || defaults?.caption || "",
  };
}
