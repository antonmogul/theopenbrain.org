# 8.1 Anchoring Effects in UI

## The First Number Changes Everything

In a classic experiment, Tversky and Kahneman spun a wheel of fortune in front of participants. The wheel was rigged to land on either 10 or 65. After observing the number, participants were asked: "Is the percentage of African nations in the United Nations higher or lower than this number? What is your estimate of the actual percentage?"

The wheel was obviously random. Yet participants who saw 65 estimated significantly higher percentages than those who saw 10. An arbitrary number—acknowledged as arbitrary—profoundly influenced subsequent numerical judgments.

This is **anchoring**: the human tendency to rely heavily on the first piece of information encountered when making estimates or decisions. Anchoring isn't a flaw in judgment—it's a fundamental feature of how cognition handles numerical uncertainty.

## Why Anchoring Occurs

Anchoring emerges from how the brain generates estimates:

**Insufficient adjustment**: When estimating unknown values, people start from available information (the anchor) and adjust. But adjustment is typically insufficient—people stop adjusting before reaching unbiased estimates.

**Selective accessibility**: Anchors activate anchor-consistent information in memory. When considering whether a value is higher or lower than an anchor, features consistent with the anchor become more accessible, biasing the final estimate.

**Effort conservation**: Precise estimation is cognitively expensive. Anchors provide starting points that reduce estimation effort, even at the cost of accuracy.

Research shows anchoring occurs even when:
- The anchor is obviously random (wheel of fortune)
- People are warned about anchoring
- People are motivated to be accurate
- Experts make judgments in their domain

Anchoring is not a failure of intelligence—it's a pervasive feature of cognition.

## Anchoring in Interface Design

Anchoring effects appear throughout digital interfaces:

### Pricing Pages and Plan Positioning

When users encounter pricing options, the first price they process becomes an anchor:

**High-anchor first**: Displaying the most expensive option first ("Enterprise: $499/month") makes mid-tier options ($99/month) seem reasonable by comparison.

**Recommended plan highlighting**: The "highlighted" or "most popular" plan serves as an anchor. Other plans are evaluated relative to it.

**Original vs. sale prices**: Showing original price ($150) crossed out next to sale price ($79) anchors on the higher value, making the discount feel significant.

### Default Quantities

E-commerce quantity selectors anchor purchasing decisions:

**Default of 1**: Subtle anchor toward single-item purchase
**Default of 2**: Can increase average order quantity, but may feel pushy
**Suggested quantities**: "Most customers buy 3" anchors toward higher quantity

### Sliders and Initial Values

Input sliders with default positions anchor user adjustments:

**Centered defaults**: Users may adjust minimally from center
**Endpoint defaults**: Starting at minimum or maximum encourages larger adjustments
**Strategic defaults**: Defaults set to business-favorable values anchor user selection

### Progress Indicators

Progress displays anchor expectations:

**Percentage complete**: "50% complete" anchors expectation of remaining effort
**Steps remaining**: "Step 3 of 5" anchors sense of progress
**Time estimates**: "Approximately 10 minutes" anchors time expectations

## Ethical Considerations

Anchoring is a double-edged sword. It can be used to:

**Help users**: Providing helpful context for unfamiliar decisions, suggesting reasonable defaults, setting appropriate expectations

**Manipulate users**: Inflating perceived value through high anchors, making overpriced options seem reasonable, exploiting uncertainty for business benefit

### The Ethics Line

Consider these questions:
- Is the anchor based on genuine value or artificially inflated?
- Does the anchor help users make better decisions or worse ones?
- Would users object if they understood the anchoring effect?
- Are users free to deviate from the anchor, or is the interface designed to trap them near it?

Ethical use of anchoring provides genuinely helpful context. Manipulative use exploits cognitive architecture for gain at users' expense.

## Using Anchoring Ethically

### Providing Context for Unfamiliar Quantities

When users must estimate or decide about unfamiliar domains, anchors provide helpful reference:

**Example**: A donation page might show "Most donors contribute $50" to provide context for users uncertain how much to give. This anchors toward $50 but serves users who genuinely don't know what's typical.

**Example**: A time-tracking tool might show "Average task duration: 2 hours" to help users estimate. The anchor aids rather than exploits.

### Historical Data as Anchors

Showing users their own historical data creates personal anchors:

**Example**: "Last month you spent $340 on dining out" anchors budget decisions on personal history—helpful context that users can adjust from.

**Example**: "Your typical response time: 2 hours" anchors expectation-setting on actual behavior.

### Reasonable Defaults

Smart defaults are anchors designed to match typical user needs:

**Example**: Form fields pre-filled with most common selections
**Example**: Notification settings defaulted to reasonable frequencies
**Example**: Privacy settings defaulted to protective options

The key: defaults should reflect what most users would choose, not what most benefits the business at users' expense.

## Case Studies

### Dark Pattern: The Inflated Original Price

**Scenario**: E-commerce site shows "Was: $299 | Now: $89" but the item was never actually sold at $299—the inflated "original" price is a fabricated anchor.

**Analysis**: This exploits anchoring to create false perception of value. Users believe they're getting $210 in savings that don't actually exist.

**Ethical alternative**: Show genuine original prices, competitor prices, or typical market prices. "Compare at $120" with actual market data provides honest anchoring.

### Helpful Pattern: Pricing Comparison Context

**Scenario**: A subscription service shows "$9.99/month" alongside "That's less than a coffee per day" or "Equals $0.33/day."

**Analysis**: Reframing creates a different anchor—comparing to familiar small expenses makes the monthly cost feel manageable.

**Ethical assessment**: If the comparison is accurate and the service provides genuine value, this helps users contextualize unfamiliar pricing. If the service is overpriced, the reframe obscures that reality.

### Donation Anchoring

**Scenario**: A charity donation form offers preset buttons: $25, $50, $100, $250. The default highlight is on $50.

**Analysis**: The preset options anchor donation amounts. Many donors would give whatever the options suggest. The $50 highlight anchors toward that specific amount.

**Ethical consideration**: Are the presets reasonable for the donor base? Does anchoring toward $50 serve the charity's mission without exploiting donors? Is the $250 option creating an anchor that makes $100 seem moderate when donors might otherwise give $50?

## Guidelines for Ethical Anchoring

**Do**:
- Provide anchors that help users contextualize unfamiliar decisions
- Use historical or personalized data as anchors when available
- Set defaults that reflect what typical users would choose
- Frame information honestly, even when reframing

**Don't**:
- Create artificial anchors designed to inflate perceived value
- Use anchors to push users toward decisions that benefit you at their expense
- Fabricate "original prices," "typical amounts," or other anchor data
- Exploit anchoring to obscure fair evaluation of options

## Anchoring as Perceptual Phenomenon

Anchoring bridges perception and decision-making. Like visual illusions that persist despite knowledge, anchoring persists despite awareness:

- Knowing about anchoring doesn't eliminate its effect
- Anchors work even when arbitrary
- The same mechanisms that enable useful contextual processing also enable manipulation

Interface designers have power over the anchors users encounter. That power carries responsibility to deploy anchoring in users' interests, not just business interests.
