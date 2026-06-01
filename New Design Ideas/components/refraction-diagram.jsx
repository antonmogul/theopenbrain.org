// Refraction Errors interactive diagram — desktop + mobile
// Subject image (Matisse placeholder) → light rays → eyeball
// States: Normal, Myopia, Hyperopia, Astigmatism × Corrected toggle.

const REFRACTION_STATES = [
  { id: 'normal',   label: 'Normal',     sub: 'Emmetropia',  hasCorrection: false },
  { id: 'myopia',   label: 'Myopia',     sub: 'Nearsighted', hasCorrection: true,  lens: 'concave' },
  { id: 'hyperopia',label: 'Hyperopia',  sub: 'Farsighted',  hasCorrection: true,  lens: 'convex' },
  { id: 'astigmatism', label: 'Astigmatism', sub: 'Irregular curvature', hasCorrection: true, lens: 'cylindrical' },
];

// ────────────────────────────────────────────────────────────────────
// Matisse placeholder — stylized "La Femme au Chat" (1935) figure
// rendered with blocks of brand colors so it feels like a Matisse cut-out
// without lifting the painting itself.
// ────────────────────────────────────────────────────────────────────
const MatisseSubject = ({ blur = 0, w = 220, h = 280 }) => (
  <div style={{
    width: w, height: h,
    filter: blur ? `blur(${blur}px)` : 'none',
    transition: 'filter 350ms ease',
    position: 'relative',
    flex: 'none',
  }}>
    <svg viewBox="0 0 220 280" width="100%" height="100%" style={{ display: 'block' }}>
      {/* background panels — teal top, pink bottom */}
      <rect x="0" y="0" width="220" height="170" fill="#3DB5A8" />
      <rect x="0" y="170" width="220" height="110" fill="#E8556B" />
      {/* yellow chair back */}
      <rect x="35" y="40" width="150" height="180" fill="#E8C547" />
      {/* head */}
      <ellipse cx="110" cy="78" rx="30" ry="34" fill="#F2D5B0" />
      {/* hair */}
      <path d="M80 70 Q80 42 110 40 Q140 42 140 70 Q140 60 130 56 Q120 50 110 50 Q100 50 90 56 Q80 60 80 70 Z" fill="#1a1a1a" />
      {/* eyes + mouth marks */}
      <circle cx="100" cy="78" r="2" fill="#1a1a1a" />
      <circle cx="120" cy="78" r="2" fill="#1a1a1a" />
      <path d="M104 92 Q110 96 116 92" stroke="#1a1a1a" strokeWidth="1.2" fill="none" />
      {/* neck */}
      <rect x="100" y="108" width="20" height="14" fill="#F2D5B0" />
      {/* white blouse top */}
      <path d="M70 122 L150 122 L160 170 L60 170 Z" fill="#F4EFE5" />
      {/* blue dress */}
      <path d="M60 168 L160 168 L172 268 L48 268 Z" fill="#1E3A6E" />
      {/* black cat in lap */}
      <ellipse cx="110" cy="218" rx="34" ry="22" fill="#0a0a0a" />
      <path d="M86 200 L92 188 L96 202 Z" fill="#0a0a0a" />
      <path d="M134 200 L128 188 L124 202 Z" fill="#0a0a0a" />
      <circle cx="100" cy="216" r="2" fill="#E8C547" />
      <circle cx="120" cy="216" r="2" fill="#E8C547" />
    </svg>
  </div>
);

// ────────────────────────────────────────────────────────────────────
// EyeBall — the right-side circle with rays.
// state determines ray geometry; corrected adds a lens shape in front.
// ────────────────────────────────────────────────────────────────────
const EyeBall = ({ state, corrected, size = 320 }) => {
  // SVG geometry constants — eye is a circle centered at (cx, cy) with radius r.
  // Light enters from the left at two heights (top + bottom rays from the subject).
  const cx = 200, cy = 200, r = 160;
  const entryTop = { x: 0, y: cy - 70 };
  const entryBot = { x: 0, y: cy + 70 };

  // Where rays converge depends on state + correction.
  // Retina line is at the right side of the circle (cx + r).
  const retinaX = cx + r;

  // Focal points along horizontal axis through cy.
  let focalX = retinaX; // normal: at retina
  if (state.id === 'myopia' && !corrected) focalX = cx + 60;          // before retina
  if (state.id === 'myopia' && corrected)  focalX = retinaX;
  if (state.id === 'hyperopia' && !corrected) focalX = retinaX + 80;  // beyond retina (off-eye, virtual)
  if (state.id === 'hyperopia' && corrected)  focalX = retinaX;

  // Astigmatism: multiple focal points → render two pairs of rays
  const astig = state.id === 'astigmatism';

  // entry of rays into the eye — they bend at the cornea (left edge of circle)
  // We approximate by routing the ray from (0, ey) → cornea pt → focal pt.
  const corneaTop = { x: cx - r + 18, y: cy - 90 };
  const corneaBot = { x: cx - r + 18, y: cy + 90 };

  // Lens overlay (when corrected)
  const lensX = cx - r - 38; // sits in front of eye
  const lensH = 180;

  return (
    <svg viewBox="0 0 400 400" width={size} height={size} style={{ display: 'block', flex: 'none' }}>
      {/* incoming horizontal rays from subject (before they reach the eye) */}
      {!astig && (
        <>
          <line x1={entryTop.x} y1={entryTop.y} x2={corneaTop.x} y2={corneaTop.y} stroke="#0a0a0a" strokeWidth="1.4" />
          <line x1={entryBot.x} y1={entryBot.y} x2={corneaBot.x} y2={corneaBot.y} stroke="#0a0a0a" strokeWidth="1.4" />
        </>
      )}
      {astig && (
        <>
          {/* upper bundle */}
          <line x1={entryTop.x} y1={entryTop.y - 18} x2={corneaTop.x} y2={corneaTop.y - 12} stroke="#0a0a0a" strokeWidth="1.2" />
          <line x1={entryTop.x} y1={entryTop.y + 18} x2={corneaTop.x} y2={corneaTop.y + 12} stroke="#0a0a0a" strokeWidth="1.2" />
          {/* lower bundle */}
          <line x1={entryBot.x} y1={entryBot.y - 18} x2={corneaBot.x} y2={corneaBot.y - 12} stroke="#0a0a0a" strokeWidth="1.2" />
          <line x1={entryBot.x} y1={entryBot.y + 18} x2={corneaBot.x} y2={corneaBot.y + 12} stroke="#0a0a0a" strokeWidth="1.2" />
        </>
      )}

      {/* corrective lens (when corrected) */}
      {corrected && state.lens === 'concave' && (
        // biconcave — pinches inward
        <path d={`M ${lensX-10} ${cy - lensH/2} Q ${lensX} ${cy} ${lensX-10} ${cy + lensH/2}
                  L ${lensX+10} ${cy + lensH/2} Q ${lensX} ${cy} ${lensX+10} ${cy - lensH/2} Z`}
              fill="var(--ob-teal)" stroke="var(--ob-ink)" strokeWidth="1" opacity="0.95" />
      )}
      {corrected && state.lens === 'convex' && (
        // biconvex — bulges outward
        <path d={`M ${lensX-14} ${cy - lensH/2} Q ${lensX-30} ${cy} ${lensX-14} ${cy + lensH/2}
                  Q ${lensX} ${cy + lensH/2 - 6} ${lensX+14} ${cy + lensH/2}
                  Q ${lensX+30} ${cy} ${lensX+14} ${cy - lensH/2}
                  Q ${lensX} ${cy - lensH/2 + 6} ${lensX-14} ${cy - lensH/2} Z`}
              fill="var(--ob-teal)" stroke="var(--ob-ink)" strokeWidth="1" opacity="0.95" />
      )}
      {corrected && state.lens === 'cylindrical' && (
        // flat slab w/ subtle taper — cylindrical correction
        <rect x={lensX-8} y={cy - lensH/2} width="16" height={lensH}
              fill="var(--ob-teal)" stroke="var(--ob-ink)" strokeWidth="1" opacity="0.95" rx="2" />
      )}

      {/* eyeball circle */}
      <circle cx={cx} cy={cy} r={r} fill="#ffffff" stroke="#0a0a0a" strokeWidth="1.4" />

      {/* retina marker — vertical dashed line on right side */}
      <line x1={cx + r - 6} y1={cy - r + 30} x2={cx + r - 6} y2={cy + r - 30}
            stroke="var(--ob-teal)" strokeWidth="1.2" strokeDasharray="4 4" />

      {/* refracted rays inside eye → focal point */}
      {!astig && (
        <>
          <line x1={corneaTop.x} y1={corneaTop.y} x2={focalX} y2={cy} stroke="#0a0a0a" strokeWidth="1.4" />
          <line x1={corneaBot.x} y1={corneaBot.y} x2={focalX} y2={cy} stroke="#0a0a0a" strokeWidth="1.4" />

          {/* if focus past retina (hyperopia uncorrected), continue to retina dashed */}
          {state.id === 'hyperopia' && !corrected && (
            <>
              <line x1={cx + r - 6} y1={cy - 36} x2={focalX} y2={cy} stroke="#0a0a0a" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
              <line x1={cx + r - 6} y1={cy + 36} x2={focalX} y2={cy} stroke="#0a0a0a" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
            </>
          )}
          {/* show focal point as a small dot */}
          <circle cx={focalX} cy={cy} r="3.5"
                  fill={state.id === 'normal' || corrected ? 'var(--ob-teal-ink)' : 'var(--ob-magenta)'} />
        </>
      )}

      {astig && !corrected && (
        // Astigmatism — multiple criss-crossing focal lines, no clean point
        <>
          <line x1={corneaTop.x} y1={corneaTop.y - 12} x2={cx + 70}  y2={cy - 12} stroke="#0a0a0a" strokeWidth="1.2" />
          <line x1={corneaTop.x} y1={corneaTop.y + 12} x2={cx + 100} y2={cy + 18} stroke="#0a0a0a" strokeWidth="1.2" />
          <line x1={corneaBot.x} y1={corneaBot.y - 12} x2={cx + 100} y2={cy - 18} stroke="#0a0a0a" strokeWidth="1.2" />
          <line x1={corneaBot.x} y1={corneaBot.y + 12} x2={cx + 70}  y2={cy + 12} stroke="#0a0a0a" strokeWidth="1.2" />
          {/* multiple focal markers */}
          <circle cx={cx + 70}  cy={cy - 12} r="2.5" fill="var(--ob-magenta)" />
          <circle cx={cx + 100} cy={cy + 18} r="2.5" fill="var(--ob-magenta)" />
          <circle cx={cx + 100} cy={cy - 18} r="2.5" fill="var(--ob-magenta)" />
          <circle cx={cx + 70}  cy={cy + 12} r="2.5" fill="var(--ob-magenta)" />
        </>
      )}
      {astig && corrected && (
        <>
          <line x1={corneaTop.x} y1={corneaTop.y} x2={focalX} y2={cy} stroke="#0a0a0a" strokeWidth="1.4" />
          <line x1={corneaBot.x} y1={corneaBot.y} x2={focalX} y2={cy} stroke="#0a0a0a" strokeWidth="1.4" />
          <circle cx={focalX} cy={cy} r="3.5" fill="var(--ob-teal-ink)" />
        </>
      )}
    </svg>
  );
};

// ────────────────────────────────────────────────────────────────────
// Reusable controls — segmented state picker + corrected toggle
// ────────────────────────────────────────────────────────────────────
const StateSegmented = ({ value, onChange, vertical, mobile, compact }) => {
  return (
    <div style={{
      display: vertical ? 'grid' : 'flex',
      gridTemplateColumns: vertical ? '1fr' : undefined,
      gap: mobile ? 6 : 4,
      padding: 4,
      background: 'rgba(10,10,10,0.04)',
      border: '1px solid var(--ob-line)',
      borderRadius: 8,
      width: vertical ? '100%' : 'auto',
    }}>
      {REFRACTION_STATES.map(s => {
        const active = value === s.id;
        return (
          <button
            key={s.id}
            onClick={() => onChange(s.id)}
            style={{
              fontFamily: 'var(--ob-mono)',
              fontSize: 11,
              padding: mobile ? '10px 12px' : '8px 14px',
              border: 0,
              borderRadius: 6,
              background: active ? 'var(--ob-teal)' : 'transparent',
              color: active ? 'var(--ob-teal-ink)' : 'var(--ob-ink)',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'baseline',
              gap: 8,
              whiteSpace: 'nowrap',
              fontWeight: active ? 600 : 500,
              transition: 'background 150ms ease',
            }}>
            <span style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</span>
            {!mobile && !compact && <span style={{ fontSize: 10, color: active ? 'var(--ob-teal-ink)' : 'var(--ob-mute)', opacity: 0.8, textTransform: 'lowercase', letterSpacing: 0 }}>{s.sub}</span>}
          </button>
        );
      })}
    </div>
  );
};

const CorrectedToggle = ({ value, onChange, disabled }) => (
  <div style={{
    display: 'inline-grid',
    gridTemplateColumns: '1fr 1fr',
    padding: 3,
    background: disabled ? 'rgba(10,10,10,0.02)' : 'rgba(10,10,10,0.04)',
    border: '1px solid var(--ob-line)',
    borderRadius: 999,
    opacity: disabled ? 0.4 : 1,
    pointerEvents: disabled ? 'none' : 'auto',
  }}>
    {[
      { v: false, label: 'Uncorrected' },
      { v: true,  label: 'Corrected' },
    ].map(({ v, label }) => {
      const active = value === v;
      return (
        <button key={label} onClick={() => onChange(v)} style={{
          fontFamily: 'var(--ob-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em',
          padding: '7px 16px',
          border: 0,
          borderRadius: 999,
          background: active ? 'var(--ob-ink)' : 'transparent',
          color: active ? 'var(--ob-paper)' : 'var(--ob-ink)',
          cursor: 'pointer',
          fontWeight: active ? 600 : 500,
          transition: 'all 150ms ease',
        }}>{label}</button>
      );
    })}
  </div>
);

// ────────────────────────────────────────────────────────────────────
// Desktop diagram — canvas style matching the rest of the system
// ────────────────────────────────────────────────────────────────────
const RefractionDiagram = () => {
  const [stateId, setStateId] = React.useState('myopia');
  const [corrected, setCorrected] = React.useState(false);
  const state = REFRACTION_STATES.find(s => s.id === stateId);

  const blur =
    state.id === 'normal' ? 0 :
    corrected ? 0 :
    state.id === 'astigmatism' ? 4 :
    state.id === 'myopia' ? 5 :
    state.id === 'hyperopia' ? 4 : 0;

  const caption =
    state.id === 'normal' ? 'Light focuses on the retina.' :
    !corrected && state.id === 'myopia' ? 'Focus falls short of the retina.' :
    !corrected && state.id === 'hyperopia' ? 'Focus would land behind the retina.' :
    !corrected && state.id === 'astigmatism' ? 'Multiple focal points — irregular cornea.' :
    corrected && state.lens === 'concave' ? 'A concave lens diverges light → focus shifts back to retina.' :
    corrected && state.lens === 'convex' ? 'A convex lens converges light → focus shifts forward to retina.' :
    corrected && state.lens === 'cylindrical' ? 'A cylindrical lens compensates for irregular curvature.' : '';

  return (
    <div style={{
      position: 'relative',
      background: '#C9CDC9',
      width: '100%',
      height: '100%',
      minHeight: 580,
      fontFamily: 'var(--ob-sans)',
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* header — title only, no overlapping controls */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 18px',
        position: 'relative', zIndex: 2,
      }}>
        <OBDiagramBadgeInline />
        <div style={{ fontFamily: 'var(--ob-sans)', fontSize: 14, fontWeight: 600, color: 'var(--ob-ink)' }}>
          Refraction errors
        </div>
        <div style={{ flex: 1 }} />
        <div className="ob-mono" style={{ fontSize: 10, color: 'var(--ob-mute)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Fig. 2.4 — Light refraction in the human eye
        </div>
      </div>

      {/* main scene — horizontally arranged, fills the middle */}
      <div style={{
        flex: 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 80 }}>
          <MatisseSubject blur={blur} />
          <EyeBall state={state} corrected={corrected} size={360} />
        </div>

        {/* live caption directly under scene */}
        <div className="ob-mono" style={{
          textAlign: 'center', padding: '0 18px',
          fontSize: 11, color: 'var(--ob-ink)', textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>
          {caption}
        </div>

        {/* controls grouped tightly with diagram, not as page footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24,
          padding: '8px 18px 4px',
          position: 'relative', zIndex: 2,
        }}>
          <StateSegmented value={stateId} onChange={setStateId} compact />
          <CorrectedToggle value={corrected} onChange={setCorrected} disabled={!state.hasCorrection} />
        </div>
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────
// Mobile diagram — same logic, stacked vertically
// ────────────────────────────────────────────────────────────────────
const RefractionDiagramMobile = () => {
  const [stateId, setStateId] = React.useState('myopia');
  const [corrected, setCorrected] = React.useState(false);
  const state = REFRACTION_STATES.find(s => s.id === stateId);

  const blur =
    state.id === 'normal' ? 0 :
    corrected ? 0 :
    state.id === 'astigmatism' ? 4 :
    state.id === 'myopia' ? 5 :
    state.id === 'hyperopia' ? 4 : 0;

  return (
    <div style={{
      position: 'relative',
      background: '#C9CDC9',
      width: '100%',
      height: '100%',
      minHeight: 720,
      fontFamily: 'var(--ob-sans)',
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px 10px' }}>
        <OBDiagramBadgeInline />
        <div style={{ fontSize: 14, fontWeight: 600 }}>Refraction errors</div>
      </div>

      {/* scene — subject above, eye below */}
      <div style={{
        flex: 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 8, padding: '8px 0',
      }}>
        <MatisseSubject blur={blur} w={140} h={180} />
        {/* short rays connector */}
        <svg viewBox="0 0 200 30" width="200" height="30" style={{ display: 'block' }}>
          <line x1="60" y1="2" x2="60" y2="28" stroke="#0a0a0a" strokeWidth="1.2" />
          <line x1="140" y1="2" x2="140" y2="28" stroke="#0a0a0a" strokeWidth="1.2" />
        </svg>
        <EyeBall state={state} corrected={corrected} size={260} />
      </div>

      {/* explanation strip */}
      <div className="ob-mono" style={{
        fontSize: 10, color: 'var(--ob-ink)', padding: '0 16px 10px',
        textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.08em',
      }}>
        {state.id === 'normal' ? 'Light focuses on the retina.' :
         !corrected && state.id === 'myopia' ? 'Focus falls short of the retina.' :
         !corrected && state.id === 'hyperopia' ? 'Focus lands behind the retina.' :
         !corrected && state.id === 'astigmatism' ? 'Multiple focal points.' :
         corrected && state.lens === 'concave' ? 'Concave lens → focus on retina.' :
         corrected && state.lens === 'convex' ? 'Convex lens → focus on retina.' :
         corrected && state.lens === 'cylindrical' ? 'Cylindrical lens corrects curvature.' : ''}
      </div>

      {/* sticky controls at bottom */}
      <div style={{
        borderTop: '1px solid var(--ob-line)',
        background: 'rgba(255,255,255,0.7)',
        padding: '12px 14px 16px',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        {/* horizontal scroll-snap chip rail for state */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {REFRACTION_STATES.map(s => {
            const active = stateId === s.id;
            return (
              <button key={s.id} onClick={() => setStateId(s.id)} style={{
                fontFamily: 'var(--ob-mono)', fontSize: 11,
                padding: '9px 14px',
                border: `1px solid ${active ? 'var(--ob-teal-ink)' : 'var(--ob-line)'}`,
                borderRadius: 999,
                background: active ? 'var(--ob-teal)' : 'var(--ob-paper)',
                color: active ? 'var(--ob-teal-ink)' : 'var(--ob-ink)',
                whiteSpace: 'nowrap',
                fontWeight: active ? 600 : 500,
                textTransform: 'uppercase', letterSpacing: '0.06em',
                cursor: 'pointer', flex: 'none',
              }}>{s.label}</button>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <CorrectedToggle value={corrected} onChange={setCorrected} disabled={!state.hasCorrection} />
        </div>
      </div>
    </div>
  );
};

// inline (non-absolute) version of the badge for mobile header
const OBDiagramBadgeInline = () => (
  <div style={{
    width: 16, height: 16, borderRadius: 999,
    border: '1.5px solid #0a0a0a', display: 'grid', placeItems: 'center',
  }}>
    <div style={{ width: 6, height: 6, borderRadius: 999, background: '#0a0a0a' }} />
  </div>
);

Object.assign(window, { RefractionDiagram, RefractionDiagramMobile });
