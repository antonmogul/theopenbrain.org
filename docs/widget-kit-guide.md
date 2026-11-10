# Building Open Brain widgets in Claude

For the book's authors and designers. How to set up the Open Brain widget
skill in Claude, build or change a widget with it, and hand the file over.
This guide is also the page at `/widget-kit` on the site. Last updated 10 Nov 2026 (OPENBRAIN-164).

## What a widget is now

Every new interactive figure is **one HTML file** with its HTML, CSS,
JavaScript, images and sound inside it. That file is what readers get: the
book runs it as it is, in a frame inside the chapter, and gives it the
chapter's colours. Nobody rebuilds it in another framework, so whoever has the
file can change it, and the next version simply replaces the last.

The skill teaches Claude the book's rules: sizes, colours, type, the tab
switch, phones to wide screens, reduced motion, narration, and what to check.

## One-time setup in Claude (claude.ai or the desktop app)

1. Download the skill, `open-brain-widget.zip`, with the button at the top
   of the widget kit page (or from the creator dashboard, Widgets →
   Download the skill). Don't unzip it.
2. In Claude, open **Settings → Capabilities**. Make sure code execution and
   file creation is on (skills need it).
3. Under **Skills**, choose **Upload skill** and pick the zip. "open-brain-widget"
   appears in the list; make sure it is switched on.
4. When the skill changes, we'll send a new zip: upload it again the same way
   (it replaces the old one).

On a Claude Team or Enterprise plan, an admin can instead add the skill once
for the whole organisation.

## Building or changing a widget

Start a new chat and say what you want, naming the book so the skill is used,
for example:

- "Build an Open Brain widget for the History chapter: Loewi's frog heart
  experiment, narrated, step by step. Here is the storyboard." (attach it)
- "Here is our Open Brain widget `history-loewi-vagusstoff.html`. After the
  fluid is collected, remove the stimulator and the vagus nerve." (attach the file)
- "Review this Open Brain widget against the History chapter text." (Stuart:
  attach the widget and paste the section)

Claude will reply with an HTML artifact, a list of what changed, the file
size, the checklist, and any questions.

## Handing it over

- **Send the file, not a link.** Use the artifact's download button to save
  the `.html`, and email it or put it in the shared Dropbox. We can't open
  artifact links that belong to someone else's account.
- **Keep the name.** `history-loewi-vagusstoff.html`, not
  `..._Nov09.html`. The version and date go in the comment at the top of the
  file, which Claude fills in. Same name means it replaces the old one.
- **Keep it small.** Under 2 MB if you can (4 MB is the limit). Pictures and
  sound make files big: draw diagrams as vector, keep photos small, and use
  a single narration track at a low bit rate. Claude knows the numbers.
- If you have a creator account, you can upload it yourself as a draft in
  the dashboard (Widgets → Upload). It runs the book's checks at phone,
  tablet and desktop widths before anything is published.

## What the book needs from every widget

The skill holds the full list; the ones that most often come up:

- Works from a 360 px phone to a 1440 px screen, no sideways scrolling.
- Works when the book gives it a fixed height (a full-screen band or the
  figure pane beside the text): nothing cut off.
- The chapter colour for the one thing to look at; everything else white
  and greys on the dark plate.
- Narration starts from a play button, has captions and a transcript, and
  the reader can pause and step through.
- Every label, number and claim matches the chapter or a cited source.
