import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const { signIn, signUp, resetPassword, recoveryMode, clearRecoveryMode, continueAsGuest } = useAuth()
  const [mode,    setMode]    = useState('login')   // 'login' | 'signup' | 'forgot' | 'update'
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)

  // Switch to update form when recovery mode is active (set by AuthContext)
  useEffect(() => {
    if (recoveryMode) setMode('update')
  }, [recoveryMode])

  // Login fields
  const [loginEmail,    setLoginEmail]    = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Forgot / update password fields
  const [forgotEmail,   setForgotEmail]   = useState('')
  const [newPassword,   setNewPassword]   = useState('')
  const [confirmPw,     setConfirmPw]     = useState('')

  // Sign-up fields
  const [name,          setName]          = useState('')
  const [signupEmail,   setSignupEmail]   = useState('')
  const [signupPassword,setSignupPassword]= useState('')
  const [hasRace,       setHasRace]       = useState(false)
  const [raceType,      setRaceType]      = useState('tri')  // 'tri' | 'du' | 'run'
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
          ? raceType === 'tri' ? { swim: +swimDist, bike: +bikeDist, run: +runDist }
          : raceType === 'du'  ? { bike: +bikeDist, run: +runDist }
          :                      { run: +runDist }
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

  async function handleForgot(e) {
    e.preventDefault()
    setError('')
    if (!forgotEmail.trim()) { setError('Email is required'); return }
    setLoading(true)
    try {
      await resetPassword(forgotEmail.trim())
      setForgotSent(true)
    } catch (err) {
      setError(err.message || 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdatePassword(e) {
    e.preventDefault()
    setError('')
    if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return }
    if (newPassword !== confirmPw) { setError('Passwords do not match'); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      clearRecoveryMode()
    } catch (err) {
      setError(err.message || 'Failed to update password')
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
            <img src="/icons/logo.svg" alt="Bloctrain" style={s.logo} />
          </div>

          {/* Mode toggle — hidden for forgot/update flows */}
          {(mode === 'login' || mode === 'signup') && (
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
          )}

          {error && <div style={s.errorBox}>{error}</div>}

          {mode === 'update' ? (
            <form onSubmit={handleUpdatePassword} style={s.form}>
              <div style={s.forgotTitle}>Set a new password</div>
              <label style={s.label}>New password</label>
              <input
                style={s.input}
                type="password"
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
              <label style={s.label}>Confirm password</label>
              <input
                style={s.input}
                type="password"
                placeholder="Repeat password"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                autoComplete="new-password"
              />
              <button style={s.submitBtn} type="submit" disabled={loading}>
                {loading ? 'Saving…' : 'Set new password'}
              </button>
            </form>
          ) : mode === 'forgot' ? (
            forgotSent ? (
              <div style={s.successBox}>Check your email for a reset link.</div>
            ) : (
              <form onSubmit={handleForgot} style={s.form}>
                <div style={s.forgotTitle}>Reset your password</div>
                <label style={s.label}>Email</label>
                <input
                  style={s.input}
                  type="email"
                  placeholder="you@example.com"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  autoComplete="email"
                />
                <button style={s.submitBtn} type="submit" disabled={loading}>
                  {loading ? 'Sending…' : 'Send reset email'}
                </button>
                <button type="button" style={s.forgotBack} onClick={() => { setMode('login'); setError('') }}>
                  Back to log in
                </button>
              </form>
            )
          ) : mode === 'login' ? (
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
              <button type="button" style={s.forgotLink} onClick={() => { setMode('forgot'); setError(''); setForgotSent(false) }}>
                Forgot password?
              </button>
              <div style={s.guestDivider}>
                <div style={s.guestDividerLine}/><span>or</span><div style={s.guestDividerLine}/>
              </div>
              <button type="button" style={s.guestLink} onClick={continueAsGuest}>
                Continue as guest
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
                <div style={{ ...s.pill, background: hasRace ? 'var(--t-accent)' : '#E0D0D8' }}>
                  <div style={{ ...s.pillDot, transform: hasRace ? 'translateX(20px)' : 'translateX(0)' }} />
                </div>
              </div>

              {hasRace && (
                <div style={s.raceSection}>
                  <label style={s.label}>Race type</label>
                  <div style={s.raceTypeRow}>
                    {[['tri','Triathlon'],['du','Duathlon'],['run','Running']].map(([v, label]) => (
                      <button key={v} type="button"
                        style={{ ...s.raceTypeBtn, ...(raceType === v ? s.raceTypeBtnActive : {}) }}
                        onClick={() => setRaceType(v)}
                      >{label}</button>
                    ))}
                  </div>

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
                    {raceType === 'tri' && (
                      <div style={s.distField}>
                        <input
                          style={s.distInput}
                          type="number"
                          value={swimDist}
                          onChange={e => setSwimDist(e.target.value)}
                        />
                        <span style={s.distUnit}>m swim</span>
                      </div>
                    )}
                    {(raceType === 'tri' || raceType === 'du') && (
                      <div style={s.distField}>
                        <input
                          style={s.distInput}
                          type="number"
                          value={bikeDist}
                          onChange={e => setBikeDist(e.target.value)}
                        />
                        <span style={s.distUnit}>km bike</span>
                      </div>
                    )}
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
              <div style={s.guestDivider}>
                <div style={s.guestDividerLine}/><span>or</span><div style={s.guestDividerLine}/>
              </div>
              <button type="button" style={s.guestLink} onClick={continueAsGuest}>
                Continue as guest
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
    background: 'linear-gradient(135deg, #DBEAFE 0%, #E0F2FE 50%, #EFF6FF 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
  },
  phone: {
    width: '100%',
    maxWidth: 375,
    background: 'var(--t-bg)',
    borderRadius: 28,
    boxShadow: '0 16px 48px rgba(3,105,161,0.15)',
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
    width: '100%',
    height: 'auto',
  },
  toggle: {
    display: 'flex',
    background: '#DBEAFE',
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
    color: 'var(--t-muted)',
    cursor: 'pointer',
    fontFamily: "'Nunito', system-ui, sans-serif",
    transition: 'all 0.15s',
  },
  toggleActive: {
    background: '#fff',
    color: 'var(--t-active)',
    boxShadow: '0 2px 8px rgba(3,105,161,0.15)',
  },
  errorBox: {
    background: '#EFF6FF',
    border: '1.5px solid var(--t-border)',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 13,
    color: 'var(--t-active)',
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
    color: 'var(--t-dark)',
    marginTop: 12,
    marginBottom: 4,
  },
  optional: {
    fontWeight: 400,
    color: 'var(--t-muted)',
  },
  input: {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 12,
    border: '1.5px solid var(--t-border)',
    background: 'var(--t-bg)',
    fontSize: 14,
    color: '#0C3A5A',
    fontFamily: "'Nunito', system-ui, sans-serif",
    outline: 'none',
    boxSizing: 'border-box',
    WebkitAppearance: 'none',
    appearance: 'none',
  },
  textarea: {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 12,
    border: '1.5px solid var(--t-border)',
    background: 'var(--t-bg)',
    fontSize: 14,
    color: '#0C3A5A',
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
    background: '#E0F2FE',
    borderRadius: 14,
    padding: '14px 14px',
    marginTop: 14,
    cursor: 'pointer',
    border: '1.5px solid var(--t-border)',
  },
  toggleRowText: { flex: 1 },
  toggleRowTitle: { fontSize: 14, fontWeight: 700, color: 'var(--t-dark)' },
  toggleRowSub:   { fontSize: 11, color: 'var(--t-muted)', marginTop: 2 },
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
    background: '#E0F2FE',
    borderRadius: 14,
    padding: '8px 14px 14px',
    marginTop: 4,
    border: '1.5px solid var(--t-border)',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  raceTypeRow: {
    display: 'flex',
    gap: 6,
    marginBottom: 4,
  },
  raceTypeBtn: {
    flex: 1,
    padding: '8px 4px',
    borderRadius: 10,
    border: '1.5px solid var(--t-border)',
    background: 'var(--t-bg)',
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--t-muted)',
    cursor: 'pointer',
    fontFamily: "'Nunito', system-ui, sans-serif",
    transition: 'all 0.15s',
  },
  raceTypeBtnActive: {
    background: 'linear-gradient(135deg, var(--t-soft), var(--t-accent))',
    border: '1.5px solid var(--t-accent)',
    color: '#fff',
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
    border: '1.5px solid var(--t-border)',
    background: 'var(--t-bg)',
    fontSize: 15,
    fontWeight: 700,
    color: '#0C3A5A',
    fontFamily: "'Nunito', system-ui, sans-serif",
    outline: 'none',
    textAlign: 'center',
    boxSizing: 'border-box',
  },
  distUnit: {
    fontSize: 10,
    fontWeight: 700,
    color: 'var(--t-muted)',
  },
  submitBtn: {
    marginTop: 20,
    width: '100%',
    padding: '14px 0',
    borderRadius: 14,
    border: 'none',
    background: 'linear-gradient(135deg, var(--t-soft), var(--t-accent))',
    color: '#fff',
    fontSize: 16,
    fontWeight: 800,
    cursor: 'pointer',
    fontFamily: "'Nunito', system-ui, sans-serif",
    boxShadow: '0 4px 16px rgba(14,165,233,0.3)',
  },
  forgotLink: {
    display: 'block',
    width: '100%',
    background: 'none',
    border: 'none',
    marginTop: 12,
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--t-muted)',
    cursor: 'pointer',
    fontFamily: "'Nunito', system-ui, sans-serif",
    textAlign: 'center',
  },
  forgotBack: {
    display: 'block',
    width: '100%',
    background: 'none',
    border: 'none',
    marginTop: 10,
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--t-muted)',
    cursor: 'pointer',
    fontFamily: "'Nunito', system-ui, sans-serif",
    textAlign: 'center',
  },
  guestDivider: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    margin: '14px 0 2px',
    color: 'var(--t-muted)',
    fontSize: 12,
    fontWeight: 600,
  },
  guestDividerLine: {
    flex: 1,
    height: 1,
    background: 'var(--t-border)',
  },
  guestLink: {
    display: 'block',
    width: '100%',
    background: 'none',
    border: 'none',
    marginTop: 4,
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--t-muted)',
    cursor: 'pointer',
    fontFamily: "'Nunito', system-ui, sans-serif",
    textAlign: 'center',
    textDecoration: 'underline',
    textUnderlineOffset: 3,
  },
  forgotTitle: {
    fontSize: 16,
    fontWeight: 800,
    color: 'var(--t-dark)',
    marginBottom: 4,
  },
  successBox: {
    background: '#E0F2FE',
    border: '1.5px solid var(--t-border)',
    borderRadius: 10,
    padding: '16px 14px',
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--t-active)',
    textAlign: 'center',
    marginTop: 8,
  },
}
