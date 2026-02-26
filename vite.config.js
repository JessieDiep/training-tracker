import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  // Load all env vars (empty prefix = include non-VITE_ vars like COACH_API_KEY)
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icons/apple-touch-icon.png', 'icons/icon.svg'],
        manifest: {
          name: 'Jess Progressing',
          short_name: 'JessProgress',
          description: 'Personal triathlon, strength & climbing training tracker',
          theme_color: '#FFB8C6',
          background_color: '#FFF8FB',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: '/icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\//,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-api',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24,
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
              },
            },
          ],
        },
      }),

      // Dev-only: local handler for /api/coach so npm run dev works without vercel
      {
        name: 'local-coach-api',
        configureServer(server) {
          server.middlewares.use('/api/coach', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405
              res.end(JSON.stringify({ error: 'Method not allowed' }))
              return
            }
            try {
              const raw = await new Promise((resolve, reject) => {
                let data = ''
                req.on('data', chunk => { data += chunk })
                req.on('end', () => resolve(data))
                req.on('error', reject)
              })
              const { message, history = [], phase = 'Race Mode', injuryFlags = 'None' } = JSON.parse(raw)

              const apiKey = env.COACH_API_KEY
              if (!apiKey) {
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'COACH_API_KEY not found in .env.local' }))
                return
              }

              const daysToRace = Math.max(
                Math.ceil((new Date(2026, 6, 18) - new Date()) / 86400000), 0
              )

              const systemPrompt = `You are an expert triathlon coach named "Coach" helping Jess with her training. You are warm, encouraging, specific, and data-driven.

ATHLETE PROFILE
- Name: Jess
- Race: Sprint Triathlon on July 18, 2026 (${daysToRace} days away)
- Race goal: Finish in under 2 hours
- Sprint triathlon distances: 750m swim · 20km bike · 5km run
- Sub-2hr target splits (rough guide): ~22min swim · ~45min bike · ~30min run · ~8min transitions
- Training phase: ${phase}
- Active injuries / flags: ${injuryFlags}
- Weekly session targets: Swim ×2, Bike ×2, Run ×1, Strength ×1, Climb ×1

COACHING GUIDELINES
- Be encouraging but realistic. Use Jess's name occasionally (not every message).
- Always account for the foot injury when discussing run sessions.
- Keep responses concise (3–5 sentences) unless a detailed breakdown is explicitly requested.
- If asked about pacing or race readiness, compare against the sub-2hr target splits above.`

              const recentHistory = Array.isArray(history)
                ? history.slice(-6).map(m => ({ role: m.role, content: String(m.content).slice(0, 500) }))
                : []

              const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                  model: 'gpt-4o-mini',
                  messages: [
                    { role: 'system', content: systemPrompt },
                    ...recentHistory,
                    { role: 'user', content: message.trim().slice(0, 500) },
                  ],
                  max_tokens: 600,
                  temperature: 0.7,
                }),
              })

              const data = await openaiRes.json()
              const reply = data.choices?.[0]?.message?.content?.trim()
              res.setHeader('Content-Type', 'application/json')
              res.statusCode = openaiRes.ok ? 200 : 502
              res.end(JSON.stringify(openaiRes.ok ? { reply } : { error: data?.error?.message ?? 'OpenAI error' }))
            } catch (e) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: e.message }))
            }
          })
        },
      },
    ],
  }
})
