export const moduleFixture = {
  id: "module-foundations",
  title: "Foundations of Neuroscience",
  slug: "foundations-of-neuroscience",
  order_index: 3,
  status: "published",
};

export const flashcardFixture = {
  id: "card-photoreceptor",
  module_id: moduleFixture.id,
  front_text: "Photoreceptor",
  back_text:
    "A retinal neuron that converts photons into changes in membrane potential.",
};

export const quizQuestions = [
  {
    id: "question-1",
    question_text: "Which cells perform phototransduction?",
    question_type: "multiple_choice",
    options: ["Rods and cones", "Bipolar cells", "Ganglion cells"],
    correct_answer: "Rods and cones",
    explanation: "Rods and cones contain the light-sensitive opsins.",
  },
  {
    id: "question-2",
    question_text: "Action potentials are all-or-none events.",
    question_type: "true_false",
    correct_answer: "True",
  },
];

export const quizFixture = {
  id: "quiz-foundations",
  module_id: moduleFixture.id,
  title: "Foundations knowledge check",
  description: "Check the core ideas from the opening neuroscience chapter.",
  passing_score: 70,
  time_limit_minutes: 12,
  quiz_questions: quizQuestions,
};

export const courseFixture = {
  id: "course-neuro-101",
  title: "NEUR 101 · The Open Brain",
  course_code: "NEUR-101",
  semester: "Fall 2026",
  description: "An interactive introduction to systems neuroscience.",
  professor: { full_name: "Dr. Stuart Trenholm" },
  progressPercent: 42,
  modules: [
    { ...moduleFixture, is_completed: false, order_index: 1 },
    {
      id: "module-retina",
      title: "The Retina",
      slug: "the-retina",
      order_index: 2,
      is_completed: true,
    },
  ],
};

export const apiFixtures = {
  "modules?": [moduleFixture],
  "quizzes?": [quizFixture],
  "quiz_questions?": quizQuestions,
  "quiz_attempts?": [{ score: 86 }],
  "flashcards?": [flashcardFixture],
  "flashcard_responses?": [],
  "flashcard_sessions?": [
    { id: "session-1", completed_at: "2026-08-26T15:00:00Z" },
  ],
  "reading_progress?": [
    {
      module_id: moduleFixture.id,
      scroll_position: 42,
      time_spent_seconds: 1860,
      is_completed: false,
    },
  ],
  "courses?": [courseFixture],
  "course_enrollments?": [
    {
      id: "enrollment-1",
      enrolled_at: "2026-08-20T12:00:00Z",
      course: courseFixture,
    },
  ],
  "code_labs?": [
    {
      id: "lab-neuron",
      module_id: moduleFixture.id,
      title: "Model a leaky integrate-and-fire neuron",
      starter_code: "membrane_voltage = -70\nprint(membrane_voltage)",
      instructions: "Run the model and inspect the resting potential.",
    },
  ],
  "ai_conversations?": [],
  "ai_messages?": [],
  "highlights?": [],
  "notes?": [],
  "references?": [],
  "profiles?": [
    { id: "storybook-student", full_name: "Maya Chen", role: "student" },
  ],
};

export const storyShell = (componentName) => ({
  components: { StoryComponent: componentName },
  template: `
    <main style="min-height:720px; padding:24px; background:rgb(var(--color-bg)); color:rgb(var(--color-ink));">
      <StoryComponent />
    </main>`,
});
