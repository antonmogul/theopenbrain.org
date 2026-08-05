/*
 * Mock data seam for the Phrenology widget (History chapter, Widget 1).
 * Mirrors the Figma storyboard "Widget 1 – Phrenology": three engraved skull
 * views (anterior / lateral / posterior), each carrying numbered faculty
 * hotspots from the Spurzheim/Fowler phrenology chart. Swap for Supabase later.
 *
 * Hotspot x/y are percentages of the skull stage box (2D flat widget).
 * pos/normal are model-viewer 3D hotspot coords (Phrenology3DView).
 * The 3D values are initial estimates for a ~10cm skull GLB centred at origin.
 */

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
        pos: "0m 0.155m 0.12m",
        normal: "0m 0m 1m",
        blurb:
          "Seated between the brows, this faculty was said to register the desire to observe — the collector's eye for facts and things. Phrenologists read a prominent lower forehead as a mind hungry for particulars.",
      },
      {
        n: 34,
        name: "Comparison",
        x: 43,
        y: 22,
        pos: "-0.03m 0.21m 0.10m",
        normal: "-0.2m 0.5m 1m",
        blurb:
          "The upper mid-forehead was assigned the power of analogy: perceiving resemblances, reasoning by illustration. Preachers and critics were claimed to carry this region in unusual relief.",
      },
      {
        n: 35,
        name: "Causality",
        x: 58,
        y: 24,
        pos: "0.03m 0.21m 0.10m",
        normal: "0.2m 0.5m 1m",
        blurb:
          "The philosopher's bump. Spurzheim placed the perception of cause and effect here, and busts of Franklin and Kant were paraded as evidence of its fullness in deep thinkers.",
      },
      {
        n: 19,
        name: "Ideality",
        x: 27,
        y: 30,
        pos: "-0.09m 0.19m 0.06m",
        normal: "-1m 0.3m 0.4m",
        blurb:
          "On the temples lived the love of the beautiful — poetry, refinement, the ideal. A skull wide at this station promised an artistic temperament.",
      },
      {
        n: 26,
        name: "Colour",
        x: 38,
        y: 38,
        pos: "-0.04m 0.17m 0.11m",
        normal: "-0.3m 0m 1m",
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
        pos: "0.02m 0.24m -0.06m",
        normal: "0.1m 1m -0.3m",
        blurb:
          "High on the crown, tilting back: the organ of self-regard. Held to give dignity when moderate — and 'pride, arrogance and egotism' when the crown rose too proudly.",
      },
      {
        n: 14,
        name: "Veneration",
        x: 48,
        y: 14,
        pos: "0m 0.253m 0.02m",
        normal: "0m 1m 0.2m",
        blurb:
          "The summit of the head was reserved for reverence — of God, of elders, of institutions. Its size was solemnly measured in clergymen.",
      },
      {
        n: 5,
        name: "Combativeness",
        x: 74,
        y: 46,
        pos: "0.10m 0.12m -0.08m",
        normal: "1m -0.2m -0.5m",
        blurb:
          "Behind the ear sat the disposition to resist and attack. Fowler advised its 'restraint' in the quarrelsome and its 'cultivation' in the timid.",
      },
      {
        n: 8,
        name: "Acquisitiveness",
        x: 60,
        y: 38,
        pos: "0.10m 0.16m 0.02m",
        normal: "1m 0.2m 0.2m",
        blurb:
          "Above and forward of the ear, the instinct to acquire and hoard. Pickpockets, it was claimed, showed it large; the generous showed it small.",
      },
      {
        n: 19,
        name: "Ideality",
        x: 38,
        y: 30,
        pos: "-0.09m 0.19m 0.06m",
        normal: "-1m 0.3m 0.4m",
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
        pos: "0m 0.10m -0.15m",
        normal: "0m -0.3m -1m",
        blurb:
          "The love of offspring, mapped to the back of the head. Gall claimed to have found it enlarged in devoted mothers — and in monkeys.",
      },
      {
        n: 4,
        name: "Adhesiveness",
        x: 34,
        y: 42,
        pos: "-0.06m 0.15m -0.13m",
        normal: "-0.5m 0m -1m",
        blurb:
          "Friendship and attachment. Fowler's manuals located lifelong loyalty a hand's breadth behind the ear.",
      },
      {
        n: 3,
        name: "Inhabitiveness",
        x: 50,
        y: 34,
        pos: "0m 0.18m -0.14m",
        normal: "0m 0.2m -1m",
        blurb:
          "The love of home and place. Emigrants who pined for their native valley were said to carry this organ in excess.",
      },
      {
        n: 10,
        name: "Self-Esteem",
        x: 62,
        y: 24,
        pos: "0.02m 0.24m -0.06m",
        normal: "0.1m 1m -0.3m",
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
