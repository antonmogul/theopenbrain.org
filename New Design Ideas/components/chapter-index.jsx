// Chapter Index — 3 variations
// Uses placeholder Matisse-like color blocks (we don't have the actual paintings)

const CHAPTERS = [
  { n: '01', title: 'The Retina', subtitle: 'Structure, photoreceptors & neural circuits', color: '#1A4D6B', accent: '#E8556B', progress: 100, status: 'completed' },
  { n: '02', title: 'Visual Perception & UX', subtitle: 'How we process visual information', color: '#8B5A3C', accent: '#F4D03F', progress: 64, status: 'reading' },
  { n: '03', title: 'The Auditory System', subtitle: 'Sound, cochlea & cortical processing', color: '#2C5F4E', accent: '#3DD9B5', progress: 0 },
  { n: '04', title: 'Somatosensation', subtitle: 'Touch, pain, proprioception', color: '#6B3838', accent: '#F8B8D8', progress: 0 },
  { n: '05', title: 'Olfaction & Taste', subtitle: 'Chemosensory pathways', color: '#A6804A', accent: '#E91E8C', progress: 0 },
  { n: '06', title: 'Motor Systems', subtitle: 'From cortex to muscle', color: '#3A4A6B', accent: '#3DD9B5', progress: 0 },
  { n: '07', title: 'Learning & Memory', subtitle: 'Hippocampus, plasticity, consolidation', color: '#5C2C4A', accent: '#F4D03F', progress: 0 },
  { n: '08', title: 'Attention', subtitle: 'Selection, salience, cognitive control', color: '#1F3A4D', accent: '#E91E8C', progress: 0 },
  { n: '09', title: 'Emotion & the Limbic System', subtitle: 'Amygdala, reward, fear', color: '#7B3C2E', accent: '#3DD9B5', progress: 0 },
  { n: '10', title: 'Sleep & Circadian Rhythms', subtitle: 'Suprachiasmatic nucleus, sleep stages', color: '#2A2D5C', accent: '#B8D8F8', progress: 0 },
  { n: '11', title: 'Language', subtitle: "Broca, Wernicke & beyond", color: '#4A6B3A', accent: '#F4D03F', progress: 0 },
  { n: '12', title: 'Decision Making', subtitle: 'Prefrontal cortex & basal ganglia', color: '#6B4A8B', accent: '#3DD9B5', progress: 0 },
  { n: '13', title: 'Development', subtitle: 'From neural tube to circuits', color: '#A6655F', accent: '#F8B8D8', progress: 0 },
  { n: '14', title: 'Neurological Disease', subtitle: 'Parkinson, Alzheimer, stroke', color: '#1f1f1f', accent: '#E91E8C', progress: 0 },
];

// Painted-card "cover" (placeholder). Stylized abstraction.
const ChapterArt = ({ ch, h = 360, w = 240 }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" style={{ display: 'block' }}>
    <rect width={w} height={h} fill={ch.color} />
    {/* abstract figure */}
    <rect x={w*0.15} y={h*0.55} width={w*0.7} height={h*0.4} fill={ch.accent} opacity="0.85" />
    <ellipse cx={w*0.5} cy={h*0.4} rx={w*0.18} ry={h*0.13} fill="#F0E6D2" />
    <rect x={w*0.42} y={h*0.5} width={w*0.16} height={h*0.08} fill="#F0E6D2" />
    <circle cx={w*0.43} cy={h*0.38} r="3" fill="#0a0a0a" />
    <circle cx={w*0.57} cy={h*0.38} r="3" fill="#0a0a0a" />
    <path d={`M ${w*0.44} ${h*0.44} Q ${w*0.5} ${h*0.46} ${w*0.56} ${h*0.44}`} stroke="#0a0a0a" strokeWidth="1.5" fill="none" />
    {/* paint texture suggestion */}
    <rect x="0" y={h*0.85} width={w} height={h*0.15} fill="#000" opacity="0.18" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────
// Variation A — Editorial grid (4 across), with featured "Continue reading"
// ─────────────────────────────────────────────────────────────────────────
const ChapterIndexA = () => {
  const continueCh = CHAPTERS.find(c => c.status === 'reading');
  const completed = CHAPTERS.filter(c => c.status === 'completed').length;
  return (
    <div style={{ background: 'var(--ob-bg)', minHeight: '100%', padding: '40px 56px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button style={{ width: 36, height: 36, border: '1px solid var(--ob-line)', borderRadius: 8, background: 'var(--ob-paper)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.4" fill="none"><path d="M2 4h10M2 7h10M2 10h10" /></svg>
        </button>
        <OBWordmark />
        <div style={{ width: 36, height: 36, borderRadius: 999, background: 'var(--ob-teal)', color: 'var(--ob-teal-ink)', display: 'grid', placeItems: 'center', fontFamily: 'var(--ob-mono)', fontSize: 12, fontWeight: 600 }}>JM</div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 32, maxWidth: 580, marginInline: 'auto' }}>
        <p className="ob-serif" style={{ fontStyle: 'italic', fontSize: 17, color: 'var(--ob-ink-3)', lineHeight: 1.5 }}>
          An interactive, open access neuroscience learning tool — the natural evolution of a textbook.
        </p>
      </div>

      {/* Continue reading band */}
      {continueCh && (
        <div style={{ marginTop: 48, background: 'var(--ob-ink)', color: 'var(--ob-paper)', borderRadius: 12, padding: 24, display: 'grid', gridTemplateColumns: '180px 1fr auto', gap: 28, alignItems: 'center' }}>
          <div style={{ height: 220, borderRadius: 6, overflow: 'hidden' }}><ChapterArt ch={continueCh} h={220} w={180} /></div>
          <div>
            <div className="ob-mono ob-uppercase" style={{ fontSize: 10, opacity: 0.55, marginBottom: 8 }}>Continue reading · Last opened 2h ago</div>
            <div className="ob-serif" style={{ fontSize: 32, lineHeight: 1.1, marginBottom: 8 }}>{continueCh.title}</div>
            <div style={{ color: 'rgba(243,239,230,0.7)', fontSize: 14, marginBottom: 16 }}>{continueCh.subtitle}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ flex: '0 0 220px', height: 4, background: 'rgba(243,239,230,0.18)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: `${continueCh.progress}%`, height: '100%', background: 'var(--ob-teal)' }} />
              </div>
              <div className="ob-mono" style={{ fontSize: 11, opacity: 0.7 }}>{continueCh.progress}% · 18 min left</div>
            </div>
          </div>
          <button className="ob-btn ob-btn--teal">Resume →</button>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 40, marginTop: 32, paddingBlock: 18, borderTop: '1px solid var(--ob-line)', borderBottom: '1px solid var(--ob-line)' }}>
        <Stat label="Chapters" value={`${completed}/${CHAPTERS.length}`} />
        <Stat label="Highlights" value="47" />
        <Stat label="Notes" value="12" />
        <Stat label="Sessions" value="23" />
        <Stat label="Total time" value="6h 14m" />
      </div>

      {/* All chapters */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 40, marginBottom: 16 }}>
        <div className="ob-eyebrow">All Chapters · {CHAPTERS.length}</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <OBBracketBtn active>Grid</OBBracketBtn>
          <OBBracketBtn>List</OBBracketBtn>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
        {CHAPTERS.map(ch => (
          <div key={ch.n} style={{ position: 'relative', cursor: 'pointer' }}>
            <div style={{ aspectRatio: '3/4', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
              <ChapterArt ch={ch} h={400} w={300} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.7) 100%)' }} />
              <div style={{ position: 'absolute', left: 14, bottom: 14, right: 14, color: '#fff' }}>
                <div className="ob-mono" style={{ fontSize: 10, opacity: 0.7, marginBottom: 4 }}>{ch.n}</div>
                <div className="ob-serif" style={{ fontSize: 18, lineHeight: 1.15 }}>{ch.title}</div>
              </div>
              {ch.status === 'completed' && (
                <div style={{ position: 'absolute', top: 10, right: 10, width: 22, height: 22, borderRadius: 999, background: 'var(--ob-teal)', display: 'grid', placeItems: 'center' }}>
                  <svg width="11" height="11" viewBox="0 0 11 11" stroke="#0a3d33" strokeWidth="1.8" fill="none"><path d="M2 5.5 L4.5 8 L9 3" /></svg>
                </div>
              )}
              {ch.status === 'reading' && (
                <div style={{ position: 'absolute', top: 10, right: 10, padding: '3px 8px', borderRadius: 999, background: 'var(--ob-paper)', fontFamily: 'var(--ob-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Reading</div>
              )}
            </div>
            <div style={{ padding: '10px 2px' }}>
              <div className="ob-mono" style={{ fontSize: 10, color: 'var(--ob-mute)', marginBottom: 2 }}>{ch.subtitle}</div>
              {ch.progress > 0 && ch.progress < 100 && (
                <div style={{ height: 2, background: 'rgba(0,0,0,0.08)', marginTop: 6 }}>
                  <div style={{ width: `${ch.progress}%`, height: '100%', background: 'var(--ob-magenta)' }} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Stat = ({ label, value }) => (
  <div>
    <div className="ob-eyebrow" style={{ marginBottom: 4 }}>{label}</div>
    <div className="ob-serif" style={{ fontSize: 22 }}>{value}</div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────
// Variation B — Typographic contents (printed-book TOC)
// ─────────────────────────────────────────────────────────────────────────
const ChapterIndexB = () => {
  const continueCh = CHAPTERS.find(c => c.status === 'reading');
  return (
    <div style={{ background: 'var(--ob-bg)', minHeight: '100%', padding: '48px 64px', fontFamily: 'var(--ob-sans)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <OBWordmark />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <OBBracketBtn>About</OBBracketBtn>
          <OBBracketBtn>Search</OBBracketBtn>
          <div style={{ width: 36, height: 36, borderRadius: 999, background: 'var(--ob-teal)', color: 'var(--ob-teal-ink)', display: 'grid', placeItems: 'center', fontFamily: 'var(--ob-mono)', fontSize: 12, fontWeight: 600 }}>JM</div>
        </div>
      </div>

      <div style={{ marginTop: 48, display: 'grid', gridTemplateColumns: '1fr 380px', gap: 56 }}>
        {/* Left: full TOC list */}
        <div>
          <div className="ob-eyebrow" style={{ marginBottom: 18 }}>Contents · {CHAPTERS.length} chapters</div>
          <h1 className="ob-serif" style={{ fontSize: 56, lineHeight: 1, margin: 0, marginBottom: 4, letterSpacing: '-0.02em' }}>
            An open<br/>neuroscience<br/><em style={{ fontStyle: 'italic', color: 'var(--ob-magenta)' }}>textbook.</em>
          </h1>
          <p className="ob-serif" style={{ fontStyle: 'italic', color: 'var(--ob-ink-3)', fontSize: 17, lineHeight: 1.5, marginTop: 28, marginBottom: 0, maxWidth: 460 }}>
            Read interactively. Highlight, annotate, quiz yourself. The natural evolution of a textbook.
          </p>

          <hr className="ob-rule" style={{ marginTop: 40 }} />
          {CHAPTERS.map(ch => (
            <div key={ch.n} style={{
              display: 'grid', gridTemplateColumns: '50px 1fr 100px 28px',
              alignItems: 'center', gap: 18,
              padding: '14px 0',
              borderBottom: '1px solid var(--ob-line)',
              cursor: 'pointer',
              transition: 'background .15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.025)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div className="ob-mono" style={{ fontSize: 12, color: 'var(--ob-mute)' }}>{ch.n}</div>
              <div>
                <div className="ob-serif" style={{ fontSize: 22, lineHeight: 1.2 }}>{ch.title}</div>
                <div className="ob-mono" style={{ fontSize: 10, color: 'var(--ob-mute)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>{ch.subtitle}</div>
              </div>
              <div className="ob-mono" style={{ fontSize: 10, color: 'var(--ob-mute)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'right' }}>
                {ch.status === 'completed' ? 'Read' : ch.status === 'reading' ? `${ch.progress}%` : `${20 + Math.round(ch.n*1.3)} min`}
              </div>
              <div>
                {ch.status === 'completed' && <div style={{ width: 18, height: 18, borderRadius: 999, background: 'var(--ob-teal)', display: 'grid', placeItems: 'center' }}><svg width="10" height="10" viewBox="0 0 11 11" stroke="#0a3d33" strokeWidth="2" fill="none"><path d="M2 5.5 L4.5 8 L9 3" /></svg></div>}
                {ch.status === 'reading' && <div style={{ width: 18, height: 18, borderRadius: 999, border: '1.5px solid var(--ob-magenta)', position: 'relative' }}><div style={{ position: 'absolute', inset: 3, borderRadius: 999, background: 'var(--ob-magenta)', clipPath: `polygon(0 0, ${ch.progress}% 0, ${ch.progress}% 100%, 0 100%)` }} /></div>}
              </div>
            </div>
          ))}
        </div>

        {/* Right: continue + featured covers */}
        <aside>
          {continueCh && (
            <div style={{ position: 'sticky', top: 24 }}>
              <div className="ob-eyebrow" style={{ marginBottom: 14 }}>Continue reading</div>
              <div style={{ borderRadius: 8, overflow: 'hidden', aspectRatio: '3/4' }}>
                <ChapterArt ch={continueCh} h={500} w={380} />
              </div>
              <div style={{ marginTop: 16 }}>
                <div className="ob-mono" style={{ fontSize: 10, color: 'var(--ob-mute)', marginBottom: 4 }}>CHAPTER {continueCh.n}</div>
                <div className="ob-serif" style={{ fontSize: 24, lineHeight: 1.15, marginBottom: 12 }}>{continueCh.title}</div>
                <div style={{ height: 3, background: 'rgba(0,0,0,0.08)', borderRadius: 999, marginBottom: 8 }}>
                  <div style={{ width: `${continueCh.progress}%`, height: '100%', background: 'var(--ob-teal)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                  <div className="ob-mono" style={{ fontSize: 10, color: 'var(--ob-mute)' }}>{continueCh.progress}% · 18 min left</div>
                  <button className="ob-btn ob-btn--solid">Resume →</button>
                </div>
              </div>
              <hr className="ob-rule-soft" style={{ marginBlock: 24 }} />
              <div className="ob-eyebrow" style={{ marginBottom: 10 }}>Recently read</div>
              <div style={{ display: 'flex', gap: 10 }}>
                {CHAPTERS.slice(0, 3).map(ch => (
                  <div key={ch.n} style={{ flex: 1, aspectRatio: '3/4', borderRadius: 4, overflow: 'hidden' }}>
                    <ChapterArt ch={ch} h={140} w={100} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Variation C — Magazine spread (asymmetric, varied sizes)
// ─────────────────────────────────────────────────────────────────────────
const ChapterIndexC = () => {
  // group: 1 hero, 2 large, the rest in a horizontal scroll feel
  const [hero, ...rest] = CHAPTERS;
  return (
    <div style={{ background: 'var(--ob-bg)', minHeight: '100%', padding: '36px 48px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <OBWordmark />
        <div style={{ display: 'flex', gap: 8 }}>
          <OBBracketBtn>About</OBBracketBtn>
          <OBBracketBtn>Funding</OBBracketBtn>
          <OBBracketBtn>Sign in</OBBracketBtn>
        </div>
      </div>

      {/* Hero band */}
      <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'end', borderTop: '2px solid var(--ob-ink)', paddingTop: 24 }}>
        <div>
          <div className="ob-eyebrow" style={{ marginBottom: 12 }}>Vol. 01 · Sensory Systems · 2026 Edition</div>
          <h1 className="ob-serif" style={{ fontSize: 88, lineHeight: 0.95, margin: 0, letterSpacing: '-0.025em' }}>
            The Open<br/>Brain<span style={{ color: 'var(--ob-teal)' }}>.</span>
          </h1>
        </div>
        <p className="ob-serif" style={{ fontStyle: 'italic', fontSize: 18, lineHeight: 1.5, color: 'var(--ob-ink-3)', maxWidth: 520, justifySelf: 'end' }}>
          Fourteen chapters. Hundreds of interactive diagrams. Built for the way undergraduates actually study — with highlights, flashcards, and an AI tutor that knows the source material.
        </p>
      </div>

      <hr className="ob-rule" style={{ marginTop: 28 }} />

      {/* Featured row: hero card + two stacked */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24, marginTop: 28 }}>
        <div style={{ position: 'relative', aspectRatio: '4/3', borderRadius: 8, overflow: 'hidden', cursor: 'pointer' }}>
          <ChapterArt ch={hero} h={500} w={680} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent 55%)' }} />
          <div style={{ position: 'absolute', left: 24, bottom: 24, right: 24, color: '#fff' }}>
            <div className="ob-mono" style={{ fontSize: 11, opacity: 0.8, marginBottom: 8 }}>CHAPTER {hero.n} · COMPLETED</div>
            <div className="ob-serif" style={{ fontSize: 44, lineHeight: 1, marginBottom: 8, letterSpacing: '-0.01em' }}>{hero.title}</div>
            <div style={{ fontSize: 14, opacity: 0.85, maxWidth: 420 }}>{hero.subtitle}</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: 24 }}>
          {rest.slice(0, 2).map(ch => (
            <div key={ch.n} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 20, padding: 16, border: '1px solid var(--ob-line)', borderRadius: 8, background: 'var(--ob-paper)', cursor: 'pointer' }}>
              <div style={{ borderRadius: 4, overflow: 'hidden' }}><ChapterArt ch={ch} h={200} w={160} /></div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '4px 0' }}>
                <div>
                  <div className="ob-mono" style={{ fontSize: 10, color: 'var(--ob-mute)', marginBottom: 6 }}>CH {ch.n}</div>
                  <div className="ob-serif" style={{ fontSize: 22, lineHeight: 1.15, marginBottom: 6 }}>{ch.title}</div>
                  <div className="ob-mono" style={{ fontSize: 10, color: 'var(--ob-mute)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{ch.subtitle}</div>
                </div>
                {ch.status === 'reading' ? (
                  <div>
                    <div style={{ height: 3, background: 'rgba(0,0,0,0.08)', borderRadius: 999, marginBottom: 6 }}>
                      <div style={{ width: `${ch.progress}%`, height: '100%', background: 'var(--ob-magenta)' }} />
                    </div>
                    <div className="ob-mono" style={{ fontSize: 10, color: 'var(--ob-magenta)' }}>READING · {ch.progress}%</div>
                  </div>
                ) : (
                  <button className="ob-btn" style={{ alignSelf: 'flex-start' }}>Begin →</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Remaining chapters as small index strip */}
      <div style={{ marginTop: 36 }}>
        <div className="ob-eyebrow" style={{ marginBottom: 14 }}>Forthcoming · {CHAPTERS.length - 3} chapters</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14 }}>
          {rest.slice(2).map(ch => (
            <div key={ch.n} style={{ cursor: 'pointer' }}>
              <div style={{ aspectRatio: '3/4', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
                <ChapterArt ch={ch} h={180} w={140} />
              </div>
              <div className="ob-mono" style={{ fontSize: 9, color: 'var(--ob-mute)', marginBottom: 2 }}>CH {ch.n}</div>
              <div className="ob-serif" style={{ fontSize: 13, lineHeight: 1.2 }}>{ch.title}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { ChapterIndexA, ChapterIndexB, ChapterIndexC, CHAPTERS, ChapterArt });
