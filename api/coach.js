const { createClient } = require('@supabase/supabase-js')

/**
 * POST /api/coach
 * Body: { message, history?, phase?, injuryFlags? }
 *
 * OpenAI key: process.env.OPENAI_API_KEY → Supabase config table fallback.
 * Workout history: ALL workouts, grouped by week with tiered detail.
 */

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function formatWorkoutLine(w) {
  const d = w.details ?? {}
  let detail = ''
  switch (w.discipline) {
    case 'swim':     detail = [d.distance && `${d.distance}m`, d.focus].filter(Boolean).join(' '); break
    case 'bike':     detail = `${w.duration_minutes ?? '?'}min`; break
    case 'run':      detail = [`${d.distance ?? '?'}km`, d.footPain ? 'FOOT PAIN' : null].filter(Boolean).join(' '); break
    case 'strength': detail = (d.focus ?? []).join('+'); break
    case 'climb':    detail = `${(d.routes ?? []).length} routes`; break
    case 'recover':  detail = (d.types ?? []).join('+'); break
  }
  const effortStr = w.effort ? ` effort:${w.effort}/10` : ''
  const noteStr   = w.notes  ? ` [${w.notes}]` : ''
  return `${w.discipline}(${detail.trim()}${effortStr})${noteStr}`
}

// ── Training plan ─────────────────────────────────────────────────────────────

const WEEKLY_PLAN = {
  monday:    'Strength — lower body (glutes/legs), strong not destroyed',
  tuesday:   'Run 25–35 min EASY, conversational pace, stop if foot pain changes stride',
  wednesday: 'Rest',
  thursday:  'Bike 50–65 min easy aerobic, conversational effort, smooth cadence',
  friday:    'Swim 30–45 min, technique + comfort, smooth breathing',
  saturday:  'Bike 65–80 min, easy to steady, relaxed effort',
  sunday:    'Optional Swim OR Rest',
}
const DAY_KEYS   = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ── Weekly history builder ────────────────────────────────────────────────────

function buildWeeklyHistory(allWorkouts) {
  if (!allWorkouts.length) return '(no workouts logged yet)'

  // Group into week buckets keyed by Monday ISO date
  const weekMap = {}
  for (const w of allWorkouts) {
    const wDate  = new Date(w.date + 'T12:00:00')
    const monday = toISODate(getMonday(wDate))
    if (!weekMap[monday]) weekMap[monday] = []
    weekMap[monday].push(w)
  }

  const today      = new Date()
  const thisMonday = toISODate(getMonday(today))
  const allMondays = Object.keys(weekMap).sort()   // oldest first

  const lines = []

  for (const monday of allMondays) {
    const workouts  = weekMap[monday]
    const weekStart = new Date(monday + 'T00:00:00')
    const thisDate  = new Date(thisMonday + 'T00:00:00')
    const weeksAgo  = Math.round((thisDate - weekStart) / (7 * 86400000))

    if (monday === thisMonday) {
      // CURRENT WEEK — full day-by-day detail
      lines.push(`\n== CURRENT WEEK (w/c ${monday}) ==`)
      for (let i = 1; i <= 7; i++) {         // Mon=1 … Sun=7
        const dayIndex = i % 7              // Mon→1, …, Sat→6, Sun→0
        const dayDate  = new Date(weekStart)
        dayDate.setDate(dayDate.getDate() + (i - 1))
        if (dayDate > today) break          // don't show future days
        const dayISO  = toISODate(dayDate)
        const dayKey  = DAY_KEYS[dayIndex]
        const planned = WEEKLY_PLAN[dayKey]
        const done    = workouts.filter(w => w.date === dayISO)
        const label   = DAY_LABELS[dayIndex]
        if (done.length) {
          lines.push(`  ${label} ${dayISO}: ${done.map(formatWorkoutLine).join('; ')}`)
        } else {
          const isRest = dayKey === 'wednesday' || dayKey === 'sunday'
          lines.push(`  ${label} ${dayISO}: ${isRest ? 'Rest (planned)' : `NOT LOGGED — planned: ${planned}`}`)
        }
      }
    } else if (weeksAgo <= 3) {
      // RECENT WEEKS (1–3 weeks ago) — compact adherence summary
      const discs       = workouts.map(w => w.discipline)
      const bikeCount   = discs.filter(d => d === 'bike').length
      const swimCount   = discs.filter(d => d === 'swim').length
      const hasRun      = discs.includes('run')
      const hasStrength = discs.includes('strength')
      const footPain    = workouts.some(w => w.details?.footPain)
      const totalMins   = workouts.reduce((s, w) => s + (w.duration_minutes || 0), 0)
      const adherence   = [
        hasStrength ? 'strength✓' : 'MISSED strength',
        hasRun      ? 'run✓'      : 'MISSED run',
        `bike x${bikeCount} (plan:2)`,
        `swim x${swimCount} (plan:1+)`,
      ].join(', ')
      lines.push(`Week ${monday} (${weeksAgo}wk ago): ${workouts.length} sessions, ${totalMins}min | ${adherence}${footPain ? ' | foot pain noted' : ''}`)
    } else {
      // OLDER WEEKS — single aggregate line
      const discs    = [...new Set(workouts.map(w => w.discipline))].join('/')
      const totalMin = workouts.reduce((s, w) => s + (w.duration_minutes || 0), 0)
      lines.push(`Week ${monday}: ${workouts.length} sessions (${discs}), ${totalMin}min`)
    }
  }

  return lines.join('\n')
}

// ── Handler ───────────────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { message, history = [], phase = 'Race Mode', injuryFlags = 'None' } = req.body ?? {}

  if (!message?.trim()) {
    return res.status(400).json({ error: 'message is required' })
  }

  // ── Supabase client ────────────────────────────────────────────────────────
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // ── Resolve OpenAI key: process.env → Supabase config table fallback ────────
  let openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) {
    try {
      const { data, error } = await supabase
        .from('config')
        .select('value')
        .eq('key', 'openai_api_key')
        .single()
      if (!error && data?.value) openaiKey = data.value
    } catch (e) {
      console.error('Failed to fetch API key from Supabase config:', e)
    }
  }

  if (!openaiKey) {
    return res.status(500).json({ error: 'Server configuration error: missing API key' })
  }

  // Cap input length to prevent token abuse
  const safeMessage = message.trim().slice(0, 500)

  // ── Fetch ALL workouts (full history for plan evaluation) ──────────────────
  let allWorkouts = []
  try {
    const { data, error: dbError } = await supabase
      .from('workouts')
      .select('date, discipline, duration_minutes, effort, details, notes')
      .order('date', { ascending: true })
    if (dbError) console.error('Supabase workout error:', dbError)
    else allWorkouts = data ?? []
  } catch (e) {
    console.error('Supabase workouts fetch error:', e)
  }

  const workoutHistory = buildWeeklyHistory(allWorkouts)

  const daysToRace = Math.max(
    Math.ceil((new Date(2026, 6, 18) - new Date()) / 86400000), 0
  )

  // ── System prompt ──────────────────────────────────────────────────────────
  const systemPrompt = `You are "Coach", an expert triathlon coach helping Jess prepare for her race. You are warm, direct, and data-driven. You do NOT rewrite the training plan unless there is a compelling reason. You protect Jess's foot and never push through pain.

== ATHLETE ==
Name: Jess
Race: Sprint Triathlon, July 18, 2026 (${daysToRace} days away)
Goal: Finish under 2 hours
Distances: 750m swim · 20km bike · 5km run
Target splits: ~22min swim · ~45min bike · ~30min run · ~8min transitions
Training phase: ${phase}
Active injuries / flags: ${injuryFlags}

== WEEKLY TRAINING PLAN (this is THE plan — do not change it unless necessary) ==
Monday:    Strength — lower body (glutes/legs), strong not destroyed
Tuesday:   Run 25–35 min EASY, conversational pace, stop if foot pain changes stride
Wednesday: Rest
Thursday:  Bike 50–65 min easy aerobic, conversational effort, smooth cadence
Friday:    Swim 30–45 min, technique + comfort, smooth breathing
Saturday:  Bike 65–80 min, easy to steady, relaxed effort
Sunday:    Optional Swim OR Rest
Weekly targets: Strength ×1, Run ×1, Bike ×2, Swim ×1 (×2 if Sunday swim done)

== TRAINING LOG (all sessions since training began) ==
${workoutHistory}

== COACHING RULES ==
1. Always account for the foot injury — never prescribe pain-pushing run sessions.
2. Reference specific dates and workout data when answering. Never be vague.
3. When asked about race readiness, compare current performance against the target splits above.
4. Evaluate weekly adherence against the plan — note missed sessions by discipline.
5. Suggest plan adjustments only when recovery, injury, or significant missed weeks make it necessary.
6. Keep responses to 3–5 sentences unless Jess asks for a detailed breakdown.
7. Use Jess's name occasionally, not every message.
8. If no workouts are logged yet, encourage Jess to start logging and offer a first-week plan.`

  // ── Conversation history (last 10 turns) ───────────────────────────────────
  const recentHistory = Array.isArray(history)
    ? history.slice(-10).map(m => ({ role: m.role, content: String(m.content).slice(0, 500) }))
    : []

  const messages = [
    { role: 'system', content: systemPrompt },
    ...recentHistory,
    { role: 'user',   content: safeMessage },
  ]

  // ── Call OpenAI ────────────────────────────────────────────────────────────
  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model:       'gpt-4o-mini',
      messages,
      max_tokens:  800,
      temperature: 0.7,
    }),
  })

  if (!openaiRes.ok) {
    const errBody = await openaiRes.json().catch(() => ({}))
    console.error('OpenAI error:', errBody)
    return res.status(502).json({ error: errBody?.error?.message ?? 'OpenAI API error' })
  }

  const openaiData = await openaiRes.json()
  const reply = openaiData.choices?.[0]?.message?.content?.trim()

  if (!reply) {
    return res.status(502).json({ error: 'No response from OpenAI' })
  }

  return res.status(200).json({ reply })
}
