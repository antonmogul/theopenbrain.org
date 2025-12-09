# Data Layer & JSON Architecture Audit

**Generated:** 2025-11-17  
**Project:** theopenbrain.org v0.1.20

---

## Executive Summary

The application uses a **JSON-file-based data layer** with no backend database or API. All content is stored in static JSON files that are imported at build time. User data (highlights, comments) is stored in **browser localStorage**. While this is simple and works for a single-user educational application, it has significant limitations for scalability, collaboration, and data integrity.

---

## Data Architecture Overview

### Data Sources

```
src/assets/json_backend/
├── text.json           # 1,071 lines - Main educational content
├── animations.json     # 441 lines - Animation configurations  
├── footnoets.json      # 325 lines - Footnotes (typo in filename)
├── menu.json           # 122 lines - Navigation structure
├── breakVideos.json    # 16 lines - Break video metadata
└── infosImages.json    # 12 lines - Hover image data

Total: 1,987 lines of JSON
```

### Storage Layers

1. **Static Content** → JSON files (read-only, bundled at build)
2. **User Modifications** → localStorage (browser-only, mutable)
3. **Runtime State** → Pinia stores (in-memory, ephemeral)

---

## JSON File Analysis

### 1. **text.json** (Main Content Data)

**Size:** 1,071 lines, ~112KB  
**Purpose:** Educational content about the retina

**Structure:**
```json
{
  "intro": [
    {
      "id": "uuid",
      "title": "The Retina",
      "animation": { "name": "dragon" },
      "paragraphs": [
        {
          "id": "uuid",
          "text": "<p>HTML content with <span> tags and <sup> for footnotes</p>"
        }
      ]
    }
  ],
  "sections": [
    {
      "id": "uuid",
      "title": "Section Title",
      "paragraphs": [
        {
          "id": "uuid",
          "text": "...",
          "animation": { "name": "...", "id": "...", "transition": true },
          "subSection": [
            {
              "id": "uuid",
              "title": "Subsection Title",
              "paragraphs": [
                {
                  "id": "uuid",
                  "text": "...",
                  "subSubSection": [...]
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  "furtherReading": [...],
  "footNotes": [...]
}
```

**Issues:**

#### a) **Deeply Nested Structure** (HIGH SEVERITY)
```
sections → paragraphs → subSection → paragraphs → subSubSection → paragraphs
```

**Problems:**
- Difficult to query or search
- Complex traversal logic (see `updateSectionsObj` in stores/index.js:244-285)
- Hard to maintain and update
- No maximum nesting level enforced

**Code Example from stores/index.js:**
```javascript
updateSectionsObj(sections, newString, id, sectionId) {
  let entries = Object.entries(sections);
  //check sections
  for (var i = 0; i < entries.length; i++) {
    let section = entries[i][1];
    if (sectionId === _sectionId) {
      //check paragraphs
      let subEntries = Object.entries(section.paragraphs);
      for (let subEntrie of subEntries) {
        if (id === _paragraphId) {
          paragraph.text = newString;
        } else {
          if (subEntrie[1].subSection) {
            // More nesting...
            if (subParagraph.subSubSection) {
              // Even more nesting...
            }
          }
        }
      }
    }
  }
}
```

**Recommendation:**
- **Flatten structure** - Use references instead of nesting
- **Normalize data** - Separate entities (sections, paragraphs) into flat arrays
```json
{
  "sections": { "sec-1": { "id": "sec-1", "paragraphIds": ["p-1", "p-2"] } },
  "paragraphs": { "p-1": { "id": "p-1", "text": "...", "parentId": "sec-1" } }
}
```

#### b) **HTML in JSON** (MEDIUM SEVERITY)

Content includes raw HTML:
```json
{
  "text": "...Alcmeon</span> (Greece, 5th century BCE), thought of the eye as a lantern, emitting an internally generated fire that was required for seeing<sup data-sup='1'>1</sup>."
}
```

**Issues:**
- XSS risk if content ever becomes user-generated
- Hard to parse/search/analyze
- Difficult to apply different rendering (mobile, PDF, etc.)
- Currently using `v-html` which bypasses Vue's XSS protection

**Recommendation:**
- **Use Markdown instead** - Safer, more portable
- **Or structured content blocks:**
```json
{
  "content": [
    { "type": "text", "value": "Alcmeon" },
    { "type": "hover-image", "value": "Alcmeon", "imageId": "alcmeon" },
    { "type": "text", "value": " (Greece, 5th century BCE)..." },
    { "type": "footnote", "refId": "1" }
  ]
}
```

#### c) **Inconsistent Property Names** (LOW SEVERITY)

```json
"subSection": [...],    // camelCase
"subSubSection": [...], // camelCase
"subSubParP": "...",    // Abbreviation?
```

**Recommendation:** Use consistent naming convention

#### d) **UUIDs vs Semantic IDs** (LOW SEVERITY)

Mix of UUIDs and semantic IDs:
```json
"id": "638ccd51-c31a-4f74-b3a5-ab50f9f5dd6f"  // UUID
"id": "accommodation"                          // Semantic
```

**Recommendation:**
- UUIDs for content pieces (good for collision-free)
- Semantic IDs for animations/features (good for developer experience)
- Be consistent

---

### 2. **animations.json**

**Size:** 441 lines  
**Purpose:** Animation configuration metadata

**Structure:**
```json
{
  "animations": [
    {
      "id": "animationEyeStructur",
      "title": "Eye structure",
      "fullscreen": false,
      "clickTriggered": true,
      "highlight": true,
      "states": ["Lens", "Iris", "Cornea", ...]
    }
  ]
}
```

**Issues:**

#### a) **States as Strings Array** (MEDIUM SEVERITY)
```json
"states": [
  "Light shines into an eye, activating the retina",
  "Retinal ganglion cells project bilaterally to the pretectal olivary nucleus"
]
```

**Problem:** No structured data, just text descriptions

**Recommendation:**
```json
"states": [
  {
    "id": "state-1",
    "description": "Light shines into an eye, activating the retina",
    "duration": 2000,
    "highlightElements": ["retina"],
    "narration": "..."
  }
]
```

#### b) **Boolean Flags** (LOW SEVERITY)
Many boolean flags without clear semantics:
- `fullscreen`
- `clickTriggered`
- `highlight`
- `loop`
- `isTransition`
- `noBleed`

**Recommendation:** Group related flags or use enum for animation type

---

### 3. **footnoets.json** (Typo!)

**Size:** 325 lines  
**Issue:** Filename has typo: `footnoets` should be `footnotes`

**Structure:**
```json
{
  "1": {
    "id": "1",
    "text": "Wade, N. (2007). Philosophical instruments..."
  }
}
```

**Issues:**

#### a) **String Keys for Numbers** (LOW SEVERITY)
```json
"1": { "id": "1" }
```

Could be:
```json
[
  { "id": 1, "text": "..." }
]
```

#### b) **Duplicate ID** (LOW SEVERITY)
```json
"1": { "id": "1" }  // ID stored in both key and value
```

**Recommendation:** Use array with numeric IDs or just use the key

---

### 4. **menu.json**

**Size:** 122 lines  
**Purpose:** Navigation structure

**Structure:**
```json
{
  "Part1": {
    "index": 0,
    "title": "The History of Neuroscience",
    "parts": ["Lorem ipsum...", "Aliquam tincidunt..."]
  },
  "Part2": {
    "index": 2,
    "title": "The Retina",
    "parts": [
      { "title": "Story of the eye" },
      {
        "title": "Organization and cell types in the retina",
        "parts": ["Cross-sectional anatomy", ...]
      }
    ]
  }
}
```

**Issues:**

#### a) **Inconsistent Array Types** (MEDIUM SEVERITY)
```json
"parts": ["String", { "object": "..." }, "String"]  // Mixed types!
```

**Recommendation:** Use consistent structure:
```json
"parts": [
  { "type": "text", "content": "Lorem ipsum..." },
  { "type": "section", "title": "...", "children": [...] }
]
```

#### b) **Non-sequential Indices** (LOW SEVERITY)
```json
"Part1": { "index": 0 },
"Part2": { "index": 2 }  // Where's index 1?
```

---

### 5. **breakVideos.json**

**Size:** 16 lines  
**Purpose:** Video metadata

```json
[
  {
    "id": "retinalMovement",
    "videoUrl": "https://www.youtube.com/embed/...",
    "caption": "Time-lapse video showing retinal tissue..."
  }
]
```

**Assessment:** ✓ Clean structure, no issues

---

### 6. **infosImages.json**

**Size:** 12 lines  
**Purpose:** Hover image data

```json
{
  "alcmeon": "/publicAssets/images/Alcmaeon.jpg",
  "islamicGoldenAge": "/publicAssets/images/IbnAlHaytham.jpg"
}
```

**Issues:**

#### a) **Hardcoded Paths** (LOW SEVERITY)
Paths are hardcoded strings. Could use Vite's import system for better optimization.

**Recommendation:**
```javascript
// Use dynamic imports or Vite glob imports
const images = import.meta.glob('/publicAssets/images/*.jpg')
```

---

## LocalStorage Usage

### What's Stored

1. **`sections`** - Modified text.json with user highlights (as `<mark>` tags)
2. **`selection`** - Array of highlight IDs: `["highlight-id-1-42", ...]`
3. **`comments`** - Object mapping highlight IDs to comment strings
4. **`hasBeenVisited`** - Timestamp of last visit

### Issues

#### 1. **No Schema Validation** (HIGH SEVERITY)

**Problem:** Data is stored and loaded with no validation
```javascript
// stores/index.js
text: localStorage.sections ? JSON.parse(localStorage.sections) : jsonText
```

**Risk:**
- Corrupted data crashes the app
- No migration path for schema changes
- User could manually edit localStorage and break things

**Recommendation:**
```javascript
function loadText() {
  try {
    const stored = localStorage.getItem('sections');
    if (!stored) return jsonText;
    
    const parsed = JSON.parse(stored);
    
    // Validate schema
    if (!isValidTextStructure(parsed)) {
      console.warn('Invalid stored data, using default');
      return jsonText;
    }
    
    // Check version
    if (parsed.version !== CURRENT_VERSION) {
      return migrateData(parsed, CURRENT_VERSION);
    }
    
    return parsed;
  } catch (e) {
    console.error('Failed to load stored text:', e);
    return jsonText;
  }
}
```

#### 2. **No Data Versioning** (HIGH SEVERITY)

**Problem:** If `text.json` structure changes, old localStorage data breaks

**Example Scenario:**
1. User highlights text in v0.1.20
2. App updates to v0.2.0 with new JSON structure
3. User's localStorage references old IDs that no longer exist
4. App crashes or highlights disappear

**Recommendation:**
```json
{
  "version": "1.0.0",
  "data": { ... }
}
```

#### 3. **LocalStorage Size Limits** (MEDIUM SEVERITY)

**Issue:** text.json is 112KB, localStorage limit is ~5-10MB
- If user highlights heavily, could hit limits
- No error handling for quota exceeded

**Recommendation:**
```javascript
try {
  localStorage.setItem('sections', JSON.stringify(data));
} catch (e) {
  if (e.name === 'QuotaExceededError') {
    alert('Storage limit reached. Please export your data.');
    // Offer export or cleanup old data
  }
}
```

#### 4. **Data Loss Risk** (HIGH SEVERITY)

**Scenarios where user loses data:**
1. Clear browser cache
2. Switch browsers
3. Use private/incognito mode
4. Different device

**Current Export/Import:**
- Export: Downloads JSON file ✓
- Import: Loads JSON file ✓

**Missing:**
- Auto-save to cloud
- Cross-device sync
- Recovery options
- Versioning/history

#### 5. **No Conflict Resolution** (MEDIUM SEVERITY)

**Problem:** If `text.json` updates (new content added), how to merge with user's localStorage?

**Example:**
```javascript
// v0.1.20: text.json has sections 1-10
// User highlights section 5
// v0.2.0: text.json now has sections 1-15
// User's localStorage still has old section structure
// Highlights may be on wrong content
```

**Recommendation:**
- Track content version alongside highlights
- Only apply highlights if content hash matches
- Or, store highlights as offsets/ranges, not by ID

---

## Data Integrity Issues

### 1. **No Referential Integrity**

**Problem:** Animation IDs in text.json may not exist in animations.json

```json
// text.json
"animation": { "name": "EyeStructur" }

// animations.json - What if this ID doesn't exist?
```

**Recommendation:** Validate references at build time

### 2. **Typo in Filename**

`footnoets.json` should be `footnotes.json` - indicates lack of automated testing

### 3. **No Data Validation**

No JSON Schema or TypeScript interfaces enforcing structure

**Recommendation:**
```typescript
// types/content.ts
interface Section {
  id: string;
  title: string;
  paragraphs: Paragraph[];
  animationFull?: boolean;
}

interface Paragraph {
  id: string;
  text: string;
  animation?: AnimationReference;
  subSection?: Section[];
}
```

---

## Scalability Concerns

### Current Limitations

1. **Single User Only** - localStorage is per-browser
2. **No Collaboration** - Can't share highlights/comments
3. **No Analytics** - Can't track which sections users engage with
4. **Static Content** - Can't update content without new deploy
5. **No Search** - Content isn't indexed
6. **No Access Control** - Everything is public in bundle

### If This Were to Scale...

**Needed:**
1. **Backend API** - REST or GraphQL
2. **Database** - PostgreSQL/MongoDB for content + user data
3. **User Authentication** - To save data per user
4. **Content Management** - CMS for non-technical editing
5. **Search Index** - Elasticsearch or Algolia
6. **CDN** - For serving static JSON
7. **Caching** - To avoid re-parsing huge JSON files

---

## Alternative Architectures

### Option 1: Markdown + Frontmatter (Recommended for this project)

**Instead of:**
```json
{
  "text": "<p>Content with <span id='foo'>HTML</span></p>"
}
```

**Use:**
```markdown
---
id: "638ccd51-c31a-4f74-b3a5-ab50f9f5dd6f"
animation: "dragon"
---

# The Retina

Seeing starts in our eyes. Is this because something from the outside 
world passes into our eyes...

![Alcmeon](/images/Alcmaeon.jpg)
```

**Benefits:**
- Easier to edit
- Safer (no XSS)
- Portable (can export to PDF, etc.)
- Version control friendly (better diffs)
- Can use Vite plugins like `vite-plugin-md`

### Option 2: Headless CMS (For future scaling)

**Options:**
- **Strapi** - Self-hosted, free
- **Sanity** - Hosted, generous free tier
- **Contentful** - Hosted, good for structured content

**Benefits:**
- Non-technical content editing
- Versioning built-in
- API-first
- Image optimization
- Preview environments

### Option 3: SQLite + Better-SQLite3 (Middle ground)

**Use case:** Keep it simple but with better querying

```javascript
import Database from 'better-sqlite3';

const db = new Database('content.db');

// Query is now easy
const section = db.prepare('SELECT * FROM sections WHERE id = ?').get(sectionId);
const search = db.prepare('SELECT * FROM paragraphs WHERE text LIKE ?').all('%retina%');
```

**Benefits:**
- File-based (like JSON) but with SQL queries
- Better for search and complex queries
- Still works offline
- Could be bundled with app

---

## Security Concerns

### 1. **XSS via v-html** (HIGH SEVERITY)

**Current code:**
```vue
<p v-html="paragraph.text" />
```

If `text.json` ever accepts user input (e.g., collaborative editing), this is an XSS vector.

**Recommendation:**
- Sanitize HTML with DOMPurify
- Or switch to Markdown
- Or use structured content (not HTML strings)

### 2. **No Input Validation**

User comments are stored directly:
```javascript
this.comments[this.activeCom] = input;  // No sanitization
localStorage.setItem("comments", JSON.stringify(this.comments));
```

**Recommendation:**
```javascript
function sanitizeComment(input) {
  return input
    .trim()
    .slice(0, 1000)  // Max length
    .replace(/<script>/gi, '');  // Basic XSS prevention
}
```

### 3. **localStorage is Not Encrypted**

User data is stored in plain text. Not a huge issue for this app, but worth noting.

---

## Recommendations Summary

### Immediate (Do Now)
1. ✅ **Fix typo:** Rename `footnoets.json` to `footnotes.json`
2. ✅ **Add localStorage error handling** for quota exceeded
3. ✅ **Add data versioning** to localStorage
4. ✅ **Add try/catch** around JSON.parse()

### Short Term (Next Sprint)
5. ✅ **Flatten text.json structure** - Use references instead of deep nesting
6. ✅ **Add JSON Schema validation** for all data files
7. ✅ **Sanitize user comments** before storing
8. ✅ **Add migration system** for localStorage schema changes

### Medium Term (Next Quarter)
9. ✅ **Convert to Markdown** instead of HTML in JSON
10. ✅ **Add TypeScript interfaces** for all data structures
11. ✅ **Implement conflict resolution** for content updates
12. ✅ **Add data export versioning**

### Long Term (If Scaling)
13. ✅ **Consider Headless CMS** (Strapi, Sanity)
14. ✅ **Add backend API** for user data
15. ✅ **Implement user authentication**
16. ✅ **Add search index** (Algolia, MeiliSearch)

---

## Estimated Refactoring Effort

- **Immediate fixes:** 2-4 hours
- **Short term improvements:** 8-16 hours  
- **Medium term (Markdown migration):** 20-30 hours
- **Long term (CMS):** 80-120 hours

---

## Conclusion

The JSON-based data layer is **functional for a single-user educational app** but has significant technical debt:

**Biggest Issues:**
1. **Deeply nested structure** - Hard to maintain and query
2. **HTML in JSON** - Security and portability concerns
3. **No data versioning** - Risk of breaking user data on updates
4. **No validation** - Corrupted data can crash the app

**Quick Wins:**
1. Fix the `footnoets.json` typo
2. Add localStorage error handling
3. Add data versioning
4. Flatten the JSON structure

**Strategic Decision Needed:**
- Stay with JSON files (simple, works for current scale)
- Move to Markdown + Frontmatter (better DX, safer)
- Adopt a Headless CMS (best for scaling, more complex)

For the current scope (single educational chapter, single user), the JSON approach is acceptable **if** the immediate and short-term fixes are implemented. For a multi-chapter, multi-user platform, a CMS would be warranted.
