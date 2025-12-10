# Developer Ticket: Chapter 2 Loading Incorrect Content (Chapter 1)

## Issue Summary
Chapter 2 (`/chapter/2/visual-perception-ux`) is displaying Chapter 1 content ("The Retina") instead of the correct Chapter 2 content from Supabase. The data appears to be loading from localStorage or the component is not reactively updating when the store changes.

## Priority
**HIGH** - Core functionality broken

## Environment
- **URL**: `http://localhost:5173/chapter/2/visual-perception-ux`
- **Framework**: Vue 3 with Vite
- **State Management**: Pinia
- **Data Source**: Supabase (Chapter 2) vs JSON file (Chapter 1)

## Steps to Reproduce
1. Navigate to `http://localhost:5173/chapter/1/the-retina` (Chapter 1 loads correctly)
2. Navigate to `http://localhost:5173/chapter/2/visual-perception-ux` (Chapter 2)
3. Observe: Page displays "The Retina" content instead of "Visual Perception and UX"

## Expected Behavior
- Chapter 2 should load data from Supabase
- Page should display "Visual Perception and UX" content
- Text store should be updated with Chapter 2 data
- Component should re-render with new data

## Actual Behavior
- Page displays Chapter 1 content ("The Retina")
- Console shows data is being fetched successfully from Supabase
- Store appears to be updated but component doesn't reflect changes

## Technical Details

### Data Flow
1. `ChapterView.vue` extracts route params (`number`, `slug`)
2. If `number !== '1'`, calls `useChapter().fetchChapter(slug)`
3. On success, calls `storeText.updateText('*', data)`
4. `TextComp.vue` should reactively display `textStore.text`

### Key Files
- `src/views/ChapterView.vue` - Main chapter view component
- `src/composables/useChapter.js` - Generic chapter data fetcher
- `src/stores/index.js` - Text store with `updateText` method
- `src/components/chapter/TextComp.vue` - Text display component

### Current Implementation

**ChapterView.vue** (`loadChapter` function):
```javascript
async function loadChapter() {
  chapterDataLoaded.value = false;
  
  if (chapterNumber === '1') {
    // Chapter 1: Load from JSON
    storeText.updateText('*', jsonText);
    chapterDataLoaded.value = true;
  } else {
    // Chapter 2+: Load from Supabase
    if (chapterSlug) {
      // Clear Chapter 1 data from localStorage
      const storedData = localStorage.getItem('sections') ? JSON.parse(localStorage.getItem('sections')) : null;
      const storedTitle = storedData?.intro?.[0]?.title;
      
      if (storedTitle === 'The Retina') {
        localStorage.removeItem('sections');
        localStorage.removeItem('selection');
        localStorage.removeItem('comments');
      }
      
      const { data, error: fetchError } = await fetchChapter(chapterSlug);
      
      if (data) {
        storeText.updateText('*', data);
        chapterDataLoaded.value = true;
      }
    }
  }
}
```

**Text Store** (`updateText` method):
```javascript
updateText(part, textNew) {
  if (part != "*") {
    this.text[part] = textNew;
    let _newLoaclText = JSON.stringify(this.text);
    localStorage.setItem("sections", _newLoaclText);
  } else {
    this.text = textNew;
    // Also update localStorage when replacing all text
    localStorage.setItem("sections", JSON.stringify(textNew));
  }
}
```

**TextComp.vue** (data source):
```javascript
const textStore = useText();
const text = ref(textStore.text);  // ⚠️ POTENTIAL ISSUE: Not reactive
const source = computed(() => {
  let _textStore = textStore.text;
  return _textStore;
});
```

## Debugging Checklist

### 1. Verify Data is Loading
- [ ] Check browser console for `useChapter` logs
- [ ] Verify Supabase request succeeds (Network tab)
- [ ] Confirm `transformedData` is populated
- [ ] Check that `fetchChapter` returns correct data structure

**Debug Code to Add:**
```javascript
// In ChapterView.vue loadChapter function
console.log('Loading chapter:', chapterNumber, chapterSlug);
const { data, error: fetchError } = await fetchChapter(chapterSlug);
console.log('Fetched data:', data);
console.log('Store text before update:', storeText.text?.intro?.[0]?.title);
storeText.updateText('*', data);
console.log('Store text after update:', storeText.text?.intro?.[0]?.title);
```

### 2. Verify Store Updates
- [ ] Check if `storeText.updateText('*', data)` is being called
- [ ] Verify `storeText.text` changes after update
- [ ] Check if Pinia store is reactive
- [ ] Confirm localStorage is updated

**Debug Code to Add:**
```javascript
// In stores/index.js updateText method
updateText(part, textNew) {
  console.log('updateText called:', part, textNew?.intro?.[0]?.title);
  if (part != "*") {
    this.text[part] = textNew;
    let _newLoaclText = JSON.stringify(this.text);
    localStorage.setItem("sections", _newLoaclText);
  } else {
    console.log('Replacing all text. Old:', this.text?.intro?.[0]?.title, 'New:', textNew?.intro?.[0]?.title);
    this.text = textNew;
    localStorage.setItem("sections", JSON.stringify(textNew));
    console.log('Store updated. Current text:', this.text?.intro?.[0]?.title);
  }
}
```

### 3. Verify Component Reactivity
- [ ] Check if `TextComp` is using reactive `source` computed property
- [ ] Verify component key changes when switching chapters
- [ ] Check if component re-renders after store update
- [ ] Confirm `v-if` conditions are met

**Debug Code to Add:**
```javascript
// In TextComp.vue
watch(() => textStore.text, (newText) => {
  console.log('TextComp: Store text changed:', newText?.intro?.[0]?.title);
}, { deep: true });

watch(source, (newSource) => {
  console.log('TextComp: Source computed changed:', newSource?.intro?.[0]?.title);
}, { deep: true });
```

### 4. Check localStorage Interference
- [ ] Clear all localStorage and test
- [ ] Check if localStorage has stale Chapter 1 data
- [ ] Verify localStorage is cleared when switching chapters
- [ ] Check store initialization from localStorage

**Debug Code:**
```javascript
// In browser console
localStorage.clear();
// Then navigate to Chapter 2
```

### 5. Verify Route Changes
- [ ] Check if `watch` on route params is firing
- [ ] Verify `loadChapter` is called on route change
- [ ] Check if component unmounts/remounts

**Debug Code to Add:**
```javascript
// In ChapterView.vue
watch(() => [route.params.number, route.params.slug], (newParams, oldParams) => {
  console.log('Route params changed:', oldParams, '->', newParams);
  loadChapter();
}, { immediate: false });
```

## Potential Root Causes

### 1. **TextComp Not Reactive** (MOST LIKELY)
- `TextComp` initializes `text` as `ref(textStore.text)` which captures initial value
- Component uses `source` computed but may not be watching store changes properly
- **Fix**: Ensure `TextComp` watches store changes or uses computed property correctly

### 2. **Store Not Updating**
- Pinia store might not be reactive
- `updateText` might not trigger reactivity
- **Fix**: Use Pinia's `$patch` or ensure proper reactivity

### 3. **localStorage Override**
- Store initializes from localStorage on mount
- localStorage might have stale Chapter 1 data
- **Fix**: Clear localStorage before loading new chapter OR don't initialize from localStorage

### 4. **Timing Issue**
- Component renders before data loads
- Store updates after component mounts
- **Fix**: Ensure component only renders after data is loaded

### 5. **Component Key Not Changing**
- Vue might be reusing component instance
- Key might not be unique enough
- **Fix**: Use more unique key or force remount

## Recommended Fix Strategy

### Option 1: Make TextComp Fully Reactive
```javascript
// In TextComp.vue - Remove ref initialization, use computed only
const source = computed(() => textStore.text);
// Remove: const text = ref(textStore.text);
```

### Option 2: Force Component Remount
```javascript
// In ChapterView.vue - Use timestamp in key
<Text :key="`chapter-${chapterNumber}-${chapterSlug}-${Date.now()}`" />
```

### Option 3: Clear Store on Route Change
```javascript
// In ChapterView.vue loadChapter
storeText.text = null; // Clear first
await nextTick(); // Wait for reactivity
storeText.updateText('*', data);
```

### Option 4: Don't Initialize from localStorage
```javascript
// In stores/index.js - Don't use localStorage as initial state
state: () => ({
  text: jsonText, // Always start with JSON, load from localStorage separately
  // ...
})
```

## Testing Steps After Fix

1. Clear browser localStorage
2. Navigate to `/chapter/1/the-retina` - Should show Chapter 1
3. Navigate to `/chapter/2/visual-perception-ux` - Should show Chapter 2
4. Navigate back to Chapter 1 - Should show Chapter 1
5. Refresh page on Chapter 2 - Should still show Chapter 2
6. Check browser console for errors
7. Check Network tab for Supabase requests

## Additional Notes

- Font 404 errors are separate issue (relative paths in CSS)
- Router warnings about "chapter/break/placeholder" are separate issue
- Focus on the data loading and reactivity issue first

## Related Files
- `src/views/ChapterView.vue`
- `src/composables/useChapter.js`
- `src/stores/index.js`
- `src/components/chapter/TextComp.vue`
- `src/router/index.js`

## Console Logs to Check
Look for:
- `useChapter: Fetched modules:`
- `useChapter: Found Chapter 2:`
- `useChapter: Transformed data:`
- Any errors in console
- Vue reactivity warnings

---

**Assigned To**: [Developer Name]  
**Created**: [Date]  
**Status**: Open  
**Labels**: bug, high-priority, reactivity, state-management
