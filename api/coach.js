const { createClient } = require('@supabase/supabase-js')

/**
 * POST /api/coach
 * Body: { message, history?, phase?, injuryFlags? }
 *
 * The OpenAI key is fetched from Supabase `config` table at runtime,
 * bypassing Vercel's env-var stripping for non-VITE_ variables.
 * Fallback to process.env.OPENAI_API_KEY for local dev.
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { message, history = [], phase = 'Race Mode', injuryFlags = 'None' } = req.body ?? {}

  if (!message?.trim()) {
    return res.status(400).json({ error: 'message is required' })
  }

  // ── Supabase client (VITE_-prefixed vars survive Vercel's build pipeline) ──
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // ── Resolve OpenAI key: Supabase config table → process.env fallback ───────
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

  // ── Fetch recent workouts ──────────────────────────────────────────────────
  let recentWorkouts = []
  try {
    const since = new Date()
    since.setDate(since.getDate() - 28)
    const sinceStr = since.toISOString().split('T')[0]
    const { data, error: dbError } = await supabase
      .from('workouts')
      .select('date, discipline, duration_minutes, effort, details, notes')
      .gte('date', sinceStr)
      .order('date', { ascending: false })
      .limit(40)
    if (dbError) console.error('Supabase workout error:', dbError)
    else recentWorkouts = data ?? []
  } catch (e) {
    console.error('Supabase workouts fetch error:', e)
  }

  const workoutSummary = recentWorkouts.map(w => {
    const d = w.details ?? {}
    let detail = ''
    switch (w.discipline) {
      case 'swim':     detail = `${d.distance ?? '?'}m · ${d.location ?? ''} · ${d.focus ?? ''}`; break
      case 'bike':     detail = `${w.duration_minutes ?? '?'}min · ${d.location ?? ''}`; break
      case 'run':      detail = `${d.distance ?? '?'}km · ${d.surface ?? ''}${d.footPain ? ' · foot pain' : ''}`; break
      case 'strength': detail = `${w.duration_minutes ?? '?'}min · ${(d.focus ?? []).join(', ')}`; break
      case 'climb':    detail = `${(d.routes ?? []).length} routes · ${d.location ?? ''}`; break
      case 'recover':  detail = (d.types ?? []).join(', '); break
    }
    const noteStr = w.notes ? ` [note: ${w.notes}]` : ''
    return `${w.date} — ${w.discipline}${detail ? ` (${detail.trim().replace(/ · $/, '')})` : ''}${w.effort ? ` effort:${w.effort}/10` : ''}${noteStr}`
  }).join('\n')

  const daysToRace = Math.max(
    Math.ceil((new Date(2026, 6, 18) - new Date()) / 86400000), 0
  )

  // ── System prompt ──────────────────────────────────────────────────────────
  const systemPrompt = `You are an expert triathlon coach and personal trainer named "Coach" helping Jess with her training. You are warm, encouraging, specific, and data-driven.

ATHLETE PROFILE
- Name: Jess
- Race: Sprint Triathlon on July 18, 2026 (${daysToRace} days away)
- Race goal: Finish in under 2 hours
- Sprint triathlon distances: 750m swim · 20km bike · 5km run
- Sub-2hr target splits (rough guide): ~22min swim · ~45min bike · ~30min run · ~8min transitions
- Training phase: ${phase}
- Active injuries / flags: ${injuryFlags}
- Weekly session targets: Swim ×2, Bike ×2, Run ×1, Strength ×1, Climb ×1

RECENT TRAINING (last 28 days, newest first):
${workoutSummary || '(no workouts logged yet)'}

COACHING GUIDELINES
- Be encouraging but realistic. Use Jess's name occasionally (not every message).
- Always account for the foot injury when discussing run sessions.
- Reference specific dates and workout data when relevant — don't be vague.
- Keep responses concise (3–5 sentences) unless a detailed breakdown is explicitly requested.
- If asked about pacing or race readiness, compare against the sub-2hr target splits above.
- If no workouts are logged yet, encourage Jess to start logging and offer a first-week plan.`

  // ── Conversation history (last 6 turns) ───────────────────────────────────
  const recentHistory = Array.isArray(history)
    ? history.slice(-6).map(m => ({ role: m.role, content: String(m.content).slice(0, 500) }))
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
      max_tokens:  600,
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
