-- OPENBRAIN-71: Stuart's 20 Nov phone notes on three Retina uploads. No host-code
-- dependency: the change is one marked CSS block per file, read only on a phone
-- (frame at most 470px wide on a screen under 768px), so it is safe before or
-- after the deploy. Photoreceptors: the part names are bordered buttons with a
-- pressed state. Phototransduction and ON/OFF bipolar cells: a smaller legend
-- and tighter caption rows leave the animation most of the frame.
-- Only uploaded HTML changes; publication state and author metadata are kept.
-- The expected hashes are the published files (066200, and 066210 for
-- Photoreceptors). An intervening author edit aborts the whole migration.
do $phone_widgets$
declare current_html text; repaired text; slug_ text; expected_md5 text; repaired_md5 text; block text;
begin
  for slug_, expected_md5, repaired_md5, block in select * from (values
    ('retina-on-off-bipolar-cells', '2a6ec0fc170ce3005e1838e2764fc8df', '9067f39e6a0020e2eeeaa181480195ae', $ob71_on_off_bipolar_cells$
<!-- Open Brain book (OPENBRAIN-71): phones: a tighter heading, caption and legend leave the animation most of the frame; the title the book already prints above the frame is kept for screen readers only. -->
<style>
@media (max-width: 470px) and (max-device-width: 767px) {
  html.tob-site .tob-head { gap: 6px 12px; padding: 8px var(--tob-left) 6px; }
  html.tob-site .tob-title { font-size: 16px; line-height: 22px; }
  html.tob-site[data-ob-fit]:not([data-ob-fullscreen]) .tob-title { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  html.tob-site .tob-seg button { min-height: 36px; }
  html.tob-site .tob-caption { gap: 6px 12px; padding: 8px 8px 8px 10px; font-size: 13px; line-height: 18px; }
  html.tob-site .tob-ctl { width: 36px; height: 36px; }
  html.tob-site .tob-canvas { padding: 6px var(--tob-left) 4px; }
  html.tob-site .tob-legend { padding: 4px var(--tob-left) 10px; font-size: 11px; line-height: 14px; letter-spacing: .2px; }
  html.tob-site .tob-legend ul { gap: 5px; }
  html.tob-site .tob-chip { min-height: 32px; padding: 3px 9px 3px 6px; gap: 6px; }
  html.tob-site .tob-chip svg { width: 16px; height: 16px; }
}
</style>
</head>$ob71_on_off_bipolar_cells$),
    ('retina-photoreceptors', 'c89ee0b922aaa7e45ea1374b2b34b529', '0610fb04a5e62868efd72bb8191fe2f3', $ob71_photoreceptors$
<!-- Open Brain book (OPENBRAIN-71): phones: the part names are bordered buttons with a pressed state and a one-line prompt. -->
<style>
@media (max-width: 470px) and (max-device-width: 767px) {
  .tob-picker-single .tob-picks { display: flex; flex-flow: row wrap; align-items: stretch; gap: 6px; padding: 2px var(--tob-left) 8px; }
  .tob-picker-single .tob-picks::before { content: "Tap a part to highlight it"; flex: 1 1 100%; padding-bottom: 2px; font: 400 11px/16px var(--tob-mono); letter-spacing: .2px; color: rgba(0, 0, 0, .66); }
  .tob-picker-single .tob-picks button { min-height: 40px; padding: 4px 12px; border: 1px solid #000; background: #fff; letter-spacing: .2px; transition: background-color .15s, border-color .15s; }
  .tob-picker-single .tob-picks button span { padding: 0; border: 0; }
  .tob-picker-single .tob-picks button:active { background: rgba(0, 0, 0, .12); }
  .tob-picker-single .tob-picks button[aria-pressed="true"] { background: var(--tob-highlight); font-weight: 600; }
}
</style>
</head>$ob71_photoreceptors$),
    ('retina-phototransduction', '96214ba74dc9802499b2bcf6764d7463', '7ad37d8ecb86210e9c0a329fe3ba90e6', $ob71_phototransduction$
<!-- Open Brain book (OPENBRAIN-71): phones: a smaller legend and tighter caption and step rows leave the animation most of the frame. -->
<style>
@media (max-width: 470px) and (max-device-width: 767px) {
  .tob-head { padding: 8px var(--tob-left); }
  .tob-caption { gap: 6px 12px; padding: 8px var(--tob-left); font-size: 15px; line-height: 21px; }
  .tob-caption-text { padding: 0; }
  .tob-ctl { width: 38px; height: 38px; }
  .tob-dots { padding: 8px var(--tob-left) 0; }
  .tob-dot { height: 34px; }
  .tob-canvas { padding: 8px var(--tob-left) 6px; }
  .tob-legend { padding: 8px var(--tob-left) 10px; font-size: 11px; line-height: 14px; letter-spacing: .2px; }
  .tob-legend ul { gap: 5px; }
  .tob-chip { min-height: 32px; padding: 3px 9px 3px 6px; gap: 6px; }
  .tob-chip svg { width: 16px; height: 16px; }
}
</style>
</head>$ob71_phototransduction$)
  ) as v(slug, expected_md5, repaired_md5, block)
  loop
    select html into current_html from public.widget_uploads where slug=slug_ for update;
    if not found then raise exception 'OPENBRAIN-71: missing upload %, apply 066200 first', slug_; end if;
    if md5(current_html)=repaired_md5 then continue; end if;
    if md5(current_html) is distinct from expected_md5 then
      raise exception 'OPENBRAIN-71: % changed since it was published; reconcile author HTML before retry', slug_;
    end if;
    repaired := replace(current_html, '</head>', block);
    if md5(repaired) is distinct from repaired_md5 then raise exception 'OPENBRAIN-71: unexpected result for %', slug_; end if;
    update public.widget_uploads set html=repaired, updated_at=now() where slug=slug_;
  end loop;
end $phone_widgets$;
