// Mobile experience for The Open Brain — integrates index, chapter overview,
// reader, embedded figures, inline checkpoint quizzes, and a tools bottom-sheet
// into a single vertical stream.

const M_PAPER = 'var(--ob-paper)';
const M_BG = 'var(--ob-bg)';
const M_INK = 'var(--ob-ink)';
const M_LINE = 'var(--ob-line)';
const M_MUTE = 'var(--ob-mute)';
const M_MAGENTA = 'var(--ob-magenta)';
const M_TEAL = 'var(--ob-teal)';
const M_TEAL_INK = 'var(--ob-teal-ink)';

// ─────────────────────────────────────────────────────────────────
// Mobile app bar — slim, sticky
// ─────────────────────────────────────────────────────────────────
const MAppBar = ({ onMenu, onProgress, title, eyebrow, progress }) => (
  <div style={{
    position: 'sticky', top: 0, zIndex: 50,
    background: M_PAPER, borderBottom: `1px solid ${M_LINE}`,
    padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12,
  }}>
    <button onClick={onMenu} aria-label="Menu" style={{
      width: 36, height: 36, border: `1px solid ${M_LINE}`, borderRadius: 8,
      background: 'transparent', cursor: 'pointer',
      display: 'grid', placeItems: 'center', flex: 'none',
    }}>
      <svg width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.4" fill="none"><path d="M2 4h10M2 7h10M2 10h10" /></svg>
    </button>
    <div style={{ flex: 1, minWidth: 0 }}>
      {eyebrow && <div className="ob-mono" style={{ fontSize: 9, color: M_MUTE, textTransform: 'uppercase', letterSpacing: '0.1em', lineHeight: 1.2 }}>{eyebrow}</div>}
      <div className="ob-serif" style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
    </div>
    {typeof progress === 'number' && (
      <button onClick={onProgress} className="ob-mono" style={{
        fontSize: 10, padding: '6px 10px',
        border: `1px solid ${M_LINE}`, borderRadius: 999,
        background: 'transparent', cursor: 'pointer',
        color: M_INK, flex: 'none',
      }}>{progress}%</button>
    )}
    <div style={{ width: 32, height: 32, borderRadius: 999, background: M_TEAL, color: M_TEAL_INK, display: 'grid', placeItems: 'center', fontFamily: 'var(--ob-mono)', fontSize: 11, fontWeight: 600, flex: 'none' }}>JM</div>
  </div>
);

// ─────────────────────────────────────────────────────────────────
// Mobile index — list view of chapters
// ─────────────────────────────────────────────────────────────────
const MIndexScreen = ({ nav }) => {
  const continueCh = CHAPTERS.find(c => c.status === 'reading');
  const completed = CHAPTERS.filter(c => c.status === 'completed').length;
  return (
    <div style={{ background: M_BG, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ padding: '20px 18px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <OBWordmark scale={0.7} />
        <div style={{ width: 32, height: 32, borderRadius: 999, background: M_TEAL, color: M_TEAL_INK, display: 'grid', placeItems: 'center', fontFamily: 'var(--ob-mono)', fontSize: 11, fontWeight: 600 }}>JM</div>
      </div>

      {/* Hero */}
      <div style={{ padding: '8px 18px 24px' }}>
        <div className="ob-eyebrow" style={{ marginBottom: 12, fontSize: 9 }}>BOOK · 14 CHAPTERS · {completed} DONE</div>
        <h1 className="ob-serif" style={{ fontSize: 44, lineHeight: 0.96, margin: 0, letterSpacing: '-0.02em' }}>The Open<br/>Brain</h1>
        <p className="ob-serif" style={{ fontSize: 15, lineHeight: 1.45, color: M_MUTE, marginTop: 14, marginBottom: 0 }}>
          An openly-published textbook on visual neuroscience and human-computer perception.
        </p>
      </div>

      {/* Continue card */}
      <div style={{ padding: '0 18px 24px' }}>
        <button onClick={() => nav(`/read/${continueCh.n}`)} style={{
          width: '100%', textAlign: 'left',
          background: M_PAPER, border: `1px solid ${M_LINE}`, borderRadius: 6,
          padding: 14, cursor: 'pointer',
          display: 'grid', gridTemplateColumns: '88px 1fr', gap: 14, alignItems: 'center',
        }}>
          <div style={{ aspectRatio: '3/4', overflow: 'hidden' }}>
            <ChapterArt ch={continueCh} h={120} w={88} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="ob-eyebrow" style={{ color: M_MAGENTA, marginBottom: 6, fontSize: 9 }}>● CONTINUE</div>
            <div className="ob-mono" style={{ fontSize: 9, color: M_MUTE, marginBottom: 2 }}>CH {continueCh.n}</div>
            <div className="ob-serif" style={{ fontSize: 18, lineHeight: 1.1, fontWeight: 500, letterSpacing: '-0.005em', marginBottom: 6 }}>{continueCh.title}</div>
            <div style={{ height: 2, background: 'rgba(0,0,0,0.08)' }}>
              <div style={{ width: `${continueCh.progress}%`, height: '100%', background: M_MAGENTA }} />
            </div>
            <div className="ob-mono" style={{ fontSize: 9, color: M_MUTE, marginTop: 4 }}>{continueCh.progress}% · 5 min remaining</div>
          </div>
        </button>
      </div>

      {/* All chapters list */}
      <div style={{ padding: '0 18px 32px' }}>
        <div className="ob-eyebrow" style={{ marginBottom: 14, fontSize: 9 }}>ALL CHAPTERS</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {CHAPTERS.map(ch => (
            <button key={ch.n} onClick={() => nav(`/chapter/${ch.n}`)} style={{
              textAlign: 'left', background: 'transparent', border: 0, borderTop: `1px solid ${M_LINE}`,
              padding: '14px 0', cursor: 'pointer',
              display: 'grid', gridTemplateColumns: '52px 1fr auto', gap: 14, alignItems: 'center',
            }}>
              <div style={{ aspectRatio: '3/4' }}><ChapterArt ch={ch} h={70} w={52} /></div>
              <div style={{ minWidth: 0 }}>
                <div className="ob-mono" style={{ fontSize: 9, color: M_MUTE, marginBottom: 2 }}>CH {ch.n}</div>
                <div className="ob-serif" style={{ fontSize: 16, lineHeight: 1.2, fontWeight: 500 }}>{ch.title}</div>
                {ch.progress > 0 && ch.progress < 100 && (
                  <div style={{ height: 2, background: 'rgba(0,0,0,0.08)', marginTop: 6, width: 100 }}>
                    <div style={{ width: `${ch.progress}%`, height: '100%', background: M_MAGENTA }} />
                  </div>
                )}
              </div>
              <div style={{ flex: 'none' }}>
                {ch.status === 'completed' && <span style={{ color: M_TEAL_INK, fontSize: 14 }}>✓</span>}
                {ch.status === 'reading' && <span className="ob-mono" style={{ fontSize: 9, color: M_MAGENTA, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{ch.progress}%</span>}
                {ch.status === 'unread' && <span className="ob-mono" style={{ fontSize: 9, color: M_MUTE }}>—</span>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Mobile chapter overview — sections, entries
// ─────────────────────────────────────────────────────────────────
const MChapterOverviewScreen = ({ chN, nav, onMenu }) => {
  const ch = CHAPTERS.find(c => c.n === chN) || CHAPTERS[1];
  const sections = CHAPTER_SECTIONS;

  return (
    <div style={{ background: M_BG, minHeight: '100vh' }}>
      <MAppBar onMenu={onMenu} title={`Chapter ${ch.n}`} eyebrow="OVERVIEW" />

      {/* Cover + meta */}
      <div style={{ padding: '20px 18px 24px', textAlign: 'center' }}>
        <div style={{ width: 160, aspectRatio: '3/4', margin: '0 auto 18px' }}>
          <ChapterArt ch={ch} h={213} w={160} />
        </div>
        <div className="ob-eyebrow" style={{ marginBottom: 8, fontSize: 9 }}>CHAPTER {ch.n}</div>
        <h1 className="ob-serif" style={{ fontSize: 28, lineHeight: 1.08, margin: 0, marginBottom: 14, letterSpacing: '-0.01em' }}>{ch.title}</h1>
        <div style={{ height: 3, background: 'rgba(0,0,0,0.08)', marginBottom: 6 }}>
          <div style={{ width: `${ch.progress}%`, height: '100%', background: M_TEAL }} />
        </div>
        <div className="ob-mono" style={{ fontSize: 9, color: M_MUTE, marginBottom: 18 }}>{ch.progress}% complete · 64 min total</div>
        <button onClick={() => nav(`/read/${ch.n}`)} className="ob-btn ob-btn--solid" style={{ width: '100%', padding: '14px' }}>
          {ch.progress > 0 ? 'Continue reading →' : 'Start reading →'}
        </button>
      </div>

      {/* Sections list */}
      <div style={{ padding: '0 18px 24px' }}>
        <div className="ob-eyebrow" style={{ marginBottom: 12, fontSize: 9 }}>SECTIONS</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {sections.map(s => {
            const reading = s.status === 'reading';
            const done = s.status === 'done';
            return (
              <button key={s.n} onClick={() => nav(`/read/${ch.n}?s=${s.n}`)} style={{
                textAlign: 'left', background: 'transparent', border: 0, borderTop: `1px solid ${M_LINE}`,
                padding: '14px 0', cursor: 'pointer',
                display: 'grid', gridTemplateColumns: '36px 1fr auto', gap: 12, alignItems: 'baseline',
              }}>
                <div className="ob-mono" style={{ fontSize: 11, color: M_MUTE }}>{s.n}</div>
                <div>
                  <div className="ob-serif" style={{ fontSize: 16, lineHeight: 1.25, fontWeight: 500 }}>{s.title}</div>
                  <div className="ob-mono" style={{ fontSize: 9, color: M_MUTE, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {s.figures} figs · {s.mins} min
                    {reading && ` · ${s.progress}%`}
                  </div>
                </div>
                <div style={{ flex: 'none' }}>
                  {done && <span style={{ color: M_TEAL_INK }}>✓</span>}
                  {reading && <span className="ob-mono" style={{ fontSize: 9, color: M_MAGENTA }}>●</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ padding: '12px 18px 32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button onClick={() => nav(`/quiz/${ch.n}`)} className="ob-btn">Quiz</button>
        <button onClick={() => nav(`/cards/${ch.n}`)} className="ob-btn">Flashcards</button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Inline figure card — collapsed in stream, taps to expand fullscreen
// ─────────────────────────────────────────────────────────────────
const FigureCard = ({ figId, label, onExpand }) => {
  // Pick a static SVG preview by figure id
  const Thumb = () => {
    if (figId === 'photo') {
      return (
        <div style={{ background: '#161c1c', height: '100%', display: 'grid', placeItems: 'center', position: 'relative', overflow: 'hidden' }}>
          <svg viewBox="0 0 240 100" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="rod" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#3DD9B5" stopOpacity="0.3" />
                <stop offset="1" stopColor="#3DD9B5" stopOpacity="0.05" />
              </linearGradient>
            </defs>
            <rect x="80" y="14" width="80" height="72" rx="36" fill="url(#rod)" stroke="#3DD9B5" strokeWidth="1" opacity="0.7" />
            <circle cx="120" cy="32" r="2" fill="#E91E8C" />
            <circle cx="106" cy="44" r="2" fill="#E91E8C" />
            <circle cx="134" cy="44" r="2" fill="#E91E8C" />
            <circle cx="112" cy="58" r="2" fill="#E91E8C" />
            <circle cx="128" cy="58" r="2" fill="#E91E8C" />
            <line x1="40" y1="50" x2="80" y2="50" stroke="#FFC857" strokeWidth="1" strokeDasharray="2 2" />
            <text x="50" y="44" fontSize="6" fill="#FFC857" fontFamily="var(--ob-mono)">hν</text>
          </svg>
        </div>
      );
    }
    if (figId === 'cone') {
      return (
        <div style={{ background: '#f3efe6', height: '100%', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
          <svg viewBox="0 0 240 100" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
            <line x1="20" y1="80" x2="220" y2="80" stroke="#0a0a0a" strokeWidth="0.6" />
            <line x1="20" y1="20" x2="20" y2="80" stroke="#0a0a0a" strokeWidth="0.6" />
            <path d="M20 80 Q 70 20, 110 80" stroke="#3D6BFF" strokeWidth="1.4" fill="none" />
            <path d="M20 80 Q 110 20, 170 80" stroke="#10A05A" strokeWidth="1.4" fill="none" />
            <path d="M20 80 Q 130 20, 200 80" stroke="#E91E8C" strokeWidth="1.4" fill="none" />
            <text x="60" y="14" fontSize="5" fill="#0a0a0a" fontFamily="var(--ob-mono)">SPECTRAL SENSITIVITY</text>
          </svg>
        </div>
      );
    }
    // refraction
    return (
      <div style={{ background: '#C9CDC9', height: '100%', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
        <svg viewBox="0 0 240 100" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
          <ellipse cx="170" cy="50" rx="38" ry="28" fill="#f3efe6" stroke="#0a0a0a" strokeWidth="1" />
          <circle cx="155" cy="50" r="6" fill="#0a0a0a" />
          <line x1="20" y1="38" x2="135" y2="50" stroke="#E91E8C" strokeWidth="1" />
          <line x1="20" y1="50" x2="135" y2="50" stroke="#E91E8C" strokeWidth="1" />
          <line x1="20" y1="62" x2="135" y2="50" stroke="#E91E8C" strokeWidth="1" />
          <circle cx="190" cy="50" r="2" fill="#E91E8C" />
          <text x="50" y="20" fontSize="5" fill="#0a0a0a" fontFamily="var(--ob-mono)">FOCAL POINT</text>
        </svg>
      </div>
    );
  };

  return (
    <button onClick={onExpand} style={{
      width: '100%', textAlign: 'left', cursor: 'pointer',
      background: M_PAPER, border: `1px solid ${M_LINE}`, borderRadius: 4, padding: 0,
      margin: '24px 0',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${M_LINE}` }}>
        <div className="ob-mono" style={{ fontSize: 9, color: M_MUTE, textTransform: 'uppercase', letterSpacing: '0.12em', flex: 1 }}>{label}</div>
        <div className="ob-mono" style={{ fontSize: 9, color: M_MAGENTA, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Interactive</div>
      </div>
      <div style={{ height: 160, position: 'relative' }}>
        <Thumb />
        <div style={{
          position: 'absolute', right: 10, bottom: 10,
          background: 'rgba(0,0,0,0.85)', color: '#f3efe6',
          fontFamily: 'var(--ob-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em',
          padding: '6px 10px', borderRadius: 999,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 2h2M2 2v2M8 2H6M8 2v2M2 8h2M2 8v-2M8 8H6M8 8v-2" /></svg>
          Tap to explore
        </div>
      </div>
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────
// Fullscreen figure overlay
// ─────────────────────────────────────────────────────────────────
const FigureOverlay = ({ figId, onClose }) => {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!figId) return null;
  const Comp = figId === 'photo' ? PhotoTransductionMobile : figId === 'cone' ? ConeExplorer : RefractionDiagramMobile;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(10,10,10,0.6)',
      opacity: mounted ? 1 : 0,
      transition: 'opacity 240ms ease',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: M_PAPER,
        transform: mounted ? 'translateY(0)' : 'translateY(20px)',
        opacity: mounted ? 1 : 0,
        transition: 'transform 320ms cubic-bezier(0.2, 0.9, 0.3, 1), opacity 240ms ease',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: 12,
          background: M_PAPER, borderBottom: `1px solid ${M_LINE}`,
          flex: 'none',
        }}>
          <button onClick={onClose} aria-label="Close" style={{
            width: 36, height: 36, border: `1px solid ${M_LINE}`, borderRadius: 8,
            background: 'transparent', cursor: 'pointer',
            display: 'grid', placeItems: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.6" fill="none"><path d="M3 3l8 8M11 3l-8 8" /></svg>
          </button>
          <div className="ob-mono" style={{ fontSize: 10, color: M_MUTE, textTransform: 'uppercase', letterSpacing: '0.12em' }}>FIGURE · INTERACTIVE</div>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <Comp />
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Inline checkpoint — single-question quick check after a section
// ─────────────────────────────────────────────────────────────────
const MCheckpoint = ({ question, options, correctIdx, hint }) => {
  const [picked, setPicked] = React.useState(null);
  return (
    <div style={{
      margin: '24px 0',
      padding: '18px 18px 16px',
      background: 'rgba(255, 200, 87, 0.10)',
      border: '1px solid rgba(255, 200, 87, 0.45)',
      borderRadius: 4,
    }}>
      <div className="ob-eyebrow" style={{ marginBottom: 10, fontSize: 9, color: '#866900' }}>● QUICK CHECK</div>
      <div className="ob-serif" style={{ fontSize: 17, lineHeight: 1.3, fontWeight: 500, marginBottom: 14 }}>{question}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {options.map((opt, i) => {
          const isPicked = picked === i;
          const isCorrect = picked != null && i === correctIdx;
          const isWrong = picked != null && isPicked && i !== correctIdx;
          return (
            <button key={i} disabled={picked != null} onClick={() => setPicked(i)} style={{
              textAlign: 'left', padding: '12px 14px',
              border: `1px solid ${isCorrect ? M_TEAL_INK : isWrong ? M_MAGENTA : M_LINE}`,
              background: isCorrect ? 'rgba(61,217,181,0.18)' : isWrong ? 'rgba(233,30,140,0.10)' : M_PAPER,
              borderRadius: 4, cursor: picked != null ? 'default' : 'pointer',
              fontFamily: 'var(--ob-serif)', fontSize: 15, lineHeight: 1.3,
              transition: 'background 200ms, border-color 200ms',
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <span style={{
                width: 18, height: 18, borderRadius: 999,
                border: `1.5px solid ${isCorrect ? M_TEAL_INK : isWrong ? M_MAGENTA : 'rgba(0,0,0,0.25)'}`,
                background: isCorrect ? M_TEAL_INK : isWrong ? M_MAGENTA : 'transparent',
                color: '#fff', display: 'grid', placeItems: 'center',
                fontSize: 10, flex: 'none', marginTop: 2,
              }}>
                {isCorrect ? '✓' : isWrong ? '×' : ''}
              </span>
              <span style={{ flex: 1 }}>{opt}</span>
            </button>
          );
        })}
      </div>
      {picked != null && (
        <div className="ob-serif" style={{
          marginTop: 12, fontSize: 14, lineHeight: 1.45,
          color: picked === correctIdx ? M_TEAL_INK : M_INK,
          fontStyle: 'italic',
        }}>
          {picked === correctIdx ? '✓ Right.' : '× Not quite.'} {hint}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Mobile reader — integrated stream of prose, figures, checkpoints
// ─────────────────────────────────────────────────────────────────
const MReaderScreen = ({ chN, nav, onMenu, onTools, setExpandedFig, setModal }) => {
  const ch = CHAPTERS.find(c => c.n === chN) || CHAPTERS[1];
  const [progress, setProgress] = React.useState(0);
  const scrollRef = React.useRef(null);

  React.useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      if (max > 0) setProgress(Math.min(100, Math.round((el.scrollTop / max) * 100)));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div style={{ background: M_BG, minHeight: '100vh' }}>
      <MAppBar
        onMenu={onMenu}
        title={ch.title}
        eyebrow={`CHAPTER ${ch.n}`}
        progress={progress}
        onProgress={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })}
      />
      {/* progress sliver */}
      <div style={{ position: 'sticky', top: 56, zIndex: 49, height: 2, background: 'rgba(0,0,0,0.05)' }}>
        <div style={{ width: `${progress}%`, height: '100%', background: M_MAGENTA, transition: 'width 80ms linear' }} />
      </div>

      <div ref={scrollRef} style={{ padding: '24px 18px 120px' }}>
        {/* Hero */}
        <div className="ob-eyebrow" style={{ marginBottom: 12, fontSize: 9 }}>CHAPTER {ch.n} · {ch.title.toUpperCase()}</div>
        <h1 className="ob-serif" style={{ fontSize: 36, lineHeight: 1.0, margin: 0, marginBottom: 14, letterSpacing: '-0.018em', fontWeight: 400 }}>The retinal input layer</h1>
        <p className="ob-serif" style={{ fontSize: 17, lineHeight: 1.4, color: M_MUTE, margin: 0, marginBottom: 28, fontStyle: 'italic' }}>
          How the eye delivers signal to the brain — optics, photochemistry, and the first acts of neural computation.
        </p>

        {/* Section 2.3 ── Refraction */}
        <Section
          id="2.3"
          title="How the brain constructs visual perception"
          paras={[
            'The eye is, for all its complexity, an optical instrument with surprisingly few moving parts. Light enters through the cornea, passes through the pupil, and is focused by the lens onto the retina at the back of the eye.',
            'When the optical system fails to focus light precisely on the retina, we call the result a <em>refraction error</em>. The figure below lets you toggle between the three most common variants — <mark>myopia, hyperopia, and astigmatism</mark> — and see how a corrective lens shifts the focal point back onto the retina.',
            'Myopia is the best understood: the eyeball is slightly too long, or the cornea too steeply curved, and parallel rays from distant objects converge in front of the retina rather than upon it. The corrective lens is concave — it diverges incoming rays just enough that the eye\'s own focusing apparatus can land them where they belong.',
            'Astigmatism is structurally different. Rather than the eye being too long or short along its principal axis, the cornea or lens has unequal curvature along different meridians. Light passing through the steeper meridian focuses sooner than light passing through the shallower one, producing not a single blurred point but multiple staggered focal regions.',
          ]}
          fig="refraction"
          figLabel="FIG 2.4 · REFRACTION ERRORS"
          figAfterPara={1}
          onExpand={() => setExpandedFig('refraction')}
          checkpoint={{
            question: 'Myopia means the focal point lands…',
            options: ['Behind the retina', 'On the retina', 'Short of the retina', 'On the cornea'],
            correctIdx: 2,
            hint: 'In myopia the eyeball is too long, so light converges in front of the retina.',
          }}
        />

        {/* Section 2.4 ── Phototransduction */}
        <Section
          id="2.4"
          title="Phototransduction: the photon-to-signal cascade"
          paras={[
            'Once light reaches the retina, photoreceptor cells convert it into electrical signals via a cascade called <strong>phototransduction</strong>. The cascade is one of the most thoroughly characterized signal-transduction pathways in biology, and it is responsible for the extraordinary sensitivity of human vision: a fully dark-adapted rod cell can reliably report the absorption of a single photon.',
            'In the dark, rod cells are unusual: they are tonically depolarized, with cyclic GMP holding sodium channels open in the outer segment membrane. This produces a steady inward "dark current" that keeps the cell at roughly −40 mV.',
            'A photon changes everything. When it strikes a rhodopsin molecule, the chromophore 11-cis-retinal isomerizes to all-trans-retinal in picoseconds, twisting the surrounding opsin into its activated form. This activated rhodopsin catalyzes the exchange of GDP for GTP on transducin, which then dissociates and binds <em>phosphodiesterase</em> (PDE).',
            'PDE rapidly hydrolyzes cGMP to GMP. As cytoplasmic cGMP plummets, the cyclic-nucleotide-gated channels close, the dark current is interrupted, and the cell hyperpolarizes. Glutamate release at the synapse falls — and that fall, paradoxically, <em>is</em> the visual signal carried inward toward the brain.',
          ]}
          fig="photo"
          figLabel="FIG 3.2 · PHOTOTRANSDUCTION"
          figAfterPara={0}
          onExpand={() => setExpandedFig('photo')}
          checkpoint={{
            question: 'Phototransduction begins when a photon activates…',
            options: ['Transducin', 'Rhodopsin', 'PDE', 'Ion channel'],
            correctIdx: 1,
            hint: 'Rhodopsin\'s 11-cis-retinal isomerizes first; transducin and PDE are activated downstream.',
          }}
        />

        {/* Section 2.5 ── Cones */}
        <Section
          id="2.5"
          title="Cone spectral sensitivity and trichromacy"
          paras={[
            'Spectral sensitivity differs between the three cone types — S, M, and L — each defined by the peak wavelength of its photopigment. Their sensitivity curves overlap considerably, and it is precisely this overlap that allows the brain to disambiguate wavelength from intensity.',
            'A monochromatic 580 nm light, for example, excites L and M cones strongly and S cones weakly. A different spectrum that produces the same ratio of L:M:S excitations will look identical — this is the basis of <em>metamerism</em>, and it is why three primary colors are sufficient for full-color reproduction in screens and pigments.',
            'The most common forms of color vision deficiency arise from a missing or shifted cone pigment. Protanopia (no L cones) and deuteranopia (no M cones) collapse the red-green axis and are by far the most prevalent.',
          ]}
          fig="cone"
          figLabel="FIG 2.6 · CONE SENSITIVITY"
          figAfterPara={0}
          onExpand={() => setExpandedFig('cone')}
          checkpoint={{
            question: 'Trichromatic vision uses how many cone types?',
            options: ['Two', 'Three', 'Four', 'One'],
            correctIdx: 1,
            hint: 'S, M, and L cones — short, medium, and long wavelength sensitivities.',
          }}
        />

        {/* End-of-chapter summary card */}
        <div style={{
          marginTop: 32, padding: '22px 18px 18px',
          background: 'rgba(61,217,181,0.12)', border: '1px solid rgba(61,217,181,0.3)', borderRadius: 4,
        }}>
          <div className="ob-eyebrow" style={{ marginBottom: 14, fontSize: 9, color: M_TEAL_INK }}>END OF SECTION · KEY TAKEAWAYS</div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18 }}>
            {[
              'Refraction errors arise when the eye focuses light short of, behind, or unevenly across the retina.',
              'Phototransduction: rhodopsin → transducin → PDE → cGMP hydrolysis → channel closure → hyperpolarization.',
              'Three cone types with overlapping spectral sensitivities allow the brain to disambiguate wavelength from intensity.',
              'Magnocellular and parvocellular pathways carry motion/luminance and detail/color information in parallel.',
            ].map((t, i) => (
              <li key={i} style={{ display: 'grid', gridTemplateColumns: '20px 1fr', gap: 10, alignItems: 'baseline' }}>
                <span className="ob-mono" style={{ fontSize: 10, color: M_TEAL_INK, fontWeight: 600 }}>{String(i + 1).padStart(2, '0')}</span>
                <span className="ob-serif" style={{ fontSize: 15, lineHeight: 1.4 }}>{t}</span>
              </li>
            ))}
          </ul>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0,
            padding: '12px 0', borderTop: '1px solid rgba(61,217,181,0.3)', borderBottom: '1px solid rgba(61,217,181,0.3)',
            marginBottom: 16,
          }}>
            {[
              { v: '3', l: 'Sessions' },
              { v: '24', l: 'Notes' },
              { v: '47m', l: 'Reading time' },
              { v: '4/4', l: 'Sections' },
            ].map((s, i) => (
              <div key={i} style={{
                padding: '8px 12px',
                borderRight: i % 2 === 0 ? '1px solid rgba(61,217,181,0.3)' : 0,
                borderBottom: i < 2 ? '1px solid rgba(61,217,181,0.3)' : 0,
              }}>
                <div className="ob-serif" style={{ fontSize: 22, lineHeight: 1, color: M_TEAL_INK, letterSpacing: '-0.01em', marginBottom: 4 }}>{s.v}</div>
                <div className="ob-mono" style={{ fontSize: 9, color: M_MUTE, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.l}</div>
              </div>
            ))}
          </div>

          <div className="ob-serif" style={{ fontSize: 14, marginBottom: 12, color: M_MUTE, fontStyle: 'italic' }}>Lock it in?</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={() => setModal('quiz')} className="ob-btn ob-btn--teal" style={{ padding: '12px' }}>Take 5-question quiz</button>
            <button onClick={() => setModal('cards')} className="ob-btn" style={{ padding: '12px' }}>Review flashcards</button>
          </div>
        </div>

        {/* Up next */}
        <div className="ob-eyebrow" style={{ margin: '32px 0 10px', fontSize: 9 }}>UP NEXT</div>
        <button onClick={() => nav(`/read/03`)} style={{
          width: '100%', display: 'flex', gap: 14, alignItems: 'center',
          padding: 14, border: `1px solid ${M_LINE}`, borderRadius: 4, background: M_PAPER,
          cursor: 'pointer', textAlign: 'left',
        }}>
          <div style={{ width: 56, aspectRatio: '3/4', flexShrink: 0 }}><ChapterArt ch={CHAPTERS[2]} h={75} w={56} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="ob-mono" style={{ fontSize: 9, color: M_MUTE, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>CHAPTER 03</div>
            <div className="ob-serif" style={{ fontSize: 16, fontWeight: 500, letterSpacing: '-0.005em', lineHeight: 1.15 }}>{CHAPTERS[2].title}</div>
            <div className="ob-mono" style={{ fontSize: 9, color: M_MUTE, marginTop: 4 }}>7 sections · ~52 min</div>
          </div>
          <span className="ob-serif" style={{ fontSize: 22, color: M_MAGENTA, flex: 'none' }}>→</span>
        </button>
      </div>

      {/* Floating tools FAB */}
      <button onClick={onTools} aria-label="Tools" style={{
        position: 'fixed', bottom: 20, right: 16, zIndex: 60,
        width: 56, height: 56, borderRadius: 999,
        background: M_INK, color: M_PAPER, border: 0,
        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
        cursor: 'pointer', display: 'grid', placeItems: 'center',
      }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M3 5h14M3 10h14M3 15h9" />
        </svg>
      </button>
    </div>
  );
};

// One section: heading, paragraphs interleaved with a figure card, then a checkpoint
const Section = ({ id, title, paras, fig, figLabel, figAfterPara, onExpand, checkpoint }) => (
  <section data-screen-label={`Reader ${id}`} style={{ marginBottom: 28 }}>
    <div className="ob-mono" style={{ fontSize: 10, color: M_MUTE, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>§ {id}</div>
    <h2 className="ob-serif" style={{ fontSize: 26, lineHeight: 1.1, margin: 0, marginBottom: 18, letterSpacing: '-0.01em', fontWeight: 500 }}>{title}</h2>
    {paras.map((p, i) => (
      <React.Fragment key={i}>
        <p className="ob-serif" style={{ fontSize: 17, lineHeight: 1.55, margin: '0 0 18px', color: M_INK }}
           dangerouslySetInnerHTML={{ __html: p }} />
        {i === figAfterPara && <FigureCard figId={fig} label={figLabel} onExpand={onExpand} />}
      </React.Fragment>
    ))}
    {checkpoint && <MCheckpoint {...checkpoint} />}
  </section>
);

// ─────────────────────────────────────────────────────────────────
// Mobile bottom sheet — Tools (Info / Notebook / Chat)
// ─────────────────────────────────────────────────────────────────
const MToolsSheet = ({ open, onClose }) => {
  const [tab, setTab] = React.useState('notebook');
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    if (open) requestAnimationFrame(() => setMounted(true));
    else setMounted(false);
  }, [open]);

  if (!open && !mounted) return null;

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: mounted ? 'rgba(10,10,10,0.4)' : 'rgba(10,10,10,0)',
      transition: 'background 240ms ease',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: M_PAPER, borderTopLeftRadius: 14, borderTopRightRadius: 14,
        height: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        transform: mounted ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 320ms cubic-bezier(0.2, 0.9, 0.3, 1)',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
      }}>
        {/* drag handle */}
        <div style={{ padding: '10px 0 6px', display: 'grid', placeItems: 'center', flex: 'none' }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(0,0,0,0.2)' }} />
        </div>
        {/* tab bar */}
        <div style={{ display: 'flex', padding: '4px 14px 12px', gap: 6, borderBottom: `1px solid ${M_LINE}`, flex: 'none' }}>
          {[
            { id: 'info', label: 'Info' },
            { id: 'notebook', label: 'Notebook' },
            { id: 'chat', label: 'Chat' },
          ].map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex: 1, padding: '10px 12px', borderRadius: 8,
                border: 0,
                background: active ? M_INK : 'transparent',
                color: active ? M_PAPER : M_INK,
                fontFamily: 'var(--ob-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em',
                cursor: 'pointer', fontWeight: 600,
              }}>{t.label}</button>
            );
          })}
          <button onClick={onClose} aria-label="Close" style={{
            width: 36, padding: 0, border: `1px solid ${M_LINE}`, borderRadius: 8,
            background: 'transparent', cursor: 'pointer', display: 'grid', placeItems: 'center', flex: 'none',
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.6" fill="none"><path d="M3 3l6 6M9 3l-6 6" /></svg>
          </button>
        </div>
        {/* content */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '0 0 12px' }}>
          <FloatingPanel initialTab={tab} key={tab} />
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Mobile nav drawer
// ─────────────────────────────────────────────────────────────────
const MNavDrawer = ({ open, onClose, nav }) => {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    if (open) requestAnimationFrame(() => setMounted(true));
    else setMounted(false);
  }, [open]);
  if (!open && !mounted) return null;

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: mounted ? 'rgba(10,10,10,0.45)' : 'rgba(10,10,10,0)',
      transition: 'background 240ms ease',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: 'min(85vw, 340px)', background: M_PAPER,
        padding: 18, display: 'flex', flexDirection: 'column', gap: 14,
        transform: mounted ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 320ms cubic-bezier(0.2, 0.9, 0.3, 1)',
        boxShadow: '8px 0 40px rgba(0,0,0,0.18)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <OBWordmark scale={0.7} />
          <button onClick={onClose} aria-label="Close" style={{
            width: 36, height: 36, border: `1px solid ${M_LINE}`, borderRadius: 8,
            background: 'transparent', cursor: 'pointer', display: 'grid', placeItems: 'center',
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.6" fill="none"><path d="M3 3l6 6M9 3l-6 6" /></svg>
          </button>
        </div>

        <button onClick={() => { nav('/'); onClose(); }} className="ob-btn ob-btn--ghost" style={{ justifyContent: 'flex-start', padding: '10px 12px' }}>
          ← All chapters
        </button>

        <div className="ob-eyebrow" style={{ marginTop: 4, fontSize: 9 }}>CONTINUE</div>
        <button onClick={() => { nav('/read/02'); onClose(); }} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: 10,
          border: `1px solid ${M_LINE}`, borderRadius: 6, background: 'transparent',
          cursor: 'pointer', textAlign: 'left',
        }}>
          <div style={{ width: 44, aspectRatio: '3/4' }}><ChapterArt ch={CHAPTERS[1]} h={59} w={44} /></div>
          <div>
            <div className="ob-mono" style={{ fontSize: 9, color: M_MUTE }}>CH 02 · 64%</div>
            <div className="ob-serif" style={{ fontSize: 14, fontWeight: 500 }}>Resume reading</div>
          </div>
        </button>

        <div className="ob-eyebrow" style={{ marginTop: 4, fontSize: 9 }}>JUMP TO</div>
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'auto', flex: 1, gap: 0 }}>
          {CHAPTERS.map(ch => (
            <button key={ch.n} onClick={() => { nav(`/chapter/${ch.n}`); onClose(); }} style={{
              display: 'grid', gridTemplateColumns: '28px 1fr auto', gap: 10,
              padding: '10px 4px', border: 0, background: 'transparent',
              cursor: 'pointer', textAlign: 'left', alignItems: 'baseline',
              borderTop: `1px solid ${M_LINE}`,
            }}>
              <span className="ob-mono" style={{ fontSize: 10, color: M_MUTE }}>{ch.n}</span>
              <span className="ob-serif" style={{ fontSize: 14, lineHeight: 1.2 }}>{ch.title}</span>
              {ch.status === 'completed' && <span style={{ color: M_TEAL_INK, fontSize: 12 }}>✓</span>}
              {ch.status === 'reading' && <span className="ob-mono" style={{ fontSize: 9, color: M_MAGENTA }}>{ch.progress}%</span>}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 10, borderTop: `1px solid ${M_LINE}` }}>
          <div style={{ width: 32, height: 32, borderRadius: 999, background: M_TEAL, color: M_TEAL_INK, display: 'grid', placeItems: 'center', fontFamily: 'var(--ob-mono)', fontSize: 11, fontWeight: 600 }}>JM</div>
          <div>
            <div className="ob-serif" style={{ fontSize: 13 }}>Jen Moran</div>
            <div className="ob-mono" style={{ fontSize: 9, color: M_MUTE }}>jen@studio.org · settings</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Top-level mobile app — owns its own modal/sheet/figure state
// ─────────────────────────────────────────────────────────────────
const MobileApp = ({ route, nav, setModal, ReviewModal, modal }) => {
  const [navOpen, setNavOpen] = React.useState(false);
  const [toolsOpen, setToolsOpen] = React.useState(false);
  const [expandedFig, setExpandedFig] = React.useState(null);

  const [, screen, arg] = route.split('/');
  const chN = (arg || '').split('?')[0];

  // Embedded quiz/cards screens use the existing screens (already responsive enough)
  return (
    <div className="proto-shell">
      {(!screen || screen === '') && <MIndexScreen nav={nav} />}
      {screen === 'chapter' && <MChapterOverviewScreen chN={chN} nav={nav} onMenu={() => setNavOpen(true)} />}
      {screen === 'read' && <MReaderScreen
        chN={chN}
        nav={nav}
        onMenu={() => setNavOpen(true)}
        onTools={() => setToolsOpen(true)}
        setExpandedFig={setExpandedFig}
        setModal={setModal}
      />}
      {screen === 'quiz' && <QuizScreen chN={chN} nav={nav} />}
      {screen === 'cards' && <FlashcardScreen chN={chN} nav={nav} />}

      {expandedFig && <FigureOverlay figId={expandedFig} onClose={() => setExpandedFig(null)} />}
      <MToolsSheet open={toolsOpen} onClose={() => setToolsOpen(false)} />
      <MNavDrawer open={navOpen} onClose={() => setNavOpen(false)} nav={nav} />
      <ReviewModal kind={modal} onClose={() => setModal(null)} chN={chN || '02'} />
    </div>
  );
};

Object.assign(window, { MobileApp });
