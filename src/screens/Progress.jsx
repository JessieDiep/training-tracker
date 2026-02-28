import { useState, useEffect } from 'react'
import { getWeeklyVolumeData, getClimbSends, getTriWorkouts, getStrengthWorkouts } from '../lib/workouts'
import { useAuth } from '../contexts/AuthContext'

// Grade → colour mapping (easiest → hardest)
const GRADE_COLORS = {
  '5.5':  { color: '#A8E6CF', dark: '#2D8B6F' },
  '5.6':  { color: '#A8E6CF', dark: '#2D8B6F' },
  '5.7':  { color: '#A8E6CF', dark: '#2D8B6F' },
  '5.8':  { color: '#FFF3A8', dark: '#B8960A' },
  '5.9':  { color: '#FFF3A8', dark: '#B8960A' },
  '5.10a':{ color: '#FFD4A8', dark: '#C47A2B' },
  '5.10b':{ color: '#FFD4A8', dark: '#C47A2B' },
  '5.10c':{ color: '#FFD4A8', dark: '#C47A2B' },
  '5.10d':{ color: '#FFD4A8', dark: '#C47A2B' },
  '5.11a':{ color: '#FFB8C6', dark: '#C4354F' },
  '5.11b':{ color: '#FFB8C6', dark: '#C4354F' },
  '5.11c':{ color: '#FFB8C6', dark: '#C4354F' },
  '5.11d':{ color: '#FFB8C6', dark: '#C4354F' },
  '5.12a':{ color: '#C9B8F0', dark: '#6B4FBB' },
  '5.12b':{ color: '#C9B8F0', dark: '#6B4FBB' },
  '5.12c':{ color: '#C9B8F0', dark: '#6B4FBB' },
  '5.12d':{ color: '#C9B8F0', dark: '#6B4FBB' },
}

const DISC_CONFIG = {
  swim:     { label: 'Swim',     emoji: '🏊', color: '#A8E6CF', dark: '#2D8B6F', bg: '#E8FAF3', unit: 'm'        },
  bike:     { label: 'Bike',     emoji: '🚴', color: '#C9B8F0', dark: '#6B4FBB', bg: '#F2EEFF', unit: 'min'      },
  run:      { label: 'Run',      emoji: '🏃', color: '#FFD4A8', dark: '#C47A2B', bg: '#FFF4E8', unit: 'km'       },
  strength: { label: 'Strength', emoji: '💪', color: '#FFF3A8', dark: '#B8960A', bg: '#FFFBE8', unit: 'sessions' },
  climb:    { label: 'Climb',    emoji: '🧗', color: '#FFB8C6', dark: '#C4354F', bg: '#FFE8EE', unit: 'sessions' },
}

// ── PERSONAL BESTS ────────────────────────────────────────────────────────────

const PB_DISTS = {
  swim: [100, 200, 300, 400, 500],
  bike: [5, 10, 15, 20, 25],
  run:  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
}
// RACE_DIST is derived from profile inside the component

function formatTime(minutes) {
  const totalSecs = Math.round(minutes * 60)
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function computePBs(workouts) {
  const pbs = { swim: {}, bike: {}, run: {} }
  for (const w of workouts) {
    const distance = w.details?.distance
    const duration = w.duration_minutes
    if (!distance || !duration || distance <= 0 || duration <= 0) continue
    const pace = duration / distance   // min per metre (swim) or min per km (bike/run)
    for (const target of PB_DISTS[w.discipline] ?? []) {
      if (target > distance) continue  // never extrapolate
      const time = pace * target
      if (!pbs[w.discipline][target] || time < pbs[w.discipline][target]) {
        pbs[w.discipline][target] = time
      }
    }
  }
  return pbs
}

// ── STRENGTH PBs ──────────────────────────────────────────────────────────────

function computeStrengthData(workouts) {
  // Returns { exerciseName: [{ date, weight, reps, sets, est1RM }] }
  // One entry per date (best set that day by est1RM), sorted ascending.
  const byExercise = {}
  for (const w of workouts) {
    for (const ex of w.details?.exercises ?? []) {
      if (!ex.weight || !ex.reps || ex.weight <= 0) continue
      const est1RM = Math.round(ex.weight * (1 + ex.reps / 30))
      if (!byExercise[ex.name]) byExercise[ex.name] = {}
      const prev = byExercise[ex.name][w.date]
      if (!prev || est1RM > prev.est1RM) {
        byExercise[ex.name][w.date] = { date: w.date, weight: ex.weight, reps: ex.reps, sets: ex.sets, est1RM }
      }
    }
  }
  const result = {}
  for (const [name, dateMap] of Object.entries(byExercise)) {
    result[name] = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date))
  }
  return result
}

function StrengthChart({ points }) {
  if (points.length < 2) return (
    <div style={{ textAlign: 'center', fontSize: 11, color: '#C077A0', padding: '12px 0' }}>
      Log this exercise at least twice to see your trend.
    </div>
  )
  const W = 295, H = 90, PAD = 20, PAD_TOP = 8, PAD_BTM = 16
  const vals = points.map(p => p.est1RM)
  const minV = Math.min(...vals)
  const maxV = Math.max(...vals)
  const range = maxV - minV || 10
  const xs = points.map((_, i) => PAD + (i / (points.length - 1)) * (W - 2 * PAD))
  const ys = vals.map(v => PAD_TOP + (1 - (v - minV) / range) * (H - PAD_TOP - PAD_BTM))
  const linePath = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x},${ys[i]}`).join(' ')
  const fillPath = `${linePath} L${xs[xs.length - 1]},${H} L${xs[0]},${H} Z`
  const fmtDate = d => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H + 4}`} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id="strengthGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF3A8" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#FFF3A8" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill="url(#strengthGrad)" />
      <path d={linePath} fill="none" stroke="#B8960A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={xs[i]} cy={ys[i]} r={4} fill="#B8960A" stroke="#fff" strokeWidth={1.5} />
      ))}
      <text x={xs[0]} y={H + 4} fontSize={9} fill="#C077A0" textAnchor="middle">{fmtDate(points[0].date)}</text>
      {points.length > 2 && (
        <text x={xs[Math.floor(points.length / 2)]} y={H + 4} fontSize={9} fill="#C077A0" textAnchor="middle">
          {fmtDate(points[Math.floor(points.length / 2)].date)}
        </text>
      )}
      <text x={xs[xs.length - 1]} y={H + 4} fontSize={9} fill="#C077A0" textAnchor="middle">{fmtDate(points[points.length - 1].date)}</text>
    </svg>
  )
}

// ── MINI BAR CHART ────────────────────────────────────────────────────────────
function BarChart({ data, weeks, color, dark, unit, activeWeek, setActiveWeek }) {
  const max = Math.max(...data, 1)
  return (
    <div style={ch.wrap}>
      <div style={ch.bars}>
        {data.map((val, i) => {
          const active = activeWeek === i
          const pct    = val / max
          return (
            <div key={i} style={ch.barCol} onClick={() => setActiveWeek(active ? null : i)}>
              {active && (
                <div style={{ ...ch.tooltip, background: dark }}>
                  {val}{unit === 'sessions' ? '' : unit}
                </div>
              )}
              <div
                style={{ ...ch.bar, height: `${Math.max(pct * 100, 4)}%`, background: active ? dark : color, opacity: active ? 1 : 0.75 }}
                className={active ? '' : 'uikit-bar-fill'}
              />
            </div>
          )
        })}
      </div>
      <div style={ch.xAxis}>
        {weeks.map((w, i) => (
          <div key={i} style={{ ...ch.xLabel, color: activeWeek === i ? dark : '#C0A0B8' }}>
            {w.split(' ')[1]}
          </div>
        ))}
      </div>
    </div>
  )
}

const ch = {
  wrap:   { paddingTop: 8 },
  bars:   { display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 },
  barCol: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', position: 'relative', cursor: 'pointer' },
  bar:    { width: '100%', borderRadius: '4px 4px 0 0', transition: 'height 0.3s ease, background 0.15s' },
  tooltip:{ position: 'absolute', top: -26, color: '#fff', fontSize: 10, fontWeight: 800, borderRadius: 6, padding: '2px 6px', whiteSpace: 'nowrap' },
  xAxis:  { display: 'flex', gap: 4, marginTop: 4 },
  xLabel: { flex: 1, fontSize: 9, fontWeight: 700, textAlign: 'center', transition: 'color 0.15s' },
}

// ── CLIMB LINE CHART ──────────────────────────────────────────────────────────
const gradeLabels = { 9: '5.9', 10: '5.10', 11: '5.11', 12: '5.12' }

function ClimbChart({ data }) {
  if (!data || data.length === 0) return <div style={{ color: '#C0A0B8', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>No climb data yet</div>

  const W = 295, H = 80, PAD = 16
  const minG = 8, maxG = 12
  const pts = data.map((d, i) => ({
    x: PAD + (i / Math.max(data.length - 1, 1)) * (W - PAD * 2),
    y: H - PAD - ((d.grade - minG) / (maxG - minG)) * (H - PAD * 2),
  }))
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const area = `${path} L${pts[pts.length - 1].x},${H} L${pts[0].x},${H} Z`

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="climbGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFB8C6" stopOpacity="0.5"/>
          <stop offset="100%" stopColor="#FFB8C6" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {[9, 10, 11, 12].map(g => {
        const y = H - PAD - ((g - minG) / (maxG - minG)) * (H - PAD * 2)
        return (
          <g key={g}>
            <line x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="#F4D0DC" strokeWidth="1" strokeDasharray="3,3"/>
            <text x={PAD - 4} y={y + 4} fontSize="8" fill="#C0A0B8" fontWeight="700" textAnchor="end">{gradeLabels[g]}</text>
          </g>
        )
      })}
      <path d={area} fill="url(#climbGrad)"/>
      <path d={path} fill="none" stroke="#C4354F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="#C4354F" stroke="white" strokeWidth="2"/>
      ))}
    </svg>
  )
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
export default function Progress() {
  const { profile } = useAuth()
  const RACE_DIST = profile?.has_race && profile?.race_distances ? profile.race_distances : null

  const [activeDisc,  setActiveDisc]  = useState('swim')
  const [activeWeek,  setActiveWeek]  = useState(null)
  const [activePBDisc,setActivePBDisc]= useState('swim')
  const [volumeData,  setVolumeData]  = useState(null)
  const [thisWeek,    setThisWeek]    = useState({})
  const [lastWeek,    setLastWeek]    = useState({})
  const [climbSends,    setClimbSends]    = useState({})
  const [pbs,           setPbs]           = useState({ swim: {}, bike: {}, run: {} })
  const [strengthData,  setStrengthData]  = useState({})
  const [activeExercise,setActiveExercise]= useState(null)
  const [loading,       setLoading]       = useState(true)

  useEffect(() => {
    Promise.all([
      getWeeklyVolumeData(6),
      getClimbSends(),
      getTriWorkouts(),
      getStrengthWorkouts(),
    ]).then(([vol, sends, triW, strengthW]) => {
      setVolumeData(vol)
      setClimbSends(sends)
      setPbs(computePBs(triW))
      const sd = computeStrengthData(strengthW)
      setStrengthData(sd)
      if ('Hip Thrusts' in sd) {
        setActiveExercise('Hip Thrusts')
      } else {
        const sorted = Object.entries(sd).sort((a, b) => b[1].length - a[1].length)
        if (sorted.length) setActiveExercise(sorted[0][0])
      }
      const summarise = (workouts) => ({
        swim:     workouts.filter(w => w.discipline === 'swim').reduce((s, w) => s + (w.details?.distance || 0), 0),
        bike:     workouts.filter(w => w.discipline === 'bike').reduce((s, w) => s + (w.duration_minutes || 0), 0),
        run:      workouts.filter(w => w.discipline === 'run').reduce((s, w) => s + (w.details?.distance || 0), 0),
        strength: workouts.filter(w => w.discipline === 'strength').length,
        climb:    workouts.filter(w => w.discipline === 'climb').length,
      })
      setThisWeek(summarise(vol.thisWeekRaw))
      setLastWeek(summarise(vol.lastWeekRaw))
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  function delta(key) {
    const t = thisWeek[key] ?? 0, l = lastWeek[key] ?? 0
    const diff = t - l
    const pct  = l > 0 ? Math.round((diff / l) * 100) : (t > 0 ? 100 : 0)
    return { diff, pct, up: diff >= 0 }
  }

  const disc   = DISC_CONFIG[activeDisc]
  const data   = volumeData?.data[activeDisc]  ?? []
  const labels = volumeData?.labels            ?? []

  // Build climbing grade trend from climb workouts in volume data window
  // (simplified: just render empty chart if no real data available)
  const climbGrades = []

  return (
    <div style={s.screen}>
      <style>{css}</style>

      {/* HEADER */}
      <div style={s.pageHeader}>
        <div style={s.pageTitle}>Progress</div>
      </div>

      <div style={s.scroll}>
        {/* ── THIS WEEK vs LAST ── */}
        <div style={s.sectionHeader}>
          <span style={s.sectionTitle}>This week vs last</span>
        </div>
        <div style={s.deltaGrid}>
          {Object.keys(DISC_CONFIG).map(key => {
            const d         = DISC_CONFIG[key]
            const { pct, up } = delta(key)
            return (
              <div key={key} style={{ ...s.deltaCard, background: d.bg, border: `1.5px solid ${d.color}` }}>
                <div style={s.deltaEmoji}>{d.emoji}</div>
                <div style={s.deltaVal}>
                  {thisWeek[key] ?? 0}
                  <span style={s.deltaUnit}>{d.unit === 'sessions' ? '' : d.unit}</span>
                </div>
                <div style={{ ...s.deltaBadge, background: up ? '#E8FAF3' : '#FFE8EE', color: up ? '#2D8B6F' : '#C4354F' }}>
                  {up ? '▲' : '▼'} {Math.abs(pct)}%
                </div>
              </div>
            )
          })}
        </div>

        {/* ── WEEKLY VOLUME CHART ── */}
        <div style={s.sectionHeader}>
          <span style={s.sectionTitle}>Weekly volume</span>
        </div>
        <div style={s.discTabs}>
          {Object.keys(DISC_CONFIG).map(key => {
            const d      = DISC_CONFIG[key]
            const active = activeDisc === key
            return (
              <button key={key}
                style={{ ...s.discTab, background: active ? d.color : 'transparent', border: `1.5px solid ${active ? d.dark : '#F4C0D0'}` }}
                onClick={() => { setActiveDisc(key); setActiveWeek(null) }}>
                <span style={{ fontSize: 14 }}>{d.emoji}</span>
              </button>
            )
          })}
        </div>
        <div style={{ ...s.chartCard, borderColor: disc.color }}>
          <div style={s.chartHeader}>
            <span style={{ ...s.chartTitle, color: disc.dark }}>{disc.label}</span>
            <span style={s.chartUnit}>{disc.unit === 'sessions' ? 'Sessions / week' : `${disc.unit} / week`}</span>
          </div>
          {loading ? (
            <div style={{ color: '#C0A0B8', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>Loading…</div>
          ) : activeDisc === 'climb' ? (
            <>
              <ClimbChart data={climbGrades} />
              <div style={s.climbNote}>Highest grade reached per week</div>
            </>
          ) : (
            <BarChart
              data={data} weeks={labels}
              color={disc.color} dark={disc.dark}
              unit={disc.unit}
              activeWeek={activeWeek} setActiveWeek={setActiveWeek}
            />
          )}
          {activeWeek !== null && activeDisc !== 'climb' && (
            <div style={{ ...s.weekNote, color: disc.dark }}>
              {labels[activeWeek]}: {data[activeWeek]}{disc.unit !== 'sessions' ? disc.unit : ' sessions'}
            </div>
          )}
        </div>

        {/* ── PERSONAL BESTS ── */}
        <div style={s.sectionHeader}>
          <span style={s.sectionTitle}>Personal bests</span>
          <span style={s.sectionHint}>from logged sessions</span>
        </div>
        <div style={s.pbTabs}>
          {['swim', 'bike', 'run'].map(disc => {
            const d      = DISC_CONFIG[disc]
            const active = activePBDisc === disc
            return (
              <button key={disc}
                style={{ ...s.pbTab, background: active ? d.color : 'transparent', border: `1.5px solid ${active ? d.dark : '#F4C0D0'}` }}
                onClick={() => setActivePBDisc(disc)}>
                <span>{d.emoji}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: active ? d.dark : '#B8A0B0' }}>{d.label}</span>
              </button>
            )
          })}
        </div>
        <div style={s.pbCard}>
          {PB_DISTS[activePBDisc].map(dist => {
            const dc     = DISC_CONFIG[activePBDisc]
            const time   = pbs[activePBDisc]?.[dist]
            const isRace = RACE_DIST != null && dist === RACE_DIST[activePBDisc]
            const unit   = activePBDisc === 'swim' ? 'm' : 'km'
            return (
              <div key={dist} style={{ ...s.pbRow, background: isRace ? dc.bg : 'transparent' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ ...s.pbDist, color: isRace ? dc.dark : '#5A3050' }}>
                    {dist}{unit}
                  </span>
                  {isRace && <span style={{ ...s.racePill, background: dc.color, color: dc.dark }}>race</span>}
                </div>
                <span style={{ ...s.pbTime, color: time ? dc.dark : '#D4B0C0' }}>
                  {time ? formatTime(time) : '—'}
                </span>
              </div>
            )
          })}
          {Object.keys(pbs[activePBDisc]).length === 0 && (
            <div style={s.pbEmpty}>Log a {activePBDisc} session with distance to see your bests</div>
          )}
        </div>

        {/* ── CLIMBING SENDS ── */}
        <div style={s.sectionHeader}>
          <span style={s.sectionTitle}>Climbing sends</span>
        </div>
        <div style={s.sendCard}>
          {Object.keys(climbSends).length === 0 ? (
            <div style={{ color: '#C0A0B8', fontSize: 12, textAlign: 'center', padding: '8px 0' }}>
              No sends logged yet
            </div>
          ) : (() => {
            const sorted = Object.keys(climbSends).sort()
            const max    = Math.max(...Object.values(climbSends), 1)
            return sorted.map(grade => {
              const { color, dark } = GRADE_COLORS[grade] ?? { color: '#C9B8F0', dark: '#6B4FBB' }
              return (
                <div key={grade} style={s.sendRow}>
                  <div style={s.sendGrade}>{grade}</div>
                  <div style={s.sendBarWrap}>
                    <div style={{ ...s.sendBar, width: `${(climbSends[grade] / max) * 100}%`, background: color }} />
                  </div>
                  <div style={{ ...s.sendCount, color: dark }}>{climbSends[grade]}</div>
                </div>
              )
            })
          })()}
        </div>

        {/* ── STRENGTH PBs ── */}
        {Object.keys(strengthData).length > 0 && (() => {
          const exercises = Object.entries(strengthData)
            .sort((a, b) => b[1].length - a[1].length)
            .map(([name]) => name)
          const points = activeExercise ? strengthData[activeExercise] ?? [] : []
          const best   = points.reduce((b, p) => p.est1RM > (b?.est1RM ?? 0) ? p : b, null)
          return (
            <>
              <div style={s.sectionHeader}>
                <span style={s.sectionTitle}>Strength PBs</span>
                <span style={s.sectionHint}>est. 1RM per exercise</span>
              </div>
              <select
                value={activeExercise ?? ''}
                onChange={e => setActiveExercise(e.target.value)}
                style={s.exerciseSelect}
              >
                {exercises.map(name => (
                  <option key={name} value={name}>{name} ({strengthData[name].length} sessions)</option>
                ))}
              </select>
              {best && (
                <div style={{ ...s.chartCard, borderColor: '#FFF3A8' }}>
                  <div style={s.chartHeader}>
                    <span style={{ ...s.chartTitle, color: '#B8960A' }}>Est. 1RM · {activeExercise}</span>
                    <span style={s.chartUnit}>Epley formula</span>
                  </div>
                  <div style={s.strengthBest}>
                    <span style={s.strengthBestNum}>~{best.est1RM}</span>
                    <span style={s.strengthBestUnit}>kg</span>
                  </div>
                  <div style={s.strengthBestSub}>
                    {best.weight}kg × {best.reps} reps ({best.sets} sets)
                  </div>
                  {points.length >= 2 && (
                    <>
                      <div style={{ fontSize: 11, fontWeight: 800, marginTop: 14, marginBottom: 6, color: '#B8960A' }}>
                        Trend over {points.length} sessions
                      </div>
                      <StrengthChart points={points} />
                    </>
                  )}
                  {points.length === 1 && (
                    <div style={{ fontSize: 11, color: '#C077A0', marginTop: 8 }}>
                      Log this exercise at least twice to see your trend.
                    </div>
                  )}
                </div>
              )}
            </>
          )
        })()}

        <div style={{ height: 32 }} />
      </div>
    </div>
  )
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const s = {
  screen:    { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#FFF8FB', fontFamily: "'Nunito', system-ui, sans-serif" },
  pageHeader:{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 20px 10px', borderBottom: '1.5px solid #F9D0DF', flexShrink: 0 },
  pageTitle: { fontSize: 17, fontWeight: 900, color: '#8B1A4A' },
  scroll:    { flex: 1, overflowY: 'auto', padding: '14px 16px', scrollbarWidth: 'none' },

  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 18 },
  sectionTitle:  { fontSize: 14, fontWeight: 900, color: '#8B1A4A' },

  deltaGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 },
  deltaCard: { borderRadius: 12, padding: '8px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  deltaEmoji:{ fontSize: 16 },
  deltaVal:  { fontSize: 12, fontWeight: 900, color: '#5A3050' },
  deltaUnit: { fontSize: 9, fontWeight: 600, color: '#B8A0B0', marginLeft: 1 },
  deltaBadge:{ fontSize: 9, fontWeight: 800, borderRadius: 6, padding: '2px 5px' },

  discTabs: { display: 'flex', gap: 6, marginBottom: 10 },
  discTab:  { flex: 1, height: 36, borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', fontFamily: 'inherit' },
  chartCard:{ background: '#fff', border: '1.5px solid', borderRadius: 16, padding: '14px 14px 10px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' },
  chartHeader:{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  chartTitle: { fontSize: 14, fontWeight: 900 },
  chartUnit:  { fontSize: 10, color: '#C077A0', fontWeight: 700 },
  weekNote:   { fontSize: 11, fontWeight: 800, textAlign: 'center', marginTop: 6 },
  climbNote:  { fontSize: 10, color: '#C077A0', fontWeight: 700, textAlign: 'center', marginTop: 4 },

  sendCard:   { background: '#fff', borderRadius: 16, padding: '12px 14px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: 8 },
  sendRow:    { display: 'flex', alignItems: 'center', gap: 8 },
  sendGrade:  { fontSize: 11, fontWeight: 800, color: '#8B1A4A', width: 36, flexShrink: 0 },
  sendBarWrap:{ flex: 1, height: 14, background: '#F4D0DC', borderRadius: 7, overflow: 'hidden' },
  sendBar:    { height: '100%', borderRadius: 7, transition: 'width 0.5s ease' },
  sendCount:  { fontSize: 12, fontWeight: 900, width: 20, textAlign: 'right', flexShrink: 0 },

  sectionHint:{ fontSize: 10, color: '#C0A0B8', fontWeight: 600 },
  pbTabs:     { display: 'flex', gap: 6, marginBottom: 10 },
  pbTab:      { flex: 1, height: 38, borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: 'all 0.15s', fontFamily: 'inherit' },
  pbCard:     { background: '#fff', borderRadius: 16, padding: '4px 14px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', overflow: 'hidden' },
  pbRow:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F9D0DF', borderRadius: 8, margin: '0 -4px', padding: '10px 4px' },
  pbDist:     { fontSize: 13, fontWeight: 800 },
  pbTime:     { fontSize: 15, fontWeight: 900, letterSpacing: -0.3 },
  racePill:   { fontSize: 9, fontWeight: 800, borderRadius: 6, padding: '2px 6px', letterSpacing: 0.2, textTransform: 'uppercase' },
  pbEmpty:    { fontSize: 12, color: '#C0A0B8', fontWeight: 600, textAlign: 'center', padding: '16px 0' },

  exerciseSelect:  { width: '100%', padding: '9px 12px', borderRadius: 12, border: '1.5px solid #F4C0D0', background: '#fff', fontSize: 13, fontWeight: 700, color: '#C077A0', fontFamily: 'inherit', cursor: 'pointer', marginBottom: 10, appearance: 'auto' },
  strengthBest:    { display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 10 },
  strengthBestNum: { fontSize: 36, fontWeight: 900, color: '#B8960A', lineHeight: 1 },
  strengthBestUnit:{ fontSize: 16, fontWeight: 700, color: '#B8960A' },
  strengthBestSub: { fontSize: 11, color: '#999', marginTop: 2, marginBottom: 4 },
}

const css = `
  .pr-card { transition: transform 0.15s; }
  .pr-card:hover { transform: translateX(3px); }
`
