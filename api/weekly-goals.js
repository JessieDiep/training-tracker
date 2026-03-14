const { createClient } = require('@supabase/supabase-js')

/**
 * POST /api/weekly-goals
 * Body: { profile, force? }
 * Headers: Authorization: Bearer <supabase-access-token>
 *
 * Returns cached goals for the current week, or generates new ones via OpenAI.
 * Goals are structured triathlon sessions (type, structure, duration, effort) per discipline.
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
      const km    = d.distance
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
    case 'recover':
      return `recover(${(d.types ?? []).join('+')}${effortStr})${noteStr}`
    default:
      return `${w.discipline}(${effortStr.trim()})${noteStr}`
  }
}

const PB_DISTS = { swim: [100, 200, 300, 400, 500], bike: [5, 10, 15, 20, 25], run: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }

function buildPBsSection(allWorkouts) {
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
        const unit = disc === 'swim' ? 'm' : 'km'
        const pace = disc === 'swim' ? fmtSwimPace(mins / Number(dist)) : fmtPace(mins / Number(dist))
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

function buildRecentHistory(allWorkouts) {
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
  const allMondays = Object.keys(weekMap).sort().filter(m => {
    const weeksAgo = Math.round((new Date(thisMonday + 'T00:00:00') - new Date(m + 'T00:00:00')) / (7 * 86400000))
    return weeksAgo <= 16
  })
  const lines      = []

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
      for (const date of Object.keys(byDate).sort()) {
        lines.push(`  ${date}: ${byDate[date].map(w => formatWorkoutLine(w, true)).join('; ')}`)
      }
    } else {
      const unique   = [...new Set(workouts.map(w => w.discipline))]
      const totalMin = workouts.reduce((s, w) => s + (w.duration_minutes || 0), 0)
      lines.push(`Week ${monday} (${weeksAgo}wk ago): ${workouts.length} sessions (${unique.join('/')}), ${totalMin}min`)
    }
  }

  return lines.join('\n')
}

function buildPrompt(profile, workoutHistory, pbsSection) {
  const name   = profile.name || 'Athlete'
  const injury = profile.injury_flags || 'None'
  const today  = new Date()
  const todayStr = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  let athleteSection = `Name: ${name}\nInjury / health flags: ${injury}`

  const distances = profile.race_distances || {}
  const hasSkim  = !!distances.swim
  const hasBike  = !!distances.bike
  const hasRun   = !!distances.run

  // Derive race type and coach identity from which disciplines are in the race
  const raceType = hasSkim ? 'triathlon' : hasBike ? 'duathlon' : 'running'
  const coachLabel = hasSkim ? 'triathlon' : hasBike ? 'duathlon' : 'running'

  if (profile.has_race) {
    const daysToRace = Math.max(
      Math.ceil((new Date(profile.race_date + 'T12:00:00') - new Date()) / 86400000), 0
    )
    const distStr = [
      distances.swim && `${distances.swim}m swim`,
      distances.bike && `${distances.bike}km bike`,
      distances.run  && `${distances.run}km run`,
    ].filter(Boolean).join(' · ')

    athleteSection = `Name: ${name}
Race type: ${raceType}
Race: ${profile.race_name || 'Race'}, ${profile.race_date} (${daysToRace} days away)
Goal: ${profile.race_goal || 'Finish strong'}
Distances: ${distStr}
Injury / health flags: ${injury}`
  }

  // Build output schema with only the disciplines in the race
  const schemaLines = [
    hasSkim && `  "swim": [{ "type": "string", "structure": "string", "duration": number, "effort": number }]`,
    hasBike && `  "bike": [{ "type": "string", "structure": "string", "duration": number, "effort": number }]`,
    hasRun  && `  "run":  [{ "type": "string", "structure": "string", "duration": number, "effort": number }]`,
    `  "rationale": "string"`,
  ].filter(Boolean).join(',\n')

  // Build session type rules for present disciplines only
  const sessionTypeRules = [
    hasSkim && '- Session types for swim: Technique, Endurance, Threshold, Intervals, Race Pace',
    hasBike && '- Session types for bike: Endurance, Tempo, Threshold, Intervals, Recovery Spin',
    hasRun  && '- Session types for run: Recovery, Easy, Tempo, Intervals, Long Run, Progression Run, Strides, Brick Run',
  ].filter(Boolean).join('\n')

  return `You are an expert ${coachLabel} coach. Output ONLY a valid JSON object — no markdown, no code fences, no explanation.
Generate a structured weekly training plan for ${name}.

== TODAY ==
${todayStr}

== ATHLETE ==
${athleteSection}
${pbsSection ? '\n' + pbsSection + '\n' : ''}
== RECENT TRAINING (last 16 weeks) ==
${workoutHistory}

== OUTPUT SCHEMA ==
{
${schemaLines}
}

== RULES ==
- Determine the appropriate number of sessions per discipline based on race type, race distance, athlete history, and training phase. Use best practices for the specific event — a 5k runner may need 2–3 runs/week, a marathoner 4–5; a sprint triathlete needs fewer sessions than an Ironman athlete. Reduce volume if the athlete shows signs of overtraining or is injured.
${sessionTypeRules}
- Follow periodization based on days to race: >90 days = base phase (volume, aerobic), 30-90 days = build phase (intensity, race-pace), <30 days = taper (reduced volume, sharpness)
- Roughly 80% of sessions at effort ≤6, 20% at effort ≥7
- Never prescribe high-effort sessions for injured body parts — reference and respect injury flags
- "structure" must be a clear, specific, actionable instruction (1-2 sentences). Examples:
    "10 min easy warm-up, then 5×4 min at 8/10 effort with 3 min easy spin between, cool-down 10 min"
    "Warm-up 400m easy, then 6×100m at race pace with 20 sec rest, cool-down 200m"
    "Easy conversational pace throughout — if you feel the urge to push, ease off"
- "duration" is total session time in minutes including warm-up and cool-down
- "effort" is RPE 1-10 scale for the main set
- "rationale" explains this week's training focus in 1-2 sentences
- Output ONLY the JSON object, nothing else`
}

// ── Handler ───────────────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { profile = {}, force = false } = req.body ?? {}

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  const authToken = req.headers.authorization?.split(' ')[1]
  const supabase  = createClient(supabaseUrl, supabaseKey, {
    global: { headers: authToken ? { Authorization: `Bearer ${authToken}` } : {} },
  })

  const thisMonday = toISODate(getMonday(new Date()))

  // Decode user ID from JWT (needed for upsert — auth.uid() isn't available server-side)
  let userId = null
  if (authToken) {
    try {
      userId = JSON.parse(Buffer.from(authToken.split('.')[1], 'base64url').toString()).sub
    } catch (e) {
      // Non-fatal — upsert will fail but goals can still be returned
    }
  }

  // ── Return cached goals if they exist (unless force regenerate) ──────────────
  if (!force) {
    try {
      const { data, error } = await supabase
        .from('weekly_goals')
        .select('goals, accepted')
        .eq('week_start', thisMonday)
        .single()
      if (!error && data?.goals) {
        return res.status(200).json({ goals: data.goals, accepted: data.accepted ?? false })
      }
    } catch (e) {
      // Table may not exist yet or no row found — fall through to generation
    }
  }

  // ── Resolve OpenAI key ────────────────────────────────────────────────────────
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

  // ── Fetch last 8 weeks of workouts ──────────────────────────────────────────
  const cutoffDate = toISODate(new Date(Date.now() - 56 * 86400000))
  let allWorkouts = []
  try {
    const { data, error: dbError } = await supabase
      .from('workouts')
      .select('date, discipline, duration_minutes, effort, details, notes')
      .gte('date', cutoffDate)
      .order('date', { ascending: true })
    if (dbError) console.error('Supabase workout error:', dbError)
    else allWorkouts = data ?? []
  } catch (e) {
    console.error('Supabase workouts fetch error:', e)
  }

  const workoutHistory = buildRecentHistory(allWorkouts)
  const pbsSection     = buildPBsSection(allWorkouts)
  const prompt         = buildPrompt(profile, workoutHistory, pbsSection)

  // ── Call OpenAI ────────────────────────────────────────────────────────────
  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model:       'gpt-4o-mini',
      messages:    [{ role: 'user', content: prompt }],
      max_tokens:  1200,
      temperature: 0.6,
    }),
  })

  if (!openaiRes.ok) {
    const errBody = await openaiRes.json().catch(() => ({}))
    console.error('OpenAI error:', errBody)
    return res.status(502).json({ error: errBody?.error?.message ?? 'OpenAI API error' })
  }

  const openaiData = await openaiRes.json()
  const raw = openaiData.choices?.[0]?.message?.content?.trim()

  if (!raw) {
    return res.status(502).json({ error: 'No response from OpenAI' })
  }

  // ── Parse and validate ─────────────────────────────────────────────────────
  let goals
  try {
    goals = JSON.parse(raw)
  } catch (e) {
    // Try to extract JSON block from response
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) {
      console.error('Could not parse OpenAI response:', raw)
      return res.status(502).json({ error: 'Invalid response format from AI' })
    }
    try {
      goals = JSON.parse(match[0])
    } catch (e2) {
      return res.status(502).json({ error: 'Invalid response format from AI' })
    }
  }

  if (!Array.isArray(goals.swim) || !Array.isArray(goals.bike) || !Array.isArray(goals.run)) {
    return res.status(502).json({ error: 'AI response missing required disciplines' })
  }

  // ── Upsert into weekly_goals ───────────────────────────────────────────────
  try {
    await supabase
      .from('weekly_goals')
      .upsert(
        { user_id: userId, week_start: thisMonday, goals },
        { onConflict: 'user_id,week_start' }
      )
  } catch (e) {
    console.error('Failed to upsert weekly_goals:', e)
    // Non-fatal — still return the goals
  }

  return res.status(200).json({ goals, accepted: false, generated: true })
}
