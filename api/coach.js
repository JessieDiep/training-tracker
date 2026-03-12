const { createClient } = require('@supabase/supabase-js')

/**
 * POST /api/coach
 * Body: { message, history?, profile? }
 * Headers: Authorization: Bearer <supabase-access-token>
 *
 * Uses the auth token so Supabase RLS automatically returns only that user's workouts.
 * Builds a dynamic system prompt from the user's profile.
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

function fmtPace(minPerKm) {
  if (!minPerKm || !isFinite(minPerKm)) return null
  const m = Math.floor(minPerKm), s = Math.round((minPerKm - m) * 60)
  return `${m}:${String(s).padStart(2, '0')}/km`
}
function fmtSwimPace(minPerM) {
  const p = fmtPace(minPerM * 100)
  return p ? p.replace('/km', '/100m') : null
}
function fmtKmH(km, min) {
  if (!km || !min) return null
  return `${(km / min * 60).toFixed(1)}km/h`
}
function epley(weight, reps) { return Math.round(weight * (1 + reps / 30)) }

// Detailed line for current-week sessions; brief line for older weeks
function formatWorkoutLine(w, detailed = false) {
  const d = w.details ?? {}
  const effortStr = w.effort ? ` effort:${w.effort}/10` : ''
  const noteStr   = w.notes  ? ` [${w.notes}]` : ''

  if (!detailed) {
    let detail = ''
    switch (w.discipline) {
      case 'swim':     detail = [d.distance && `${d.distance}m`, d.focus].filter(Boolean).join(' '); break
      case 'bike':     detail = `${w.duration_minutes ?? '?'}min`; break
      case 'run':      detail = [`${d.distance ?? '?'}km`, d.footPain ? 'FOOT PAIN' : null].filter(Boolean).join(' '); break
      case 'strength': detail = (d.focus ?? []).join('+'); break
      case 'climb':    detail = `${(d.routes ?? []).length} routes`; break
      case 'recover':  detail = (d.types ?? []).join('+'); break
    }
    return `${w.discipline}(${detail.trim()}${effortStr})${noteStr}`
  }

  // Detailed format for current week
  switch (w.discipline) {
    case 'run': {
      const km   = d.distance
      const pace = km && w.duration_minutes ? fmtPace(w.duration_minutes / km) : null
      const parts = [km && `${km}km`, pace, d.type, d.footPain ? 'FOOT PAIN' : null].filter(Boolean)
      return `run(${parts.join(' · ')}${effortStr})${noteStr}`
    }
    case 'swim': {
      const m    = d.distance
      const pace = m && w.duration_minutes ? fmtSwimPace(w.duration_minutes / m) : null
      const parts = [m && `${m}m`, pace, d.focus].filter(Boolean)
      return `swim(${parts.join(' · ')}${effortStr})${noteStr}`
    }
    case 'bike': {
      const km   = d.distance
      const speed = km && w.duration_minutes ? fmtKmH(km, w.duration_minutes) : null
      const parts = [w.duration_minutes && `${w.duration_minutes}min`, km && `${km}km`, speed, d.location].filter(Boolean)
      return `bike(${parts.join(' · ')}${effortStr})${noteStr}`
    }
    case 'strength': {
      const exercises = (d.exercises ?? [])
        .map(ex => ({ ...ex, est1RM: epley(ex.weight, ex.reps) }))
        .sort((a, b) => b.est1RM - a.est1RM)
        .slice(0, 3)
        .map(ex => `${ex.name} ${ex.weight}kg×${ex.reps} 1RM~${ex.est1RM}kg`)
      const detail = exercises.length ? exercises.join(', ') : (d.focus ?? []).join('+')
      return `strength(${detail}${effortStr})${noteStr}`
    }
    case 'climb': {
      const routes = (d.routes ?? []).map(r => `${r.grade} ${r.status}`).join(', ')
      return `climb(${routes || '?'}${effortStr})${noteStr}`
    }
    case 'recover': {
      return `recover(${(d.types ?? []).join('+')}${effortStr})${noteStr}`
    }
    default: return `${w.discipline}(${effortStr.trim()})${noteStr}`
  }
}

// ── Personal bests ────────────────────────────────────────────────────────────

const PB_DISTS = { swim: [100, 200, 300, 400, 500], bike: [5, 10, 15, 20, 25], run: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }

function buildPBsSection(allWorkouts) {
  // Compute pace-based PBs (same logic as client-side Progress.jsx)
  const pbs = { swim: {}, bike: {}, run: {} }
  for (const w of allWorkouts) {
    const dist = w.details?.distance
    const dur  = w.duration_minutes
    if (!dist || !dur || dist <= 0 || dur <= 0) continue
    const pace = dur / dist
    for (const target of PB_DISTS[w.discipline] ?? []) {
      if (target > dist) continue
      const time = pace * target
      if (!pbs[w.discipline][target] || time < pbs[w.discipline][target]) {
        pbs[w.discipline][target] = time
      }
    }
  }

  // Compute top 3 strength lifts by est 1RM
  const bestLifts = {}
  for (const w of allWorkouts) {
    for (const ex of w.details?.exercises ?? []) {
      if (!ex.weight || !ex.reps || ex.weight <= 0) continue
      const est = epley(ex.weight, ex.reps)
      if (!bestLifts[ex.name] || est > bestLifts[ex.name]) bestLifts[ex.name] = est
    }
  }
  const topLifts = Object.entries(bestLifts).sort((a, b) => b[1] - a[1]).slice(0, 3)

  const lines = ['== PERSONAL BESTS ==']

  for (const disc of ['run', 'swim', 'bike']) {
    const entries = Object.entries(pbs[disc])
    if (!entries.length) continue
    const label = disc.charAt(0).toUpperCase() + disc.slice(1)
    const fmt = entries
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([dist, mins]) => {
        const unit  = disc === 'swim' ? 'm' : 'km'
        const pace  = disc === 'swim' ? fmtSwimPace(mins / Number(dist)) : fmtPace(mins / Number(dist))
        const total = fmtPace(mins)
        return `${dist}${unit} ${total}${pace ? ` (${pace})` : ''}`
      })
      .join(' · ')
    lines.push(`${label}: ${fmt}`)
  }

  if (topLifts.length) {
    lines.push(`Strength: ${topLifts.map(([name, rm]) => `${name} 1RM~${rm}kg`).join(' · ')}`)
  }

  return lines.length > 1 ? lines.join('\n') : ''
}

// ── Weekly history builder ────────────────────────────────────────────────────

function buildWeeklyHistory(allWorkouts) {
  if (!allWorkouts.length) return '(no workouts logged yet)'

  const weekMap = {}
  for (const w of allWorkouts) {
    const wDate  = new Date(w.date + 'T12:00:00')
    const monday = toISODate(getMonday(wDate))
    if (!weekMap[monday]) weekMap[monday] = []
    weekMap[monday].push(w)
  }

  const today      = new Date()
  const thisMonday = toISODate(getMonday(today))
  // Cap history at 16 weeks to keep prompt size manageable
  const allMondays = Object.keys(weekMap).sort().filter(m => {
    const weeksAgo = Math.round((new Date(thisMonday + 'T00:00:00') - new Date(m + 'T00:00:00')) / (7 * 86400000))
    return weeksAgo <= 16
  })

  const lines = []

  for (const monday of allMondays) {
    const workouts  = weekMap[monday]
    const weekStart = new Date(monday + 'T00:00:00')
    const thisDate  = new Date(thisMonday + 'T00:00:00')
    const weeksAgo  = Math.round((thisDate - weekStart) / (7 * 86400000))

    if (monday === thisMonday) {
      lines.push(`\n== CURRENT WEEK (w/c ${monday}) ==`)
      const byDate = {}
      for (const w of workouts) {
        if (!byDate[w.date]) byDate[w.date] = []
        byDate[w.date].push(w)
      }
      const dates = Object.keys(byDate).sort()
      for (const date of dates) {
        lines.push(`  ${date}: ${byDate[date].map(w => formatWorkoutLine(w, true)).join('; ')}`)
      }
      if (workouts.length === 0) lines.push('  (no sessions logged yet this week)')
    } else if (weeksAgo <= 3) {
      const unique   = [...new Set(workouts.map(w => w.discipline))]
      const totalMin = workouts.reduce((s, w) => s + (w.duration_minutes || 0), 0)
      const footPain = workouts.some(w => w.details?.footPain)
      lines.push(`Week ${monday} (${weeksAgo}wk ago): ${workouts.length} sessions (${unique.join('/')}), ${totalMin}min${footPain ? ' | foot pain noted' : ''}`)
    } else {
      const discs    = [...new Set(workouts.map(w => w.discipline))].join('/')
      const totalMin = workouts.reduce((s, w) => s + (w.duration_minutes || 0), 0)
      lines.push(`Week ${monday}: ${workouts.length} sessions (${discs}), ${totalMin}min`)
    }
  }

  return lines.join('\n')
}

// ── System prompt builder ─────────────────────────────────────────────────────

function buildSystemPrompt(profile, workoutHistory, pbsSection) {
  const name   = profile.name || 'Athlete'
  const fname  = name.split(' ')[0]
  const injury = profile.injury_flags || 'None'
  const today  = new Date()
  const todayStr = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  if (profile.has_race) {
    const daysToRace = Math.max(
      Math.ceil((new Date(profile.race_date + 'T12:00:00') - new Date()) / 86400000), 0
    )
    const distances = profile.race_distances || {}
    const distStr   = [
      distances.swim && `${distances.swim}m swim`,
      distances.bike && `${distances.bike}km bike`,
      distances.run  && `${distances.run}km run`,
    ].filter(Boolean).join(' · ')

    let prompt = `You are "Coach", an expert coach helping ${name} prepare for their race. Warm, direct, data-driven. Protect any flagged injuries.

== TODAY ==
${todayStr}

== ATHLETE ==
Name: ${name}
Race: ${profile.race_name || 'Race'}, ${profile.race_date} (${daysToRace} days away)
Goal: ${profile.race_goal || 'Finish strong'}
Distances: ${distStr}
Active injuries / flags: ${injury}
`
    if (pbsSection) prompt += `\n${pbsSection}\n`
    if (profile.training_plan) {
      prompt += `\n== WEEKLY TRAINING PLAN ==\n${profile.training_plan}\n`
    }

    prompt += `\n== TRAINING LOG ==\n${workoutHistory}

== COACHING RULES ==
1. Always account for injury flags — never prescribe pain-pushing sessions.
2. Reference specific dates and workout data. Never be vague.
3. Evaluate adherence against the plan if one is provided.
4. Compare performance against target distances when asked about race readiness.
5. 3–5 sentences unless ${fname} asks for detail.
6. Use ${fname}'s name occasionally, not every message.`
    return prompt
  }

  // Non-race user — generic fitness coach
  return `You are "Coach", a supportive fitness coach helping ${name}. Warm, encouraging, data-driven.

== TODAY ==
${todayStr}

== ATHLETE ==
Name: ${name}
Injury / health flags: ${injury}
${pbsSection ? '\n' + pbsSection + '\n' : ''}
== TRAINING LOG ==
${workoutHistory}

== COACHING RULES ==
1. Be specific — reference actual workout dates and data.
2. Help ${fname} build consistency and progressive overload.
3. Flag anything that looks like overtraining or injury risk.
4. 3–5 sentences unless ${fname} asks for detail.
5. Use ${fname}'s name occasionally, not every message.`
}

// ── Handler ───────────────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { message, history = [], profile = {} } = req.body ?? {}

  if (!message?.trim()) {
    return res.status(400).json({ error: 'message is required' })
  }

  // ── Supabase client — forward auth token so RLS filters to this user ────────
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  const authToken = req.headers.authorization?.split(' ')[1]
  if (!authToken) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabase  = createClient(supabaseUrl, supabaseKey, {
    global: { headers: authToken ? { Authorization: `Bearer ${authToken}` } : {} },
  })

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

  const safeMessage = message.trim().slice(0, 500)

  // ── Fetch workouts (RLS ensures only this user's data is returned) ──────────
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
  const pbsSection     = buildPBsSection(allWorkouts)
  const systemPrompt   = buildSystemPrompt(profile, workoutHistory, pbsSection)

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
