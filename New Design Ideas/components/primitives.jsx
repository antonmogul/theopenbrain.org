// Open Brain — shared primitives (logo, buttons, diagram chrome, etc)
// Exported to window for cross-script use.

const OBLogo = ({ size = 28, color = 'currentColor' }) => (
  <svg width={size * 1.6} height={size} viewBox="0 0 80 50" fill="none" stroke={color} strokeWidth="1.5">
    {/* Simple book + brain mark */}
    <path d="M8 12 L8 42 L40 42 L72 42 L72 12 L40 14 L8 12 Z" />
    <path d="M40 14 L40 42" />
    <circle cx="24" cy="26" r="6" />
    <circle cx="56" cy="26" r="6" />
    <path d="M30 26 L50 26" />
    <path d="M22 22 Q26 18 28 22" />
    <path d="M54 22 Q58 18 60 22" />
  </svg>
);

const OBWordmark = ({ scale = 1 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 * scale }}>
    <OBLogo size={28 * scale} />
    <div style={{ fontFamily: 'var(--ob-mono)', fontSize: 13 * scale, lineHeight: 1.15, letterSpacing: 0 }}>
      <div>the</div><div>open brain</div><div style={{ color: 'var(--ob-mute)' }}>.org</div>
    </div>
  </div>
);

// Bracketed pill — used for [?] [CLEAR] [EXPORT] etc
const OBBracketBtn = ({ children, active, onClick, dark }) => (
  <button
    onClick={onClick}
    style={{
      fontFamily: 'var(--ob-mono)',
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      padding: '5px 10px',
      borderRadius: 999,
      border: `1px solid ${dark ? 'rgba(243,239,230,0.4)' : 'rgba(10,10,10,0.7)'}`,
      background: active ? (dark ? '#f3efe6' : '#0a0a0a') : 'transparent',
      color: active ? (dark ? '#0a0a0a' : '#f3efe6') : (dark ? '#f3efe6' : '#0a0a0a'),
      cursor: 'pointer',
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </button>
);

// Diagram footer utility row, like the original [?][CLEAR][EXPORT][IMPORT]
const OBDiagramUtilities = ({ dark, items = ['?', 'Clear', 'Export', 'Import'] }) => (
  <div style={{
    position: 'absolute', right: 14, bottom: 12, display: 'flex', gap: 6, zIndex: 2,
  }}>
    {items.map((it, i) => <OBBracketBtn key={i} dark={dark}>{it}</OBBracketBtn>)}
  </div>
);

// Diagram corner badge (top-left dot toggle in the original)
const OBDiagramBadge = ({ dark }) => (
  <div style={{
    position: 'absolute', left: 14, top: 14, width: 16, height: 16,
    borderRadius: 999, border: `1.5px solid ${dark ? '#f3efe6' : '#0a0a0a'}`,
    display: 'grid', placeItems: 'center',
  }}>
    <div style={{ width: 6, height: 6, borderRadius: 999, background: dark ? '#f3efe6' : '#0a0a0a' }} />
  </div>
);

// Number badge for steps / chapters
const OBNumber = ({ n, size = 28, color = 'var(--ob-ink)' }) => (
  <div style={{
    width: size, height: size, borderRadius: 999,
    border: `1px solid ${color}`, color,
    display: 'grid', placeItems: 'center',
    fontFamily: 'var(--ob-mono)', fontSize: size * 0.42, fontWeight: 500,
  }}>{n}</div>
);

// Standard top nav bar for the reader
const OBTopNav = ({ chapter = 'The Retina', section = '02 · Organization and cell types', tools = true, dark = false }) => {
  const fg = dark ? '#f3efe6' : '#0a0a0a';
  const muted = dark ? 'rgba(243,239,230,0.55)' : 'var(--ob-mute)';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '12px 18px',
      borderBottom: `1px solid ${dark ? 'rgba(243,239,230,0.14)' : 'var(--ob-line)'}`,
      background: dark ? 'var(--ob-dark-paper)' : 'var(--ob-paper)',
      color: fg,
      fontFamily: 'var(--ob-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em',
    }}>
      <button style={{ width: 30, height: 30, border: `1px solid ${dark ? 'rgba(243,239,230,0.3)' : 'var(--ob-line)'}`, borderRadius: 6, background: 'transparent', color: fg, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
        <svg width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.4" fill="none"><path d="M2 4h10M2 7h10M2 10h10" /></svg>
      </button>
      <OBLogo size={20} color={fg} />
      <div style={{ width: 1, height: 18, background: dark ? 'rgba(243,239,230,0.2)' : 'var(--ob-line)' }} />
      <div style={{ color: muted }}>Ch 02 / The Retina</div>
      <div style={{ color: fg }}>{section}</div>
      <div style={{ flex: 1 }} />
      {tools && (
        <div style={{ display: 'flex', gap: 6 }}>
          <OBBracketBtn dark={dark}>Info</OBBracketBtn>
          <OBBracketBtn dark={dark}>Notebook</OBBracketBtn>
          <OBBracketBtn dark={dark}>Chat</OBBracketBtn>
          <div style={{ width: 1, background: dark ? 'rgba(243,239,230,0.2)' : 'var(--ob-line)', margin: '0 4px' }} />
          <OBBracketBtn dark={dark}>Quiz</OBBracketBtn>
          <OBBracketBtn dark={dark}>Cards</OBBracketBtn>
        </div>
      )}
      <div style={{ width: 30, height: 30, borderRadius: 999, background: 'var(--ob-teal)', color: 'var(--ob-teal-ink)', display: 'grid', placeItems: 'center', fontFamily: 'var(--ob-mono)', fontSize: 11, fontWeight: 600 }}>JM</div>
    </div>
  );
};

// Minimal bracketed tab (used in panels)
const OBTab = ({ active, children, dark, onClick }) => (
  <button onClick={onClick} style={{
    fontFamily: 'var(--ob-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em',
    padding: '8px 4px', background: 'transparent',
    border: 0, borderBottom: `2px solid ${active ? (dark ? '#f3efe6' : '#0a0a0a') : 'transparent'}`,
    color: active ? (dark ? '#f3efe6' : '#0a0a0a') : (dark ? 'rgba(243,239,230,0.5)' : 'var(--ob-mute)'),
    cursor: 'pointer',
  }}>{children}</button>
);

// Tag chip
const OBChip = ({ children, color = 'var(--ob-ink)', bg = 'transparent' }) => (
  <span style={{
    fontFamily: 'var(--ob-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em',
    padding: '2px 8px', borderRadius: 999,
    border: `1px solid ${color}`, color, background: bg,
    display: 'inline-flex', alignItems: 'center', gap: 5,
  }}>{children}</span>
);

Object.assign(window, { OBLogo, OBWordmark, OBBracketBtn, OBDiagramUtilities, OBDiagramBadge, OBNumber, OBTopNav, OBTab, OBChip });
