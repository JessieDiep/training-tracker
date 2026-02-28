import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function Auth() {
  const { signIn, signUp } = useAuth()
  const [mode,    setMode]    = useState('login')   // 'login' | 'signup'
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  // Login fields
  const [loginEmail,    setLoginEmail]    = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Sign-up fields
  const [name,          setName]          = useState('')
  const [signupEmail,   setSignupEmail]   = useState('')
  const [signupPassword,setSignupPassword]= useState('')
  const [hasRace,       setHasRace]       = useState(false)
  const [raceName,      setRaceName]      = useState('')
  const [raceDate,      setRaceDate]      = useState('')
  const [raceGoal,      setRaceGoal]      = useState('')
  const [swimDist,      setSwimDist]      = useState('500')
  const [bikeDist,      setBikeDist]      = useState('25')
  const [runDist,       setRunDist]       = useState('5')
  const [injuryFlags,   setInjuryFlags]   = useState('')
  const [trainingPlan,  setTrainingPlan]  = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(loginEmail.trim(), loginPassword)
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignUp(e) {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('Name is required'); return }
    if (!signupEmail.trim()) { setError('Email is required'); return }
    if (signupPassword.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      const profileData = {
        name: name.trim(),
        has_race: hasRace,
        race_date:      hasRace ? raceDate      : null,
        race_name:      hasRace ? raceName.trim()  : null,
        race_goal:      hasRace ? raceGoal.trim()  : null,
        race_distances: hasRace
          ? { swim: Number(swimDist) || 0, bike: Number(bikeDist) || 0, run: Number(runDist) || 0 }
          : {},
        injury_flags: injuryFlags.trim() || 'None',
        training_plan: trainingPlan.trim() || null,
      }
      await signUp(signupEmail.trim(), signupPassword, profileData)
    } catch (err) {
      setError(err.message || 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.shell}>
      <div style={s.phone}>
        <div style={s.scroll}>

          {/* Header */}
          <div style={s.header}>
            <div style={s.logo}>🏃</div>
            <div style={s.appName}>Jess Progressing</div>
            <div style={s.appSub}>Training tracker</div>
          </div>

          {/* Mode toggle */}
          <div style={s.toggle}>
            <button
              style={{ ...s.toggleBtn, ...(mode === 'login' ? s.toggleActive : {}) }}
              onClick={() => { setMode('login'); setError('') }}
            >Log in</button>
            <button
              style={{ ...s.toggleBtn, ...(mode === 'signup' ? s.toggleActive : {}) }}
              onClick={() => { setMode('signup'); setError('') }}
            >Sign up</button>
          </div>

          {error && <div style={s.errorBox}>{error}</div>}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} style={s.form}>
              <label style={s.label}>Email</label>
              <input
                style={s.input}
                type="email"
                placeholder="you@example.com"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                autoComplete="email"
              />

              <label style={s.label}>Password</label>
              <input
                style={s.input}
                type="password"
                placeholder="••••••••"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                autoComplete="current-password"
              />

              <button style={s.submitBtn} type="submit" disabled={loading}>
                {loading ? 'Logging in…' : 'Log in'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} style={s.form}>
              <label style={s.label}>Your name</label>
              <input
                style={s.input}
                type="text"
                placeholder="Jess"
                value={name}
                onChange={e => setName(e.target.value)}
                autoComplete="name"
              />

              <label style={s.label}>Email</label>
              <input
                style={s.input}
                type="email"
                placeholder="you@example.com (can be anything unique)"
                value={signupEmail}
                onChange={e => setSignupEmail(e.target.value)}
                autoComplete="email"
              />

              <label style={s.label}>Password</label>
              <input
                style={s.input}
                type="password"
                placeholder="At least 6 characters"
                value={signupPassword}
                onChange={e => setSignupPassword(e.target.value)}
                autoComplete="new-password"
              />

              {/* Race toggle */}
              <div style={s.toggleRow} onClick={() => setHasRace(v => !v)}>
                <div style={s.toggleRowText}>
                  <div style={s.toggleRowTitle}>Training for a race?</div>
                  <div style={s.toggleRowSub}>Enables race countdown, target splits & race highlights in personal bests</div>
                </div>
                <div style={{ ...s.pill, background: hasRace ? '#E91E8C' : '#E0D0D8' }}>
                  <div style={{ ...s.pillDot, transform: hasRace ? 'translateX(20px)' : 'translateX(0)' }} />
                </div>
              </div>

              {hasRace && (
                <div style={s.raceSection}>
                  <label style={s.label}>Race name</label>
                  <input
                    style={s.input}
                    type="text"
                    placeholder="e.g. Sprint Triathlon"
                    value={raceName}
                    onChange={e => setRaceName(e.target.value)}
                  />

                  <label style={s.label}>Race date</label>
                  <input
                    style={s.input}
                    type="date"
                    value={raceDate}
                    onChange={e => setRaceDate(e.target.value)}
                  />

                  <label style={s.label}>Race goal</label>
                  <input
                    style={s.input}
                    type="text"
                    placeholder="e.g. Finish under 2 hours"
                    value={raceGoal}
                    onChange={e => setRaceGoal(e.target.value)}
                  />

                  <label style={s.label}>Race distances</label>
                  <div style={s.distRow}>
                    <div style={s.distField}>
                      <input
                        style={s.distInput}
                        type="number"
                        value={swimDist}
                        onChange={e => setSwimDist(e.target.value)}
                      />
                      <span style={s.distUnit}>m swim</span>
                    </div>
                    <div style={s.distField}>
                      <input
                        style={s.distInput}
                        type="number"
                        value={bikeDist}
                        onChange={e => setBikeDist(e.target.value)}
                      />
                      <span style={s.distUnit}>km bike</span>
                    </div>
                    <div style={s.distField}>
                      <input
                        style={s.distInput}
                        type="number"
                        value={runDist}
                        onChange={e => setRunDist(e.target.value)}
                      />
                      <span style={s.distUnit}>km run</span>
                    </div>
                  </div>
                </div>
              )}

              <label style={s.label}>Injury / health flags <span style={s.optional}>(optional)</span></label>
              <input
                style={s.input}
                type="text"
                placeholder="e.g. Foot injury — modified run sessions"
                value={injuryFlags}
                onChange={e => setInjuryFlags(e.target.value)}
              />

              {hasRace && (
                <>
                  <label style={s.label}>Weekly training plan <span style={s.optional}>(optional — used by coach)</span></label>
                  <textarea
                    style={s.textarea}
                    placeholder={
                      'Monday: Strength\nTuesday: Run 30 min easy\nWednesday: Rest\n...'
                    }
                    value={trainingPlan}
                    onChange={e => setTrainingPlan(e.target.value)}
                    rows={5}
                  />
                </>
              )}

              <button style={s.submitBtn} type="submit" disabled={loading}>
                {loading ? 'Creating account…' : 'Create account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

const s = {
  shell: {
    minHeight: '100dvh',
    background: 'linear-gradient(135deg, #FFE8F0 0%, #F8E8FF 50%, #E8F4FF 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
  },
  phone: {
    width: '100%',
    maxWidth: 375,
    background: '#FFF8FB',
    borderRadius: 28,
    boxShadow: '0 16px 48px rgba(194,24,91,0.15)',
    overflow: 'hidden',
  },
  scroll: {
    padding: '28px 20px 32px',
    overflowY: 'auto',
    maxHeight: '90dvh',
  },
  header: {
    textAlign: 'center',
    marginBottom: 24,
  },
  logo: {
    fontSize: 40,
    marginBottom: 8,
  },
  appName: {
    fontSize: 22,
    fontWeight: 900,
    color: '#8B1A4A',
    letterSpacing: -0.5,
  },
  appSub: {
    fontSize: 13,
    color: '#C077A0',
    marginTop: 2,
  },
  toggle: {
    display: 'flex',
    background: '#F7E8F0',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    gap: 4,
  },
  toggleBtn: {
    flex: 1,
    border: 'none',
    background: 'transparent',
    borderRadius: 10,
    padding: '8px 0',
    fontSize: 14,
    fontWeight: 700,
    color: '#C077A0',
    cursor: 'pointer',
    fontFamily: "'Nunito', system-ui, sans-serif",
    transition: 'all 0.15s',
  },
  toggleActive: {
    background: '#fff',
    color: '#C2185B',
    boxShadow: '0 2px 8px rgba(194,24,91,0.15)',
  },
  errorBox: {
    background: '#FFEEF3',
    border: '1.5px solid #F4C0D0',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 13,
    color: '#C2185B',
    fontWeight: 600,
    marginBottom: 16,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: 700,
    color: '#8B1A4A',
    marginTop: 12,
    marginBottom: 4,
  },
  optional: {
    fontWeight: 400,
    color: '#C077A0',
  },
  input: {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 12,
    border: '1.5px solid #F4C0D0',
    background: '#FFF8FB',
    fontSize: 14,
    color: '#3D0A1E',
    fontFamily: "'Nunito', system-ui, sans-serif",
    outline: 'none',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 12,
    border: '1.5px solid #F4C0D0',
    background: '#FFF8FB',
    fontSize: 14,
    color: '#3D0A1E',
    fontFamily: "'Nunito', system-ui, sans-serif",
    outline: 'none',
    resize: 'vertical',
    boxSizing: 'border-box',
    lineHeight: 1.5,
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: '#FFF0F6',
    borderRadius: 14,
    padding: '14px 14px',
    marginTop: 14,
    cursor: 'pointer',
    border: '1.5px solid #F4C0D0',
  },
  toggleRowText: { flex: 1 },
  toggleRowTitle: { fontSize: 14, fontWeight: 700, color: '#8B1A4A' },
  toggleRowSub:   { fontSize: 11, color: '#C077A0', marginTop: 2 },
  pill: {
    width: 44,
    height: 24,
    borderRadius: 12,
    flexShrink: 0,
    position: 'relative',
    transition: 'background 0.2s',
  },
  pillDot: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    background: '#fff',
    transition: 'transform 0.2s',
    boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
  },
  raceSection: {
    background: '#FFF0F6',
    borderRadius: 14,
    padding: '8px 14px 14px',
    marginTop: 4,
    border: '1.5px solid #F4C0D0',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  distRow: {
    display: 'flex',
    gap: 8,
  },
  distField: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    alignItems: 'center',
  },
  distInput: {
    width: '100%',
    padding: '9px 8px',
    borderRadius: 10,
    border: '1.5px solid #F4C0D0',
    background: '#FFF8FB',
    fontSize: 15,
    fontWeight: 700,
    color: '#3D0A1E',
    fontFamily: "'Nunito', system-ui, sans-serif",
    outline: 'none',
    textAlign: 'center',
    boxSizing: 'border-box',
  },
  distUnit: {
    fontSize: 10,
    fontWeight: 700,
    color: '#C077A0',
  },
  submitBtn: {
    marginTop: 20,
    width: '100%',
    padding: '14px 0',
    borderRadius: 14,
    border: 'none',
    background: 'linear-gradient(135deg, #F48FB1, #E91E8C)',
    color: '#fff',
    fontSize: 16,
    fontWeight: 800,
    cursor: 'pointer',
    fontFamily: "'Nunito', system-ui, sans-serif",
    boxShadow: '0 4px 16px rgba(233,30,140,0.3)',
  },
}
