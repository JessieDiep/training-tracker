import { useState, useEffect } from 'react'
import { THEMES, loadTheme, saveTheme, applyTheme } from '../lib/themes'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import {
  getThisWeekWorkouts,
  getRecentWorkouts,
  getWorkoutsBefore,
  getDiscEmoji,
  getDiscStyle,
  formatWorkoutDetail,
  formatRelativeDate,
  deleteWorkout,
  updateWorkout,
  getTrainingStartDate,
} from '../lib/workouts'

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

const FALLBACK_START = new Date(2026, 0, 5)   // Jan 5 2026 — used if no workouts yet
const RING_R = 36                              // SVG ring radius (inside 96×96 viewBox)
const RING_C = 2 * Math.PI * RING_R           // full circumference ≈ 226.2

function getGreeting(name) {
  const h = new Date().getHours()
  if (h >= 5  && h < 12) return { heading: `Good morning, ${name} ☀️`, sub: "Let's get it" }
  if (h >= 12 && h < 17) return { heading: `Good afternoon, ${name} 💪`, sub: 'Keep the momentum going' }
  if (h >= 17 && h < 21) return { heading: `Good evening, ${name} 🌆`, sub: 'End the day strong' }
  return { heading: `Hey ${name} 🌙`, sub: 'Rest is training too' }
}

const DISCIPLINES = [
  { id: 'swim',     label: 'Swim',     emoji: '🏊', color: '#A8E6CF', dark: '#2D8B6F', bg: '#E8FAF3' },
  { id: 'bike',     label: 'Bike',     emoji: '🚴', color: '#C9B8F0', dark: '#6B4FBB', bg: '#F2EEFF' },
  { id: 'run',      label: 'Run',      emoji: '🏃', color: '#FFD4A8', dark: '#C47A2B', bg: '#FFF4E8' },
  { id: 'strength', label: 'Lift',     emoji: '💪', color: '#FFF3A8', dark: '#B8960A', bg: '#FFFBE8' },
  { id: 'climb',    label: 'Climb',    emoji: '🧗', color: '#FFB8C6', dark: '#C4354F', bg: '#FFE8EE' },
  { id: 'recover',  label: 'Recovery', emoji: '🌿', color: '#B8F0E0', dark: '#1A7A5E', bg: '#E8FAF3' },
]


// ── WORKOUT DETAIL SHEET ─────────────────────────────────────────────────────
function WorkoutSheet({ workout, onClose, onDeleted, onUpdated }) {
  const dc = DISCIPLINES.find(d => d.id === workout.discipline)
          ?? { color: '#F4D0DC', dark: 'var(--t-muted)', bg: 'var(--t-surface)', emoji: '🏅', label: workout.discipline }

  const [editing,    setEditing]    = useState(false)
  const [duration,   setDuration]   = useState(workout.duration_minutes ?? 0)
  const [effort,     setEffort]     = useState(workout.effort ?? 5)
  const [notes,      setNotes]      = useState(workout.notes ?? '')
  const [distance,   setDistance]   = useState(workout.details?.distance ?? 0)
  const [footPain,   setFootPain]   = useState(workout.details?.footPain ?? false)
  const [saving,     setSaving]     = useState(false)
  const [deleting,   setDeleting]   = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const newDetails = { ...workout.details }
      if (['swim', 'bike', 'run'].includes(workout.discipline)) newDetails.distance = distance || null
      if (workout.discipline === 'run') newDetails.footPain = footPain
      const updated = await updateWorkout(workout.id, {
        duration: duration || null,
        effort,
        notes:    notes || null,
        details:  newDetails,
      })
      onUpdated(updated)
      setEditing(false)
    } catch (err) {
      console.error('Update failed:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirmDel) { setConfirmDel(true); return }
    setDeleting(true)
    try {
      await deleteWorkout(workout.id)
      onDeleted(workout.id)
    } catch (err) {
      console.error('Delete failed:', err)
      setDeleting(false)
    }
  }

  // Build detail rows for view mode
  const d    = workout.details ?? {}
  const rows = []
  switch (workout.discipline) {
    case 'swim':
      if (d.distance)             rows.push(['Distance', `${d.distance}m`])
      if (d.focus)                rows.push(['Focus', d.focus])
      if (d.location)             rows.push(['Location', d.location])
      if (workout.duration_minutes) rows.push(['Duration', `${workout.duration_minutes} min`])
      break
    case 'bike':
      if (workout.duration_minutes) rows.push(['Duration', `${workout.duration_minutes} min`])
      if (d.type)                 rows.push(['Type', d.type])
      if (d.distance)             rows.push(['Distance', `${d.distance}km`])
      if (d.location)             rows.push(['Location', d.location])
      break
    case 'run':
      if (d.distance)             rows.push(['Distance', `${d.distance}km`])
      if (workout.duration_minutes) rows.push(['Duration', `${workout.duration_minutes} min`])
      if (d.surface)              rows.push(['Surface', d.surface])
      if (d.footPain)             rows.push(['Modified', '⚠️ Foot pain flagged'])
      break
    case 'strength':
      if (workout.duration_minutes) rows.push(['Duration', `${workout.duration_minutes} min`])
      if (d.focus?.length)        rows.push(['Focus', d.focus.join(', ')])
      if (d.exercises?.length)    rows.push(['Exercises', `${d.exercises.length} logged`])
      break
    case 'climb':
      if (d.location)             rows.push(['Location', d.location])
      if (d.routes?.length)       rows.push(['Routes', `${d.routes.length} logged`])
      break
    case 'recover':
      if (d.types?.length)        rows.push(['Types', d.types.join(', ')])
      break
  }
  if (workout.effort) rows.push(['Effort', `${workout.effort}/10`])
  if (workout.notes)  rows.push(['Notes', workout.notes])

  const dateStr = new Date(workout.date + 'T12:00:00')
    .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <>
      {/* Backdrop */}
      <div style={sh.backdrop} onClick={onClose} />

      {/* Sheet */}
      <div style={sh.sheet}>
        <div style={sh.handle} />

        {/* Header */}
        <div style={sh.header}>
          <div style={{ ...sh.badge, background: dc.color }}>{dc.emoji}</div>
          <div style={{ flex: 1 }}>
            <div style={{ ...sh.sheetTitle, color: dc.dark }}>{dc.label}</div>
            <div style={sh.sheetDate}>{dateStr}</div>
          </div>
          <button style={sh.closeBtn} onClick={onClose}>×</button>
        </div>

        {!editing ? (
          <>
            {/* Detail rows */}
            <div style={sh.rows}>
              {rows.map(([label, val]) => (
                <div key={label} style={sh.row}>
                  <span style={sh.rowLabel}>{label}</span>
                  <span style={sh.rowVal}>{val}</span>
                </div>
              ))}
            </div>

            {/* Strength exercises breakdown */}
            {workout.discipline === 'strength' && d.exercises?.length > 0 && (
              <div style={sh.subSection}>
                <div style={sh.subLabel}>Exercises</div>
                {d.exercises.map((ex, i) => (
                  <div key={i} style={sh.subRow}>
                    <span style={sh.subName}>{ex.name}</span>
                    <span style={sh.subDetail}>
                      {ex.sets}×{ex.reps}{ex.weight ? ` @ ${ex.weight}lb` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Climb routes breakdown */}
            {workout.discipline === 'climb' && d.routes?.length > 0 && (
              <div style={sh.subSection}>
                <div style={sh.subLabel}>Routes</div>
                {d.routes.map((r, i) => (
                  <div key={i} style={sh.subRow}>
                    <span style={sh.subName}>{r.grade}</span>
                    <span style={sh.subDetail}>
                      {r.attempts} attempt{r.attempts !== 1 ? 's' : ''} · {r.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div style={sh.actions}>
              <button style={sh.editBtn} onClick={() => { setEditing(true); setConfirmDel(false) }}>
                Edit
              </button>
              <button
                style={{ ...sh.deleteBtn, background: confirmDel ? '#C4354F' : '#FFE8EE', color: confirmDel ? '#fff' : '#C4354F' }}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : confirmDel ? 'Tap again to confirm' : 'Delete'}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Edit mode */}
            <div style={sh.editFields}>

              {workout.discipline !== 'climb' && (
                <div style={sh.editRow}>
                  <span style={sh.editLabel}>Duration</span>
                  <div style={sh.editInputWrap}>
                    <input
                      type="number" style={sh.editInput} min="0"
                      value={duration}
                      onChange={e => setDuration(parseInt(e.target.value) || 0)}
                    />
                    <span style={sh.editUnit}>min</span>
                  </div>
                </div>
              )}

              {['swim', 'bike', 'run'].includes(workout.discipline) && (
                <div style={sh.editRow}>
                  <span style={sh.editLabel}>Distance</span>
                  <div style={sh.editInputWrap}>
                    <input
                      type="number" style={sh.editInput} min="0" step="0.1"
                      value={distance}
                      onChange={e => setDistance(parseFloat(e.target.value) || 0)}
                    />
                    <span style={sh.editUnit}>{workout.discipline === 'swim' ? 'm' : 'km'}</span>
                  </div>
                </div>
              )}

              <div style={sh.editRow}>
                <span style={sh.editLabel}>Effort</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button style={sh.stepBtn} onClick={() => setEffort(e => Math.max(1, e - 1))}>−</button>
                  <span style={sh.stepVal}>{effort}</span>
                  <button style={sh.stepBtn} onClick={() => setEffort(e => Math.min(10, e + 1))}>+</button>
                  <span style={{ fontSize: 11, color: 'var(--t-muted)' }}>/10</span>
                </div>
              </div>

              {workout.discipline === 'run' && (
                <div style={sh.editRow}>
                  <span style={sh.editLabel}>Modified</span>
                  <button
                    style={{ ...sh.footBtn, background: footPain ? '#FFE8EE' : 'var(--t-surface)', border: `1.5px solid ${footPain ? '#C4354F' : 'var(--t-border)'}`, color: footPain ? '#C4354F' : '#B8A0B0' }}
                    onClick={() => setFootPain(f => !f)}
                  >
                    {footPain ? '⚠️ Foot pain flagged' : 'No foot pain'}
                  </button>
                </div>
              )}

              <div style={{ marginTop: 4 }}>
                <div style={sh.editLabel}>Notes</div>
                <textarea
                  style={sh.editTextarea}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Add notes…"
                />
              </div>
            </div>

            <div style={sh.actions}>
              <button style={sh.cancelBtn} onClick={() => setEditing(false)}>Cancel</button>
              <button
                style={{ ...sh.saveBtn, opacity: saving ? 0.6 : 1 }}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}

// ── RACE TYPE HELPER ──────────────────────────────────────────────────────────
function inferRaceType(distances) {
  if (!distances) return 'tri'
  if ('swim' in distances) return 'tri'
  if ('bike' in distances) return 'du'
  return 'run'
}

// ── SETTINGS SHEET ────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  { q: 'How do I log a workout?',       a: 'Tap "Log workout" on the Home screen, choose a discipline, and fill in the details.' },
  { q: 'Can I edit or delete a workout?', a: 'Yes — tap any recent workout on Home or any entry in the Progress tab to open the detail sheet. Use "Edit" or "Delete" from there.' },
  { q: 'What does the coach know?',     a: 'Coach sees your full workout history and your profile (race details, injury flags). It uses this to give personalised advice.' },
  { q: 'Will I get logged out?',        a: 'No — your session is saved indefinitely. Tap "Sign out" only when you need to switch accounts.' },
  { q: 'Can friends use the same app?', a: 'Yes! Each person creates their own account. Data is completely isolated — no one sees your workouts.' },
]

function SettingsSheet({ profile, onClose, onSignOut, onSave }) {
  const [hasRace,  setHasRace]  = useState(profile?.has_race ?? false)
  const [raceType, setRaceType] = useState(() => inferRaceType(profile?.race_distances))
  const [raceName, setRaceName] = useState(profile?.race_name ?? '')
  const [raceDate, setRaceDate] = useState(profile?.race_date ?? '')
  const [raceGoal, setRaceGoal] = useState(profile?.race_goal ?? '')
  const [swimDist, setSwimDist] = useState(String(profile?.race_distances?.swim ?? 500))
  const [bikeDist, setBikeDist] = useState(String(profile?.race_distances?.bike ?? 25))
  const [runDist,  setRunDist]  = useState(String(profile?.race_distances?.run  ?? 5))
  const [trainingPlan, setTrainingPlan] = useState(profile?.training_plan ?? '')
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [faqOpen,  setFaqOpen]  = useState(null)
  const [activeTheme, setActiveTheme] = useState(loadTheme())

  function handleTheme(name) {
    saveTheme(name)
    applyTheme(name)
    setActiveTheme(name)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const race_distances = !hasRace ? {}
        : raceType === 'tri' ? { swim: +swimDist, bike: +bikeDist, run: +runDist }
        : raceType === 'du'  ? { bike: +bikeDist, run: +runDist }
        :                      { run: +runDist }

      await onSave({
        has_race:       hasRace,
        race_name:      hasRace ? raceName || null  : null,
        race_date:      hasRace ? raceDate || null  : null,
        race_goal:      hasRace ? raceGoal || null  : null,
        race_distances,
        training_plan:  trainingPlan.trim() || null,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Settings save failed:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div style={sh.backdrop} onClick={onClose} />
      <div style={ss.sheet}>
        <div style={sh.handle} />

        {/* Header */}
        <div style={ss.header}>
          <div style={ss.title}>Settings</div>
          <button style={sh.closeBtn} onClick={onClose}>×</button>
        </div>

        {/* Account */}
        <div style={ss.sectionLabel}>Account</div>
        <div style={ss.namePill}>{profile?.name}</div>

        {/* Race */}
        <div style={ss.sectionLabel}>Race</div>

        <div style={ss.toggleRow}>
          <span style={ss.toggleLabel}>Training for a race?</span>
          <button
            style={{ ...ss.toggle, background: hasRace ? 'var(--t-accent)' : '#E0D0D8' }}
            onClick={() => setHasRace(v => !v)}
          >
            <div style={{ ...ss.toggleThumb, transform: hasRace ? 'translateX(18px)' : 'translateX(0)' }} />
          </button>
        </div>

        {hasRace && (
          <>
            <div style={{ marginTop: 10 }}>
              <div style={ss.fieldLabel}>Race type</div>
              <div style={ss.raceTypeRow}>
                {[['tri','Triathlon'],['du','Duathlon'],['run','Running']].map(([v, label]) => (
                  <button key={v} type="button"
                    style={{ ...ss.raceTypeBtn, ...(raceType === v ? ss.raceTypeBtnActive : {}) }}
                    onClick={() => setRaceType(v)}
                  >{label}</button>
                ))}
              </div>
            </div>

            <div style={ss.fieldGroup}>
              <div style={ss.fieldLabel}>Race name</div>
              <input style={ss.input} value={raceName} placeholder="e.g. Sprint Triathlon"
                onChange={e => setRaceName(e.target.value)} />
            </div>

            <div style={ss.fieldGroup}>
              <div style={ss.fieldLabel}>Race date</div>
              <input style={ss.input} type="date" value={raceDate}
                onChange={e => setRaceDate(e.target.value)} />
            </div>

            <div style={ss.fieldGroup}>
              <div style={ss.fieldLabel}>Race goal</div>
              <input style={ss.input} value={raceGoal} placeholder="e.g. Finish under 2 hours"
                onChange={e => setRaceGoal(e.target.value)} />
            </div>

            <div style={ss.fieldGroup}>
              <div style={ss.fieldLabel}>Race distances</div>
              <div style={ss.distRow}>
                {raceType === 'tri' && (
                  <div style={ss.distField}>
                    <input style={ss.distInput} type="number" value={swimDist}
                      onChange={e => setSwimDist(e.target.value)} />
                    <span style={ss.distUnit}>m swim</span>
                  </div>
                )}
                {(raceType === 'tri' || raceType === 'du') && (
                  <div style={ss.distField}>
                    <input style={ss.distInput} type="number" value={bikeDist}
                      onChange={e => setBikeDist(e.target.value)} />
                    <span style={ss.distUnit}>km bike</span>
                  </div>
                )}
                <div style={ss.distField}>
                  <input style={ss.distInput} type="number" value={runDist}
                    onChange={e => setRunDist(e.target.value)} />
                  <span style={ss.distUnit}>km run</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Training plan */}
        <div style={{ ...ss.sectionLabel, marginTop: 20 }}>Training plan</div>
        <div style={ss.fieldGroup}>
          <div style={ss.fieldLabel}>Weekly plan (used by coach)</div>
          <textarea
            style={{ ...ss.input, minHeight: 120, resize: 'vertical', lineHeight: 1.5 }}
            placeholder={'Monday: Strength\nTuesday: Run 30 min easy\nWednesday: Rest\n...'}
            value={trainingPlan}
            onChange={e => setTrainingPlan(e.target.value)}
          />
        </div>

        <button
          style={{ ...ss.saveBtn, opacity: saving ? 0.6 : 1 }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save settings'}
        </button>

        {/* Theme */}
        <div style={{ ...ss.sectionLabel, marginTop: 24 }}>Colour theme</div>
        <div style={ss.themeRow}>
          {Object.entries(THEMES).map(([key, t]) => (
            <button
              key={key}
              style={{
                ...ss.themeBtn,
                border: activeTheme === key ? `2.5px solid ${t.dark}` : `2px solid ${t.border}`,
                background: t.bg,
              }}
              onClick={() => handleTheme(key)}
            >
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: t.accent, marginBottom: 4 }} />
              <span style={{ fontSize: 10, fontWeight: 800, color: t.dark }}>{t.emoji} {t.name}</span>
              {activeTheme === key && (
                <span style={{ fontSize: 9, fontWeight: 700, color: t.active }}>✓ Active</span>
              )}
            </button>
          ))}
        </div>

        {/* FAQ */}
        <div style={{ ...ss.sectionLabel, marginTop: 24 }}>FAQ</div>
        {FAQ_ITEMS.map((item, i) => (
          <div key={i}>
            <button style={ss.faqQ} onClick={() => setFaqOpen(faqOpen === i ? null : i)}>
              <span style={{ flex: 1, textAlign: 'left' }}>{item.q}</span>
              <span style={{ fontSize: 18, color: 'var(--t-muted)', flexShrink: 0 }}>{faqOpen === i ? '−' : '+'}</span>
            </button>
            {faqOpen === i && <div style={ss.faqA}>{item.a}</div>}
          </div>
        ))}

        {/* Ko-fi support link */}
        <a
          href="https://ko-fi.com/jessiediep"
          target="_blank"
          rel="noopener noreferrer"
          style={ss.kofiBtn}
        >
          ☕ Support this app on Ko-fi
        </a>

        {/* Sign out */}
        <button style={ss.signOutBtn} onClick={onSignOut}>Sign out</button>

        <div style={{ height: 16 }} />
      </div>
    </>
  )
}

// ── SHEET STYLES ─────────────────────────────────────────────────────────────
const sh = {
  backdrop:    { position: 'absolute', inset: 0, background: 'rgba(139,26,74,0.3)', backdropFilter: 'blur(2px)', zIndex: 50 },
  sheet:       { position: 'absolute', bottom: 0, left: 0, right: 0, background: 'var(--t-bg)', borderRadius: '22px 22px 0 0', padding: '12px 20px 36px', zIndex: 51, boxShadow: '0 -6px 32px var(--t-phone-shadow)', maxHeight: '85%', overflowY: 'auto' },
  handle:      { width: 40, height: 5, background: 'var(--t-border)', borderRadius: 3, margin: '0 auto 16px' },
  header:      { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 },
  badge:       { width: 44, height: 44, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 },
  sheetTitle:  { fontSize: 18, fontWeight: 900 },
  sheetDate:   { fontSize: 11, color: 'var(--t-muted)', fontWeight: 600, marginTop: 1 },
  closeBtn:    { width: 28, height: 28, borderRadius: 8, background: 'var(--t-border)', border: 'none', fontSize: 18, color: 'var(--t-active)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', flexShrink: 0 },

  rows:        { display: 'flex', flexDirection: 'column', marginBottom: 12 },
  row:         { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '9px 0', borderBottom: '1px solid var(--t-border)' },
  rowLabel:    { fontSize: 12, fontWeight: 700, color: 'var(--t-muted)', flexShrink: 0 },
  rowVal:      { fontSize: 13, fontWeight: 700, color: 'var(--t-text)', textAlign: 'right', marginLeft: 16 },

  subSection:  { marginBottom: 14 },
  subLabel:    { fontSize: 10, fontWeight: 800, color: 'var(--t-muted)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  subRow:      { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--t-border)' },
  subName:     { fontSize: 12, fontWeight: 700, color: 'var(--t-text)' },
  subDetail:   { fontSize: 12, color: 'var(--t-muted)', fontWeight: 600 },

  actions:     { display: 'flex', gap: 10, marginTop: 20 },
  editBtn:     { flex: 1, background: 'var(--t-surface)', border: '1.5px solid var(--t-border)', borderRadius: 13, padding: '12px 0', fontSize: 14, fontWeight: 800, color: 'var(--t-active)', cursor: 'pointer', fontFamily: 'inherit' },
  deleteBtn:   { flex: 1, border: 'none', borderRadius: 13, padding: '12px 0', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' },

  editFields:  { display: 'flex', flexDirection: 'column' },
  editRow:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--t-border)' },
  editLabel:   { fontSize: 12, fontWeight: 700, color: 'var(--t-muted)' },
  editInputWrap: { display: 'flex', alignItems: 'center', gap: 6 },
  editInput:   { width: 72, background: 'var(--t-surface)', border: '1.5px solid var(--t-border)', borderRadius: 10, padding: '6px 10px', fontSize: 16, fontWeight: 800, color: 'var(--t-dark)', textAlign: 'center', outline: 'none', fontFamily: 'inherit' },
  editUnit:    { fontSize: 12, color: 'var(--t-muted)', fontWeight: 700 },
  editTextarea:{ width: '100%', minHeight: 70, background: 'var(--t-surface)', border: '1.5px solid var(--t-border)', borderRadius: 12, padding: '10px 12px', fontSize: 13, color: 'var(--t-subtext)', fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box', marginTop: 8 },
  stepBtn:     { width: 28, height: 28, borderRadius: 8, background: 'var(--t-border)', border: '1.5px solid var(--t-mid)', fontSize: 17, fontWeight: 900, color: 'var(--t-active)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' },
  stepVal:     { fontSize: 18, fontWeight: 900, color: 'var(--t-dark)', minWidth: 28, textAlign: 'center' },
  footBtn:     { borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  cancelBtn:   { flex: 1, background: 'transparent', border: '1.5px solid var(--t-border)', borderRadius: 13, padding: '12px 0', fontSize: 14, fontWeight: 800, color: 'var(--t-muted)', cursor: 'pointer', fontFamily: 'inherit' },
  saveBtn:     { flex: 1.5, background: 'linear-gradient(135deg, var(--t-soft), var(--t-accent))', border: 'none', borderRadius: 13, padding: '12px 0', fontSize: 14, fontWeight: 800, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 3px 12px var(--t-phone-shadow)' },
}

// ── SETTINGS SHEET STYLES ────────────────────────────────────────────────────
const ss = {
  sheet:        { ...sh.sheet, maxHeight: '92%' },
  header:       { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title:        { fontSize: 20, fontWeight: 900, color: 'var(--t-dark)' },
  sectionLabel: { fontSize: 10, fontWeight: 800, color: 'var(--t-muted)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, marginTop: 4 },
  namePill:     { background: 'var(--t-surface)', borderRadius: 12, padding: '12px 14px', fontSize: 15, fontWeight: 700, color: 'var(--t-text)', marginBottom: 16 },
  toggleRow:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--t-border)' },
  toggleLabel:  { fontSize: 13, fontWeight: 700, color: 'var(--t-text)' },
  toggle:       { width: 42, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', padding: 3, transition: 'background 0.2s', display: 'flex', alignItems: 'center', flexShrink: 0 },
  toggleThumb:  { width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'transform 0.2s' },
  fieldGroup:   { marginTop: 12 },
  fieldLabel:   { fontSize: 11, fontWeight: 700, color: 'var(--t-muted)', marginBottom: 5 },
  input:        { width: '100%', background: 'var(--t-surface)', border: '1.5px solid var(--t-border)', borderRadius: 10, padding: '9px 12px', fontSize: 13, color: 'var(--t-text)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' },
  raceTypeRow:  { display: 'flex', gap: 6 },
  raceTypeBtn:  { flex: 1, padding: '8px 4px', borderRadius: 10, border: '1.5px solid var(--t-border)', background: 'var(--t-surface)', fontSize: 12, fontWeight: 700, color: 'var(--t-muted)', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' },
  raceTypeBtnActive: { background: 'linear-gradient(135deg, var(--t-soft), var(--t-accent))', border: '1.5px solid var(--t-accent)', color: '#fff' },
  distRow:      { display: 'flex', gap: 8 },
  distField:    { flex: 1, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' },
  distInput:    { width: '100%', background: 'var(--t-surface)', border: '1.5px solid var(--t-border)', borderRadius: 10, padding: '9px 8px', fontSize: 15, fontWeight: 700, color: 'var(--t-dark)', textAlign: 'center', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' },
  distUnit:     { fontSize: 10, fontWeight: 700, color: 'var(--t-muted)' },
  saveBtn:      { width: '100%', background: 'linear-gradient(135deg, var(--t-soft), var(--t-accent))', border: 'none', borderRadius: 13, padding: '12px 0', fontSize: 14, fontWeight: 800, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 3px 12px var(--t-phone-shadow)', marginTop: 16 },
  faqQ:         { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'none', border: 'none', borderBottom: '1px solid var(--t-border)', padding: '11px 0', fontSize: 13, fontWeight: 700, color: 'var(--t-text)', cursor: 'pointer', fontFamily: 'inherit', gap: 8 },
  faqA:         { fontSize: 12, color: 'var(--t-subtext)', lineHeight: 1.6, padding: '8px 0 10px', borderBottom: '1px solid var(--t-border)' },
  kofiBtn:      { display: 'block', textAlign: 'center', marginTop: 20, padding: '11px 0', borderRadius: 13, background: 'var(--t-surface)', border: '1.5px solid var(--t-border)', fontSize: 13, fontWeight: 700, color: 'var(--t-muted)', textDecoration: 'none' },
  signOutBtn:   { width: '100%', background: 'var(--t-surface)', border: '1.5px solid var(--t-border)', borderRadius: 13, padding: '12px 0', fontSize: 14, fontWeight: 800, color: '#C4354F', cursor: 'pointer', fontFamily: 'inherit', marginTop: 12 },
  themeRow:     { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 },
  themeBtn:     { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '10px 4px', borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit', background: 'none' },
}

// ── HOME SCREEN ───────────────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate()
  const { profile, signOut, updateProfile } = useAuth()
  const [showSettings, setShowSettings] = useState(false)

  // Derive race date string and Date object from profile
  const raceDate = profile?.has_race && profile?.race_date ? profile.race_date : null
  const RACE_DATE = raceDate ? new Date(raceDate + 'T12:00:00') : null
  const raceDateDisplay = RACE_DATE
    ? RACE_DATE.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : ''
  const firstName = profile?.name?.split(' ')[0] ?? ''
  const greeting  = getGreeting(firstName)

  const [daysLeft,        setDaysLeft]        = useState(0)
  const [weekWorkouts,    setWeekWorkouts]    = useState([])
  const [recentWorkouts,  setRecentWorkouts]  = useState([])
  const [hasMoreWorkouts, setHasMoreWorkouts] = useState(false)
  const [loadingMore,     setLoadingMore]     = useState(false)
  const [loading,         setLoading]         = useState(true)
  const [fetchError,      setFetchError]      = useState(false)
  const [selectedWorkout, setSelectedWorkout] = useState(null)
  const [trainingStart,   setTrainingStart]   = useState(FALLBACK_START)
  const [ringProgress,    setRingProgress]    = useState(0)
  const [weeklyGoals,     setWeeklyGoals]     = useState(null)
  const [goalsLoading,    setGoalsLoading]    = useState(true)

  // Fetch workouts on mount (independent of race date)
  useEffect(() => {
    async function load() {
      try {
        const [week, recent] = await Promise.all([getThisWeekWorkouts(), getRecentWorkouts(7)])
        setWeekWorkouts(week)
        setRecentWorkouts(recent)
        if (recent.length > 0) {
          // Lightweight check: does anything exist older than our oldest fetched workout?
          const { hasMore } = await getWorkoutsBefore(recent[recent.length - 1].date, 0)
          setHasMoreWorkouts(hasMore)
        }
      } catch (err) {
        console.error(err)
        setFetchError(true)
      } finally {
        setLoading(false)
      }
    }

    async function loadGoals() {
      try {
        const thisMonday = toISODate(getMonday(new Date()))
        // Check Supabase cache first
        const { data: cached } = await supabase
          .from('weekly_goals')
          .select('goals')
          .eq('week_start', thisMonday)
          .single()
        if (cached?.goals) {
          setWeeklyGoals(cached.goals)
          setGoalsLoading(false)
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
        console.error('Failed to load weekly goals:', err)
      } finally {
        setGoalsLoading(false)
      }
    }

    load()
    loadGoals()

    getTrainingStartDate()
      .then(d => { if (d) setTrainingStart(d) })
      .catch(() => {})
  }, [])

  // Days countdown — only runs when there is a race date
  useEffect(() => {
    if (!RACE_DATE) return

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

    return () => {
      clearTimeout(timeoutId)
      clearInterval(intervalId)
    }
  }, [raceDate]) // raceDate is a string — stable reference

  // Animate ring fill after trainingStart resolves
  useEffect(() => {
    if (!RACE_DATE) return
    const today     = new Date()
    const totalDays = Math.max(Math.round((RACE_DATE - trainingStart) / 86400000), 1)
    const elapsed   = Math.round((today - trainingStart) / 86400000)
    const pct       = Math.min(Math.max(elapsed / totalDays, 0), 1)
    const t = setTimeout(() => setRingProgress(pct), 300)
    return () => clearTimeout(t)
  }, [trainingStart, raceDate])

  function handleDeleted(id) {
    setRecentWorkouts(prev => prev.filter(w => w.id !== id))
    setWeekWorkouts(prev => prev.filter(w => w.id !== id))
    setSelectedWorkout(null)
  }

  function handleUpdated(updated) {
    setRecentWorkouts(prev => prev.map(w => w.id === updated.id ? updated : w))
    setWeekWorkouts(prev => prev.map(w => w.id === updated.id ? updated : w))
    setSelectedWorkout(updated)
  }

  async function handleLoadMore() {
    if (loadingMore || !recentWorkouts.length) return
    setLoadingMore(true)
    try {
      const oldestDate = recentWorkouts[recentWorkouts.length - 1].date
      const { workouts, hasMore } = await getWorkoutsBefore(oldestDate, 10)
      setRecentWorkouts(prev => [...prev, ...workouts])
      setHasMoreWorkouts(hasMore)
    } catch (err) {
      console.error('Load more failed:', err)
    } finally {
      setLoadingMore(false)
    }
  }

  const pctDone       = Math.round(ringProgress * 100)
  const weeksLeft     = Math.floor(daysLeft / 7)
  const daysRemainder = daysLeft % 7

  const weekCompleted = {
    swim: weekWorkouts.filter(w => w.discipline === 'swim').length,
    bike: weekWorkouts.filter(w => w.discipline === 'bike').length,
    run:  weekWorkouts.filter(w => w.discipline === 'run').length,
  }

  return (
    <div style={s.screen}>
      <style>{css}</style>

      {/* ── HEADER ── */}
      <div style={s.header}>
        <div>
          <div style={s.headerGreeting}>{greeting.heading}</div>
          <div style={s.headerSub}>{greeting.sub}</div>
        </div>
        <button style={s.settingsBtn} onClick={() => setShowSettings(true)} aria-label="Settings">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--t-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </div>

      {/* ── SCROLLABLE CONTENT ── */}
      <div style={s.scroll}>

        {/* RACE COUNTDOWN — only shown for users with a race */}
        {profile?.has_race && (
          <div style={s.raceCard} className="race-card">
            {/* left — text */}
            <div style={s.raceLeft}>
              <div style={s.raceLabel}>Race day countdown</div>
              <div style={s.raceDays}>{daysLeft}</div>
              <div style={s.raceSub}>Days until {profile?.race_name || 'your race'}</div>
              <div style={s.raceWks}>
                {weeksLeft > 0 ? `${weeksLeft} wks · ` : ''}
                {daysRemainder} day{daysRemainder !== 1 ? 's' : ''} · {raceDateDisplay}
              </div>
            </div>
            {/* right — progress ring */}
            <div style={s.raceRight}>
              <svg width="96" height="96" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r={RING_R} fill="none"
                  stroke="rgba(255,255,255,0.2)" strokeWidth="7" />
                <circle cx="48" cy="48" r={RING_R} fill="none"
                  stroke="rgba(255,255,255,0.92)" strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={RING_C}
                  strokeDashoffset={RING_C * (1 - ringProgress)}
                  transform="rotate(-90 48 48)"
                  style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
                />
                <g transform="translate(48, 48)">
                  <text y="-2" textAnchor="middle"
                    fontSize="18" fontWeight="900" fill="white" fontFamily="Nunito, sans-serif">{pctDone}%</text>
                  <text y="13" textAnchor="middle"
                    fontSize="9" fontWeight="700" fill="rgba(255,255,255,0.8)" fontFamily="Nunito, sans-serif">done</text>
                </g>
              </svg>
            </div>
          </div>
        )}

        {/* QUICK LOG */}
        <button
          style={s.logBtn}
          className="log-btn"
          onClick={() => navigate('/log')}
        >
          <span style={s.logBtnPlus}>+</span>
          <span style={s.logBtnText}>Log workout</span>
        </button>

        {/* THIS WEEK — AI COACHED GOALS (race users only) */}
        {profile?.has_race && (
          <>
            <div style={s.sectionHeader}>
              <span style={s.sectionTitle}>This week</span>
              <span style={s.aiPill}>AI coached</span>
            </div>

            <div style={s.goalsGrid}>
              {goalsLoading && !weeklyGoals ? (
                ['🏊', '🚴', '🏃'].map(e => (
                  <div key={e} style={{ ...s.goalCard, background: 'var(--t-surface)' }}>
                    <div style={s.weekEmoji}>{e}</div>
                    <div style={{ fontSize: 9, color: '#D4B0C0', fontWeight: 700, marginTop: 4 }}>Planning…</div>
                  </div>
                ))
              ) : weeklyGoals ? (
                ['swim', 'bike', 'run'].map(disc => {
                  const d        = DISCIPLINES.find(x => x.id === disc)
                  const sessions = weeklyGoals[disc] ?? []
                  const done     = weekCompleted[disc] ?? 0
                  const pct      = sessions.length > 0 ? Math.min(done / sessions.length, 1) : 0
                  const allDone  = sessions.length > 0 && done >= sessions.length
                  const nextSession = sessions[done]
                  return (
                    <div key={disc} style={{ ...s.goalCard, background: d.bg }} onClick={() => navigate('/plan')}>
                      <div style={s.weekEmoji}>{d.emoji}</div>
                      <div style={s.weekLabel}>{d.label}</div>
                      <div style={s.weekBar}>
                        <div style={{ ...s.weekBarFill, width: `${pct * 100}%`, background: d.dark }} />
                      </div>
                      <div style={{ ...s.weekCount, color: d.dark }}>{done}/{sessions.length}</div>
                      {allDone ? (
                        <div style={{ ...s.nextSessionPill, background: '#E8FAF3', color: '#2D8B6F' }}>✓ Done</div>
                      ) : nextSession ? (
                        <div style={{ ...s.nextSessionPill, background: d.color, color: d.dark }}>{nextSession.type}</div>
                      ) : null}
                    </div>
                  )
                })
              ) : null}
            </div>
          </>
        )}

        {/* RECENT WORKOUTS */}
        <div style={s.sectionHeader}>
          <span style={s.sectionTitle}>Recent workouts</span>
        </div>

        <div style={s.recentList}>
          {loading && (
            <div style={s.emptyState}>Loading…</div>
          )}
          {!loading && fetchError && (
            <div style={s.errorState}>
              Couldn't load workouts — check Supabase env vars and restart the dev server
            </div>
          )}
          {!loading && !fetchError && recentWorkouts.length === 0 && (
            <div style={s.emptyState}>No workouts yet — log your first one!</div>
          )}
          {recentWorkouts.map((w, i) => {
            const dc = getDiscStyle(w.discipline)
            return (
              <div
                key={w.id ?? i}
                style={{ ...s.recentCard, borderLeft: `4px solid ${dc.color}` }}
                className="recent-card"
                onClick={() => setSelectedWorkout(w)}
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
          {!loading && !fetchError && hasMoreWorkouts && (
            <button style={s.loadMoreBtn} onClick={handleLoadMore} disabled={loadingMore}>
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          )}
        </div>

        <div style={{ height: 24 }} />
      </div>

      {/* WORKOUT DETAIL SHEET */}
      {selectedWorkout && (
        <WorkoutSheet
          workout={selectedWorkout}
          onClose={() => setSelectedWorkout(null)}
          onDeleted={handleDeleted}
          onUpdated={handleUpdated}
        />
      )}

      {/* SETTINGS SHEET */}
      {showSettings && (
        <SettingsSheet
          profile={profile}
          onClose={() => setShowSettings(false)}
          onSignOut={async () => { setShowSettings(false); await signOut() }}
          onSave={async (updates) => { await updateProfile(updates) }}
        />
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
    background: 'var(--t-bg)',
    fontFamily: "'Nunito', system-ui, sans-serif",
    position: 'relative',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 20px 12px',
    borderBottom: '1.5px solid var(--t-border)',
    flexShrink: 0,
  },
  headerGreeting: { fontSize: 20, fontWeight: 800, color: 'var(--t-dark)', letterSpacing: -0.3 },
  headerSub:      { fontSize: 13, color: 'var(--t-muted)', marginTop: 2 },
  settingsBtn:    { background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  scroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '14px 16px',
    scrollbarWidth: 'none',
  },

  // RACE CARD
  raceCard: {
    background: 'linear-gradient(135deg, var(--t-soft) 0%, var(--t-active) 40%, var(--t-accent) 100%)',
    borderRadius: 20,
    padding: '20px 20px 16px',
    marginBottom: 14,
    boxShadow: '0 6px 20px var(--t-phone-shadow)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  raceLeft:  { flex: 1, minWidth: 0 },
  raceRight: { flexShrink: 0 },
  raceLabel: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: 700, marginBottom: 4 },
  raceDays:  { fontSize: 60, fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: -2 },
  raceSub:   { fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: 600, marginTop: 2 },
  raceWks:   { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 6, fontWeight: 600 },

  // LOG BUTTON
  logBtn: {
    width: '100%',
    background: 'linear-gradient(135deg, var(--t-soft), var(--t-active))',
    border: 'none',
    borderRadius: 16,
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    cursor: 'pointer',
    marginBottom: 20,
    boxShadow: '0 4px 16px var(--t-phone-shadow), 0 2px 4px rgba(0,0,0,0.08)',
    fontFamily: 'inherit',
  },
  logBtnPlus: { fontSize: 24, color: '#fff', fontWeight: 900, lineHeight: 1 },
  logBtnText: { fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: 0.2 },

  // SECTION
  sectionHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: 800, color: 'var(--t-dark)' },
  seeAllBtn:    { background: 'none', border: 'none', fontSize: 11, color: 'var(--t-muted)', fontWeight: 700, cursor: 'pointer', padding: 0 },

  // AI WEEKLY GOALS
  aiPill:          { fontSize: 10, fontWeight: 800, color: 'var(--t-accent)', background: 'var(--t-surface)', borderRadius: 8, padding: '3px 8px' },
  goalsGrid:       { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 22 },
  goalCard: {
    borderRadius: 14, padding: '12px 8px 10px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer',
  },
  weekEmoji:       { fontSize: 18 },
  weekLabel:       { fontSize: 9, fontWeight: 700, color: 'var(--t-muted)', textTransform: 'uppercase', letterSpacing: 0.3 },
  weekBar:         { width: '80%', height: 5, background: 'rgba(0,0,0,0.08)', borderRadius: 3, overflow: 'hidden' },
  weekBarFill:     { height: '100%', borderRadius: 3, transition: 'width 0.6s ease' },
  weekCount:       { fontSize: 11, fontWeight: 800 },
  nextSessionPill: { fontSize: 9, fontWeight: 800, borderRadius: 7, padding: '2px 7px', marginTop: 2 },

  // RECENT
  recentList:  { display: 'flex', flexDirection: 'column', gap: 8 },
  recentCard: {
    background: '#fff', borderRadius: 14, padding: '12px 14px',
    display: 'flex', alignItems: 'center', gap: 12,
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
    cursor: 'pointer',
  },
  recentEmojiBadge: {
    width: 38, height: 38, borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
  },
  recentInfo:   { flex: 1, minWidth: 0 },
  recentLabel:  { fontSize: 13, fontWeight: 800 },
  recentDetail: { fontSize: 11, color: '#B8A0B0', marginTop: 1 },
  recentTime:   { fontSize: 10, color: 'var(--t-muted)', fontWeight: 600, flexShrink: 0 },
  emptyState:   { textAlign: 'center', color: '#D4B0C0', fontSize: 13, fontWeight: 600, padding: '20px 0' },
  errorState:   { textAlign: 'center', color: '#C4354F', fontSize: 12, fontWeight: 600, padding: '20px 0', lineHeight: 1.5 },
  loadMoreBtn:  { width: '100%', padding: '10px 0', background: 'transparent', border: '1.5px solid var(--t-border)', borderRadius: 12, fontSize: 12, fontWeight: 700, color: 'var(--t-muted)', cursor: 'pointer', fontFamily: 'inherit', marginTop: 4 },
}

const css = `
  .race-card { transition: transform 0.2s ease; }
  .race-card:hover { transform: scale(1.01); }
  .log-btn { transition: transform 0.15s ease, box-shadow 0.15s ease; }
  .log-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px var(--t-phone-shadow) !important; }
  .log-btn:active { transform: translateY(0); }
  .week-card { transition: transform 0.15s ease; }
  .week-card:hover { transform: scale(1.04); }
  .recent-card { transition: transform 0.15s ease; }
  .recent-card:hover { transform: translateX(3px); }
`
