<!--
  DRAFT — not final. Placeholder-quality seed text; the manuscript is
  still being written and its last sections are thin.
  Source: attention-wm-draft.docx (Arjun Krishnaswamy, McGill)
  Converted: 2026-09-03 by scripts/seed/docx-to-markdown.mjs
  Images and equations did not survive conversion; each is marked
  "image omitted" where it stood. Review before publishing.
-->

# Attention and Working Memory

## Introduction

In the Mahabharata, the great Hindu epic, five princes were being taught to fire a bow by a guru (teacher). Each prince was called to stand before the guru and take aim at a bird perched upon a tree branch some distance away.

The guru asked each, “tell me what you see”. The eldest, often depicted as the wisest, describes the tree and its shadow, the location of the bird within the tangle of branches, and is suddenly interrupted by the guru who tells him to stand back with the others. The next of the five, depicted as the strongest, takes his stance and when asked by the guru describes the bird and its features but is asked to stand back as well. The next two follow suit and are quickly returned without taking a shot. Finally, the last prince is called to aim and asked what he sees. He tells the guru that he sees a dark sphere. Eyebrows raised, the guru says “are you sure?”, to which the prince says if he tries, he can see a fringe of color surrounding the sphere but nothing else. He is describing the eye of the bird and notices nothing else in the rich scene before him. The guru waved his approval, the arrow fired, and the target struck.

<!-- image omitted -->

Figure 1. The guru and princes by Nandalal Bose

This story and many others illustrate a series of fundamental puzzles of cognition: Why can we only fully perceive one thing at a time, even though our eyes (or ears, nose, tongue, and skin) take it all in at once? Why do different people (or animals) see the same scene in different ways? Why does perceiving one thing well make the rest fall away? The answer is attention, and decades of study reveal that it allows the brain to focus on the most important information to the task at hand.

## The story of attention

Hundreds of years after the princes and the bird, the most influential philosophers writing in English had given attention almost nothing to do. Locke, Hume, Hartley, and other great empiricists built the mind out of sensation and association alone. These writers saw the mind as a passive recipient of experience, shaped entirely by what fell upon the senses from outside.

William James, the so-called father of American psychology, writing in 1890, felt this view absurd. Imagine, he proposed, a litter of dogs raised in the Vatican, marble sculpture presented to their eyes in every conceivable form and combination for generation after generation. If experience alone shaped the mind, these dogs ought eventually to become connoisseurs of sculpture. They do not, he posited, because something selective stands between what the eyes receive and what the mind comes to know.

As is often the case with science, that “something” had already been caught in the act, twenty-three years earlier by the famous German physiologist Hermann von Helmholtz who asked whether attention could move without the eyes moving. He sat in a darkened room, fixed his gaze on a single point, and arranged a printed sheet of letters in front of him, invisible until a brief electric spark lit the room for an instant — too brief for any eye movement to occur. Before each flash, Helmholtz silently chose where on the sheet he would direct his attention and found the letters readable when the room lit up (well in the afterimage of it anyway). However, other letters, equally close to his fixation point, were lost to him entirely. Helmholtz’s eyes had not moved; only attention had. Selection, it turned out, was not something the eyes did. It was something the brain did independently.

## Attention is measured behaviorally

### The cocktail party problem

How do we follow one conversation in a noisy room while ignoring all others — and why does our own name, spoken across that room, still catch our attention? This is the cocktail party problem, named by the British engineer Colin Cherry in 1953, and it became the founding question of experimental attention research<sup>1</sup>.

Cherry's method was to present different speech passages simultaneously to each ear through headphones and ask participants to repeat the message in one ear alone. Participants did this easily but retained almost nothing from the rejected ear even when it switched to a foreign language. Physical properties of the sound crossed into awareness; meaning did not. Donald Broadbent formalized this in 1958 with the first mechanistic model of selective attention: incoming stimuli are held briefly in a pre-attentive buffer and passed through a bottleneck that passed one channel on the basis of physical features (e.g. *pitch, location, voice*) and blocked the rest from further processing<sup>2</sup>.

Broadbent's all-or-nothing filter did not survive experimental scrutiny. Neville Moray showed that participants heard their own name on the unattended ear about thirty percent of the time, which an absolute gate cannot explain. In other words, the name must have been recognized as meaningful before it could be privileged<sup>3</sup>. Anne Treisman extended this challenge by showing that if the attended and unattended channels swapped mid-stream, participants sometimes continued shadowing a word that had just crossed to the ignored side; bilingual listeners occasionally noticed that the rejected channel carried a translation of what they were attending<sup>4</sup>. Treisman proposed that Broadbent’s filter attenuates rather than blocks the unattended channel, with individual words (like names) carrying permanently low recognition thresholds. Yet another proposal suggested that all incoming information reaches full perceptual analysis, and selection operates only at the level of memory and response<sup>5</sup>. A more recent aspect of this debate showed that the degree of suppression of unattended information scales with the processing demands of the attended task<sup>6</sup>. While these studies suggested that attention is graded and capacity-dependent, a major limitation remained: measures of selection were inferred from what a listener did or did not report.

[IT NEEDS A PSYCHOMETRIC CURVE INTRODUCITON HERE]

[ a spotlight widget]

When listeners fail to report something, its origin is ambiguous. When participants missed their name on the unattended channel 2/3 times, was it because they failed to detect it? Or did it register, but just not enough to cross the threshold for reporting it? To distinguish these scenarios requires signal detection theory.

### Signal detection theory

Signal detection theory (SDT) originated in in the radar stations of World War II, where engineers needed to know how reliably a human operator could detect an enemy aircraft signal against a background of noise<sup>7</sup>. The theory was adapted for perceptual psychology by Tanner and Swets in 1954 and developed in full by Green and Swets in 1966.

SDT’s core insight is that every perceptual judgment involves two independent quantities: d′ (d-prime), a measure of the observer's true sensitivity — how well the signal is separated from the noise in the nervous system — and criterion, the internal threshold the observer sets for deciding whether a signal is present, which can shift depending on instructions, expectations, or the cost of errors. A cautious observer and a liberal one may have identical sensitivity but very different hit rates and false alarm rates; SDT disentangles the two by analyzing the full pattern of responses across signal-present and signal-absent trials. When attention is directed to a stimulus location or feature, d′ increases — the signal becomes more discriminable — and, independently, criterion can shift. This distinction matters enormously for interpreting attention experiments: an attentional manipulation that quickens reaction times or increases hit rates may be changing sensitivity, changing response strategy, or both. SDT tells you which.

### BREAK OUT BOX: Signal detection theory

Signal detection theory models “noise” and “signal” as a pair of overlapping Gaussian distributions along a single "evidence" or “stimulus” axis. Since signal and noise distributions overlap, no single level of activity belongs unambiguously to one or the other. Observers respond to evidence exceeding a *criterion*. Internal responses from the signal distribution that clear the criterion are *hits*; those from the noise one are *false alarms*. Lowering criterion catches more signal but also raises false alarms; raising it does the reverse. Thus, criterion reflects strategy, not perception, and shifts with instructions, expectations, and the cost of errors.

The distance between the arithmetic means of the two distributions is *d′* (d-prime). It is measured in units of standard deviation and captures how discriminable the signal is from the noise. Thus, d’ reflects the observer's sensitivity independent of criterion. Both quantities can be recovered from just two measured numbers, the hit rate *H* and the false-alarm rate *F*:

<!-- image omitted -->
*z* is the inverse of the normal distribution which converts a rate (hit or false alarm) into a distance along the evidence axis. Thus, the same two measurements are used in complementary (and orthogonal) ways: their *difference* gives sensitivity, *d′*, while their *sum* gives the criterion, *c*.

Plotting hit rate against false-alarm rate as the criterion sweeps across its full range traces the *receiver operating characteristic* (ROC) curve, whose bow away from the diagonal is the signature of sensitivity: the further from the diagonal, the larger the *d′*.

<!-- end breakout box -->

### Attention improves discriminability and reaction time

The cocktail party experiments established the phenomenon of selection and SDT provided the tools to measure it precisely. However, by the 1980s, scientists had moved from the auditory stimuli to visual ones to take advantage of the better spatial control this modality offered. A key question was to understand what attention does to the perceptual quality of the selected signal.

The spatial cueing paradigm introduced by Michael Posner in 1980 became a major tool to answer this question<sup>8</sup>. Briefly, subjects detect a visual target appearing somewhere on a screen following a visual cue (eg: an arrow indicating where a target will appear, or flash at the target’s eventual location). On most trials the cue is valid, and the target appears at the cued location. However, on a small portion of trials the cue is invalid, and the target appears elsewhere. As subjects responded, Posner tracked their eye position to confirm it stayed fixed throughout.

<!-- image omitted -->

Figure 3. Posner Invalid Cueing task

He learned that valid cues speed detection relative to neutral trials (target appears without cue), and invalid cues slow it — and crucially, this cost/benefit pattern held with no eye movements at all, confirming that covert attention alone, not gaze, was responsible. This was Helmholtz's observation made quantitative: attention moves freely and rapidly through space, and its deployment has measurable consequences for perception.

While Posner's original measurements were in reaction time alone<sup>8</sup>, subsequent SDT work showed that cueing increases *d′* (it improves discriminability of signal from noise) without altering the observer's willingness to respond<sup>9</sup> (ie; criterion). Together, these results indicate that spatial attention simultaneously quickens responses and raises discriminability, a dual signature that places strong constraints on any neural account of the mechanism.

## Neural Correlates of Visual Attention.

The earliest attentional signatures were found in a primate midbrain structure called the superior colliculus whose neurons showed enhanced responses when a stimulus in the receptive field was about to become a saccade target (goldberg and wurtz, 1972). Approximately a decade later the same effects were seen independent of eye movement (bushnell, Goldberg, Robinson, 1981). Subsequent work defined these effects as “overt” (associated with eye movement) and “covert” (no eye movement). This effort also defined attention to visual locations (spatial attention), to visual features (feature attention), and to visual objects (object attention). Spatial attention paradigms (such as the posner cueing method) were the earliest adopted and are still the most widely used. As a result, much of what we know about the neural correlates of visual attention arise from the spatial cueing paradigm. Below we describe these single-neuron and population level effects in the context of covert spatial attention, and then we turn to similarities and differences produced by feature/object attention.

### Stimuli evoke stronger firing from visual neurons when attention is directed to their receptive field.

Many studies indicate that covertly attending a spatial location enhances the firing of visual neurons whose receptive fields overlap such locations. The magnitude of these effects at different stations of the visual pathway vary but can be seen in many animals as early as the lateral geniculate nucleus of the thalamus. Such attentional enhancements become more pronounced as one moves up the visual hierarchy and in primates is most strong at the highest visual areas. Early work on the topic employed cueing paradigms and single unit recordings from awake behaving non-human primates. These studies consistently turned up two forms of attention related changes to neural firing termed contrast and response gain.

<!-- image omitted -->
Contrast gain causes left-ward shifts of the neural stimulus response function. The visual system is attuned to contrast and many neurons, including those within the cortex, increase their firing as stimulus contrast grows (Figure XX). The relationship often adopts a sigmoid shape: the neural response follows stimulus contrast linearly in a narrow band of values, below this band neurons rarely respond, above this bad their responses saturate. In many ways, such neurometric curves, were analogous to the psychometric curves computed for an entire animal’s response to stimuli.

Figure 4. Contrast vs response gain

Such stimulus-response curves are shifted left when attention is placed upon a stimulus residing in the receptive field (Figure XX). If attention is directed outside the receptive field, the curve shifts to the right. These shifts change neural firing in ways that mimic an effective increase in stimulus contrast and were observed at both neural and behavioral levels. These results suggested that the neural mechanisms underlying spatial attention may be the same mechanisms activated by strong versus weak stimuli.

Response gain increases a neural responses across all kinds of attended stimuli. A separate, but parallel line of inquiry showed a very different effect of attention –under certain conditions, both the psychometric curve of subjects and the neurometric curves obtained from recordings would show a vertical stretching (figure XX). The curves obtained when attention was directed into the receptive field of a neuron were consistent with a multiplication of that neuron’s stimulus-response function. Thus, attention in these experiments was seen as an increase in the excitability of neurons rather than the change in stimulus sensitivity produced by contrast gain.

<!-- image omitted -->

Attention biases competition between two stimuli residing in the same receptive field. Macaque brain area V4 had become the premier model for these studies because the large receptive fields of V4 neurons (~60degrees) made their responses to stimuli relatively immune to small eye movements. However, this large size meant that studies of contrast and response gain required subjects to move attention to the other hemifield to be well clear of any overlap with the recorded cells receptive field. As understanding grew, the large size of these receptive fields proved to be a sticky issue. Specifically, researchers began asking what happens when attention must select among stimuli competing within the same receptive field as occurs during visual search?

Moran and Desimone (1985) tested this directly by placing a behaviorally relevant and irrelevant stimulus within a single V4 neuron's receptive field and asking a subject to move attention between them. The two stimuli differed along dimensions of the neuron’s selectivity (ie: color and orientation) so that one was a "good" stimulus that drove the cell strongly on its own and the other a "poor" stimulus that drove it weakly. When attention directed outside the receptive field, the neuron's response to the pair fell to a level between that evoked by either stimulus alone. When the monkey attended to the good stimulus, the paired response rose toward the level evoked by that stimulus alone; when attention shifted to the poor stimulus, the paired response fell toward that stimulus's lower evoked firing rate. In each case the neuron's output came to resemble its response to the attended stimulus in isolation. It is as though the unattended stimulus had been filtered out of its receptive field entirely. (FigureYY)

Figure 5. Attention biases competition between stimuli in the receptive field

<!-- image omitted -->
Attention to a visual feature enhances neural firing in ways similar to spatial attention. Attention to a visual feature enhances neural firing in ways similar to spatial attention, but the underlying computation differs. Treue and Martinez-Trujillo (1999) recorded from neurons in the motion-sensitive area MT while two patches of moving dots were displayed, one positioned inside a neuron's receptive field and the other in the opposite hemifield, entirely outside it (figureZZ). On each trial the monkey attended either to the fixation point or to the patch outside the receptive field, and the two patches always moved in the same direction. Although the recorded neuron's receptive field always contained the same physical stimulus, its firing rate changed depending on the direction of the attended patch elsewhere in the visual field: responses rose when the attended direction matched the neuron's preferred direction and fell when it matched the neuron's null direction. Because the attended stimulus never entered the receptive field, this modulation could not be a spatial effect. Instead, it depended only on the attended feature (motion direction).

Figure 6. Feature Attention

This push-pull pattern led Treue and Martinez-Trujillo to propose the feature-similarity gain principle: attention multiplies a neuron's response by a gain factor set by the similarity between the attended feature and the neuron's own tuning preference.

Normalization model: are the many forms of attentional modulation different mechanisms, or are they facets of the same process? Starting in the early 2000s, the field was trying to reconcile the many different forms of attention and their neural correlates. The question being asked was whether contrast/response gain, biased competition, feature similarity, and others, reflected different underlying mechanisms of visual attention or were in fact the same phenomenon. A big clue would emerge from computational studies of visual cortical neurons which revealed the normalization-like logic of their firing to visual stimuli.

Normalization was first formalized as a mechanism for gain control in primary visual cortex, where a neuron's response is computed from both its own input divided by the pooled activity of a wider population of neighboring neurons (Heeger, 1992). This divisive step endows visual neurons with unique coding properties that include invariance to certain stimulus dimensions (contrast), high-sensitivity, and winner-take-all behavior. This latter feature is particularly relevant to attention since earlier work indicated that presentation of two stimuli in the receptive field evoked activity that was an average of that evoked by either stimulus alone. However, attending to one of these stimuli led its activity pattern to dominate firing behavior.

Reynolds and Heeger (2009) proposed that attention acts directly on the normalization computation. In their model, attention adds an extra gain field over the population of neurons — a spatially or feature-selective region where inputs are boosted before they are pooled for normalization. Whether this produces contrast gain or response gain depends on the size of the stimulus relative to the size of the attention field: a small stimulus attended by a wide field yields contrast gain, a large stimulus attended by a narrow field yields response gain, and every intermediate combination is possible in between. The same architecture, applied to two stimuli sharing a receptive field, reproduces biased competition; applied to a field defined by feature rather than location, it reproduces the feature-similarity gain principle. A single computation, run under different conditions, accounts for all four phenomena described above.

### BREAK OUT BOX: The normalization model of attention

#### One stimulus

A neuron's response, r, depends on the stimulus's contrast, c:

r(c) = α · c / (c + σ)

α = maximum neural response.

σ = threshold contrast to evoke a neural response.

The denominator isn't just this neuron's own input, rather, it is a sum over a whole neighborhood of nearby neurons, pooled together to keep responses in a workable range. Attention adds a gain, γ (always greater than 1), but that gain only reaches whatever falls inside the attention field.

Whether it produces contrast gain or response gain comes down to one question: **does the attention field also reach the neighborhood being pooled for suppression, or does it stay local to just this one input?**

**A narrow attention field produces response gain.** If the boost lands mostly on this neuron's own input and not on the pooled neighborhood response, the denominator barely changes but the numerator grows. This scales the whole contrast response function upward at every contrast.

**A broad attention field produces contrast gain**: If the boost lands on the neuron’s input and the whole pooled neighborhood too, then the entire fraction is multiplied which is the same lowering the neuron’s threshold, thereby shifting the contrast response function left.

#### Two in receptive field

When a preferred stimulus at contrast c_p, and a fixed non-preferred stimulus at contrast c_n share the same receptive field. The neural response is:

r = α · c_p / (c_p + β·c_n + σ)

α = maximum neural response.

σ = threshold contrast for a neural response

β = how much the non-preferred stimulus suppresses the neuron

When attention is directed to the non-preferred stimulus γ multiplies only its term in the denominator:

r = α · c_p / (c_p + γβ·c_n + σ)

The preferred stimulus's own drive in the numerator never changes. Attention simply makes the non-preferred stimulus's suppressive contribution bigger, so the response falls toward whatever the non-preferred stimulus alone would evoke.

Attention on neither stimulus gives a response that averages the two stimuli since nothing is boosted.

Attention on the non-preferred stimulus produces suppression: γ lands entirely in the denominator, growing the competing term and pulling the response down.

#### One in, one outside RF

One stimulus sits inside the neuron's receptive field, at contrast c. A second stimulus sits somewhere else entirely, outside the receptive field. Its location doesn't feed into this neuron's response at all. What matters is only which orientation is being attended.

r(c) = α · γ_eff · c / (c + σ)

α = maximum neural response.

σ = threshold contrast to evoke a neural response.

γ_eff = attentional gain

<!-- image omitted -->
Because the outside stimulus isn't spatially inside the receptive field, it never enters this neuron's denominator the way the non-preferred stimulus did in the two-stimuli case. There is no competing term here, nothing being suppressed. The only question is whether the attended orientation matches what this neuron prefers.

Attention on an orientation unrelated to either stimulus gives γ_eff ≈ 1: baseline response.

Attention on the outside stimulus, when its orientation matches the neuron's own preferred orientation, gives γ_eff close to γ: full enhancement, even though the boosted stimulus was never inside this neuron's receptive field. When the outside stimulus’ orientation is very different from the neuron’s preferred orientation, then y_eff falls and the neural response is suppressed.

<!-- end breakout box -->

## Population effects of visual attention

### Attention improves signal to noise ratio by reducing shared variability among neurons.

Increasing the responsiveness of neurons during attention, carries a hidden cost: a neuron that fires more strongly to the attended stimulus also fires more variably from trial to trial. This means that attentional increases in gain apply to signal and noise equally. In principle this need not matter, since the brain could average across many enhanced neurons and thereby reduce noise. However, averaging only works if each neuron's noise is uncorrelated with that of its neighbors. This is not the case for visual neurons, particularly those with overlapped receptive fields which tend to fluctuate together.

This shared fluctuation is measured as the noise correlation: the correlation between two neurons' spike counts across repeated presentations of the same stimulus under the same task conditions. Because the stimulus is identical on every trial, whatever covaries between the two neurons is not stimulus-driven. Since this noise is common to the pair, it survives any subsequent averaging and sets a ceiling on the sensitivity a population can reach.

Recent work indicates that attention lowers this ceiling. Recording pairs of V4 neurons during spatial attention tasks, two groups found that noise correlations fell by roughly 40% when attention was directed into the neurons' shared receptive field (Cohen and Maunsell, 2009; Mitchell, Sundberg, and Reynolds, 2009). This is a much larger effect than attention had on the same neurons' firing rates (under 20%) or on the variability of each neuron considered alone (under 10%).

The size of these three changes maps onto how much each contributes to the population. Cohen and Maunsell (2009) recorded groups of V4 neurons simultaneously and measured how well the population discriminated between two stimuli, then asked which physiological change accounted for the attention-related improvement in that measure. The reduction in noise correlation accounted for over 80% of it. Across recording sessions, the improvement in population sensitivity tracked the improvement in the monkey's psychophysical threshold, though this relationship is correlational; no experiment has yet manipulated noise correlations directly to test whether they cause the behavioral gain.

The same pattern holds for feature attention. Recording V4 populations while monkeys alternated between spatial and feature attention tasks, Cohen and Maunsell (2011a) found that pairs showing the largest rate increases showed the largest correlation decreases, and pairs whose rates fell showed correlations rise instead. Rate and correlation move together in both forms of attention, suggesting that whatever mechanism produces gain also produces decorrelation.

### Populations of neurons reveal highly dynamic fluctuations in attention state

Population-level studies, like those in the previous section, prompted new ways of thinking about attentional effects. Specifically, researchers began asking whether firing across a population could serve as a trial-to-trial measure of how attention fluctuates.

<!-- image omitted -->
<!-- image omitted -->
The thinking was that simultaneously recorded neurons could supply many measurements of the same period of time when a subject is attending (or not) to a visual stimulus. If the responses of many neurons are treated as a set of coordinates, each trial becomes a point in a space with one dimension per neuron, and the trials of a given attention condition form a cloud of points within it. An early, elegant example showed that cues directed at two different spatial locations produce point clouds with different centers. Joining these centers with a line defines an attention axis and projecting a single trial's population response onto this line yields one number describing where the population sat between the two attentional states (Cohen and Maunsell, 2010) (Figure XX).

Since the axis was built from correct trials alone, missed trials served as an independent test of whether it tracked attention or merely the cue: on missed trials, projections fell closer to the mean of the opposite attention condition, as though attention had drifted to the wrong location. Projections predicted performance more generally as well — when the population indicated attention to the left, the monkey detected most changes on the left and almost none on the right.

Later work from the same group used this population measure to track spatial and feature attention simultaneously. Attention axes for spatial attention fluctuated independently in each hemisphere, while those for feature attention were coordinated across both. This is consistent with the effects of spatial and feature attention on individual neurons: spatial attention is localized to neurons representing the attended location, whereas feature attention modulates neurons carrying information about the attended feature regardless of where their receptive fields sit. These differences in cortical extent become relevant when we consider the circuitry that implements attentional effects in the next section.

## Primate studies suggest that brain regions involved in saccade generation/planning are also used for attention

Superior colliculus and lateral posterior nucleus; LIP

Figure: Just a brain cartoon with these centers labelled and arrows with flow and known computations

<!-- image omitted -->

Frontal eye fields and the premotor theory of attention.

### Mountcastle here

## Brain Imaging studies reveal a network of brain areas involved in attention

Fmri work

Oscillations (gamma)

## Working Memory

## Disease

Hemifield neglect

<!-- image omitted -->
<!-- image omitted -->
Macdonald Critchley the parietal lobes

ADHD
