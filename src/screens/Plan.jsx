import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import GuestLock from '../components/GuestLock'
import { supabase } from '../lib/supabase'
import { getThisWeekWorkouts } from '../lib/workouts'

const DISC_CONFIG = {
  swim: { label: 'Swim', emoji: '🏊', color: '#A8E6CF', dark: '#2D8B6F', bg: '#E8FAF3' },
  bike: { label: 'Bike', emoji: '🚴', color: '#C9B8F0', dark: '#6B4FBB', bg: '#F2EEFF' },
  run:  { label: 'Run',  emoji: '🏃', color: '#FFD4A8', dark: '#C47A2B', bg: '#FFF4E8' },
}

function getMonday(date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0, 0, 0, 0)
  return d
}

function toISODate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function Plan() {
  const { profile, user } = useAuth()
  if (!user) return <GuestLock title="Your Weekly Plan" description="Sign up to get an AI-generated training plan tailored to your race and fitness level." />

  const [weeklyGoals,   setWeeklyGoals]  = useState(null)
  const [accepted,      setAccepted]     = useState(false)
  const [showConfetti,  setShowConfetti] = useState(false)
  const confettiTimer = useRef(null)
  const [weekCompleted,setWeekCompleted]= useState({ swim: 0, bike: 0, run: 0 })
  const [regenLoading, setRegenLoading] = useState(false)
  const [loading,      setLoading]      = useState(true)

  useEffect(() => {
    async function load() {
      try {
        // Fetch this week's logged workouts for completion tracking
        const week = await getThisWeekWorkouts()
        setWeekCompleted({
          swim: week.filter(w => w.discipline === 'swim').length,
          bike: week.filter(w => w.discipline === 'bike').length,
          run:  week.filter(w => w.discipline === 'run').length,
        })

        // Check Supabase cache
        const thisMonday = toISODate(getMonday(new Date()))
        const { data: cached } = await supabase
          .from('weekly_goals')
          .select('goals, accepted')
          .eq('week_start', thisMonday)
          .single()

        if (cached?.goals) {
          setWeeklyGoals(cached.goals)
          setAccepted(cached.accepted ?? false)
          return
        }

        // Not cached — generate via API
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch('/api/weekly-goals', {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ profile }),
        })
        if (res.ok) {
          const json = await res.json()
          if (json.goals) setWeeklyGoals(json.goals)
          setAccepted(json.accepted ?? false)
        }
      } catch (err) {
        console.error('Failed to load weekly plan:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleRegenerate() {
    if (regenLoading) return
    setRegenLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/weekly-goals', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ profile, force: true }),
      })
      if (res.ok) {
        const json = await res.json()
        if (json.goals) setWeeklyGoals(json.goals)
        setAccepted(false)
      }
    } catch (err) {
      console.error('Failed to regenerate goals:', err)
    } finally {
      setRegenLoading(false)
    }
  }

  async function handleAccept() {
    const thisMonday = toISODate(getMonday(new Date()))
    await supabase
      .from('weekly_goals')
      .update({ accepted: true })
      .eq('week_start', thisMonday)
    setAccepted(true)
    setShowConfetti(true)
    clearTimeout(confettiTimer.current)
    confettiTimer.current = setTimeout(() => setShowConfetti(false), 2200)
  }

  return (
    <div style={s.screen}>
      <style>{confettiCss}</style>
      {showConfetti && (
        <div style={s.confettiWrap} aria-hidden="true">
          {CONFETTI_PIECES.map((p, i) => (
            <div key={i} className="confetti-piece" style={{
              left: p.x + '%',
              background: p.color,
              width: p.size,
              height: p.size * 0.55,
              borderRadius: p.round ? '50%' : 2,
              animationDelay: p.delay + 'ms',
              animationDuration: p.dur + 'ms',
            }} />
          ))}
        </div>
      )}
      <div style={s.pageHeader}>
        <div style={s.pageTitle}>Weekly Plan</div>
      </div>

      <div style={s.scroll}>
        {loading && !weeklyGoals ? (
          <div style={s.empty}>Generating your plan…</div>
        ) : weeklyGoals ? (
          <>
            {['swim', 'bike', 'run'].filter(disc => (weeklyGoals[disc]?.length ?? 0) > 0).map(disc => {
              const d        = DISC_CONFIG[disc]
              const sessions = weeklyGoals[disc] ?? []
              const done     = weekCompleted[disc] ?? 0
              const allDone  = sessions.length > 0 && done >= sessions.length
              return (
                <div key={disc} style={{ ...s.discBlock, border: `1.5px solid ${d.color}`, background: d.bg }}>
                  <div style={s.discHeader}>
                    <span style={s.discEmoji}>{d.emoji}</span>
                    <span style={s.discTitle}>{d.label}</span>
                    <span
                      className={allDone ? 'badge-pop' : ''}
                      style={{
                        ...s.discBadge,
                        background: allDone ? '#E8FAF3' : d.color,
                        color:      allDone ? '#2D8B6F' : d.dark,
                      }}>
                      {done}/{sessions.length} done
                    </span>
                  </div>
                  {sessions.map((session, i) => {
                    const isCompleted = i < done
                    return (
                      <div key={i} style={{ ...s.sessionCard, opacity: isCompleted ? 0.55 : 1 }}>
                        <div style={s.sessionTop}>
                          <span style={{ ...s.typePill, background: d.color, color: d.dark }}>
                            {session.type}
                          </span>
                          <span style={s.sessionMeta}>{session.duration} min · Effort {session.effort}/10</span>
                          {isCompleted && <span style={s.check}>✓</span>}
                        </div>
                        <div style={s.structure}>{session.structure}</div>
                      </div>
                    )
                  })}
                </div>
              )
            })}

            {weeklyGoals.rationale && (
              <div style={s.rationaleBox}>
                <span style={s.rationaleLabel}>This week's focus: </span>
                <span style={s.rationaleText}>{weeklyGoals.rationale}</span>
              </div>
            )}

            {!accepted ? (
              <>
                <div style={s.infoBanner}>
                  ✨ Coach generates a fresh plan every Monday based on your recent sessions and race goal.
                  Review it, regenerate if you'd like a different one, then accept to lock it in for the week.
                </div>
                <button style={s.acceptBtn} onClick={handleAccept}>
                  Looks good — let's go 💪
                </button>
              </>
            ) : (
              <div style={s.lockedBanner}>
                <div style={s.lockedTitle}>✓ Plan locked in for this week</div>
                <div style={s.lockedSub}>A new plan will be generated next Monday.</div>
              </div>
            )}
          </>
        ) : (
          <div style={s.empty}>Could not load plan. Tap Regenerate to try again.</div>
        )}

        {!accepted && (
          <div style={s.regenRow}>
            <button style={s.regenLink} onClick={handleRegenerate} disabled={regenLoading}>
              {regenLoading ? 'Generating…' : '↻ Regenerate plan'}
            </button>
          </div>
        )}

        <div style={{ height: 32 }} />
      </div>
    </div>
  )
}

const s = {
  screen:    { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--t-bg)', fontFamily: "'Nunito', system-ui, sans-serif" },
  pageHeader:{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 10px', borderBottom: '1.5px solid var(--t-border)', flexShrink: 0 },
  pageTitle: { fontSize: 17, fontWeight: 900, color: 'var(--t-dark)' },
  regenRow:  { textAlign: 'center', marginTop: 16, paddingBottom: 8 },
  regenLink: { background: 'none', border: 'none', fontSize: 11, fontWeight: 700, color: '#C0A0B8', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' },
  scroll:    { flex: 1, overflowY: 'auto', padding: '14px 16px', scrollbarWidth: 'none' },

  discBlock:  { borderRadius: 14, padding: '12px 14px', marginBottom: 12 },
  discHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
  discEmoji:  { fontSize: 20 },
  discTitle:  { fontSize: 15, fontWeight: 900, color: 'var(--t-text)', flex: 1 },
  discBadge:  { fontSize: 10, fontWeight: 800, borderRadius: 8, padding: '3px 9px' },

  sessionCard:{ background: 'rgba(255,255,255,0.7)', borderRadius: 10, padding: '9px 10px', marginBottom: 7 },
  sessionTop: { display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5, flexWrap: 'wrap' },
  typePill:   { fontSize: 11, fontWeight: 800, borderRadius: 7, padding: '3px 9px' },
  sessionMeta:{ fontSize: 11, fontWeight: 700, color: 'var(--t-muted)', flex: 1 },
  check:      { fontSize: 14, color: '#2D8B6F', fontWeight: 900 },
  structure:  { fontSize: 12, color: 'var(--t-subtext)', lineHeight: 1.5, fontWeight: 600 },

  rationaleBox:  { background: 'var(--t-surface)', borderRadius: 12, padding: '10px 14px', marginTop: 4 },
  rationaleLabel:{ fontSize: 11, fontWeight: 800, color: 'var(--t-active)' },
  rationaleText: { fontSize: 12, color: 'var(--t-subtext)', fontStyle: 'italic', fontWeight: 600 },

  empty: { textAlign: 'center', color: '#C0A0B8', fontSize: 13, fontWeight: 600, padding: '32px 0' },

  infoBanner:   { background: 'var(--t-surface)', borderRadius: 12, padding: '10px 14px', fontSize: 12, color: 'var(--t-muted)', fontWeight: 600, lineHeight: 1.5, marginTop: 12 },
  acceptBtn:    { width: '100%', background: 'linear-gradient(135deg, var(--t-soft), var(--t-accent))', border: 'none', borderRadius: 14, padding: '14px 0', fontSize: 16, fontWeight: 800, color: '#fff', cursor: 'pointer', fontFamily: "'Nunito', system-ui, sans-serif", boxShadow: '0 4px 16px var(--t-phone-shadow)', marginTop: 16 },
  lockedBanner: { background: '#E8FAF3', borderRadius: 12, padding: '12px 14px', marginTop: 12, textAlign: 'center' },
  lockedTitle:  { fontSize: 13, fontWeight: 800, color: '#2D8B6F' },
  lockedSub:    { fontSize: 11, fontWeight: 600, color: '#5A8A78', marginTop: 3 },

  confettiWrap: { position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 50 },
}

// ── CONFETTI ──────────────────────────────────────────────────────────────────
const COLORS = ['var(--t-soft)', 'var(--t-accent)', '#C9B8F0', '#A8E6CF', '#FFD4A8', 'var(--t-soft)', '#fff']
const CONFETTI_PIECES = Array.from({ length: 48 }, (_, i) => ({
  x:     Math.random() * 100,
  size:  6 + Math.random() * 7,
  color: COLORS[i % COLORS.length],
  delay: Math.random() * 400,
  dur:   1400 + Math.random() * 600,
  round: Math.random() > 0.6,
}))

const confettiCss = `
@keyframes confetti-fall {
  0%   { transform: translateY(-20px) rotate(0deg);   opacity: 1; }
  80%  { opacity: 1; }
  100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
}
.confetti-piece {
  position: absolute;
  top: 0;
  animation: confetti-fall linear forwards;
}
@keyframes badge-pop {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.35); }
  70%  { transform: scale(0.9); }
  100% { transform: scale(1); }
}
.badge-pop {
  animation: badge-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
`
