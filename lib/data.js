// Helpers
export const dayN = ["DOM","LUN","MAR","MIÉ","JUE","VIE","SÁB"];
export const dayF = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
export const mos = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
export const dk = (d) => d.toISOString().split("T")[0];
export const td = (d) => dk(d) === dk(new Date());
export const ini = (n) => n ? n.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "??";
export const acol = (n) => {
  let h = 0;
  for (let i = 0; i < (n || "").length; i++) h = n.charCodeAt(i) + ((h << 5) - h);
  return ["#3B82F6","#EF4444","#10B981","#F59E0B","#8B5CF6","#EC4899","#F97316","#06B6D4"][Math.abs(h) % 8];
};

// Demo data
export const DTYPES = [
  { id: "crossfit", name: "CrossFit", icon: "🔥", color: "#EF4444", max_spots: 16, duration_min: 60 },
  { id: "halterofilia", name: "Halterofilia", icon: "🏋️", color: "#F59E0B", max_spots: 10, duration_min: 75 },
  { id: "powerlifting", name: "Powerlifting", icon: "💪", color: "#3B82F6", max_spots: 12, duration_min: 90 },
  { id: "openbox", name: "Open Box", icon: "🏗️", color: "#10B981", max_spots: 20, duration_min: 60 },
  { id: "movilidad", name: "Movilidad", icon: "🧘", color: "#8B5CF6", max_spots: 14, duration_min: 45 },
  { id: "strongman", name: "Strongman", icon: "⚡", color: "#F97316", max_spots: 8, duration_min: 60 },
];

export const DMEMBERS = [
  { id: "m1", full_name: "Carlos García", plan: "Unlimited", role: "member" },
  { id: "m2", full_name: "María López", plan: "Unlimited", role: "member" },
  { id: "m3", full_name: "Pablo Sánchez", plan: "3x/semana", role: "member" },
  { id: "m4", full_name: "Lucía Fernández", plan: "Unlimited", role: "member" },
  { id: "m5", full_name: "Javier Martín", plan: "5x/semana", role: "member" },
  { id: "m6", full_name: "Elena Ruiz", plan: "Unlimited", role: "member" },
  { id: "m7", full_name: "Daniel Torres", plan: "3x/semana", role: "member" },
  { id: "m8", full_name: "Sara Jiménez", plan: "Unlimited", role: "member" },
  { id: "m9", full_name: "Andrés Moreno", plan: "5x/semana", role: "member" },
  { id: "m10", full_name: "Clara Navarro", plan: "Unlimited", role: "member" },
  { id: "m11", full_name: "Raúl Díaz", plan: "3x/semana", role: "member" },
  { id: "m12", full_name: "Marta Gil", plan: "Unlimited", role: "member" },
];

const coaches = ["Carlos M.", "Ana R.", "David P.", "Laura G."];

export function demoSched(date) {
  const d = date.getDay();
  const b = [
    { t: "07:00", tp: "crossfit", c: coaches[0] },
    { t: "08:15", tp: "halterofilia", c: coaches[1] },
    { t: "09:30", tp: "powerlifting", c: coaches[2] },
    { t: "11:00", tp: "openbox", c: coaches[0] },
    { t: "13:00", tp: "crossfit", c: coaches[3] },
    { t: "16:00", tp: "movilidad", c: coaches[1] },
    { t: "17:00", tp: "halterofilia", c: coaches[2] },
    { t: "18:30", tp: "crossfit", c: coaches[0] },
    { t: "19:45", tp: "powerlifting", c: coaches[3] },
    { t: "21:00", tp: "strongman", c: coaches[2] },
  ];
  if (d === 0) return b.slice(3, 6);
  if (d === 6) return b.slice(0, 7);
  return b;
}

export const DEMO_USER = { id: "demo", full_name: "Demo Admin", role: "admin", plan: "Unlimited" };

export const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@300;400;500;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
  ::-webkit-scrollbar { display: none; }
  body { background: #0A0E1A; }
  @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .class-card { transition: all 0.2s ease; }
  .drag-over { box-shadow: 0 0 0 2px #3B82F6 !important; }
  .member-chip { cursor: default; transition: all 0.15s ease; user-select: none; }
  .member-chip[draggable="true"] { cursor: grab; }
  .member-chip[draggable="true"]:active { cursor: grabbing; opacity: 0.7; transform: scale(0.97); }
  .btn-hover:hover { filter: brightness(1.1); }
  .date-pill { transition: all 0.2s ease; }
  .date-pill:hover { background: rgba(37,99,235,0.1) !important; }
`;
