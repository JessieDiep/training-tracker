import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getThisWeekWorkouts,
  getRecentWorkouts,
  saveWorkout,
  getDiscEmoji,
  getDiscStyle,
  formatWorkoutDetail,
  formatRelativeDate,
} from '../lib/workouts'

const RACE_DATE = new Date(2026, 6, 18) // July 18, 2026 (month is 0-indexed)

const DISCIPLINES = [
  { id: 'swim',     label: 'Swim',  emoji: '🏊', color: '#A8E6CF', dark: '#2D8B6F', bg: '#E8FAF3' },
  { id: 'bike',     label: 'Bike',  emoji: '🚴', color: '#C9B8F0', dark: '#6B4FBB', bg: '#F2EEFF' },
  { id: 'run',      label: 'Run',   emoji: '🏃', color: '#FFD4A8', dark: '#C47A2B', bg: '#FFF4E8' },
  { id: 'strength', label: 'Lift',  emoji: '💪', color: '#FFF3A8', dark: '#B8960A', bg: '#FFFBE8' },
  { id: 'climb',    label: 'Climb', emoji: '🧗', color: '#FFB8C6', dark: '#C4354F', bg: '#FFE8EE' },
]

// Weekly session goals per discipline
const WEEKLY_GOALS = { swim: 2, bike: 2, run: 1, strength: 1, climb: 1 }

const MOODS = ['😴', '💪', '🔥', '😤', '💀']

export default function Home() {
  const navigate = useNavigate()

  const [daysLeft,          setDaysLeft]          = useState(0)
  const [weekWorkouts,      setWeekWorkouts]      = useState([])
  const [recentWorkouts,    setRecentWorkouts]    = useState([])
  const [loading,           setLoading]           = useState(true)
  const [fetchError,        setFetchError]        = useState(false)

  // Modal state
  const [showLogModal,      setShowLogModal]      = useState(false)
  const [selectedDisc,      setSelectedDisc]      = useState(null)
  const [duration,          setDuration]          = useState(30)
  const [effort,            setEffort]            = useState(0)
  const [mood,              setMood]              = useState(null)
  const [saving,            setSaving]            = useState(false)
  const [saved,             setSaved]             = useState(false)

  useEffect(() => {
    // Compare date-only (no time) so the count is always whole days
    function calcDays() {
      const now   = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const diff  = Math.round((RACE_DATE - today) / 86400000)
      setDaysLeft(Math.max(diff, 0))
    }

    calcDays()

    // Milliseconds until next midnight in Eastern Time
    function msUntilETMidnight() {
      const now   = new Date()
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false,
      }).formatToParts(now)
      const h = parseInt(parts.find(p => p.type === 'hour').value)
      const m = parseInt(parts.find(p => p.type === 'minute').value)
      const s = parseInt(parts.find(p => p.type === 'second').value)
      return ((23 - h) * 3600 + (59 - m) * 60 + (60 - s)) * 1000
    }

    // Fire once at ET midnight, then every 24 h after that
    let intervalId
    const timeoutId = setTimeout(() => {
      calcDays()
      intervalId = setInterval(calcDays, 24 * 60 * 60 * 1000)
    }, msUntilETMidnight())

    Promise.all([getThisWeekWorkouts(), getRecentWorkouts(7)])
      .then(([week, recent]) => {
        setWeekWorkouts(week)
        setRecentWorkouts(recent)
      })
      .catch(err => { console.error(err); setFetchError(true) })
      .finally(() => setLoading(false))

    return () => {
      clearTimeout(timeoutId)
      clearInterval(intervalId)
    }
  }, [])

  const weekData = DISCIPLINES.map(d => ({
    id:   d.id,
    done: weekWorkouts.filter(w => w.discipline === d.id).length,
    goal: WEEKLY_GOALS[d.id] ?? 2,
  }))

  function resetModal() {
    setSelectedDisc(null)
    setDuration(30)
    setEffort(0)
    setMood(null)
  }

  async function handleSave() {
    if (!selectedDisc) return
    setSaving(true)
    try {
      await saveWorkout({
        discipline: selectedDisc,
        duration,
        effort: effort || null,
        mood,
        details: {},
      })
      setSaved(true)
      const [week, recent] = await Promise.all([getThisWeekWorkouts(), getRecentWorkouts(7)])
      setWeekWorkouts(week)
      setRecentWorkouts(recent)
    } catch (err) {
      console.error('Save failed:', err)
    } finally {
      setSaving(false)
      setTimeout(() => {
        setSaved(false)
        setShowLogModal(false)
        resetModal()
      }, 1800)
    }
  }

  const disc = DISCIPLINES.find(d => d.id === selectedDisc)

  return (
    <div style={s.screen}>
      <style>{css}</style>

      {/* ── HEADER ── */}
      <div style={s.header}>
        <div>
          <div style={s.headerGreeting}>good morning, jess</div>
          <div style={s.headerSub}>let's get it</div>
        </div>
      </div>

      {/* ── SCROLLABLE CONTENT ── */}
      <div style={s.scroll}>

        {/* RACE COUNTDOWN */}
        <div style={s.raceCard} className="race-card">
          <div style={s.raceCardInner}>
            <div style={s.raceLabel}>race day countdown</div>
            <div style={s.raceDays}>{daysLeft}</div>
            <div style={s.raceSub}>days until your triathlon</div>
            <div style={s.raceDate}>July 18, 2026</div>
          </div>
          <div style={s.raceDots}>
            {Array.from({ length: Math.min(daysLeft, 20) }).map((_, i) => (
              <div key={i} style={{ ...s.raceDot, opacity: 1 - i * 0.04 }} />
            ))}
          </div>
        </div>

        {/* QUICK LOG */}
        <button
          style={s.logBtn}
          className="log-btn"
          onClick={() => setShowLogModal(true)}
        >
          <span style={s.logBtnPlus}>+</span>
          <span style={s.logBtnText}>log workout</span>
        </button>

        {/* THIS WEEK */}
        <div style={s.sectionHeader}>
          <span style={s.sectionTitle}>this week</span>
          <button style={s.seeAllBtn} onClick={() => navigate('/progress')}>see all →</button>
        </div>

        <div style={s.weekGrid}>
          {weekData.map(w => {
            const d   = DISCIPLINES.find(x => x.id === w.id)
            const pct = Math.min(w.done / w.goal, 1)
            return (
              <div key={w.id} style={{ ...s.weekCard, background: d.bg }} className="week-card">
                <div style={s.weekEmoji}>{d.emoji}</div>
                <div style={s.weekLabel}>{d.label}</div>
                {/* UI Kit progress bar */}
                <div style={s.weekBar}>
                  <div
                    style={{ ...s.weekBarFill, width: `${pct * 100}%`, background: d.dark }}
                    className="uikit-bar-fill"
                  />
                </div>
                <div style={{ ...s.weekCount, color: d.dark }}>{w.done}/{w.goal}</div>
              </div>
            )
          })}
        </div>

        {/* RECENT WORKOUTS */}
        <div style={s.sectionHeader}>
          <span style={s.sectionTitle}>recent workouts</span>
        </div>

        <div style={s.recentList}>
          {loading && (
            <div style={s.emptyState}>loading…</div>
          )}
          {!loading && fetchError && (
            <div style={s.errorState}>
              couldn't load workouts — check Supabase env vars and restart the dev server
            </div>
          )}
          {!loading && !fetchError && recentWorkouts.length === 0 && (
            <div style={s.emptyState}>no workouts yet — log your first one!</div>
          )}
          {recentWorkouts.slice(0, 5).map((w, i) => {
            const dc = getDiscStyle(w.discipline)
            return (
              <div
                key={w.id ?? i}
                style={{ ...s.recentCard, borderLeft: `4px solid ${dc.color}` }}
                className="recent-card"
              >
                <div style={{ ...s.recentEmojiBadge, background: dc.color }}>
                  {getDiscEmoji(w.discipline)}
                </div>
                <div style={s.recentInfo}>
                  <div style={{ ...s.recentLabel, color: dc.dark }}>
                    {w.discipline.charAt(0).toUpperCase() + w.discipline.slice(1)}
                  </div>
                  <div style={s.recentDetail}>{formatWorkoutDetail(w)}</div>
                </div>
                <div style={s.recentTime}>{formatRelativeDate(w.date)}</div>
              </div>
            )
          })}
        </div>

        <div style={{ height: 24 }} />
      </div>

      {/* ── QUICK LOG MODAL ── */}
      {showLogModal && (
        <div style={s.modalOverlay} onClick={() => setShowLogModal(false)}>
          <div style={s.modalSheet} onClick={e => e.stopPropagation()}>
            {saved ? (
              <div style={s.savedState}>
                <div style={s.savedSpark}>✦ · ✦</div>
                <div style={s.savedText}>logged! great work</div>
              </div>
            ) : (
              <>
                <div style={s.modalHandle} />
                <div style={s.modalTitle}>log workout</div>

                <div style={s.modalLabel}>what did you do?</div>
                <div style={s.discGrid}>
                  {DISCIPLINES.map(d => (
                    <button
                      key={d.id}
                      style={{
                        ...s.discBtn,
                        background: selectedDisc === d.id ? d.color : '#FFF5F8',
                        border: `2px solid ${selectedDisc === d.id ? d.dark : '#F4A7B9'}`,
                        transform: selectedDisc === d.id ? 'scale(1.06)' : 'scale(1)',
                      }}
                      onClick={() => setSelectedDisc(d.id)}
                    >
                      <span style={s.discEmoji}>{d.emoji}</span>
                      <span style={{ ...s.discLabel, color: selectedDisc === d.id ? d.dark : '#B06090' }}>
                        {d.label}
                      </span>
                    </button>
                  ))}
                </div>

                <div style={s.modalLabel}>duration</div>
                <div style={s.durationRow}>
                  <button style={s.durBtn} onClick={() => setDuration(Math.max(5, duration - 5))}>−</button>
                  <div style={s.durDisplay}>
                    <span style={s.durNum}>{duration}</span>
                    <span style={s.durUnit}>min</span>
                  </div>
                  <button style={s.durBtn} onClick={() => setDuration(duration + 5)}>+</button>
                </div>

                <div style={s.modalLabel}>effort</div>
                <div style={s.effortRow}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} style={s.starBtn} onClick={() => setEffort(n)}>
                      <span style={{ fontSize: 24, filter: n <= effort ? 'none' : 'grayscale(1) opacity(0.35)' }}>⭐</span>
                    </button>
                  ))}
                </div>

                <div style={s.modalLabel}>mood</div>
                <div style={s.moodRow}>
                  {MOODS.map(m => (
                    <button
                      key={m}
                      style={{
                        ...s.moodBtn,
                        background: mood === m ? '#F9C8D8' : '#FFF5F8',
                        border: `2px solid ${mood === m ? '#F4A7B9' : '#F9D0DF'}`,
                      }}
                      onClick={() => setMood(m)}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                <button
                  style={{ ...s.saveBtn, opacity: selectedDisc && !saving ? 1 : 0.5 }}
                  disabled={!selectedDisc || saving}
                  onClick={handleSave}
                  className="save-btn"
                >
                  {saving ? 'saving…' : 'save workout'}
                </button>

                <button
                  style={s.cancelBtn}
                  onClick={() => { setShowLogModal(false); resetModal() }}
                >
                  cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── STYLES ──────────────────────────────────────────────────────────────────
const s = {
  screen: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    background: '#FFF8FB',
    fontFamily: "'Nunito', system-ui, sans-serif",
    position: 'relative',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 20px 12px',
    borderBottom: '1.5px solid #F9D0DF',
    flexShrink: 0,
  },
  headerGreeting: { fontSize: 20, fontWeight: 800, color: '#8B1A4A', letterSpacing: -0.3 },
  headerSub:      { fontSize: 13, color: '#C077A0', marginTop: 2 },

  scroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '14px 16px',
    scrollbarWidth: 'none',
  },

  // RACE CARD
  raceCard: {
    background: 'linear-gradient(135deg, #FF8FAB 0%, #F06292 40%, #E91E8C 100%)',
    borderRadius: 20,
    padding: '20px 20px 16px',
    marginBottom: 14,
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 6px 20px rgba(240,98,146,0.35)',
  },
  raceCardInner: { position: 'relative', zIndex: 1 },
  raceLabel:  { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 },
  raceDays:   { fontSize: 64, fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: -3 },
  raceSub:    { fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: 600, marginTop: 2 },
  raceDate:   { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 6, fontWeight: 600 },
  raceDots: {
    position: 'absolute', bottom: 12, right: 16,
    display: 'flex', flexWrap: 'wrap', gap: 4, width: 100, justifyContent: 'flex-end',
  },
  raceDot: { width: 6, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.5)' },

  // LOG BUTTON
  logBtn: {
    width: '100%',
    background: 'linear-gradient(135deg, #F48FB1, #F06292)',
    border: 'none',
    borderRadius: 16,
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    cursor: 'pointer',
    marginBottom: 20,
    boxShadow: '0 4px 16px rgba(240,98,146,0.3), 0 2px 4px rgba(0,0,0,0.08)',
    fontFamily: 'inherit',
  },
  logBtnPlus: { fontSize: 24, color: '#fff', fontWeight: 900, lineHeight: 1 },
  logBtnText: { fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: 0.2 },

  // SECTION
  sectionHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: 800, color: '#8B1A4A' },
  seeAllBtn:    { background: 'none', border: 'none', fontSize: 11, color: '#C077A0', fontWeight: 700, cursor: 'pointer', padding: 0 },

  // WEEK GRID
  weekGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 22 },
  weekCard: {
    borderRadius: 14, padding: '10px 6px 8px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  weekEmoji:   { fontSize: 18 },
  weekLabel:   { fontSize: 9, fontWeight: 700, color: '#8B4A6E', textTransform: 'uppercase', letterSpacing: 0.3 },
  weekBar:     { width: '80%', height: 5, background: 'rgba(0,0,0,0.08)', borderRadius: 3, overflow: 'hidden' },
  weekBarFill: { height: '100%', borderRadius: 3, transition: 'width 0.6s ease' },
  weekCount:   { fontSize: 11, fontWeight: 800 },

  // RECENT
  recentList:  { display: 'flex', flexDirection: 'column', gap: 8 },
  recentCard: {
    background: '#fff', borderRadius: 14, padding: '12px 14px',
    display: 'flex', alignItems: 'center', gap: 12,
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  },
  recentEmojiBadge: {
    width: 38, height: 38, borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
  },
  recentInfo:   { flex: 1, minWidth: 0 },
  recentLabel:  { fontSize: 13, fontWeight: 800 },
  recentDetail: { fontSize: 11, color: '#B8A0B0', marginTop: 1 },
  recentTime:   { fontSize: 10, color: '#C077A0', fontWeight: 600, flexShrink: 0 },
  emptyState:   { textAlign: 'center', color: '#D4B0C0', fontSize: 13, fontWeight: 600, padding: '20px 0' },
  errorState:   { textAlign: 'center', color: '#C4354F', fontSize: 12, fontWeight: 600, padding: '20px 0', lineHeight: 1.5 },

  // MODAL
  modalOverlay: {
    position: 'absolute', inset: 0,
    background: 'rgba(139,26,74,0.2)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'flex-end', zIndex: 50,
  },
  modalSheet: {
    width: '100%', background: '#FFF8FB',
    borderRadius: '24px 24px 0 0', padding: '12px 20px 32px',
    boxShadow: '0 -8px 32px rgba(194,24,91,0.15)',
    maxHeight: '85%', overflowY: 'auto',
  },
  modalHandle: { width: 36, height: 4, background: '#F4A7B9', borderRadius: 2, margin: '0 auto 16px' },
  modalTitle:  { fontSize: 18, fontWeight: 900, color: '#8B1A4A', marginBottom: 16, textAlign: 'center' },
  modalLabel:  { fontSize: 11, fontWeight: 800, color: '#C077A0', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 14 },

  discGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 },
  discBtn: {
    borderRadius: 12, padding: '10px 4px 8px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    cursor: 'pointer', transition: 'transform 0.15s ease', fontFamily: 'inherit',
  },
  discEmoji: { fontSize: 20 },
  discLabel: { fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.3 },

  durationRow: { display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'center' },
  durBtn: {
    width: 40, height: 40, borderRadius: 12,
    background: '#F9D0DF', border: '2px solid #F4A7B9',
    fontSize: 20, fontWeight: 900, color: '#C2185B', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit',
  },
  durDisplay: {
    background: '#FFF0F5', border: '2px solid #F4A7B9', borderRadius: 14,
    padding: '8px 20px', textAlign: 'center', minWidth: 90,
  },
  durNum:  { fontSize: 28, fontWeight: 900, color: '#8B1A4A' },
  durUnit: { fontSize: 13, color: '#C077A0', fontWeight: 600, marginLeft: 4 },

  effortRow: { display: 'flex', gap: 8, justifyContent: 'center' },
  starBtn:   { background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 },

  moodRow: { display: 'flex', gap: 8, justifyContent: 'center' },
  moodBtn: {
    width: 44, height: 44, borderRadius: 12,
    fontSize: 22, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit',
  },

  saveBtn: {
    width: '100%', marginTop: 20,
    background: 'linear-gradient(135deg, #F48FB1, #E91E8C)',
    border: 'none', borderRadius: 14,
    color: '#fff', fontSize: 16, fontWeight: 800,
    padding: '14px 0', cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(233,30,140,0.3)',
    letterSpacing: 0.2, fontFamily: 'inherit',
  },
  cancelBtn: {
    width: '100%', marginTop: 8,
    background: 'transparent', border: 'none',
    color: '#C077A0', fontSize: 13, fontWeight: 700,
    padding: '8px 0', cursor: 'pointer', fontFamily: 'inherit',
  },

  savedState: {
    padding: '48px 0 32px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
  },
  savedSpark: { fontSize: 28, letterSpacing: 8, color: '#F06292' },
  savedText:  { fontSize: 20, fontWeight: 900, color: '#8B1A4A' },
}

const css = `
  .race-card { transition: transform 0.2s ease; }
  .race-card:hover { transform: scale(1.01); }
  .log-btn { transition: transform 0.15s ease, box-shadow 0.15s ease; }
  .log-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(240,98,146,0.4) !important; }
  .log-btn:active { transform: translateY(0); }
  .week-card { transition: transform 0.15s ease; }
  .week-card:hover { transform: scale(1.04); }
  .recent-card { transition: transform 0.15s ease; }
  .recent-card:hover { transform: translateX(3px); }
  .save-btn:hover { transform: translateY(-1px); }
  .save-btn:active { transform: translateY(0); }
`
