// Open Brain — clickable prototype shell
// Wires the existing artboard components into a real navigable app via hash routing.

const useHashRoute = () => {
  const [route, setRoute] = React.useState(window.location.hash.slice(1) || '/');
  React.useEffect(() => {
    const onHash = () => setRoute(window.location.hash.slice(1) || '/');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const nav = React.useCallback((to) => { window.location.hash = to; window.scrollTo(0, 0); }, []);
  return [route, nav];
};

const useIsMobile = () => {
  const [m, setM] = React.useState(window.innerWidth < 768);
  React.useEffect(() => {
    const onR = () => setM(window.innerWidth < 768);
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);
  return m;
};

// ─────────────────────────────────────────────────────────────────
// Top app bar — present on every screen except the index
// ─────────────────────────────────────────────────────────────────
const AppBar = ({ onMenu, onPanel, panelOpen, chapter, section, nav, dark }) => {
  const fg = dark ? '#f3efe6' : '#0a0a0a';
  const muted = dark ? 'rgba(243,239,230,0.55)' : 'var(--ob-mute)';
  const line = dark ? 'rgba(243,239,230,0.14)' : 'var(--ob-line)';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '12px 18px',
      borderBottom: `1px solid ${line}`,
      background: dark ? 'var(--ob-dark-paper, #0e1313)' : 'var(--ob-paper)',
      color: fg,
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      <button onClick={onMenu} title="Menu" style={{ width: 30, height: 30, border: `1px solid ${line}`, borderRadius: 6, background: 'transparent', color: fg, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
        <svg width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.4" fill="none"><path d="M2 4h10M2 7h10M2 10h10" /></svg>
      </button>
      <button onClick={() => nav('/')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 0, color: fg, cursor: 'pointer' }}>
        <OBLogo size={22} color={fg} />
        <span style={{ fontFamily: 'var(--ob-mono)', fontSize: 11, lineHeight: 1.1 }}>the<br/>open brain</span>
      </button>
      <div style={{ width: 1, height: 18, background: line }} />
      {chapter && <div style={{ fontFamily: 'var(--ob-mono)', fontSize: 11, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{chapter}</div>}
      {section && <div style={{ fontFamily: 'var(--ob-mono)', fontSize: 11, color: fg, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{section}</div>}
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => onPanel('info')} className={`ob-btn ob-btn--ghost`} style={{ padding: '5px 10px', fontSize: 10 }}>Info</button>
        <button onClick={() => onPanel('notebook')} className="ob-btn ob-btn--ghost" style={{ padding: '5px 10px', fontSize: 10, background: panelOpen === 'notebook' ? 'rgba(0,0,0,0.06)' : 'transparent' }}>Notebook</button>
        <button onClick={() => onPanel('chat')} className="ob-btn ob-btn--ghost" style={{ padding: '5px 10px', fontSize: 10 }}>Chat</button>
      </div>
      <button onClick={() => nav('/profile')} title="Profile & settings" style={{ width: 30, height: 30, borderRadius: 999, background: 'var(--ob-teal)', color: 'var(--ob-teal-ink)', border: 0, display: 'grid', placeItems: 'center', fontFamily: 'var(--ob-mono)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>JM</button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Index screen — interactive ChapterIndexA-like grid with click-through
// ─────────────────────────────────────────────────────────────────
const IndexScreen = ({ nav }) => {
  const continueCh = CHAPTERS.find(c => c.status === 'reading');
  const completed = CHAPTERS.filter(c => c.status === 'completed').length;
  return (
    <div style={{ background: 'var(--ob-bg)', minHeight: '100vh', padding: '32px 56px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36 }}>
        <OBWordmark scale={0.9} />
        <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          <span className="ob-mono" style={{ fontSize: 11, color: 'var(--ob-mute)' }}>{completed}/{CHAPTERS.length} chapters · 64% overall</span>
          <div style={{ width: 36, height: 36, borderRadius: 999, background: 'var(--ob-teal)', color: 'var(--ob-teal-ink)', display: 'grid', placeItems: 'center', fontFamily: 'var(--ob-mono)', fontSize: 12, fontWeight: 600 }}>JM</div>
        </div>
      </div>
      <hr className="ob-rule" />

      {/* hero row — book title + featured */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 56, margin: '36px 0 48px' }}>
        <div>
          <div className="ob-eyebrow" style={{ marginBottom: 18 }}>BOOK · 14 chapters</div>
          <h1 className="ob-serif" style={{ fontSize: 64, lineHeight: 0.96, margin: 0, letterSpacing: '-0.02em' }}>The Open<br/>Brain</h1>
          <p className="ob-serif" style={{ fontSize: 18, lineHeight: 1.45, color: 'var(--ob-mute)', maxWidth: 360, marginTop: 18 }}>An openly-published textbook on visual neuroscience and human-computer perception.</p>
        </div>
        <button onClick={() => nav(`/read/${continueCh.n}`)} style={{
          textAlign: 'left', background: 'var(--ob-paper)', border: '1px solid var(--ob-line)', borderRadius: 4, padding: 24, cursor: 'pointer',
          display: 'grid', gridTemplateColumns: '180px 1fr', gap: 24, alignItems: 'center',
        }}>
          <div style={{ aspectRatio: '3/4', overflow: 'hidden' }}>
            <ChapterArt ch={continueCh} h={240} w={180} />
          </div>
          <div>
            <div className="ob-eyebrow" style={{ color: 'var(--ob-magenta)', marginBottom: 8 }}>● CONTINUE READING</div>
            <div className="ob-mono" style={{ fontSize: 11, color: 'var(--ob-mute)', marginBottom: 4 }}>CHAPTER {continueCh.n}</div>
            <h2 className="ob-serif" style={{ fontSize: 28, lineHeight: 1.05, margin: 0, marginBottom: 6, letterSpacing: '-0.01em' }}>{continueCh.title}</h2>
            <p className="ob-mono" style={{ fontSize: 11, color: 'var(--ob-mute)', margin: 0, marginBottom: 12 }}>2.3 · How the brain constructs visual perception · 5 min remaining</p>
            <div style={{ height: 3, background: 'rgba(0,0,0,0.08)', marginBottom: 6 }}>
              <div style={{ width: `${continueCh.progress}%`, height: '100%', background: 'var(--ob-magenta)' }} />
            </div>
            <div className="ob-mono" style={{ fontSize: 10, color: 'var(--ob-mute)' }}>{continueCh.progress}% · 4 of 7 sections done</div>
          </div>
        </button>
      </div>

      <hr className="ob-rule" />
      <div className="ob-eyebrow" style={{ margin: '24px 0 16px' }}>ALL CHAPTERS</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 28, paddingBottom: 48 }}>
        {CHAPTERS.map(ch => (
          <button key={ch.n} onClick={() => nav(`/chapter/${ch.n}`)} style={{
            textAlign: 'left', background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
          }}>
            <div style={{ aspectRatio: '3/4', overflow: 'hidden', marginBottom: 12, position: 'relative' }}>
              <ChapterArt ch={ch} h={300} w={220} />
              {ch.status === 'completed' && <div style={{ position: 'absolute', top: 8, right: 8, background: 'var(--ob-ink)', color: 'var(--ob-paper)', fontFamily: 'var(--ob-mono)', fontSize: 10, padding: '2px 8px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.1em' }}>✓ Done</div>}
              {ch.status === 'reading' && <div style={{ position: 'absolute', top: 8, right: 8, background: 'var(--ob-magenta)', color: '#fff', fontFamily: 'var(--ob-mono)', fontSize: 10, padding: '2px 8px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Reading</div>}
            </div>
            <div className="ob-mono" style={{ fontSize: 11, color: 'var(--ob-mute)', marginBottom: 2 }}>CHAPTER {ch.n}</div>
            <div className="ob-serif" style={{ fontSize: 17, lineHeight: 1.15, fontWeight: 500, marginBottom: 4, letterSpacing: '-0.005em' }}>{ch.title}</div>
            <div className="ob-mono" style={{ fontSize: 10, color: 'var(--ob-mute)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{ch.subtitle}</div>
            {ch.progress > 0 && ch.progress < 100 && (
              <div style={{ height: 2, background: 'rgba(0,0,0,0.08)', marginTop: 8 }}>
                <div style={{ width: `${ch.progress}%`, height: '100%', background: 'var(--ob-magenta)' }} />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Chapter overview screen — sections + entries to reader/quiz/cards
// ─────────────────────────────────────────────────────────────────
const ChapterOverviewScreen = ({ chN, nav }) => {
  const ch = CHAPTERS.find(c => c.n === chN) || CHAPTERS[1];
  const sections = CHAPTER_SECTIONS;
  return (
    <div style={{ background: 'var(--ob-bg)', minHeight: '100vh', padding: '32px 56px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 56 }}>
        <div>
          <div style={{ aspectRatio: '3/4', marginBottom: 18 }}>
            <ChapterArt ch={ch} h={420} w={320} />
          </div>
          <div className="ob-eyebrow" style={{ marginBottom: 4 }}>CHAPTER {ch.n}</div>
          <h1 className="ob-serif" style={{ fontSize: 32, lineHeight: 1.1, margin: 0, marginBottom: 16, letterSpacing: '-0.01em' }}>{ch.title}</h1>
          <div style={{ height: 3, background: 'rgba(0,0,0,0.08)', marginBottom: 8 }}>
            <div style={{ width: `${ch.progress}%`, height: '100%', background: 'var(--ob-teal)' }} />
          </div>
          <div className="ob-mono" style={{ fontSize: 10, color: 'var(--ob-mute)' }}>{ch.progress}% complete · 64 min total</div>

          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={() => nav(`/read/${ch.n}`)} className="ob-btn ob-btn--solid" style={{ width: '100%', padding: '12px' }}>Continue reading →</button>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button onClick={() => nav(`/quiz/${ch.n}`)} className="ob-btn">Take quiz</button>
              <button onClick={() => nav(`/cards/${ch.n}`)} className="ob-btn">Flashcards</button>
            </div>
          </div>
        </div>

        <div>
          <div className="ob-eyebrow" style={{ marginBottom: 18 }}>SECTIONS</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {sections.map(s => {
              const reading = s.status === 'reading';
              const done = s.status === 'done';
              const noteCount = s.notes != null ? s.notes : (done ? [6, 4, 8, 3, 5, 7][s.n.charCodeAt(s.n.length - 1) % 6] : reading ? 4 : 0);
              return (
                <button key={s.n} onClick={() => nav(`/read/${ch.n}?s=${s.n}`)} style={{
                  textAlign: 'left', background: 'transparent', border: 0, borderTop: '1px solid var(--ob-line)',
                  padding: '18px 0', cursor: 'pointer', display: 'grid', gridTemplateColumns: '60px 1fr auto auto auto', gap: 18, alignItems: 'baseline',
                }}>
                  <div className="ob-mono" style={{ fontSize: 12, color: 'var(--ob-mute)' }}>{s.n}</div>
                  <div>
                    <div className="ob-serif" style={{ fontSize: 18, lineHeight: 1.25, fontWeight: 500 }}>{s.title}</div>
                    {reading && <div className="ob-mono" style={{ fontSize: 10, color: 'var(--ob-magenta)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.progress}% · resume</div>}
                  </div>
                  <div className="ob-mono" style={{ fontSize: 10, color: noteCount > 0 ? 'var(--ob-magenta)' : 'var(--ob-mute)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    {noteCount > 0 ? `✎ ${noteCount} note${noteCount === 1 ? '' : 's'}` : '— no notes'}
                  </div>
                  <div className="ob-mono" style={{ fontSize: 10, color: 'var(--ob-mute)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.figures} figs · {s.mins} min</div>
                  <div style={{ width: 16, textAlign: 'right' }}>
                    {done && <span style={{ color: 'var(--ob-teal-ink)' }}>✓</span>}
                  </div>
                </button>
              );
            })}
          </div>

          <hr className="ob-rule" style={{ margin: '32px 0 18px' }} />
          <div className="ob-eyebrow" style={{ marginBottom: 12 }}>FIGURES IN THIS CHAPTER</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <button onClick={() => nav(`/read/${ch.n}?fig=refraction`)} style={{ background: 'var(--ob-paper)', border: '1px solid var(--ob-line)', borderRadius: 4, padding: 12, cursor: 'pointer', textAlign: 'left' }}>
              <div className="ob-mono" style={{ fontSize: 10, color: 'var(--ob-mute)', marginBottom: 4 }}>FIG 2.4 · INTERACTIVE</div>
              <div className="ob-serif" style={{ fontSize: 14 }}>Refraction errors</div>
            </button>
            <button onClick={() => nav(`/read/${ch.n}?fig=photo`)} style={{ background: 'var(--ob-paper)', border: '1px solid var(--ob-line)', borderRadius: 4, padding: 12, cursor: 'pointer', textAlign: 'left' }}>
              <div className="ob-mono" style={{ fontSize: 10, color: 'var(--ob-mute)', marginBottom: 4 }}>FIG 3.2 · INTERACTIVE</div>
              <div className="ob-serif" style={{ fontSize: 14 }}>Phototransduction</div>
            </button>
            <button onClick={() => nav(`/read/${ch.n}?fig=cone`)} style={{ background: 'var(--ob-paper)', border: '1px solid var(--ob-line)', borderRadius: 4, padding: 12, cursor: 'pointer', textAlign: 'left' }}>
              <div className="ob-mono" style={{ fontSize: 10, color: 'var(--ob-mute)', marginBottom: 4 }}>FIG 2.6 · INTERACTIVE</div>
              <div className="ob-serif" style={{ fontSize: 14 }}>Cone sensitivity</div>
            </button>
          </div>

          <hr className="ob-rule" style={{ margin: '32px 0 18px' }} />
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
            <div className="ob-eyebrow">YOUR NOTES · 24 IN THIS CHAPTER</div>
            <button onClick={() => nav(`/read/${ch.n}`)} className="ob-mono" style={{ fontSize: 10, color: 'var(--ob-magenta)', background: 'transparent', border: 0, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em' }}>View all →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { sec: '2.1', col: 'var(--ob-yellow)', kind: 'highlight', text: '"The retina is a thin sheet of neural tissue that lines the inner posterior of the eyeball — and despite being only a third of a millimeter thick, it performs the first several stages of visual processing."', when: '2 days ago' },
              { sec: '2.3', col: 'var(--ob-magenta)', kind: 'note', text: 'Important: refractive errors are about where the focal point lands relative to the retina, not about the retina itself.', when: '1 day ago' },
              { sec: '2.3', col: 'var(--ob-teal)', kind: 'highlight', text: '"Astigmatism… produces not a single blurred point but multiple staggered focal regions."', when: '1 day ago' },
              { sec: '2.4', col: 'var(--ob-magenta)', kind: 'note', text: 'Mnemonic: Rhodopsin → Transducin → PDE → cGMP → channels close → hyperpolarize. "RT-PCH"?', when: 'Today' },
              { sec: '2.5', col: 'var(--ob-yellow)', kind: 'highlight', text: '"Three primary colors are sufficient for full-color reproduction in screens and pigments."', when: 'Today' },
            ].map((n, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '6px 1fr auto', gap: 14, padding: '12px 14px', border: '1px solid var(--ob-line)', borderRadius: 4, background: 'var(--ob-paper)', alignItems: 'start' }}>
                <div style={{ width: 4, alignSelf: 'stretch', background: n.col, borderRadius: 2 }} />
                <div>
                  <div className="ob-mono" style={{ fontSize: 9, color: 'var(--ob-mute)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>§ {n.sec} · {n.kind}</div>
                  <div className="ob-serif" style={{ fontSize: 14, lineHeight: 1.45, fontStyle: n.kind === 'highlight' ? 'italic' : 'normal' }}>{n.text}</div>
                </div>
                <div className="ob-mono" style={{ fontSize: 9, color: 'var(--ob-mute)', textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>{n.when}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Reader screen — chapter prose w/ embedded interactive figure
// ─────────────────────────────────────────────────────────────────
const READER_SECTIONS = [
  {
    id: '2.3',
    title: 'How the brain constructs visual perception',
    fig: 'refraction',
    figLabel: 'Fig 2.4 — Refraction errors',
    paras: [
      'The eye is, for all its complexity, an optical instrument with surprisingly few moving parts. Light enters through the cornea, passes through the pupil, and is focused by the lens onto the retina at the back of the eye. The retina is a thin sheet of neural tissue that lines the inner posterior of the eyeball — and despite being only a third of a millimeter thick, it performs the first several stages of visual processing before the signal ever leaves the eye.',
      'When the optical system fails to focus light precisely on the retina, we call the result a <em>refraction error</em>. The figure to the left lets you toggle between the three most common variants — <mark>myopia, hyperopia, and astigmatism</mark> — and see how a corrective lens shifts the focal point back onto the retina.',
      'Myopia is the best understood: the eyeball is slightly too long, or the cornea too steeply curved, and parallel rays from distant objects converge in front of the retina rather than upon it. The corrective lens is concave — it diverges incoming rays just enough that the eye\'s own focusing apparatus can land them where they belong. Hyperopia is the mirror case, with a converging lens to compensate.',
      'Astigmatism is structurally different. Rather than the eye being too long or short along its principal axis, the cornea or lens has unequal curvature along different meridians — imagine a sphere that has been gently squashed in one direction. Light passing through the steeper meridian focuses sooner than light passing through the shallower one, producing not a single blurred point but multiple staggered focal regions. Cylindrical lenses with their own asymmetric curvature can cancel this out.',
    ],
  },
  {
    id: '2.4',
    title: 'Phototransduction: the photon-to-signal cascade',
    fig: 'photo',
    figLabel: 'Fig 3.2 — Phototransduction cascade',
    paras: [
      'Once light reaches the retina, photoreceptor cells convert it into electrical signals via a cascade called <strong>phototransduction</strong>. The cascade is one of the most thoroughly characterized signal-transduction pathways in biology, and it is responsible for the extraordinary sensitivity of human vision: a fully dark-adapted rod cell can reliably report the absorption of a single photon.',
      'In the dark, rod cells are unusual: they are tonically depolarized, with cyclic GMP holding sodium channels open in the outer segment membrane. This produces a steady inward "dark current" of cations that keeps the cell at roughly −40 mV and causes the synaptic terminal to release glutamate continuously onto downstream bipolar neurons.',
      'A photon changes everything. When it strikes a rhodopsin molecule, the chromophore 11-cis-retinal isomerizes to all-trans-retinal in picoseconds, twisting the surrounding opsin into its activated form. This activated rhodopsin catalyzes the exchange of GDP for GTP on the α-subunit of <em>transducin</em>, which then dissociates and binds <em>phosphodiesterase</em> (PDE).',
      'PDE rapidly hydrolyzes cGMP to GMP. As cytoplasmic cGMP concentration plummets, the cyclic-nucleotide-gated channels close, the dark current is interrupted, and the cell hyperpolarizes. Glutamate release at the synapse falls — and that fall, paradoxically, <em>is</em> the visual signal carried inward toward the brain.',
    ],
  },
  {
    id: '2.5',
    title: 'Cone spectral sensitivity and the trichromatic basis of color',
    fig: 'cone',
    figLabel: 'Fig 2.6 — Cone spectral sensitivity',
    paras: [
      'Spectral sensitivity differs between the three cone types — S, M, and L — each defined by the peak wavelength of its photopigment. Their sensitivity curves overlap considerably, and it is precisely this overlap that allows the brain to disambiguate wavelength from intensity.',
      'A monochromatic 580 nm light, for example, excites L and M cones strongly and S cones weakly. A different spectrum that produces the same ratio of L:M:S excitations will look identical — this is the basis of <em>metamerism</em>, and it is why three primary colors are sufficient for full-color reproduction in screens and pigments.',
      'The most common forms of color vision deficiency arise from a missing or shifted cone pigment. Protanopia (no L cones) and deuteranopia (no M cones) collapse the red-green axis and are by far the most prevalent, affecting about 8% of men of Northern European descent. Tritanopia (no S cones) is much rarer.',
      'These mechanisms — refraction, transduction, and spectral discrimination — collectively define the <em>input layer</em> of the visual system. Everything that happens downstream is the brain\'s interpretation of these signals: a constant act of inference under uncertainty.',
    ],
  },
  {
    id: '2.6',
    title: 'From retina to cortex: the parallel pathways',
    fig: 'photo',
    figLabel: 'Fig 3.2 — Phototransduction cascade',
    paras: [
      'Signals leaving the retina do not travel as a single undifferentiated stream. Even within the optic nerve, axons are already segregated into functionally distinct channels — most prominently the <em>magnocellular</em> and <em>parvocellular</em> pathways, named for the cell layers in the lateral geniculate nucleus where they terminate.',
      'The magnocellular pathway carries information about motion, depth, and overall luminance contrast. Its receptive fields are large, its responses transient, and its conduction velocity high — it is the system you rely on when something moves at the edge of your visual field.',
      'The parvocellular pathway carries fine spatial detail and red-green color information. Its receptive fields are small, its responses sustained, and it dominates central vision and reading. A third koniocellular pathway carries blue-yellow information and projects to a different cortical layer entirely.',
      'These streams remain at least partially segregated all the way through primary visual cortex and into the dorsal ("where") and ventral ("what") streams of higher visual areas. Damage to one pathway can produce remarkably specific deficits: motion blindness, achromatopsia, prosopagnosia.',
    ],
  },
];

const ReaderScreen = ({ chN, fig: figRequested, nav, dark, setModal }) => {
  const ch = CHAPTERS.find(c => c.n === chN) || CHAPTERS[1];
  const fg = dark ? '#f3efe6' : '#0a0a0a';
  const muted = dark ? 'rgba(243,239,230,0.65)' : 'var(--ob-mute)';
  const bg = dark ? '#0e1313' : 'var(--ob-paper)';

  // figure that the user has manually selected (overrides scroll-derived figure)
  const [pinnedFig, setPinnedFig] = React.useState(null);
  // figure derived from which section is currently in view
  const [scrollFig, setScrollFig] = React.useState(figRequested || READER_SECTIONS[0].fig);
  const [scrollFigLabel, setScrollFigLabel] = React.useState(READER_SECTIONS[0].figLabel);
  const sectionRefs = React.useRef([]);

  React.useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      // pick entry with highest intersection ratio
      const visible = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) {
        const idx = Number(visible.target.dataset.sectionIdx);
        const s = READER_SECTIONS[idx];
        setScrollFig(s.fig);
        setScrollFigLabel(s.figLabel);
      }
    }, { rootMargin: '-20% 0px -50% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] });
    sectionRefs.current.forEach(el => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const fig = pinnedFig || scrollFig;
  const figLabel = pinnedFig
    ? (pinnedFig === 'photo' ? 'Fig 3.2 — Phototransduction' : pinnedFig === 'cone' ? 'Fig 2.6 — Cone spectral sensitivity' : 'Fig 2.4 — Refraction errors')
    : scrollFigLabel;
  const FigComponent = fig === 'photo' ? PhotoTransduction : fig === 'cone' ? ConeExplorer : RefractionDiagram;

  return (
    <div style={{ background: bg, color: fg }}>
      {/* Hero band — full width, no side gutters */}
      <div style={{ width: '100%', padding: '56px 56px 32px', boxSizing: 'border-box', borderBottom: '1px solid var(--ob-line)' }}>
        <div className="ob-eyebrow" style={{ color: muted, marginBottom: 12 }}>CHAPTER {ch.n} · {ch.title}</div>
        <h1 className="ob-serif" style={{ fontSize: 88, lineHeight: 0.98, margin: 0, marginBottom: 18, letterSpacing: '-0.025em', fontWeight: 400 }}>The retinal input layer</h1>
        <p className="ob-serif" style={{ fontSize: 24, lineHeight: 1.35, color: muted, maxWidth: 880, margin: 0, fontStyle: 'italic' }}>How the eye delivers signal to the brain — optics, photochemistry, and the first acts of neural computation.</p>
      </div>

      {/* Scrollytelling — large sticky figure (left) drives state from prose (right) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 0, alignItems: 'start' }}>
        {/* Sticky figure column — full pane height, no inner box chrome */}
        <div style={{
          position: 'sticky', top: 56, height: 'calc(100vh - 56px)',
          borderRight: '1px solid var(--ob-line)',
          background: 'var(--ob-paper)',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '14px 24px', borderBottom: '1px solid var(--ob-line)', gap: 12 }}>
            <div className="ob-mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ob-mute)' }}>{figLabel}</div>
            <div className="ob-mono" style={{ fontSize: 9, color: 'var(--ob-magenta)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>● Tracking scroll</div>
            {pinnedFig && <button onClick={() => setPinnedFig(null)} className="ob-mono" style={{ fontSize: 9, color: 'var(--ob-magenta)', textTransform: 'uppercase', letterSpacing: '0.1em', background: 'transparent', border: '1px solid var(--ob-magenta)', padding: '2px 8px', borderRadius: 999, cursor: 'pointer' }}>Pinned · unpin</button>}
            <div style={{ flex: 1 }} />
            <select value={fig} onChange={e => setPinnedFig(e.target.value)} className="ob-mono" style={{ fontSize: 10, padding: '4px 8px', border: '1px solid var(--ob-line)', borderRadius: 4, textTransform: 'uppercase', background: 'transparent' }}>
              <option value="refraction">Refraction</option>
              <option value="photo">Phototransduction</option>
              <option value="cone">Cone sensitivity</option>
            </select>
          </div>
          <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
            <FigComponent />
          </div>
          {/* Section dot indicator at bottom */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '12px 24px', borderTop: '1px solid var(--ob-line)' }}>
            {READER_SECTIONS.map((s, i) => {
              const active = s.fig === scrollFig && !pinnedFig;
              return (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: 999, background: active ? 'var(--ob-magenta)' : 'rgba(0,0,0,0.18)' }} />
                  <span className="ob-mono" style={{ fontSize: 9, color: active ? 'var(--ob-ink)' : 'var(--ob-mute)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>§{s.id}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Prose column — narrower, scrolls inside the page */}
        <article className="ob-serif" style={{ fontSize: 19, lineHeight: 1.65, color: fg, padding: '64px 64px 96px 56px' }}>
          {READER_SECTIONS.map((s, i) => (
            <section key={s.id} ref={el => sectionRefs.current[i] = el} data-section-idx={i} data-screen-label={`Reader ${s.id}`} style={{ marginBottom: 88, scrollMarginTop: 80, minHeight: '70vh' }}>
              <div className="ob-mono" style={{ fontSize: 11, color: 'var(--ob-mute)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>§ {s.id}</div>
              <h2 className="ob-serif" style={{ fontSize: 36, lineHeight: 1.08, margin: 0, marginBottom: 24, letterSpacing: '-0.014em', fontWeight: 500 }}>{s.title}</h2>
              {s.paras.map((p, j) => (
                <p key={j} style={{ margin: '0 0 22px' }} dangerouslySetInnerHTML={{ __html: p }} />
              ))}
            </section>
          ))}

          <div style={{ padding: '28px 28px 24px', background: 'rgba(61,217,181,0.12)', borderRadius: 4, border: '1px solid rgba(61,217,181,0.3)' }}>
            <div className="ob-eyebrow" style={{ marginBottom: 18, color: 'var(--ob-teal-ink)' }}>END OF SECTION · KEY TAKEAWAYS</div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
              {[
                'The retina performs the first stages of visual processing before signal leaves the eye.',
                'Refraction errors arise when the optical system focuses light short of, behind, or unevenly across the retina — corrected with concave, convex, or cylindrical lenses respectively.',
                'Phototransduction converts a single photon into a change in membrane potential through a cascade: rhodopsin → transducin → PDE → cGMP hydrolysis → channel closure.',
                'Three cone types (S/M/L) with overlapping spectral sensitivities allow the brain to disambiguate wavelength from intensity — the basis of trichromacy and metamerism.',
                'Magnocellular and parvocellular pathways carry motion/luminance and detail/color information in parallel from the retina onward.',
              ].map((t, i) => (
                <li key={i} style={{ display: 'grid', gridTemplateColumns: '24px 1fr', gap: 12, alignItems: 'baseline' }}>
                  <span className="ob-mono" style={{ fontSize: 11, color: 'var(--ob-teal-ink)', fontWeight: 600 }}>{String(i + 1).padStart(2, '0')}</span>
                  <span style={{ fontSize: 17, lineHeight: 1.45 }}>{t}</span>
                </li>
              ))}
            </ul>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, padding: '16px 0', borderTop: '1px solid rgba(61,217,181,0.3)', borderBottom: '1px solid rgba(61,217,181,0.3)', marginBottom: 18 }}>
              {[
                { v: '3', l: 'Sessions' },
                { v: '24', l: 'Notes & highlights' },
                { v: '47m', l: 'Reading time' },
                { v: '4/4', l: 'Sections done' },
              ].map((s, i) => (
                <div key={i} style={{ paddingLeft: i === 0 ? 0 : 18, borderLeft: i === 0 ? 0 : '1px solid rgba(61,217,181,0.3)' }}>
                  <div className="ob-serif" style={{ fontSize: 28, lineHeight: 1, color: 'var(--ob-teal-ink)', letterSpacing: '-0.01em', marginBottom: 4 }}>{s.v}</div>
                  <div className="ob-mono" style={{ fontSize: 10, color: 'var(--ob-mute)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.l}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 16, marginBottom: 14, color: 'var(--ob-mute)' }}>Lock it in?</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => setModal('quiz')} className="ob-btn ob-btn--teal">Take 5-question quiz</button>
              <button onClick={() => setModal('cards')} className="ob-btn">Review flashcards</button>
              <button onClick={() => nav(`/chapter/${ch.n}`)} className="ob-btn ob-btn--ghost">Chapter overview</button>
            </div>
          </div>

          <hr className="ob-rule" style={{ margin: '64px 0 28px' }} />
          <div className="ob-eyebrow" style={{ marginBottom: 12 }}>UP NEXT</div>
          <button onClick={() => nav(`/read/03`)} style={{ display: 'flex', gap: 18, alignItems: 'center', padding: 18, border: '1px solid var(--ob-line)', borderRadius: 4, background: 'var(--ob-paper)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
            <div style={{ width: 80, aspectRatio: '3/4', flexShrink: 0 }}><ChapterArt ch={CHAPTERS[2]} h={106} w={80} /></div>
            <div>
              <div className="ob-mono" style={{ fontSize: 10, color: 'var(--ob-mute)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>CHAPTER 03</div>
              <div className="ob-serif" style={{ fontSize: 22, fontWeight: 500, letterSpacing: '-0.005em' }}>{CHAPTERS[2].title}</div>
              <div className="ob-mono" style={{ fontSize: 10, color: 'var(--ob-mute)', marginTop: 4 }}>7 sections · ~52 min</div>
            </div>
            <div style={{ flex: 1 }} />
            <span className="ob-serif" style={{ fontSize: 24, color: 'var(--ob-magenta)' }}>→</span>
          </button>
        </article>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Quiz / Flashcards screens — minimal interactive flows
// ─────────────────────────────────────────────────────────────────
const QuizScreen = ({ chN, nav, embedded }) => {
  const [stage, setStage] = React.useState('start'); // start | q | done
  const [qi, setQi] = React.useState(0);
  const [score, setScore] = React.useState(0);
  const [picked, setPicked] = React.useState(null);

  const QS = [
    { q: 'Which structure focuses light onto the retina?', opts: ['Cornea & lens', 'Pupil', 'Iris', 'Sclera'], correct: 0 },
    { q: 'Myopia means the focal point lands…', opts: ['Behind the retina', 'On the retina', 'Short of the retina', 'On the cornea'], correct: 2 },
    { q: 'Phototransduction begins when a photon activates…', opts: ['Transducin', 'Rhodopsin', 'PDE', 'Ion channel'], correct: 1 },
    { q: 'A concave corrective lens compensates for…', opts: ['Hyperopia', 'Myopia', 'Astigmatism', 'Presbyopia'], correct: 1 },
    { q: 'Trichromatic vision uses how many cone types?', opts: ['Two', 'Three', 'Four', 'One'], correct: 1 },
  ];

  const wrap = (content, opts = {}) => embedded
    ? <div style={{ padding: '40px 36px', display: 'grid', placeItems: 'center', minHeight: 480, ...opts }}>{content}</div>
    : <div style={{ background: 'var(--ob-bg)', minHeight: 'calc(100vh - 56px)', display: 'grid', placeItems: 'center', padding: 36, ...opts }}>{content}</div>;
  const goBack = () => embedded ? nav() : nav(`/chapter/${chN}`);

  if (stage === 'start') return wrap(
      <div style={{ maxWidth: 520, textAlign: 'center' }}>
        <div className="ob-eyebrow" style={{ marginBottom: 16 }}>CHAPTER {chN} · QUIZ</div>
        <h1 className="ob-serif" style={{ fontSize: 44, lineHeight: 1.05, margin: 0, marginBottom: 16, letterSpacing: '-0.015em' }}>Test what you've learned</h1>
        <p className="ob-serif" style={{ fontSize: 18, color: 'var(--ob-mute)', marginBottom: 32 }}>5 questions · about 3 minutes · pulled from your highlights & this section's key terms.</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button onClick={() => { setStage('q'); setQi(0); setScore(0); setPicked(null); }} className="ob-btn ob-btn--solid" style={{ padding: '12px 24px' }}>Start quiz</button>
          <button onClick={goBack} className="ob-btn">Back</button>
        </div>
      </div>
  );

  if (stage === 'done') return wrap(
      <div style={{ maxWidth: 480, textAlign: 'center' }}>
        <div className="ob-eyebrow" style={{ marginBottom: 16 }}>QUIZ COMPLETE</div>
        <h1 className="ob-serif" style={{ fontSize: 64, lineHeight: 1, margin: 0, marginBottom: 12, color: 'var(--ob-magenta)' }}>{score}/5</h1>
        <p className="ob-serif" style={{ fontSize: 20, color: 'var(--ob-mute)', marginBottom: 32 }}>{score === 5 ? 'Perfect score.' : score >= 3 ? 'Solid grasp of the material.' : 'Worth re-reading section 2.3.'}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button onClick={() => { setStage('start'); }} className="ob-btn">Retake</button>
          <button onClick={goBack} className="ob-btn ob-btn--solid">Done</button>
        </div>
      </div>
  );

  const Q = QS[qi];
  return wrap(
      <div style={{ width: '100%', maxWidth: 620 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <span className="ob-mono" style={{ fontSize: 11, color: 'var(--ob-mute)' }}>QUESTION {qi + 1} OF {QS.length}</span>
          <div style={{ flex: 1, height: 2, background: 'rgba(0,0,0,0.08)' }}>
            <div style={{ width: `${((qi + 1) / QS.length) * 100}%`, height: '100%', background: 'var(--ob-magenta)', transition: 'width 320ms ease' }} />
          </div>
        </div>
        <h2 key={qi} className="ob-serif" style={{ fontSize: 28, lineHeight: 1.18, margin: 0, marginBottom: 24, letterSpacing: '-0.01em', animation: 'qFade 320ms ease' }}>{Q.q}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Q.opts.map((opt, i) => {
            const isPicked = picked === i;
            const isCorrect = picked != null && i === Q.correct;
            const isWrong = picked != null && isPicked && i !== Q.correct;
            return (
              <button key={i} disabled={picked != null} onClick={() => { setPicked(i); if (i === Q.correct) setScore(s => s + 1); }} style={{
                textAlign: 'left', padding: '14px 18px',
                border: `1px solid ${isCorrect ? 'var(--ob-teal-ink)' : isWrong ? 'var(--ob-magenta)' : 'var(--ob-line)'}`,
                background: isCorrect ? 'rgba(61,217,181,0.18)' : isWrong ? 'rgba(233,30,140,0.12)' : 'var(--ob-paper)',
                borderRadius: 4, cursor: picked != null ? 'default' : 'pointer',
                fontFamily: 'var(--ob-serif)', fontSize: 17,
                transition: 'background 200ms, border-color 200ms',
              }}>{opt}</button>
            );
          })}
        </div>
        {picked != null && (
          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => {
              if (qi + 1 >= QS.length) setStage('done');
              else { setQi(qi + 1); setPicked(null); }
            }} className="ob-btn ob-btn--solid">{qi + 1 >= QS.length ? 'See results →' : 'Next question →'}</button>
          </div>
        )}
      </div>
  );
};

const FlashcardScreen = ({ chN, nav, embedded }) => {
  const cards = [
    { front: 'Phototransduction', back: 'The biochemical cascade in photoreceptors that converts light into an electrical signal. Eight stages from photon → membrane hyperpolarization.' },
    { front: 'Myopia', back: 'Nearsightedness. The eye focuses light short of the retina. Corrected with a concave (diverging) lens.' },
    { front: 'Hyperopia', back: 'Farsightedness. The eye focuses light beyond the retina. Corrected with a convex (converging) lens.' },
    { front: 'Trichromacy', back: 'The use of three cone types (S, M, L) to discriminate millions of colors across the visible spectrum.' },
    { front: 'Rhodopsin', back: 'The photopigment in rod cells. Activated by a single photon, it triggers the transducin cascade.' },
  ];
  const [i, setI] = React.useState(0);
  const [flipped, setFlipped] = React.useState(false);
  const card = cards[i];

  return (
    <div style={{ background: embedded ? 'transparent' : 'var(--ob-bg)', minHeight: embedded ? 480 : 'calc(100vh - 56px)', padding: embedded ? '40px 36px' : '36px', display: 'grid', placeItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: 560 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <span className="ob-mono" style={{ fontSize: 11, color: 'var(--ob-mute)' }}>CARD {i + 1} / {cards.length}</span>
          {!embedded && <button onClick={() => nav(`/chapter/${chN}`)} className="ob-btn ob-btn--ghost" style={{ fontSize: 10 }}>× Close</button>}
        </div>
        <button onClick={() => setFlipped(f => !f)} style={{
          width: '100%', minHeight: 280,
          perspective: '1200px',
          background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
        }}>
          <div style={{
            position: 'relative', width: '100%', minHeight: 280,
            transformStyle: 'preserve-3d',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            transition: 'transform 600ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}>
            <div style={{
              position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
              background: 'var(--ob-paper)', color: 'var(--ob-ink)',
              border: '1px solid var(--ob-line)', borderRadius: 8, padding: '36px 32px',
              display: 'grid', placeItems: 'center', textAlign: 'center',
            }}>
              <div>
                <div className="ob-eyebrow" style={{ marginBottom: 12, color: 'var(--ob-mute)' }}>TERM</div>
                <div className="ob-serif" style={{ fontSize: 40, letterSpacing: '-0.01em' }}>{card.front}</div>
                <div className="ob-mono" style={{ fontSize: 10, marginTop: 32, color: 'var(--ob-mute)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Tap to reveal</div>
              </div>
            </div>
            <div style={{
              position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              background: 'var(--ob-ink)', color: 'var(--ob-paper)',
              border: '1px solid var(--ob-ink)', borderRadius: 8, padding: '36px 32px',
              display: 'grid', placeItems: 'center', textAlign: 'center',
            }}>
              <div className="ob-serif" style={{ fontSize: 20, lineHeight: 1.45, maxWidth: 440 }}>{card.back}</div>
            </div>
          </div>
        </button>
        <div style={{ marginTop: 18, display: 'flex', gap: 10, justifyContent: 'space-between' }}>
          <button onClick={() => { setI(Math.max(0, i - 1)); setFlipped(false); }} className="ob-btn">← Previous</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setI(Math.min(cards.length - 1, i + 1)); setFlipped(false); }} className="ob-btn">Missed</button>
            <button onClick={() => { setI(Math.min(cards.length - 1, i + 1)); setFlipped(false); }} className="ob-btn ob-btn--teal">Got it ✓</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Floating panel (existing FloatingPanel used as-is)
// ─────────────────────────────────────────────────────────────────
const PanelHost = ({ tab, onClose }) => {
  const W = 380, H = 560, MARGIN = 16;
  const initial = () => ({ x: window.innerWidth - W - 24, y: window.innerHeight - H - 24 });
  const [pos, setPos] = React.useState(initial);
  const [drag, setDrag] = React.useState(null);
  const [dragging, setDragging] = React.useState(false);

  React.useEffect(() => {
    if (!tab) return;
    setPos(p => ({
      x: Math.min(Math.max(MARGIN, p.x), window.innerWidth - W - MARGIN),
      y: Math.min(Math.max(MARGIN, p.y), window.innerHeight - H - MARGIN),
    }));
  }, [tab]);

  React.useEffect(() => {
    if (!drag) return;
    const onMove = (e) => {
      const x = Math.min(Math.max(MARGIN, e.clientX - drag.dx), window.innerWidth - W - MARGIN);
      const y = Math.min(Math.max(MARGIN, e.clientY - drag.dy), window.innerHeight - H - MARGIN);
      setPos({ x, y });
    };
    const onUp = () => { setDrag(null); setDragging(false); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [drag]);

  if (!tab) return null;
  const onHandleDown = (e) => {
    setDrag({ dx: e.clientX - pos.x, dy: e.clientY - pos.y });
    setDragging(true);
    e.preventDefault();
  };

  return (
    <div style={{
      position: 'fixed', left: pos.x, top: pos.y, width: W, height: H,
      zIndex: 200, boxShadow: dragging ? '0 24px 80px rgba(0,0,0,0.28)' : '0 12px 60px rgba(0,0,0,0.18)', borderRadius: 12,
      overflow: 'hidden', background: 'var(--ob-paper)', border: '1px solid var(--ob-line)',
      display: 'flex', flexDirection: 'column',
      transition: dragging ? 'none' : 'box-shadow 200ms ease',
      userSelect: dragging ? 'none' : 'auto',
    }}>
      {/* Drag handle bar */}
      <div onMouseDown={onHandleDown} style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 28,
        cursor: dragging ? 'grabbing' : 'grab',
        zIndex: 4,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'transparent',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(0,0,0,0.18)' }} />
      </div>
      <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 5 }}>
        <button onClick={onClose} style={{ width: 26, height: 26, borderRadius: 999, border: '1px solid var(--ob-line)', background: 'var(--ob-paper)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>×</button>
      </div>
      <div style={{ paddingTop: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <FloatingPanel initialTab={tab} />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Nav popover (left drawer) — simplified inline version
// ─────────────────────────────────────────────────────────────────
const NavDrawer = ({ open, onClose, nav }) => {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300 }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 380, height: '100vh', background: 'var(--ob-paper)', padding: 24,
        display: 'flex', flexDirection: 'column', gap: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <OBWordmark scale={0.8} />
          <button onClick={onClose} className="ob-btn ob-btn--ghost">×</button>
        </div>
        <div className="ob-eyebrow">CONTINUE</div>
        <button onClick={() => { nav('/read/02'); onClose(); }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, border: '1px solid var(--ob-line)', borderRadius: 4, background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
          <div style={{ width: 50, aspectRatio: '3/4' }}><ChapterArt ch={CHAPTERS[1]} h={66} w={50} /></div>
          <div>
            <div className="ob-mono" style={{ fontSize: 10, color: 'var(--ob-mute)' }}>CH 02 · 64%</div>
            <div className="ob-serif" style={{ fontSize: 16, fontWeight: 500 }}>Resume reading</div>
          </div>
        </button>
        <hr className="ob-rule" />
        <div className="ob-eyebrow">JUMP TO</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, overflow: 'auto', flex: 1 }}>
          {CHAPTERS.map(ch => (
            <button key={ch.n} onClick={() => { nav(`/chapter/${ch.n}`); onClose(); }} style={{ display: 'grid', gridTemplateColumns: '32px 1fr auto', gap: 12, padding: '8px 4px', border: 0, background: 'transparent', cursor: 'pointer', textAlign: 'left', alignItems: 'baseline' }}>
              <span className="ob-mono" style={{ fontSize: 11, color: 'var(--ob-mute)' }}>{ch.n}</span>
              <span className="ob-serif" style={{ fontSize: 15 }}>{ch.title}</span>
              {ch.status === 'completed' && <span style={{ color: 'var(--ob-teal-ink)' }}>✓</span>}
              {ch.status === 'reading' && <span className="ob-mono" style={{ fontSize: 9, color: 'var(--ob-magenta)' }}>{ch.progress}%</span>}
            </button>
          ))}
        </div>
        <hr className="ob-rule" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 999, background: 'var(--ob-teal)', color: 'var(--ob-teal-ink)', display: 'grid', placeItems: 'center', fontFamily: 'var(--ob-mono)', fontSize: 12, fontWeight: 600 }}>JM</div>
          <div>
            <div className="ob-serif" style={{ fontSize: 14 }}>Jen Moran</div>
            <div className="ob-mono" style={{ fontSize: 10, color: 'var(--ob-mute)' }}>jen@studio.org · settings</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Review Modal — wraps quiz / flashcards in an animated overlay
// ─────────────────────────────────────────────────────────────────
const ReviewModal = ({ kind, onClose, chN }) => {
  const [mounted, setMounted] = React.useState(false);
  const [closing, setClosing] = React.useState(false);

  React.useEffect(() => {
    if (kind) {
      setClosing(false);
      requestAnimationFrame(() => setMounted(true));
    } else {
      setMounted(false);
    }
  }, [kind]);

  const handleClose = () => {
    setClosing(true);
    setMounted(false);
    setTimeout(() => { onClose(); setClosing(false); }, 280);
  };

  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && kind) handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [kind]);

  if (!kind && !closing) return null;
  const noopNav = () => handleClose();

  return (
    <div onClick={handleClose} style={{
      position: 'fixed', inset: 0, zIndex: 400,
      background: mounted ? 'rgba(10,10,10,0.5)' : 'rgba(10,10,10,0)',
      backdropFilter: mounted ? 'blur(6px)' : 'blur(0px)',
      WebkitBackdropFilter: mounted ? 'blur(6px)' : 'blur(0px)',
      transition: 'background 280ms ease, backdrop-filter 280ms ease',
      display: 'grid', placeItems: 'center', padding: 32,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 760, maxHeight: '90vh',
        background: 'var(--ob-paper)', border: '1px solid var(--ob-line)',
        borderRadius: 12, overflow: 'hidden', position: 'relative',
        boxShadow: '0 20px 80px rgba(0,0,0,0.25)',
        transform: mounted ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.96)',
        opacity: mounted ? 1 : 0,
        transition: 'transform 320ms cubic-bezier(0.2, 0.9, 0.3, 1), opacity 280ms ease',
      }}>
        <button onClick={handleClose} style={{
          position: 'absolute', top: 14, right: 14, zIndex: 5,
          width: 32, height: 32, borderRadius: 999, border: '1px solid var(--ob-line)',
          background: 'var(--ob-paper)', cursor: 'pointer', display: 'grid', placeItems: 'center',
          fontSize: 18, lineHeight: 1, color: 'var(--ob-ink)',
        }}>×</button>
        {kind === 'quiz' && <QuizScreen chN={chN} nav={noopNav} embedded />}
        {kind === 'cards' && <FlashcardScreen chN={chN} nav={noopNav} embedded />}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Top-level app
// ─────────────────────────────────────────────────────────────────
const TheOpenBrainPrototype = () => {
  const [route, nav] = useHashRoute();
  const [panel, setPanel] = React.useState(null);
  const [navOpen, setNavOpen] = React.useState(false);
  const [modal, setModal] = React.useState(null); // 'quiz' | 'cards' | null
  const isMobile = useIsMobile();
  const theme = useThemeManager();

  // parse route
  const [, screen, arg, ...rest] = route.split('/');
  const queryStr = (route.split('?')[1] || '');
  const params = Object.fromEntries(queryStr.split('&').filter(Boolean).map(p => p.split('=').map(decodeURIComponent)));

  // Mobile branch — completely separate UI tree
  if (isMobile && typeof MobileApp !== 'undefined') {
    if (screen === 'profile') return <ProfileMobileScreen nav={nav} theme={theme} onMenu={() => {}} />;
    if (screen === 'login') return <LoginScreen nav={nav} />;
    return <MobileApp route={route} nav={nav} setModal={setModal} modal={modal} ReviewModal={ReviewModal} />;
  }

  // Profile + Login own their own chrome
  if (screen === 'profile') {
    return (
      <div className="proto-shell">
        <ProfileScreen nav={nav} theme={theme} />
      </div>
    );
  }
  if (screen === 'login') {
    return (
      <div className="proto-shell">
        <LoginScreen nav={nav} />
      </div>
    );
  }

  const showAppBar = screen && screen !== '';
  const isReader = screen === 'read';
  const dark = theme.mode === 'dark' || (theme.mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  let chapterLabel = '';
  let sectionLabel = '';
  if (arg) {
    const ch = CHAPTERS.find(c => c.n === arg.split('?')[0]);
    if (ch) chapterLabel = `Ch ${ch.n} · ${ch.title}`;
  }
  if (isReader) sectionLabel = '02 · Visual perception';
  if (screen === 'quiz') sectionLabel = 'Quiz';
  if (screen === 'cards') sectionLabel = 'Flashcards';
  if (screen === 'chapter') sectionLabel = 'Overview';

  return (
    <div className="proto-shell">
      {showAppBar && <AppBar onMenu={() => setNavOpen(true)} onPanel={(t) => setPanel(p => p === t ? null : t)} panelOpen={panel} chapter={chapterLabel} section={sectionLabel} nav={nav} dark={dark} />}

      {(!screen || screen === '') && <IndexScreen nav={nav} />}
      {screen === 'chapter' && <ChapterOverviewScreen chN={(arg || '').split('?')[0]} nav={nav} />}
      {screen === 'read' && <ReaderScreen chN={(arg || '').split('?')[0]} fig={params.fig} nav={nav} dark={dark} setModal={setModal} />}
      {screen === 'quiz' && <QuizScreen chN={(arg || '').split('?')[0]} nav={nav} />}
      {screen === 'cards' && <FlashcardScreen chN={(arg || '').split('?')[0]} nav={nav} />}

      <PanelHost tab={panel} onClose={() => setPanel(null)} />
      <NavDrawer open={navOpen} onClose={() => setNavOpen(false)} nav={nav} />
      <ReviewModal kind={modal} onClose={() => setModal(null)} chN={(arg || '02').split('?')[0]} />
    </div>
  );
};

Object.assign(window, { TheOpenBrainPrototype });
