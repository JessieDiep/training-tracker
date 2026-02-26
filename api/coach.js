import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/coach
 * Body: { message: string, phase?: string, injuryFlags?: string }
 *
 * 1. Fetches the last 14 days of workouts from Supabase
 * 2. Builds a system prompt with training context
 * 3. Calls gpt-4o and streams the response back
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { message, phase = 'Race Mode', injuryFlags = 'None' } = req.body ?? {}

  if (!message?.trim()) {
    return res.status(400).json({ error: 'message is required' })
  }

  // ── Fetch recent workouts from Supabase ────────────────────────────────────
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  )

  const since = new Date()
  since.setDate(since.getDate() - 14)
  const sinceStr = since.toISOString().split('T')[0]

  const { data: recentWorkouts, error: dbError } = await supabase
    .from('workouts')
    .select('date, discipline, duration_minutes, effort, details, notes, mood')
    .gte('date', sinceStr)
    .order('date', { ascending: false })
    .limit(30)

  if (dbError) {
    console.error('Supabase error:', dbError)
    // Non-fatal — continue with empty workout list
  }

  const workoutSummary = (recentWorkouts ?? []).map(w => {
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
    return `${w.date} — ${w.discipline}${detail ? ` (${detail.trim().replace(/ · $/,'')})` : ''}${w.effort ? ` effort:${w.effort}/10` : ''}`
  }).join('\n')

  const daysToRace = Math.max(
    Math.ceil((new Date('2025-07-18') - new Date()) / 86400000),
    0
  )

  // ── Build system prompt ────────────────────────────────────────────────────
  const systemPrompt = `You are an expert triathlon coach and personal trainer named "Coach" helping Jess with her training. You are warm, encouraging, and data-driven.

Current context:
- Training phase: ${phase}
- Race date: July 18, 2025 (${daysToRace} days away)
- Active injuries / flags: ${injuryFlags}

Recent 14 days of workouts (newest first):
${workoutSummary || '(no workouts logged yet)'}

Coaching guidelines:
- Be encouraging but realistic. Use Jess's name occasionally.
- For run sessions, always account for the foot injury when relevant.
- Aim to balance all five disciplines: swim, bike, run, strength, and climbing.
- Keep responses concise (3–5 sentences) unless a detailed analysis is requested.
- Reference specific workout data when it's relevant to the question.
- If no workouts are logged yet, encourage Jess to start logging and offer motivational advice.`

  // ── Call OpenAI ────────────────────────────────────────────────────────────
  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model:       'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: message.trim() },
      ],
      max_tokens:  600,
      temperature: 0.7,
    }),
  })

  if (!openaiRes.ok) {
    const errBody = await openaiRes.json().catch(() => ({}))
    console.error('OpenAI error:', errBody)
    return res.status(502).json({
      error: errBody?.error?.message ?? 'OpenAI API error',
    })
  }

  const openaiData = await openaiRes.json()
  const reply = openaiData.choices?.[0]?.message?.content?.trim()

  if (!reply) {
    return res.status(502).json({ error: 'No response from OpenAI' })
  }

  return res.status(200).json({ reply })
}
