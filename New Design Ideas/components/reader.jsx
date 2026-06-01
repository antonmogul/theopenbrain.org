// Reader, diagrams, panels, quiz, flashcards, nav, mobile

// ─────────────────────────────────────────────────────────────────────────
// Chapter Reader — top nav + full-width content w/ diagram
// ─────────────────────────────────────────────────────────────────────────
const SAMPLE_TEXT = `The retina is comprised of 5 neuronal classes — photoreceptors, horizontal cells, bipolar cells, amacrine cells, and ganglion cells — as well as various glial and vascular cells. Cell bodies of neurons in the vertebrate retina are grouped into 3 distinct layers, separated by 2 synaptic layers. Light passes through the entire retina before being focused on the deepest (i.e. closest to the back of the eye) layer of the retina, where specialized photon detectors called photoreceptors reside.

These neurons contain opsins that absorb photons and transduce their energy into electric signals. Photoreceptors extend nerve terminals into a synaptic layer called the outer plexiform layer where they synapse with bipolar and horizontal cells, whose cell bodies, along with those of amacrine cells, reside in the inner nuclear layer.`;

const RetinalDiagram = ({ active = 'inner-nuclear', dark = true }) => {
  // 5 horizontal "layers" of the retina, with cell columns
  const layers = [
    { id: 'photoreceptors', label: 'Photoreceptors', y: 0, h: 90, type: 'cones' },
    { id: 'outer-nuclear', label: 'Outer nuclear layer', y: 90, h: 38, type: 'circles' },
    { id: 'outer-plexiform', label: 'Outer plexiform layer', y: 128, h: 18, type: 'lines' },
    { id: 'inner-nuclear', label: 'Inner nuclear layer', y: 146, h: 50, type: 'circles' },
    { id: 'inner-plexiform', label: 'Inner plexiform layer', y: 196, h: 18, type: 'lines' },
    { id: 'ganglion', label: 'Ganglion cell layer', y: 214, h: 38, type: 'circles' },
  ];
  const fg = dark ? '#0a0a0a' : '#0a0a0a';
  const cellFill = '#0a0a0a';
  const cols = 6;
  return (
    <svg viewBox="0 0 240 270" width="100%" height="100%" style={{ display: 'block' }}>
      {/* layer backgrounds */}
      {layers.map(l => (
        <rect key={l.id} x="0" y={l.y} width="240" height={l.h} fill={l.id === active ? '#3DD9B5' : 'transparent'} />
      ))}
      {/* photoreceptor cones */}
      {Array.from({ length: cols }).map((_, i) => (
        <polygon key={i} points={`${20 + i*35},5 ${36 + i*35},5 ${30 + i*35},85 ${26 + i*35},85`} fill={cellFill} />
      ))}
      {/* circles for outer nuclear */}
      {Array.from({ length: cols }).map((_, i) => (
        <circle key={'on'+i} cx={28 + i*35} cy={108} r="11" fill={cellFill} />
      ))}
      {/* outer plexiform stub lines */}
      {Array.from({ length: cols }).map((_, i) => (
        <line key={'op'+i} x1={28 + i*35} y1={120} x2={28 + i*35} y2={146} stroke={cellFill} strokeWidth="1.5" />
      ))}
      {/* inner nuclear bigger circles, two staggered rows */}
      {Array.from({ length: cols }).map((_, i) => (
        <React.Fragment key={'in'+i}>
          <circle cx={28 + i*35} cy={158} r="9" fill={cellFill} />
          <circle cx={28 + i*35} cy={186} r="9" fill={cellFill} />
        </React.Fragment>
      ))}
      {/* inner plexiform */}
      {Array.from({ length: cols }).map((_, i) => (
        <line key={'ip'+i} x1={28 + i*35} y1={196} x2={28 + i*35} y2={214} stroke={cellFill} strokeWidth="1.5" />
      ))}
      {/* ganglion */}
      {Array.from({ length: cols }).map((_, i) => (
        <circle key={'g'+i} cx={28 + i*35} cy={232} r="11" fill={cellFill} />
      ))}
      {/* axons */}
      {Array.from({ length: cols }).map((_, i) => (
        <line key={'ax'+i} x1={28 + i*35} y1={244} x2={28 + i*35} y2={268} stroke={cellFill} strokeWidth="1" />
      ))}
    </svg>
  );
};

const ChapterReader = ({ dark = false }) => {
  const ink = dark ? '#f3efe6' : '#0a0a0a';
  const bg = dark ? '#0e1313' : '#f7f5f0';
  const paper = dark ? '#161c1c' : '#ffffff';
  const muted = dark ? 'rgba(243,239,230,0.55)' : 'var(--ob-mute)';

  return (
    <div style={{ background: bg, color: ink, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <OBTopNav dark={dark} />

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 0, flex: 1 }}>
        {/* LEFT: diagram + caption */}
        <div style={{ padding: '40px 40px 40px 56px', borderRight: `1px solid ${dark ? 'rgba(243,239,230,0.1)' : 'var(--ob-line)'}` }}>
          <div style={{ position: 'sticky', top: 24 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
              <div className="ob-eyebrow">Figure 2.1 · Retinal cell types</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <OBBracketBtn dark={dark}>?</OBBracketBtn>
                <OBBracketBtn dark={dark}>Reset</OBBracketBtn>
                <OBBracketBtn dark={dark}>Export</OBBracketBtn>
              </div>
            </div>
            <div style={{ background: '#fff', border: `1px solid ${dark ? 'rgba(243,239,230,0.18)' : 'var(--ob-line-strong)'}`, borderRadius: 8, padding: '32px 24px', minHeight: 380 }}>
              <RetinalDiagram />
            </div>
            {/* Layer legend */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
              {['Photoreceptors','Horizontal','Bipolar','Amacrine','Ganglion'].map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--ob-mono)', fontSize: 11, color: muted }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: ink }} />{c}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: text */}
        <div style={{ padding: '40px 56px 40px 40px', maxWidth: 720 }}>
          <div className="ob-eyebrow" style={{ marginBottom: 12 }}>Section 2.1</div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 8 }}>
            <OBNumber n="2" size={36} color={ink} />
            <h1 className="ob-serif" style={{ fontSize: 36, lineHeight: 1.05, margin: 0, letterSpacing: '-0.01em', flex: 1 }}>
              Organization and cell types in the retina
            </h1>
          </div>
          <p className="ob-serif" style={{ fontStyle: 'italic', fontSize: 17, color: muted, lineHeight: 1.5, marginTop: 18, marginBottom: 28, maxWidth: 580 }}>
            The retina is often described in two anatomically orthogonal manners: cross-sectional ("vertical") and across its planar surface ("lateral"). Here we outline both schemata.
          </p>
          <h3 className="ob-serif" style={{ fontSize: 22, margin: 0, marginBottom: 12 }}>Cross-sectional anatomy</h3>
          <p className="ob-serif" style={{ fontSize: 16, lineHeight: 1.65, margin: 0, color: ink }}>
            {SAMPLE_TEXT.split('photoreceptors').map((part, i, arr) => i < arr.length - 1 ? (
              <React.Fragment key={i}>{part}<mark style={{ background: 'rgba(244,208,63,0.45)', color: 'inherit', padding: '0 2px' }}>photoreceptors</mark></React.Fragment>
            ) : part)}
          </p>

          {/* footnote markers */}
          <div style={{ display: 'flex', gap: 10, marginTop: 32, paddingTop: 16, borderTop: `1px solid ${dark ? 'rgba(243,239,230,0.1)' : 'var(--ob-line)'}` }}>
            <OBChip color={ink}>2 figures</OBChip>
            <OBChip color={ink}>4 references</OBChip>
            <OBChip color="var(--ob-magenta)">3 highlights</OBChip>
          </div>
        </div>
      </div>

      {/* Bottom progress bar */}
      <div style={{ padding: '12px 24px', borderTop: `1px solid ${dark ? 'rgba(243,239,230,0.1)' : 'var(--ob-line)'}`, display: 'flex', alignItems: 'center', gap: 14, fontFamily: 'var(--ob-mono)', fontSize: 11 }}>
        <span style={{ color: muted }}>2.1 / 2.7 · 64% read</span>
        <div style={{ flex: 1, height: 2, background: dark ? 'rgba(243,239,230,0.1)' : 'rgba(0,0,0,0.08)' }}>
          <div style={{ width: '64%', height: '100%', background: 'var(--ob-teal)' }} />
        </div>
        <span style={{ color: muted }}>18 min left</span>
        <OBBracketBtn dark={dark}>← Prev</OBBracketBtn>
        <OBBracketBtn dark={dark} active>Next →</OBBracketBtn>
      </div>
    </div>
  );
};

Object.assign(window, { ChapterReader, RetinalDiagram });
