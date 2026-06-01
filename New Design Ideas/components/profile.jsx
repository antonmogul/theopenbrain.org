// Profile / Login / Settings screens for Open Brain
// Owns theme, font, and reading-preference state via localStorage.

// ─────────────────────────────────────────────────────────────────
// Theme manager — applies data-theme to <html>, syncs to system
// ─────────────────────────────────────────────────────────────────
const THEME_KEY = 'ob.theme';        // 'system' | 'light' | 'dark'
const FONT_KEY = 'ob.fontPair';      // 'newsreader' | 'literata' | 'georgia' | 'sans'
const TYPESIZE_KEY = 'ob.typeSize';  // 'compact' | 'regular' | 'comfortable'
const ACCENT_KEY = 'ob.accent';      // 'magenta' | 'teal' | 'amber' | 'mono'

const useStoredState = (key, initial) => {
  const [v, setV] = React.useState(() => {
    try { const s = localStorage.getItem(key); return s == null ? initial : s; } catch (e) { return initial; }
  });
  const set = (next) => {
    setV(next);
    try { localStorage.setItem(key, next); } catch (e) {}
  };
  return [v, set];
};

const applyTheme = (mode) => {
  const root = document.documentElement;
  if (mode === 'system') {
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
  } else {
    root.setAttribute('data-theme', mode);
  }
};

const applyFont = (pair) => {
  const map = {
    newsreader: { serif: "'Newsreader', Georgia, serif", sans: "'Inter Tight', system-ui, sans-serif" },
    literata: { serif: "'Literata', Georgia, serif", sans: "'Inter Tight', system-ui, sans-serif" },
    georgia: { serif: "Georgia, 'Times New Roman', serif", sans: "system-ui, sans-serif" },
    sans: { serif: "'Inter Tight', system-ui, sans-serif", sans: "'Inter Tight', system-ui, sans-serif" },
  };
  const choice = map[pair] || map.newsreader;
  document.documentElement.style.setProperty('--ob-serif', choice.serif);
  document.documentElement.style.setProperty('--ob-sans', choice.sans);
};

const applyTypeSize = (size) => {
  const root = document.documentElement.style;
  if (size === 'compact')      root.setProperty('font-size', '14.5px');
  else if (size === 'comfortable') root.setProperty('font-size', '17.5px');
  else                          root.setProperty('font-size', '16px');
};

const applyAccent = (accent) => {
  const map = {
    magenta: { primary: '#E91E8C', ink: '#4a0a2c' },
    teal: { primary: '#3DD9B5', ink: '#0a3d33' },
    amber: { primary: '#F4A621', ink: '#3d2700' },
    mono: { primary: '#0a0a0a', ink: '#0a0a0a' },
  };
  const c = map[accent] || map.magenta;
  document.documentElement.style.setProperty('--ob-magenta', c.primary);
  document.documentElement.style.setProperty('--ob-magenta-ink', c.ink);
};

const useThemeManager = () => {
  const [mode, setMode] = useStoredState(THEME_KEY, 'system');
  const [font, setFont] = useStoredState(FONT_KEY, 'newsreader');
  const [size, setSize] = useStoredState(TYPESIZE_KEY, 'regular');
  const [accent, setAccent] = useStoredState(ACCENT_KEY, 'magenta');

  React.useEffect(() => { applyTheme(mode); }, [mode]);
  React.useEffect(() => { applyFont(font); }, [font]);
  React.useEffect(() => { applyTypeSize(size); }, [size]);
  React.useEffect(() => { applyAccent(accent); }, [accent]);

  // Listen to system preference changes when in 'system' mode
  React.useEffect(() => {
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [mode]);

  return { mode, setMode, font, setFont, size, setSize, accent, setAccent };
};

// ─────────────────────────────────────────────────────────────────
// Login screen
// ─────────────────────────────────────────────────────────────────
const LoginScreen = ({ nav, onLogin }) => {
  const [email, setEmail] = React.useState('');
  const [pass, setPass] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const submit = (e) => {
    e?.preventDefault?.();
    setSubmitting(true);
    setTimeout(() => { onLogin?.(); nav('/profile'); }, 350);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ob-bg)', display: 'grid', gridTemplateColumns: '1.05fr 1fr' }}>
      {/* Left — editorial panel */}
      <div style={{
        background: 'var(--ob-ink)', color: 'var(--ob-bg)',
        padding: '56px 64px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        position: 'relative', overflow: 'hidden',
      }}>
        <OBWordmark scale={0.95} />

        <div style={{ position: 'relative', maxWidth: 540 }}>
          <div className="ob-mono" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 18 }}>VOL.II · CH 02 · §2.4 — PHOTOTRANSDUCTION</div>
          <div className="ob-serif" style={{ fontSize: 56, lineHeight: 1.0, letterSpacing: '-0.02em', fontWeight: 400, marginBottom: 22 }}>
            "The retina performs the first stages of visual processing before signal leaves the eye."
          </div>
          <div className="ob-mono" style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.6 }}>— J. ALLEN, OPEN BRAIN</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div className="ob-mono" style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.5 }}>14 chapters · openly licensed · CC BY-SA</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[1,2,3,4,5].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: 999, background: 'rgba(243,239,230,0.6)' }} />)}
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div style={{ padding: '56px 64px', display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 520, width: '100%' }}>
        <div className="ob-eyebrow" style={{ marginBottom: 14 }}>SIGN IN</div>
        <h1 className="ob-serif" style={{ fontSize: 44, lineHeight: 1.05, margin: 0, marginBottom: 12, letterSpacing: '-0.018em', fontWeight: 400 }}>Welcome back.</h1>
        <p className="ob-serif" style={{ fontSize: 17, color: 'var(--ob-mute)', margin: '0 0 36px', lineHeight: 1.5 }}>
          Pick up where you left off — Ch 02 is 64% complete.
        </p>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="ob-mono" style={{ fontSize: 10, color: 'var(--ob-mute)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>EMAIL</span>
            <input className="ob-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jen@studio.org" style={{ fontSize: 18, color: 'var(--ob-ink)' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="ob-mono" style={{ fontSize: 10, color: 'var(--ob-mute)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>PASSWORD</span>
            <input className="ob-input" type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" style={{ fontSize: 18, color: 'var(--ob-ink)' }} />
          </label>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" defaultChecked style={{ accentColor: 'var(--ob-magenta)' }} />
              <span className="ob-mono" style={{ fontSize: 11, color: 'var(--ob-mute)' }}>Remember me</span>
            </label>
            <a href="#" className="ob-mono" style={{ fontSize: 11, color: 'var(--ob-magenta)', textDecoration: 'none' }}>Forgot?</a>
          </div>

          <button type="submit" disabled={submitting} className="ob-btn ob-btn--solid" style={{ padding: '14px 16px', justifyContent: 'center', marginTop: 8 }}>
            {submitting ? 'Signing in…' : 'Sign in →'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
            <hr className="ob-rule-soft" style={{ flex: 1 }} />
            <span className="ob-mono" style={{ fontSize: 10, color: 'var(--ob-mute)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>OR</span>
            <hr className="ob-rule-soft" style={{ flex: 1 }} />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={submit} className="ob-btn" style={{ flex: 1, justifyContent: 'center', padding: '12px' }}>Continue with Google</button>
            <button type="button" onClick={submit} className="ob-btn" style={{ flex: 1, justifyContent: 'center', padding: '12px' }}>SSO</button>
          </div>
        </form>

        <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => nav('/')} className="ob-btn ob-btn--ghost">← Back to book</button>
          <span className="ob-mono" style={{ fontSize: 11, color: 'var(--ob-mute)' }}>New here? <a href="#" style={{ color: 'var(--ob-magenta)', textDecoration: 'none' }}>Create an account</a></span>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Profile / Settings screen — sticky left rail w/ sections
// ─────────────────────────────────────────────────────────────────
const PROFILE_SECTIONS = [
  { id: 'profile', label: 'Profile' },
  { id: 'reading', label: 'Reading & display' },
  { id: 'theme', label: 'Theme & accents' },
  { id: 'notifications', label: 'Email preferences' },
  { id: 'data', label: 'Data & privacy' },
  { id: 'account', label: 'Account' },
];

const ProfileScreen = ({ nav, theme }) => {
  const [activeId, setActiveId] = React.useState('profile');
  const refs = React.useRef({});
  const [name, setName] = React.useState('Jen Moran');
  const [email, setEmail] = React.useState('jen@studio.org');
  const [bio, setBio] = React.useState('Designer. Curious about how perception happens. Currently working through Vol. II — vision.');
  const [emailOpts, setEmailOpts] = React.useState({
    weekly: true,
    newChapters: true,
    achievements: false,
    digest: false,
    research: true,
  });

  React.useEffect(() => {
    const onScroll = () => {
      const items = PROFILE_SECTIONS.map(s => ({ id: s.id, top: refs.current[s.id]?.getBoundingClientRect().top ?? 9999 }));
      const visible = items.filter(i => i.top <= 140).pop() || items[0];
      setActiveId(visible.id);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const goTo = (id) => refs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div style={{ background: 'var(--ob-bg)', minHeight: '100vh', color: 'var(--ob-ink)' }}>
      <ProfileTopBar nav={nav} />

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', maxWidth: 1240, margin: '0 auto', padding: '40px 48px 96px', gap: 48 }}>
        {/* Left rail */}
        <aside style={{ position: 'sticky', top: 80, alignSelf: 'flex-start', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ marginBottom: 18 }}>
            <Avatar size={80} initials="JM" />
            <div className="ob-serif" style={{ fontSize: 22, marginTop: 14, letterSpacing: '-0.01em' }}>{name}</div>
            <div className="ob-mono" style={{ fontSize: 11, color: 'var(--ob-mute)', marginTop: 2 }}>{email}</div>
          </div>
          {PROFILE_SECTIONS.map(s => {
            const active = activeId === s.id;
            return (
              <button key={s.id} onClick={() => goTo(s.id)} style={{
                textAlign: 'left', padding: '10px 0', border: 0, background: 'transparent', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12,
                color: active ? 'var(--ob-ink)' : 'var(--ob-mute)',
              }}>
                <span style={{
                  width: 4, height: 16, background: active ? 'var(--ob-magenta)' : 'transparent',
                  transition: 'background 200ms',
                }} />
                <span className="ob-serif" style={{ fontSize: 15, fontWeight: active ? 500 : 400 }}>{s.label}</span>
              </button>
            );
          })}
          <hr className="ob-rule-soft" style={{ margin: '20px 0 12px' }} />
          <button onClick={() => nav('/')} className="ob-btn ob-btn--ghost" style={{ justifyContent: 'flex-start' }}>← Back to book</button>
        </aside>

        {/* Right content */}
        <main style={{ display: 'flex', flexDirection: 'column', gap: 64 }}>
          {/* PROFILE */}
          <section ref={el => refs.current.profile = el} id="profile">
            <SectionHeader eyebrow="01 · PROFILE" title="Edit profile" subtitle="What other readers see when you contribute notes or comments to a chapter." />
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 32, alignItems: 'flex-start' }}>
              <div>
                <Avatar size={120} initials="JM" />
                <button className="ob-btn ob-btn--ghost" style={{ marginTop: 12, padding: '6px 0' }}>Change photo</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                <Field label="DISPLAY NAME">
                  <input className="ob-input" value={name} onChange={e => setName(e.target.value)} style={{ fontSize: 18, color: 'var(--ob-ink)' }} />
                </Field>
                <Field label="EMAIL ADDRESS">
                  <input className="ob-input" value={email} onChange={e => setEmail(e.target.value)} style={{ fontSize: 18, color: 'var(--ob-ink)' }} />
                </Field>
                <Field label="BIO" hint="Shown in note attributions. 280 char max.">
                  <textarea className="ob-input" value={bio} onChange={e => setBio(e.target.value)} rows={3} style={{ fontSize: 16, lineHeight: 1.5, resize: 'vertical', color: 'var(--ob-ink)' }} />
                </Field>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
                  <Field label="ROLE / FIELD">
                    <select className="ob-input" defaultValue="Designer" style={{ fontSize: 16, color: 'var(--ob-ink)' }}>
                      <option>Designer</option>
                      <option>Researcher</option>
                      <option>Educator</option>
                      <option>Student</option>
                      <option>Engineer</option>
                      <option>Other</option>
                    </select>
                  </Field>
                  <Field label="LOCATION">
                    <input className="ob-input" defaultValue="Brooklyn, NY" style={{ fontSize: 16, color: 'var(--ob-ink)' }} />
                  </Field>
                </div>
                <div>
                  <button className="ob-btn ob-btn--solid" style={{ padding: '10px 18px' }}>Save changes</button>
                  <button className="ob-btn ob-btn--ghost" style={{ marginLeft: 6 }}>Cancel</button>
                </div>
              </div>
            </div>
          </section>

          <SectionDivider />

          {/* READING & DISPLAY */}
          <section ref={el => refs.current.reading = el} id="reading">
            <SectionHeader eyebrow="02 · READING & DISPLAY" title="Type & layout" subtitle="Choose the typeface pairing and reading size that work best for your eyes. Changes preview immediately." />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              <Field label="FONT PAIRING">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginTop: 8 }}>
                  <FontSpecimenCard
                    id="newsreader" current={theme.font} onSelect={theme.setFont}
                    name="Newsreader · Inter Tight" sample="Phototransduction"
                    serif="'Newsreader', Georgia, serif" sans="'Inter Tight', sans-serif" tag="DEFAULT"
                  />
                  <FontSpecimenCard
                    id="literata" current={theme.font} onSelect={theme.setFont}
                    name="Literata · Inter Tight" sample="Phototransduction"
                    serif="'Literata', Georgia, serif" sans="'Inter Tight', sans-serif" tag="LITERARY"
                  />
                  <FontSpecimenCard
                    id="georgia" current={theme.font} onSelect={theme.setFont}
                    name="Georgia · System sans" sample="Phototransduction"
                    serif="Georgia, 'Times New Roman', serif" sans="system-ui, sans-serif" tag="SYSTEM"
                  />
                  <FontSpecimenCard
                    id="sans" current={theme.font} onSelect={theme.setFont}
                    name="Inter Tight only" sample="Phototransduction"
                    serif="'Inter Tight', sans-serif" sans="'Inter Tight', sans-serif" tag="SANS-SERIF"
                  />
                </div>
              </Field>

              <Field label="READING SIZE">
                <SegmentedControl
                  value={theme.size} onChange={theme.setSize}
                  options={[
                    { value: 'compact', label: 'Compact', sub: '14.5px' },
                    { value: 'regular', label: 'Regular', sub: '16px' },
                    { value: 'comfortable', label: 'Comfortable', sub: '17.5px' },
                  ]}
                />
              </Field>

              <Field label="LINE LENGTH" hint="Optimum measure for reading is 60–80 characters per line.">
                <SegmentedControl
                  value="standard" onChange={() => {}}
                  options={[
                    { value: 'tight', label: 'Tight', sub: '52ch' },
                    { value: 'standard', label: 'Standard', sub: '68ch' },
                    { value: 'wide', label: 'Wide', sub: '84ch' },
                  ]}
                />
              </Field>

              <Field label="DIAGRAMS">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <ToggleRow label="Auto-play step diagrams" hint="Cascade diagrams advance automatically as you scroll past." defaultChecked />
                  <ToggleRow label="Reduce motion" hint="Disable transitions and parallax. Honors prefers-reduced-motion." />
                  <ToggleRow label="Show figure captions inline" hint="Otherwise captions appear on hover/tap." defaultChecked />
                </div>
              </Field>
            </div>
          </section>

          <SectionDivider />

          {/* THEME */}
          <section ref={el => refs.current.theme = el} id="theme">
            <SectionHeader eyebrow="03 · THEME & ACCENTS" title="Light, dark, or follow system" subtitle="Open Brain syncs with your operating-system preference by default. Override below if you'd rather always read in one mode." />

            <Field label="APPEARANCE">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 8 }}>
                <ThemeCard
                  id="system" current={theme.mode} onSelect={theme.setMode}
                  label="System" sub="Follow OS"
                  preview={<ThemePreview kind="split" />}
                />
                <ThemeCard
                  id="light" current={theme.mode} onSelect={theme.setMode}
                  label="Light" sub="Always paper"
                  preview={<ThemePreview kind="light" />}
                />
                <ThemeCard
                  id="dark" current={theme.mode} onSelect={theme.setMode}
                  label="Dark" sub="Always ink"
                  preview={<ThemePreview kind="dark" />}
                />
              </div>
            </Field>

            <Field label="ACCENT COLOR" hint="Used for highlights, progress bars, magenta annotations, and active states.">
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                {[
                  { id: 'magenta', label: 'Magenta', color: '#E91E8C' },
                  { id: 'teal', label: 'Teal', color: '#3DD9B5' },
                  { id: 'amber', label: 'Amber', color: '#F4A621' },
                  { id: 'mono', label: 'Monochrome', color: '#0a0a0a' },
                ].map(a => {
                  const active = theme.accent === a.id;
                  return (
                    <button key={a.id} onClick={() => theme.setAccent(a.id)} style={{
                      flex: 1, padding: '14px 16px',
                      border: `1px solid ${active ? 'var(--ob-line-strong)' : 'var(--ob-line)'}`,
                      borderRadius: 4, background: 'var(--ob-paper)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                    }}>
                      <div style={{ width: 24, height: 24, borderRadius: 999, background: a.color, border: '1px solid rgba(0,0,0,0.1)', flex: 'none' }} />
                      <div style={{ flex: 1 }}>
                        <div className="ob-serif" style={{ fontSize: 15, color: 'var(--ob-ink)' }}>{a.label}</div>
                      </div>
                      {active && <span className="ob-mono" style={{ fontSize: 9, color: 'var(--ob-magenta)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>● Active</span>}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="HIGHLIGHTER PALETTE" hint="Colors available when highlighting prose. Hidden colors won't appear in the picker.">
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                {[
                  { c: '#F4D03F', label: 'Yellow' },
                  { c: '#F8B8D8', label: 'Pink' },
                  { c: '#B8D8F8', label: 'Blue' },
                  { c: '#B8E8C8', label: 'Green' },
                  { c: '#C8B8E8', label: 'Purple' },
                ].map(h => (
                  <label key={h.c} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: '1px solid var(--ob-line)', borderRadius: 999, cursor: 'pointer' }}>
                    <input type="checkbox" defaultChecked style={{ accentColor: h.c }} />
                    <span style={{ width: 14, height: 14, background: h.c, borderRadius: 4 }} />
                    <span className="ob-mono" style={{ fontSize: 11, color: 'var(--ob-ink)' }}>{h.label}</span>
                  </label>
                ))}
              </div>
            </Field>
          </section>

          <SectionDivider />

          {/* EMAIL */}
          <section ref={el => refs.current.notifications = el} id="notifications">
            <SectionHeader eyebrow="04 · EMAIL PREFERENCES" title="When we'll write to you" subtitle="We default to a quiet inbox. Turn things on as you need them." />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid var(--ob-line)', borderRadius: 4, overflow: 'hidden' }}>
              {[
                { key: 'weekly', label: 'Weekly reading nudge', hint: 'A gentle Sunday email recapping where you left off and what\'s next.' },
                { key: 'newChapters', label: 'New chapters published', hint: 'When a chapter graduates from draft. About one per quarter.' },
                { key: 'achievements', label: 'Quiz & flashcard milestones', hint: '5-day streaks, perfect quizzes, chapter completions.' },
                { key: 'digest', label: 'Annotation digest', hint: 'Weekly summary of community notes & highlights on chapters you\'re reading.' },
                { key: 'research', label: 'Research-update bulletins', hint: 'When a chapter is updated to reflect new findings, we\'ll tell you what changed.' },
              ].map((row, i, arr) => (
                <div key={row.key} style={{ padding: '16px 20px', borderBottom: i < arr.length - 1 ? '1px solid var(--ob-line)' : 0, display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center', background: 'var(--ob-paper)' }}>
                  <div>
                    <div className="ob-serif" style={{ fontSize: 16, color: 'var(--ob-ink)' }}>{row.label}</div>
                    <div className="ob-serif" style={{ fontSize: 14, color: 'var(--ob-mute)', marginTop: 4, lineHeight: 1.45 }}>{row.hint}</div>
                  </div>
                  <Switch checked={emailOpts[row.key]} onChange={v => setEmailOpts(o => ({ ...o, [row.key]: v }))} />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14 }}>
              <a href="#" className="ob-mono" style={{ fontSize: 11, color: 'var(--ob-magenta)', textDecoration: 'none' }}>Unsubscribe from all →</a>
            </div>
          </section>

          <SectionDivider />

          {/* DATA */}
          <section ref={el => refs.current.data = el} id="data">
            <SectionHeader eyebrow="05 · DATA & PRIVACY" title="Your reading footprint" subtitle="Open Brain stores your highlights, notes, and progress on our servers so you can sync between devices. You can export or delete it at any time." />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, padding: '20px 0', borderTop: '1px solid var(--ob-line)', borderBottom: '1px solid var(--ob-line)', marginBottom: 24 }}>
              {[
                { v: '342', l: 'Highlights' },
                { v: '47', l: 'Notes' },
                { v: '8', l: 'Chapters started' },
                { v: '12.4 MB', l: 'Storage used' },
              ].map((s, i) => (
                <div key={i} style={{ paddingLeft: i === 0 ? 0 : 24, borderLeft: i === 0 ? 0 : '1px solid var(--ob-line)' }}>
                  <div className="ob-serif" style={{ fontSize: 32, lineHeight: 1, marginBottom: 4, letterSpacing: '-0.01em' }}>{s.v}</div>
                  <div className="ob-mono" style={{ fontSize: 10, color: 'var(--ob-mute)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.l}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <ToggleRow label="Allow community to view my notes" hint="Off by default. Notes are private to you unless you explicitly publish." />
              <ToggleRow label="Anonymous reading analytics" hint="Helps us understand which sections are confusing. No identifiable data leaves your device." defaultChecked />
              <ToggleRow label="Use my notes for chapter improvement" hint="Authors review aggregated patterns to revise chapters. Your name is never attached." defaultChecked />
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
              <button className="ob-btn">Download my data</button>
              <button className="ob-btn">Delete reading history</button>
            </div>
          </section>

          <SectionDivider />

          {/* ACCOUNT */}
          <section ref={el => refs.current.account = el} id="account">
            <SectionHeader eyebrow="06 · ACCOUNT" title="Sign-in & subscription" subtitle="" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, border: '1px solid var(--ob-line)', borderRadius: 4, overflow: 'hidden' }}>
              <RowAction label="Change password" hint="Last changed 4 months ago." action="Update" />
              <RowAction label="Two-factor authentication" hint="Off — recommended on for shared devices." action="Enable" />
              <RowAction label="Connected accounts" hint="Google, ORCID" action="Manage" />
              <RowAction label="Subscription" hint="Free tier — Open Brain is free forever, no paywall." action="Sponsor" />
            </div>

            <div style={{ marginTop: 32, padding: '20px 24px', border: '1px solid rgba(233,30,140,0.4)', background: 'rgba(233,30,140,0.06)', borderRadius: 4 }}>
              <div className="ob-eyebrow" style={{ marginBottom: 8, color: 'var(--ob-magenta)' }}>● DANGER ZONE</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center' }}>
                <div>
                  <div className="ob-serif" style={{ fontSize: 16 }}>Delete account</div>
                  <div className="ob-serif" style={{ fontSize: 14, color: 'var(--ob-mute)', marginTop: 4 }}>This permanently removes your profile, notes, and reading progress. We'll send an export first.</div>
                </div>
                <button className="ob-btn" style={{ borderColor: 'var(--ob-magenta)', color: 'var(--ob-magenta)' }}>Delete</button>
              </div>
            </div>

            <div style={{ marginTop: 28 }}>
              <button onClick={() => nav('/login')} className="ob-btn">Sign out</button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Profile mobile screen
// ─────────────────────────────────────────────────────────────────
const ProfileMobileScreen = ({ nav, theme, onMenu }) => {
  return (
    <div style={{ background: 'var(--ob-bg)', minHeight: '100vh', color: 'var(--ob-ink)' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--ob-paper)', borderBottom: '1px solid var(--ob-line)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onMenu} aria-label="Menu" style={{ width: 36, height: 36, border: '1px solid var(--ob-line)', borderRadius: 8, background: 'transparent', cursor: 'pointer', display: 'grid', placeItems: 'center', flex: 'none' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.4" fill="none"><path d="M2 4h10M2 7h10M2 10h10" /></svg>
        </button>
        <div className="ob-serif" style={{ fontSize: 16, flex: 1 }}>Profile & settings</div>
      </div>

      <div style={{ padding: '24px 18px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          <Avatar size={64} initials="JM" />
          <div>
            <div className="ob-serif" style={{ fontSize: 20, letterSpacing: '-0.01em' }}>Jen Moran</div>
            <div className="ob-mono" style={{ fontSize: 11, color: 'var(--ob-mute)' }}>jen@studio.org</div>
          </div>
        </div>

        {/* Theme cards */}
        <div className="ob-eyebrow" style={{ marginBottom: 12, fontSize: 9 }}>APPEARANCE</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 24 }}>
          {[
            { id: 'system', label: 'System', kind: 'split' },
            { id: 'light', label: 'Light', kind: 'light' },
            { id: 'dark', label: 'Dark', kind: 'dark' },
          ].map(t => (
            <ThemeCard key={t.id} id={t.id} current={theme.mode} onSelect={theme.setMode} label={t.label} preview={<ThemePreview kind={t.kind} />} compact />
          ))}
        </div>

        <div className="ob-eyebrow" style={{ marginBottom: 10, fontSize: 9 }}>READING SIZE</div>
        <div style={{ marginBottom: 24 }}>
          <SegmentedControl
            value={theme.size} onChange={theme.setSize}
            options={[
              { value: 'compact', label: 'Compact' },
              { value: 'regular', label: 'Regular' },
              { value: 'comfortable', label: 'Comfort' },
            ]}
          />
        </div>

        <div className="ob-eyebrow" style={{ marginBottom: 10, fontSize: 9 }}>ACCENT</div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { id: 'magenta', color: '#E91E8C' },
            { id: 'teal', color: '#3DD9B5' },
            { id: 'amber', color: '#F4A621' },
            { id: 'mono', color: '#0a0a0a' },
          ].map(a => {
            const active = theme.accent === a.id;
            return (
              <button key={a.id} onClick={() => theme.setAccent(a.id)} aria-label={a.id} style={{
                width: 40, height: 40, borderRadius: 999,
                border: `2px solid ${active ? 'var(--ob-ink)' : 'var(--ob-line)'}`,
                background: a.color, cursor: 'pointer', padding: 2, position: 'relative',
              }}>
                {active && <span style={{ position: 'absolute', inset: 4, borderRadius: 999, border: '2px solid var(--ob-paper)' }} />}
              </button>
            );
          })}
        </div>

        <hr className="ob-rule-soft" style={{ margin: '24px 0' }} />

        <div className="ob-eyebrow" style={{ marginBottom: 12, fontSize: 9 }}>EMAIL PREFERENCES</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid var(--ob-line)', borderRadius: 4, overflow: 'hidden', marginBottom: 24 }}>
          {[
            { label: 'Weekly reading nudge', def: true },
            { label: 'New chapters', def: true },
            { label: 'Achievements', def: false },
            { label: 'Annotation digest', def: false },
            { label: 'Research updates', def: true },
          ].map((r, i, arr) => (
            <div key={i} style={{ padding: '12px 14px', borderBottom: i < arr.length - 1 ? '1px solid var(--ob-line)' : 0, display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center', background: 'var(--ob-paper)' }}>
              <div className="ob-serif" style={{ fontSize: 15, color: 'var(--ob-ink)' }}>{r.label}</div>
              <Switch defaultChecked={r.def} />
            </div>
          ))}
        </div>

        <button onClick={() => nav('/')} className="ob-btn ob-btn--ghost" style={{ marginTop: 8, padding: '10px 0', justifyContent: 'flex-start' }}>← Back to book</button>
        <button onClick={() => nav('/login')} className="ob-btn" style={{ marginTop: 8, marginLeft: 6 }}>Sign out</button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Profile chrome — primitives
// ─────────────────────────────────────────────────────────────────
const ProfileTopBar = ({ nav }) => (
  <div style={{
    position: 'sticky', top: 0, zIndex: 50,
    background: 'var(--ob-paper)', borderBottom: '1px solid var(--ob-line)',
    padding: '14px 32px', display: 'flex', alignItems: 'center', gap: 16,
  }}>
    <OBLogo size={22} />
    <div className="ob-mono" style={{ fontSize: 11, color: 'var(--ob-mute)' }}>Settings</div>
    <div style={{ flex: 1 }} />
    <button onClick={() => nav('/')} className="ob-btn ob-btn--ghost">← Back to book</button>
  </div>
);

const Avatar = ({ size = 64, initials = 'JM' }) => (
  <div style={{
    width: size, height: size, borderRadius: 999,
    background: 'var(--ob-teal)', color: 'var(--ob-teal-ink)',
    display: 'grid', placeItems: 'center',
    fontFamily: 'var(--ob-mono)', fontSize: size * 0.34, fontWeight: 600,
    border: '1px solid var(--ob-line)',
  }}>{initials}</div>
);

const SectionHeader = ({ eyebrow, title, subtitle }) => (
  <div style={{ marginBottom: 28 }}>
    <div className="ob-eyebrow" style={{ marginBottom: 10 }}>{eyebrow}</div>
    <h2 className="ob-serif" style={{ fontSize: 32, lineHeight: 1.1, margin: 0, marginBottom: 8, letterSpacing: '-0.012em', fontWeight: 500, color: 'var(--ob-ink)' }}>{title}</h2>
    {subtitle && <p className="ob-serif" style={{ fontSize: 16, lineHeight: 1.5, color: 'var(--ob-mute)', margin: 0, maxWidth: 640 }}>{subtitle}</p>}
  </div>
);

const SectionDivider = () => <hr className="ob-rule-soft" style={{ margin: 0 }} />;

const Field = ({ label, hint, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <div className="ob-mono" style={{ fontSize: 10, color: 'var(--ob-mute)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
    {children}
    {hint && <div className="ob-serif" style={{ fontSize: 13, color: 'var(--ob-mute)', marginTop: 4, lineHeight: 1.45 }}>{hint}</div>}
  </div>
);

const Switch = ({ checked, onChange, defaultChecked }) => {
  const [internal, setInternal] = React.useState(defaultChecked || false);
  const isControlled = checked !== undefined;
  const value = isControlled ? checked : internal;
  const set = (v) => { if (!isControlled) setInternal(v); onChange?.(v); };
  return (
    <button onClick={() => set(!value)} role="switch" aria-checked={value} style={{
      width: 44, height: 24, borderRadius: 999, border: 0, padding: 0,
      background: value ? 'var(--ob-magenta)' : 'rgba(0,0,0,0.18)',
      position: 'relative', cursor: 'pointer', transition: 'background 200ms ease',
      flex: 'none',
    }}>
      <span style={{
        position: 'absolute', top: 3, left: value ? 23 : 3, width: 18, height: 18,
        borderRadius: 999, background: '#fff', transition: 'left 200ms ease',
        boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
      }} />
    </button>
  );
};

const ToggleRow = ({ label, hint, defaultChecked }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, padding: '12px 0', alignItems: 'center', borderBottom: '1px solid var(--ob-line)' }}>
    <div>
      <div className="ob-serif" style={{ fontSize: 16, color: 'var(--ob-ink)' }}>{label}</div>
      {hint && <div className="ob-serif" style={{ fontSize: 13, color: 'var(--ob-mute)', marginTop: 4, lineHeight: 1.45 }}>{hint}</div>}
    </div>
    <Switch defaultChecked={defaultChecked} />
  </div>
);

const SegmentedControl = ({ value, onChange, options }) => (
  <div style={{ display: 'flex', border: '1px solid var(--ob-line)', borderRadius: 4, overflow: 'hidden', background: 'var(--ob-paper)', marginTop: 8 }}>
    {options.map((opt, i) => {
      const active = value === opt.value;
      return (
        <button key={opt.value} onClick={() => onChange(opt.value)} style={{
          flex: 1, padding: '12px 14px',
          background: active ? 'var(--ob-ink)' : 'transparent',
          color: active ? 'var(--ob-paper)' : 'var(--ob-ink)',
          border: 0, borderLeft: i > 0 ? '1px solid var(--ob-line)' : 0,
          cursor: 'pointer', textAlign: 'center',
          fontFamily: 'var(--ob-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em',
          fontWeight: active ? 600 : 500,
        }}>
          <div>{opt.label}</div>
          {opt.sub && <div style={{ fontSize: 9, opacity: 0.65, marginTop: 2, fontWeight: 400 }}>{opt.sub}</div>}
        </button>
      );
    })}
  </div>
);

const RowAction = ({ label, hint, action }) => (
  <div style={{ padding: '14px 20px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center', borderBottom: '1px solid var(--ob-line)', background: 'var(--ob-paper)' }}>
    <div>
      <div className="ob-serif" style={{ fontSize: 15, color: 'var(--ob-ink)' }}>{label}</div>
      {hint && <div className="ob-serif" style={{ fontSize: 13, color: 'var(--ob-mute)', marginTop: 2, lineHeight: 1.45 }}>{hint}</div>}
    </div>
    <button className="ob-btn">{action}</button>
  </div>
);

const FontSpecimenCard = ({ id, current, onSelect, name, sample, serif, sans, tag }) => {
  const active = current === id;
  return (
    <button onClick={() => onSelect(id)} style={{
      padding: '18px 20px', textAlign: 'left',
      border: `1px solid ${active ? 'var(--ob-line-strong)' : 'var(--ob-line)'}`,
      background: 'var(--ob-paper)', borderRadius: 4,
      display: 'flex', flexDirection: 'column', gap: 12, cursor: 'pointer',
      position: 'relative',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="ob-mono" style={{ fontSize: 9, color: 'var(--ob-mute)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{tag}</span>
        {active && <span className="ob-mono" style={{ fontSize: 9, color: 'var(--ob-magenta)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>● Active</span>}
      </div>
      <div style={{ fontFamily: serif, fontSize: 32, lineHeight: 1, letterSpacing: '-0.01em', color: 'var(--ob-ink)' }}>{sample}</div>
      <div style={{ fontFamily: sans, fontSize: 12, color: 'var(--ob-mute)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{name}</div>
    </button>
  );
};

const ThemeCard = ({ id, current, onSelect, label, sub, preview, compact }) => {
  const active = current === id;
  return (
    <button onClick={() => onSelect(id)} style={{
      padding: compact ? 8 : 14, textAlign: 'left',
      border: `1px solid ${active ? 'var(--ob-line-strong)' : 'var(--ob-line)'}`,
      background: 'var(--ob-paper)', borderRadius: 4,
      display: 'flex', flexDirection: 'column', gap: 10, cursor: 'pointer',
    }}>
      <div style={{ width: '100%', aspectRatio: compact ? '1.4/1' : '1.6/1', borderRadius: 4, overflow: 'hidden' }}>
        {preview}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div className="ob-serif" style={{ fontSize: compact ? 13 : 15, color: 'var(--ob-ink)' }}>{label}</div>
        {active && <span className="ob-mono" style={{ fontSize: 9, color: 'var(--ob-magenta)' }}>●</span>}
      </div>
      {sub && !compact && <div className="ob-mono" style={{ fontSize: 9, color: 'var(--ob-mute)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{sub}</div>}
    </button>
  );
};

const ThemePreview = ({ kind }) => {
  if (kind === 'split') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100%' }}>
        <div style={{ background: '#f7f5f0', padding: 8, position: 'relative' }}>
          <div style={{ height: 4, width: '60%', background: '#0a0a0a', marginBottom: 4 }} />
          <div style={{ height: 2, width: '80%', background: 'rgba(0,0,0,0.18)', marginBottom: 2 }} />
          <div style={{ height: 2, width: '70%', background: 'rgba(0,0,0,0.18)' }} />
        </div>
        <div style={{ background: '#0e1313', padding: 8 }}>
          <div style={{ height: 4, width: '60%', background: '#f3efe6', marginBottom: 4 }} />
          <div style={{ height: 2, width: '80%', background: 'rgba(243,239,230,0.4)', marginBottom: 2 }} />
          <div style={{ height: 2, width: '70%', background: 'rgba(243,239,230,0.4)' }} />
        </div>
      </div>
    );
  }
  if (kind === 'dark') {
    return (
      <div style={{ background: '#0e1313', padding: 12, height: '100%' }}>
        <div style={{ height: 5, width: '50%', background: '#f3efe6', marginBottom: 6 }} />
        <div style={{ height: 2, width: '85%', background: 'rgba(243,239,230,0.4)', marginBottom: 3 }} />
        <div style={{ height: 2, width: '78%', background: 'rgba(243,239,230,0.4)', marginBottom: 3 }} />
        <div style={{ height: 2, width: '70%', background: 'rgba(243,239,230,0.4)', marginBottom: 8 }} />
        <div style={{ height: 3, width: '30%', background: '#E91E8C' }} />
      </div>
    );
  }
  // light
  return (
    <div style={{ background: '#f7f5f0', padding: 12, height: '100%' }}>
      <div style={{ height: 5, width: '50%', background: '#0a0a0a', marginBottom: 6 }} />
      <div style={{ height: 2, width: '85%', background: 'rgba(0,0,0,0.18)', marginBottom: 3 }} />
      <div style={{ height: 2, width: '78%', background: 'rgba(0,0,0,0.18)', marginBottom: 3 }} />
      <div style={{ height: 2, width: '70%', background: 'rgba(0,0,0,0.18)', marginBottom: 8 }} />
      <div style={{ height: 3, width: '30%', background: '#E91E8C' }} />
    </div>
  );
};

Object.assign(window, {
  LoginScreen, ProfileScreen, ProfileMobileScreen, useThemeManager,
  ThemeCard, ThemePreview, FontSpecimenCard, SegmentedControl, Switch, ToggleRow, Avatar, SectionHeader, SectionDivider, Field, RowAction,
});
