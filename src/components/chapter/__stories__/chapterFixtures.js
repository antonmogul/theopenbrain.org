import { computed, provide, ref } from "vue";
import animationData from "@/assets/json_backend/animations.json";
import { useGeneral, useText } from "@/stores";

export const retinaChapter = {
  intro: [
    {
      id: "retina-intro",
      title: "The Retina",
      paragraphs: [
        {
          id: "retina-intro-1",
          text: "Vision begins when photons are absorbed by photopigments in rods and cones. The retina then transforms that signal through parallel neural circuits.",
        },
      ],
    },
  ],
  sections: [
    {
      id: "photoreceptors",
      title: "Photoreceptors",
      paragraphs: [
        {
          id: "photoreceptors-1",
          text: "Rods support dim-light vision, while three cone classes sample different regions of the visible spectrum.",
        },
      ],
      subSection: [],
    },
    {
      id: "retinal-circuits",
      title: "Retinal Circuits",
      paragraphs: [
        {
          id: "retinal-circuits-1",
          text: "Bipolar, amacrine, and ganglion cells organize photoreceptor signals into channels for contrast, colour, and motion.",
        },
      ],
      subSection: [],
    },
  ],
  furtherReading: [],
  footNotes: [],
};

export const references = [
  {
    number: 1,
    authors: "Dacey, D. M. & Packer, O. S.",
    year: 2003,
    title: "Colour coding in the primate retina",
    journal: "Annual Review of Neuroscience",
    volume: "26",
    pages: "275–310",
    doi: "10.1146/annurev.neuro.26.041002.131014",
  },
  {
    number: 2,
    authors: "Masland, R. H.",
    year: 2012,
    title: "The neuronal organization of the retina",
    journal: "Neuron",
    volume: "76",
    pages: "266–280",
  },
];

export const highlights = [
  {
    id: "highlight-1",
    paragraph_id: "photoreceptors-1",
    selected_text: "Rods support dim-light vision",
    start_offset: 0,
    end_offset: 29,
    color: "yellow",
    tags: ["photoreceptors", "exam"],
    note: "Connect this to the scotopic sensitivity curve.",
    created_at: "2026-08-25T14:00:00.000Z",
  },
  {
    id: "highlight-2",
    paragraph_id: "retinal-circuits-1",
    selected_text: "channels for contrast, colour, and motion",
    start_offset: 74,
    end_offset: 116,
    color: "blue",
    tags: ["coding"],
    created_at: "2026-08-26T14:00:00.000Z",
  },
];

export const notes = [
  {
    id: "note-1",
    content:
      "Compare ON and OFF bipolar pathways before reviewing centre-surround receptive fields.",
    created_at: "2026-08-26T15:30:00.000Z",
    highlight_id: "highlight-1",
    highlight: highlights[0],
  },
];

export const trending = [
  {
    id: "trend-1",
    paragraph_id: "photoreceptors-1",
    selected_text:
      "Rods support dim-light vision, while three cone classes sample different regions of the visible spectrum.",
    highlight_count: 18,
    last_highlighted_at: "2026-08-27T18:00:00.000Z",
  },
  {
    id: "trend-2",
    paragraph_id: "retinal-circuits-1",
    selected_text:
      "Bipolar, amacrine, and ganglion cells organize photoreceptor signals into parallel channels.",
    highlight_count: 11,
    last_highlighted_at: "2026-08-27T15:00:00.000Z",
  },
];

export const quiz = {
  id: "retina-check",
  title: "Retina knowledge check",
  description: "Test the core transformations performed by retinal circuits.",
  passing_score: 70,
  time_limit_minutes: 8,
  quiz_questions: [
    {
      id: "q1",
      question_text: "Which photoreceptor dominates in dim light?",
      question_type: "multiple_choice",
      options: ["Rod", "S cone", "M cone", "L cone"],
      correct_answer: "Rod",
    },
    {
      id: "q2",
      question_text: "ON bipolar cells depolarize to increments in light.",
      question_type: "true_false",
      options: ["True", "False"],
      correct_answer: "True",
    },
  ],
};

export const flashcards = [
  {
    id: "card-1",
    front: "What does phototransduction convert?",
    back: "Light energy into a change in photoreceptor membrane potential.",
  },
  {
    id: "card-2",
    front: "Which retinal cells carry output to the brain?",
    back: "Retinal ganglion cells.",
  },
];

export const lab = {
  id: "cone-response-lab",
  title: "Plot cone spectral sensitivity",
  difficulty: "Intermediate",
  instructions:
    "Complete the Gaussian response function and compare the S, M, and L cone peaks.",
  starter_code:
    "import numpy as np\n\ndef cone_response(wavelength, peak):\n    return np.exp(-((wavelength - peak) / 35) ** 2)",
  solution_code:
    "def cone_response(wavelength, peak):\n    return np.exp(-((wavelength - peak) / 35) ** 2)",
  show_solution: true,
  test_cases: [{ name: "peaks at one", expected: 1 }],
};

/**
 * Frame options may be plain data or a function of the story's args, so a
 * control can drive fixture state (reading progress, highlight lists, the
 * chapter itself) that a component receives through the store or
 * provide/inject rather than through props.
 */
const resolveOption = (value, args) =>
  typeof value === "function" ? value(args) : value;

export function chapterFrame(Component, options = {}) {
  return (args = {}) => ({
    components: { StoryComponent: Component },
    setup() {
      const textStore = useText();
      const general = useGeneral();
      textStore.$patch({
        text: resolveOption(options.chapter, args) || retinaChapter,
      });
      general.$patch({
        progress: 0.62,
        currentSubChapter: "photoreceptors",
        activeImportMenu: true,
        ...(resolveOption(options.general, args) || {}),
      });

      if (options.provideReaderData) {
        const highlightState = ref(
          resolveOption(options.highlights, args) || highlights
        );
        const noteState = ref(resolveOption(options.notes, args) || notes);
        const referenceState = ref(
          resolveOption(options.references, args) || references
        );
        const readingProgress =
          resolveOption(options.readingProgress, args) || {};
        provide("highlights", {
          highlights: highlightState,
          highlightsByParagraph: computed(() => ({})),
          fetchHighlights: async () => {},
          createHighlight: async (value) => highlightState.value.push(value),
          updateHighlight: async () => {},
          deleteHighlight: async () => {},
        });
        provide("notes", {
          notes: noteState,
          fetchNotes: async () => {},
          createNote: async (value) => noteState.value.unshift(value),
          updateNote: async () => {},
          deleteNote: async () => {},
        });
        provide("references", {
          references: referenceState,
          getReference: (number) =>
            referenceState.value.find((item) => item.number === number),
        });
        provide("readingProgress", {
          progress: ref(readingProgress.progress ?? 62),
          timeSpent: ref(readingProgress.timeSpent ?? 1840),
        });
      }

      const storyState = options.setup?.(args, { textStore, general }) || {};
      return { args, ...storyState };
    },
    template:
      options.template ||
      `<div class="chapter-story-frame"><StoryComponent v-bind="args" /></div>`,
  });
}

export const fullHeightFrame = {
  minHeight: "720px",
  padding: "32px",
  background: "rgb(var(--color-bg))",
};

/*
 * Frames shared by the per-component chapter stories. Each wraps chapterFrame
 * with the surroundings a component expects in the reader, so a story file
 * only has to say which one it lives in. Pass `template` to override.
 */

/** The prose column at reading width on the paper background. */
export function proseFrame(Component, options = {}) {
  return chapterFrame(Component, {
    ...options,
    template:
      options.template ||
      `<div style="max-width:760px;min-height:320px;margin:0 auto;padding:48px 64px;background:rgb(var(--color-paper));font:18px/1.65 var(--font-body);"><StoryComponent v-bind="args" /></div>`,
  });
}

/** The figure pane: a positioned, clipped stage on the app background. */
export function illustrationFrame(Component, options = {}) {
  return chapterFrame(Component, {
    ...options,
    template:
      options.template ||
      `<div style="position:relative;min-height:720px;overflow:hidden;background:rgb(var(--color-bg));"><StoryComponent v-bind="args" /></div>`,
  });
}

/** A demo panel as DemoModal hosts it. */
export function modalFrame(Component, options = {}) {
  return chapterFrame(Component, {
    ...options,
    template:
      options.template ||
      `<div style="min-height:680px;padding:40px;background:rgb(var(--color-bg));"><StoryComponent v-bind="args" /></div>`,
  });
}

/** The reader sidebar's panel width and height. */
export function sidebarFrame(Component, options = {}) {
  return chapterFrame(Component, {
    ...options,
    template:
      options.template ||
      `<div style="width:min(420px,100%);height:640px;overflow:auto;border:1px solid rgb(var(--color-line));background:rgb(var(--color-paper));"><StoryComponent v-bind="args" /></div>`,
  });
}

/* Paragraph shapes the text renderers expect (see useChapter's transform). */

export const imageParagraph = {
  id: "retinal-layers-image",
  img: "blind-spot",
  imgCap:
    "The optic disc contains no photoreceptors, producing a blind spot in each eye's visual field.",
};

export const subsectionParagraph = {
  id: "parallel-pathways",
  subSection: [
    {
      id: "on-off-pathways",
      title: "ON and OFF pathways",
      paragraphs: [
        {
          id: "on-off-1",
          text: "ON bipolar cells signal light increments; OFF bipolar cells signal light decrements.",
        },
      ],
    },
  ],
};

export const subSubParagraph = {
  id: "ganglion-types",
  subSubSection: [
    {
      id: "midget-pathway",
      title: "Midget pathway",
      text: "Midget ganglion cells support high-acuity and red-green opponent signals near the fovea.",
    },
    {
      id: "parasol-pathway",
      title: "Parasol pathway",
      paragraphs: [
        {
          id: "parasol-1",
          text: "Parasol ganglion cells pool over wider areas and respond strongly to temporal contrast.",
        },
      ],
    },
  ],
};

export const footNotes = {
  title: "Notes",
  notes: [
    { number: 1, text: "Rods are absent from the centre of the fovea." },
    {
      number: 2,
      text: "The optic disc is the exit point for ganglion-cell axons.",
    },
  ],
};

/* Chapter 1 figure records from animations.json, for the Illus stories. */

export const animationRecords = animationData.animations;
export const animationIds = animationRecords.map((animation) => animation.id);
export const animationById = (id) =>
  animationRecords.find((animation) => animation.id === id);
