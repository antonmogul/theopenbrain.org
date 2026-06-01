// Chapter Overview — repurposed from old TOC variant
// Shows the structure of one chapter: sections, figures, references, with progress

const CHAPTER_SECTIONS = [
  { n: '2.1', title: 'The eye as an optical system', wc: 1840, figures: 2, status: 'done', mins: 8 },
  { n: '2.2', title: 'Light, the visible spectrum, and the visual environment', wc: 2210, figures: 3, status: 'done', mins: 10 },
  { n: '2.3', title: 'How the brain constructs visual perception', wc: 3120, figures: 4, status: 'reading', progress: 64, mins: 14 },
  { n: '2.4', title: 'Gestalt principles & perceptual grouping', wc: 2680, figures: 5, mins: 12 },
  { n: '2.5', title: 'Attention, fixations, and saccades', wc: 2940, figures: 3, mins: 13 },
  { n: '2.6', title: 'Color vision & color blindness', wc: 1980, figures: 4, mins: 9 },
  { n: '2.7', title: 'Implications for interface design', wc: 2400, figures: 2, mins: 11 },
];

const ChapterOverview = () => {
  const continueCh = CHAPTERS[1]; // Visual perception
  return (
    <div style={{ background: 'var(--ob-bg)', minHeight: '100%', padding: '32px 56px', fontFamily: 'var(--ob-sans)' }}>
      {/* top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <button className="ob-btn"><span style={{ marginRight: 4 }}>←</span> All chapters</button>
        <OBWordmark scale={0.85} />
        <div style={{ width: 36, height: 36, borderRadius: 999, background: 'var(--ob-teal)', color: 'var(--ob-teal-ink)', display: 'grid', placeItems: 'center', fontFamily: 'var(--ob-mono)', fontSize: 12, fontWeight: 600 }}>JM</div>
      </div>

      <hr className="ob-rule" />

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 56, marginTop: 36 }}>
        {/* Left — chapter cover + meta */}
        <div>
          <div style={{ aspectRatio: '3/4', borderRadius: 8, overflow: 'hidden', marginBottom: 18 }}>
            <ChapterArt ch={continueCh} h={420} w={320} />
          </div>
          <div className="ob-eyebrow" style={{ marginBottom: 4 }}>CHAPTER 02</div>
          <h1 className="ob-serif" style={{ fontSize: 32, lineHeight: 1.1, margin: 0, marginBottom: 8, letterSpacing: '-0.01em' }}>{continueCh.title}</h1>
          <div className="ob-mono" style={{ fontSize: 11, color: 'var(--ob-mute)', marginBottom: 18 }}>By M. Halle, J. Reyes · 2024</div>

          <div style={{ height: 3, background: 'rgba(0,0,0,0.08)', marginBottom: 8 }}>
            <div style={{ width: '64%', height: '100%', background: 'var(--ob-teal)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
            <span className="ob-mono" style={{ fontSize: 11 }}>64% read</span>
            <span className="ob-mono" style={{ fontSize: 11, color: 'var(--ob-mute)' }}>18 min left</span>
          </div>
          <button className="ob-btn ob-btn--solid" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>Resume reading →</button>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, border: '1px solid var(--ob-line)', marginTop: 24 }}>
            {[['17.2k','Words'],['7','Sections'],['23','Figures'],['30','Highlights'],['5','Notes'],['15','Refs']].map(([v,l],i) => (
              <div key={i} style={{ padding: '12px 8px', borderRight: i % 3 !== 2 ? '1px solid var(--ob-line)' : 0, borderTop: i >= 3 ? '1px solid var(--ob-line)' : 0 }}>
                <div className="ob-serif" style={{ fontSize: 18, lineHeight: 1 }}>{v}</div>
                <div className="ob-eyebrow" style={{ marginTop: 4 }}>{l}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 24, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <OBBracketBtn>Quiz</OBBracketBtn>
            <OBBracketBtn>Flashcards</OBBracketBtn>
            <OBBracketBtn>Notebook</OBBracketBtn>
            <OBBracketBtn>Chat</OBBracketBtn>
          </div>
        </div>

        {/* Right — section list */}
        <div>
          <p className="ob-serif" style={{ fontStyle: 'italic', fontSize: 18, lineHeight: 1.55, color: 'var(--ob-ink-3)', margin: 0, marginBottom: 32, maxWidth: 580 }}>
            How the visual system constructs perception, from the optics of the eye to the cortical machinery of attention — and what that means for the interfaces we build.
          </p>

          <div className="ob-eyebrow" style={{ marginBottom: 14 }}>Sections · {CHAPTER_SECTIONS.length}</div>
          <hr className="ob-rule" />
          {CHAPTER_SECTIONS.map(s => (
            <div key={s.n} style={{
              display: 'grid', gridTemplateColumns: '52px 1fr 80px 80px 28px',
              alignItems: 'center', gap: 18,
              padding: '18px 0',
              borderBottom: '1px solid var(--ob-line)',
              cursor: 'pointer', transition: 'background .12s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.025)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div className="ob-mono" style={{ fontSize: 13, color: s.status === 'reading' ? 'var(--ob-magenta)' : 'var(--ob-mute)' }}>{s.n}</div>
              <div>
                <div className="ob-serif" style={{ fontSize: 19, lineHeight: 1.2, color: 'var(--ob-ink)' }}>{s.title}</div>
                {s.status === 'reading' && (
                  <div style={{ marginTop: 8, height: 2, background: 'rgba(0,0,0,0.08)', maxWidth: 200 }}>
                    <div style={{ width: `${s.progress}%`, height: '100%', background: 'var(--ob-magenta)' }} />
                  </div>
                )}
              </div>
              <div className="ob-mono" style={{ fontSize: 10, color: 'var(--ob-mute)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.figures} figs</div>
              <div className="ob-mono" style={{ fontSize: 10, color: 'var(--ob-mute)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.mins} min</div>
              <div>
                {s.status === 'done' && <div style={{ width: 18, height: 18, borderRadius: 999, background: 'var(--ob-teal)', display: 'grid', placeItems: 'center' }}><svg width="10" height="10" viewBox="0 0 11 11" stroke="#0a3d33" strokeWidth="2" fill="none"><path d="M2 5.5 L4.5 8 L9 3" /></svg></div>}
                {s.status === 'reading' && <div style={{ width: 18, height: 18, borderRadius: 999, border: '1.5px solid var(--ob-magenta)', position: 'relative', background: 'var(--ob-paper)' }}><div style={{ position: 'absolute', inset: 3, borderRadius: 999, background: 'var(--ob-magenta)', clipPath: `polygon(0 0, ${s.progress}% 0, ${s.progress}% 100%, 0 100%)` }} /></div>}
              </div>
            </div>
          ))}

          <div style={{ marginTop: 32 }}>
            <div className="ob-eyebrow" style={{ marginBottom: 12 }}>Up next</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, border: '1px solid var(--ob-line)', borderRadius: 6, cursor: 'pointer' }}>
              <div style={{ width: 60, height: 80, borderRadius: 4, overflow: 'hidden', flexShrink: 0 }}>
                <ChapterArt ch={CHAPTERS[2]} h={80} w={60} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="ob-mono" style={{ fontSize: 10, color: 'var(--ob-mute)', marginBottom: 2 }}>CHAPTER 03</div>
                <div className="ob-serif" style={{ fontSize: 18 }}>{CHAPTERS[2].title}</div>
              </div>
              <div className="ob-mono" style={{ fontSize: 10, color: 'var(--ob-mute)' }}>→</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Mobile chapter index — list view variant
const MobileIndexList = () => (
  <div style={{ background: 'var(--ob-bg)', height: '100%', overflow: 'auto' }}>
    <div style={{ padding: '8px 18px', display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--ob-mono)', fontSize: 11 }}>
      <span>9:41</span><span>●●● ▮▮</span>
    </div>
    <div style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--ob-line)' }}>
      <button style={{ width: 32, height: 32, border: '1px solid var(--ob-line)', borderRadius: 6, background: 'var(--ob-paper)' }}>≡</button>
      <OBLogo size={20} />
      <div style={{ width: 30, height: 30, borderRadius: 999, background: 'var(--ob-teal)', color: 'var(--ob-teal-ink)', display: 'grid', placeItems: 'center', fontFamily: 'var(--ob-mono)', fontSize: 11, fontWeight: 600 }}>JM</div>
    </div>
    {/* view toggle */}
    <div style={{ display: 'flex', gap: 6, padding: '14px 18px', alignItems: 'center', justifyContent: 'space-between' }}>
      <div className="ob-eyebrow">All chapters · 14</div>
      <div style={{ display: 'flex', gap: 4 }}>
        <OBBracketBtn>Grid</OBBracketBtn>
        <OBBracketBtn active>List</OBBracketBtn>
      </div>
    </div>
    <div style={{ padding: '0 18px 18px' }}>
      {CHAPTERS.map(ch => (
        <div key={ch.n} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 24px', gap: 12, alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--ob-line)' }}>
          <div style={{ width: 50, height: 65, borderRadius: 4, overflow: 'hidden' }}>
            <ChapterArt ch={ch} h={65} w={50} />
          </div>
          <div>
            <div className="ob-mono" style={{ fontSize: 9, color: 'var(--ob-mute)', marginBottom: 2 }}>CH {ch.n}</div>
            <div className="ob-serif" style={{ fontSize: 16, lineHeight: 1.15, marginBottom: 4 }}>{ch.title}</div>
            {ch.status === 'reading' && (
              <div style={{ height: 2, background: 'rgba(0,0,0,0.08)', maxWidth: 160 }}>
                <div style={{ width: `${ch.progress}%`, height: '100%', background: 'var(--ob-magenta)' }} />
              </div>
            )}
            {ch.status !== 'reading' && (
              <div className="ob-mono" style={{ fontSize: 9, color: 'var(--ob-mute)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {ch.status === 'completed' ? '✓ Read' : `${20 + Math.round(ch.n*1.3)} min`}
              </div>
            )}
          </div>
          <div className="ob-mono" style={{ color: 'var(--ob-mute)', textAlign: 'right' }}>›</div>
        </div>
      ))}
    </div>
  </div>
);

// Mobile reader with contained diagram + expand
const MobileReaderV2 = () => (
  <div style={{ background: 'var(--ob-bg)', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
    <div style={{ padding: '8px 18px', display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--ob-mono)', fontSize: 11 }}>
      <span>9:41</span><span>●●● ▮▮</span>
    </div>
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
      <h1 className="ob-serif" style={{ fontSize: 26, lineHeight: 1.1, margin: 0, marginBottom: 16 }}>Organization and cell types</h1>

      {/* contained diagram with expand */}
      <div style={{ background: 'var(--ob-paper)', border: '1px solid var(--ob-line-strong)', borderRadius: 6, marginBottom: 20, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--ob-line)' }}>
          <div className="ob-eyebrow">Figure 2.1 · Retinal cell types</div>
          <button style={{ width: 28, height: 28, border: '1px solid var(--ob-line)', borderRadius: 6, background: 'transparent', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 2 L5 2 M2 2 L2 5 M10 10 L7 10 M10 10 L10 7 M2 10 L5 10 M2 10 L2 7 M10 2 L7 2 M10 2 L10 5" /></svg>
          </button>
        </div>
        <div style={{ padding: 18 }}>
          <RetinalDiagram />
        </div>
      </div>

      <p className="ob-serif" style={{ fontSize: 16, lineHeight: 1.65, margin: 0 }}>
        The retina is comprised of 5 neuronal classes — <mark style={{ background: 'rgba(244,208,63,0.5)', color: 'inherit' }}>photoreceptors</mark>, horizontal cells, bipolar cells, amacrine cells, and ganglion cells.
      </p>
    </div>
    <div style={{ display: 'flex', borderTop: '1px solid var(--ob-line)', background: 'var(--ob-paper)' }}>
      {[['◇','Read'],['✎','Notes'],['💬','Chat'],['⏷','Tools']].map(([i,l],idx) => (
        <button key={l} style={{ flex: 1, padding: '12px 4px', background: 'transparent', border: 0, fontFamily: 'var(--ob-mono)', fontSize: 10, color: idx === 0 ? 'var(--ob-ink)' : 'var(--ob-mute)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 16 }}>{i}</span>{l}
        </button>
      ))}
    </div>
  </div>
);

// Mobile bottom sheet — peek state
const MobilePanelPeek = () => (
  <div style={{ background: '#000', height: '100%', display: 'flex', flexDirection: 'column' }}>
    {/* faint reader behind */}
    <div style={{ flex: 1, padding: 22, color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--ob-serif)', fontSize: 14, lineHeight: 1.5 }}>
      <div className="ob-eyebrow" style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>Section 2.1</div>
      <p>The retina is comprised of 5 neuronal classes — photoreceptors, horizontal cells, bipolar cells, amacrine cells, and ganglion cells…</p>
    </div>
    {/* peek sheet */}
    <div style={{ background: 'var(--ob-paper)', borderRadius: '16px 16px 0 0', boxShadow: '0 -10px 30px rgba(0,0,0,0.3)' }}>
      <div style={{ display: 'grid', placeItems: 'center', padding: '8px 0' }}><div style={{ width: 36, height: 4, background: 'rgba(0,0,0,0.2)', borderRadius: 999 }} /></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 18px 14px' }}>
        <div className="ob-eyebrow">Notebook</div>
        <div style={{ flex: 1 }} />
        <span className="ob-mono" style={{ fontSize: 11 }}><strong>30</strong> highlights</span>
        <button style={{ width: 28, height: 28, border: '1px solid var(--ob-line)', borderRadius: 6, background: 'transparent', display: 'grid', placeItems: 'center' }}>↑</button>
      </div>
    </div>
  </div>
);

// Mobile bottom sheet — expanded state
const MobilePanelExpanded = () => (
  <div style={{ background: '#000', height: '100%', display: 'flex', flexDirection: 'column' }}>
    <div style={{ height: 60, background: 'rgba(255,255,255,0.06)' }} />
    <div style={{ background: 'var(--ob-paper)', borderRadius: '16px 16px 0 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'grid', placeItems: 'center', padding: '8px 0' }}><div style={{ width: 36, height: 4, background: 'rgba(0,0,0,0.2)', borderRadius: 999 }} /></div>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--ob-line)' }}>
        {['Info','Notebook','Chat'].map((t,i) => (
          <button key={t} style={{ flex: 1, padding: '12px 8px', background: 'transparent', border: 0, borderBottom: `2px solid ${i === 1 ? 'var(--ob-ink)' : 'transparent'}`, fontFamily: 'var(--ob-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: i === 1 ? 'var(--ob-ink)' : 'var(--ob-mute)' }}>{t}</button>
        ))}
        <button style={{ width: 44, background: 'transparent', border: 0, borderLeft: '1px solid var(--ob-line)' }}>↓</button>
      </div>
      <div style={{ display: 'flex', gap: 14, padding: '12px 18px', borderBottom: '1px solid var(--ob-line)' }}>
        {['Highlights 30','Notes','Trending'].map((s,i) => (
          <span key={s} className="ob-mono" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: i === 0 ? 'var(--ob-ink)' : 'var(--ob-mute)' }}>{s}</span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, padding: '10px 18px', borderBottom: '1px solid var(--ob-line)' }}>
        {['#F4D03F','#3DD9B5','#B8D8F8','#F8B8D8','#C8B8E8'].map(c => (
          <button key={c} style={{ width: 24, height: 24, borderRadius: 999, border: 'none', background: c }} />
        ))}
      </div>
      <div style={{ flex: 1, padding: '8px 18px', overflow: 'auto' }}>
        {HIGHLIGHTS.slice(0, 4).map((h, i) => (
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

// Reader v2 — diagram in contained box w/ expand button
const ChapterReaderV2 = ({ dark = false }) => {
  const [expanded, setExpanded] = React.useState(false);
  const ink = dark ? '#f3efe6' : '#0a0a0a';
  const bg = dark ? '#0e1313' : '#f7f5f0';
  const muted = dark ? 'rgba(243,239,230,0.55)' : 'var(--ob-mute)';
  const rule = dark ? 'rgba(243,239,230,0.14)' : 'var(--ob-line)';

  return (
    <div style={{ background: bg, color: ink, minHeight: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <OBTopNav dark={dark} />

      <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 1fr', flex: 1 }}>
        {/* LEFT — diagram in contained box */}
        <div style={{ padding: '32px 32px 32px 48px', borderRight: `1px solid ${rule}` }}>
          <div style={{ position: 'sticky', top: 24 }}>
            <div style={{ background: dark ? '#161c1c' : '#fff', border: `1px solid ${dark ? 'rgba(243,239,230,0.18)' : 'var(--ob-line-strong)'}`, borderRadius: 8, overflow: 'hidden' }}>
              {/* diagram header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${rule}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {dark ? <OBDiagramBadgeLight /> : <OBDiagramBadge />}
                  <span className="ob-eyebrow" style={{ color: muted }}>Figure 2.1</span>
                  <span className="ob-mono" style={{ fontSize: 11 }}>Retinal cell types</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setExpanded(true)} style={{ width: 28, height: 28, border: `1px solid ${rule}`, background: 'transparent', color: ink, borderRadius: 6, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 2 L5 2 M2 2 L2 5 M10 10 L7 10 M10 10 L10 7 M2 10 L5 10 M2 10 L2 7 M10 2 L7 2 M10 2 L10 5" /></svg>
                  </button>
                </div>
              </div>
              {/* diagram body */}
              <div style={{ padding: 28, background: '#fff' }}>
                <RetinalDiagram />
              </div>
              {/* legend */}
              <div style={{ padding: '12px 16px', borderTop: `1px solid ${rule}`, background: dark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.025)', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {['Photoreceptors','Horizontal','Bipolar','Amacrine','Ganglion'].map(c => (
                  <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--ob-mono)', fontSize: 10, color: muted }}>
                    <span style={{ width: 7, height: 7, borderRadius: 999, background: ink }} />{c}
                  </div>
                ))}
              </div>
            </div>
            <div className="ob-mono" style={{ fontSize: 11, color: muted, marginTop: 10, lineHeight: 1.5 }}>
              <em>Click expand to enlarge. Hover layer names to highlight in diagram.</em>
            </div>
          </div>
        </div>

        {/* RIGHT — text */}
        <div style={{ padding: '32px 48px 32px 32px', maxWidth: 720 }}>
          <div className="ob-eyebrow" style={{ marginBottom: 12 }}>Section 2.1</div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 8 }}>
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
            The retina is comprised of 5 neuronal classes — <mark style={{ background: 'rgba(244,208,63,0.45)', color: 'inherit', padding: '0 2px' }}>photoreceptors</mark>, horizontal cells, bipolar cells amacrine cells, and ganglion cells — as well as various glial and vascular cells. Cell bodies of neurons in the vertebrate retina are grouped into 3 distinct layers, separated by 2 synaptic layers. Light passes through the entire retina before being focused on the deepest layer of the retina, where specialized photon detectors called photoreceptors reside.
          </p>
          <p className="ob-serif" style={{ fontSize: 16, lineHeight: 1.65, marginTop: 18, color: ink }}>
            These neurons contain opsins that absorb photons and transduce their energy into electric signals. Photoreceptors extend nerve terminals into a synaptic layer called the outer plexiform layer where they synapse with bipolar and horizontal cells.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 32, paddingTop: 16, borderTop: `1px solid ${rule}` }}>
            <OBChip color={ink}>2 figures</OBChip>
            <OBChip color={ink}>4 references</OBChip>
            <OBChip color="var(--ob-magenta)">3 highlights</OBChip>
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 24px', borderTop: `1px solid ${rule}`, display: 'flex', alignItems: 'center', gap: 14, fontFamily: 'var(--ob-mono)', fontSize: 11 }}>
        <span style={{ color: muted }}>2.1 / 2.7 · 64% read</span>
        <div style={{ flex: 1, height: 2, background: dark ? 'rgba(243,239,230,0.1)' : 'rgba(0,0,0,0.08)' }}>
          <div style={{ width: '64%', height: '100%', background: 'var(--ob-teal)' }} />
        </div>
        <span style={{ color: muted }}>18 min left</span>
        <OBBracketBtn dark={dark}>← Prev</OBBracketBtn>
        <OBBracketBtn dark={dark} active>Next →</OBBracketBtn>
      </div>

      {/* expanded fullscreen overlay */}
      {expanded && (
        <div style={{ position: 'absolute', inset: 0, background: dark ? 'rgba(0,0,0,0.85)' : 'rgba(247,245,240,0.96)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', flexDirection: 'column', padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            {dark ? <OBDiagramBadgeLight /> : <OBDiagramBadge />}
            <span className="ob-eyebrow" style={{ color: muted }}>Figure 2.1 · Expanded</span>
            <span className="ob-mono" style={{ fontSize: 13 }}>Retinal cell types</span>
            <div style={{ flex: 1 }} />
            <button onClick={() => setExpanded(false)} className="ob-btn" style={{ borderColor: ink, color: ink }}>Close ✕</button>
          </div>
          <div style={{ flex: 1, background: '#fff', border: `1px solid ${rule}`, borderRadius: 8, padding: 28, display: 'grid', placeItems: 'center' }}>
            <div style={{ width: '100%', maxWidth: 560 }}><RetinalDiagram /></div>
          </div>
        </div>
      )}
    </div>
  );
};

Object.assign(window, { ChapterOverview, MobileIndexList, MobileReaderV2, MobilePanelPeek, MobilePanelExpanded, ChapterReaderV2, CHAPTER_SECTIONS });
