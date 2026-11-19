-- Review notes, round 1 (19 Nov 2026): the team's answer to the 31 notes
-- Stuart and Maura left with the review widget on 19 Nov (and Anton's test
-- note), after the fixes in PRs #211-#215 were merged, deployed and their
-- migrations pushed. Fixed notes become 'done' (green in the widget: the
-- author can tick them off or reopen them), notes that need an asset or an
-- answer from Stuart become 'question', the test note 'wont_do'. The reply
-- is what the reviewer sees under their note.
--
-- Guarded: only rows still 'new' with no reply change, so a status a
-- creator set meanwhile in the dashboard wins. No BEGIN/COMMIT.
update public.review_feedback as r
   set status = v.status, reply = v.reply, replied_at = now(), updated_at = now()
  from (values
  ('095b7c3c-9e2b-4768-b71b-3785f22bf26e'::uuid, 'done', 'Removed the “Funding” label and kept the panel, funding sentence and linked logo.'),
  ('a82adeef-849f-46ac-af62-fd81eb28381a'::uuid, 'done', 'Merged the end of the opening paragraph with the four questions using your suggested wording exactly. The repeated opening is removed; the content migration keeps both paragraph identities, the citation and the figure link.'),
  ('cfd5333d-88e8-41d5-a970-43c2216435dc'::uuid, 'done', 'Removed “Chapter 1 · The end” from the shared chapter ending, so every chapter now goes straight to its title and “ends here.”'),
  ('48ad72bd-b4c8-40f5-ade2-f324cc5d5d14'::uuid, 'done', 'Both binder close controls now show only the ×. They still announce “Close the binder” to screen readers.'),
  ('6fa67349-1413-417b-8021-2636ea4c812e'::uuid, 'done', 'Desktop mouse movement now rocks the hand again; leaving the mouse still no longer plays the pry sequence. The improved range and cut-line pivot remain, and phones still autoplay.'),
  ('8ef972cd-765b-4a70-beca-47630dae3f0a'::uuid, 'done', 'Enlarged the skull by using the full available height, with desktop view controls beside it above the source text. The expand control now sits beside the lower legend; the phone retains its legend and source-text sheet.'),
  ('ea857d83-88ab-4775-908f-f88ad140a127'::uuid, 'wont_do', 'Test note from Anton: nothing to change.'),
  ('d6ffdced-0b34-44e0-a490-c98dc722012b'::uuid, 'done', 'The dots are larger, figures use hollow square frames, and widgets use dashed square frames when the timeline is expanded. The departure circle is gone, and browser Back still returns to your previous place.'),
  ('4815bd11-2865-446d-9529-e5e03cd4e559'::uuid, 'done', 'Dots now turn purple as you pass them, matching the paragraph dashes. The same progress styling is used in the strip, map and phone scrubber.'),
  ('289b7474-a0ff-4314-9f22-232a09fb2f6d'::uuid, 'done', 'Added the Vision Science Research Network funding line and linked logo beneath the authors, using the same component as History. The logo is bundled locally as WebP.'),
  ('31ba8fda-66b2-452d-bb8e-11758d5c80f9'::uuid, 'done', 'Retina citations now use History''s numbered superscripts and reference-list navigation, including “Back to the text”. The existing 106 reference entries and their numbering are retained.'),
  ('91b2e73a-c6ec-405f-b3f2-d93be7bc839a'::uuid, 'done', '“Counting photons” is now ordinary prose with the bundled current–voltage chart as its figure, rather than an empty demo.'),
  ('a213369d-c51a-45f3-9d00-ecc6099a359b'::uuid, 'question', '“Signal amplification and single photon detection” is now ordinary prose. I could not find an associated static illustration in the 2023 source or assets; please send or identify the intended image.'),
  ('cc0a328a-5765-4a7d-9b3e-7704dee80203'::uuid, 'done', 'Removed the Dennis Baylor placeholder video and its unfinished “talking about visual threshold and single photon detection” note. The surrounding phototransduction material is retained.'),
  ('2613d89b-f43e-4dbd-ba37-be37a024f9ab'::uuid, 'done', 'Removed the unfinished frog/OMS planning note and the other plain-text planning fragment, “talking about these phenomena”. The chapter''s scientific text and circuit computations remain.'),
  ('0728f249-4ee0-45e8-9d1d-685902d96eb1'::uuid, 'question', 'The old entry is in the correct place after Blind spot, but has only Tom Baden''s name and “Is our retina really upside down?”, with no media URL or video slug. Please supply the video file or link so we can restore the right interview.'),
  ('d12c037e-53dc-4e38-b57b-c1f7d3f58707'::uuid, 'done', 'Added the instruction to stare at the cross for 30 seconds, then close your eyes or look at a white wall and notice how the colours change, as the original figure''s caption.'),
  ('4ca567cf-3e14-45cf-875e-75f1a00f9252'::uuid, 'done', 'The Zahn caption now keeps its space below the drawing while the figure fades away, preventing it from jumping up the left pane.'),
  ('6818675d-21f0-49bd-a43c-065402aedc4b'::uuid, 'done', 'The zoom now uses the interactive figure''s actual drawing coordinates and crop. The retinal cross section keeps the same size and position when its controls appear.'),
  ('c97738ff-bf9a-4188-a620-69597aa5d045'::uuid, 'done', 'Matched the shared photoreceptors, bipolar, amacrine and ganglion cells to the first center-surround interactive, including size and position. Later interactives retain their distinct authored layouts.'),
  ('75677455-2e10-406f-a0e2-978eb2358a39'::uuid, 'done', 'Restored the retinal cross section and corrected the horizontal-cell preset, so horizontal cells are highlighted as this section begins.'),
  ('0488435c-1d42-4bf5-9633-c16cb3972ea5'::uuid, 'done', 'Restored the retinal cross section with bipolar cells highlighted. The figure stays available around the intervening ON/OFF interactive.'),
  ('5e17a303-f6d3-4a9c-baef-88bbe1832e20'::uuid, 'done', 'The same bipolar-cell cross section is visible again when the ON/OFF interactive ends.'),
  ('b759bfad-b938-4496-99f8-241a95e32771'::uuid, 'done', 'The photoreceptors figure now stays beside the phototransduction introduction until the next full-width interactive.'),
  ('37a27421-64e5-4e59-a01a-145714b3f7e4'::uuid, 'done', 'The rod-and-cone drawing returns after the visual-cycle interactive and stays beside the comparison of rod and cone sensitivity.'),
  ('f1ebcf1e-6202-4fa0-b1b6-a434770080bd'::uuid, 'done', 'The center-surround interactive now stays beside the remaining center-surround text and yields to the color-opponency figure.'),
  ('54120e63-291c-4e30-94d1-17239508b8f1'::uuid, 'done', 'Moved the Eye Movements title below the picture and added a legend describing the eye movements discussed in the text.'),
  ('73de308d-1b97-41e0-b71b-69fac78e6b9f'::uuid, 'question', 'This note points to “Generation and wiring of retinal neurons.” The 2023 chapter has no animation at that paragraph; its next media item is the “Spontaneous waves of activity” video. Which animation should accompany the generation-and-wiring text, and can you identify or supply that asset?'),
  ('b7325a60-7e99-455e-871d-713a230b5ed1'::uuid, 'done', 'Colour vision now fills a full-screen band and pauses like the History boxes. This is the widget equivalent of the side-scrolling boxes; its longer content scrolls inside the band.'),
  ('13180553-deac-4fad-be52-79714fa05b29'::uuid, 'done', 'Direction selectivity now appears directly in a full-screen band with the same pause as the History skull and binder. Its content stays inside that band, with an expand control available.'),
  ('fe62eb3f-304d-42e9-ae40-750108ca0ef2'::uuid, 'done', 'RetINaBox now waits behind its original logo and a “Load RetINaBox” button inviting readers to explore retinal feature detectors. Scrolling past it no longer fetches or starts the simulation.')
  ) as v(id, status, reply)
 where r.id = v.id
   and r.status = 'new'
   and r.reply is null;
