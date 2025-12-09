# 9.4 When Motion Harms Usability

## Animation Has Costs

Motion in interfaces is powerful—but power implies responsibility. For significant user populations, animation isn't delightful enhancement; it's barrier, distraction, or physiological trigger. Understanding when motion harms usability is as important as understanding when it helps.

## Vestibular Disorders and Motion Sensitivity

The vestibular system—inner ear structures that sense balance and spatial orientation—can be disrupted by screen motion. For users with vestibular disorders or motion sensitivity:

### Symptoms Triggered by Screen Motion

- **Dizziness**: Sensation of spinning or disorientation
- **Nausea**: Motion sickness-like response
- **Vertigo**: Severe balance disruption
- **Headaches**: Triggered or worsened by animation
- **Difficulty focusing**: Visual tracking problems
- **Fatigue**: Exhaustion from compensating for motion effects

### Prevalence

- Approximately 35% of adults over 40 experience vestibular dysfunction
- Motion sensitivity affects many people without diagnosable conditions
- Temporary sensitivity occurs during illness, medication, or fatigue
- Cumulative exposure effects mean sensitivity may increase during extended use

## Types of Problematic Motion

### Parallax Scrolling

Multiple elements moving at different rates during scroll:
- Creates depth through differential motion
- Can cause significant vestibular response
- Particularly problematic at high speeds or with large differential

**Risk factors**: Large motion differential, full-screen parallax, motion perpendicular to scroll direction

### Large-Scale Zooming

Zoom animations, particularly full-page:
- Simulates physical movement toward/away from content
- Can trigger vestibular response
- Particularly problematic with fast or large-scale zooms

**Risk factors**: Full-screen zooms, rapid transitions, zoom as primary navigation paradigm

### Infinite Scrolling Effects

Content that appears to scroll infinitely in one direction:
- Creates sense of continuous motion without destination
- Can cause spatial disorientation
- Particularly problematic with smooth, endless motion

### Auto-Playing Video

Video content, especially:
- Full-screen or large area
- Motion-intensive content (action, sports, shaky-cam)
- Video as background element

### Carousel and Slider Animation

Auto-advancing content carousels:
- Motion users didn't initiate
- Particularly problematic with rapid advancement
- Unexpected direction changes worse than consistent movement

### Background Animation

Constantly moving background elements:
- Animated gradients
- Particle effects
- Moving patterns

These demand continuous vestibular compensation even when not actively attended.

## The prefers-reduced-motion Media Query

CSS provides a mechanism for users to request reduced motion:

```css
@media (prefers-reduced-motion: reduce) {
  /* Reduced or no motion styles */
}

@media (prefers-reduced-motion: no-preference) {
  /* Full motion styles */
}
```

### Implementation Guidelines

**Respect the preference**: If users request reduced motion, respect it. Don't override or ignore.

**Reduce, not eliminate**: "Reduced motion" doesn't mean "no motion." You can:
- Shorten durations
- Replace transforms with opacity changes
- Use fade instead of slide
- Eliminate non-essential animation while keeping essential feedback

**Maintain functionality**: Reduced motion shouldn't break functionality:
- Progress indicators should still indicate progress
- State changes should still be visible
- Feedback should still occur (perhaps through color/opacity rather than motion)

### Example Implementation

```css
/* Default: full animation */
.modal {
  animation: slideIn 300ms ease-out;
}

/* Reduced motion: instant appearance */
@media (prefers-reduced-motion: reduce) {
  .modal {
    animation: fadeIn 150ms ease-out;
  }
}

@keyframes slideIn {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

## WCAG Requirements for Motion

Web Content Accessibility Guidelines specify:

### 2.3.1 Three Flashes or Below Threshold (Level A)

Pages must not contain anything that flashes more than three times in any one-second period, unless the flash is below general flash and red flash thresholds.

**What this means**: No strobing, no rapid flashing, no photosensitive epilepsy triggers.

### 2.3.2 Three Flashes (Level AAA)

Pages should not contain anything that flashes more than three times in any one-second period, period—no threshold exceptions.

### 2.2.2 Pause, Stop, Hide (Level A)

For moving, blinking, or scrolling content that starts automatically and lasts more than 5 seconds, users must be able to pause, stop, or hide it.

For auto-updating content, users must be able to pause, stop, hide, or control frequency.

**What this means**: Carousels, animations, auto-playing video—all must have controls.

## Seizure Risk: Photosensitive Epilepsy

Approximately 1 in 4,000 people have photosensitive epilepsy. For them, certain visual patterns can trigger seizures:

### Dangerous Patterns

- Flashing at 3-60 Hz (3-60 times per second)
- High contrast flashing (light to dark)
- Red flashing
- Large areas (more than 25% of screen)
- Striped patterns that may strobe with motion

### Testing and Prevention

**Flash testing tools**:
- PEAT (Photosensitive Epilepsy Analysis Tool)
- Harding Test
- Manual analysis of frame differences

**Prevention**:
- No flashing faster than 3 times per second
- Reduce contrast of necessary flashes
- Minimize flashing area
- Avoid red flashing entirely
- Warn users before potentially triggering content

## Implementation: Motion Alternatives

### Replace Motion with Non-Motion

Instead of: Slide transition between tabs
Alternative: Instant switch with clear visual state change

Instead of: Parallax scrolling background
Alternative: Static background or simple opacity change on scroll

Instead of: Animated graphs drawing themselves
Alternative: Static graphs or fade-in of completed graph

### Reduce Motion Parameters

Instead of: 300ms slide animation
Reduced: 100ms fade animation

Instead of: Full-screen zoom transition
Reduced: Crossfade between states

Instead of: Bouncy/elastic easing
Reduced: Simple ease-out

### Provide User Control

For decorative animation:
- Pause button visible
- Preference setting to disable
- Respects system-level preferences

For functional animation:
- Reduced-motion version available
- Duration preferences
- Option to disable non-essential motion

## Business Case for Motion Accessibility

Beyond ethical obligation:

**Legal risk**: Accessibility lawsuits increasingly common; motion accessibility is part of compliance

**User base**: Motion sensitivity affects significant population, including temporary conditions

**Usability for all**: Reduced motion options often improve experience for all users (faster, less distracting)

**Mobile performance**: Reduced animation means better performance on slower devices

**Professionalism**: Respecting accessibility signals quality and thoughtfulness

## Implementation Checklist

Use this checklist for motion accessibility:

**Flash and seizure safety**:
- [ ] No content flashes more than 3 times per second
- [ ] Flash testing tools applied to dynamic content
- [ ] Warning provided before potentially triggering content

**Reduced motion support**:
- [ ] prefers-reduced-motion media query implemented
- [ ] All significant animations have reduced-motion alternatives
- [ ] Functionality maintained in reduced-motion mode
- [ ] Testing performed with reduced motion enabled

**User control**:
- [ ] Auto-playing content can be paused
- [ ] Animation preferences available in settings
- [ ] Motion-heavy features have static alternatives

**Problematic patterns avoided or optional**:
- [ ] Parallax scrolling optional or disabled in reduced motion
- [ ] Large-scale zooming has alternatives
- [ ] Background animation can be disabled
- [ ] Auto-advance features have manual alternatives

## Summary

Motion harms usability when:
- Users have vestibular sensitivity or disorders
- Animation triggers photosensitive epilepsy
- Motion distracts from content and tasks
- Animation delays task completion without benefit
- Users lack control over motion they didn't request

Responsible motion design:
1. Respects prefers-reduced-motion
2. Meets WCAG requirements
3. Provides user control
4. Tests for problematic patterns
5. Maintains functionality without motion

Animation is optional; accessibility is not. Design motion that enhances for most while accommodating all.
