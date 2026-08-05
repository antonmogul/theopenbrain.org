/*
 * Mock data seam for the Phrenology widget (History chapter, Widget 1).
 * Mirrors the Figma storyboard "Widget 1 – Phrenology": three engraved skull
 * views (anterior / lateral / posterior), each carrying numbered faculty
 * hotspots from the Spurzheim/Fowler phrenology chart. Swap for Supabase later.
 *
 * Hotspot x/y are percentages of the skull stage box (2D flat widget).
 * pos/normal are model-viewer 3D hotspot coords (Phrenology3DView), HARVESTED
 * from the shipping skull.glb via positionAndNormalFromPoint raycasts (the 2D
 * design positions projected onto the mesh, midline faculties pulled to the
 * sagittal midline via a smallest-|x| scan — within a few mm of x=0) — see
 * OPENBRAIN-7. Re-harvest if the GLB is swapped.
 */

// Footer citation shown under the widget (both 2D and 3D views).
export const PHRENOLOGY_CITATION =
  "Excerpts from: The Brain's Record of Auditory and Visual Experience — a final summary and discussion.";

export const PHRENOLOGY_VIEWS = [
  {
    id: "anterior",
    label: "Anterior",
    regions: [
      {
        n: 22,
        name: "Individuality",
        x: 50,
        y: 34,
        pos: "0m 0.1558m 0.1115m",
        normal: "0m 0.1m 1m",
        blurb:
          "Seated between the brows, this faculty was said to register the desire to observe — the collector's eye for facts and things. Phrenologists read a prominent lower forehead as a mind hungry for particulars.",
      },
      {
        n: 34,
        name: "Comparison",
        x: 43,
        y: 22,
        pos: "-0.0128m 0.1827m 0.0946m",
        normal: "-0.3337m 0.2375m 0.9123m",
        blurb:
          "The upper mid-forehead was assigned the power of analogy: perceiving resemblances, reasoning by illustration. Preachers and critics were claimed to carry this region in unusual relief.",
      },
      {
        n: 35,
        name: "Causality",
        x: 58,
        y: 24,
        pos: "0.0145m 0.1784m 0.0943m",
        normal: "0.5982m -0.2006m 0.7758m",
        blurb:
          "The philosopher's bump. Spurzheim placed the perception of cause and effect here, and busts of Franklin and Kant were paraded as evidence of its fullness in deep thinkers.",
      },
      {
        n: 19,
        name: "Ideality",
        x: 27,
        y: 30,
        pos: "0.0739m 0.1666m 0.0110m",
        normal: "0.9369m -0.1211m 0.3281m",
        blurb:
          "On the temples lived the love of the beautiful — poetry, refinement, the ideal. A skull wide at this station promised an artistic temperament.",
      },
      {
        n: 26,
        name: "Colour",
        x: 38,
        y: 38,
        pos: "-0.0231m 0.1490m 0.0564m",
        normal: "-0.7370m 0.0591m 0.6734m",
        blurb:
          "One of the small perceptive organs strung along the brow, credited with the discrimination of hues. Its supposed deficiency was offered as an explanation of colour-blindness.",
      },
    ],
  },
  {
    id: "lateral",
    label: "Lateral",
    regions: [
      {
        n: 10,
        name: "Self-Esteem",
        x: 62,
        y: 18,
        pos: "0.0000m 0.2505m -0.0249m",
        normal: "-0.0267m 0.9831m -0.1812m",
        blurb:
          "High on the crown, tilting back: the organ of self-regard. Held to give dignity when moderate — and 'pride, arrogance and egotism' when the crown rose too proudly.",
      },
      {
        n: 14,
        name: "Veneration",
        x: 48,
        y: 14,
        pos: "0.0002m 0.2523m 0.0048m",
        normal: "0.0420m 0.9959m 0.0801m",
        blurb:
          "The summit of the head was reserved for reverence — of God, of elders, of institutions. Its size was solemnly measured in clergymen.",
      },
      {
        n: 5,
        name: "Combativeness",
        x: 74,
        y: 46,
        pos: "0.0943m 0.1303m -0.0920m",
        normal: "0.9906m 0.1339m 0.0281m",
        blurb:
          "Behind the ear sat the disposition to resist and attack. Fowler advised its 'restraint' in the quarrelsome and its 'cultivation' in the timid.",
      },
      {
        n: 8,
        name: "Acquisitiveness",
        x: 60,
        y: 38,
        pos: "0.0838m 0.1479m -0.0529m",
        normal: "0.9754m 0.0389m 0.2169m",
        blurb:
          "Above and forward of the ear, the instinct to acquire and hoard. Pickpockets, it was claimed, showed it large; the generous showed it small.",
      },
      {
        n: 19,
        name: "Ideality",
        x: 38,
        y: 30,
        pos: "0.0739m 0.1666m 0.0110m",
        normal: "0.9369m -0.1211m 0.3281m",
        blurb:
          "On the temples lived the love of the beautiful — poetry, refinement, the ideal. A skull wide at this station promised an artistic temperament.",
      },
    ],
  },
  {
    id: "posterior",
    label: "Posterior",
    regions: [
      {
        n: 2,
        name: "Philoprogenitiveness",
        x: 50,
        y: 55,
        pos: "0.0044m 0.1473m -0.1649m",
        normal: "0.0371m 0.2676m -0.9628m",
        blurb:
          "The love of offspring, mapped to the back of the head. Gall claimed to have found it enlarged in devoted mothers — and in monkeys.",
      },
      {
        n: 4,
        name: "Adhesiveness",
        x: 34,
        y: 42,
        pos: "0.0720m 0.1343m -0.1447m",
        normal: "0.6467m 0.2555m -0.7187m",
        blurb:
          "Friendship and attachment. Fowler's manuals located lifelong loyalty a hand's breadth behind the ear.",
      },
      {
        n: 3,
        name: "Inhabitiveness",
        x: 50,
        y: 34,
        pos: "0.0030m 0.2037m -0.1308m",
        normal: "0.0001m 0.7588m -0.6513m",
        blurb:
          "The love of home and place. Emigrants who pined for their native valley were said to carry this organ in excess.",
      },
      {
        n: 10,
        name: "Self-Esteem",
        x: 62,
        y: 24,
        pos: "0.0000m 0.2505m -0.0249m",
        normal: "-0.0267m 0.9831m -0.1812m",
        blurb:
          "High on the crown, tilting back: the organ of self-regard. Held to give dignity when moderate — and 'pride, arrogance and egotism' when the crown rose too proudly.",
      },
    ],
  },
];

export function usePhrenology() {
  async function fetchViews() {
    // Fake latency so loading states stay honest when this becomes a fetch.
    await new Promise((r) => setTimeout(r, 80));
    return PHRENOLOGY_VIEWS;
  }
  return { fetchViews };
}
