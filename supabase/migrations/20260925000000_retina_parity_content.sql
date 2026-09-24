-- Retina parity with theopenbrain.org (v0.2.3): the chapter's content
-- (OPENBRAIN-85). Pushed only with Anton's approval.
--
-- Order: deploy the code PR first (#74: the two new figures' artwork, the
-- ON & OFF widget, the "Excitation" icon), then this, then #75 (synaptic
-- architecture's v0.2.3 drawing, which needs the corrected label). Every
-- change is guarded, so re-running is a no-op and edits made since are
-- kept.
begin;

-- 1. The two figures the live site has and our chapter didn't.
insert into animations
  (animation_key, title, media_type, component_name, interaction_type,
   lottie_file_url, config, scientific_domain, load_priority)
values
  ('animationOnOff', 'ON & OFF bipolar cells', 'lottie',
   'IllustrationSwitch', 'switch', null,
   '{"loop": true, "fullscreen": false}'::jsonb, 'circuits', 'high'),
  ('animationRetinalCircuitsTransition', 'Retinal circuits', 'lottie',
   'IllustrationComp', 'auto_loop',
   '/publicAssets/animations/animationRetinalCircuitsTransition.json',
   '{"loop": false, "fullscreen": false}'::jsonb, 'circuits', 'high')
on conflict (animation_key) do nothing;

-- ON & OFF: the four paragraphs of "Bipolar cells diversify photoreceptor
-- signals" it illustrates on the live site (OFF 'copy', ON 'invert',
-- luminance not patterns, temporal filtering).
update paragraphs
   set animation_id = (select id from animations where animation_key = 'animationOnOff'),
       animation_trigger = 'OnOff'
 where id in ('0388a8fc-d814-4e10-bae2-ce1f45db5acd',
              '3ab539e7-2567-4948-826b-68eb4fb86bb9',
              '62938da4-330a-4782-b82d-b668125596f3',
              '0b0abadc-4e4c-44a8-b1a8-c146e1549324')
   and animation_id is null;

-- Retinal circuits: the circuits section's opening paragraph ("The
-- parcellation of photoreceptor-generated signals…"). It showed Retinal
-- cell types, which four paragraphs of section 2 still show.
update paragraphs
   set animation_id = (select id from animations where animation_key = 'animationRetinalCircuitsTransition'),
       animation_trigger = 'RetinalCircuitsTransition'
 where id = '08333789-23e1-4864-bb75-de07fc3447d4'
   and animation_id = (select id from animations where animation_key = 'animationRetinalCellTypes');

-- 2. "Excitatation" → "Excitation": synaptic architecture's state, and
-- every legend that spells it so.
update animation_states
   set state_description = 'Excitation'
 where state_description = 'Excitatation'
   and animation_id = (select id from animations where animation_key = 'animationSynapticArchitecture');

update animations
   set config = jsonb_set(config, '{legend}', (
         select jsonb_agg(case when e = 'Excitatation' then 'Excitation' else e end order by n)
           from jsonb_array_elements_text(config -> 'legend') with ordinality as t(e, n))),
       updated_at = now()
 where config -> 'legend' ? 'Excitatation';

-- 3. The live legend order; eye structure gains Pupil. order_index and
-- state_label are unique per figure, so rows are parked first (at +1000,
-- clear of the highlight rows some figures keep at 100+).

update animation_states
   set order_index = order_index + 1000, state_label = state_label || ' *'
 where animation_id = (select id from animations where animation_key = 'animationEyeStructur')
   and not is_highlight_state
   and order_index < 1000;
update animation_states s
   set order_index = w.i, state_label = 'Step ' || (w.i + 1)
  from (values ('Cornea', 0), ('Aqueous humour', 1), ('Iris', 2), ('Pupil', 3), ('Lens', 4), ('Ciliary muscle', 5), ('Vitreous humour', 6), ('Retina', 7), ('Fovea', 8), ('Choroid', 9), ('Sclera', 10), ('Optic nerve', 11)) as w(name, i)
 where s.animation_id = (select id from animations where animation_key = 'animationEyeStructur')
   and not s.is_highlight_state
   and s.state_description = w.name;
insert into animation_states (animation_id, state_label, state_description, order_index, is_highlight_state)
select id, 'Step 4', 'Pupil', 3, false from animations
 where animation_key = 'animationEyeStructur'
   and not exists (select 1 from animation_states s where s.animation_id = animations.id and s.state_description = 'Pupil');

update animation_states
   set order_index = order_index + 1000, state_label = state_label || ' *'
 where animation_id = (select id from animations where animation_key = 'animationRetinalCellTypes')
   and not is_highlight_state
   and order_index < 1000;
update animation_states s
   set order_index = w.i, state_label = 'Step ' || (w.i + 1)
  from (values ('Photoreceptors', 0), ('Horizontal cells', 1), ('Bipolar cells', 2), ('Amacrine cells', 3), ('Ganglion cells', 4), ('Outer nuclear layer', 5), ('Outer plexiform layer', 6), ('Inner nuclear layer', 7), ('Inner plexiform layer', 8), ('Ganglion cell layer', 9)) as w(name, i)
 where s.animation_id = (select id from animations where animation_key = 'animationRetinalCellTypes')
   and not s.is_highlight_state
   and s.state_description = w.name;

-- 4. The live site's wording: steps, then introductions.
update animation_states set state_description = $t$Retinal ganglion cell axons project bilaterally to the pretectal olivary nucleus$t$
 where animation_id = (select id from animations where animation_key = 'animationPupillaryLightreflex')
   and order_index = 1 and state_description = $t$Retinal ganglion cells project bilaterally to the pretectal olivary nucleus$t$;
update animation_states set state_description = $t$Postganglionic parasympathetic neurons project ipsilaterally to the iris spinster muscle, resulting in pupil constriction$t$
 where animation_id = (select id from animations where animation_key = 'animationPupillaryLightreflex')
   and order_index = 4 and state_description = $t$Postganglionic parasympathetic neurons project ipsilaterally to the iris spinster muscle$t$;
update animation_states set state_description = $t$Rod is in the dark. Rhodopsin is inactive. The rod membrane is depolarized$t$
 where animation_id = (select id from animations where animation_key = 'animationPhototransduction')
   and order_index = 0 and state_description = $t$Rod is in the dark. Rhodopsin is inactive$t$;
update animation_states set state_description = $t$PDE converts cGMP into GMP, leading to a decrease in intracellular [cGMP]$t$
 where animation_id = (select id from animations where animation_key = 'animationPhototransduction')
   and order_index = 5 and state_description = $t$PDE degrades cGMP into GMP, leading to a decrease in intracellular [cGMP]$t$;
update animation_states set state_description = $t$11-cis retinal binds to IRBP and is shuttled out of the RPE$t$
 where animation_id = (select id from animations where animation_key = 'animationTheVisualCycle')
   and order_index = 4 and state_description = $t$11-cis retinal binds is shuttled out of the RPE$t$;
update animations set config = jsonb_set(config, '{infoText}', to_jsonb($t$In the dark, the photoreceptor outer segment maintains a high concentration of the small molecule cGMP (cyclic guanosine monophosphate), which tonically activates cGMP-gated cationic channels. This results in Na<sup>+</sup> and Ca<sup>2+</sup> inflow in the outer segment, which balances an ongoing efflux of K<sup>+</sup> ions in the inner segment. This ionic flux results in a relatively depolarized resting membrane potential (Vm) of ~-30mV in darkness. Rhodopsin is a G-protein coupled receptor. It becomes enzymatically active following photon absorption and in turn activates the G-protein transducin. Transducin is composed of α, β, and γ subunits, and upon activation, releases its βγ subunit. Its α subunit in turn activates a phosphodiesterase (PDE) that then hydrolyzes cGMP molecules. The resulting decrease in intracellular [cGMP] in the outer segment leads to the closure of cGMP-gated cation channels<sup data-sup='28'>28</sup>. Since the efflux of K<sup>+</sup> ions continues in the inner segment, closing cGMP-gated channels in the outer segment results in photoreceptor membrane hyperpolarization, leading to a decrease in glutamate release. This light-evoked hyperpolarization is called a photovoltage, and its amplitude and duration depend on the luminance, size and duration of the light flash. Finally, an activated rhodopsin molecule needs to be de-activated, otherwise the phototransduction cascade would continue endlessly. Phototransduction terminates when an activated rhodopsin is phosphorylated by a membrane-bound enzyme called rhodopsin kinase. The addition of a phosphate to rhodopsin leads to its binding by a protein called arrestin, which ejects the rhodopsin kinase, and quenches rhodopsin’s ability to activate transducin by breaking the bond between all-trans retinal and opsin<sup data-sup='28'>28,</sup><sup data-sup='29'>29,</sup><sup data-sup='42'>42</sup>.$t$::text)), updated_at = now()
 where animation_key = 'animationPhototransduction' and md5(config ->> 'infoText') = '883b7e5816362521d735be4754518401';
update animations set config = jsonb_set(config, '{infoText}', to_jsonb($t$When rhodopsin absorbs a photon, its light-catching 11-cis retinal chromophore is isomerized into all-trans retinal. This latter form cannot be used for photon absorption, and the retina undertakes a complex series of steps to convert all-trans retinal back to photo-activatable 11-cis retinal. Following binding of arrestin, the bond between all-trans retinal and the opsin is broken. The all-trans aldehyde is released and quickly converted to all-trans retinol by membrane bound retinal dehydrogenase, which is in turn bound by an all-trans retinol binding protein. From here, a transport protein called interphotoreceptor retinoid-binding protein (IRBP) takes all-trans retinol on an inter-cellular journey into the retina pigment epithelium, which intercalates with photoreceptor outer segments. The retina pigment epithelium contains a pair of enzymes&nbsp;&mdash;&nbsp;retinyl-ester isomerase which converts all-trans retinol to 11-cis retinol, and 11-cis retinol dehydrogenase which uses ATP to convert 11-cis retinol back into 11-cis retinal. The regenerated 11-cis retinal is highly insoluble and is quickly bound by an IRBP which encapsulates the molecule, which makes the return trip out of retina pigment epithelium and back into the photoreceptor outer segment, where it is released and binds anew with an opsin<sup data-sup='28'>28,</sup><sup data-sup='41'>41</sup>.$t$::text)), updated_at = now()
 where animation_key = 'animationTheVisualCycle' and md5(config ->> 'infoText') = '2a026dc12bd6b24a0481a56b637013dd';

-- 5. Check: the figures exist and are linked, the labels read right.
do $$
begin
  if (select count(*) from paragraphs p join animations a on a.id = p.animation_id
       where a.animation_key = 'animationOnOff') <> 4 then
    raise exception 'ON & OFF should be on 4 paragraphs';
  end if;
  if not exists (select 1 from paragraphs p join animations a on a.id = p.animation_id
       where a.animation_key = 'animationRetinalCircuitsTransition') then
    raise exception 'Retinal circuits is on no paragraph';
  end if;
  if exists (select 1 from animation_states where state_description = 'Excitatation')
     or exists (select 1 from animations where config -> 'legend' ? 'Excitatation') then
    raise exception 'Excitatation is still spelt so';
  end if;
  if (select count(*) from animation_states s join animations a on a.id = s.animation_id
       where a.animation_key = 'animationEyeStructur' and not s.is_highlight_state) <> 12
     or exists (select 1 from animation_states s join animations a on a.id = s.animation_id
                 where a.animation_key in ('animationEyeStructur', 'animationRetinalCellTypes')
                   and s.order_index >= 1000) then
    raise exception 'eye structure should have 12 states, and none left parked';
  end if;
end
$$;

commit;
