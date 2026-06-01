// Phototransduction step diagram — replaces the original disjointed
// 3-column layout (steps, list, legend) with a single primary stage,
// a unified bottom control strip, and a hide/show legend panel.

const PHOTO_STEPS = [
  { n: 1, short: 'Dark state',           full: 'Rod is in the dark. Rhodopsin is inactive. The rod membrane is depolarized.' },
  { n: 2, short: 'Photon activates rhodopsin', full: 'A flash of light. A photon activates rhodopsin.' },
  { n: 3, short: 'Retinal conformation', full: 'Retinal changes conformation (11-cis → all-trans).' },
  { n: 4, short: 'Transducin activation', full: 'Activated rhodopsin in turn activates transducin.' },
  { n: 5, short: 'PDE activation',       full: 'The α subunit of transducin activates phosphodiesterase (PDE).' },
  { n: 6, short: 'cGMP → GMP',           full: 'PDE converts cGMP into GMP, decreasing intracellular [cGMP].' },
  { n: 7, short: 'Ion channels close',   full: 'cGMP-gated ion channels close.' },
  { n: 8, short: 'Hyperpolarization',    full: 'The rod membrane hyperpolarizes.' },
];

const PHOTO_LEGEND = [
  { id: 'rhodopsin',  label: 'Rhodopsin',     glyph: 'circle-out' },
  { id: 'retinal',    label: 'Retinal',       glyph: 'dot' },
  { id: 'transducin', label: 'Transducin',    glyph: 'flower' },
  { id: 'alpha',      label: 'α subunit',     glyph: 'flower-mono' },
  { id: 'pde',        label: 'Phosphodiesterase (PDE)', glyph: 'square' },
  { id: 'cgmp',       label: 'cGMP',          glyph: 'flower-small' },
  { id: 'gmp',        label: 'GMP',           glyph: 'flower-tiny' },
  { id: 'na',         label: 'Na⁺',           glyph: 'three-dots' },
  { id: 'channel',    label: 'Ion channel',   glyph: 'pill' },
];

const LegendGlyph = ({ glyph, dark }) => {
  const fg = dark ? '#f3efe6' : '#0a0a0a';
  const stroke = dark ? '#f3efe6' : '#0a0a0a';
  if (glyph === 'circle-out') return <svg width="22" height="22" viewBox="-12 -12 24 24"><circle r="9" fill="none" stroke={stroke} strokeWidth="1.4" /><circle r="2" fill={fg} /></svg>;
  if (glyph === 'dot')        return <svg width="22" height="22" viewBox="-12 -12 24 24"><circle r="3" fill={fg} /></svg>;
  if (glyph === 'flower') return (
    <svg width="22" height="22" viewBox="-12 -12 24 24">
      {[0, 60, 120, 180, 240, 300].map(a => <circle key={a} cx={Math.cos(a * Math.PI/180) * 6} cy={Math.sin(a * Math.PI/180) * 6} r="3" fill="#fff" stroke={stroke} strokeWidth="1" />)}
      <circle r="3" fill="#fff" stroke={stroke} strokeWidth="1" />
    </svg>);
  if (glyph === 'flower-mono') return (
    <svg width="22" height="22" viewBox="-12 -12 24 24">
      {[0, 60, 120, 180, 240, 300].map(a => <circle key={a} cx={Math.cos(a * Math.PI/180) * 5} cy={Math.sin(a * Math.PI/180) * 5} r="2.5" fill={fg} />)}
      <circle r="2.5" fill={fg} />
    </svg>);
  if (glyph === 'square')     return <svg width="22" height="22" viewBox="-12 -12 24 24"><rect x="-7" y="-7" width="14" height="14" fill="#fff" stroke={stroke} strokeWidth="1.2" /></svg>;
  if (glyph === 'flower-small') return (
    <svg width="22" height="22" viewBox="-12 -12 24 24">
      {[0, 90, 180, 270].map(a => <circle key={a} cx={Math.cos(a * Math.PI/180) * 4} cy={Math.sin(a * Math.PI/180) * 4} r="2" fill={fg} />)}
      <circle r="2" fill={fg} />
    </svg>);
  if (glyph === 'flower-tiny') return (
    <svg width="22" height="22" viewBox="-12 -12 24 24">
      {[0, 120, 240].map(a => <circle key={a} cx={Math.cos(a * Math.PI/180) * 3} cy={Math.sin(a * Math.PI/180) * 3} r="1.5" fill={fg} />)}
    </svg>);
  if (glyph === 'three-dots') return <svg width="22" height="22" viewBox="-12 -12 24 24"><circle cx="-5" cy="0" r="1.5" fill={fg} /><circle cx="0" cy="0" r="1.5" fill={fg} /><circle cx="5" cy="0" r="1.5" fill={fg} /></svg>;
  if (glyph === 'pill')       return <svg width="22" height="22" viewBox="-12 -12 24 24"><rect x="-9" y="-4" width="18" height="8" rx="4" fill="#fff" stroke={stroke} strokeWidth="1.2" /></svg>;
  return null;
};

// The actual rod-cell scene — molecules animate based on step
const RodScene = ({ step }) => {
  // Schematic rod outer segment (rounded rect chamber) with disk membrane on top.
  // Photon comes in from upper-left at step >= 2.
  return (
    <svg viewBox="0 0 560 380" width="100%" height="100%" style={{ display: 'block' }}>
      {/* photon arrow at top-left (step ≥2) */}
      <g style={{ opacity: step >= 2 ? 1 : 0.15, transition: 'opacity 250ms' }}>
        <path d="M 60 30 L 60 90" stroke="#f3efe6" strokeWidth="1.4" />
        <path d="M 50 80 L 60 90 L 70 80" stroke="#f3efe6" strokeWidth="1.4" fill="none" />
        <path d="M 40 60 Q 60 50 80 60" stroke="#f3efe6" strokeWidth="1.4" fill="none" />
      </g>

      {/* outer segment — large rounded rectangle chamber */}
      <rect x="80" y="120" width="380" height="220" rx="10" fill="rgba(243,239,230,0.18)" stroke="rgba(243,239,230,0.35)" strokeWidth="1.4" />

      {/* top disk membrane — a horizontal stripe near the top with rhodopsins embedded */}
      <rect x="80" y="120" width="380" height="38" fill="rgba(243,239,230,0.08)" stroke="rgba(243,239,230,0.25)" strokeWidth="1" />

      {/* rhodopsin (purple oval embedded in disk) — activated at step ≥2 */}
      <g transform="translate(160 138)">
        <ellipse cx="0" cy="0" rx="14" ry="20" fill={step >= 2 ? '#E91E8C' : '#7a4a8c'} stroke="#0a0a0a" strokeWidth="1" />
        <circle cx="0" cy="-2" r="4" fill="#fff" />
        <circle cx="0" cy="-2" r="1.5" fill={step >= 3 ? '#E91E8C' : '#0a0a0a'} />
      </g>

      {/* transducin (six-petal flowers) near rhodopsin — activated at step ≥4 */}
      {[{x: 220, y: 150}, {x: 250, y: 165}, {x: 290, y: 150}].map((p, i) => (
        <g key={i} transform={`translate(${p.x} ${p.y})`} style={{ opacity: step >= 4 ? 1 : 0.4, transition: 'opacity 250ms' }}>
          {[0, 60, 120, 180, 240, 300].map(a => <circle key={a} cx={Math.cos(a * Math.PI/180) * 6} cy={Math.sin(a * Math.PI/180) * 6} r="3" fill={step >= 4 ? '#3DD9B5' : '#fff'} stroke="#0a0a0a" strokeWidth="1" />)}
          <circle r="3" fill={step >= 4 ? '#3DD9B5' : '#fff'} stroke="#0a0a0a" strokeWidth="1" />
        </g>
      ))}

      {/* PDE squares — activated at step ≥5 */}
      {[{x: 340, y: 145}, {x: 380, y: 155}].map((p, i) => (
        <rect key={i} x={p.x - 8} y={p.y - 8} width="16" height="16"
              fill={step >= 5 ? 'rgba(61,217,181,0.6)' : '#fff'}
              stroke="#0a0a0a" strokeWidth="1.2"
              style={{ transition: 'fill 250ms' }} />
      ))}

      {/* cGMP molecules — diminish at step ≥6 */}
      {[{x: 130, y: 230}, {x: 175, y: 260}, {x: 220, y: 220}, {x: 270, y: 270}, {x: 330, y: 240}].map((p, i) => (
        <g key={i} transform={`translate(${p.x} ${p.y})`} style={{ opacity: step >= 6 ? 0.2 : 1, transition: 'opacity 250ms' }}>
          {[0, 90, 180, 270].map(a => <circle key={a} cx={Math.cos(a * Math.PI/180) * 4} cy={Math.sin(a * Math.PI/180) * 4} r="2" fill="#0a0a0a" />)}
          <circle r="2" fill="#0a0a0a" />
        </g>
      ))}

      {/* GMP — appear at step ≥6 */}
      {step >= 6 && [{x: 150, y: 290}, {x: 230, y: 300}, {x: 310, y: 285}].map((p, i) => (
        <g key={i} transform={`translate(${p.x} ${p.y})`} style={{ opacity: 1, transition: 'opacity 250ms' }}>
          {[0, 120, 240].map(a => <circle key={a} cx={Math.cos(a * Math.PI/180) * 3} cy={Math.sin(a * Math.PI/180) * 3} r="1.5" fill="rgba(243,239,230,0.7)" />)}
        </g>
      ))}

      {/* ion channels along the right edge — close at step ≥7 */}
      {[{y: 200}, {y: 240}, {y: 280}].map((p, i) => (
        <rect key={i} x={448} y={p.y - 5} width="20" height="10" rx="5"
              fill={step >= 7 ? 'rgba(60,60,60,0.4)' : 'rgba(61,217,181,0.7)'}
              stroke="#0a0a0a" strokeWidth="1"
              style={{ transition: 'fill 250ms' }} />
      ))}

      {/* Na+ ions — flowing in (left of channels) until step 7 */}
      {[{x: 440, y: 200}, {x: 440, y: 240}, {x: 440, y: 280}].map((p, i) => (
        <g key={i} style={{ opacity: step >= 7 ? 0.15 : 1, transition: 'opacity 250ms' }}>
          <circle cx={p.x - 6} cy={p.y} r="1.4" fill="#3DD9B5" />
          <circle cx={p.x} cy={p.y} r="1.4" fill="#3DD9B5" />
          <circle cx={p.x + 6} cy={p.y} r="1.4" fill="#3DD9B5" />
        </g>
      ))}

      {/* membrane polarization indicator — bottom strip glow */}
      <rect x="80" y="328" width="380" height="12" rx="2"
            fill={step >= 8 ? 'rgba(233,30,140,0.5)' : 'rgba(61,217,181,0.3)'}
            style={{ transition: 'fill 250ms' }} />
      <text x="270" y="358" fill="rgba(243,239,230,0.55)" fontFamily="var(--ob-mono)" fontSize="9" textAnchor="middle">
        {step >= 8 ? 'HYPERPOLARIZED' : 'DEPOLARIZED'}
      </text>
    </svg>
  );
};

const PhotoTransduction = () => {
  const [step, setStep] = React.useState(2);
  const [showLegend, setShowLegend] = React.useState(false);
  const cur = PHOTO_STEPS[step - 1];

  return (
    <div style={{
      position: 'relative',
      background: '#161c1c',
      color: '#f3efe6',
      width: '100%', height: '100%',
      minHeight: 600,
      fontFamily: 'var(--ob-sans)',
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* header — title left, fig caption + legend toggle right */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 18px',
        borderBottom: '1px solid rgba(243,239,230,0.10)',
      }}>
        <div style={{
          width: 16, height: 16, borderRadius: 999,
          border: '1.5px solid #f3efe6', display: 'grid', placeItems: 'center',
        }}>
          <div style={{ width: 6, height: 6, borderRadius: 999, background: '#f3efe6' }} />
        </div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Phototransduction</div>
        <div style={{ flex: 1 }} />
        <div className="ob-mono" style={{ fontSize: 10, color: 'rgba(243,239,230,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Fig. 3.2 — Rod outer segment cascade
        </div>
        <button onClick={() => setShowLegend(s => !s)} style={{
          fontFamily: 'var(--ob-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em',
          padding: '5px 10px',
          border: `1px solid ${showLegend ? '#f3efe6' : 'rgba(243,239,230,0.4)'}`,
          background: showLegend ? '#f3efe6' : 'transparent',
          color: showLegend ? '#0a0a0a' : '#f3efe6',
          borderRadius: 999, cursor: 'pointer',
          marginLeft: 12,
        }}>
          {showLegend ? '× Legend' : 'Legend'}
        </button>
      </div>

      {/* main stage — diagram dominates; legend slides in from the right */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative' }}>
        {/* diagram */}
        <div style={{
          flex: 1, padding: '24px 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ width: '100%', maxWidth: 600 }}>
            <RodScene step={step} />
          </div>
        </div>

        {/* legend — collapsible */}
        {showLegend && (
          <div style={{
            width: 240, flex: 'none',
            borderLeft: '1px solid rgba(243,239,230,0.10)',
            padding: '20px 22px',
            background: 'rgba(243,239,230,0.03)',
          }}>
            <div className="ob-mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(243,239,230,0.55)', marginBottom: 14 }}>
              Molecules
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {PHOTO_LEGEND.map(it => (
                <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 22, height: 22, display: 'grid', placeItems: 'center' }}>
                    <LegendGlyph glyph={it.glyph} dark />
                  </div>
                  <span className="ob-mono" style={{ fontSize: 11, color: '#f3efe6' }}>{it.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* live caption — current step explained */}
      <div style={{
        padding: '14px 18px',
        borderTop: '1px solid rgba(233,30,140,0.30)',
        background: 'rgba(233,30,140,0.10)',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 999, background: '#E91E8C', color: '#fff',
          display: 'grid', placeItems: 'center', flex: 'none',
          fontFamily: 'var(--ob-mono)', fontSize: 13, fontWeight: 600,
        }}>{step}</div>
        <div style={{ flex: 1 }}>
          <div className="ob-mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(243,239,230,0.55)', marginBottom: 2 }}>
            Step {String(step).padStart(2,'0')} · {cur.short}
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.4 }}>{cur.full}</div>
        </div>
      </div>

      {/* unified bottom strip — step scrubber + nav + utilities */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '12px 18px',
        borderTop: '1px solid rgba(243,239,230,0.10)',
        background: 'rgba(0,0,0,0.20)',
      }}>
        <button
          onClick={() => setStep(s => Math.max(1, s - 1))}
          disabled={step === 1}
          style={{
            fontFamily: 'var(--ob-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em',
            padding: '6px 12px', borderRadius: 999,
            border: '1px solid rgba(243,239,230,0.35)',
            background: 'transparent', color: step === 1 ? 'rgba(243,239,230,0.3)' : '#f3efe6',
            cursor: step === 1 ? 'default' : 'pointer',
          }}>← Prev</button>

        {/* step scrubber — 8 dots */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {PHOTO_STEPS.map(s => (
            <button key={s.n} onClick={() => setStep(s.n)} title={s.short} style={{
              width: 24, height: 24,
              border: 0, padding: 0, background: 'transparent',
              cursor: 'pointer',
              display: 'grid', placeItems: 'center',
            }}>
              <div style={{
                width: s.n === step ? 12 : 8, height: s.n === step ? 12 : 8,
                borderRadius: 999,
                background: s.n === step ? '#E91E8C' : s.n < step ? 'rgba(233,30,140,0.4)' : 'rgba(243,239,230,0.3)',
                transition: 'all 150ms ease',
              }} />
            </button>
          ))}
        </div>

        <span className="ob-mono" style={{ fontSize: 10, color: 'rgba(243,239,230,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {String(step).padStart(2,'0')} / 08
        </span>

        <button
          onClick={() => setStep(s => Math.min(8, s + 1))}
          disabled={step === 8}
          style={{
            fontFamily: 'var(--ob-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em',
            padding: '6px 12px', borderRadius: 999,
            border: '1px solid rgba(243,239,230,0.35)',
            background: step === 8 ? 'transparent' : '#E91E8C',
            color: step === 8 ? 'rgba(243,239,230,0.3)' : '#fff',
            borderColor: step === 8 ? 'rgba(243,239,230,0.35)' : '#E91E8C',
            cursor: step === 8 ? 'default' : 'pointer',
          }}>Next →</button>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', gap: 6 }}>
          {['?', 'Clear', 'Export', 'Import'].map(t => (
            <button key={t} style={{
              fontFamily: 'var(--ob-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em',
              padding: '5px 10px', borderRadius: 999,
              border: '1px solid rgba(243,239,230,0.35)',
              background: 'transparent', color: 'rgba(243,239,230,0.85)', cursor: 'pointer',
            }}>{t}</button>
          ))}
        </div>
      </div>
    </div>
  );
};

// Mobile version — diagram on top, legend in a sheet, step strip at bottom
const PhotoTransductionMobile = () => {
  const [step, setStep] = React.useState(2);
  const [showLegend, setShowLegend] = React.useState(false);
  const cur = PHOTO_STEPS[step - 1];

  return (
    <div style={{
      position: 'relative',
      background: '#161c1c', color: '#f3efe6',
      width: '100%', height: '100%', minHeight: 720,
      fontFamily: 'var(--ob-sans)', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid rgba(243,239,230,0.10)' }}>
        <div style={{ width: 16, height: 16, borderRadius: 999, border: '1.5px solid #f3efe6', display: 'grid', placeItems: 'center' }}>
          <div style={{ width: 6, height: 6, borderRadius: 999, background: '#f3efe6' }} />
        </div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Phototransduction</div>
        <div style={{ flex: 1 }} />
        <button onClick={() => setShowLegend(s => !s)} style={{
          fontFamily: 'var(--ob-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em',
          padding: '5px 10px', borderRadius: 999,
          border: `1px solid ${showLegend ? '#f3efe6' : 'rgba(243,239,230,0.4)'}`,
          background: showLegend ? '#f3efe6' : 'transparent',
          color: showLegend ? '#0a0a0a' : '#f3efe6',
          cursor: 'pointer',
        }}>{showLegend ? '× Legend' : 'Legend'}</button>
      </div>

      {/* diagram */}
      <div style={{ flex: 1, padding: 16, display: 'grid', placeItems: 'center', minHeight: 0 }}>
        <div style={{ width: '100%' }}><RodScene step={step} /></div>
      </div>

      {/* current step caption */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid rgba(233,30,140,0.30)',
        background: 'rgba(233,30,140,0.10)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 999, background: '#E91E8C', color: '#fff',
          display: 'grid', placeItems: 'center', flex: 'none',
          fontFamily: 'var(--ob-mono)', fontSize: 12, fontWeight: 600,
        }}>{step}</div>
        <div style={{ flex: 1, fontSize: 12, lineHeight: 1.35 }}>{cur.full}</div>
      </div>

      {/* bottom strip — chip rail of step shorts + prev/next */}
      <div style={{
        padding: '12px 14px 14px',
        borderTop: '1px solid rgba(243,239,230,0.10)',
        background: 'rgba(0,0,0,0.25)',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {PHOTO_STEPS.map(s => {
            const active = s.n === step;
            return (
              <button key={s.n} onClick={() => setStep(s.n)} style={{
                fontFamily: 'var(--ob-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em',
                padding: '8px 12px', borderRadius: 999,
                border: `1px solid ${active ? '#E91E8C' : 'rgba(243,239,230,0.25)'}`,
                background: active ? '#E91E8C' : 'transparent',
                color: active ? '#fff' : 'rgba(243,239,230,0.8)',
                whiteSpace: 'nowrap', cursor: 'pointer', flex: 'none',
                fontWeight: active ? 600 : 500,
              }}>
                {String(s.n).padStart(2,'0')} · {s.short}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1} style={{
            flex: 1, fontFamily: 'var(--ob-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em',
            padding: '10px 12px', borderRadius: 999,
            border: '1px solid rgba(243,239,230,0.35)', background: 'transparent',
            color: step === 1 ? 'rgba(243,239,230,0.3)' : '#f3efe6',
            cursor: step === 1 ? 'default' : 'pointer',
          }}>← Prev</button>
          <span className="ob-mono" style={{ fontSize: 10, color: 'rgba(243,239,230,0.55)', minWidth: 50, textAlign: 'center' }}>
            {String(step).padStart(2,'0')} / 08
          </span>
          <button onClick={() => setStep(s => Math.min(8, s + 1))} disabled={step === 8} style={{
            flex: 1, fontFamily: 'var(--ob-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em',
            padding: '10px 12px', borderRadius: 999,
            border: '1px solid #E91E8C',
            background: step === 8 ? 'transparent' : '#E91E8C',
            color: step === 8 ? 'rgba(243,239,230,0.3)' : '#fff',
            cursor: step === 8 ? 'default' : 'pointer',
          }}>Next →</button>
        </div>
      </div>

      {/* legend bottom-sheet */}
      {showLegend && (
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          background: '#0e1212', borderTop: '1px solid rgba(243,239,230,0.2)',
          padding: '16px 18px 22px', maxHeight: '70%', overflowY: 'auto',
          boxShadow: '0 -20px 40px rgba(0,0,0,0.5)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
            <div className="ob-mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(243,239,230,0.55)' }}>
              Molecules
            </div>
            <div style={{ flex: 1 }} />
            <button onClick={() => setShowLegend(false)} style={{ background: 'transparent', border: 0, color: '#f3efe6', cursor: 'pointer', fontSize: 16 }}>×</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {PHOTO_LEGEND.map(it => (
              <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 22, height: 22, display: 'grid', placeItems: 'center' }}>
                  <LegendGlyph glyph={it.glyph} dark />
                </div>
                <span className="ob-mono" style={{ fontSize: 11, color: '#f3efe6' }}>{it.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

Object.assign(window, { PhotoTransduction, PhotoTransductionMobile });
