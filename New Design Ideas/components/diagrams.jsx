// ─────────────────────────────────────────────────────────────────────────
// Step-by-step diagram (the magenta one) — fixed layout
// Original problem: legend, steps list, and current-step header are scattered.
// Fix: unify into one frame with steps as a horizontal stepper at top,
// diagram center, legend as overlay chips on the diagram itself.
// ─────────────────────────────────────────────────────────────────────────

const PUPIL_STEPS = [
  { n: 1, title: 'Light shines into an eye, activating the retina', short: 'Light hits retina' },
  { n: 2, title: 'Retinal ganglion cell axons project bilaterally to the pretectal olivary nucleus', short: 'Bilateral RGC projection' },
  { n: 3, title: 'Each pretectal nucleus projects bilaterally to the Edinger-Westphal Nucleus', short: 'To Edinger-Westphal' },
  { n: 4, title: 'The Edinger-Westphal nucleus projects ipsilaterally to the ciliary ganglion', short: 'To ciliary ganglion' },
  { n: 5, title: 'Postganglionic neurons project to the iris sphincter, constricting the pupil', short: 'Pupil constricts' },
];

const PupilDiagram = ({ step }) => {
  // schematic head with two eyes, optic chiasm, brain ovals
  const showFromStep = (s) => step >= s;
  const M = '#E91E8C';
  return (
    <svg viewBox="0 0 380 360" width="100%" height="100%" style={{ display: 'block' }}>
      {/* Head outline (large oval) */}
      <ellipse cx="190" cy="160" rx="120" ry="115" fill="none" stroke="#9aa0a0" strokeWidth="20" />
      {/* Pretectal nuclei (top stars) */}
      <Star cx="155" cy="105" r="11" fill={step === 2 ? M : '#fff'} stroke="#fff" />
      <Star cx="225" cy="105" r="11" fill="#fff" />
      {/* Edinger-Westphal (teal) */}
      <circle cx="170" cy="155" r="14" fill="#3DD9B5" opacity={showFromStep(3) ? 1 : 0.35} />
      <circle cx="210" cy="155" r="14" fill="#3DD9B5" opacity={showFromStep(3) ? 1 : 0.35} />
      {/* Ciliary ganglia (lower stars on sides) */}
      <Star cx="100" cy="220" r="10" fill="#fff" />
      <Star cx="280" cy="220" r="10" fill="#fff" />
      {/* Eyes (bottom circles) */}
      <circle cx="135" cy="295" r="32" fill="#fff" stroke="#0a0a0a" strokeWidth="1.5" />
      <circle cx="245" cy="295" r="32" fill="#fff" stroke="#0a0a0a" strokeWidth="1.5" />
      {/* Pupils */}
      <ellipse cx="135" cy="305" rx="9" ry={step >= 5 ? 5 : 11} fill="#0a0a0a" />
      <ellipse cx="245" cy="305" rx="9" ry={step >= 5 ? 5 : 11} fill="#0a0a0a" />
      {/* Light beam into right eye */}
      {step >= 1 && <polygon points="245,335 232,360 258,360" fill="#F4D03F" />}
      {/* Pathway: from right eye → optic chiasm → both pretectal */}
      {step >= 2 && (
        <>
          <path d="M 245 280 Q 245 230, 200 200 Q 175 180, 155 115" fill="none" stroke={M} strokeWidth="2" />
          <path d="M 245 280 Q 245 220, 200 200 Q 220 175, 225 115" fill="none" stroke={M} strokeWidth="2" />
        </>
      )}
      {/* Pretectal → EW (both sides) */}
      {step >= 3 && (
        <>
          <path d="M 155 110 Q 165 130, 170 145" fill="none" stroke={M} strokeWidth="2" />
          <path d="M 155 110 Q 180 135, 210 150" fill="none" stroke={M} strokeWidth="2" />
          <path d="M 225 110 Q 215 130, 210 145" fill="none" stroke={M} strokeWidth="2" />
          <path d="M 225 110 Q 200 135, 170 150" fill="none" stroke={M} strokeWidth="2" />
        </>
      )}
      {/* EW → ciliary */}
      {step >= 4 && (
        <>
          <path d="M 170 165 Q 130 195, 100 215" fill="none" stroke={M} strokeWidth="2" />
          <path d="M 210 165 Q 250 195, 280 215" fill="none" stroke={M} strokeWidth="2" />
        </>
      )}
      {/* ciliary → iris */}
      {step >= 5 && (
        <>
          <path d="M 100 230 Q 115 270, 130 280" fill="none" stroke={M} strokeWidth="2" />
          <path d="M 280 230 Q 265 270, 250 280" fill="none" stroke={M} strokeWidth="2" />
        </>
      )}
    </svg>
  );
};

const Star = ({ cx, cy, r, fill, stroke = '#0a0a0a' }) => {
  const points = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.55;
    points.push(`${cx + Math.cos(a) * rr},${cy + Math.sin(a) * rr}`);
  }
  return <polygon points={points.join(' ')} fill={fill} stroke={stroke} strokeWidth="1" />;
};

const StepDiagram = () => {
  const [step, setStep] = React.useState(2);
  const cur = PUPIL_STEPS[step - 1];
  return (
    <div style={{ background: '#161c1c', color: '#f3efe6', borderRadius: 8, padding: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 22px', borderBottom: '1px solid rgba(243,239,230,0.12)' }}>
        <OBDiagramBadgeLight />
        <div className="ob-eyebrow" style={{ color: 'rgba(243,239,230,0.55)' }}>Figure 2.4 · Interactive</div>
        <div style={{ flex: 1 }} />
        <div className="ob-mono" style={{ fontSize: 12 }}>Pathway for the pupillary light reflex</div>
      </div>

      {/* horizontal stepper — clearly shows progression */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, padding: '14px 22px', borderBottom: '1px solid rgba(243,239,230,0.12)' }}>
        {PUPIL_STEPS.map((s, i) => {
          const active = s.n === step;
          const past = s.n < step;
          return (
            <button key={s.n} onClick={() => setStep(s.n)} style={{
              flex: 1, textAlign: 'left', background: 'transparent', border: 0, padding: '8px 6px',
              cursor: 'pointer',
              borderTop: `2px solid ${active ? '#E91E8C' : past ? 'rgba(233,30,140,0.3)' : 'rgba(243,239,230,0.15)'}`,
              color: active ? '#E91E8C' : past ? 'rgba(243,239,230,0.7)' : 'rgba(243,239,230,0.4)',
              transition: 'all .15s',
            }}>
              <div className="ob-mono" style={{ fontSize: 10, marginBottom: 4 }}>STEP {String(s.n).padStart(2, '0')}</div>
              <div className="ob-mono" style={{ fontSize: 11, lineHeight: 1.3 }}>{s.short}</div>
            </button>
          );
        })}
      </div>

      {/* current-step description */}
      <div style={{ padding: '16px 22px', background: 'rgba(233,30,140,0.12)', borderBottom: '1px solid rgba(233,30,140,0.3)', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 999, background: '#E91E8C', color: '#fff', display: 'grid', placeItems: 'center', fontFamily: 'var(--ob-mono)', fontWeight: 600 }}>{step}</div>
        <div className="ob-mono" style={{ fontSize: 13, lineHeight: 1.4, flex: 1 }}>{cur.title}</div>
        <button onClick={() => setStep(s => Math.min(5, s + 1))} style={{ width: 32, height: 32, borderRadius: 999, border: '1px solid #E91E8C', background: 'transparent', color: '#E91E8C', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 7h8m-3-3 3 3-3 3" /></svg>
        </button>
      </div>

      {/* diagram + side legend */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 200px', minHeight: 0 }}>
        <div style={{ padding: 24, display: 'grid', placeItems: 'center', position: 'relative' }}>
          <div style={{ width: '100%', maxWidth: 420, aspectRatio: '380/360' }}>
            <PupilDiagram step={step} />
          </div>
        </div>
        <div style={{ padding: '20px 22px', borderLeft: '1px solid rgba(243,239,230,0.12)' }}>
          <div className="ob-eyebrow" style={{ color: 'rgba(243,239,230,0.55)', marginBottom: 14 }}>Structures</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'Pretectal nucleus', shape: 'star', fill: '#fff' },
              { label: 'Edinger-Westphal', shape: 'circle', fill: '#3DD9B5', highlight: step >= 3 },
              { label: 'Ciliary ganglion', shape: 'star', fill: '#fff' },
              { label: 'Pupil', shape: 'pupil', fill: '#0a0a0a' },
            ].map((it, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: it.highlight === false ? 0.5 : 1 }}>
                <svg width="20" height="20" viewBox="-12 -12 24 24">
                  {it.shape === 'star' && <Star cx={0} cy={0} r={9} fill={it.fill} stroke="#f3efe6" />}
                  {it.shape === 'circle' && <circle cx={0} cy={0} r={9} fill={it.fill} />}
                  {it.shape === 'pupil' && <><circle cx={0} cy={0} r={9} fill="#fff" stroke="#f3efe6" /><circle cx={0} cy={0} r={3} fill="#0a0a0a" /></>}
                </svg>
                <span className="ob-mono" style={{ fontSize: 11, color: it.highlight ? '#E91E8C' : '#f3efe6' }}>{it.label}</span>
              </div>
            ))}
          </div>
          <hr style={{ border: 0, borderTop: '1px solid rgba(243,239,230,0.12)', margin: '20px 0' }} />
          <div className="ob-eyebrow" style={{ color: 'rgba(243,239,230,0.55)', marginBottom: 10 }}>Path</div>
          <div className="ob-mono" style={{ fontSize: 10, lineHeight: 1.6, color: 'rgba(243,239,230,0.7)' }}>
            Retina<br/>→ Pretectal nuc.<br/>→ Edinger-Westphal<br/>→ Ciliary ganglion<br/>→ Iris sphincter
          </div>
        </div>
      </div>

      {/* footer utilities */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 22px', borderTop: '1px solid rgba(243,239,230,0.12)' }}>
        <button onClick={() => setStep(s => Math.max(1, s - 1))} style={{ background: 'transparent', border: '1px solid rgba(243,239,230,0.3)', borderRadius: 999, color: '#f3efe6', padding: '5px 12px', fontFamily: 'var(--ob-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer' }}>← Prev step</button>
        <span className="ob-mono" style={{ fontSize: 10, color: 'rgba(243,239,230,0.5)' }}>{step} / 5</span>
        <button onClick={() => setStep(s => Math.min(5, s + 1))} style={{ background: 'transparent', border: '1px solid rgba(243,239,230,0.3)', borderRadius: 999, color: '#f3efe6', padding: '5px 12px', fontFamily: 'var(--ob-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer' }}>Next step →</button>
        <div style={{ flex: 1 }} />
        <button style={{ background: 'transparent', border: '1px solid rgba(243,239,230,0.3)', borderRadius: 999, color: 'rgba(243,239,230,0.7)', padding: '5px 10px', fontFamily: 'var(--ob-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer' }}>?</button>
        <button style={{ background: 'transparent', border: '1px solid rgba(243,239,230,0.3)', borderRadius: 999, color: 'rgba(243,239,230,0.7)', padding: '5px 10px', fontFamily: 'var(--ob-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer' }}>Export</button>
      </div>
    </div>
  );
};

const OBDiagramBadgeLight = () => (
  <div style={{ width: 14, height: 14, borderRadius: 999, border: '1.5px solid #f3efe6', display: 'grid', placeItems: 'center' }}>
    <div style={{ width: 5, height: 5, borderRadius: 999, background: '#f3efe6' }} />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────
// Cone Spectral Sensitivity Explorer — redone in Swiss language
// ─────────────────────────────────────────────────────────────────────────
const ConeExplorer = () => {
  const [preset, setPreset] = React.useState('Normal');
  const presets = ['Normal', 'Protanopia', 'Deuteranopia', 'Tritanopia', 'Rod Mono'];
  // gaussian curves for S/M/L/Rod
  const cones = [
    { name: 'S', color: '#3D7DD9', peak: 420, height: 1.0 },
    { name: 'M', color: '#3DD9B5', peak: 534, height: 1.0 },
    { name: 'L', color: '#E91E8C', peak: 564, height: 1.0 },
    { name: 'Rod', color: '#9b9b95', peak: 498, height: 0.5, dashed: true },
  ];
  const W = 700, H = 220, padL = 36, padR = 24, padT = 12, padB = 28;
  const xMin = 380, xMax = 720;
  const xS = (nm) => padL + ((nm - xMin) / (xMax - xMin)) * (W - padL - padR);
  const yS = (v) => padT + (1 - v) * (H - padT - padB);
  const gauss = (x, peak, h, sigma = 50) => h * Math.exp(-((x - peak) ** 2) / (2 * sigma * sigma));
  const points = (c) => {
    const pts = [];
    for (let nm = xMin; nm <= xMax; nm += 4) pts.push(`${xS(nm)},${yS(gauss(nm, c.peak, c.height))}`);
    return pts.join(' ');
  };

  return (
    <div className="ob-diagram" style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderBottom: '1px solid var(--ob-line)' }}>
        <OBDiagramBadge />
        <div className="ob-eyebrow">Figure 2.6 · Interactive</div>
        <div style={{ flex: 1 }} />
        <div className="ob-mono" style={{ fontSize: 12 }}>Cone spectral sensitivity</div>
      </div>

      {/* Presets row */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--ob-line)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="ob-eyebrow">Presets</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {presets.map(p => <OBBracketBtn key={p} active={preset === p} onClick={() => setPreset(p)}>{p}</OBBracketBtn>)}
        </div>
      </div>

      {/* Chart */}
      <div style={{ padding: 18, flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
          {/* axes */}
          <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="#0a0a0a" strokeWidth="1" />
          <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="#0a0a0a" strokeWidth="1" />
          {/* x ticks */}
          {[400, 500, 600, 700].map(t => (
            <g key={t}>
              <line x1={xS(t)} y1={H - padB} x2={xS(t)} y2={H - padB + 4} stroke="#0a0a0a" />
              <text x={xS(t)} y={H - padB + 16} fontSize="10" fontFamily="var(--ob-mono)" textAnchor="middle" fill="var(--ob-mute)">{t}</text>
            </g>
          ))}
          {/* y ticks */}
          {[0, 0.5, 1].map(v => (
            <g key={v}>
              <line x1={padL - 4} y1={yS(v)} x2={padL} y2={yS(v)} stroke="#0a0a0a" />
              <text x={padL - 8} y={yS(v) + 3} fontSize="10" fontFamily="var(--ob-mono)" textAnchor="end" fill="var(--ob-mute)">{v.toFixed(1)}</text>
            </g>
          ))}
          {/* curves filled */}
          {cones.map(c => (
            <g key={c.name}>
              <polygon points={`${padL},${yS(0)} ${points(c)} ${W - padR},${yS(0)}`} fill={c.color} fillOpacity="0.12" />
              <polyline points={points(c)} fill="none" stroke={c.color} strokeWidth="1.6" strokeDasharray={c.dashed ? '4 3' : 'none'} />
            </g>
          ))}
          {/* axis labels */}
          <text x={W / 2} y={H - 4} fontSize="10" fontFamily="var(--ob-mono)" textAnchor="middle" fill="var(--ob-mute)">WAVELENGTH (nm)</text>
        </svg>

        {/* Spectrum bar */}
        <div style={{ position: 'relative', height: 22, borderRadius: 2, background: 'linear-gradient(to right, #2a0066 0%, #0033cc 12%, #00aaee 25%, #00cc44 40%, #ffee00 55%, #ff8800 70%, #cc0000 85%, #660000 100%)' }}>
          {[400, 500, 600, 700].map(t => (
            <div key={t} style={{ position: 'absolute', left: `${((t - xMin) / (xMax - xMin)) * 100}%`, top: '100%', transform: 'translateX(-50%)', fontFamily: 'var(--ob-mono)', fontSize: 9, color: 'var(--ob-mute)', marginTop: 2 }}>{t}</div>
          ))}
        </div>

        {/* Sliders — uniform layout */}
        <div style={{ display: 'grid', gap: 6, marginTop: 14 }}>
          {cones.map(c => (
            <div key={c.name} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 50px', alignItems: 'center', gap: 14, padding: '6px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: 999, background: c.color }} />
                <span className="ob-mono" style={{ fontSize: 11 }}>{c.name}</span>
              </div>
              <div style={{ position: 'relative', height: 4, background: 'rgba(0,0,0,0.08)', borderRadius: 999 }}>
                <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${((c.peak - 380) / 340) * 100}%`, background: c.color, borderRadius: 999 }} />
                <div style={{ position: 'absolute', left: `${((c.peak - 380) / 340) * 100}%`, top: '50%', transform: 'translate(-50%, -50%)', width: 12, height: 12, borderRadius: 999, background: c.color, border: '2px solid #fff', boxShadow: '0 0 0 1px rgba(0,0,0,0.2)' }} />
              </div>
              <div className="ob-mono" style={{ fontSize: 11, textAlign: 'right', color: 'var(--ob-mute)' }}>{c.peak}nm</div>
            </div>
          ))}
        </div>

        {/* Helper note */}
        <div style={{ marginTop: 8, padding: '10px 14px', background: 'rgba(61,217,181,0.1)', border: '1px solid rgba(61,217,181,0.3)', borderRadius: 4, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ width: 14, height: 14, borderRadius: 999, background: 'var(--ob-teal)', color: 'var(--ob-teal-ink)', display: 'grid', placeItems: 'center', fontFamily: 'var(--ob-mono)', fontSize: 9, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>i</div>
          <div className="ob-serif" style={{ fontSize: 13, lineHeight: 1.5 }}>
            <em>{preset}</em> trichromatic vision uses three cone types (S, M, L) to distinguish millions of colors across the visible spectrum.
          </div>
        </div>
      </div>

      <OBDiagramUtilities />
    </div>
  );
};

Object.assign(window, { StepDiagram, ConeExplorer, PupilDiagram });
