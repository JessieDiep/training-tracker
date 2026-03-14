import { useAuth } from '../contexts/AuthContext'

export default function GuestLock({ title, description }) {
  const { exitGuest } = useAuth()

  return (
    <div style={s.screen}>
      {/* Abstract background suggesting charts */}
      <div style={s.bgWrap} aria-hidden>
        <div style={s.bgRow}>
          <div style={{ ...s.bar, height: 48, background: '#A8E6CF' }} />
          <div style={{ ...s.bar, height: 80, background: '#C9B8F0' }} />
          <div style={{ ...s.bar, height: 60, background: '#FFD4A8' }} />
          <div style={{ ...s.bar, height: 100, background: '#A8E6CF' }} />
          <div style={{ ...s.bar, height: 72, background: '#FFB8C6' }} />
          <div style={{ ...s.bar, height: 56, background: '#C9B8F0' }} />
        </div>
        <div style={s.bgCard} />
        <div style={s.bgCard2} />
      </div>

      {/* Overlay */}
      <div style={s.overlay}>
        <div style={s.lockIcon}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="11" width="18" height="11" rx="3" fill="var(--t-mid)" opacity="0.3"/>
            <rect x="3" y="11" width="18" height="11" rx="3" stroke="var(--t-active)" strokeWidth="2"/>
            <path d="M7 11V7a5 5 0 0110 0v4" stroke="var(--t-active)" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="12" cy="16" r="1.5" fill="var(--t-active)"/>
          </svg>
        </div>
        <div style={s.title}>{title}</div>
        <div style={s.desc}>{description}</div>
        <div style={s.btnRow}>
          <button style={s.signupBtn} onClick={exitGuest}>Sign up</button>
          <button style={s.loginBtn} onClick={exitGuest}>Log in</button>
        </div>
      </div>
    </div>
  )
}

const s = {
  screen: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
    background: 'var(--t-bg)',
    fontFamily: "'Nunito', system-ui, sans-serif",
  },
  bgWrap: {
    position: 'absolute',
    inset: 0,
    padding: '40px 24px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    filter: 'blur(3px)',
    opacity: 0.3,
    pointerEvents: 'none',
  },
  bgRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 10,
    height: 120,
    paddingBottom: 8,
  },
  bar: {
    flex: 1,
    borderRadius: 6,
  },
  bgCard: {
    height: 72,
    background: 'var(--t-surface)',
    borderRadius: 16,
    border: '2px solid var(--t-border)',
  },
  bgCard2: {
    height: 56,
    background: 'var(--t-surface)',
    borderRadius: 16,
    border: '2px solid var(--t-border)',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 32px',
    gap: 12,
  },
  lockIcon: {
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 900,
    color: 'var(--t-dark)',
    textAlign: 'center',
  },
  desc: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--t-muted)',
    textAlign: 'center',
    lineHeight: 1.5,
  },
  btnRow: {
    display: 'flex',
    gap: 10,
    marginTop: 8,
    width: '100%',
  },
  signupBtn: {
    flex: 1,
    padding: '13px 0',
    borderRadius: 14,
    border: 'none',
    background: 'linear-gradient(135deg, var(--t-soft), var(--t-accent))',
    color: '#fff',
    fontSize: 15,
    fontWeight: 800,
    cursor: 'pointer',
    fontFamily: "'Nunito', system-ui, sans-serif",
  },
  loginBtn: {
    flex: 1,
    padding: '13px 0',
    borderRadius: 14,
    border: '2px solid var(--t-border)',
    background: 'var(--t-surface)',
    color: 'var(--t-active)',
    fontSize: 15,
    fontWeight: 800,
    cursor: 'pointer',
    fontFamily: "'Nunito', system-ui, sans-serif",
  },
}
