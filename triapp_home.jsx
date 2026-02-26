import { useState, useEffect } from "react";

const RACE_DATE = new Date("2025-07-18");

const disciplines = [
  { id: "swim", label: "Swim", emoji: "🏊", color: "#A8E6CF", dark: "#2D8B6F", bg: "#E8FAF3" },
  { id: "bike", label: "Bike", emoji: "🚴", color: "#C9B8F0", dark: "#6B4FBB", bg: "#F2EEFF" },
  { id: "run",  label: "Run",  emoji: "🏃", color: "#FFD4A8", dark: "#C47A2B", bg: "#FFF4E8" },
  { id: "strength", label: "Lift", emoji: "💪", color: "#FFF3A8", dark: "#B8960A", bg: "#FFFBE8" },
  { id: "climb", label: "Climb", emoji: "🧗", color: "#FFB8C6", dark: "#C4354F", bg: "#FFE8EE" },
];

const weekData = [
  { id: "swim",     done: 2, goal: 3 },
  { id: "bike",     done: 1, goal: 2 },
  { id: "run",      done: 1, goal: 2 },
  { id: "strength", done: 1, goal: 2 },
  { id: "climb",    done: 0, goal: 1 },
];

const recentWorkouts = [
  { type: "swim", label: "Swim", emoji: "🏊", detail: "1500m · Pool · Endurance", time: "Today, 7:02am", color: "#A8E6CF", dark: "#2D8B6F" },
  { type: "bike", label: "Bike", emoji: "🚴", detail: "45 min · Indoor trainer", time: "Yesterday", color: "#C9B8F0", dark: "#6B4FBB" },
  { type: "strength", label: "Lift", emoji: "💪", detail: "55 min · Glutes + core", time: "Mon, Feb 24", color: "#FFF3A8", dark: "#B8960A" },
];

const moods = ["😴", "💪", "🔥", "😤", "💀"];

export default function App() {
  const [daysLeft, setDaysLeft] = useState(0);
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedDiscipline, setSelectedDiscipline] = useState(null);
  const [duration, setDuration] = useState(30);
  const [effort, setEffort] = useState(0);
  const [mood, setMood] = useState(null);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState("home");

  useEffect(() => {
    const today = new Date();
    const diff = Math.ceil((RACE_DATE - today) / (1000 * 60 * 60 * 24));
    setDaysLeft(diff);
  }, []);

  function handleSave() {
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setShowLogModal(false);
      setSelectedDiscipline(null);
      setDuration(30);
      setEffort(0);
      setMood(null);
    }, 1800);
  }

  const disc = disciplines.find(d => d.id === selectedDiscipline);

  return (
    <div style={styles.shell}>
      <style>{css}</style>

      {/* ── PHONE FRAME ── */}
      <div style={styles.phone}>

        {/* STATUS BAR */}
        <div style={styles.statusBar}>
          <span style={styles.statusTime}>9:41</span>
          <span style={styles.statusIcons}>●●● 𝗪𝗶-𝗙𝗶 🔋</span>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div style={styles.scroll}>

          {/* ── HEADER ── */}
          <div style={styles.header}>
            <div>
              <div style={styles.headerGreeting}>good morning, jess</div>
              <div style={styles.headerSub}>let's get it</div>
            </div>
          </div>

          {/* ── RACE COUNTDOWN ── */}
          <div style={styles.raceCard} className="race-card">
            <div style={styles.raceCardInner}>
              <div style={styles.raceLabel}>race day countdown</div>
              <div style={styles.raceDays}>{daysLeft}</div>
              <div style={styles.raceSub}>days until your triathlon</div>
              <div style={styles.raceDate}>July 18, 2025</div>
            </div>
            <div style={styles.raceDots}>
              {Array.from({ length: Math.min(daysLeft, 20) }).map((_, i) => (
                <div key={i} style={{ ...styles.raceDot, opacity: 1 - i * 0.04 }} />
              ))}
            </div>
          </div>

          {/* ── QUICK LOG ── */}
          <button style={styles.logBtn} className="log-btn" onClick={() => setShowLogModal(true)}>
            <span style={styles.logBtnPlus}>+</span>
            <span style={styles.logBtnText}>log workout</span>
          </button>

          {/* ── THIS WEEK ── */}
          <div style={styles.sectionHeader}>
            <span style={styles.sectionTitle}>this week</span>
            <span style={styles.sectionSub}>Feb 23–Mar 1</span>
          </div>

          <div style={styles.weekGrid}>
            {weekData.map(w => {
              const d = disciplines.find(x => x.id === w.id);
              const pct = Math.min(w.done / w.goal, 1);
              return (
                <div key={w.id} style={{ ...styles.weekCard, background: d.bg }} className="week-card">
                  <div style={styles.weekEmoji}>{d.emoji}</div>
                  <div style={styles.weekLabel}>{d.label}</div>
                  <div style={styles.weekBar}>
                    <div style={{ ...styles.weekBarFill, width: `${pct * 100}%`, background: d.dark }} />
                  </div>
                  <div style={{ ...styles.weekCount, color: d.dark }}>{w.done}/{w.goal}</div>
                </div>
              );
            })}
          </div>

          {/* ── RECENT ── */}
          <div style={styles.sectionHeader}>
            <span style={styles.sectionTitle}>recent workouts</span>
          </div>

          <div style={styles.recentList}>
            {recentWorkouts.map((w, i) => (
              <div key={i} style={{ ...styles.recentCard, borderLeft: `4px solid ${w.color}` }} className="recent-card">
                <div style={{ ...styles.recentEmojiBadge, background: w.color }}>{w.emoji}</div>
                <div style={styles.recentInfo}>
                  <div style={{ ...styles.recentLabel, color: w.dark }}>{w.label}</div>
                  <div style={styles.recentDetail}>{w.detail}</div>
                </div>
                <div style={styles.recentTime}>{w.time}</div>
              </div>
            ))}
          </div>

          <div style={{ height: 24 }} />
        </div>

        {/* ── BOTTOM NAV ── */}
        <div style={styles.bottomNav}>
          {[
            { id: "home", label: "home", icon: (active) => (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M3 12L12 4L21 12V20C21 20.55 20.55 21 20 21H15V15H9V21H4C3.45 21 3 20.55 3 20V12Z"
                  fill={active ? "#C2185B" : "none"} stroke={active ? "#C2185B" : "#B8A0B0"} strokeWidth="2" strokeLinejoin="round"/>
              </svg>
            )},
            { id: "log", label: "log", icon: (active) => (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="3" width="16" height="18" rx="3" stroke={active ? "#C2185B" : "#B8A0B0"} strokeWidth="2" fill={active ? "#F9D0DF" : "none"}/>
                <path d="M8 8H16M8 12H16M8 16H12" stroke={active ? "#C2185B" : "#B8A0B0"} strokeWidth="2" strokeLinecap="round"/>
                <circle cx="19" cy="19" r="5" fill={active ? "#C2185B" : "#B8A0B0"}/>
                <path d="M17 19H21M19 17V21" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            )},
            { id: "progress", label: "progress", icon: (active) => (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M4 20V14M8 20V10M12 20V6M16 20V12M20 20V8"
                  stroke={active ? "#C2185B" : "#B8A0B0"} strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
            )},
            { id: "coach", label: "coach", icon: (active) => (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 3C7.03 3 3 6.58 3 11C3 13.1 3.87 15.02 5.3 16.5L4 21L8.7 19.3C9.74 19.75 10.84 20 12 20C16.97 20 21 16.42 21 12C21 7.58 16.97 4 12 4"
                  stroke={active ? "#C2185B" : "#B8A0B0"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  fill={active ? "#F9D0DF" : "none"}/>
                <circle cx="8.5" cy="11.5" r="1" fill={active ? "#C2185B" : "#B8A0B0"}/>
                <circle cx="12" cy="11.5" r="1" fill={active ? "#C2185B" : "#B8A0B0"}/>
                <circle cx="15.5" cy="11.5" r="1" fill={active ? "#C2185B" : "#B8A0B0"}/>
              </svg>
            )},
          ].map(tab => (
            <button
              key={tab.id}
              style={{ ...styles.navTab, ...(activeTab === tab.id ? styles.navTabActive : {}) }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon(activeTab === tab.id)}
              <span style={{ ...styles.navLabel, color: activeTab === tab.id ? "#C2185B" : "#B8A0B0" }}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>

        {/* ── LOG MODAL ── */}
        {showLogModal && (
          <div style={styles.modalOverlay} onClick={() => setShowLogModal(false)}>
            <div style={styles.modalSheet} onClick={e => e.stopPropagation()}>
              {saved ? (
                <div style={styles.savedState}>
                  <div style={styles.savedSpark}>✦ · ✦</div>
                  <div style={styles.savedText}>logged! great work</div>
                </div>
              ) : (
                <>
                  <div style={styles.modalHandle} />
                  <div style={styles.modalTitle}>log workout</div>

                  {/* DISCIPLINE SELECT */}
                  <div style={styles.modalLabel}>what did you do?</div>
                  <div style={styles.discGrid}>
                    {disciplines.map(d => (
                      <button
                        key={d.id}
                        style={{
                          ...styles.discBtn,
                          background: selectedDiscipline === d.id ? d.color : "#FFF5F8",
                          border: `2px solid ${selectedDiscipline === d.id ? d.dark : "#F4A7B9"}`,
                          transform: selectedDiscipline === d.id ? "scale(1.06)" : "scale(1)",
                        }}
                        onClick={() => setSelectedDiscipline(d.id)}
                      >
                        <span style={styles.discEmoji}>{d.emoji}</span>
                        <span style={{ ...styles.discLabel, color: selectedDiscipline === d.id ? d.dark : "#B06090" }}>{d.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* DURATION */}
                  <div style={styles.modalLabel}>duration</div>
                  <div style={styles.durationRow}>
                    <button style={styles.durBtn} onClick={() => setDuration(Math.max(5, duration - 5))}>−</button>
                    <div style={styles.durDisplay}>
                      <span style={styles.durNum}>{duration}</span>
                      <span style={styles.durUnit}>min</span>
                    </div>
                    <button style={styles.durBtn} onClick={() => setDuration(duration + 5)}>+</button>
                  </div>

                  {/* EFFORT */}
                  <div style={styles.modalLabel}>effort</div>
                  <div style={styles.effortRow}>
                    {[1,2,3,4,5].map(n => (
                      <button key={n} style={styles.starBtn} onClick={() => setEffort(n)}>
                        <span style={{ fontSize: 24, filter: n <= effort ? "none" : "grayscale(1) opacity(0.35)" }}>⭐</span>
                      </button>
                    ))}
                  </div>

                  {/* MOOD */}
                  <div style={styles.modalLabel}>mood</div>
                  <div style={styles.moodRow}>
                    {moods.map(m => (
                      <button
                        key={m}
                        style={{ ...styles.moodBtn, background: mood === m ? "#F9C8D8" : "#FFF5F8", border: `2px solid ${mood === m ? "#F4A7B9" : "#F9D0DF"}` }}
                        onClick={() => setMood(m)}
                      >
                        {m}
                      </button>
                    ))}
                  </div>

                  {/* SAVE */}
                  <button
                    style={{ ...styles.saveBtn, opacity: selectedDiscipline ? 1 : 0.5 }}
                    disabled={!selectedDiscipline}
                    onClick={handleSave}
                    className="save-btn"
                  >
                    save workout
                  </button>

                  <button style={styles.cancelBtn} onClick={() => setShowLogModal(false)}>cancel</button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── STYLES ──────────────────────────────────────────────
const styles = {
  shell: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #FFE8F0 0%, #F8E8FF 50%, #E8F4FF 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Nunito', 'Quicksand', system-ui, sans-serif",
    padding: "32px 16px",
  },
  phone: {
    width: 375,
    height: 780,
    background: "#FFF8FB",
    borderRadius: 44,
    boxShadow: "0 32px 80px rgba(194, 24, 91, 0.18), 0 8px 24px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
    border: "2px solid rgba(244,167,185,0.4)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    position: "relative",
  },
  statusBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 24px 4px",
    background: "#FFF8FB",
  },
  statusTime: { fontSize: 13, fontWeight: 700, color: "#8B4A6E" },
  statusIcons: { fontSize: 10, color: "#C077A0" },
  scroll: {
    flex: 1,
    overflowY: "auto",
    padding: "0 16px",
    scrollbarWidth: "none",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 4px 16px",
  },
  headerGreeting: { fontSize: 20, fontWeight: 800, color: "#8B1A4A", letterSpacing: -0.3 },
  headerSub: { fontSize: 13, color: "#C077A0", marginTop: 2 },

  // RACE CARD
  raceCard: {
    background: "linear-gradient(135deg, #FF8FAB 0%, #F06292 40%, #E91E8C 100%)",
    borderRadius: 20,
    padding: "20px 20px 16px",
    marginBottom: 14,
    position: "relative",
    overflow: "hidden",
    boxShadow: "0 6px 20px rgba(240,98,146,0.35)",
  },
  raceCardInner: { position: "relative", zIndex: 1 },
  raceLabel: { fontSize: 11, color: "rgba(255,255,255,0.85)", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 },
  raceDays: { fontSize: 64, fontWeight: 900, color: "#fff", lineHeight: 1, letterSpacing: -3 },
  raceSub: { fontSize: 14, color: "rgba(255,255,255,0.9)", fontWeight: 600, marginTop: 2 },
  raceDate: { fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 6, fontWeight: 600 },
  raceDots: {
    position: "absolute", bottom: 12, right: 16,
    display: "flex", flexWrap: "wrap", gap: 4, width: 100, justifyContent: "flex-end",
  },
  raceDot: { width: 6, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.5)" },

  // LOG BUTTON
  logBtn: {
    width: "100%",
    background: "linear-gradient(135deg, #F48FB1, #F06292)",
    border: "none",
    borderRadius: 16,
    padding: "16px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    cursor: "pointer",
    marginBottom: 20,
    boxShadow: "0 4px 16px rgba(240,98,146,0.3), 0 2px 4px rgba(0,0,0,0.08)",
  },
  logBtnPlus: { fontSize: 24, color: "#fff", fontWeight: 900, lineHeight: 1 },
  logBtnText: { fontSize: 17, fontWeight: 800, color: "#fff", letterSpacing: 0.2 },

  // SECTION HEADERS
  sectionHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "baseline",
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: 800, color: "#8B1A4A" },
  sectionSub: { fontSize: 11, color: "#C077A0", fontWeight: 600 },

  // WEEK GRID
  weekGrid: {
    display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 22,
  },
  weekCard: {
    borderRadius: 14, padding: "10px 6px 8px",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  },
  weekEmoji: { fontSize: 18 },
  weekLabel: { fontSize: 9, fontWeight: 700, color: "#8B4A6E", textTransform: "uppercase", letterSpacing: 0.3 },
  weekBar: { width: "80%", height: 5, background: "rgba(0,0,0,0.08)", borderRadius: 3, overflow: "hidden" },
  weekBarFill: { height: "100%", borderRadius: 3, transition: "width 0.6s ease" },
  weekCount: { fontSize: 11, fontWeight: 800 },

  // RECENT
  recentList: { display: "flex", flexDirection: "column", gap: 8 },
  recentCard: {
    background: "#fff",
    borderRadius: 14,
    padding: "12px 14px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  },
  recentEmojiBadge: {
    width: 38, height: 38, borderRadius: 10,
    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
    flexShrink: 0,
  },
  recentInfo: { flex: 1, minWidth: 0 },
  recentLabel: { fontSize: 13, fontWeight: 800 },
  recentDetail: { fontSize: 11, color: "#B8A0B0", marginTop: 1 },
  recentTime: { fontSize: 10, color: "#C077A0", fontWeight: 600, flexShrink: 0 },

  // BOTTOM NAV
  bottomNav: {
    display: "flex",
    background: "#fff",
    borderTop: "1.5px solid #F9D0DF",
    padding: "8px 0 16px",
    boxShadow: "0 -4px 16px rgba(244,167,185,0.15)",
  },
  navTab: {
    flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
    border: "none", background: "transparent", cursor: "pointer", padding: "4px 0",
  },
  navTabActive: {},
  navLabel: { fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 },

  // MODAL
  modalOverlay: {
    position: "absolute", inset: 0,
    background: "rgba(139,26,74,0.2)",
    backdropFilter: "blur(4px)",
    display: "flex", alignItems: "flex-end",
    zIndex: 50,
  },
  modalSheet: {
    width: "100%",
    background: "#FFF8FB",
    borderRadius: "24px 24px 0 0",
    padding: "12px 20px 32px",
    boxShadow: "0 -8px 32px rgba(194,24,91,0.15)",
    maxHeight: "85%",
    overflowY: "auto",
  },
  modalHandle: {
    width: 36, height: 4, background: "#F4A7B9", borderRadius: 2, margin: "0 auto 16px",
  },
  modalTitle: { fontSize: 18, fontWeight: 900, color: "#8B1A4A", marginBottom: 16, textAlign: "center" },
  modalLabel: { fontSize: 11, fontWeight: 800, color: "#C077A0", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, marginTop: 14 },

  discGrid: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 },
  discBtn: {
    borderRadius: 12, padding: "10px 4px 8px",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
    cursor: "pointer", transition: "transform 0.15s ease",
  },
  discEmoji: { fontSize: 20 },
  discLabel: { fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.3 },

  durationRow: { display: "flex", alignItems: "center", gap: 16, justifyContent: "center" },
  durBtn: {
    width: 40, height: 40, borderRadius: 12,
    background: "#F9D0DF", border: "2px solid #F4A7B9",
    fontSize: 20, fontWeight: 900, color: "#C2185B", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  durDisplay: {
    background: "#FFF0F5", border: "2px solid #F4A7B9", borderRadius: 14,
    padding: "8px 20px", textAlign: "center",
    minWidth: 90,
  },
  durNum: { fontSize: 28, fontWeight: 900, color: "#8B1A4A" },
  durUnit: { fontSize: 13, color: "#C077A0", fontWeight: 600, marginLeft: 4 },

  effortRow: { display: "flex", gap: 8, justifyContent: "center" },
  starBtn: { background: "transparent", border: "none", cursor: "pointer", padding: 4 },

  moodRow: { display: "flex", gap: 8, justifyContent: "center" },
  moodBtn: {
    width: 44, height: 44, borderRadius: 12,
    fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
  },

  saveBtn: {
    width: "100%", marginTop: 20,
    background: "linear-gradient(135deg, #F48FB1, #E91E8C)",
    border: "none", borderRadius: 14,
    color: "#fff", fontSize: 16, fontWeight: 800,
    padding: "14px 0", cursor: "pointer",
    boxShadow: "0 4px 14px rgba(233,30,140,0.3)",
    letterSpacing: 0.2,
  },
  cancelBtn: {
    width: "100%", marginTop: 8,
    background: "transparent", border: "none",
    color: "#C077A0", fontSize: 13, fontWeight: 700,
    padding: "8px 0", cursor: "pointer",
  },

  savedState: {
    padding: "48px 0 32px",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
  },
  savedSpark: { fontSize: 28, letterSpacing: 8, color: "#F06292" },
  savedText: { fontSize: 20, fontWeight: 900, color: "#8B1A4A" },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');

  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }

  .race-card { transition: transform 0.2s ease; }
  .race-card:hover { transform: scale(1.01); }

  .log-btn { transition: transform 0.15s ease, box-shadow 0.15s ease; }
  .log-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(240,98,146,0.4) !important; }
  .log-btn:active { transform: translateY(0); }

  .week-card { transition: transform 0.15s ease; }
  .week-card:hover { transform: scale(1.04); }

  .recent-card { transition: transform 0.15s ease; }
  .recent-card:hover { transform: translateX(3px); }

  .save-btn:hover { transform: translateY(-1px); }
  .save-btn:active { transform: translateY(0); }

  ::-webkit-scrollbar { display: none; }
`;
