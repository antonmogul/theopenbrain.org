import { computed, provide, ref } from "vue";
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

export function chapterFrame(Component, options = {}) {
  return (args = {}) => ({
    components: { StoryComponent: Component },
    setup() {
      const textStore = useText();
      const general = useGeneral();
      textStore.$patch({ text: options.chapter || retinaChapter });
      general.$patch({
        progress: 0.62,
        currentSubChapter: "photoreceptors",
        activeImportMenu: true,
        ...(options.general || {}),
      });

      if (options.provideReaderData) {
        const highlightState = ref(options.highlights || highlights);
        const noteState = ref(options.notes || notes);
        const referenceState = ref(options.references || references);
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
          progress: ref(62),
          timeSpent: ref(1840),
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
