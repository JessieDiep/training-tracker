import { useNavigate } from 'react-router-dom'

const TABS = [
  {
    id: 'home',
    label: 'Home',
    path: '/',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M3 12L12 4L21 12V20C21 20.55 20.55 21 20 21H15V15H9V21H4C3.45 21 3 20.55 3 20V12Z"
          fill={active ? '#F9D0DF' : 'none'}
          stroke={active ? '#C2185B' : '#B8A0B0'}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: 'log',
    label: 'Log',
    path: '/log',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect
          x="4" y="3" width="16" height="18" rx="3"
          stroke={active ? '#C2185B' : '#B8A0B0'}
          strokeWidth="2"
          fill={active ? '#F9D0DF' : 'none'}
        />
        <path d="M8 8H16M8 12H16M8 16H12" stroke={active ? '#C2185B' : '#B8A0B0'} strokeWidth="2" strokeLinecap="round" />
        <circle cx="19" cy="19" r="5" fill={active ? '#C2185B' : '#B8A0B0'} />
        <path d="M17 19H21M19 17V21" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'progress',
    label: 'Progress',
    path: '/progress',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 20V14M8 20V10M12 20V6M16 20V12M20 20V8"
          stroke={active ? '#C2185B' : '#B8A0B0'}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 'coach',
    label: 'Coach',
    path: '/coach',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 3C7.03 3 3 6.58 3 11C3 13.1 3.87 15.02 5.3 16.5L4 21L8.7 19.3C9.74 19.75 10.84 20 12 20C16.97 20 21 16.42 21 12C21 7.58 16.97 4 12 4"
          stroke={active ? '#C2185B' : '#B8A0B0'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={active ? '#F9D0DF' : 'none'}
        />
        <circle cx="8.5"  cy="11.5" r="1" fill={active ? '#C2185B' : '#B8A0B0'} />
        <circle cx="12"   cy="11.5" r="1" fill={active ? '#C2185B' : '#B8A0B0'} />
        <circle cx="15.5" cy="11.5" r="1" fill={active ? '#C2185B' : '#B8A0B0'} />
      </svg>
    ),
  },
]

export default function BottomNav({ activeTab }) {
  const navigate = useNavigate()

  return (
    <div style={styles.nav}>
      {TABS.map(tab => {
        const active = activeTab === tab.id
        return (
          <button
            key={tab.id}
            style={styles.tab}
            onClick={() => navigate(tab.path)}
            aria-label={tab.label}
          >
            {tab.icon(active)}
            <span style={{ ...styles.label, color: active ? '#C2185B' : '#B8A0B0' }}>
              {tab.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

const styles = {
  nav: {
    display: 'flex',
    background: '#fff',
    borderTop: '1.5px solid #F9D0DF',
    padding: '8px 0 max(16px, env(safe-area-inset-bottom))',
    boxShadow: '0 -4px 16px rgba(244,167,185,0.15)',
    flexShrink: 0,
  },
  tab: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    padding: '4px 0',
  },
  label: {
    fontSize: 9,
    fontWeight: 700,
    fontFamily: 'inherit',
  },
}
