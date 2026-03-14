import { useState, useRef, useEffect } from 'react'
import { getRecentWorkouts, getThisWeekWorkouts, formatWorkoutDetail, getDiscEmoji, getDiscStyle, formatRelativeDate } from '../lib/workouts'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import GuestLock from '../components/GuestLock'

const PROMPT_CHIPS = [
  "Am I on track for sub-2hr?",
  "How did I do vs the plan this week?",
  "Any sessions I should add or skip?",
  "How's my foot injury affecting training?",
  "What should I focus on for the race?",
]

const DISC_COLORS = {
  swim:     { color: '#A8E6CF', dark: '#2D8B6F' },
  bike:     { color: '#C9B8F0', dark: '#6B4FBB' },
  run:      { color: '#FFD4A8', dark: '#C47A2B' },
  strength: { color: '#FFF3A8', dark: '#B8960A' },
  climb:    { color: '#FFB8C6', dark: '#C4354F' },
  recover:  { color: '#B8F0E0', dark: '#1A7A5E' },
}

function nowStr() {
  return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}


// ── CONTEXT BAR ───────────────────────────────────────────────────────────────
function ContextBar({ daysToRace, injury }) {
  return (
    <div style={cx.wrap}>
      <div style={cx.pill}>
        <div style={cx.pillDot} />
        <span style={cx.pillText}>
          Coach sees your full workout history and personal bests
          {daysToRace != null ? ` · ${daysToRace}d to race` : ''}
          {injury ? ' · ⚠️ injury flagged' : ''}
        </span>
      </div>
    </div>
  )
}

const cx = {
  wrap:         { marginBottom: 12 },
  pill:         { width: '100%', background: 'var(--t-surface)', border: '1.5px solid var(--t-border)', borderRadius: 12, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 },
  pillDot:      { width: 7, height: 7, borderRadius: 4, background: 'var(--t-active)', flexShrink: 0, boxShadow: '0 0 0 2px var(--t-mid)' },
  pillText:     { flex: 1, fontSize: 11, fontWeight: 700, color: 'var(--t-dark)', textAlign: 'left' },
  drawer:       { background: 'var(--t-surface)', border: '1.5px solid var(--t-border)', borderTop: 'none', borderRadius: '0 0 12px 12px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 },
  drawerRow:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  drawerLabel:  { fontSize: 10, fontWeight: 800, color: 'var(--t-muted)', marginTop: 4 },
  drawerVal:    { fontSize: 11, fontWeight: 700, color: 'var(--t-dark)' },
  workoutRow:   { display: 'flex', alignItems: 'center', gap: 6 },
  workoutDot:   { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  workoutType:  { fontSize: 11, fontWeight: 800, minWidth: 56 },
  workoutDetail:{ fontSize: 10, color: '#7A9A8A', flex: 1 },
  workoutDay:   { fontSize: 10, color: '#A0C4B4', fontWeight: 700, flexShrink: 0 },
}

// ── MESSAGE BUBBLE ─────────────────────────────────────────────────────────────
function Bubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
      {!isUser && (
        <div style={b.avatar}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 3C7.03 3 3 6.58 3 11C3 13.1 3.87 15.02 5.3 16.5L4 21L8.7 19.3C9.74 19.75 10.84 20 12 20C16.97 20 21 16.42 21 12C21 7.58 16.97 4 12 4"
              stroke="var(--t-active)" strokeWidth="2" strokeLinecap="round" fill="var(--t-border)"/>
            <circle cx="8.5"  cy="11.5" r="1" fill="var(--t-active)"/>
            <circle cx="12"   cy="11.5" r="1" fill="var(--t-active)"/>
            <circle cx="15.5" cy="11.5" r="1" fill="var(--t-active)"/>
          </svg>
        </div>
      )}
      <div style={{ ...b.bubble, ...(isUser ? b.userBubble : b.aiBubble), maxWidth: '78%' }}>
        <div style={{ ...b.text, color: isUser ? '#fff' : 'var(--t-text)' }}>{msg.text}</div>
        <div style={{ ...b.time, color: isUser ? 'rgba(255,255,255,0.6)' : '#C0A0B8' }}>{msg.time}</div>
      </div>
    </div>
  )
}

const b = {
  avatar:     { width: 28, height: 28, background: 'var(--t-border)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 6, alignSelf: 'flex-end', marginBottom: 14 },
  bubble:     { borderRadius: 16, padding: '10px 13px' },
  userBubble: { background: 'linear-gradient(135deg, var(--t-soft), var(--t-accent))', borderBottomRightRadius: 4, boxShadow: '0 2px 8px var(--t-phone-shadow)' },
  aiBubble:   { background: '#fff', borderBottomLeftRadius: 4, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #F4D0DC' },
  text:       { fontSize: 13, fontWeight: 600, lineHeight: 1.5 },
  time:       { fontSize: 9, fontWeight: 700, marginTop: 4, textAlign: 'right' },
}

// ── TYPING INDICATOR ──────────────────────────────────────────────────────────
function Typing() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 10 }}>
      <div style={b.avatar}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M12 3C7.03 3 3 6.58 3 11C3 13.1 3.87 15.02 5.3 16.5L4 21L8.7 19.3C9.74 19.75 10.84 20 12 20C16.97 20 21 16.42 21 12C21 7.58 16.97 4 12 4"
            stroke="var(--t-active)" strokeWidth="2" strokeLinecap="round" fill="var(--t-border)"/>
          <circle cx="8.5"  cy="11.5" r="1" fill="var(--t-active)"/>
          <circle cx="12"   cy="11.5" r="1" fill="var(--t-active)"/>
          <circle cx="15.5" cy="11.5" r="1" fill="var(--t-active)"/>
        </svg>
      </div>
      <div style={{ ...b.aiBubble, padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          <div style={ty.dot} className="dot1" />
          <div style={ty.dot} className="dot2" />
          <div style={ty.dot} className="dot3" />
        </div>
      </div>
    </div>
  )
}
const ty = { dot: { width: 7, height: 7, borderRadius: 4, background: 'var(--t-mid)' } }

// ── MAIN ─────────────────────────────────────────────────────────────────────
export default function Coach() {
  const { user, profile } = useAuth()
  if (!user) return <GuestLock title="Your Coach" description="Sign up to chat with your AI coach about training, recovery, and race prep." />

  const firstName   = profile?.name?.split(' ')[0] ?? 'there'
  const storageKey  = `coach_messages_v1_${user?.id ?? 'anon'}`
  const injury      = profile?.injury_flags && profile.injury_flags !== 'None' ? profile.injury_flags : null
  const daysToRace  = profile?.has_race && profile?.race_date
    ? Math.max(Math.ceil((new Date(profile.race_date + 'T12:00:00') - new Date()) / 86400000), 0)
    : null
  const raceDateLabel = profile?.has_race && profile?.race_date
    ? new Date(profile.race_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  const welcomeMsg = {
    role: 'ai',
    text: `Hey ${firstName}! I'm caught up on your recent training. What's on your mind?`,
    time: nowStr(),
  }

  const [messages,         setMessages]         = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return [welcomeMsg]
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    } catch {}
    return [welcomeMsg]
  })
  const [input,            setInput]            = useState('')
  const [typing,           setTyping]           = useState(false)
  const [recentWorkouts,   setRecentWorkouts]   = useState([])
  const [thisWeekWorkouts, setThisWeekWorkouts] = useState([])
  const scrollRef = useRef(null)

  useEffect(() => {
    getRecentWorkouts(14).then(setRecentWorkouts).catch(console.error)
    getThisWeekWorkouts().then(setThisWeekWorkouts).catch(console.error)
  }, [])

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages.slice(-50)))
    } catch {}
  }, [messages, storageKey])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, typing])

  function clearConversation() {
    setMessages([{ ...welcomeMsg, time: nowStr() }])
  }

  async function send(text) {
    if (!text.trim() || typing) return
    const safeText = text.trim().slice(0, 500)
    const userMsg = { role: 'user', text: safeText, time: nowStr() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setTyping(true)

    // Build history — cap at 20 turns before sending (server slices to 10)
    const history = messages
      .filter(m => m.role === 'user' || m.role === 'ai')
      .slice(-20)
      .map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }))

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ message: safeText, history, profile }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`)
      if (!data.reply) throw new Error('Empty reply from server')

      setMessages(prev => [...prev, { role: 'ai', text: data.reply, time: nowStr() }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'ai',
        text: `Error: ${err.message}`,
        time: nowStr(),
      }])
    } finally {
      setTyping(false)
    }
  }

  return (
    <div style={s.screen}>
      <style>{css}</style>

      {/* HEADER */}
      <div style={s.pageHeader}>
        <div>
          <div style={s.pageTitle}>Coach</div>
          <div style={s.pageSub}>Powered by ChatGPT</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button style={s.clearBtn} onClick={clearConversation} title="Clear conversation">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="var(--t-muted)" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Clear
          </button>
          <div style={s.onlineBadge}>
            <div style={s.onlineDot} />
            Online
          </div>
        </div>
      </div>

      {/* CONTEXT BAR */}
      <div style={{ padding: '10px 16px 0' }}>
        <ContextBar daysToRace={daysToRace} injury={injury} />
      </div>

      {/* MESSAGES */}
      <div style={s.messages} ref={scrollRef}>
        {messages.map((msg, i) => <Bubble key={i} msg={msg} />)}
        {typing && <Typing />}
      </div>

      {/* PROMPT CHIPS — shown until the conversation gets going */}
      {messages.length <= 2 && !typing && (
        <div style={s.chipsWrap}>
          <div style={s.chips}>
            {PROMPT_CHIPS.map((chip, i) => (
              <button key={i} style={s.chip} className="chip" onClick={() => send(chip)}>
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* INPUT */}
      <div style={s.inputRow}>
        <input
          style={s.input}
          placeholder="ask your coach…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send(input)}
        />
        <button
          style={{ ...s.sendBtn, opacity: input.trim() && !typing ? 1 : 0.4 }}
          disabled={!input.trim() || typing}
          onClick={() => send(input)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const s = {
  screen:     { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--t-bg)', fontFamily: "'Nunito', system-ui, sans-serif" },
  pageHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 10px', borderBottom: '1.5px solid var(--t-border)', flexShrink: 0 },
  pageTitle:  { fontSize: 17, fontWeight: 900, color: 'var(--t-dark)' },
  pageSub:    { fontSize: 10, color: 'var(--t-muted)', fontWeight: 700, marginTop: 1 },
  onlineBadge:{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--t-surface)', border: '1.5px solid var(--t-border)', borderRadius: 20, padding: '4px 10px', fontSize: 10, fontWeight: 800, color: 'var(--t-dark)' },
  onlineDot:  { width: 6, height: 6, borderRadius: 3, background: 'var(--t-active)' },
  clearBtn:   { display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: '1.5px solid var(--t-border)', borderRadius: 12, padding: '4px 9px', fontSize: 10, fontWeight: 700, color: 'var(--t-muted)', cursor: 'pointer', fontFamily: 'inherit' },

  messages:   { flex: 1, overflowY: 'auto', padding: '12px 14px 4px', scrollbarWidth: 'none' },

  chipsWrap: { padding: '0 14px 8px', borderTop: '1px solid var(--t-border)' },
  chips:     { display: 'flex', gap: 6, overflowX: 'auto', padding: '8px 0 2px', scrollbarWidth: 'none' },
  chip:      { flexShrink: 0, background: 'var(--t-surface)', border: '1.5px solid var(--t-border)', borderRadius: 20, padding: '6px 12px', fontSize: 11, fontWeight: 700, color: 'var(--t-active)', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' },

  inputRow: { display: 'flex', gap: 8, padding: '8px 14px max(10px, env(safe-area-inset-bottom, 10px))', borderTop: '1.5px solid var(--t-border)', alignItems: 'center', flexShrink: 0 },
  input:    { flex: 1, background: 'var(--t-surface)', border: '1.5px solid var(--t-border)', borderRadius: 22, padding: '10px 16px', fontSize: 13, color: 'var(--t-subtext)', fontFamily: 'inherit', outline: 'none' },
  sendBtn:  { width: 40, height: 40, borderRadius: 14, background: 'linear-gradient(135deg, var(--t-soft), var(--t-accent))', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px var(--t-phone-shadow)', flexShrink: 0 },
}

const css = `
  input:focus { border-color: var(--t-mid) !important; box-shadow: 0 0 0 3px rgba(244,167,185,0.2); }
  .chip:hover { background: var(--t-border) !important; transform: scale(1.03); }
`
