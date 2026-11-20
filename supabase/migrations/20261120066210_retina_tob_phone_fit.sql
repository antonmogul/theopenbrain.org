-- OPENBRAIN-62b: no host-code dependency; apply after 20261120066200.
-- Only uploaded HTML changes. Preserve publication state and author metadata.
-- The expected hashes are the exact 066200 outputs. Refuse intervening edits.
do $phone_fit$
declare item record; current_html text; repaired text;
begin
  for item in select * from (values
    ('retina-center-surround', 'c8134033f1e560dd66e7487a0bf4eb41', '29449c3b54cd91c70b551ac39ec8653b'),
    ('retina-direction-selectivity', 'facd3bc6de9f69c4f8668ad5e8d3b52a', '8ee7c31e76b16dec2c17fc1260d0f53e'),
    ('retina-light-sensitive-ganglion-cells', 'b7c9da93e8b11c591eb24bb3dc997d95', '5b976191718d0c5841ce8a5e26ad337a'),
    ('retina-object-motion-sensitivity', 'bc400eb17c4c619cd50c45974659de55', 'c8d681a453e40627d3e26bbf0b1fbe63'),
    ('retina-photoreceptors', 'ae8625bd502ff613a72b2e259d18fcef', 'c89ee0b922aaa7e45ea1374b2b34b529'),
    ('retina-retinal-cell-types', '034f496f64e32507fa325bb60d06f023', 'b17b6b89cd4eaea541624ce30eaea959'),
    ('retina-rod-vs-cone-circuits', '72808e20f8bbeeb1b75674cf3efa29d3', 'c543c9759c8e08a32c931ef4673663f8'),
    ('retina-synaptic-architecture', '14307750ed2793c7e1fbb4e33d28f227', '5b04418570893008acf89409ad8cf810')
  ) as v(slug, expected_md5, repaired_md5)
  loop
    select html into current_html from public.widget_uploads where slug=item.slug for update;
    if not found then raise exception 'OPENBRAIN-62b: missing upload %, apply 066200 first', item.slug; end if;
    if md5(current_html)=item.repaired_md5 then continue; end if;
    if md5(current_html) is distinct from item.expected_md5 then
      raise exception 'OPENBRAIN-62b: % changed since 066200; reconcile author HTML before retry', item.slug;
    end if;
    repaired := replace(current_html, '</head>', $fit_css$
<!-- Open Brain book (OPENBRAIN-62b): fitted phone keys stay below the artwork and pickers above it; do not squeeze the canvas into a horizontal flex row. -->
<style>
@media (max-width: 470px) {
  html[data-ob-fit].tob-keyed .tob-view,
  html[data-ob-fit].tob-picker .tob-view { flex-direction: column; }
  html[data-ob-fit].tob-keyed .tob-canvas,
  html[data-ob-fit].tob-picker .tob-canvas { flex: 1 1 0; height: auto !important; min-width: 0; width: 100%; }
  html[data-ob-fit].tob-keyed .tob-key,
  html[data-ob-fit].tob-picker .tob-picks { flex: none; }
}
</style>
</head>$fit_css$);
    if md5(repaired) is distinct from item.repaired_md5 then raise exception 'OPENBRAIN-62b: unexpected repair for %', item.slug; end if;
    update public.widget_uploads set html=repaired, updated_at=now() where slug=item.slug;
  end loop;
end $phone_fit$;
