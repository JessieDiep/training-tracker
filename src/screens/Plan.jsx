import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
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
  const { profile } = useAuth()

  const [weeklyGoals,  setWeeklyGoals]  = useState(null)
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
          .select('goals')
          .eq('week_start', thisMonday)
          .single()

        if (cached?.goals) {
          setWeeklyGoals(cached.goals)
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
      }
    } catch (err) {
      console.error('Failed to regenerate goals:', err)
    } finally {
      setRegenLoading(false)
    }
  }

  return (
    <div style={s.screen}>
      <div style={s.pageHeader}>
        <div style={s.pageTitle}>Weekly Plan</div>
        <button style={s.regenBtn} onClick={handleRegenerate} disabled={regenLoading}>
          {regenLoading ? '…' : '↻ Regenerate'}
        </button>
      </div>

      <div style={s.scroll}>
        {loading && !weeklyGoals ? (
          <div style={s.empty}>Generating your plan…</div>
        ) : weeklyGoals ? (
          <>
            {['swim', 'bike', 'run'].map(disc => {
              const d        = DISC_CONFIG[disc]
              const sessions = weeklyGoals[disc] ?? []
              const done     = weekCompleted[disc] ?? 0
              const allDone  = sessions.length > 0 && done >= sessions.length
              return (
                <div key={disc} style={{ ...s.discBlock, border: `1.5px solid ${d.color}`, background: d.bg }}>
                  <div style={s.discHeader}>
                    <span style={s.discEmoji}>{d.emoji}</span>
                    <span style={s.discTitle}>{d.label}</span>
                    <span style={{
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
          </>
        ) : (
          <div style={s.empty}>Could not load plan. Tap Regenerate to try again.</div>
        )}

        <div style={{ height: 32 }} />
      </div>
    </div>
  )
}

const s = {
  screen:    { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#FFF8FB', fontFamily: "'Nunito', system-ui, sans-serif" },
  pageHeader:{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 10px', borderBottom: '1.5px solid #F9D0DF', flexShrink: 0 },
  pageTitle: { fontSize: 17, fontWeight: 900, color: '#8B1A4A' },
  regenBtn:  { fontSize: 12, fontWeight: 800, color: '#C2185B', background: '#FFE0F0', border: 'none', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit' },
  scroll:    { flex: 1, overflowY: 'auto', padding: '14px 16px', scrollbarWidth: 'none' },

  discBlock:  { borderRadius: 14, padding: '12px 14px', marginBottom: 12 },
  discHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
  discEmoji:  { fontSize: 20 },
  discTitle:  { fontSize: 15, fontWeight: 900, color: '#3A2040', flex: 1 },
  discBadge:  { fontSize: 10, fontWeight: 800, borderRadius: 8, padding: '3px 9px' },

  sessionCard:{ background: 'rgba(255,255,255,0.7)', borderRadius: 10, padding: '9px 10px', marginBottom: 7 },
  sessionTop: { display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5, flexWrap: 'wrap' },
  typePill:   { fontSize: 11, fontWeight: 800, borderRadius: 7, padding: '3px 9px' },
  sessionMeta:{ fontSize: 11, fontWeight: 700, color: '#8B4A6E', flex: 1 },
  check:      { fontSize: 14, color: '#2D8B6F', fontWeight: 900 },
  structure:  { fontSize: 12, color: '#5A3050', lineHeight: 1.5, fontWeight: 600 },

  rationaleBox:  { background: '#FFF0F6', borderRadius: 12, padding: '10px 14px', marginTop: 4 },
  rationaleLabel:{ fontSize: 11, fontWeight: 800, color: '#C2185B' },
  rationaleText: { fontSize: 12, color: '#5A3050', fontStyle: 'italic', fontWeight: 600 },

  empty: { textAlign: 'center', color: '#C0A0B8', fontSize: 13, fontWeight: 600, padding: '32px 0' },
}
