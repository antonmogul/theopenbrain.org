// The historical Blind spot uses a man (left) and dragon (right), not the
// letter placeholders in an interim import. Keep instructions tied to those
// exact original targets without rewriting the published chapter rows.
const BLIND_SPOT_DIRECTIONS = [
  "Put your monitor an arm’s length away. Close your left eye and fix your right eye’s gaze on the dragon. Extend your right hand and block the dragon with the tip of your index fingers. Slowly move your hand directly rightwards, and when it gets about halfway across the screen your fingertip should disappear.",
  "Close your left eye and fix your right eye’s gaze on the man. Move closer and farther away from the screen until the dragon disappears. Repeat with your left eye while fixating on the dragon, and the man should disappear.",
];
export function breakSectionDirections(content) {
  const steps = content?.steps || [];
  return content?.title === "Blind spot" &&
    steps.some((step) => /[‘'“"]?[AB][’'”"]?\b/.test(step))
    ? BLIND_SPOT_DIRECTIONS
    : steps;
}
