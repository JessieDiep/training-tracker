import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveWorkout } from '../lib/workouts'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

// ── CONFIG ───────────────────────────────────────────────────────────────────
const DISCIPLINES = [
  { id: 'swim',    label: 'Swim',    color: '#A8E6CF', dark: '#2D8B6F', bg: '#E8FAF3', emoji: '🏊' },
  { id: 'bike',    label: 'Bike',    color: '#C9B8F0', dark: '#6B4FBB', bg: '#F2EEFF', emoji: '🚴' },
  { id: 'run',     label: 'Run',     color: '#FFD4A8', dark: '#C47A2B', bg: '#FFF4E8', emoji: '🏃' },
  { id: 'strength',label: 'Strength',color: '#FFF3A8', dark: '#B8960A', bg: '#FFFBE8', emoji: '💪' },
  { id: 'climb',   label: 'Climb',   color: '#FFB8C6', dark: '#C4354F', bg: '#FFE8EE', emoji: '🧗' },
  { id: 'recover', label: 'Recover', color: '#B8F0E0', dark: '#1A7A5E', bg: '#E8FAF3', emoji: '🌿' },
]

const SWIM_FOCUS    = ['Technique', 'Endurance', 'Intervals', 'Race Pace', 'Drills']
const SWIM_PRESETS  = [100, 300, 500]
const BIKE_TYPES    = ['Endurance', 'Intervals', 'Hills', 'Recovery']
const RUN_TYPES     = ['Recovery', 'Endurance', 'Tempo', 'Intervals']
const RUN_PRESETS   = [1, 2, 3, 4, 5]
const RUN_SURFACES  = ['Road', 'Treadmill', 'Trail', 'Soft Surface']
const STRENGTH_FOCUS = ['Glutes', 'Legs', 'Core', 'Upper Body', 'Full Body', 'Mobility']
const RECOVER_TYPES = ['Walk', 'Stretch', 'Foam Roll', 'Yoga', 'Posture Correction']
const SEND_STATUS   = [
  { id: 'sent',    label: 'Sent ✓',  color: '#2D8B6F', bg: '#E8FAF3' },
  { id: 'working', label: 'Working', color: '#C47A2B', bg: '#FFF4E8' },
  { id: 'project', label: 'Project', color: '#6B4FBB', bg: '#F2EEFF' },
]
const CLIMB_GRADES = [
  '5.5','5.6','5.7','5.8','5.9',
  '5.10a','5.10b','5.10c','5.10d',
  '5.11a','5.11b','5.11c','5.11d',
  '5.12a','5.12b','5.12c','5.12d',
]
// Exercise names for autocomplete — no hardcoded weights (each user builds their own from history)
const EXERCISE_NAMES = [
  'Hip Thrusts', 'RDL', 'Split Squats', 'Bulgarian Split Squat',
  'Lunges', 'Step-ups', 'Box Hops', 'Abduction',
  'Squats', 'Deadlift', 'Bench Press', 'Pull-ups',
  'Rows', 'Shoulder Press', 'Lat Pulldown', 'Bicep Curl',
  'Tricep Extension', 'Plank', 'Crunches', 'Leg Press',
]

// ── NUMERIC KEYPAD ────────────────────────────────────────────────────────────
function NumKeypad({ value, onConfirm, onClose, unit = '', allowDecimal = false }) {
  const [input, setInput] = useState('')
  function press(key) {
    if (key === '⌫') {
      setInput(p => p.slice(0, -1))
    } else if (key === '.' && allowDecimal && !input.includes('.')) {
      setInput(p => (p || '0') + '.')
    } else if (key !== '.') {
      setInput(p => p + key)
    }
  }
  function commit() {
    const parsed = allowDecimal ? parseFloat(input) : parseInt(input)
    onConfirm(isNaN(parsed) ? value : parsed)
    onClose()
  }
  const keys    = ['1','2','3','4','5','6','7','8','9', allowDecimal ? '.' : '', '0','⌫']
  const display = input || String(value ?? '0')
  return (
    <div style={kp.overlay} onClick={commit}>
      <div style={kp.sheet} onClick={e => e.stopPropagation()}>
        <div style={kp.display}>
          <span style={kp.displayNum}>{display}</span>
          <span style={kp.displayUnit}>{unit}</span>
        </div>
        <div style={kp.grid}>
          {keys.map((k, i) => (
            <button
              key={i}
              style={{ ...kp.key, ...(k === '' ? kp.keyEmpty : {}), ...(k === '⌫' ? kp.keyDel : {}) }}
              onClick={() => k && press(k)}
            >
              {k}
            </button>
          ))}
        </div>
        <button style={kp.doneBtn} onClick={commit}>Done</button>
      </div>
    </div>
  )
}

const kp = {
  overlay:    { position: 'absolute', inset: 0, background: 'rgba(139,26,74,0.25)', backdropFilter: 'blur(3px)', zIndex: 100, display: 'flex', alignItems: 'flex-end' },
  sheet:      { width: '100%', background: '#FFF8FB', borderRadius: '22px 22px 0 0', padding: '16px 16px 28px', boxShadow: '0 -6px 24px rgba(194,24,91,0.12)' },
  display:    { textAlign: 'center', padding: '10px 0 14px', borderBottom: '1.5px solid #F4C0D0', marginBottom: 14 },
  displayNum: { fontSize: 40, fontWeight: 900, color: '#8B1A4A' },
  displayUnit:{ fontSize: 18, fontWeight: 700, color: '#C077A0', marginLeft: 6 },
  grid:       { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 },
  key:        { background: '#FFF0F5', border: '1.5px solid #F4C0D0', borderRadius: 12, height: 52, fontSize: 20, fontWeight: 700, color: '#5A3050', cursor: 'pointer', fontFamily: 'inherit' },
  keyEmpty:   { background: 'transparent', border: 'none', cursor: 'default' },
  keyDel:     { background: '#F9D0DF', color: '#C2185B' },
  doneBtn:    { width: '100%', marginTop: 12, background: 'linear-gradient(135deg, #F48FB1, #E91E8C)', border: 'none', borderRadius: 14, color: '#fff', fontSize: 17, fontWeight: 800, padding: '13px 0', cursor: 'pointer', fontFamily: 'inherit' },
}

// ── TAPPABLE FIELD ────────────────────────────────────────────────────────────
function TapField({ value, onConfirm, unit, allowDecimal, accentColor = '#F4A7B9', darkColor = '#8B1A4A' }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button style={{ ...s.tapField, borderColor: accentColor }} onClick={() => setOpen(true)}>
        <span style={{ ...s.tapFieldNum, color: darkColor }}>{value || '—'}</span>
        {value > 0 && <span style={{ ...s.tapFieldUnit, color: accentColor }}>{unit}</span>}
        <svg style={{ marginLeft: 'auto' }} width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M11 5H6C4.9 5 4 5.9 4 7V18C4 19.1 4.9 20 6 20H17C18.1 20 19 19.1 19 18V13M17.586 3.586a2 2 0 112.828 2.828L12 15H9V12L17.586 3.586Z" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && <NumKeypad value={value} unit={unit} allowDecimal={allowDecimal} onConfirm={onConfirm} onClose={() => setOpen(false)} />}
    </>
  )
}

// ── EFFORT SLIDER ─────────────────────────────────────────────────────────────
function EffortSlider({ value, onChange }) {
  const trackRef = useRef(null)
  function getVal(clientX) {
    const rect = trackRef.current.getBoundingClientRect()
    const pct  = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    return Math.round(pct * 9) + 1
  }
  function onMouseDown(e) {
    onChange(getVal(e.clientX))
    const move = (ev) => onChange(getVal(ev.clientX))
    const up   = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }
  function onTouchStart(e) {
    const move = (ev) => onChange(getVal(ev.touches[0].clientX))
    const end  = () => { window.removeEventListener('touchmove', move); window.removeEventListener('touchend', end) }
    window.addEventListener('touchmove', move)
    window.addEventListener('touchend', end)
    onChange(getVal(e.touches[0].clientX))
  }
  const pct   = ((value - 1) / 9) * 100
  const color = value <= 3 ? '#A8E6CF' : value <= 6 ? '#F4A7B9' : value <= 8 ? '#FF8FAB' : '#C2185B'
  return (
    <div style={s.sliderWrap}>
      <div ref={trackRef} style={s.sliderTrack} onMouseDown={onMouseDown} onTouchStart={onTouchStart}>
        <div style={{ ...s.sliderFill, width: `${pct}%`, background: color }} />
        <div style={{ ...s.sliderThumb, left: `calc(${pct}% - 14px)`, background: color }} />
      </div>
      <div style={s.sliderLabels}>
        <span style={s.sliderLabelL}>Easy</span>
        <div style={{ ...s.sliderVal, color }}>{value}</div>
        <span style={s.sliderLabelR}>Max</span>
      </div>
    </div>
  )
}

// ── SHARED MICRO-COMPONENTS ──────────────────────────────────────────────────
function Label({ children }) {
  return <div style={s.label}>{children}</div>
}

function PresetRow({ presets, value, onSelect, format, darkColor }) {
  return (
    <div style={s.presetRow}>
      {presets.map(p => {
        const active = value === p
        return (
          <button key={p}
            style={{ ...s.presetBtn, background: active ? '#FFF0F5' : '#FFF5F8', border: `1.5px solid ${active ? darkColor : '#F4C0D0'}`, color: active ? darkColor : '#B8A0B0', fontWeight: active ? 800 : 600 }}
            onClick={() => onSelect(p)}>
            {format ? format(p) : p}
          </button>
        )
      })}
    </div>
  )
}

function ToggleGroup({ options, value, onChange, multi = false, accentBg, darkColor }) {
  return (
    <div style={s.toggleRow}>
      {options.map(opt => {
        const active = multi ? value.includes(opt) : value === opt
        return (
          <button key={opt}
            style={{ ...s.toggleBtn, background: active ? accentBg : '#FFF5F8', border: `1.5px solid ${active ? darkColor : '#F4C0D0'}`, color: active ? darkColor : '#B8A0B0', fontWeight: active ? 800 : 600 }}
            onClick={() => {
              if (multi) onChange(active ? value.filter(v => v !== opt) : [...value, opt])
              else       onChange(opt)
            }}>
            {opt}
          </button>
        )
      })}
    </div>
  )
}

// ── DISCIPLINE FORMS ──────────────────────────────────────────────────────────
function SwimForm({ data, setData }) {
  return (
    <>
      <Label>Focus</Label>
      <ToggleGroup options={SWIM_FOCUS} value={data.focus} onChange={v => setData({ ...data, focus: v })} accentBg="#C8F0E4" darkColor="#2D8B6F" />
      <Label>Distance *</Label>
      <PresetRow presets={SWIM_PRESETS} value={data.distance} onSelect={v => setData({ ...data, distance: v })} format={p => `${p}m`} darkColor="#2D8B6F" />
      <TapField value={data.distance} unit="m" allowDecimal={false} onConfirm={v => setData({ ...data, distance: v })} accentColor="#A8E6CF" darkColor="#2D8B6F" />
      <Label>Location</Label>
      <ToggleGroup options={['Pool', 'Open Water']} value={data.location} onChange={v => setData({ ...data, location: v })} accentBg="#C8F0E4" darkColor="#2D8B6F" />
      <Label>Notes <span style={s.optional}>(optional)</span></Label>
      <textarea style={s.textarea} placeholder="e.g. smooth breathing, short repeats…" value={data.notes} onChange={e => setData({ ...data, notes: e.target.value })} />
    </>
  )
}

function BikeForm({ data, setData }) {
  return (
    <>
      <Label>Type</Label>
      <ToggleGroup options={BIKE_TYPES} value={data.type} onChange={v => setData({ ...data, type: v })} accentBg="#DDD0F8" darkColor="#6B4FBB" />
      <Label>Distance <span style={s.optional}>(optional)</span></Label>
      <TapField value={data.distance} unit="km" allowDecimal={true} onConfirm={v => setData({ ...data, distance: v })} accentColor="#C9B8F0" darkColor="#6B4FBB" />
      <Label>Location</Label>
      <ToggleGroup options={['Indoor / Trainer', 'Outdoor']} value={data.location} onChange={v => setData({ ...data, location: v })} accentBg="#DDD0F8" darkColor="#6B4FBB" />
      <Label>Notes <span style={s.optional}>(optional)</span></Label>
      <textarea style={s.textarea} placeholder="e.g. smooth cadence, steady effort…" value={data.notes} onChange={e => setData({ ...data, notes: e.target.value })} />
    </>
  )
}

function RunForm({ data, setData }) {
  return (
    <>
      <Label>Type</Label>
      <ToggleGroup options={RUN_TYPES} value={data.type} onChange={v => setData({ ...data, type: v })} accentBg="#FFE0B8" darkColor="#C47A2B" />
      <Label>Distance *</Label>
      <PresetRow presets={RUN_PRESETS} value={data.distance} onSelect={v => setData({ ...data, distance: v })} format={p => `${p}km`} darkColor="#C47A2B" />
      <TapField value={data.distance} unit="km" allowDecimal={true} onConfirm={v => setData({ ...data, distance: v })} accentColor="#FFD4A8" darkColor="#C47A2B" />
      <Label>Surface</Label>
      <ToggleGroup options={RUN_SURFACES} value={data.surface} onChange={v => setData({ ...data, surface: v })} accentBg="#FFE0B8" darkColor="#C47A2B" />
      <div style={s.flagRow}>
        <button
          style={{ ...s.flagBtn, background: data.footPain ? '#FFE8EE' : '#FFF5F8', border: `1.5px solid ${data.footPain ? '#C4354F' : '#F4C0D0'}` }}
          onClick={() => setData({ ...data, footPain: !data.footPain })}>
          <div style={{ ...s.flagCheck, background: data.footPain ? '#C4354F' : 'transparent', border: `2px solid ${data.footPain ? '#C4354F' : '#F4A7B9'}` }}>
            {data.footPain && <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: data.footPain ? '#C4354F' : '#B8A0B0' }}>Modified / foot pain flagged</span>
        </button>
      </div>
      <Label>Notes <span style={s.optional}>(optional)</span></Label>
      <textarea style={s.textarea} placeholder="e.g. jog-walk combo, 2.2mi in 30min…" value={data.notes} onChange={e => setData({ ...data, notes: e.target.value })} />
    </>
  )
}

function StrengthForm({ data, setData, savedExercises, onSaveExercise }) {
  const [exInput,         setExInput]         = useState('')
  const [showSugg,        setShowSugg]        = useState(false)
  const [pendingEx,       setPendingEx]       = useState(null)
  const [firstWeightOpen, setFirstWeightOpen] = useState(false)

  // Suggestions: user's own exercise history first, then any known names they haven't used yet
  const suggestions = [
    ...Object.keys(savedExercises),
    ...EXERCISE_NAMES.filter(n => !(n in savedExercises)),
  ].filter(e =>
    e.toLowerCase().includes(exInput.toLowerCase()) &&
    !data.exercises.find(x => x.name === e)
  )

  function pickExercise(name) {
    if (name in savedExercises) {
      addExercise(name, savedExercises[name])
    } else {
      setPendingEx({ name })
      setFirstWeightOpen(true)
    }
    setExInput('')
    setShowSugg(false)
  }
  function addExercise(name, weight) {
    onSaveExercise(name, weight)
    setData({ ...data, exercises: [...data.exercises, { name, sets: 3, reps: 10, weight }] })
    setPendingEx(null)
  }
  function updateEx(i, field, val) {
    const updated = [...data.exercises]
    updated[i]    = { ...updated[i], [field]: val }
    setData({ ...data, exercises: updated })
  }
  function removeEx(i) {
    setData({ ...data, exercises: data.exercises.filter((_, idx) => idx !== i) })
  }

  return (
    <>
      {firstWeightOpen && pendingEx && (
        <NumKeypad value={0} unit="lb" allowDecimal={false}
          onConfirm={w => { addExercise(pendingEx.name, w); setFirstWeightOpen(false) }}
          onClose={() => { setFirstWeightOpen(false); setPendingEx(null) }} />
      )}
      <Label>Focus <span style={s.optional}>(multi-select)</span></Label>
      <ToggleGroup options={STRENGTH_FOCUS} value={data.focus} onChange={v => setData({ ...data, focus: v })} multi={true} accentBg="#FFF3A8" darkColor="#B8960A" />
      <Label>Exercises</Label>
      {data.exercises.length > 0 && (
        <div style={s.exList}>
          {data.exercises.map((ex, i) => (
            <div key={i} style={s.exCard}>
              <div style={s.exHeader}>
                <span style={s.exName}>{ex.name}</span>
                <button style={s.exRemove} onClick={() => removeEx(i)}>×</button>
              </div>
              <div style={s.exControls}>
                {[['sets', ex.sets], ['reps', ex.reps]].map(([field, val]) => (
                  <div key={field} style={s.exField}>
                    <span style={s.exFieldLabel}>{field}</span>
                    <div style={s.miniStepper}>
                      <button style={s.miniBtn} onClick={() => updateEx(i, field, Math.max(1, val - 1))}>−</button>
                      <span style={s.miniVal}>{val}</span>
                      <button style={s.miniBtn} onClick={() => updateEx(i, field, val + 1)}>+</button>
                    </div>
                  </div>
                ))}
                <div style={s.exField}>
                  <span style={s.exFieldLabel}>weight</span>
                  <TapWeightField value={ex.weight} onChange={w => updateEx(i, 'weight', w)} />
                </div>
              </div>
              <textarea style={{ ...s.textarea, marginTop: 8, fontSize: 11, minHeight: 40 }}
                placeholder="notes for this set…"
                value={ex.note || ''} onChange={e => updateEx(i, 'note', e.target.value)} />
            </div>
          ))}
        </div>
      )}
      <div style={s.exInputWrap}>
        <input style={s.exInput} placeholder="search or add exercise…"
          value={exInput}
          onChange={e => { setExInput(e.target.value); setShowSugg(true) }}
          onFocus={() => setShowSugg(true)} />
        {exInput.length > 0 && (
          <button style={s.exAddBtn} onClick={() => pickExercise(exInput)}>Add</button>
        )}
      </div>
      {showSugg && exInput.length > 0 && (
        <div style={s.suggestions}>
          {suggestions.slice(0, 5).map(e => (
            <button key={e} style={s.suggestionBtn} onClick={() => pickExercise(e)}>{e}</button>
          ))}
          {!suggestions.find(e => e.toLowerCase() === exInput.toLowerCase()) && (
            <button style={{ ...s.suggestionBtn, color: '#C2185B', fontWeight: 700 }} onClick={() => pickExercise(exInput)}>
              + add "{exInput}"
            </button>
          )}
        </div>
      )}
      <Label>Session notes <span style={s.optional}>(optional)</span></Label>
      <textarea style={s.textarea} placeholder="e.g. felt strong, glutes fired well…" value={data.notes} onChange={e => setData({ ...data, notes: e.target.value })} />
    </>
  )
}

function TapWeightField({ value, onChange }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {open && <NumKeypad value={value} unit="lb" onConfirm={onChange} onClose={() => setOpen(false)} />}
      <button style={s.miniBtn} onClick={() => onChange(Math.max(0, value - 1))}>−</button>
      <button style={s.weightTap} onClick={() => setOpen(true)}>{value > 0 ? `${value}lb` : 'BW'}</button>
      <button style={s.miniBtn} onClick={() => onChange(value + 1)}>+</button>
    </div>
  )
}

function RecoverForm({ data, setData }) {
  return (
    <>
      <Label>Type <span style={s.optional}>(multi-select)</span></Label>
      <ToggleGroup options={RECOVER_TYPES} value={data.types} onChange={v => setData({ ...data, types: v })} multi={true} accentBg="#C8F5EA" darkColor="#1A7A5E" />
      <Label>Notes <span style={s.optional}>(optional)</span></Label>
      <textarea style={s.textarea} placeholder="e.g. 20 min walk, hip flexor stretches…" value={data.notes} onChange={e => setData({ ...data, notes: e.target.value })} />
    </>
  )
}

function ClimbForm({ data, setData }) {
  function addRoute() {
    setData({ ...data, routes: [...data.routes, { grade: '5.10a', attempts: 1, status: 'working' }] })
  }
  function updateRoute(i, field, val) {
    const u = [...data.routes]; u[i] = { ...u[i], [field]: val }; setData({ ...data, routes: u })
  }
  function removeRoute(i) {
    setData({ ...data, routes: data.routes.filter((_, idx) => idx !== i) })
  }
  return (
    <>
      <Label>Location</Label>
      <ToggleGroup options={['Gym', 'Outdoor']} value={data.location} onChange={v => setData({ ...data, location: v })} accentBg="#FFD0DC" darkColor="#C4354F" />
      <Label>Routes</Label>
      {data.routes.length === 0 && <div style={s.emptyRoutes}>Add your routes below</div>}
      {data.routes.map((route, i) => (
        <div key={i} style={s.routeCard}>
          <div style={s.routeHeader}>
            <span style={s.routeNum}>Route {i + 1}</span>
            <button style={s.exRemove} onClick={() => removeRoute(i)}>×</button>
          </div>
          <div style={s.routeRow}>
            <div style={s.routeField}>
              <span style={s.exFieldLabel}>grade</span>
              <select style={s.gradeSelect} value={route.grade} onChange={e => updateRoute(i, 'grade', e.target.value)}>
                {CLIMB_GRADES.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div style={s.routeField}>
              <span style={s.exFieldLabel}>attempts</span>
              <div style={s.miniStepper}>
                <button style={s.miniBtn} onClick={() => updateRoute(i, 'attempts', Math.max(1, route.attempts - 1))}>−</button>
                <span style={s.miniVal}>{route.attempts}</span>
                <button style={s.miniBtn} onClick={() => updateRoute(i, 'attempts', route.attempts + 1)}>+</button>
              </div>
            </div>
          </div>
          <div style={{ ...s.toggleRow, marginTop: 10 }}>
            {SEND_STATUS.map(st => (
              <button key={st.id}
                style={{ ...s.toggleBtn, background: route.status === st.id ? st.bg : '#FFF5F8', border: `1.5px solid ${route.status === st.id ? st.color : '#F4C0D0'}`, color: route.status === st.id ? st.color : '#B8A0B0', fontWeight: route.status === st.id ? 800 : 600 }}
                onClick={() => updateRoute(i, 'status', st.id)}>
                {st.label}
              </button>
            ))}
          </div>
        </div>
      ))}
      <button style={s.addRouteBtn} onClick={addRoute}>+ Add route</button>
      <Label>Session notes <span style={s.optional}>(optional)</span></Label>
      <textarea style={s.textarea} placeholder="e.g. warmed up on 5.9s, projecting 5.11a overhang…" value={data.notes} onChange={e => setData({ ...data, notes: e.target.value })} />
    </>
  )
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
export default function Log() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [step,          setStep]         = useState('discipline')
  const [selectedDisc,  setSelectedDisc] = useState(null)
  const [duration,      setDuration]     = useState(45)
  const [effort,        setEffort]       = useState(5)
  const [saved,         setSaved]        = useState(false)
  const [saving,        setSaving]       = useState(false)
  const [savedExercises,setSavedExercises] = useState({})

  // Load each user's last-used weight per exercise from their workout history
  useEffect(() => {
    if (!user) return
    supabase
      .from('workouts')
      .select('details')
      .eq('discipline', 'strength')
      .order('date', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (!data?.length) return
        const map = {}
        for (const workout of data) { // newest-first, so first occurrence = most recent
          for (const ex of workout.details?.exercises ?? []) {
            if (ex.name && !(ex.name in map)) {
              map[ex.name] = ex.weight ?? 0
            }
          }
        }
        setSavedExercises(map)
      })
  }, [user?.id])

  const [swimData,     setSwimData]     = useState({ focus: 'Endurance', distance: 0, location: 'Pool', notes: '' })
  const [bikeData,     setBikeData]     = useState({ type: 'Endurance', distance: 0, location: 'Indoor / Trainer', notes: '' })
  const [runData,      setRunData]      = useState({ type: 'Recovery', distance: 0, surface: 'Road', footPain: false, notes: '' })
  const [strengthData, setStrengthData] = useState({ focus: [], exercises: [], notes: '' })
  const [climbData,    setClimbData]    = useState({ location: 'Gym', routes: [], notes: '' })
  const [recoverData,  setRecoverData]  = useState({ types: [], notes: '' })

  const disc = DISCIPLINES.find(d => d.id === selectedDisc)

  function getDetails() {
    switch (selectedDisc) {
      case 'swim':     return swimData
      case 'bike':     return bikeData
      case 'run':      return runData
      case 'strength': return { focus: strengthData.focus, exercises: strengthData.exercises }
      case 'climb':    return climbData
      case 'recover':  return recoverData
      default:         return {}
    }
  }

  function getNotes() {
    switch (selectedDisc) {
      case 'swim':     return swimData.notes
      case 'bike':     return bikeData.notes
      case 'run':      return runData.notes
      case 'strength': return strengthData.notes
      case 'climb':    return climbData.notes
      case 'recover':  return recoverData.notes
      default:         return ''
    }
  }

  function canSave() {
    if (selectedDisc === 'swim' && !swimData.distance) return false
    if (selectedDisc === 'run'  && !runData.distance)  return false
    return true
  }

  async function handleSave() {
    if (!canSave() || saving) return
    setSaving(true)
    try {
      await saveWorkout({
        discipline: selectedDisc,
        duration,
        effort,
        details: getDetails(),
        notes:   getNotes(),
      })
      setSaved(true)
    } catch (err) {
      console.error('Save failed:', err)
    } finally {
      setSaving(false)
      setTimeout(() => {
        setSaved(false)
        setStep('discipline')
        setSelectedDisc(null)
        setDuration(45)
        setEffort(5)
      }, 2200)
    }
  }

  function getDiscForm() {
    switch (selectedDisc) {
      case 'swim':     return <SwimForm     data={swimData}     setData={setSwimData} />
      case 'bike':     return <BikeForm     data={bikeData}     setData={setBikeData} />
      case 'run':      return <RunForm      data={runData}      setData={setRunData} />
      case 'strength': return <StrengthForm data={strengthData} setData={setStrengthData} savedExercises={savedExercises} onSaveExercise={(name, w) => setSavedExercises(p => ({ ...p, [name]: w }))} />
      case 'climb':    return <ClimbForm    data={climbData}    setData={setClimbData} />
      case 'recover':  return <RecoverForm  data={recoverData}  setData={setRecoverData} />
    }
  }

  return (
    <div style={s.screen}>
      <style>{css}</style>

      {/* HEADER */}
      <div style={s.pageHeader}>
        {step !== 'discipline' ? (
          <button style={s.backBtn} onClick={() => setStep('discipline')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" stroke="#C2185B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        ) : (
          <div style={{ width: 32 }} />
        )}
        <div style={s.pageTitle}>
          {step === 'discipline' ? 'Log workout' : disc ? `${disc.emoji} ${disc.label}` : 'Log workout'}
        </div>
        <div style={{ width: 32 }} />
      </div>

      {/* CONTENT */}
      <div style={s.scroll}>
        {saved ? (
          <div style={s.savedState}>
            <div className="pop-anim">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="32" r="30" stroke="#F48FB1" strokeWidth="3"/>
                <path d="M20 32L28 40L44 24" stroke="#C2185B" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div style={s.savedTitle}>Logged!</div>
            <div style={s.savedSub}>Great work today</div>
          </div>

        ) : step === 'discipline' ? (
          <>
            <div style={s.stepHint}>What did you do today?</div>
            <div style={s.discGrid}>
              {DISCIPLINES.map(d => (
                <button key={d.id}
                  style={{ ...s.discCard, background: d.bg, border: `2px solid ${d.color}` }}
                  className="disc-card"
                  onClick={() => { setSelectedDisc(d.id); setStep('details') }}>
                  <span style={s.discEmoji}>{d.emoji}</span>
                  <span style={{ ...s.discLabel, color: d.dark }}>{d.label}</span>
                </button>
              ))}
            </div>
          </>

        ) : (
          <>
            <Label>Duration *</Label>
            <TapField value={duration} unit="min" onConfirm={v => setDuration(v)} />
            {getDiscForm()}
            <Label>Effort</Label>
            <EffortSlider value={effort} onChange={setEffort} />
            <button
              style={{ ...s.saveBtn, opacity: canSave() && !saving ? 1 : 0.45 }}
              className="save-btn"
              disabled={!canSave() || saving}
              onClick={handleSave}>
              {saving ? 'Saving…' : 'Save workout'}
            </button>
            {!canSave() && (
              <div style={s.requiredHint}>Distance is required</div>
            )}
            <button style={s.cancelBtn} onClick={() => setStep('discipline')}>Back</button>
          </>
        )}
        <div style={{ height: 32 }} />
      </div>
    </div>
  )
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const s = {
  screen:     { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#FFF8FB', fontFamily: "'Nunito', system-ui, sans-serif", position: 'relative' },
  pageHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 10px', borderBottom: '1.5px solid #F9D0DF', flexShrink: 0 },
  backBtn:    { width: 32, height: 32, background: '#F9D0DF', border: 'none', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  pageTitle:  { fontSize: 17, fontWeight: 900, color: '#8B1A4A' },
  scroll:     { flex: 1, overflowY: 'auto', padding: '14px 18px', scrollbarWidth: 'none' },
  stepHint:   { fontSize: 13, color: '#C077A0', fontWeight: 700, marginBottom: 14 },

  discGrid:  { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 },
  discCard:  { borderRadius: 16, padding: '18px 8px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', fontFamily: 'inherit' },
  discEmoji: { fontSize: 28 },
  discLabel: { fontSize: 12, fontWeight: 800 },

  label:    { fontSize: 11, fontWeight: 800, color: '#C077A0', marginBottom: 8, marginTop: 16 },
  optional: { fontWeight: 600, textTransform: 'none', letterSpacing: 0, color: '#D4B0C0', fontSize: 11 },

  tapField:     { display: 'flex', alignItems: 'center', gap: 6, background: '#FFF0F5', border: '1.5px solid #F4A7B9', borderRadius: 12, padding: '10px 14px', cursor: 'pointer', width: '100%', fontFamily: 'inherit' },
  tapFieldNum:  { fontSize: 24, fontWeight: 900 },
  tapFieldUnit: { fontSize: 13, fontWeight: 700 },

  toggleRow: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  toggleBtn: { borderRadius: 10, padding: '7px 13px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.1s' },

  presetRow: { display: 'flex', gap: 6, marginBottom: 8 },
  presetBtn: { borderRadius: 10, padding: '7px 13px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' },

  sliderWrap:   { paddingTop: 8 },
  sliderTrack:  { position: 'relative', height: 10, background: '#F4D0DC', borderRadius: 5, cursor: 'pointer', marginBottom: 8 },
  sliderFill:   { position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 5, transition: 'background 0.2s' },
  sliderThumb:  { position: 'absolute', top: '50%', transform: 'translateY(-50%)', width: 28, height: 28, borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.18)', border: '3px solid white', transition: 'background 0.2s' },
  sliderLabels: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  sliderLabelL: { fontSize: 11, color: '#C077A0', fontWeight: 700 },
  sliderLabelR: { fontSize: 11, color: '#C077A0', fontWeight: 700 },
  sliderVal:    { fontSize: 22, fontWeight: 900, transition: 'color 0.2s' },

  textarea: { width: '100%', minHeight: 52, background: '#FFF5F8', border: '1.5px solid #F4C0D0', borderRadius: 12, padding: '10px 12px', fontSize: 13, color: '#5A3050', fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' },

  flagRow:   { marginTop: 12 },
  flagBtn:   { width: '100%', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontFamily: 'inherit' },
  flagCheck: { width: 18, height: 18, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  exList:      { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 },
  exCard:      { background: '#FFFBE8', border: '1.5px solid #EDE090', borderRadius: 14, padding: '10px 12px' },
  exHeader:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  exName:      { fontSize: 13, fontWeight: 800, color: '#8B7A00' },
  exRemove:    { width: 22, height: 22, borderRadius: 6, background: '#F9D0DF', border: 'none', color: '#C2185B', fontSize: 14, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' },
  exControls:  { display: 'flex', gap: 10 },
  exField:     { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  exFieldLabel:{ fontSize: 9, fontWeight: 800, color: '#C077A0', textTransform: 'uppercase', letterSpacing: 0.4 },
  miniStepper: { display: 'flex', alignItems: 'center', gap: 4 },
  miniBtn:     { width: 26, height: 26, borderRadius: 7, background: '#F9D0DF', border: '1.5px solid #F4A7B9', fontSize: 15, fontWeight: 900, color: '#C2185B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' },
  miniVal:     { fontSize: 12, fontWeight: 800, color: '#5A3050', minWidth: 28, textAlign: 'center' },
  weightTap:   { fontSize: 12, fontWeight: 800, color: '#8B7A00', background: '#FFF3A8', border: '1.5px solid #EDE090', borderRadius: 8, padding: '4px 8px', cursor: 'pointer', fontFamily: 'inherit' },

  exInputWrap:   { display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 },
  exInput:       { flex: 1, background: '#FFF5F8', border: '1.5px solid #F4C0D0', borderRadius: 10, padding: '9px 12px', fontSize: 13, color: '#5A3050', fontFamily: 'inherit', outline: 'none' },
  exAddBtn:      { background: '#F4A7B9', border: 'none', borderRadius: 10, padding: '9px 14px', fontSize: 13, fontWeight: 800, color: '#8B1A4A', cursor: 'pointer', fontFamily: 'inherit' },
  suggestions:   { background: '#fff', border: '1.5px solid #F4C0D0', borderRadius: 12, overflow: 'hidden', marginTop: 4 },
  suggestionBtn: { width: '100%', padding: '9px 14px', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: '1px solid #F9D0DF', fontSize: 13, color: '#5A3050', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },

  routeCard:   { background: '#FFE8EE', border: '1.5px solid #FFB8C6', borderRadius: 14, padding: '10px 12px', marginBottom: 8 },
  routeHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: 8 },
  routeNum:    { fontSize: 12, fontWeight: 800, color: '#C4354F' },
  routeRow:    { display: 'flex', gap: 20, alignItems: 'flex-start' },
  routeField:  { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 },
  gradeSelect: { background: '#FFF5F8', border: '1.5px solid #F4A7B9', borderRadius: 10, padding: '6px 10px', fontSize: 14, fontWeight: 800, color: '#C4354F', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' },
  emptyRoutes: { textAlign: 'center', color: '#D4B0C0', fontSize: 13, fontWeight: 600, padding: '12px 0 6px' },
  addRouteBtn: { width: '100%', marginTop: 4, background: '#FFE8EE', border: '2px dashed #FFB8C6', borderRadius: 12, padding: '10px 0', fontSize: 13, fontWeight: 800, color: '#C4354F', cursor: 'pointer', fontFamily: 'inherit' },

  saveBtn:      { width: '100%', marginTop: 20, background: 'linear-gradient(135deg, #F48FB1, #E91E8C)', border: 'none', borderRadius: 14, color: '#fff', fontSize: 16, fontWeight: 800, padding: '14px 0', cursor: 'pointer', boxShadow: '0 4px 14px rgba(233,30,140,0.3)', fontFamily: 'inherit' },
  requiredHint: { textAlign: 'center', fontSize: 11, color: '#C4354F', fontWeight: 700, marginTop: 6 },
  cancelBtn:    { width: '100%', marginTop: 8, marginBottom: 4, background: 'transparent', border: 'none', color: '#C077A0', fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: '6px 0', fontFamily: 'inherit' },

  savedState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 14, paddingTop: 80 },
  savedTitle: { fontSize: 28, fontWeight: 900, color: '#8B1A4A' },
  savedSub:   { fontSize: 15, color: '#C077A0', fontWeight: 600 },
}

const css = `
  .disc-card:hover { transform: scale(1.04) !important; }
  .save-btn:hover  { filter: brightness(1.05); transform: translateY(-1px); }
  textarea:focus, input:focus { border-color: #F4A7B9 !important; box-shadow: 0 0 0 3px rgba(244,167,185,0.2); }
`
