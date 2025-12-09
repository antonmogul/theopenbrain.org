# Component Architecture Audit

**Generated:** 2025-11-17  
**Project:** theopenbrain.org v0.1.20

---

## Executive Summary

The project contains **48 Vue 3 components** organized in a logical directory structure. The vast majority (39/48) use the modern **Composition API with `<script setup>`**, demonstrating good adoption of Vue 3 best practices. However, there are issues with component complexity, prop drilling, tight coupling to JSON data, and inconsistent patterns.

---

## Component Inventory

### Total Components: 48

**By Directory:**
```
src/
├── components/ (48 total)
│   ├── Navigation/          5 components
│   ├── UI/                 11 components
│   ├── chapter/            26 components
│   │   ├── Illus/          11 components (illustrations)
│   │   └── text/           14 components (text content)
│   └── quiz/                1 component
├── views/                   4 components
└── icons/                  29 components
```

**API Usage:**
- **Composition API (`<script setup>`):** 39 components (81%)
- **Options API:** 2 components (4%)
- **No script (icon components):** ~7 components (15%)

---

## Directory Structure Analysis

### ✓ Good Organization

```
components/
├── Navigation/      # Menu components
├── UI/              # Reusable UI elements
├── chapter/         # Chapter-specific components
│   ├── Illus/      # Illustration/animation components
│   └── text/       # Text content components
└── quiz/            # Quiz-related components
```

**Positives:**
- Clear separation of concerns
- Feature-based organization for `chapter/`
- Reusable UI components isolated

**Issues:**
- No shared/common folder for truly generic components
- Icon components mixed with regular components (should be separate)
- Some components are overly specific (can't be reused)

---

## Component Complexity Analysis

### 1. **IllustrationComp.vue** (COMPLEX - 330 lines)

**Issues:**

#### a) **Too Many Responsibilities**
This component handles:
- Lottie animation loading and control
- State management for animations
- Multiple rendering modes (flip, switch, multiple, standard)
- Play/pause control
- Highlight toggling
- Event handling for mouse interactions

**Recommendation:** Split into smaller components:
```
IllustrationComp.vue (orchestrator)
├── LottieAnimation.vue (Lottie loading/control)
├── AnimationControls.vue (play/pause buttons)
├── AnimationStates.vue (state selection UI)
└── AnimationHighlighter.vue (highlight logic)
```

#### b) **Complex Conditional Rendering**
```vue
<template v-if="animation.illuImage">
  <div v-if="!animation.youtubeID">...</div>
  <div v-else>...</div>
</template>
<template v-else>
  <div v-if="!animation.multiple && !animation.flip && !animation.switch">
  <IllustrationFlip v-else-if="!animation.multiple && animation.flip">
  <IllustrationSwitch v-if="!animation.multiple && !animation.flip && animation.switch">
</template>
```

Too many nested conditions. Should use computed properties or separate component files.

#### c) **Magic Numbers**
```javascript
animationLottie.setSpeed(6);
const pos = (totalFrames / 6) * (indexBefore + 1);
```

What is `6`? Should be a named constant.

#### d) **Direct DOM Manipulation**
```javascript
let els = document.getElementsByClassName(state + "Highlight");
for (let el of els) {
  el.classList.add("highlightIllu");
}
```

Should use Vue refs or template refs instead of raw DOM queries.

#### e) **Tight Coupling to JSON Structure**
```javascript
const info = animationJSON.animations.find((x) => {
  return x.id == props.animation.id;
});
```

Component directly imports and queries JSON file. Should receive all needed data via props.

---

### 2. **TextComp.vue** (COMPLEX - 150+ lines)

**Issues:**

#### a) **Too Many GSAP ScrollTriggers**
```javascript
for (let trigger of document.querySelectorAll(".trigger")) {
  ScrollTrigger.create({
    id: "scrollTriggerText",
    trigger: trigger,
    // ... 15+ lines of config
  });
}
```

Creates many ScrollTrigger instances in loops. Should be componentized.

#### b) **setInterval Anti-pattern**
```javascript
let wait = setInterval(() => {
  const _text = document.getElementById("text");
  if (_text) {
    clearInterval(wait);
    // Do stuff
  }
}, 1);
```

Polling DOM with setInterval. Should use Vue's `onMounted` with `nextTick` or refs.

#### c) **Perlin Noise in Component**
```javascript
import Perlin from "@/helper/perlin.ts";
const noise = new Perlin(seed);
// Used for eye movement animation
```

While creative, this logic should be extracted to a composable.

#### d) **Complex CSS Calculations in Template**
```vue
<div
  :style="
    'transform: translate(' + posAugeX + 'px, ' + posAugeY / 2 + 'px);' +
    'height: ' + (2.5 - Math.abs(posAugeX.toFixed(2)) / 20) + 'rem;'
  "
>
```

Should use computed properties for cleaner templates.

---

### 3. **SectionComp.vue** (MODERATE - 120 lines)

**Issues:**

#### a) **Deeply Nested Template**
```vue
<section>
  <template v-for="paragraph in section['paragraphs']">
    <span v-if="paragraph?.type != 'breakVideo'">
      <p v-if="!paragraph.subSection">
      <SubSection v-else>
        <InlineImages v-if="paragraph.img">
        <FullScreenIllustration v-if="paragraph.animationFull">
      </p>
    </span>
    <BreakImages v-else-if="paragraph.type === 'breakVideo'">
    <BreakSection v-else-if="paragraph.type === 'breakSection'">
  </template>
</section>
```

Too much logic in template. Should use render functions or computed properties.

#### b) **Array Indexing with Strings**
```javascript
section['paragraphs'][0]?.animation?.transition
```

Should use dot notation: `section.paragraphs[0]?.animation?.transition`

---

### 4. **MenuChapter.vue** (MODERATE)

**Issues:**

#### a) **Hardcoded Menu Index**
```vue
<li v-if="index === 'Part2'">
```

Only renders "Part2" from menu.json. What about Part1, Part3, etc.?

#### b) **Inline Event Handlers with Multiple Actions**
```vue
@click="scrollToMenu(toSlug(part.title)), closeMenu()"
```

Should extract to methods for better readability.

---

## Component Patterns & Issues

### 1. **Prop Drilling** (MEDIUM SEVERITY)

**Problem:** Data passed through many component layers

```
ChapterView.vue
  └─ TextComp.vue (gets text data)
      └─ SectionComp.vue (receives section)
          └─ SubSection.vue (receives paragraph)
              └─ SubSubSection.vue (receives subparagraph)
```

**Recommendation:**
- Use `provide/inject` for deeply nested data
- Or use Pinia stores directly in child components

---

### 2. **No Component Documentation** (HIGH SEVERITY)

**Problem:** Zero JSDoc comments or prop documentation

```vue
<script setup>
const props = defineProps({
  animation: Object,  // What shape? What properties?
  activeAnimation: String,  // What format? What values?
});
</script>
```

**Recommendation:**
```vue
<script setup>
/**
 * Renders and controls Lottie animations with interactive states
 * @component IllustrationComp
 */
const props = defineProps({
  /** Animation configuration object from animations.json */
  animation: {
    type: Object,
    required: true,
    validator: (val) => val.id && val.title
  },
  /** ID of the currently active animation */
  activeAnimation: {
    type: String,
    default: null
  }
});
</script>
```

Or with TypeScript:
```typescript
interface AnimationConfig {
  id: string;
  title: string;
  fullscreen: boolean;
  states?: string[];
  loop?: boolean;
}

const props = defineProps<{
  animation: AnimationConfig;
  activeAnimation?: string;
}>();
```

---

### 3. **Inconsistent Event Naming** (LOW SEVERITY)

**Problem:** Mix of event naming styles

```vue
@onClick="setState"          // camelCase with "on" prefix
@click="playPause()"         // native event
```

**Recommendation:** Use consistent naming:
```vue
@update:state="handleStateUpdate"
@play-pause="handlePlayPause"
```

---

### 4. **No Error Boundaries** (MEDIUM SEVERITY)

**Problem:** No error handling for component failures

If Lottie animation fails to load, entire app could break:
```javascript
animationLottie = lottie.loadAnimation({
  path: `/publicAssets/animations/${props.animation.id}.json`,
});
// What if this fails?
```

**Recommendation:**
```vue
<script setup>
import { onErrorCaptured } from 'vue';

const error = ref(null);

onErrorCaptured((err) => {
  error.value = err;
  console.error('Animation failed to load:', err);
  return false; // Prevent error propagation
});
</script>

<template>
  <div v-if="error" class="error-state">
    Failed to load animation
  </div>
  <div v-else>
    <!-- Normal rendering -->
  </div>
</template>
```

---

### 5. **Tight Coupling to Global State** (MEDIUM SEVERITY)

**Problem:** Many components directly import and use stores

```vue
<script setup>
import { useGeneral } from "@/stores";
const store = useGeneral();
</script>
```

**Issues:**
- Hard to test in isolation
- Hard to reuse outside this project
- Tight coupling to specific store structure

**Recommendation:**
```vue
<script setup>
// Option 1: Accept data via props
const props = defineProps({
  isMenuActive: Boolean,
  currentSubChapter: String
});

const emit = defineEmits(['update:isMenuActive']);

// Option 2: Use composable that wraps store
import { useMenuState } from '@/composables/useMenuState';
const { isMenuActive, currentSubChapter, toggleMenu } = useMenuState();
</script>
```

---

### 6. **Missing Component Tests** (HIGH SEVERITY)

**Problem:** No component tests found

```
src/
├── components/  ← 48 components
└── __tests__/   ← Does not exist
```

**Recommendation:**
```javascript
// components/__tests__/IllustrationComp.spec.js
import { mount } from '@vue/test-utils';
import IllustrationComp from '../IllustrationComp.vue';

describe('IllustrationComp', () => {
  it('renders animation title', () => {
    const wrapper = mount(IllustrationComp, {
      props: {
        animation: {
          id: 'test',
          title: 'Test Animation'
        }
      }
    });
    expect(wrapper.text()).toContain('Test Animation');
  });
});
```

---

## Composables Analysis

### Current Composables: ZERO

**Problem:** All logic is in components, no reusable composables

**Should Extract:**

#### 1. **useAnimation.js** (Lottie Logic)
```javascript
// composables/useAnimation.js
import { ref, onMounted } from 'vue';
import lottie from 'lottie-web';

export function useAnimation(containerId, config) {
  const animation = ref(null);
  const isPaused = ref(false);
  
  const load = () => {
    animation.value = lottie.loadAnimation({
      container: document.getElementById(containerId),
      ...config
    });
  };
  
  const playPause = () => {
    if (isPaused.value) {
      animation.value.play();
    } else {
      animation.value.pause();
    }
    isPaused.value = !isPaused.value;
  };
  
  onMounted(load);
  
  return { animation, isPaused, playPause };
}
```

#### 2. **useScrollTrigger.js** (GSAP Logic)
```javascript
// composables/useScrollTrigger.js
import { onMounted, onBeforeUnmount } from 'vue';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export function useScrollTrigger(selector, config) {
  let trigger = null;
  
  onMounted(() => {
    trigger = ScrollTrigger.create({
      trigger: selector,
      ...config
    });
  });
  
  onBeforeUnmount(() => {
    trigger?.kill();
  });
  
  return { trigger };
}
```

#### 3. **usePerlinNoise.js** (Eye Movement)
```javascript
// composables/usePerlinNoise.js
import { ref, onMounted, onBeforeUnmount } from 'vue';
import Perlin from '@/helper/perlin.ts';

export function usePerlinNoise(speedX = 0.00006, speedY = 0.00005) {
  const x = ref(0);
  const y = ref(0);
  let interval = null;
  
  onMounted(() => {
    const noise = new Perlin(Math.random());
    let timer = 0;
    
    interval = setInterval(() => {
      timer += 15;
      x.value = noise.simplex2(timer * speedX, timer * speedX) * 20;
      y.value = noise.simplex2(timer * speedY, timer * speedY) * 15;
    }, 15);
  });
  
  onBeforeUnmount(() => {
    clearInterval(interval);
  });
  
  return { x, y };
}
```

#### 4. **useLocalStorage.js** (Already exists in stores, should be composable)

---

## Icon Components

### Current State: 29 Icon Components

**Structure:**
```
src/icons/
├── BiCheckCircle.vue
├── BiUpload.vue
├── MaterialSymbolsPlayArrow.vue
├── custom/
│   ├── Brain.vue
│   ├── PlayIcon.vue
│   ├── PauseIcon.vue
│   └── ... (20 more)
```

**Issues:**

#### a) **No Consistent Sizing Props**
Some icons use hardcoded sizes, others accept props inconsistently.

**Recommendation:**
```vue
<!-- icons/BaseIcon.vue -->
<script setup>
const props = defineProps({
  size: { type: Number, default: 24 },
  color: { type: String, default: 'currentColor' }
});
</script>

<template>
  <svg 
    :width="size" 
    :height="size"
    :fill="color"
  >
    <slot />
  </svg>
</template>
```

#### b) **Could Use Icon Library**
Consider using `@iconify/vue` or `unplugin-icons` instead of manual components.

---

## Component Reusability Score

### Highly Reusable (8/48 - 17%)
- `InteractionButton.vue`
- `ActionButton.vue`
- `StateElement.vue`
- `LegendElement.vue`
- Icon components

### Moderately Reusable (15/48 - 31%)
- Most UI components
- Some Illus components

### Not Reusable (25/48 - 52%)
- Tightly coupled to this specific project's data structure
- Hardcoded assumptions about JSON structure
- Direct DOM manipulation specific to this layout

**Target:** 80%+ of components should be reusable

---

## Recommendations

### High Priority

1. **Add TypeScript to Components**
   - Start with prop types
   - Add interfaces for data structures
   - Get autocomplete and type safety

2. **Extract Composables**
   - `useAnimation` for Lottie logic
   - `useScrollTrigger` for GSAP logic
   - `usePerlinNoise` for eye movement

3. **Add Component Documentation**
   - JSDoc comments for all components
   - Prop validation with types
   - Usage examples in comments

4. **Reduce Component Complexity**
   - Split `IllustrationComp` into smaller components
   - Extract template logic to computed properties
   - Reduce nesting depth

### Medium Priority

5. **Fix Prop Drilling**
   - Use `provide/inject` for deep nesting
   - Or access stores directly where appropriate

6. **Add Error Handling**
   - `onErrorCaptured` in parent components
   - Try/catch for async operations
   - Fallback UI for failed loads

7. **Create Component Tests**
   - Unit tests for UI components
   - Integration tests for complex components
   - Test user interactions

8. **Standardize Event Handling**
   - Consistent event naming
   - Use `defineEmits` properly
   - Document emitted events

### Low Priority

9. **Improve Icon System**
   - Create base icon component
   - Consistent sizing props
   - Or migrate to icon library

10. **Reduce Global State Coupling**
    - Pass data via props where possible
    - Make components more portable

---

## Component Checklist Template

For new components, ensure:

- [ ] Uses Composition API (`<script setup>`)
- [ ] Has TypeScript prop definitions
- [ ] Has JSDoc documentation
- [ ] Props are validated
- [ ] Events are defined with `defineEmits`
- [ ] Has unit tests
- [ ] Uses refs instead of direct DOM queries
- [ ] Extracts complex logic to composables
- [ ] Has error handling
- [ ] Template is not overly nested (< 5 levels)
- [ ] No magic numbers (use named constants)
- [ ] Reusable (not tightly coupled to project)

---

## Estimated Refactoring Effort

- **Add documentation:** 8-12 hours
- **Extract composables:** 12-16 hours
- **Add TypeScript:** 16-24 hours
- **Split complex components:** 16-20 hours
- **Add tests:** 40-60 hours
- **Total:** 92-132 hours

---

## Conclusion

The component architecture shows **good adoption of Vue 3 best practices** (81% using Composition API), but suffers from:

1. **High complexity** in key components (IllustrationComp, TextComp)
2. **Lack of documentation** - No prop types, no JSDoc
3. **No composables** - Logic not reused effectively
4. **Tight coupling** - To JSON structure and global state
5. **No tests** - Zero component test coverage

**Quick Wins:**
1. Add TypeScript prop definitions (2-4 hours, huge DX improvement)
2. Extract Lottie logic to `useAnimation` composable (4-6 hours)
3. Add JSDoc to top 10 most-used components (4-6 hours)

**Strategic Improvements:**
- Adopt TypeScript fully for type safety
- Build comprehensive test suite
- Refactor complex components into smaller, focused components
- Create library of reusable composables
