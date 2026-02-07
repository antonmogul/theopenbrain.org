# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The Open Brain is an interactive educational web application built with Vue 3, focusing on visualizing and explaining the retina. The application features text highlighting, annotations, animations, and an interactive chapter-based navigation system.

## Development Commands

### Development Server
```bash
npm start
# or
npm run watch:local
```
Runs the development server with Vite in development mode.

### Build Commands
```bash
npm run build              # Production build
npm run build:dev          # Development build
npm run build:stage        # Staging build
npm run build:prod         # Production build (explicit)
```

All builds automatically clear the `dist` directory before building (via `prebuild` script).

### Preview Builds
```bash
npm run preview            # Preview production build on port 4173
npm run serve:dev          # Build and preview development
npm run serve:stage        # Build and preview staging
npm run serve:prod         # Build and preview production
```

### Testing
```bash
npm run test:unit          # Open Cypress component testing
npm run test:unit:ci       # Run component tests in CI mode
npm run test:e2e           # Open Cypress E2E testing
npm run test:e2e:ci        # Run E2E tests in CI mode
```

### Linting
```bash
npm run lint               # Run ESLint with auto-fix
```

### Deployment
```bash
npm run deploy             # Runs deploy.sh script
npm version <patch|minor|major>  # Bumps version and triggers deploy
```

### Clean Install
```bash
npm run clean              # Clear cache, remove node_modules, reinstall with --legacy-peer-deps
```

## Architecture

### Tech Stack
- **Framework**: Vue 3 (Composition API with `<script setup>`)
- **Build Tool**: Vite 3
- **State Management**: Pinia
- **Routing**: Vue Router 4
- **Styling**: Tailwind CSS 3
- **Animations**: GSAP, Lottie, @formkit/auto-animate
- **Testing**: Cypress (E2E and component)

### Directory Structure

```
src/
├── assets/
│   └── json_backend/       # JSON data files (text.json, animations.json, etc.)
├── components/
│   ├── Navigation/         # Menu components (MenuHome, MenuChapter, MenuAbout)
│   └── UI/                 # Reusable UI components
├── helper/                 # Utility functions
│   ├── general.js          # General utilities
│   ├── marking.js          # Text marking/highlighting utilities
│   ├── perlin.ts           # Perlin noise generation (TypeScript)
│   └── sections.js         # Section navigation utilities
├── icons/                  # Icon components
├── router/                 # Vue Router configuration
├── stores/                 # Pinia stores
│   ├── index.js            # Main store (useGeneral, useText)
│   ├── animation.js        # Animation state (useAnimation)
│   └── comments.js         # Comments state (useCom)
├── views/                  # Route views
│   ├── HomeView.vue
│   ├── ChapterView.vue
│   ├── BreakView.vue
│   └── QuizView.vue
├── App.vue                 # Root component
├── main.js                 # Application entry point
└── index.css               # Global styles
```

### Key Architecture Patterns

#### State Management (Pinia Stores)

**useGeneral Store** (`src/stores/index.js`):
- Manages UI state (menus, modals, navigation)
- Tracks user visit status via localStorage
- Handles scroll position preservation
- Key state: `activeMenu`, `legendIsActive`, `savedPosition`, `progress`

**useText Store** (`src/stores/index.js`):
- Manages content from `assets/json_backend/text.json`
- Handles text highlighting and user annotations
- Syncs selections to localStorage
- Key features: `addSelection()`, `removeSelection()`, `saveLocalstorage()`, `importLocalstorage()`
- Complex nested section/paragraph structure updating

**useAnimation Store** (`src/stores/animation.js`):
- Controls GSAP and Lottie animations

**useCom Store** (`src/stores/comments.js`):
- Manages user comments on highlighted text

#### Routing

Routes defined in `src/router/index.js`:
- `/` → Redirects to `/chapter`
- `/chapter/:chapter?` → Main chapter view (lazy loaded)
- `/chapter/break/:video?` → Break video view (lazy loaded)
- `/quiz` → Quiz view (lazy loaded)

**Special routing behavior**:
- Preserves scroll position when navigating from chapter view
- Custom transition metadata for about page
- Uses `useGeneral` store for route-based state management

#### Data Architecture

**Chapter Data Sources**:
- **Chapter 1 ("The Retina")**: Hardcoded legacy chapter stored in local JSON files. Content modifications are persisted to localStorage.
- **Chapter 2+**: Dynamic chapters fetched from Supabase database. Content modifications are saved via Supabase REST API.

Content is stored in JSON files under `src/assets/json_backend/`:
- `text.json` - Main educational content for Chapter 1 (sections, paragraphs, nested subsections)
- `animations.json` - Animation configurations
- `menu.json` - Navigation structure
- `footnoets.json` - Footnotes (note the typo in filename)
- `infosImages.json` - Image metadata
- `breakVideos.json` - Break video data

The text content uses a deeply nested structure:
```
sections → paragraphs → subSection → paragraphs → subSubSection
```

User modifications to text (highlights, comments) are stored in localStorage for Chapter 1, or saved to Supabase for Chapter 2+.

#### Vite Configuration

- Path alias: `@` → `src/`
- Development mode supports commented-out module aliases
- HTML injection via `vite-plugin-html` for environment variables
- Version number exposed via `__VERSION__` global
- ESM externals enabled for better tree-shaking

#### Styling

- **Tailwind Configuration** (`tailwind.config.js`):
  - Custom breakpoints: `s` (640px), `m` (1300px), `l` (1500px)
  - Custom width utilities for text/illustration layout
  - Custom color palette (lightest, lighter, light, med, dark, darker, magenta, green, etc.)
  - IBM Plex Sans and IBM Plex Mono fonts
  - Responsive layout: `width: text` and `width: illus` for split-screen design

- **Media Queries**: The app checks for `min-width: 1300px` and displays a warning for smaller screens via `MediaQueryWarning.vue`

#### Key Features

1. **Text Highlighting System**: Users can select text to create persistent highlights stored in localStorage
2. **LocalStorage Persistence**: User selections, modified text, and comments persist across sessions
3. **Import/Export**: Users can save and load their annotated text via JSON download
4. **Scroll Position Memory**: Navigating away from chapter view preserves scroll position
5. **Animation Control**: GSAP-based animations with state management
6. **Resize Handling**: Debounced resize events with animation-stopper class to prevent jank

## Important Notes

- Use `--legacy-peer-deps` when installing dependencies (see `npm run clean`)
- The router is injected into Pinia stores using `markRaw()` to prevent reactivity issues
- Window scroll position is tracked in the store, not in browser history
- Text highlighting modifies the DOM by injecting `<mark>` tags into the JSON-based content
- The app expects desktop/large screens (1300px+) - mobile is not fully supported

## Environment Variables

Configured via Vite modes (development, staging, production):
- `NODE_ENV` - Environment mode
- `VITE_PAGE_TITLE` - Injected into HTML

## Version Management

Version is defined in `package.json` and:
- Exposed globally as `window.__VERSION__` via Vite config
- Accessible in components via `app.config.globalProperties.$version`
- Deployment triggered via `npm version` through `postversion` hook

## Project Context & Documentation

Detailed project documentation, PRDs, phase specs, and roadmap are maintained in the Artificial Brain vault:
`/Users/antonmorrison/Documents/GitHub/Artificail-brain/Artificial-Brain/vault/02-projects/911/open-brain`

Key documents include:
- Phase PRDs (1-7) with feature specs and acceptance criteria
- Database schema and Supabase table definitions
- User role definitions (Creator, Professor, Student)
- Roadmap and sprint history
