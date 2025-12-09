# 4.1 How Eyes Actually Move Across Interfaces

## The Myth of Smooth Scanning

If you've never studied eye movements, you might imagine that reading this sentence involves your eyes smoothly gliding across the text like a cursor. This intuition is completely wrong. Your eyes are currently making rapid, jerky jumps called **saccades**, interspersed with brief pauses called **fixations**. You're not aware of this because your brain constructs an illusion of continuous vision—but the underlying mechanics have profound implications for interface design.

## Saccades: The Jumps

Saccades are rapid, ballistic eye movements that shift gaze from one point to another. Key characteristics:

**Speed**: Saccades are fast—peak velocities reach 700-900 degrees per second. A typical saccade crosses several degrees of visual angle in just 20-200 milliseconds.

**Ballistic nature**: Once initiated, saccades cannot be redirected mid-flight. The target is calculated in advance, and the eye follows a predetermined trajectory.

**Saccadic suppression**: During saccades, visual processing is actively suppressed. You don't perceive blur or motion during saccades because your visual system essentially goes offline for the duration.

**Frequency**: In normal viewing, saccades occur roughly 3-4 times per second. A single minute of web browsing might involve 150-200 saccades.

The ballistic nature of saccades has design implications: once a user's eye begins moving toward a target, they're committed. If the target moves or changes during the saccade, the user will land at the wrong location and need a corrective saccade. This is one reason why motion during interaction can be disorienting.

## Fixations: The Pauses

Between saccades, eyes pause to gather information. These **fixations** are where visual processing actually happens:

**Duration**: Fixations during reading average 200-300 milliseconds. During scene viewing or interface exploration, fixations typically range from 200-400 milliseconds, with some lasting over a second for complex processing.

**Information intake**: All detailed visual processing occurs during fixations. Letter recognition, icon identification, color perception, and image analysis require stable fixation.

**Attention coupling**: Fixations are tightly coupled to attention. While covert attention (attending without looking) is possible, overt attention (looking at what you're attending to) is the norm.

**Variability**: Fixation duration varies with processing demand. Simple stimuli receive shorter fixations; complex or unexpected stimuli receive longer ones. This variability provides insight into what users find difficult or surprising.

## What You "See" vs. What You Process

Here's a critical insight: the sense that you "see" an entire webpage simultaneously is an illusion. What actually happens is:

1. You fixate a location and process it in detail
2. Peripheral vision provides a vague sense of surrounding content
3. Your brain fills in unattended regions with expectations and memory
4. A saccade moves your eyes to a new location
5. The new fixation updates part of your mental model

At any given moment, you're only processing a small region in detail. Your sense of seeing the whole page is constructed from accumulated fixations, predictions, and assumptions.

This has immediate design implications: **users will not process content they do not fixate**. You cannot assume that visible content is seen content. Placement, visual hierarchy, and layout must guide fixation patterns to ensure important content receives the fixations it needs.

## How Fixation Locations Are Selected

What determines where users look? Research identifies several factors:

**Bottom-up salience**: Features like high contrast, bright colors, motion, and faces automatically attract fixations regardless of task. Areas of high visual salience tend to be fixated even when they're not task-relevant.

**Top-down goals**: Task objectives strongly influence fixation patterns. A user searching for a checkout button will fixate areas where buttons are expected, ignoring highly salient but irrelevant content.

**Expectations and learning**: Prior experience shapes where users expect to find information. Conventions (logo top-left, navigation at top, etc.) create expectations that guide fixations.

**Information density**: Areas with high information content receive more fixations than sparse areas—users' eyes are drawn to where the action is.

These factors interact. A highly salient but task-irrelevant element might capture an initial fixation but won't receive sustained attention. A task-relevant element in an expected location will be efficiently located even without high salience.

## Typical Fixation Patterns on Webpages

[ANIMATION: Eye-tracking heat map forming on a typical webpage, showing fixation clustering]

Eye-tracking studies reveal consistent patterns across webpage viewing:

**Initial orientation**: Upon page load, users make a few rapid fixations to assess page structure—typically scanning top content and left margin to orient themselves.

**Content-focused exploration**: Attention then moves to content areas, with fixation patterns determined by page type and user goal.

**Regressions**: Users frequently make backward saccades to re-examine previously viewed content, particularly when confused or verifying information.

**Sparse coverage**: Users typically fixate only a fraction of page content. Studies suggest 20-30% of words are fixated during typical web reading.

The specific patterns vary by page type, user expertise, and task. But the general principle holds: users do not uniformly view pages. They sample content through selective fixations guided by salience, goals, and expectations.

## Fixation Data: A Reality Check

How many fixations does a typical webpage receive? Numbers from eye-tracking research:

- **Simple landing pages**: 20-40 fixations in a typical 10-second viewing
- **Search results pages**: 50-100 fixations during result evaluation
- **Content articles**: Highly variable—from 50 fixations for scanning to 500+ for thorough reading
- **Complex web applications**: 100+ fixations for typical task completion

These numbers emphasize selectivity. A page might contain thousands of words, hundreds of visual elements, and dozens of interactive components—but it receives perhaps 50-100 fixations. Most content is never directly viewed.

## Implications for Interface Design

Understanding saccade-fixation mechanics suggests several design principles:

**Design for selective viewing**. Users will not view everything. Ensure critical content occupies locations likely to receive fixations—along predictable scanning paths, in high-salience positions, or in locations matching user expectations.

**Reduce saccade cost**. Each saccade takes time and attention resources. Layouts that minimize required saccades for common tasks outperform layouts requiring extensive visual search.

**Guide fixations with visual hierarchy**. Size, contrast, color, and whitespace create differential salience that guides fixation order. Design hierarchy intentionally to ensure priority content receives early fixations.

**Respect expectations**. Users have learned patterns for where to find things. Placing content where expected reduces search fixations; violating expectations increases confusion and wasted fixations.

**Use motion sparingly**. Motion automatically captures fixations. Reserve motion for content that genuinely deserves attention capture; gratuitous motion wastes users' limited fixation budget.

**Test with eye tracking when possible**. Heat maps and fixation sequences reveal whether your design guides attention as intended. Assumptions about what users will "obviously see" are frequently wrong.

The saccade-fixation system is the mechanism through which users experience your interface. Design for how it actually works—selective, sequential, guided by salience and goals—and your interfaces will succeed. Design for the myth of complete, simultaneous viewing, and critical content will go unseen.
