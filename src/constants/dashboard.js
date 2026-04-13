// Dashboard section identifiers
export const SECTIONS = {
  DASHBOARD: 'dashboard',
  CHAPTERS: 'chapters',
  VERSIONS: 'versions',
  MEDIA: 'media',
  QUIZZES: 'quizzes',
  USERS: 'users',
  ANALYTICS: 'analytics',
};

// Content status values
export const STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
};

// Block types for content structure
export const BLOCK_TYPES = {
  SECTION: 'section',
  PARAGRAPH: 'paragraph',
  HEADING: 'heading',
  TEXT: 'text',
  LIST: 'list',
  BLOCKQUOTE: 'blockquote',
  CODE: 'code',
  IMAGE: 'image',
};

// Media types
export const MEDIA_TYPES = {
  ALL: 'all',
  LOTTIE: 'lottie',
  VIDEO: 'video',
  IMAGE: 'image',
  YOUTUBE: 'youtube',
};

// Animation interaction types
export const INTERACTION_TYPES = {
  ALL: 'all',
  AUTO_LOOP: 'auto_loop',
  CLICK_STATES: 'click_states',
  SWITCH: 'switch',
  FULLSCREEN_STATES: 'fullscreen_states',
  SCROLL_TRANSITION: 'scroll_transition',
  SCROLL_LINKED: 'scroll_linked',
  VIDEO_FLIP: 'video_flip',
  STATIC_IMAGE: 'static_image',
  YOUTUBE_EMBED: 'youtube_embed',
};

// Human-readable labels for interaction types
export const INTERACTION_TYPE_LABELS = {
  [INTERACTION_TYPES.AUTO_LOOP]: 'Auto Loop',
  [INTERACTION_TYPES.CLICK_STATES]: 'Click States',
  [INTERACTION_TYPES.SWITCH]: 'Switch',
  [INTERACTION_TYPES.FULLSCREEN_STATES]: 'Fullscreen States',
  [INTERACTION_TYPES.SCROLL_TRANSITION]: 'Scroll Transition',
  [INTERACTION_TYPES.SCROLL_LINKED]: 'Scroll Linked',
  [INTERACTION_TYPES.VIDEO_FLIP]: 'Video Flip',
  [INTERACTION_TYPES.STATIC_IMAGE]: 'Static Image',
  [INTERACTION_TYPES.YOUTUBE_EMBED]: 'YouTube Embed',
};

// User roles
export const USER_ROLES = {
  CREATOR: 'creator',
  PROFESSOR: 'professor',
  STUDENT: 'student',
};

// Question types for quizzes
export const QUESTION_TYPES = {
  MULTIPLE_CHOICE: 'multiple_choice',
  TRUE_FALSE: 'true_false',
  SHORT_ANSWER: 'short_answer',
};

// Analytics date ranges
export const DATE_RANGES = {
  WEEK: '7days',
  MONTH: '30days',
  QUARTER: '90days',
};

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
};

// Reading speed (words per minute) for time estimates
export const READING_SPEED_WPM = 200;

// Navigation items for Creator dashboard
export const CREATOR_NAV_ITEMS = [
  { id: SECTIONS.DASHBOARD, label: 'Dashboard', icon: 'grid' },
  { id: SECTIONS.CHAPTERS, label: 'Chapters', icon: 'book' },
  { id: SECTIONS.VERSIONS, label: 'Versions', icon: 'layers' },
  { id: SECTIONS.MEDIA, label: 'Media', icon: 'image' },
  { id: SECTIONS.QUIZZES, label: 'Quizzes', icon: 'quiz' },
  { id: SECTIONS.USERS, label: 'Users', icon: 'users' },
  { id: SECTIONS.ANALYTICS, label: 'Analytics', icon: 'chart' },
];

// Navigation items for Professor dashboard
export const PROFESSOR_NAV_ITEMS = [
  { id: SECTIONS.DASHBOARD, label: 'Dashboard', icon: 'grid' },
  { id: SECTIONS.CHAPTERS, label: 'Chapters', icon: 'book' },
  { id: SECTIONS.QUIZZES, label: 'Quizzes', icon: 'quiz' },
  { id: SECTIONS.ANALYTICS, label: 'Analytics', icon: 'chart' },
];

// Status badge colors
export const STATUS_COLORS = {
  [STATUS.DRAFT]: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  [STATUS.PUBLISHED]: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  [STATUS.ARCHIVED]: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' },
};
