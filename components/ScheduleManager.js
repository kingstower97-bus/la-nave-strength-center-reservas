'use client';
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { dayN, ini, acol } from "@/lib/data";

const DOW = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default function ScheduleManager({ classTypes, members, show, onClose }) {
  // view: base | day | addBase | addDay | templates
  const [view, setView] = useState("base");
  const [schedule, setSchedule] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDow, setSelectedDow] = useState(1);

  // Add form
  const [form, setForm] = useState({ class_type_id: "", coach_id: "", start_time: "09:00", day_of_week: 1, max_spots: "" });

  // Day view
  const [dayDate, setDayDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [dayClasses, setDayClasses] = useState([]);

  // Templates
  const [templateClass, setTemplateClass] = useState(null); // schedule item being edited
  const [templates, setTemplates] = useState([]); // current templates for selected class
  const [tplSearch, setTplSearch] = useState("");

  useEffect(() => { loadSchedule(); loadCoaches(); }, []);
  useEffect(() => { if (view === "day") loadDayClasses(); }, [dayDate, view]);
  useEffect(() => { if (templateClass) loadTemplates(templateClass.id); }, [templateClass]);

  async function loadSchedule() {
    setLoading(true);
    const { data } = await supabase
      .from("schedule")
      .select("*, class_types(name, icon, color), coaches(name, emoji)")
      .eq("active", true)
      .order("day_of_week")
      .order("start_time");
    if (data) setSchedule(data);
    setLoading(false);
  }

  async function loadCoaches() {
    const { data } = await supabase.from("coaches").select("*").eq("active", true).order("name");
    if (data) setCoaches(data);
  }

  async function loadDayClasses() {
    const { data } = await supabase
      .from("class_instances")
      .select("*, class_types(name, icon, color), coaches(name, emoji)")
      .eq("class_date", dayDate)
      .order("start_time");
    if (data) setDayClasses(data);
  }

  // ── Templates ──────────────────────────────────────────────
  async function loadTemplates(scheduleId) {
    const { data } = await supabase
      .from("class_templates")
      .select("*, profiles(full_name, plan)")
      .eq("schedule_id", scheduleId);
    if (data) setTemplates(data);
  }

  async function addTemplate(memberId) {
    if (!templateClass) return;
    const { error } = await supabase.from("class_templates").insert({
      schedule_id: templateClass.id,
      user_id: memberId,
    });
    if (error) {
      if (error.code === "23505") show("Ya es fijo en esta clase", "error");
      else show(error.message, "error");
      return;
    }
    const member = members.find(m => m.id === memberId);
    show(`${member?.full_name} añadido como fijo ✓`);
    loadTemplates(templateClass.id);
  }

  async function removeTemplate(templateId, memberName) {
    await supabase.from("class_templates").delete().eq("id", templateId);
    show(`${memberName} ya no es fijo`, "info");
    loadTemplates(templateClass.id);
  }

  // ── Base schedule CRUD ─────────────────────────────────────
  async function addBaseClass() {
    if (!form.class_type_id || !form.start_time) { show("Rellena tipo y hora", "error"); return; }
    const { error } = await supabase.from("schedule").insert({
      class_type_id: form.class_type_id,
      coach_id: form.coach_id || null,
      day_of_week: form.day_of_week,
      start_time: form.start_time,
      max_spots_override: form.max_spots ? parseInt(form.max_spots) : null,
    });
    if (error) {
      if (error.code === "23505") show("Ya existe esa clase a esa hora", "error");
      else show(error.message, "error");
      return;
    }
    show("Clase añadida al horario ✓");
    setForm({ class_type_id: "", coach_id: "", start_time: "09:00", day_of_week: form.day_of_week, max_spots: "" });
    loadSchedule();
    setView("base");
  }

  async function removeBaseClass(id) {
    await supabase.from("schedule").update({ active: false }).eq("id", id);
    show("Clase eliminada del horario", "info");
    loadSchedule();
  }

  // ── Day CRUD ───────────────────────────────────────────────
  async function addDayClass() {
    if (!form.class_type_id || !form.start_time) { show("Rellena tipo y hora", "error"); return; }
    const ct = classTypes.find(t => t.id === form.class_type_id);
    const { error } = await supabase.from("class_instances").insert({
      schedule_id: null,
      class_date: dayDate,
      class_type_id: form.class_type_id,
      coach_id: form.coach_id || null,
      start_time: form.start_time,
      max_spots: form.max_spots ? parseInt(form.max_spots) : (ct?.max_spots || 16),
    });
    if (error) { show(error.message, "error"); return; }
    show("Clase añadida ✓");
    setForm({ class_type_id: "", coach_id: "", start_time: "09:00", day_of_week: form.day_of_week, max_spots: "" });
    loadDayClasses();
    setView("day");
  }

  async function cancelDayClass(id) {
    await supabase.from("class_instances").update({ cancelled: true }).eq("id", id);
    show("Clase cancelada", "info");
    loadDayClasses();
  }

  async function restoreDayClass(id) {
    await supabase.from("class_instances").update({ cancelled: false }).eq("id", id);
    show("Clase restaurada ✓");
    loadDayClasses();
  }

  async function regenerate() {
    await supabase.rpc("generate_class_instances", { days_ahead: 14 });
    show("Horario regenerado para 14 días ✓");
    loadDayClasses();
  }

  // Grouped
  const grouped = {};
  for (let i = 0; i < 7; i++) grouped[i] = [];
  schedule.forEach(s => { if (grouped[s.day_of_week]) grouped[s.day_of_week].push(s); });

  // Template members not yet assigned
  const availableForTemplate = members.filter(m =>
    !templates.some(t => t.user_id === m.id) &&
    m.full_name.toLowerCase().includes(tplSearch.toLowerCase())
  );

  // ══════════════════════════════════════════════════════════
  return (
    <div style={ST.overlay} onClick={onClose}>
      <div style={ST.panel} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 2, margin: 0 }}>
            {view === "base" && "📅 HORARIO SEMANAL"}
            {view === "day" && "📋 CLASES POR DÍA"}
            {view === "addBase" && "➕ NUEVA CLASE SEMANAL"}
            {view === "addDay" && "➕ CLASE PUNTUAL"}
            {view === "templates" && "📋 MIEMBROS FIJOS"}
          </h2>
          <button onClick={view === "templates" ? () => { setView("base"); setTemplateClass(null); } : onClose}
            style={{ background: "none", border: "none", color: "#64748B", fontSize: 18, cursor: "pointer" }}>
            {view === "templates" ? "←" : "✕"}
          </button>
        </div>

        {/* Tabs */}
        {(view === "base" || view === "day") && (
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {["base", "day"].map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                ...ST.tab,
                background: view === v ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.04)",
                color: view === v ? "#60A5FA" : "#94A3B8",
                borderColor: view === v ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.06)",
              }}>
                {v === "base" ? "🗓️ Horario base" : "📋 Por día"}
              </button>
            ))}
          </div>
        )}

        {/* ═══ BASE VIEW ═══ */}
        {view === "base" && (
          <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
            <div style={{ display: "flex", gap: 4, marginBottom: 12, overflowX: "auto" }}>
              {[1, 2, 3, 4, 5, 6, 0].map(d => (
                <button key={d} onClick={() => setSelectedDow(d)} style={{
                  ...ST.dowPill,
                  background: selectedDow === d ? "#2563EB" : "rgba(255,255,255,0.04)",
                  color: selectedDow === d ? "#fff" : "#94A3B8",
                }}>{dayN[d]}</button>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(grouped[selectedDow] || []).length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px 0", color: "#475569", fontSize: 12 }}>
                  No hay clases para {DOW[selectedDow]}
                </div>
              ) : (
                (grouped[selectedDow] || []).map(s => (
                  <div key={s.id} style={ST.schedRow}>
                    <div
                      onClick={() => { setTemplateClass(s); setView("templates"); setTplSearch(""); }}
                      style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, cursor: "pointer" }}
                    >
                      <span style={{ fontSize: 15, fontWeight: 700, color: "#E2E8F0", fontFamily: "'Bebas Neue', sans-serif", width: 45 }}>
                        {s.start_time?.slice(0, 5)}
                      </span>
                      <span style={{ fontSize: 13 }}>{s.class_types?.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#E2E8F0" }}>{s.class_types?.name}</div>
                        <div style={{ fontSize: 9, color: "#64748B" }}>
                          {s.coaches?.emoji} {s.coaches?.name || "Sin coach"}
                          {s.max_spots_override && ` · ${s.max_spots_override} plazas`}
                        </div>
                      </div>
                      <span style={{ fontSize: 9, color: "#8B5CF6", fontWeight: 600 }}>📋 Fijos →</span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); removeBaseClass(s.id); }} style={{ ...ST.delBtn, marginLeft: 6 }} title="Eliminar">✕</button>
                  </div>
                ))
              )}
            </div>

            <button onClick={() => { setForm(f => ({ ...f, day_of_week: selectedDow })); setView("addBase"); }}
              style={{ ...ST.addBtn, marginTop: 10 }} className="btn-hover">
              + Añadir clase a {DOW[selectedDow]}
            </button>
            <button onClick={regenerate} style={{ ...ST.regenBtn, marginTop: 8 }} className="btn-hover">
              🔄 Regenerar próximos 14 días
            </button>
          </div>
        )}

        {/* ═══ TEMPLATES VIEW ═══ */}
        {view === "templates" && templateClass && (
          <div style={{ maxHeight: "65vh", overflowY: "auto" }}>
            {/* Class info */}
            <div style={{ ...ST.schedRow, marginBottom: 12, background: "rgba(139,92,246,0.06)", borderColor: "rgba(139,92,246,0.15)" }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#E2E8F0", fontFamily: "'Bebas Neue', sans-serif", width: 45 }}>
                {templateClass.start_time?.slice(0, 5)}
              </span>
              <span style={{ fontSize: 13 }}>{templateClass.class_types?.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#E2E8F0" }}>{templateClass.class_types?.name}</div>
                <div style={{ fontSize: 9, color: "#64748B" }}>
                  {DOW[templateClass.day_of_week]} · {templateClass.coaches?.name || "Sin coach"}
                </div>
              </div>
            </div>

            {/* Current fixed members */}
            <div style={{ fontSize: 10, fontWeight: 700, color: "#8B5CF6", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6 }}>
              Miembros fijos ({templates.length})
            </div>

            {templates.length === 0 ? (
              <div style={{ textAlign: "center", padding: "12px 0", color: "#475569", fontSize: 11 }}>
                Sin miembros fijos. Añade abajo.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 12 }}>
                {templates.map(t => (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 7,
                        background: acol(t.profiles?.full_name),
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 9, fontWeight: 700, color: "#fff",
                      }}>{ini(t.profiles?.full_name)}</div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#E2E8F0" }}>{t.profiles?.full_name}</div>
                        <div style={{ fontSize: 9, color: "#64748B" }}>{t.profiles?.plan} · 📋 Fijo</div>
                      </div>
                    </div>
                    <button onClick={() => removeTemplate(t.id, t.profiles?.full_name)} style={ST.delBtn}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Add member search */}
            <div style={{ fontSize: 10, fontWeight: 700, color: "#64748B", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 }}>
              Añadir miembro fijo
            </div>
            <input
              type="text" placeholder="Buscar miembro..." autoFocus
              value={tplSearch} onChange={e => setTplSearch(e.target.value)}
              style={{ ...ST.input, marginBottom: 6 }}
            />
            <div style={{ maxHeight: 200, overflowY: "auto" }}>
              {availableForTemplate.length === 0 ? (
                <div style={{ textAlign: "center", padding: "10px 0", color: "#475569", fontSize: 11 }}>
                  {tplSearch ? "Sin resultados" : "Todos los miembros ya son fijos"}
                </div>
              ) : (
                availableForTemplate.map(m => (
                  <div key={m.id} onClick={() => addTemplate(m.id)}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 6px", borderRadius: 8, cursor: "pointer" }}
                    className="btn-hover"
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: 7,
                      background: acol(m.full_name),
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, fontWeight: 700, color: "#fff",
                    }}>{ini(m.full_name)}</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#E2E8F0" }}>{m.full_name}</div>
                      <div style={{ fontSize: 9, color: "#64748B" }}>{m.plan}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ═══ DAY VIEW ═══ */}
        {view === "day" && (
          <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
            <input type="date" value={dayDate} onChange={e => setDayDate(e.target.value)}
              style={{ ...ST.input, marginBottom: 12, colorScheme: "dark" }} />

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {dayClasses.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px 0", color: "#475569", fontSize: 12 }}>
                  No hay clases. Regenera el horario o añade una puntual.
                </div>
              ) : (
                dayClasses.map(c => (
                  <div key={c.id} style={{ ...ST.schedRow, opacity: c.cancelled ? 0.4 : 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "#E2E8F0", fontFamily: "'Bebas Neue', sans-serif", width: 45 }}>
                        {c.start_time?.slice(0, 5)}
                      </span>
                      <span style={{ fontSize: 13 }}>{c.class_types?.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: c.cancelled ? "#64748B" : "#E2E8F0", textDecoration: c.cancelled ? "line-through" : "none" }}>
                          {c.class_types?.name}
                        </div>
                        <div style={{ fontSize: 9, color: "#64748B" }}>
                          {c.coaches?.emoji} {c.coaches?.name || "Sin coach"} · {c.max_spots} plazas
                        </div>
                      </div>
                    </div>
                    {c.cancelled ? (
                      <button onClick={() => restoreDayClass(c.id)} style={{ ...ST.delBtn, background: "rgba(16,185,129,0.08)", borderColor: "rgba(16,185,129,0.15)", color: "#34D399" }}>↩</button>
                    ) : (
                      <button onClick={() => cancelDayClass(c.id)} style={ST.delBtn}>✕</button>
                    )}
                  </div>
                ))
              )}
            </div>

            <button onClick={() => setView("addDay")} style={{ ...ST.addBtn, marginTop: 10 }} className="btn-hover">
              + Añadir clase puntual
            </button>
          </div>
        )}

        {/* ═══ ADD FORM ═══ */}
        {(view === "addBase" || view === "addDay") && (
          <div>
            <label style={ST.label}>Tipo de clase</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {classTypes.map(ct => (
                <button key={ct.id} onClick={() => setForm(f => ({ ...f, class_type_id: ct.id }))}
                  style={{
                    ...ST.typePill,
                    background: form.class_type_id === ct.id ? `${ct.color}25` : "rgba(255,255,255,0.04)",
                    borderColor: form.class_type_id === ct.id ? `${ct.color}50` : "rgba(255,255,255,0.06)",
                    color: form.class_type_id === ct.id ? ct.color : "#94A3B8",
                  }}>
                  {ct.icon} {ct.name}
                </button>
              ))}
            </div>

            <label style={ST.label}>Coach</label>
            <select value={form.coach_id} onChange={e => setForm(f => ({ ...f, coach_id: e.target.value }))}
              style={{ ...ST.input, marginBottom: 12 }}>
              <option value="">Sin coach</option>
              {coaches.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
            </select>

            <label style={ST.label}>Hora de inicio</label>
            <input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
              style={{ ...ST.input, marginBottom: 12, colorScheme: "dark" }} />

            {view === "addBase" && (
              <>
                <label style={ST.label}>Día de la semana</label>
                <select value={form.day_of_week} onChange={e => setForm(f => ({ ...f, day_of_week: parseInt(e.target.value) }))}
                  style={{ ...ST.input, marginBottom: 12 }}>
                  {[1, 2, 3, 4, 5, 6, 0].map(d => <option key={d} value={d}>{DOW[d]}</option>)}
                </select>
              </>
            )}

            <label style={ST.label}>Plazas (vacío = por defecto)</label>
            <input type="number" placeholder="ej: 16" value={form.max_spots} onChange={e => setForm(f => ({ ...f, max_spots: e.target.value }))}
              style={{ ...ST.input, marginBottom: 16 }} />

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setView(view === "addBase" ? "base" : "day")}
                style={{ flex: 1, padding: "11px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#94A3B8", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={view === "addBase" ? addBaseClass : addDayClass}
                style={{ flex: 1, padding: "11px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#2563EB,#1D4ED8)", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", boxShadow: "0 4px 12px rgba(37,99,235,0.3)" }}>
                Guardar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const ST = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200, padding: 12, animation: "fadeIn 0.15s ease" },
  panel: { background: "#0F1424", borderRadius: 20, padding: 18, width: "100%", maxWidth: 420, border: "1px solid rgba(255,255,255,0.08)", animation: "slideUp 0.25s ease", marginBottom: 12, maxHeight: "85vh", overflowY: "auto" },
  tab: { flex: 1, padding: "8px", borderRadius: 8, border: "1px solid", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit', sans-serif", textAlign: "center" },
  dowPill: { padding: "6px 10px", borderRadius: 8, fontSize: 10, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1, minWidth: 38, textAlign: "center" },
  schedRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.04)" },
  delBtn: { width: 26, height: 26, borderRadius: 7, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "#F87171", cursor: "pointer", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  addBtn: { width: "100%", padding: "10px", borderRadius: 10, border: "1px dashed rgba(59,130,246,0.3)", background: "rgba(59,130,246,0.05)", color: "#60A5FA", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "'Outfit', sans-serif", textAlign: "center" },
  regenBtn: { width: "100%", padding: "10px", borderRadius: 10, border: "1px solid rgba(245,158,11,0.2)", background: "rgba(245,158,11,0.05)", color: "#FBBF24", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "'Outfit', sans-serif", textAlign: "center" },
  input: { width: "100%", padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#E2E8F0", fontSize: 13, outline: "none", fontFamily: "'Outfit', sans-serif" },
  label: { display: "block", fontSize: 10, fontWeight: 700, color: "#64748B", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 },
  typePill: { padding: "6px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, border: "1px solid", cursor: "pointer", fontFamily: "'Outfit', sans-serif" },
};
