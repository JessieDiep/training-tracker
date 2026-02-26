import { useState } from "react";

// ── MOCK DATA ────────────────────────────────────────────
const WEEKS = ["Jan 20", "Jan 27", "Feb 3", "Feb 10", "Feb 17", "Feb 24"];

const weeklyData = {
  swim:     [1200, 1500, 800, 2000, 1500, 1800],
  bike:     [50,   65,   40,  70,   60,   75],
  run:      [3.2,  4.1,  2.2, 4.8,  3.5,  4.2],
  strength: [2,    2,    1,   3,    2,    2],
  climb:    [1,    0,    1,   1,    1,    2],
};

const thisWeek  = { swim: 1800, bike: 75,  run: 4.2, strength: 2, climb: 2 };
const lastWeek  = { swim: 1500, bike: 60,  run: 3.5, strength: 2, climb: 1 };

const PRs = [
  { disc: "swim",     emoji: "🏊", label: "Longest Swim",    value: "2000m",   date: "Feb 10",  color: "#A8E6CF", dark: "#2D8B6F" },
  { disc: "run",      emoji: "🏃", label: "Longest Run",     value: "4.8 km",  date: "Feb 10",  color: "#FFD4A8", dark: "#C47A2B" },
  { disc: "bike",     emoji: "🚴", label: "Longest Ride",    value: "75 min",  date: "Feb 24",  color: "#C9B8F0", dark: "#6B4FBB" },
  { disc: "climb",    emoji: "🧗", label: "Hardest Send",    value: "5.11a",   date: "Feb 17",  color: "#FFB8C6", dark: "#C4354F" },
  { disc: "strength", emoji: "💪", label: "Hip Thrust PR",   value: "145 lb",  date: "Feb 14",  color: "#FFF3A8", dark: "#B8960A" },
];

const climbGrades = [
  { week: "Jan 20", grade: 9 },
  { week: "Jan 27", grade: 9 },
  { week: "Feb 3",  grade: 10 },
  { week: "Feb 10", grade: 10 },
  { week: "Feb 17", grade: 11 },
  { week: "Feb 24", grade: 11 },
];
const gradeLabels = { 9: "5.9", 10: "5.10", 11: "5.11", 12: "5.12" };

const WEEK_DAYS = [
  { day: "M", type: "train" },
  { day: "T", type: "train" },
  { day: "W", type: "rest" },
  { day: "T", type: "train" },
  { day: "F", type: "recovery" },
  { day: "S", type: "train" },
  { day: "S", type: "rest" },
];

const DISC_CONFIG = {
  swim:     { label: "Swim",     emoji: "🏊", color: "#A8E6CF", dark: "#2D8B6F", bg: "#E8FAF3", unit: "m"   },
  bike:     { label: "Bike",     emoji: "🚴", color: "#C9B8F0", dark: "#6B4FBB", bg: "#F2EEFF", unit: "min" },
  run:      { label: "Run",      emoji: "🏃", color: "#FFD4A8", dark: "#C47A2B", bg: "#FFF4E8", unit: "km"  },
  strength: { label: "Strength", emoji: "💪", color: "#FFF3A8", dark: "#B8960A", bg: "#FFFBE8", unit: "sessions" },
  climb:    { label: "Climb",    emoji: "🧗", color: "#FFB8C6", dark: "#C4354F", bg: "#FFE8EE", unit: "sessions" },
};

// ── MINI BAR CHART ───────────────────────────────────────
function BarChart({ data, weeks, color, dark, unit, activeWeek, setActiveWeek }) {
  const max = Math.max(...data, 1);
  return (
    <div style={ch.wrap}>
      <div style={ch.bars}>
        {data.map((val, i) => {
          const active = activeWeek === i;
          const pct = val / max;
          return (
            <div key={i} style={ch.barCol} onClick={() => setActiveWeek(active ? null : i)}>
              {active && (
                <div style={{ ...ch.tooltip, background: dark }}>
                  {val}{unit === "sessions" ? "" : unit}
                </div>
              )}
              <div style={{ ...ch.bar, height: `${Math.max(pct * 100, 4)}%`, background: active ? dark : color, opacity: active ? 1 : 0.75 }} />
            </div>
          );
        })}
      </div>
      <div style={ch.xAxis}>
        {weeks.map((w, i) => (
          <div key={i} style={{ ...ch.xLabel, color: activeWeek === i ? dark : "#C0A0B8" }}>{w.split(" ")[1]}</div>
        ))}
      </div>
    </div>
  );
}

const ch = {
  wrap: { paddingTop: 8 },
  bars: { display: "flex", alignItems: "flex-end", gap: 4, height: 80 },
  barCol: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", position: "relative", cursor: "pointer" },
  bar: { width: "100%", borderRadius: "4px 4px 0 0", transition: "height 0.3s ease, background 0.15s" },
  tooltip: { position: "absolute", top: -26, color: "#fff", fontSize: 10, fontWeight: 800, borderRadius: 6, padding: "2px 6px", whiteSpace: "nowrap" },
  xAxis: { display: "flex", gap: 4, marginTop: 4 },
  xLabel: { flex: 1, fontSize: 9, fontWeight: 700, textAlign: "center", transition: "color 0.15s" },
};

// ── CLIMB LINE CHART ─────────────────────────────────────
function ClimbChart({ data }) {
  const W = 295, H = 80, PAD = 16;
  const minG = 8, maxG = 12;
  const pts = data.map((d, i) => ({
    x: PAD + (i / (data.length - 1)) * (W - PAD * 2),
    y: H - PAD - ((d.grade - minG) / (maxG - minG)) * (H - PAD * 2),
  }));
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const area = `${path} L${pts[pts.length-1].x},${H} L${pts[0].x},${H} Z`;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="climbGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFB8C6" stopOpacity="0.5"/>
          <stop offset="100%" stopColor="#FFB8C6" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {[9,10,11,12].map(g => {
        const y = H - PAD - ((g - minG) / (maxG - minG)) * (H - PAD * 2);
        return (
          <g key={g}>
            <line x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="#F4D0DC" strokeWidth="1" strokeDasharray="3,3"/>
            <text x={PAD - 4} y={y + 4} fontSize="8" fill="#C0A0B8" fontWeight="700" textAnchor="end">{gradeLabels[g]}</text>
          </g>
        );
      })}
      <path d={area} fill="url(#climbGrad)"/>
      <path d={path} fill="none" stroke="#C4354F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="#C4354F" stroke="white" strokeWidth="2"/>
      ))}
    </svg>
  );
}

// ── MAIN ─────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab]   = useState("progress");
  const [activeDisc, setActiveDisc] = useState("swim");
  const [activeWeek, setActiveWeek] = useState(null);

  const disc = DISC_CONFIG[activeDisc];
  const data = weeklyData[activeDisc];

  function delta(key) {
    const t = thisWeek[key], l = lastWeek[key];
    const diff = t - l;
    const pct = l > 0 ? Math.round((diff / l) * 100) : 0;
    return { diff, pct, up: diff >= 0 };
  }

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
          <div style={s.pageTitle}>progress</div>
        </div>

        <div style={s.scroll}>

          {/* ── WEEKLY ACTIVITY ── */}
          <div style={s.weekCard}>
            <div style={s.weekCardTop}>
              <div>
                <div style={s.weekCardTitle}>this week</div>
                <div style={s.weekCardSub}>4 training · 1 recovery · 2 rest</div>
              </div>
              <div style={s.weekLegend}>
                <div style={s.legendRow}><div style={{ ...s.legendDot, background: "#E91E8C" }} />train</div>
                <div style={s.legendRow}><div style={{ ...s.legendDot, background: "#A8E6CF" }} />recover</div>
                <div style={s.legendRow}><div style={{ ...s.legendDot, background: "#F4D0DC" }} />rest</div>
              </div>
            </div>
            <div style={s.dayRow}>
              {WEEK_DAYS.map((d, i) => {
                const bg   = d.type === "train" ? "#E91E8C" : d.type === "recovery" ? "#A8E6CF" : "#F4D0DC";
                const fg   = d.type === "train" ? "#fff"    : d.type === "recovery" ? "#2D8B6F" : "#C0A0B8";
                const bold = d.type !== "rest";
                return (
                  <div key={i} style={s.dayCol}>
                    <div style={{ ...s.dayDot, background: bg }}>
                      {d.type === "train" && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                      {d.type === "recovery" && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M6 2C6 2 3 4.5 3 7a3 3 0 006 0c0-2.5-3-5-3-5z" fill="#2D8B6F"/>
                        </svg>
                      )}
                    </div>
                    <div style={{ ...s.dayLabel, color: fg, fontWeight: bold ? 800 : 600 }}>{d.day}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── THIS WEEK vs LAST WEEK ── */}
          <div style={s.sectionHeader}>
            <span style={s.sectionTitle}>this week vs last</span>
            <span style={s.sectionSub}>Feb 24–Mar 2</span>
          </div>

          <div style={s.deltaGrid}>
            {Object.keys(DISC_CONFIG).map(key => {
              const d = DISC_CONFIG[key];
              const { pct, up } = delta(key);
              return (
                <div key={key} style={{ ...s.deltaCard, background: d.bg, border: `1.5px solid ${d.color}` }}>
                  <div style={s.deltaEmoji}>{d.emoji}</div>
                  <div style={s.deltaVal}>{thisWeek[key]}<span style={s.deltaUnit}>{d.unit === "sessions" ? "" : d.unit}</span></div>
                  <div style={{ ...s.deltaBadge, background: up ? "#E8FAF3" : "#FFE8EE", color: up ? "#2D8B6F" : "#C4354F" }}>
                    {up ? "▲" : "▼"} {Math.abs(pct)}%
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── WEEKLY VOLUME ── */}
          <div style={s.sectionHeader}>
            <span style={s.sectionTitle}>weekly volume</span>
          </div>

          {/* Discipline tabs */}
          <div style={s.discTabs}>
            {Object.keys(DISC_CONFIG).map(key => {
              const d = DISC_CONFIG[key];
              const active = activeDisc === key;
              return (
                <button key={key}
                  style={{ ...s.discTab, background: active ? d.color : "transparent", border: `1.5px solid ${active ? d.dark : "#F4C0D0"}` }}
                  onClick={() => { setActiveDisc(key); setActiveWeek(null); }}>
                  <span style={{ fontSize: 14 }}>{d.emoji}</span>
                </button>
              );
            })}
          </div>

          {/* Chart card */}
          <div style={{ ...s.chartCard, borderColor: disc.color }}>
            <div style={s.chartHeader}>
              <span style={{ ...s.chartTitle, color: disc.dark }}>{disc.label}</span>
              <span style={s.chartUnit}>{disc.unit === "sessions" ? "sessions / week" : `${disc.unit} / week`}</span>
            </div>
            {activeDisc === "climb" ? (
              <>
                <ClimbChart data={climbGrades} />
                <div style={s.climbNote}>highest grade reached per week</div>
              </>
            ) : (
              <BarChart data={data} weeks={WEEKS} color={disc.color} dark={disc.dark} unit={disc.unit} activeWeek={activeWeek} setActiveWeek={setActiveWeek} />
            )}
            {activeWeek !== null && activeDisc !== "climb" && (
              <div style={{ ...s.weekNote, color: disc.dark }}>
                {WEEKS[activeWeek]}: {data[activeWeek]}{disc.unit !== "sessions" ? disc.unit : " sessions"}
              </div>
            )}
          </div>

          {/* ── PERSONAL RECORDS ── */}
          <div style={s.sectionHeader}>
            <span style={s.sectionTitle}>personal records</span>
            <span style={s.prStar}>✦</span>
          </div>

          <div style={s.prList}>
            {PRs.map((pr, i) => (
              <div key={i} style={{ ...s.prCard, borderLeft: `4px solid ${pr.color}` }} className="pr-card">
                <div style={{ ...s.prBadge, background: pr.color }}>{pr.emoji}</div>
                <div style={s.prInfo}>
                  <div style={{ ...s.prLabel, color: pr.dark }}>{pr.label}</div>
                  <div style={s.prDate}>{pr.date}</div>
                </div>
                <div style={{ ...s.prValue, color: pr.dark }}>{pr.value}</div>
              </div>
            ))}
          </div>

          {/* ── CLIMB SEND RATE ── */}
          <div style={s.sectionHeader}>
            <span style={s.sectionTitle}>climbing sends</span>
          </div>
          <div style={s.sendCard}>
            {[
              { grade: "5.9",   sent: 8, color: "#A8E6CF", dark: "#2D8B6F" },
              { grade: "5.10a", sent: 4, color: "#FFF3A8", dark: "#B8960A" },
              { grade: "5.10b", sent: 3, color: "#FFD4A8", dark: "#C47A2B" },
              { grade: "5.11a", sent: 1, color: "#FFB8C6", dark: "#C4354F" },
            ].map((row, i) => {
              const max = 8;
              return (
                <div key={i} style={s.sendRow}>
                  <div style={s.sendGrade}>{row.grade}</div>
                  <div style={s.sendBarWrap}>
                    <div style={{ ...s.sendBar, width: `${(row.sent / max) * 100}%`, background: row.color, border: `1px solid ${row.dark}22` }} />
                  </div>
                  <div style={{ ...s.sendCount, color: row.dark }}>{row.sent}</div>
                </div>
              );
            })}
          </div>

          <div style={{ height: 32 }} />
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
  pageHeader: { display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 20px 8px", borderBottom: "1.5px solid #F9D0DF" },
  pageTitle: { fontSize: 17, fontWeight: 900, color: "#8B1A4A" },
  scroll: { flex: 1, overflowY: "auto", padding: "14px 16px", scrollbarWidth: "none" },

  sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, marginTop: 18 },
  sectionTitle: { fontSize: 14, fontWeight: 900, color: "#8B1A4A" },
  sectionSub: { fontSize: 10, color: "#C077A0", fontWeight: 700 },
  prStar: { fontSize: 14, color: "#F4A7B9" },

  // WEEKLY ACTIVITY
  weekCard: { background: "linear-gradient(135deg, #FF8FAB 0%, #E91E8C 100%)", borderRadius: 18, padding: "14px 16px 16px", boxShadow: "0 4px 16px rgba(233,30,140,0.25)" },
  weekCardTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  weekCardTitle: { fontSize: 15, fontWeight: 900, color: "#fff" },
  weekCardSub: { fontSize: 10, color: "rgba(255,255,255,0.8)", fontWeight: 700, marginTop: 3 },
  weekLegend: { display: "flex", flexDirection: "column", gap: 3 },
  legendRow: { display: "flex", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  dayRow: { display: "flex", gap: 6 },
  dayCol: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 },
  dayDot: { width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" },
  dayLabel: { fontSize: 10, color: "rgba(255,255,255,0.7)" },

  // THIS WEEK vs LAST
  deltaGrid: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 },
  deltaCard: { borderRadius: 12, padding: "8px 4px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 },
  deltaEmoji: { fontSize: 16 },
  deltaVal: { fontSize: 12, fontWeight: 900, color: "#5A3050" },
  deltaUnit: { fontSize: 9, fontWeight: 600, color: "#B8A0B0", marginLeft: 1 },
  deltaBadge: { fontSize: 9, fontWeight: 800, borderRadius: 6, padding: "2px 5px" },

  // CHART
  discTabs: { display: "flex", gap: 6, marginBottom: 10 },
  discTab: { flex: 1, height: 36, borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" },
  chartCard: { background: "#fff", border: "1.5px solid", borderRadius: 16, padding: "14px 14px 10px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" },
  chartHeader: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 },
  chartTitle: { fontSize: 14, fontWeight: 900 },
  chartUnit: { fontSize: 10, color: "#C077A0", fontWeight: 700 },
  weekNote: { fontSize: 11, fontWeight: 800, textAlign: "center", marginTop: 6 },
  climbNote: { fontSize: 10, color: "#C077A0", fontWeight: 700, textAlign: "center", marginTop: 4 },

  // PRs
  prList: { display: "flex", flexDirection: "column", gap: 7 },
  prCard: { background: "#fff", borderRadius: 12, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 1px 6px rgba(0,0,0,0.05)" },
  prBadge: { width: 34, height: 34, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 },
  prInfo: { flex: 1 },
  prLabel: { fontSize: 12, fontWeight: 800 },
  prDate: { fontSize: 10, color: "#C077A0", fontWeight: 600, marginTop: 1 },
  prValue: { fontSize: 16, fontWeight: 900 },

  // SENDS
  sendCard: { background: "#fff", borderRadius: 16, padding: "12px 14px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", gap: 8 },
  sendRow: { display: "flex", alignItems: "center", gap: 8 },
  sendGrade: { fontSize: 11, fontWeight: 800, color: "#8B1A4A", width: 36, flexShrink: 0 },
  sendBarWrap: { flex: 1, height: 14, background: "#F4D0DC", borderRadius: 7, overflow: "hidden" },
  sendBar: { height: "100%", borderRadius: 7, transition: "width 0.5s ease" },
  sendCount: { fontSize: 12, fontWeight: 900, width: 20, textAlign: "right", flexShrink: 0 },

  // NAV
  bottomNav: { display: "flex", background: "#fff", borderTop: "1.5px solid #F9D0DF", padding: "8px 0 16px", boxShadow: "0 -4px 16px rgba(244,167,185,0.15)" },
  navTab: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, border: "none", background: "transparent", cursor: "pointer", padding: "4px 0" },
  navLabel: { fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  .pr-card { transition: transform 0.15s; }
  .pr-card:hover { transform: translateX(3px); }
  ::-webkit-scrollbar { display: none; }
`;
