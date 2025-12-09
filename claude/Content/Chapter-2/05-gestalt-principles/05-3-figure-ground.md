# 5.3 Figure-Ground Segregation

## Perceiving Objects Against Backgrounds

Before you can identify what something is, you must first determine that it *is*—that a region of the visual field constitutes an object rather than background. This fundamental operation, **figure-ground segregation**, happens so automatically that we rarely notice it. But understanding how it works reveals principles crucial for interface design.

## The Challenge of Figure-Ground

At the retinal level, the visual world is just a pattern of light intensities. There's no inherent distinction between objects and backgrounds—both are just light. The visual system must determine which regions are "figures" (objects to be processed and identified) and which are "ground" (background to be processed differently).

This determination uses multiple cues:

**Enclosed regions tend to be figures**: A region completely surrounded by another is more likely to be perceived as figure.

**Smaller regions tend to be figures**: Between two adjacent regions, the smaller typically becomes figure, the larger ground.

**Convex regions tend to be figures**: Convex shapes (bulging outward) are more likely to be figures than concave shapes.

**Lower regions tend to be figures**: Ambiguous displays often resolve with lower portions as figure—reflecting the ecological fact that objects usually rest on surfaces.

**Higher contrast regions tend to be figures**: Regions that differ more from their surroundings are more likely to be perceived as objects.

## Ambiguous Figures

Sometimes figure-ground assignment is unstable. The classic example is **Rubin's vase**: a display that can be seen either as a white vase on black background or as two black face profiles on white background.

[ANIMATION: Rubin's vase with subtle animation highlighting the two possible interpretations]

What makes Rubin's vase fascinating is that you cannot see both interpretations simultaneously—figure and ground compete, and perception alternates between them. This **bistability** reveals that figure-ground is an active construction, not a passive reading of the image.

M.C. Escher built an artistic career on figure-ground ambiguity, creating images where positive and negative space continuously exchange roles.

## The Neural Basis of Figure-Ground

How does the brain determine figure and ground? Research in visual neuroscience has revealed:

**Border ownership cells in V2**: Neurons in V2 don't just signal that an edge exists—they signal which side of the edge is figure and which is ground. These "border ownership" signals are computed rapidly, within 70-100ms of image presentation.

**Surface representation**: Beyond edges, the visual system assigns surfaces to figures. Neurons represent not just where edges are but which regions belong to which objects.

**Competitive processing**: Multiple possible figure-ground interpretations compete simultaneously. The winning interpretation depends on accumulated evidence from multiple cues, with competition resolved by inhibition of losing interpretations.

**Attention influences**: Top-down attention can bias figure-ground competition. Attending to a region increases its likelihood of being perceived as figure.

## Figure-Ground in Interface Design

Figure-ground principles apply directly to interface design:

### Modal Dialogs and Focus States

Modal dialogs work by manipulating figure-ground relationships:

- The dialog is **figure**: higher contrast, centered, often with shadow
- The page behind is **ground**: dimmed, desaturated, or blurred
- The ground treatment signals "not currently active"

This isn't just visual polish—it's perceptual communication. Clear figure-ground separation reduces confusion about where to direct attention and interaction.

**Weak figure-ground separation** (dialog that blends with background) creates ambiguity about what's interactive and what's not. Users may attempt to interact with ground elements or miss that a dialog requires response.

### Cards and Content Separation

Card-based designs leverage figure-ground:

- Each card is perceived as a figure against page ground
- Card boundaries (edges, shadows, background colors) signal figure regions
- Content within cards is perceived as related (grouped on the same figure)

The strength of figure-ground separation affects perceived structure. Strong cards (clear backgrounds, borders, or shadows) feel like discrete objects. Weak cards (subtle differentiation) feel like organized regions of a unified surface.

### Depth and Layering in Flat Design

"Flat" design removes traditional depth cues (heavy shadows, 3D effects) but still requires figure-ground communication. Techniques include:

**Elevation**: Subtle shadows suggesting elements float above the surface
**Color differentiation**: Figure elements with different background colors than the ground
**Border treatment**: Fine borders or outlined regions creating figure boundaries
**Whitespace isolation**: Figures surrounded by generous whitespace

Material Design's elevation system explicitly maps to figure-ground perception: higher elevation = more prominent figure, more likely to receive attention and interaction.

### The Problem of Poor Contrast

Weak contrast between element and background undermines figure-ground perception:

- Text that doesn't clearly emerge as figure from its background becomes hard to read
- Buttons that don't separate from surrounding content become hard to identify
- Interactive elements that blend with static elements become invisible

This isn't just an accessibility issue (though it's critically that too)—it's a figure-ground perception issue. Low contrast fails to establish clear figure status, causing elements to be processed as ground.

## Contrast Ratios and Perception

WCAG accessibility guidelines specify contrast ratios (4.5:1 for normal text, 3:1 for large text), but these aren't arbitrary numbers—they correspond to figure-ground perception thresholds.

At contrast ratios below guidelines:
- Text-background boundaries become ambiguous
- Figure-ground assignment becomes unreliable
- Reading requires more effort as the visual system struggles to construct clear figures

Above guideline ratios, figure-ground assignment is rapid and reliable. Readers don't perceive effort because figure-ground processing succeeds automatically.

## Case Study: Material Design Elevation

Google's Material Design system provides an excellent case study in designed figure-ground relationships.

**Base concepts**:
- All elements exist on surfaces
- Surfaces have "elevation" indicating their position in virtual z-space
- Higher elevation = more important, more figure-like

**Elevation indicators**:
- Shadow intensity and spread increase with elevation
- Higher elements cast larger shadows on elements below
- Shadow direction and characteristics are consistent

**Semantic use**:
- Navigation bars at moderate elevation (persistent, important, but not dialog-level)
- FABs (floating action buttons) at high elevation (primary actions, clearly figure)
- Modal dialogs at highest elevation (demand immediate attention)
- Cards at low elevation (content containers, clearly figure but not competing for attention)

This system maps directly to figure-ground perception: elevation cues tell the visual system which elements are figures and their relative prominence.

## Interactive Figure-Ground

Figure-ground isn't just about static design—it shifts dynamically during interaction:

**Hover states**: Increasing element prominence on hover can shift figure-ground emphasis
**Focus states**: Focused elements become more figure-like to guide attention
**Selected states**: Selection often increases figure prominence (background color, outline)
**Disabled states**: Reducing contrast reduces figure strength, appropriately signaling reduced importance

These transitions should be designed as figure-ground shifts. A hover effect that doesn't change figure-ground relationship (e.g., just changing text color without affecting background) provides weaker feedback than one that increases figure prominence.

## Guidelines for Clear Figure-Ground

**Establish clear figures**:
- Give interactive elements sufficient contrast with background
- Use shadows, borders, or color differentiation to separate content regions
- Ensure text clearly emerges as figure from surrounding ground

**Use depth intentionally**:
- Higher elevation for more important or immediate elements
- Lower elevation for background or supporting elements
- Consistent depth hierarchy across the interface

**Handle transitions clearly**:
- Modal states should dramatically shift figure-ground (dim background, elevate dialog)
- Focus and selection should increase figure prominence
- State changes should communicate through figure-ground, not just detail changes

**Test for clarity**:
- Squint at designs to see if figures remain clearly separated
- Check contrast ratios for accessibility and figure-ground reliability
- Test with varied lighting conditions and displays

**Avoid ambiguity**:
- Don't create interfaces where figure-ground assignment is unstable
- Avoid designs where users must determine what's interactive vs. decorative
- Ensure key elements have clearly higher figure status than surroundings

Figure-ground segregation is where perception meets design most fundamentally. Every interface element is either figure or ground; every design decision affects that determination. Design clear figure-ground relationships, and interfaces become immediately intelligible.
