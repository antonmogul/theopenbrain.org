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
