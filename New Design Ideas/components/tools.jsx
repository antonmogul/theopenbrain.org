// Floating panel (Info / Notebook / Chat), Quiz, Flashcards, Nav popover, Mobile

// ─────────────────────────────────────────────────────────────────────────
// Floating panel — draggable, with Info / Notebook / Chat tabs
// ─────────────────────────────────────────────────────────────────────────
const HIGHLIGHTS = [
  { color: '#F4D03F', text: '"In 2013, a major airline redesigned their booking interface. The design team spent months crafting what they considered..."', date: 'Apr 30, 8:47 AM', tags: [] },
  { color: '#3DD9B5', text: '"Beginning in the 1960s with Hubel and Wiesel\'s seminal work on cortical receptive fields..."', date: 'Apr 13, 3:08 PM', tags: ['vision', 'history'] },
  { color: '#F8B8D8', text: '"These two streams operate somewhat independently, which has fascinating implications for design."', date: 'Mar 25, 2:33 PM', tags: ['streams'] },
  { color: '#B8D8F8', text: '"The dorsal stream (the \'where\' pathway) flows from V1 toward the parietal lobe."', date: 'Mar 25, 2:33 PM', tags: [] },
  { color: '#C8B8E8', text: '"Onset: The blink begins approximately 100-150ms after the first target..."', date: 'Mar 25, 2:39 PM', tags: [] },
];

const FloatingPanel = ({ initialTab = 'notebook' }) => {
  const [tab, setTab] = React.useState(initialTab);
  const [subtab, setSubtab] = React.useState('Highlights');
  return (
    <div style={{
      width: 380, background: 'var(--ob-paper)',
      border: '1px solid var(--ob-line-strong)', borderRadius: 10,
      boxShadow: '0 24px 64px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.06)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      height: 620,
    }}>
      {/* Drag handle / tabs */}
      <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid var(--ob-line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px', cursor: 'grab', borderRight: '1px solid var(--ob-line)' }}>
          <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" style={{ color: 'var(--ob-mute-2)' }}>
            <circle cx="2" cy="3" r="1" /><circle cx="8" cy="3" r="1" />
            <circle cx="2" cy="7" r="1" /><circle cx="8" cy="7" r="1" />
            <circle cx="2" cy="11" r="1" /><circle cx="8" cy="11" r="1" />
          </svg>
        </div>
        {['info','notebook','chat'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '12px 8px', background: 'transparent', border: 0,
            borderBottom: `2px solid ${tab === t ? 'var(--ob-ink)' : 'transparent'}`,
            fontFamily: 'var(--ob-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em',
            color: tab === t ? 'var(--ob-ink)' : 'var(--ob-mute)',
            cursor: 'pointer',
          }}>{t}</button>
        ))}
        <button style={{ width: 36, background: 'transparent', border: 0, color: 'var(--ob-mute)', cursor: 'pointer', borderLeft: '1px solid var(--ob-line)' }}>×</button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto' }} className="ob-scroll">
        {tab === 'info' && (
          <div style={{ padding: 18 }}>
            <div className="ob-eyebrow" style={{ color: 'var(--ob-magenta)', marginBottom: 6 }}>CHAPTER 02</div>
            <div className="ob-serif" style={{ fontSize: 24, marginBottom: 14 }}>Visual Perception & UX</div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontFamily: 'var(--ob-mono)', fontSize: 11 }}>
                <span style={{ color: 'var(--ob-mute)' }}>READING</span><span>64%</span>
              </div>
              <div style={{ height: 4, background: 'rgba(0,0,0,0.08)' }}>
                <div style={{ width: '64%', height: '100%', background: 'var(--ob-teal)' }} />
              </div>
              <div className="ob-mono" style={{ fontSize: 11, color: 'var(--ob-mute)', marginTop: 8 }}>⏱ 18 min remaining</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, border: '1px solid var(--ob-line)' }}>
              {[['42.6k','Words'],['13','Sections'],['30','Highlights'],['5','Notes'],['1','Sessions'],['—','Quizzes']].map(([v,l],i) => (
                <div key={i} style={{ padding: '14px 10px', borderRight: i % 3 !== 2 ? '1px solid var(--ob-line)' : 0, borderTop: i >= 3 ? '1px solid var(--ob-line)' : 0 }}>
                  <div className="ob-serif" style={{ fontSize: 22, lineHeight: 1 }}>{v}</div>
                  <div className="ob-eyebrow" style={{ marginTop: 4 }}>{l}</div>
                </div>
              ))}
            </div>
            <hr className="ob-rule-soft" style={{ marginBlock: 18 }} />
            <button style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '10px 0', background: 'transparent', border: 0, fontFamily: 'var(--ob-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer' }}>
              <span>Contents <span style={{ color: 'var(--ob-mute)' }}>(13)</span></span><span>›</span>
            </button>
            <hr className="ob-rule-soft" />
            <button style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '10px 0', background: 'transparent', border: 0, fontFamily: 'var(--ob-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer' }}>
              <span>References <span style={{ color: 'var(--ob-mute)' }}>(15)</span></span><span>›</span>
            </button>
          </div>
        )}

        {tab === 'notebook' && (
          <div>
            {/* sub tabs */}
            <div style={{ display: 'flex', gap: 16, padding: '12px 18px 0', borderBottom: '1px solid var(--ob-line)' }}>
              {['Highlights','Notes','Trending'].map(s => (
                <OBTab key={s} active={subtab === s} onClick={() => setSubtab(s)}>{s} {s === 'Highlights' && <span style={{ marginLeft: 5, padding: '1px 6px', background: 'var(--ob-teal)', color: 'var(--ob-teal-ink)', borderRadius: 999, fontSize: 9 }}>30</span>}</OBTab>
              ))}
            </div>
            {/* color filter row */}
            <div style={{ display: 'flex', gap: 6, padding: '12px 18px', borderBottom: '1px solid var(--ob-line)' }}>
              <button style={{ width: 26, height: 26, borderRadius: 999, border: '1.5px solid var(--ob-ink)', background: 'transparent', fontFamily: 'var(--ob-mono)', fontSize: 10, cursor: 'pointer' }}>All</button>
              {['#F4D03F','#3DD9B5','#B8D8F8','#F8B8D8','#C8B8E8'].map(c => (
                <button key={c} style={{ width: 26, height: 26, borderRadius: 999, border: 'none', background: c, cursor: 'pointer' }} />
              ))}
            </div>
            <div style={{ padding: '8px 18px' }}>
              {HIGHLIGHTS.map((h, i) => (
                <div key={i} style={{ padding: '12px 0', borderBottom: '1px solid var(--ob-line)', display: 'flex', gap: 12 }}>
                  <div style={{ width: 3, background: h.color, borderRadius: 2, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="ob-serif" style={{ fontSize: 13, lineHeight: 1.5, fontStyle: 'italic', marginBottom: 6 }}>{h.text}</div>
                    {h.tags.length > 0 && <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>{h.tags.map(t => <OBChip key={t} color="var(--ob-magenta)">{t}</OBChip>)}</div>}
                    <div className="ob-mono" style={{ fontSize: 9, color: 'var(--ob-mute)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'chat' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 18px', borderBottom: '1px solid var(--ob-line)' }}>
              <OBBracketBtn>⏱ History</OBBracketBtn>
              <OBBracketBtn>+ New</OBBracketBtn>
            </div>
            <div style={{ flex: 1, padding: '14px 18px', overflowY: 'auto' }} className="ob-scroll">
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
                <div style={{ background: 'var(--ob-ink)', color: 'var(--ob-paper)', padding: '10px 14px', borderRadius: '14px 14px 4px 14px', maxWidth: '80%', fontSize: 13 }}>
                  Summarize the chapter so far
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 24, height: 24, borderRadius: 999, background: 'var(--ob-teal)', flexShrink: 0, display: 'grid', placeItems: 'center', fontFamily: 'var(--ob-mono)', fontSize: 10, color: 'var(--ob-teal-ink)', fontWeight: 700 }}>OB</div>
                <div className="ob-serif" style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--ob-ink)' }}>
                  The chapter argues that <strong>effective interface design must align with how human visual perception actually works</strong>, rather than how we assume it works.
                  <br/><br/>
                  <span className="ob-eyebrow" style={{ display: 'block', marginBottom: 6 }}>KEY REVELATIONS</span>
                  Human vision is surprisingly limited — we only see clearly in a tiny 2° window, our eyes move in rapid jumps (saccades), and we consciously process only ~50 of the 11 million bits we receive each second.
                </div>
              </div>
            </div>
            <div style={{ padding: 12, borderTop: '1px solid var(--ob-line)', display: 'flex', gap: 8, alignItems: 'center' }}>
              <input className="ob-input" placeholder="Ask about this chapter…" style={{ flex: 1, paddingInline: 8 }} />
              <button style={{ width: 32, height: 32, borderRadius: 999, background: 'var(--ob-magenta)', border: 0, color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M1 7 L13 1 L9 13 L7 8 Z" /></svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tools rail removed per feedback — these will integrate into chapter content directly */}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Quiz flow
// ─────────────────────────────────────────────────────────────────────────
const QuizStart = () => (
  <div style={{ background: 'var(--ob-bg)', height: '100%', display: 'flex', flexDirection: 'column' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 22px', borderBottom: '1px solid var(--ob-line)' }}>
      <div className="ob-mono" style={{ fontSize: 12 }}>Quiz · Visual Perception & UX</div>
      <button style={{ background: 'transparent', border: 0, fontSize: 18, cursor: 'pointer' }}>×</button>
    </div>
    <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 40 }}>
      <div style={{ maxWidth: 460, textAlign: 'center' }}>
        <div className="ob-eyebrow" style={{ marginBottom: 14, color: 'var(--ob-magenta)' }}>CHAPTER 02 · ASSESSMENT</div>
        <h1 className="ob-serif" style={{ fontSize: 44, lineHeight: 1.05, margin: 0, marginBottom: 18, letterSpacing: '-0.01em' }}>Visual Perception<br/>& UX Principles</h1>
        <p className="ob-serif" style={{ fontStyle: 'italic', fontSize: 16, lineHeight: 1.55, color: 'var(--ob-ink-3)', marginBottom: 28 }}>
          Assess your knowledge of Gestalt principles, attention, and how visual perception applies to user experience design.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, border: '1px solid var(--ob-line)', marginBottom: 28 }}>
          {[['6','Questions'],['20','Minutes'],['70%','to Pass']].map(([v,l],i) => (
            <div key={i} style={{ padding: '16px 10px', borderRight: i < 2 ? '1px solid var(--ob-line)' : 0 }}>
              <div className="ob-serif" style={{ fontSize: 28, lineHeight: 1 }}>{v}</div>
              <div className="ob-eyebrow" style={{ marginTop: 6 }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="ob-btn">Cancel</button>
          <button className="ob-btn ob-btn--solid">Start Quiz →</button>
        </div>
      </div>
    </div>
  </div>
);

const QuizQuestion = () => (
  <div style={{ background: 'var(--ob-bg)', height: '100%', display: 'flex', flexDirection: 'column' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 22px', borderBottom: '1px solid var(--ob-line)' }}>
      <div className="ob-mono" style={{ fontSize: 12 }}>Quiz · Visual Perception & UX</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="ob-mono" style={{ fontSize: 11, padding: '4px 10px', border: '1px solid var(--ob-line)', borderRadius: 999 }}>⏱ 19:56</div>
        <button style={{ background: 'transparent', border: 0, fontSize: 18, cursor: 'pointer' }}>×</button>
      </div>
    </div>
    <div style={{ padding: '20px 32px', borderBottom: '1px solid var(--ob-line)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="ob-mono" style={{ fontSize: 11 }}>Question <strong>1</strong> of <strong>6</strong></span>
        <span className="ob-mono" style={{ fontSize: 11, color: 'var(--ob-mute)' }}>0/6 answered</span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {[1,2,3,4,5,6].map(n => (
          <div key={n} style={{ flex: 1, height: 4, background: n === 1 ? 'var(--ob-magenta)' : 'rgba(0,0,0,0.08)' }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        {[1,2,3,4,5,6].map(n => (
          <div key={n} style={{ width: 28, height: 28, borderRadius: 999, border: '1px solid var(--ob-line)', display: 'grid', placeItems: 'center', fontFamily: 'var(--ob-mono)', fontSize: 12, background: n === 1 ? 'var(--ob-ink)' : 'transparent', color: n === 1 ? 'var(--ob-paper)' : 'var(--ob-ink)' }}>{n}</div>
        ))}
      </div>
    </div>
    <div style={{ flex: 1, padding: '32px 56px', maxWidth: 720, marginInline: 'auto', width: '100%' }}>
      <div className="ob-eyebrow" style={{ marginBottom: 12 }}>Q1 · Short answer</div>
      <h2 className="ob-serif" style={{ fontSize: 26, lineHeight: 1.25, margin: 0, marginBottom: 24 }}>Describe how the Gestalt principle of <em>closure</em> can be applied in UI design. Give a specific example.</h2>
      <textarea className="ob-input" placeholder="Type your answer…" style={{ minHeight: 120, padding: '12px 0', fontFamily: 'var(--ob-serif)', fontSize: 15, resize: 'none' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
        <button className="ob-btn">← Previous</button>
        <button className="ob-btn ob-btn--solid">Next →</button>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────
// Flashcards
// ─────────────────────────────────────────────────────────────────────────
const Flashcards = () => {
  const [flipped, setFlipped] = React.useState(false);
  return (
    <div style={{ background: 'var(--ob-bg)', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 22px', borderBottom: '1px solid var(--ob-line)' }}>
        <div className="ob-mono" style={{ fontSize: 12 }}>Flashcards · Visual Perception</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span className="ob-mono" style={{ fontSize: 11, color: 'var(--ob-mute)' }}>0:42</span>
          <span className="ob-mono" style={{ fontSize: 11 }}><span style={{ color: '#1a8a55' }}>3</span> / <span style={{ color: '#c14545' }}>1</span></span>
          <button style={{ background: 'transparent', border: 0, fontSize: 18, cursor: 'pointer' }}>×</button>
        </div>
      </div>
      {/* progress */}
      <div style={{ padding: '0 22px', paddingTop: 14 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={{ flex: 1, height: 4, background: i < 4 ? 'var(--ob-magenta)' : 'rgba(0,0,0,0.08)' }} />
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <span className="ob-mono" style={{ fontSize: 11, color: 'var(--ob-mute)' }}>4 / 12</span>
        </div>
      </div>
      {/* card */}
      <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 32 }}>
        <div onClick={() => setFlipped(f => !f)} style={{
          width: 480, height: 320, perspective: 1200, cursor: 'pointer',
        }}>
          <div style={{ position: 'relative', width: '100%', height: '100%', transformStyle: 'preserve-3d', transition: 'transform .55s', transform: flipped ? 'rotateY(180deg)' : 'none' }}>
            {/* Front */}
            <div style={{ position: 'absolute', inset: 0, background: 'var(--ob-paper)', border: '1px solid var(--ob-line-strong)', borderRadius: 8, padding: 28, display: 'flex', flexDirection: 'column', backfaceVisibility: 'hidden' }}>
              <div className="ob-eyebrow">Term · 4/12</div>
              <div style={{ flex: 1, display: 'grid', placeItems: 'center' }}>
                <div className="ob-serif" style={{ fontSize: 36, textAlign: 'center', letterSpacing: '-0.01em' }}>Feature Integration<br/>Theory</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--ob-mute)', fontFamily: 'var(--ob-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                <span>Tap to flip</span><span>Space ⎵</span>
              </div>
            </div>
            {/* Back */}
            <div style={{ position: 'absolute', inset: 0, background: 'var(--ob-ink)', color: 'var(--ob-paper)', border: '1px solid var(--ob-ink)', borderRadius: 8, padding: 28, display: 'flex', flexDirection: 'column', backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
              <div className="ob-eyebrow" style={{ color: 'var(--ob-teal)' }}>Definition</div>
              <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: '0 12px' }}>
                <div className="ob-serif" style={{ fontSize: 18, lineHeight: 1.5, textAlign: 'center' }}>
                  Treisman's theory: visual perception occurs in two stages — preattentive feature detection (parallel) followed by attentive feature integration (serial).
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ flex: 1, padding: 10, background: 'transparent', border: '1px solid #c14545', color: '#ff8a8a', borderRadius: 4, fontFamily: 'var(--ob-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer' }}>✕ Missed</button>
                <button style={{ flex: 1, padding: 10, background: 'var(--ob-teal)', border: '1px solid var(--ob-teal)', color: 'var(--ob-teal-ink)', borderRadius: 4, fontFamily: 'var(--ob-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer' }}>✓ Got it</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* keyboard hints */}
      <div style={{ padding: '14px 22px', borderTop: '1px solid var(--ob-line)', display: 'flex', justifyContent: 'center', gap: 24 }}>
        {[['⎵','Flip'],['→','Next'],['1','Missed'],['2','Got it']].map(([k,l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--ob-mono)', fontSize: 11, color: 'var(--ob-mute)' }}>
            <span style={{ padding: '2px 7px', border: '1px solid var(--ob-line)', borderRadius: 3, background: 'var(--ob-paper)', color: 'var(--ob-ink)' }}>{k}</span>{l}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Nav popover (left-side menu)
// ─────────────────────────────────────────────────────────────────────────
const NavPopover = () => (
  <div style={{ width: 380, height: '100%', background: 'var(--ob-paper)', border: '1px solid var(--ob-line)', borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
      <button style={{ width: 36, height: 36, border: '1px solid var(--ob-line)', borderRadius: 6, background: 'transparent', cursor: 'pointer' }}>×</button>
      <OBLogo size={22} />
    </div>
    <div className="ob-eyebrow" style={{ marginBottom: 6 }}>CURRENTLY READING · CH 02</div>
    <h2 className="ob-serif" style={{ fontSize: 28, lineHeight: 1.1, margin: 0, marginBottom: 6 }}>Visual Perception & UX</h2>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
      <div style={{ flex: 1, height: 3, background: 'rgba(0,0,0,0.08)' }}>
        <div style={{ width: '64%', height: '100%', background: 'var(--ob-teal)' }} />
      </div>
      <span className="ob-mono" style={{ fontSize: 10, color: 'var(--ob-mute)' }}>64%</span>
    </div>
    <button className="ob-btn ob-btn--solid" style={{ alignSelf: 'flex-start', marginBottom: 24 }}>Resume reading →</button>

    <hr className="ob-rule-soft" style={{ marginBottom: 16 }} />
    <div className="ob-eyebrow" style={{ marginBottom: 12 }}>NAVIGATE</div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
      {[['All chapters','14'],['About',''],['Funding',''],['Contact',''],['Glossary','340'],['References','']].map(([l,c],i) => (
        <button key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 12px 12px 0', background: 'transparent', border: 0, borderBottom: '1px solid var(--ob-line)', borderRight: i % 2 === 0 ? '1px solid var(--ob-line)' : 0, paddingInline: 12, fontFamily: 'var(--ob-sans)', fontSize: 14, cursor: 'pointer', textAlign: 'left' }}>
          {l}<span className="ob-mono" style={{ fontSize: 10, color: 'var(--ob-mute)' }}>{c}</span>
        </button>
      ))}
    </div>

    <div style={{ flex: 1 }} />
    <hr className="ob-rule-soft" style={{ marginBottom: 16 }} />
    <div className="ob-eyebrow" style={{ marginBottom: 10 }}>SIGNED IN AS</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
      <div style={{ width: 36, height: 36, borderRadius: 999, background: 'var(--ob-teal)', color: 'var(--ob-teal-ink)', display: 'grid', placeItems: 'center', fontFamily: 'var(--ob-mono)', fontWeight: 600 }}>JM</div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>Jamie Morales</div>
        <div className="ob-mono" style={{ fontSize: 10, color: 'var(--ob-mute)' }}>jamie@stanford.edu</div>
      </div>
    </div>
    <div style={{ display: 'flex', gap: 8 }}>
      <button className="ob-btn" style={{ flex: 1 }}>Settings</button>
      <button className="ob-btn" style={{ flex: 1 }}>Sign out</button>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────
// Mobile views
// ─────────────────────────────────────────────────────────────────────────
const MobileReader = () => (
  <div style={{ background: 'var(--ob-bg)', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
    {/* status */}
    <div style={{ padding: '8px 18px', display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--ob-mono)', fontSize: 11 }}>
      <span>9:41</span><span>●●● ▮▮</span>
    </div>
    {/* nav */}
    <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--ob-line)' }}>
      <button style={{ width: 32, height: 32, border: '1px solid var(--ob-line)', borderRadius: 6, background: 'var(--ob-paper)' }}>≡</button>
      <div style={{ flex: 1, fontFamily: 'var(--ob-mono)', fontSize: 11 }}>
        <div style={{ color: 'var(--ob-mute)' }}>CH 02 · 64%</div>
        <div>Visual Perception</div>
      </div>
      <button style={{ width: 32, height: 32, border: '1px solid var(--ob-line)', borderRadius: 6, background: 'var(--ob-paper)' }}>⎙</button>
    </div>
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>
      <div className="ob-eyebrow" style={{ marginBottom: 8 }}>Section 2.1</div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
        <OBNumber n="2" size={32} />
        <h1 className="ob-serif" style={{ fontSize: 26, lineHeight: 1.1, margin: 0 }}>Organization and cell types</h1>
      </div>
      <div style={{ background: 'var(--ob-paper)', border: '1px solid var(--ob-line-strong)', borderRadius: 6, padding: 20, marginBottom: 18 }}>
        <RetinalDiagram />
      </div>
      <p className="ob-serif" style={{ fontSize: 16, lineHeight: 1.65, margin: 0 }}>
        The retina is comprised of 5 neuronal classes — photoreceptors, horizontal cells, bipolar cells, amacrine cells, and ganglion cells.
      </p>
    </div>
    {/* tab bar */}
    <div style={{ display: 'flex', borderTop: '1px solid var(--ob-line)', background: 'var(--ob-paper)' }}>
      {[['◇','Read'],['✎','Notes'],['💬','Chat'],['⏷','Tools']].map(([i,l],idx) => (
        <button key={l} style={{ flex: 1, padding: '12px 4px', background: 'transparent', border: 0, fontFamily: 'var(--ob-mono)', fontSize: 10, color: idx === 0 ? 'var(--ob-ink)' : 'var(--ob-mute)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 16 }}>{i}</span>{l}
        </button>
      ))}
    </div>
  </div>
);

const MobileIndex = () => (
  <div style={{ background: 'var(--ob-bg)', height: '100%', overflow: 'auto' }}>
    <div style={{ padding: '8px 18px', display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--ob-mono)', fontSize: 11 }}>
      <span>9:41</span><span>●●● ▮▮</span>
    </div>
    <div style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <button style={{ width: 32, height: 32, border: '1px solid var(--ob-line)', borderRadius: 6, background: 'var(--ob-paper)' }}>≡</button>
      <OBLogo size={20} />
      <div style={{ width: 30, height: 30, borderRadius: 999, background: 'var(--ob-teal)', color: 'var(--ob-teal-ink)', display: 'grid', placeItems: 'center', fontFamily: 'var(--ob-mono)', fontSize: 11, fontWeight: 600 }}>JM</div>
    </div>
    <div style={{ padding: '8px 18px 18px' }}>
      <div className="ob-eyebrow" style={{ marginBottom: 12 }}>Continue reading</div>
      <div style={{ background: 'var(--ob-ink)', color: 'var(--ob-paper)', borderRadius: 8, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ aspectRatio: '16/9' }}><ChapterArt ch={CHAPTERS[1]} h={180} w={320} /></div>
        <div style={{ padding: 16 }}>
          <div className="ob-eyebrow" style={{ color: 'rgba(243,239,230,0.6)', marginBottom: 6 }}>CH 02 · 18 min left</div>
          <div className="ob-serif" style={{ fontSize: 20, marginBottom: 12 }}>Visual Perception & UX</div>
          <div style={{ height: 3, background: 'rgba(243,239,230,0.18)' }}>
            <div style={{ width: '64%', height: '100%', background: 'var(--ob-teal)' }} />
          </div>
        </div>
      </div>
      <div className="ob-eyebrow" style={{ marginBottom: 12 }}>All chapters · 14</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {CHAPTERS.slice(0, 6).map(ch => (
          <div key={ch.n}>
            <div style={{ aspectRatio: '3/4', borderRadius: 4, overflow: 'hidden', position: 'relative', marginBottom: 6 }}>
              <ChapterArt ch={ch} h={200} w={150} />
              {ch.status === 'completed' && <div style={{ position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: 999, background: 'var(--ob-teal)', display: 'grid', placeItems: 'center' }}><svg width="10" height="10" viewBox="0 0 11 11" stroke="#0a3d33" strokeWidth="2" fill="none"><path d="M2 5.5 L4.5 8 L9 3" /></svg></div>}
            </div>
            <div className="ob-mono" style={{ fontSize: 9, color: 'var(--ob-mute)' }}>CH {ch.n}</div>
            <div className="ob-serif" style={{ fontSize: 14, lineHeight: 1.2 }}>{ch.title}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const MobilePanel = () => (
  <div style={{ background: '#000', height: '100%', display: 'flex', flexDirection: 'column' }}>
    {/* dim background simulating reader behind */}
    <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)' }} />
    <div style={{ background: 'var(--ob-paper)', borderRadius: '16px 16px 0 0', maxHeight: '75%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'grid', placeItems: 'center', padding: '8px 0' }}><div style={{ width: 36, height: 4, background: 'rgba(0,0,0,0.2)', borderRadius: 999 }} /></div>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--ob-line)' }}>
        {['Info','Notebook','Chat'].map((t,i) => (
          <button key={t} style={{ flex: 1, padding: '12px 8px', background: 'transparent', border: 0, borderBottom: `2px solid ${i === 1 ? 'var(--ob-ink)' : 'transparent'}`, fontFamily: 'var(--ob-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: i === 1 ? 'var(--ob-ink)' : 'var(--ob-mute)' }}>{t}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 14, padding: '12px 18px', borderBottom: '1px solid var(--ob-line)' }}>
        {['Highlights','Notes','Trending'].map((s,i) => (
          <span key={s} className="ob-mono" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: i === 0 ? 'var(--ob-ink)' : 'var(--ob-mute)' }}>{s}</span>
        ))}
      </div>
      <div style={{ padding: '8px 18px', overflow: 'auto' }}>
        {HIGHLIGHTS.slice(0, 3).map((h, i) => (
          <div key={i} style={{ padding: '12px 0', borderBottom: '1px solid var(--ob-line)', display: 'flex', gap: 10 }}>
            <div style={{ width: 3, background: h.color, borderRadius: 2 }} />
            <div style={{ flex: 1 }}>
              <div className="ob-serif" style={{ fontSize: 13, fontStyle: 'italic', lineHeight: 1.5 }}>{h.text}</div>
              <div className="ob-mono" style={{ fontSize: 9, color: 'var(--ob-mute)', marginTop: 4 }}>{h.date}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

Object.assign(window, { FloatingPanel, QuizStart, QuizQuestion, Flashcards, NavPopover, MobileReader, MobileIndex, MobilePanel });
