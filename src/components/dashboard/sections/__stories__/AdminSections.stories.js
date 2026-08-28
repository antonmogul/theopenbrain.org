import AnalyticsSection from "../AnalyticsSection.vue";
import MediaSection from "../MediaSection.vue";
import QuizzesSection from "../QuizzesSection.vue";
import UsersSection from "../UsersSection.vue";
import VersionsSection from "../VersionsSection.vue";

export default { title: "Admin/Sections", parameters: { layout: "padded" } };

const analytics = {
  analyticsLoading: false,
  analyticsError: null,
  analyticsDateRange: "30days",
  analyticsRangeOptions: [
    { value: "7days", label: "7 days" },
    { value: "30days", label: "30 days" },
    { value: "90days", label: "90 days" },
  ],
  analyticsMetrics: {
    activeUsers: 1248,
    totalPageViews: 18342,
    avgTimeOnContent: 522,
    quizCompletionRate: 78,
  },
  analyticsChartData: {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    datasets: [{ label: "Readers", data: [112, 164, 142, 208, 231] }],
  },
  contentPerformance: [
    {
      id: "retina",
      title: "The Retina",
      views: 5810,
      avgTime: 684,
      completionRate: 72,
    },
    {
      id: "foundations",
      title: "Foundations of Neuroscience",
      views: 2940,
      avgTime: 510,
      completionRate: 64,
    },
  ],
  quizPerformance: [
    {
      id: "q1",
      title: "Retinal circuits check",
      attempts: 329,
      avgScore: 82,
      passRate: 76,
    },
  ],
  trendingHighlights: [
    {
      id: "h1",
      selected_text:
        "Direction-selective ganglion cells respond preferentially…",
      count: 48,
    },
  ],
  formatDuration: (seconds) => `${Math.round(seconds / 60)} min`,
};

export const AnalyticsPopulated = {
  render: () => ({
    components: { AnalyticsSection },
    data: () => ({ p: analytics }),
    template: `<AnalyticsSection v-bind="p" />`,
  }),
};
export const AnalyticsError = {
  render: () => ({
    components: { AnalyticsSection },
    data: () => ({
      p: {
        ...analytics,
        analyticsError: "Analytics are temporarily unavailable.",
      },
    }),
    template: `<AnalyticsSection v-bind="p" />`,
  }),
};

const mediaByType = {
  lottie: [
    {
      id: "m1",
      title: "Phototransduction cascade",
      media_type: "lottie",
      file_size_bytes: 284000,
    },
  ],
  video: [
    {
      id: "m2",
      title: "Retina dissection",
      media_type: "video",
      file_size_bytes: 18800000,
    },
  ],
  image: [
    {
      id: "m3",
      title: "Retinal layers",
      media_type: "image",
      file_size_bytes: 920000,
      file_url: "",
    },
  ],
  youtube: [],
  gsap: [],
  css: [],
};
const media = Object.values(mediaByType).flat();
export const MediaLibrary = {
  render: () => ({
    components: { MediaSection },
    data: () => ({
      media,
      mediaByType,
      selected: null,
      search: "",
      filters: [
        { value: "all", label: "All" },
        { value: "image", label: "Images" },
        { value: "video", label: "Video" },
      ],
    }),
    template: `<MediaSection media-filter="all" :media-filter-options="filters" :filtered-media="media" :media-by-type="mediaByType" :format-file-size="b => Math.round(b/1000) + ' KB'" v-model:selected-media="selected" v-model:media-search="search" />`,
  }),
};
export const MediaEmpty = {
  render: () => ({
    components: { MediaSection },
    data: () => ({
      empty: {
        lottie: [],
        video: [],
        image: [],
        youtube: [],
        gsap: [],
        css: [],
      },
    }),
    template: `<MediaSection :media-filter-options="[{value:'all',label:'All'}]" :media-by-type="empty" :format-file-size="b => b + ' B'" />`,
  }),
};

const quizForm = {
  title: "Retinal circuits knowledge check",
  description: "Check the core concepts before continuing.",
  time_limit_minutes: 15,
  passing_score: 70,
  allow_multiple_attempts: true,
  show_correct_answers: true,
  questions: [],
};
const questionForm = {
  question_text: "Which retinal cell releases glutamate in darkness?",
  question_type: "multiple_choice",
  options: [
    "Photoreceptor",
    "Horizontal cell",
    "Amacrine cell",
    "Ganglion cell",
  ],
  correct_answer: "Photoreceptor",
  points: 1,
};
export const QuizzesPopulated = {
  render: () => ({
    components: { QuizzesSection },
    data: () => ({
      quizzes: [
        {
          id: "q1",
          title: "Retinal circuits",
          questionCount: 8,
          time_limit_minutes: 15,
          passing_score: 70,
          attemptCount: 329,
          avgScore: 82,
          passRate: 76,
          status: "published",
        },
      ],
      quizForm: { ...quizForm },
      questionForm: { ...questionForm },
    }),
    template: `<QuizzesSection :quizzes="quizzes" v-model:quiz-form="quizForm" v-model:question-form="questionForm" />`,
  }),
};
export const QuizEditor = {
  render: () => ({
    components: { QuizzesSection },
    data: () => ({
      quizForm: { ...quizForm },
      questionForm: { ...questionForm },
      open: true,
    }),
    template: `<QuizzesSection v-model:show-quiz-editor="open" v-model:quiz-form="quizForm" v-model:question-form="questionForm" />`,
  }),
};

const userFixtures = [
  {
    id: "u1",
    full_name: "Dr Stuart Trenholm",
    email: "stuart@example.org",
    role: "creator",
    created_at: "2026-06-01T00:00:00Z",
  },
  {
    id: "u2",
    full_name: "Ada Lovelace",
    email: "ada@example.org",
    role: "professor",
    created_at: "2026-07-14T00:00:00Z",
  },
  {
    id: "u3",
    full_name: "Noor Okafor",
    email: "noor@example.org",
    role: "student",
    created_at: "2026-08-20T00:00:00Z",
  },
];
export const UsersPopulated = {
  render: () => ({
    components: { UsersSection },
    data: () => ({
      users: userFixtures,
      selected: null,
      filters: [
        { value: "all", label: "All" },
        { value: "creator", label: "Creators" },
        { value: "professor", label: "Professors" },
        { value: "student", label: "Students" },
      ],
      roles: [
        { value: "creator", label: "Creator" },
        { value: "professor", label: "Professor" },
        { value: "student", label: "Student" },
      ],
    }),
    template: `<UsersSection :users="users" :users-filter-options="filters" :role-select-options="roles" :users-total-count="48" :user-role-breakdown="{creators:1,professors:12,students:35}" v-model:selected-user="selected" />`,
  }),
};
export const UsersLoading = {
  render: () => ({
    components: { UsersSection },
    template: `<UsersSection users-loading :users-filter-options="[]" :role-select-options="[]" />`,
  }),
};

const versionFixtures = [
  {
    id: "v2",
    version_number: "2.0",
    status: "draft",
    moduleCount: 12,
    created_at: "2026-08-20T00:00:00Z",
    release_notes:
      "Adds Foundations of Neuroscience and revised Retina figures.",
  },
  {
    id: "v1",
    version_number: "1.0",
    status: "published",
    moduleCount: 11,
    created_at: "2026-05-01T00:00:00Z",
    published_at: "2026-06-01T00:00:00Z",
  },
];
export const VersionsPopulated = {
  render: () => ({
    components: { VersionsSection },
    data: () => ({
      versions: versionFixtures,
      form: {
        version_number: "2.1",
        release_notes: "Accessibility and copy improvements.",
      },
      open: false,
    }),
    template: `<VersionsSection :versions="versions" v-model:show-new-version-modal="open" v-model:new-version-form="form" />`,
  }),
};
export const VersionsError = {
  render: () => ({
    components: { VersionsSection },
    template: `<VersionsSection versions-error="Couldn’t load content versions." />`,
  }),
};
