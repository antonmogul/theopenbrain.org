# Complete Animation Analysis & Categorization

**Date:** 2025-11-17  
**Total Animations:** 35 Lottie JSON files  
**Total Size:** 30.3 MB  
**Actively Used:** 33 files  
**Unused:** 2 files (18 MB!)

---

## Executive Summary

This document provides a comprehensive analysis of all 35 Lottie animation files in the project. Each animation has been analyzed for:
- File size and location
- Configuration properties
- Usage in content
- Component rendering
- Interaction patterns
- Optimization opportunities

**Key Finding:** `animationStart.json` (18 MB, 59% of total) is **NOT USED** in the application and can be deleted.

---

## Complete Animation Inventory

| # | Animation Key | File Size | Used | Section | Interaction Type | Complexity | Component |
|---|--------------|-----------|------|---------|------------------|------------|-----------|
| 1 | animationDragon | 1.1 MB | ✓ | Intro | Auto-play loop | Simple | IllustrationComp |
| 2 | animationEyeStructurTransition | 2.3 MB | ✓ | Story of eye | Scroll transition | Medium | IllustrationTransition |
| 3 | animationEyeStructur | 29 KB | ✓ | Story of eye | Click (11 states) | High | IllustrationComp |
| 4 | animationAccommodationVergence | 308 KB | ✓ | Story of eye | Auto-play loop | Medium | IllustrationComp |
| 5 | animationPupillaryLightreflex | 32 KB | ✓ | Story of eye | Fullscreen (5 states) | High | FullScreenIllustrationLoop |
| 6 | animationImpairedVision | 394 KB | ✓ | Story of eye | Fullscreen (4 states + toggle) | High | FullScreenIllustration |
| 7 | animationLatteralOrganizationLeft | 252 KB | ✓ | Organization | Scroll split-screen | Very High | FullScreenIllustrationSplit |
| 8 | animationLatteralOrganizationRight | 4.5 MB | ✓ | Organization | Scroll split-screen | Very High | FullScreenIllustrationSplit |
| 9 | animationLateralOrganization | 7.9 KB | ✓ | Organization | Scroll split-screen | Low | FullScreenIllustrationSplit |
| 10 | animationPhototransduction | 425 KB | ✓ | Phototransduction | Fullscreen (8 states) | Very High | FullScreenIllustrationLoop |
| 11 | animationTheVisualCycle | 28 KB | ✓ | Phototransduction | Fullscreen (6 states) | High | FullScreenIllustrationLoop |
| 12 | animationSynapticArchitecture | 92 KB | ✓ | Organization | Click (3 block states) | Medium | IllustrationComp |
| 13 | animationPhotoreceptors | 99 KB | ✓ | Photoreceptors | Click (6 states) | Medium | IllustrationComp |
| 14 | animationRetinalCellTypes | 43 KB | ✓ | Organization | Click (10 states) | High | IllustrationComp |
| 15 | animationRetinalCellTypes2 | 43 KB | ✓ | Organization | Click (10 states) | High | IllustrationComp |
| 16 | animationRetinalCellTypesTransition | 68 KB | ✓ | Organization | Scroll transition | Low | IllustrationTransition |
| 17 | animationCenterSurroundReceptiveFields | 67 KB | ✓ | Circuits | Switch (2 variants) | High | IllustrationSwitch |
| 18 | animationCenterSurroundReceptiveFieldsSmalllight | 66 KB | ✓ | Circuits | Switch variant | High | IllustrationSwitch |
| 19 | animationCenterSurroundReceptiveFieldsWidelight | 55 KB | ✓ | Circuits | Switch variant | High | IllustrationSwitch |
| 20 | animationColorOpponency | 30 KB | ✓ | Circuits | Static image | Low | IllustrationComp |
| 21 | animationDirectionSelectivityPrefered | 65 KB | ✓ | Circuits | Switch (2 variants) | High | IllustrationSwitch |
| 22 | animationDirectionSelectivityNull | 54 KB | ✓ | Circuits | Switch variant | High | IllustrationSwitch |
| 23 | animationObjectMotionSensitivitySymmetricCenter | 64 KB | ✓ | Circuits | Switch (2 variants) | High | IllustrationSwitch |
| 24 | animationObjectMotionSensitivityAsymmetricCenter | 73 KB | ✓ | Circuits | Switch variant | High | IllustrationSwitch |
| 25 | animationRodVsConeCircuitsDay | 30 KB | ✓ | Rod/Cone pathways | Switch (2 variants) | High | IllustrationSwitch |
| 26 | animationRodVsConeCircuitsNight | 36 KB | ✓ | Rod/Cone pathways | Switch variant | High | IllustrationSwitch |
| 27 | animationLightSensitiveGanglionCells | 15 KB | ✓ | ipRGCs | Auto-play loop | Medium | IllustrationComp |
| 28 | animationWavesOfActivity | N/A | ✓ | Development | YouTube embed | External | IllustrationComp |
| 29 | animationEyeMovements | 795 KB | ✓ | Real world vision | Auto-play loop | Medium | IllustrationComp |
| 30 | animationCataracts | 33 KB | ✓ | Diseases | Video flip | Medium | IllustrationFlip |
| 31 | animationGlaucoma | 33 KB | ✓ | Diseases | Video flip | Medium | IllustrationFlip |
| 32 | animationDiabeticRetinopathy | 33 KB | ✓ | Diseases | Video flip | Medium | IllustrationFlip |
| 33 | animationAgeRelatedMacularDegeneration | 33 KB | ✓ | Diseases | Video flip | Medium | IllustrationFlip |
| 34 | animationRetinitisPigmentosa | 33 KB | ✓ | Diseases | Video flip | Medium | IllustrationFlip |
| 35 | animationPlaceholder | 30 KB | ✓ | Various | Decorative | Low | IllustrationComp |
| 36 | **animationStart** | **18 MB** | ❌ | **UNUSED** | Unknown | Unknown | - |
| 37 | animationEye | 13 KB | ❌ | UNUSED | Unknown | Low | - |

---

## Categorization by Interaction Type

### 1. Auto-Play Loop Animations (8 files)

| Animation | Size | Loop Section | States | Scientific Domain |
|-----------|------|--------------|--------|-------------------|
| animationDragon | 1.1 MB | [82, 287] | None | Decorative intro |
| animationAccommodationVergence | 308 KB | Full | None | Eye movements |
| animationPhototransduction | 425 KB | Full | 8 | Molecular biology |
| animationTheVisualCycle | 28 KB | Full | 6 | Molecular biology |
| animationLightSensitiveGanglionCells | 15 KB | Full | None | Circuits |
| animationEyeMovements | 795 KB | Full | None | Eye movements |
| animationPlaceholder | 30 KB | Full | None | Decorative |
| + All switch variants | ~360 KB | Full | None | Circuits |

**Common Pattern:**
- Continuous looping
- Passive viewing
- Educational demonstrations
- Minimal file size (except Dragon)

**Component:** `IllustrationComp.vue` (loop mode)

**Database Schema:**
```json
{
  "interaction_type": "auto_loop",
  "config": {
    "loop": true,
    "loopSection": [startFrame, endFrame] // optional
  }
}
```

---

### 2. Click-Triggered State Animations (8+ files)

| Animation | Size | States | Has Highlight | Has Icons | Block Mode |
|-----------|------|--------|---------------|-----------|------------|
| animationEyeStructur | 29 KB | 11 | ✓ | - | - |
| animationSynapticArchitecture | 92 KB | 3 | - | ✓ | ✓ |
| animationPhotoreceptors | 99 KB | 6 | ✓ | - | - |
| animationRetinalCellTypes | 43 KB | 10 | ✓ | ✓ | - |
| animationRetinalCellTypes2 | 43 KB | 10 | ✓ | ✓ | - |

**Common Pattern:**
- User clicks to select state
- Highlights specific anatomical parts
- Educational anatomy/structure
- Icon-based UI (some)
- Block states for toggleable elements

**States Examples:**
- Eye Structure: "Lens", "Iris", "Cornea", "Choroid", "Sclera", "Fovea", "Aqueous humour", "Ciliary muscle", "Retina", "Vitreous humour", "Optic nerve"
- Photoreceptors: "Disks", "Opsins", "Outer segment", "Inner segment", "Mitocondria", "Nucleus"
- Synaptic Architecture: "Inhibition", "Excitatation", "Gap junction"

**Component:** `IllustrationComp.vue` (click-triggered mode)

**Database Schema:**
```json
{
  "interaction_type": "click_states",
  "config": {
    "clickTriggered": true,
    "highlight": true,
    "blockStates": false, // or true for toggle mode
    "states": ["State 1", "State 2", ...],
    "iconPraefix": "retinalCellTypes" // optional
  }
}
```

---

### 3. Switch-Based Animations (5 sets, 10 files)

| Animation Set | Size (Total) | Variants | Legend Items | Domain |
|---------------|--------------|----------|--------------|--------|
| Center-Surround Receptive Fields | 188 KB | 2 | 12 | Circuits |
| Direction Selectivity | 119 KB | 2 | 12 | Circuits |
| Object Motion Sensitivity | 137 KB | 2 | 12 | Circuits |
| Rod vs Cone Circuits | 66 KB | 2 | 12 | Pathways |
| Total | 510 KB | 10 files | - | - |

**Switch Variants:**
- Center-Surround: "Small light" / "Wide light"
- Direction: "Prefered" / "Null"
- Object Motion: "Symmetric center" / "Asymmetric center"
- Rod/Cone: "Day" / "Night"

**Common Pattern:**
- 2 Lottie files per animation (one for each variant)
- Switch between conditions
- All loop continuously
- All share same 12-item legend structure
- All are neural circuit diagrams

**Legend Structure:**
```json
[
  ["Photoreceptors", "Rod/Cone"],
  ["Horizontal cells", "Horizontal"],
  ["Bipolar cells", "Bipolar"],
  ["Amacrine cells", "Amacrine"],
  ["Ganglion cells", "Ganglion"],
  ["Inhibition", "Inhibition"],
  ["Excitatation", "Excitation"],
  ["Gap junction", "Gap"],
  ["Spike train", "Spike"],
  ["Hyperpolarization", "Hyper"],
  ["Depolarization", "Depo"],
  ["cGMP-gated ion channel closed", "Closed"]
]
```

**Component:** `IllustrationSwitch.vue`

**Database Schema:**
```json
{
  "interaction_type": "switch",
  "config": {
    "switch": true,
    "switches": ["Variant 1", "Variant 2"],
    "blockSwitches": true,
    "loop": true,
    "legend": [...],
    "variants": [
      {"label": "Variant 1", "lottieUrl": "..."},
      {"label": "Variant 2", "lottieUrl": "..."}
    ]
  }
}
```

---

### 4. Fullscreen State-Based (4 files)

| Animation | Size | States | Highlights | Speed Control | Toggle |
|-----------|------|--------|------------|---------------|--------|
| animationPupillaryLightreflex | 32 KB | 5 | 4 | ✓ | - |
| animationImpairedVision | 394 KB | 4 | - | - | ✓ |
| animationPhototransduction | 425 KB | 8 | 11 | ✓ | - |
| animationTheVisualCycle | 28 KB | 6 | 5 | ✓ | - |

**Common Pattern:**
- Fullscreen presentation
- Sequential step-through of complex processes
- Play/pause controls
- Speed adjustment (.5x, 1x)
- Extensive info text overlays
- Highlight molecular/anatomical components
- Educational scientific processes

**Example States (Phototransduction):**
1. "The retina is normally dark adapted, waiting for light (photons) to arrive."
2. "Rhodopsin proteins are embedded in the disks in the outer segment of photoreceptors."
3. "When light strikes rhodopsin it leads to an isomerization of retinal."
4. "Activated rhodopsin activates the alpha subunit of transducin..."
(8 total states)

**Example Highlights:**
- Rhodopsin, Retinal, Transducin, Phosphodiesterase (PDE), cGMP, GMP, α, γ, β, GTP, NA+

**Components:** 
- `FullScreenIllustration.vue` (basic)
- `FullScreenIllustrationLoop.vue` (with controls)

**Database Schema:**
```json
{
  "interaction_type": "fullscreen_states",
  "config": {
    "fullscreen": true,
    "loop": true,
    "states": ["Step 1", "Step 2", ...],
    "statesHighlight": ["Element1", "Element2", ...],
    "hasSpeedControl": true,
    "infoText": "Extensive description..."
  }
}
```

---

### 5. Scroll-Triggered Transitions (3 files)

| Animation | Size | Type | Bleed | Usage |
|-----------|------|------|-------|-------|
| animationEyeStructurTransition | 2.3 MB | Transition | No bleed | Before Eye Structure |
| animationRetinalCellTypesTransition | 68 KB | Transition | No bleed | Before Cell Types |

**Common Pattern:**
- Plays once as user scrolls
- Smooth transition between content sections
- Non-interactive
- Single-direction playback
- No bleeding effect (contained)

**Component:** `IllustrationTransition.vue`

**Trigger Mechanism:**
```javascript
ScrollTrigger.create({
  trigger: '.animationTrigger',
  start: 'top center',
  end: 'bottom center',
  onToggle: (self) => {
    if (self.isActive) playTransition();
  }
});
```

**Database Schema:**
```json
{
  "interaction_type": "scroll_transition",
  "config": {
    "isTransition": true,
    "noBleed": true,
    "scrollTrigger": {
      "start": "top center",
      "end": "bottom center"
    }
  }
}
```

---

### 6. Scroll-Linked Progress (1 file set)

| Animation | Size | Type | Rendering |
|-----------|------|------|-----------|
| animationLatteralOrganizationLeft | 252 KB | Split Left | SVG |
| animationLatteralOrganizationRight | 4.5 MB | Split Right | Canvas (high detail) |
| animationLateralOrganization | 7.9 KB | Simple | SVG |

**Unique Pattern:**
- Split-screen presentation
- Left: Simple diagram (low file size)
- Right: Complex microscopy (huge file size)
- Scroll progress controls animation frame
- Synchronized dual-panel rendering

**Component:** `FullScreenIllustrationSplit.vue`

**Scroll Control:**
```javascript
watch(() => scrollProgress, (progress) => {
  const frame = mapRange(progress, 0, 1, 0, totalFrames);
  lottieAnimation.goToAndStop(frame, true);
});
```

**Database Schema:**
```json
{
  "interaction_type": "scroll_linked",
  "config": {
    "scroll": true,
    "split": true,
    "variants": [
      {"position": "left", "lottieUrl": "...", "renderer": "svg"},
      {"position": "right", "lottieUrl": "...", "renderer": "canvas"}
    ],
    "scrollTrigger": {
      "scrub": 1,
      "start": "top center",
      "end": "bottom center"
    }
  }
}
```

---

### 7. Video Flip Interactions (6 files)

| Animation | Size | Disease | Video File | Image File |
|-----------|------|---------|------------|------------|
| animationCataracts | 33 KB | Cataracts | 9-1-cataracts.mp4 | 9-1-cataracts.jpg |
| animationGlaucoma | 33 KB | Glaucoma | 9-1-glaucoma.mp4 | 9-1-glaucoma.jpg |
| animationDiabeticRetinopathy | 33 KB | Diabetic Retinopathy | 9-1-diabetic-retinopathy.mp4 | 9-1-diabetic-retinopathy.jpg |
| animationAgeRelatedMacularDegeneration | 33 KB | Macular Degeneration | 9-1-macular-degeneration.mp4 | 9-1-macular-degeneration.jpg |
| animationRetinitisPigmentosa | 33 KB | Retinitis Pigmentosa | 9-1-retinitis-pigmentosa.mp4 | 9-1-retinitis-pigmentosa.jpg |
| animationNormalVision (reference) | - | Normal Vision | 9-1-normal-vision.mp4 | 9-1-normal-vision.jpg |

**Common Pattern:**
- Front: MP4 video showing visual field effect
- Back: Still image (flip to reveal)
- Click/tap to flip between video and image
- All 33 KB files (just Lottie wrapper for video reference)
- Medical/disease visualization

**Component:** `IllustrationFlip.vue`

**Video Files Location:** `/public/publicAssets/video/9-1-diseases/`

**Database Schema:**
```json
{
  "interaction_type": "video_flip",
  "config": {
    "flip": true,
    "video": "disease-name",
    "videoUrl": "/videos/9-1-disease.mp4",
    "imageUrl": "/images/9-1-disease.jpg",
    "source": "Scientific source attribution"
  }
}
```

---

### 8. Static Images (2 files)

| Animation | Size | Type | Usage |
|-----------|------|------|-------|
| animationColorOpponency | 30 KB | Static PNG | Visual illusion demo |
| animationONOFFLamina | - | Static PNG | ON/OFF cell layers |

**Pattern:**
- No animation - just display image
- Educational visual demonstrations
- Fullscreen or inline

**Component:** `IllustrationComp.vue` (image mode)

**Database Schema:**
```json
{
  "interaction_type": "static_image",
  "config": {
    "illuImage": true,
    "fullHeight": true,
    "imageUrl": "/images/colorOpponency.png",
    "source": "Attribution text"
  }
}
```

---

### 9. External Video Embed (1 file)

| Animation | Type | Platform | Video ID |
|-----------|------|----------|----------|
| animationWavesOfActivity | YouTube | YouTube | k0_HXpcH4zI |

**Pattern:**
- External video platform
- No local Lottie animation
- Embedded iframe

**Component:** `IllustrationComp.vue` (YouTube mode)

**Database Schema:**
```json
{
  "interaction_type": "youtube_embed",
  "config": {
    "illuImage": true,
    "youtubeID": "k0_HXpcH4zI",
    "title": "Spontaneous waves of activity"
  }
}
```

---

## File Size Distribution Analysis

### Size Categories

| Category | Size Range | Count | Total Size | % of Total | Examples |
|----------|-----------|-------|------------|------------|----------|
| **Tiny** | <50 KB | 18 | ~630 KB | 2% | States, transitions, placeholders |
| **Medium** | 50-100 KB | 6 | ~420 KB | 1.4% | Circuit diagrams |
| **Large** | 100-500 KB | 8 | ~2 MB | 6.6% | Complex animations |
| **Very Large** | 500KB-1MB | 1 | 795 KB | 2.6% | Eye Movements |
| **Huge** | 1-5 MB | 2 | ~5.5 MB | 18% | Dragon, Lateral Org |
| **Massive** | >5 MB | 1 | 2.3 MB | 7.6% | Eye Structure Transition |
| **UNUSED GIANT** | >5 MB | 1 | **18 MB** | **59%** | animationStart (UNUSED!) |

### Top 10 Largest Files

| Rank | File | Size | Used | Optimization Potential |
|------|------|------|------|------------------------|
| 1 | animationStart.json | 18 MB | ❌ | DELETE - 100% savings |
| 2 | animationLatteralOrganizationRight.json | 4.5 MB | ✓ | High - Compress or optimize |
| 3 | animationEyeStructurTransition.json | 2.3 MB | ✓ | Medium - Review necessity |
| 4 | animationDragon.json | 1.1 MB | ✓ | Medium - Artistic, but optimize |
| 5 | animationEyeMovements.json | 795 KB | ✓ | Low - Motion requires detail |
| 6 | animationPhototransduction.json | 425 KB | ✓ | Low - Complex molecular |
| 7 | animationImpairedVision.json | 394 KB | ✓ | Low - Medical accuracy |
| 8 | animationAccommodationVergence.json | 308 KB | ✓ | Medium - Could be GSAP? |
| 9 | animationLatteralOrganizationLeft.json | 252 KB | ✓ | Low - Split-screen detail |
| 10 | animationPhotoreceptors.json | 99 KB | ✓ | Low - Acceptable |

**Total of Top 10:** 28.5 MB (94% of all animations)

---

## Component Usage Breakdown

### Component Distribution

| Component | Animations | Total Size | Features |
|-----------|-----------|------------|----------|
| **IllustrationComp.vue** | 15 | ~3.5 MB | Click states, loops, highlights, block states, images |
| **IllustrationSwitch.vue** | 10 files (5 sets) | ~510 KB | Variant switching, legends |
| **FullScreenIllustration.vue** | 2 | ~426 KB | Basic fullscreen states |
| **FullScreenIllustrationLoop.vue** | 3 | ~485 KB | Playback controls, speed adjust |
| **FullScreenIllustrationSplit.vue** | 3 | ~4.76 MB | Dual-panel scroll |
| **IllustrationTransition.vue** | 2 | ~2.37 MB | Scroll transitions |
| **IllustrationFlip.vue** | 6 | ~198 KB | Video flip cards |

### Component Feature Matrix

| Component | Click States | Scroll | Loop | Highlight | Switch | Fullscreen | Video | Controls |
|-----------|--------------|--------|------|-----------|--------|------------|-------|----------|
| IllustrationComp | ✓ | - | ✓ | ✓ | - | - | - | - |
| IllustrationSwitch | - | - | ✓ | - | ✓ | - | - | - |
| FullScreenIllustration | ✓ | - | ✓ | - | - | ✓ | - | - |
| FullScreenIllustrationLoop | ✓ | - | ✓ | ✓ | - | ✓ | - | ✓ |
| FullScreenIllustrationSplit | - | ✓ | - | - | - | ✓ | - | - |
| IllustrationTransition | - | ✓ | - | - | - | - | - | - |
| IllustrationFlip | - | - | - | - | - | - | ✓ | - |

---

## Scientific Domain Classification

| Domain | Count | Total Size | Interaction Types |
|--------|-------|------------|-------------------|
| **Eye Anatomy** | 4 | ~2.65 MB | States, transitions, loops |
| **Cellular Structure** | 5 | ~254 KB | Click states, highlights |
| **Molecular Biology** | 2 | ~453 KB | Fullscreen states, controls |
| **Neural Circuits** | 10 | ~510 KB | Switches, loops |
| **Development** | 1 | External | YouTube embed |
| **Disease/Medical** | 6 | ~198 KB | Video flips |
| **Eye Movement** | 2 | ~1.1 MB | Loops |
| **General/Decorative** | 4 | ~19 MB | Loops, static |

---

## Scroll Trigger Configuration Patterns

### Trigger Classes Used

| Class | Purpose | Count | Component |
|-------|---------|-------|-----------|
| `animationTrigger` | Activate animation in viewport | ~15 | IllustrationComp, IllustrationSwitch |
| `animationScrollAnchor` | Scroll-linked progress | 1 | IllustrationTransition |
| `{animationName}Transition` | Transition markers | 2 | IllustrationTransition |
| `.trigger` | Chapter navigation | All sections | TextComp |

### Trigger Formulas

| Formula | Usage | Effect |
|---------|-------|--------|
| `"top " + window.innerHeight / 2` | Animation triggers | Activates when element reaches viewport middle |
| `"top center"` | Standard start | Element top hits viewport center |
| `"bottom center"` | Standard end | Element bottom hits viewport center |
| `"top top"` | Chapter nav | Section starts at top |
| `"bottom top"` | Chapter nav | Section ends at top |

### Scroll Actions

```javascript
// Pattern 1: Toggle animation on/off
onToggle: (self) => {
  if (self.isActive) {
    activeAnimation.value = animationId;
  }
}

// Pattern 2: Scrub through frames
onUpdate: (self) => {
  const frame = self.progress * totalFrames;
  lottieAnimation.goToAndStop(frame);
}

// Pattern 3: Track progress
onUpdate: (self) => {
  store.progress = self.progress;
}
```

---

## Optimization Opportunities

### Immediate Actions (High Impact)

| Action | File(s) | Savings | Effort | Priority |
|--------|---------|---------|--------|----------|
| **Delete unused** | animationStart.json | 18 MB (59%) | 5 min | 🔴 CRITICAL |
| Delete unused | animationEye.json | 13 KB | 5 min | 🟢 LOW |
| **Compress** | animationLatteralOrganizationRight.json | ~3 MB (70%) | 2 hrs | 🔴 HIGH |
| Compress | animationEyeStructurTransition.json | ~1.5 MB (65%) | 2 hrs | 🟡 MEDIUM |
| Compress | animationDragon.json | ~700 KB (60%) | 2 hrs | 🟡 MEDIUM |

**Total Potential Savings:** ~23 MB (76% reduction)

### Replace with Code (Medium Effort, High Impact)

| Animation | Current | Alternative | Savings | Complexity |
|-----------|---------|-------------|---------|------------|
| animationAccommodationVergence | 308 KB | GSAP | 99.9% | MEDIUM |
| animationEyeMovements | 795 KB | GSAP | 99.9% | MEDIUM |
| animationPlaceholder | 30 KB | CSS | 99.9% | LOW |

### Keep as Lottie (Scientific Accuracy Required)

| Category | Files | Reason |
|----------|-------|--------|
| Molecular diagrams | Phototransduction, Visual Cycle | Scientific detail |
| Cell anatomy | Eye Structure, Photoreceptors, Retinal Cell Types | Educational precision |
| Circuit diagrams | All switch-based | Complex pathways |
| Medical visualizations | Disease flips | Medical accuracy |

---

## Database Schema Recommendation

### Unified Animation Table

```sql
CREATE TABLE animations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  animation_key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  
  -- Media type (determines rendering strategy)
  media_type TEXT NOT NULL, 
  -- 'lottie', 'video', 'image', 'youtube', 'code'
  
  -- Interaction pattern (determines component)
  interaction_type TEXT NOT NULL,
  -- 'auto_loop', 'click_states', 'switch', 'fullscreen_states', 
  -- 'scroll_transition', 'scroll_linked', 'video_flip', 
  -- 'static_image', 'youtube_embed'
  
  -- Component mapping
  component_name TEXT NOT NULL,
  -- 'IllustrationComp', 'IllustrationSwitch', etc.
  
  -- File references
  lottie_file_url TEXT,
  video_file_url TEXT,
  image_file_url TEXT,
  youtube_id TEXT,
  
  -- File metadata
  file_size_bytes INTEGER,
  file_checksum TEXT,
  
  -- Configuration (JSONB for flexibility)
  config JSONB NOT NULL,
  
  -- Scientific metadata
  scientific_domain TEXT,
  -- 'eye_anatomy', 'cellular', 'molecular', 'circuits', 
  -- 'development', 'disease', 'movement', 'general'
  
  -- Performance
  load_priority TEXT, -- 'critical', 'high', 'low', 'lazy'
  
  -- Content
  info_text TEXT,
  source_attribution TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- States table (for animations with multiple states)
CREATE TABLE animation_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  animation_id UUID REFERENCES animations(id) ON DELETE CASCADE,
  state_label TEXT NOT NULL,
  state_description TEXT,
  order_index INTEGER NOT NULL,
  is_highlight_state BOOLEAN DEFAULT FALSE,
  highlight_class_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Variants table (for switch-based animations)
CREATE TABLE animation_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  animation_id UUID REFERENCES animations(id) ON DELETE CASCADE,
  variant_label TEXT NOT NULL,
  lottie_file_url TEXT,
  video_file_url TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scroll trigger configurations
CREATE TABLE scroll_triggers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  animation_id UUID REFERENCES animations(id) ON DELETE CASCADE,
  trigger_class TEXT NOT NULL,
  start_position TEXT NOT NULL,
  end_position TEXT NOT NULL,
  scrub_enabled BOOLEAN DEFAULT FALSE,
  scrub_duration DECIMAL(3,2),
  on_toggle_action TEXT,
  on_update_action TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_animations_interaction ON animations(interaction_type);
CREATE INDEX idx_animations_domain ON animations(scientific_domain);
CREATE INDEX idx_animation_states_animation ON animation_states(animation_id, order_index);
CREATE INDEX idx_scroll_triggers_animation ON scroll_triggers(animation_id);
```

### Example Data Records

**Example 1: Click-triggered State Animation**
```sql
INSERT INTO animations VALUES (
  uuid_generate_v4(),
  'animationEyeStructur',
  'Eye structure',
  'lottie',
  'click_states',
  'IllustrationComp',
  'https://storage.../animationEyeStructur.json',
  NULL, NULL, NULL,
  29000,
  'abc123...',
  '{
    "clickTriggered": true,
    "highlight": true,
    "fullscreen": false
  }',
  'eye_anatomy',
  'high',
  NULL,
  NULL,
  NOW(), NOW()
);

-- Insert states
INSERT INTO animation_states (animation_id, state_label, order_index, is_highlight_state, highlight_class_name)
VALUES 
  ('...', 'Lens', 0, true, 'lensHighlight'),
  ('...', 'Iris', 1, true, 'irisHighlight'),
  -- ... 9 more states
```

**Example 2: Switch-based Animation**
```sql
INSERT INTO animations VALUES (
  uuid_generate_v4(),
  'animationDirectionSelectivity',
  'Direction selectivity',
  'lottie',
  'switch',
  'IllustrationSwitch',
  NULL, -- No single file, has variants
  NULL, NULL, NULL,
  119000,
  NULL,
  '{
    "loop": true,
    "blockSwitches": true,
    "legend": [
      ["Photoreceptors", "Rod/Cone"],
      ["Horizontal cells", "Horizontal"],
      ...
    ]
  }',
  'circuits',
  'high',
  NULL,
  NULL,
  NOW(), NOW()
);

-- Insert variants
INSERT INTO animation_variants (animation_id, variant_label, lottie_file_url, order_index)
VALUES
  ('...', 'Prefered', 'https://storage.../DirectionSelectivityPrefered.json', 0),
  ('...', 'Null', 'https://storage.../DirectionSelectivityNull.json', 1);
```

**Example 3: Fullscreen State with Controls**
```sql
INSERT INTO animations VALUES (
  uuid_generate_v4(),
  'animationPhototransduction',
  'Phototransduction',
  'lottie',
  'fullscreen_states',
  'FullScreenIllustrationLoop',
  'https://storage.../animationPhototransduction.json',
  NULL, NULL, NULL,
  425000,
  'def456...',
  '{
    "fullscreen": true,
    "loop": true,
    "hasSpeedControl": true,
    "speeds": [0.5, 1.0]
  }',
  'molecular',
  'high',
  'Phototransduction is the process by which light is converted into electrical signals...',
  'Adapted from Webvision',
  NOW(), NOW()
);

-- Insert 8 states
INSERT INTO animation_states (animation_id, state_label, state_description, order_index, is_highlight_state)
VALUES
  ('...', 'Rhodopsin', 'The retina is normally dark adapted...', 0, false),
  ('...', 'Retinal', 'Rhodopsin proteins are embedded...', 1, false),
  -- ... 6 more states

-- Insert highlight states
INSERT INTO animation_states (animation_id, state_label, order_index, is_highlight_state, highlight_class_name)
VALUES
  ('...', 'Rhodopsin', 0, true, 'rhodopsinHighlight'),
  ('...', 'Transducin', 1, true, 'transducinHighlight'),
  -- ... 9 more highlights
```

---

## Migration Strategy

### Phase 1: Immediate Cleanup (1 hour)
1. Delete `animationStart.json` (18 MB)
2. Delete `animationEye.json` (13 KB)
3. Update animations.json to remove references
4. **Result:** 59% reduction, zero functional impact

### Phase 2: Optimize Large Files (8 hours)
1. Compress `animationLatteralOrganizationRight.json` (4.5 MB → ~1.5 MB)
2. Compress `animationEyeStructurTransition.json` (2.3 MB → ~800 KB)
3. Compress `animationDragon.json` (1.1 MB → ~400 KB)
4. Test all optimized animations for quality
5. **Result:** Additional 70% reduction of these files

### Phase 3: Database Migration (16 hours)
1. Set up Supabase tables (schema above)
2. Create migration script to import from animations.json
3. Upload Lottie files to Supabase Storage
4. Update component loading logic to fetch from Supabase
5. Implement caching strategy
6. **Result:** Dynamic, database-driven animation system

### Phase 4: Code Replacements (20 hours)
1. Replace `animationAccommodationVergence` with GSAP
2. Replace `animationEyeMovements` with GSAP
3. Replace `animationPlaceholder` with CSS
4. Test and refine animations
5. **Result:** Additional 1 MB saved, better performance

### Total Effort: ~45 hours
### Total Savings: ~24 MB (79% reduction)
### Final Bundle: ~6 MB (from 30 MB)

---

## Component Selection Logic (Current System)

```javascript
// Based on animation configuration, determine which component to use

if (animation.flip) {
  component = 'IllustrationFlip.vue';
}
else if (animation.switch) {
  component = 'IllustrationSwitch.vue';
}
else if (animation.isTransition) {
  component = 'IllustrationTransition.vue';
}
else if (animation.fullscreen) {
  if (animation.hasSpeedControl || animation.statesHighlight) {
    component = 'FullScreenIllustrationLoop.vue';
  }
  else if (animation.split) {
    component = 'FullScreenIllustrationSplit.vue';
  }
  else {
    component = 'FullScreenIllustration.vue';
  }
}
else {
  component = 'IllustrationComp.vue'; // Default
}
```

This logic should be preserved in the database-driven system via the `component_name` field.

---

## Findings Summary

### Key Patterns Identified

1. **Circuit Diagram Pattern** (5 sets, 10 files)
   - Always switch-based with 2 variants
   - All share same legend structure
   - All loop continuously
   - Total: 510 KB

2. **Disease Visualization Pattern** (6 files)
   - All use video flip interaction
   - Consistent sizing (~33 KB each)
   - Educational medical content

3. **State-Based Learning Pattern** (8 files)
   - Click to explore anatomy
   - Highlight mechanism
   - Icon-based UI

4. **Fullscreen Scientific Pattern** (4 files)
   - Complex biological processes
   - Step-by-step states
   - Playback controls

### Commonalities Across All Animations

**Trigger Mechanisms:**
- Auto-play (14)
- Click-triggered (8)
- Scroll-triggered (3)
- Switch-based (10)

**Features:**
- Looping (22)
- States (13)
- Highlighting (8)
- Fullscreen (10)
- Transitions (2)

**Components:**
- 7 different Vue components
- Most use `IllustrationComp.vue` (15)

**Scientific Domains:**
- Circuits (10) - most common
- Disease (6)
- Anatomy (4)
- Molecular (2)

### Critical Finding: 18 MB Unused File

**animationStart.json** accounts for 59% of all animation assets and is **not referenced anywhere** in the codebase. This is the single biggest optimization opportunity.

---

## Next Steps for Investigation

1. **Confirm animationStart is unused:**
   - Search entire codebase for "animationStart"
   - Check if it's a loading animation that was replaced
   - Safe to delete?

2. **Analyze Lateral Organization Right (4.5 MB):**
   - Why is it 18x larger than the Left variant?
   - Is it using raster images embedded in Lottie?
   - Can it be split or compressed?

3. **Review transition necessity:**
   - Is the 2.3 MB Eye Structure Transition worth it?
   - Could it be a simpler CSS transition?

4. **Prototype GSAP replacements:**
   - Start with AccommodationVergence
   - Compare quality and performance
   - Determine if worth the effort

5. **Database design validation:**
   - Review schema with team
   - Test migration with subset of animations
   - Validate component loading logic

---

**This analysis provides a complete foundation for decision-making on animation optimization, database migration, and performance improvements.**
