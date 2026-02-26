import { supabase } from './supabase'

// ── Helpers ─────────────────────────────────────────────────────────────────

function getMonday(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day   // Monday = 0 offset
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function isoDate(date) {
  // Use local year/month/day, not UTC — avoids off-by-one day in non-UTC timezones
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ── Queries ─────────────────────────────────────────────────────────────────

/** Fetch workouts from the last `days` days, newest first. */
export async function getRecentWorkouts(days = 14) {
  const since = new Date()
  since.setDate(since.getDate() - days)
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .gte('date', isoDate(since))
    .order('date', { ascending: false })
  if (error) throw error
  return data ?? []
}

/** Fetch workouts from this calendar week (Mon–Sun). */
export async function getThisWeekWorkouts() {
  const monday = getMonday(new Date())
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .gte('date', isoDate(monday))
    .order('date', { ascending: false })
  if (error) throw error
  return data ?? []
}

/** Fetch workouts from last calendar week. */
export async function getLastWeekWorkouts() {
  const monday     = getMonday(new Date())
  const lastMonday = new Date(monday)
  lastMonday.setDate(lastMonday.getDate() - 7)
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .gte('date', isoDate(lastMonday))
    .lt('date',  isoDate(monday))
    .order('date', { ascending: false })
  if (error) throw error
  return data ?? []
}

/**
 * Fetch 6 weeks of workouts for the volume chart.
 * Returns { data: { swim, bike, run, strength, climb }, labels: string[] }
 */
export async function getWeeklyVolumeData(weeksBack = 6) {
  const monday = getMonday(new Date())
  const starts = []
  for (let i = weeksBack - 1; i >= 0; i--) {
    const d = new Date(monday)
    d.setDate(d.getDate() - i * 7)
    starts.push(isoDate(d))
  }
  const oldest = starts[0]
  const { data: workouts, error } = await supabase
    .from('workouts')
    .select('*')
    .gte('date', oldest)
    .order('date', { ascending: true })
  if (error) throw error
  const ws = workouts ?? []

  const result = { swim: [], bike: [], run: [], strength: [], climb: [] }
  const labels = starts.map(s => {
    const d = new Date(s + 'T12:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  })

  for (let i = 0; i < starts.length; i++) {
    const weekStart = starts[i]
    const nextMonday = new Date(weekStart + 'T00:00:00')
    nextMonday.setDate(nextMonday.getDate() + 7)
    const weekEnd = isoDate(nextMonday)
    const inWeek  = ws.filter(w => w.date >= weekStart && w.date < weekEnd)

    result.swim    .push(inWeek.filter(w => w.discipline === 'swim')
                              .reduce((s, w) => s + (w.details?.distance || 0), 0))
    result.bike    .push(inWeek.filter(w => w.discipline === 'bike')
                              .reduce((s, w) => s + (w.duration_minutes || 0), 0))
    result.run     .push(inWeek.filter(w => w.discipline === 'run')
                              .reduce((s, w) => s + (w.details?.distance || 0), 0))
    result.strength.push(inWeek.filter(w => w.discipline === 'strength').length)
    result.climb   .push(inWeek.filter(w => w.discipline === 'climb').length)
  }

  return { data: result, labels }
}

/**
 * Fetch all climb workouts and return sent-route counts keyed by grade.
 * e.g. { '5.10a': 3, '5.11a': 1 }
 */
export async function getClimbSends() {
  const { data, error } = await supabase
    .from('workouts')
    .select('details')
    .eq('discipline', 'climb')
  if (error) throw error

  const byGrade = {}
  for (const w of data ?? []) {
    for (const route of w.details?.routes ?? []) {
      if (route.status === 'sent') {
        byGrade[route.grade] = (byGrade[route.grade] ?? 0) + 1
      }
    }
  }
  return byGrade
}

// ── Mutations ────────────────────────────────────────────────────────────────

/**
 * Save a workout to Supabase.
 * @param {{ discipline, duration, effort, details, notes, mood, date? }} workout
 */
export async function saveWorkout({ discipline, duration, effort, details, notes, mood, date }) {
  const { data, error } = await supabase
    .from('workouts')
    .insert([{
      discipline,
      duration_minutes: duration ?? null,
      effort:           effort   ?? null,
      details:          details  ?? {},
      notes:            notes    ?? null,
      mood:             mood     ?? null,
      date:             date     ?? isoDate(new Date()),
    }])
    .select()
    .single()
  if (error) throw error
  return data
}

/** Fetch all swim/bike/run workouts for personal best calculations. */
export async function getTriWorkouts() {
  const { data, error } = await supabase
    .from('workouts')
    .select('discipline, duration_minutes, details')
    .in('discipline', ['swim', 'bike', 'run'])
    .order('date', { ascending: true })
  if (error) throw error
  return data ?? []
}

/** Returns the date of the earliest logged workout (used for training progress ring). */
export async function getTrainingStartDate() {
  const { data, error } = await supabase
    .from('workouts')
    .select('date')
    .order('date', { ascending: true })
    .limit(1)
    .single()
  if (error || !data) return null
  return new Date(data.date + 'T12:00:00')   // local noon to avoid timezone shifts
}

export async function deleteWorkout(id) {
  const { error } = await supabase.from('workouts').delete().eq('id', id)
  if (error) throw error
}

export async function updateWorkout(id, { duration, effort, notes, details }) {
  const fields = {}
  if (duration !== undefined) fields.duration_minutes = duration
  if (effort   !== undefined) fields.effort = effort
  if (notes    !== undefined) fields.notes = notes
  if (details  !== undefined) fields.details = details
  const { data, error } = await supabase
    .from('workouts').update(fields).eq('id', id).select().single()
  if (error) throw error
  return data
}

// ── Formatters ───────────────────────────────────────────────────────────────

const DISC_EMOJI = {
  swim: '🏊', bike: '🚴', run: '🏃', strength: '💪', climb: '🧗', recover: '🌿',
}
const DISC_COLOR = {
  swim:     { color: '#A8E6CF', dark: '#2D8B6F' },
  bike:     { color: '#C9B8F0', dark: '#6B4FBB' },
  run:      { color: '#FFD4A8', dark: '#C47A2B' },
  strength: { color: '#FFF3A8', dark: '#B8960A' },
  climb:    { color: '#FFB8C6', dark: '#C4354F' },
  recover:  { color: '#B8F0E0', dark: '#1A7A5E' },
}

export function getDiscStyle(discipline) {
  return DISC_COLOR[discipline] ?? { color: '#F4D0DC', dark: '#C077A0' }
}
export function getDiscEmoji(discipline) {
  return DISC_EMOJI[discipline] ?? '🏅'
}

export function formatWorkoutDetail(workout) {
  const d = workout.details ?? {}
  switch (workout.discipline) {
    case 'swim':     return [d.distance && `${d.distance}m`, d.location, d.focus]          .filter(Boolean).join(' · ')
    case 'bike':     return [workout.duration_minutes && `${workout.duration_minutes}min`, d.location, d.type].filter(Boolean).join(' · ')
    case 'run':      return [d.distance && `${d.distance}km`, d.surface, d.footPain && 'modified'].filter(Boolean).join(' · ')
    case 'strength': return [workout.duration_minutes && `${workout.duration_minutes}min`, (d.focus ?? []).join(', ')].filter(Boolean).join(' · ')
    case 'climb':    return [(d.routes?.length ?? 0) + ' routes', d.location].filter(Boolean).join(' · ')
    case 'recover':  return (d.types ?? []).join(', ') || 'Recovery'
    default:         return workout.duration_minutes ? `${workout.duration_minutes}min` : ''
  }
}

export function formatRelativeDate(dateStr) {
  const today     = isoDate(new Date())
  const yesterday = isoDate(new Date(Date.now() - 86_400_000))
  if (dateStr === today)     return 'Today'
  if (dateStr === yesterday) return 'Yesterday'
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
