import { useState, useRef, useEffect } from "react";

// ── MOCK CONTEXT (in real app, pulled from workout log) ──
const USER_CONTEXT = {
  phase: "Race Mode",
  raceDate: "July 18, 2025",
  daysUntilRace: 142,
  injury: "Foot injury — modified run sessions",
  recentWorkouts: [
    { type: "Swim",     detail: "1800m · Pool · Endurance",   day: "Today"   },
    { type: "Bike",     detail: "75 min · Indoor trainer",    day: "Yesterday" },
    { type: "Strength", detail: "55 min · Glutes / Core",     day: "Mon"     },
    { type: "Run",      detail: "4.2km · Modified / Endurance", day: "Sun"   },
    { type: "Recover",  detail: "30 min · Stretch + Foam Roll", day: "Sat"   },
  ],
};

const PROMPT_CHIPS = {
  "Race Mode": [
    "How's my swim volume looking?",
    "Am I on track for July 18?",
    "Tips for my foot injury and running",
    "What should I prioritize this week?",
    "Recovery advice after today's swim",
  ],
  "Strength Mode": [
    "How's my climbing progression?",
    "Glute training balance check",
    "Mobility priorities this week",
    "Progressive overload suggestions",
    "How's my overall consistency?",
  ],
};

const DISC_COLORS = {
  Swim:     { color: "#A8E6CF", dark: "#2D8B6F" },
  Bike:     { color: "#C9B8F0", dark: "#6B4FBB" },
  Run:      { color: "#FFD4A8", dark: "#C47A2B" },
  Strength: { color: "#FFF3A8", dark: "#B8960A" },
  Climb:    { color: "#FFB8C6", dark: "#C4354F" },
  Recover:  { color: "#B8F0E0", dark: "#1A7A5E" },
};

// ── MOCK AI RESPONSES ────────────────────────────────────
const MOCK_RESPONSES = {
  "How's my swim volume looking?": "Your swim volume is looking solid! You've been averaging around 1,500m per week with a strong 1,800m session today. For a sprint or Olympic triathlon, that's a great base. I'd suggest pushing toward one 2,000m+ session per week in the next month to build confidence for race day. Your pool consistency is really paying off.",
  "Am I on track for July 18?": "With 142 days to go, you're in a great position. You're hitting all three disciplines consistently, your swim is building nicely, and your bike sessions are getting longer. The main thing to watch is your run — modified sessions are smart given your foot, but we'll want to gradually build that distance as it allows. Overall: yes, you're on track.",
  "Tips for my foot injury and running": "With a foot injury, the key is load management. A few things that help: keep your run days to soft surfaces where possible, the jog-walk combo is perfect right now — don't rush past it. Make sure your recovery sessions (stretching, foam rolling) are targeting the foot and calf chain. If pain changes your stride at all, stop immediately. You're doing the right things.",
  "default": "Great question! Based on your recent training — strong swim today, consistent bike sessions, and smart recovery work — you're building a really solid triathlon base. Keep listening to your body, especially with the foot. What else can I help you think through?",
};

function getMockResponse(msg) {
  return MOCK_RESPONSES[msg] || MOCK_RESPONSES["default"];
}

// ── CONTEXT PILL ─────────────────────────────────────────
function ContextBar({ context }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={cx.wrap}>
      <button style={cx.pill} onClick={() => setExpanded(e => !e)}>
        <div style={cx.pillDot} />
        <span style={cx.pillText}>Coach sees: {context.phase} · {context.daysUntilRace}d to race · {context.recentWorkouts.length} recent workouts</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>
          <path d="M6 9L12 15L18 9" stroke="#2D8B6F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {expanded && (
        <div style={cx.drawer}>
          <div style={cx.drawerRow}>
            <span style={cx.drawerLabel}>Phase</span>
            <span style={cx.drawerVal}>{context.phase}</span>
          </div>
          <div style={cx.drawerRow}>
            <span style={cx.drawerLabel}>Race</span>
            <span style={cx.drawerVal}>{context.raceDate} · {context.daysUntilRace} days</span>
          </div>
          <div style={cx.drawerRow}>
            <span style={cx.drawerLabel}>Injury</span>
            <span style={{ ...cx.drawerVal, color: "#C4354F" }}>{context.injury}</span>
          </div>
          <div style={cx.drawerLabel} >Recent workouts</div>
          {context.recentWorkouts.map((w, i) => {
            const d = DISC_COLORS[w.type] || { color: "#F4D0DC", dark: "#C077A0" };
            return (
              <div key={i} style={cx.workoutRow}>
                <div style={{ ...cx.workoutDot, background: d.color }} />
                <span style={{ ...cx.workoutType, color: d.dark }}>{w.type}</span>
                <span style={cx.workoutDetail}>{w.detail}</span>
                <span style={cx.workoutDay}>{w.day}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const cx = {
  wrap: { marginBottom: 12 },
  pill: { width: "100%", background: "#E8FAF3", border: "1.5px solid #A8E6CF", borderRadius: 12, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" },
  pillDot: { width: 7, height: 7, borderRadius: 4, background: "#2D8B6F", flexShrink: 0, boxShadow: "0 0 0 2px #A8E6CF" },
  pillText: { flex: 1, fontSize: 11, fontWeight: 700, color: "#1A7A5E", textAlign: "left" },
  drawer: { background: "#F0FDF8", border: "1.5px solid #A8E6CF", borderTop: "none", borderRadius: "0 0 12px 12px", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 },
  drawerRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  drawerLabel: { fontSize: 10, fontWeight: 800, color: "#2D8B6F", textTransform: "uppercase", letterSpacing: 0.4, marginTop: 4 },
  drawerVal: { fontSize: 11, fontWeight: 700, color: "#1A7A5E" },
  workoutRow: { display: "flex", alignItems: "center", gap: 6 },
  workoutDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  workoutType: { fontSize: 11, fontWeight: 800, minWidth: 56 },
  workoutDetail: { fontSize: 10, color: "#7A9A8A", flex: 1 },
  workoutDay: { fontSize: 10, color: "#A0C4B4", fontWeight: 700, flexShrink: 0 },
};

// ── MESSAGE BUBBLE ────────────────────────────────────────
function Bubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 10 }}>
      {!isUser && (
        <div style={b.avatar}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 3C7.03 3 3 6.58 3 11C3 13.1 3.87 15.02 5.3 16.5L4 21L8.7 19.3C9.74 19.75 10.84 20 12 20C16.97 20 21 16.42 21 12C21 7.58 16.97 4 12 4" stroke="#C2185B" strokeWidth="2" strokeLinecap="round" fill="#F9D0DF"/>
            <circle cx="8.5" cy="11.5" r="1" fill="#C2185B"/>
            <circle cx="12" cy="11.5" r="1" fill="#C2185B"/>
            <circle cx="15.5" cy="11.5" r="1" fill="#C2185B"/>
          </svg>
        </div>
      )}
      <div style={{ ...b.bubble, ...(isUser ? b.userBubble : b.aiBubble), maxWidth: "78%" }}>
        <div style={{ ...b.text, color: isUser ? "#fff" : "#3A2040" }}>{msg.text}</div>
        <div style={{ ...b.time, color: isUser ? "rgba(255,255,255,0.6)" : "#C0A0B8" }}>{msg.time}</div>
      </div>
    </div>
  );
}

const b = {
  avatar: { width: 28, height: 28, background: "#F9D0DF", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 6, alignSelf: "flex-end", marginBottom: 14 },
  bubble: { borderRadius: 16, padding: "10px 13px" },
  userBubble: { background: "linear-gradient(135deg, #F48FB1, #E91E8C)", borderBottomRightRadius: 4, boxShadow: "0 2px 8px rgba(233,30,140,0.25)" },
  aiBubble: { background: "#fff", borderBottomLeftRadius: 4, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid #F4D0DC" },
  text: { fontSize: 13, fontWeight: 600, lineHeight: 1.5 },
  time: { fontSize: 9, fontWeight: 700, marginTop: 4, textAlign: "right" },
};

// ── TYPING INDICATOR ─────────────────────────────────────
function Typing() {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, marginBottom: 10 }}>
      <div style={b.avatar}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M12 3C7.03 3 3 6.58 3 11C3 13.1 3.87 15.02 5.3 16.5L4 21L8.7 19.3C9.74 19.75 10.84 20 12 20C16.97 20 21 16.42 21 12C21 7.58 16.97 4 12 4" stroke="#C2185B" strokeWidth="2" strokeLinecap="round" fill="#F9D0DF"/>
          <circle cx="8.5" cy="11.5" r="1" fill="#C2185B"/>
          <circle cx="12" cy="11.5" r="1" fill="#C2185B"/>
          <circle cx="15.5" cy="11.5" r="1" fill="#C2185B"/>
        </svg>
      </div>
      <div style={{ ...b.aiBubble, padding: "12px 16px" }}>
        <div style={ty.dots}>
          <div style={ty.dot} className="dot1" />
          <div style={ty.dot} className="dot2" />
          <div style={ty.dot} className="dot3" />
        </div>
      </div>
    </div>
  );
}
const ty = {
  dots: { display: "flex", gap: 5, alignItems: "center" },
  dot: { width: 7, height: 7, borderRadius: 4, background: "#F4A7B9" },
};

// ── MAIN ─────────────────────────────────────────────────
export default function App() {
  const [messages, setMessages] = useState([
    { role: "ai", text: "Hey Jess! I'm caught up on your recent training. What's on your mind?", time: "9:41 AM" }
  ]);
  const [input, setInput]       = useState("");
  const [typing, setTyping]     = useState(false);
  const [activeTab, setActiveTab] = useState("coach");
  const scrollRef               = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typing]);

  function now() {
    return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  function send(text) {
    if (!text.trim()) return;
    const userMsg = { role: "user", text: text.trim(), time: now() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages(prev => [...prev, {
        role: "ai",
        text: getMockResponse(text.trim()),
        time: now(),
      }]);
    }, 1400 + Math.random() * 800);
  }

  const chips = PROMPT_CHIPS[USER_CONTEXT.phase];

  return (
    <div style={s.shell}>
      <style>{css}</style>
      <div style={s.phone}>

        {/* STATUS BAR */}
        <div style={s.statusBar}>
          <span style={s.statusTime}>9:41</span>
          <span style={s.statusRight}>●●● Wi-Fi 🔋</span>
        </div>

        {/* HEADER */}
        <div style={s.pageHeader}>
          <div>
            <div style={s.pageTitle}>coach</div>
            <div style={s.pageSub}>powered by ChatGPT</div>
          </div>
          <div style={s.onlineBadge}>
            <div style={s.onlineDot} />
            online
          </div>
        </div>

        {/* CONTEXT BAR */}
        <div style={{ padding: "10px 16px 0" }}>
          <ContextBar context={USER_CONTEXT} />
        </div>

        {/* MESSAGES */}
        <div style={s.messages} ref={scrollRef}>
          {messages.map((msg, i) => <Bubble key={i} msg={msg} />)}
          {typing && <Typing />}
        </div>

        {/* PROMPT CHIPS */}
        {messages.length <= 2 && !typing && (
          <div style={s.chipsWrap}>
            <div style={s.chips}>
              {chips.map((chip, i) => (
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
            placeholder="ask your coach..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send(input)}
          />
          <button
            style={{ ...s.sendBtn, opacity: input.trim() ? 1 : 0.4 }}
            disabled={!input.trim()}
            onClick={() => send(input)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* BOTTOM NAV */}
        <div style={s.bottomNav}>
          {[
            { id: "home",     label: "home",     icon: (a) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 12L12 4L21 12V20C21 20.55 20.55 21 20 21H15V15H9V21H4C3.45 21 3 20.55 3 20V12Z" fill={a?"#F9D0DF":"none"} stroke={a?"#C2185B":"#B8A0B0"} strokeWidth="2" strokeLinejoin="round"/></svg> },
            { id: "log",      label: "log",      icon: (a) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="3" stroke={a?"#C2185B":"#B8A0B0"} strokeWidth="2" fill={a?"#F9D0DF":"none"}/><path d="M8 8H16M8 12H16M8 16H12" stroke={a?"#C2185B":"#B8A0B0"} strokeWidth="2" strokeLinecap="round"/></svg> },
            { id: "progress", label: "progress", icon: (a) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 20V14M8 20V10M12 20V6M16 20V12M20 20V8" stroke={a?"#C2185B":"#B8A0B0"} strokeWidth="2.2" strokeLinecap="round"/></svg> },
            { id: "coach",    label: "coach",    icon: (a) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 3C7.03 3 3 6.58 3 11C3 13.1 3.87 15.02 5.3 16.5L4 21L8.7 19.3C9.74 19.75 10.84 20 12 20C16.97 20 21 16.42 21 12C21 7.58 16.97 4 12 4" stroke={a?"#C2185B":"#B8A0B0"} strokeWidth="2" strokeLinecap="round" fill={a?"#F9D0DF":"none"}/><circle cx="8.5" cy="11.5" r="1" fill={a?"#C2185B":"#B8A0B0"}/><circle cx="12" cy="11.5" r="1" fill={a?"#C2185B":"#B8A0B0"}/><circle cx="15.5" cy="11.5" r="1" fill={a?"#C2185B":"#B8A0B0"}/></svg> },
          ].map(tab => (
            <button key={tab.id} style={s.navTab} onClick={() => setActiveTab(tab.id)}>
              {tab.icon(activeTab === tab.id)}
              <span style={{ ...s.navLabel, color: activeTab === tab.id ? "#C2185B" : "#B8A0B0" }}>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── STYLES ───────────────────────────────────────────────
const s = {
  shell: { minHeight: "100vh", background: "linear-gradient(135deg, #FFE8F0 0%, #F8E8FF 50%, #E8F4FF 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Nunito', system-ui, sans-serif", padding: "32px 16px" },
  phone: { width: 375, height: 780, background: "#FFF8FB", borderRadius: 44, boxShadow: "0 32px 80px rgba(194,24,91,0.18), 0 8px 24px rgba(0,0,0,0.08)", border: "2px solid rgba(244,167,185,0.4)", overflow: "hidden", display: "flex", flexDirection: "column", position: "relative" },
  statusBar: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 24px 0" },
  statusTime: { fontSize: 13, fontWeight: 700, color: "#8B4A6E" },
  statusRight: { fontSize: 10, color: "#C077A0" },

  pageHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px 10px", borderBottom: "1.5px solid #F9D0DF" },
  pageTitle: { fontSize: 17, fontWeight: 900, color: "#8B1A4A" },
  pageSub: { fontSize: 10, color: "#C077A0", fontWeight: 700, marginTop: 1 },
  onlineBadge: { display: "flex", alignItems: "center", gap: 5, background: "#E8FAF3", border: "1.5px solid #A8E6CF", borderRadius: 20, padding: "4px 10px", fontSize: 10, fontWeight: 800, color: "#1A7A5E" },
  onlineDot: { width: 6, height: 6, borderRadius: 3, background: "#2D8B6F" },

  messages: { flex: 1, overflowY: "auto", padding: "12px 14px 4px", scrollbarWidth: "none" },

  chipsWrap: { padding: "0 14px 8px", borderTop: "1px solid #F9D0DF" },
  chips: { display: "flex", gap: 6, overflowX: "auto", padding: "8px 0 2px", scrollbarWidth: "none" },
  chip: { flexShrink: 0, background: "#FFF0F5", border: "1.5px solid #F4C0D0", borderRadius: 20, padding: "6px 12px", fontSize: 11, fontWeight: 700, color: "#C2185B", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" },

  inputRow: { display: "flex", gap: 8, padding: "8px 14px 10px", borderTop: "1.5px solid #F9D0DF", alignItems: "center" },
  input: { flex: 1, background: "#FFF0F5", border: "1.5px solid #F4C0D0", borderRadius: 22, padding: "10px 16px", fontSize: 13, color: "#5A3050", fontFamily: "inherit", outline: "none" },
  sendBtn: { width: 40, height: 40, borderRadius: 14, background: "linear-gradient(135deg, #F48FB1, #E91E8C)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 8px rgba(233,30,140,0.3)", flexShrink: 0 },

  bottomNav: { display: "flex", background: "#fff", borderTop: "1.5px solid #F9D0DF", padding: "8px 0 16px", boxShadow: "0 -4px 16px rgba(244,167,185,0.15)" },
  navTab: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, border: "none", background: "transparent", cursor: "pointer", padding: "4px 0" },
  navLabel: { fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  ::-webkit-scrollbar { display: none; }
  input:focus { border-color: #F4A7B9 !important; box-shadow: 0 0 0 3px rgba(244,167,185,0.2); }
  .chip:hover { background: #F9D0DF !important; transform: scale(1.03); }
  .dot1 { animation: bounce 1.2s ease-in-out infinite 0s; }
  .dot2 { animation: bounce 1.2s ease-in-out infinite 0.2s; }
  .dot3 { animation: bounce 1.2s ease-in-out infinite 0.4s; }
  @keyframes bounce { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-5px); } }
`;
