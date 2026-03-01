'use client';
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { dayN, dayF, mos, dk, td, ini, acol, DTYPES, DMEMBERS, demoSched, DEMO_USER, CSS } from "@/lib/data";
import AuthScreen from "@/components/AuthScreen";
import ClassCard from "@/components/ClassCard";

const Logo = ({ s = 28 }) => (
  <svg width={s} height={s} viewBox="0 0 100 100" fill="none">
    <polygon points="50,8 85,82 72,82 50,30 28,82 15,82" fill="#2563EB" />
    <rect x="20" y="86" width="60" height="5" rx="2.5" fill="#2563EB" />
  </svg>
);

export default function Home() {
  // Auth
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authView, setAuthView] = useState("login");
  const [authLoading, setAuthLoading] = useState(true);
  const [authErr, setAuthErr] = useState("");
  const [authForm, setAuthForm] = useState({ email: "", password: "", name: "" });
  const isDemo = !supabase;
  const isAdmin = isDemo ? true : profile?.role === "admin";

  // App
  const [selDate, setSelDate] = useState(new Date());
  const [expanded, setExpanded] = useState(null);
  const [toast, setToast] = useState(null);
  const [addModal, setAddModal] = useState(null);
  const [search, setSearch] = useState("");
  const [confirmM, setConfirmM] = useState(null);
  const [tab, setTab] = useState("horarios");
  const [usersModal, setUsersModal] = useState(false);

  // Data
  const [classes, setClasses] = useState([]);
  const [classTypes, setClassTypes] = useState(isDemo ? DTYPES : []);
  const [bookings, setBookings] = useState({});
  const [members, setMembers] = useState(isDemo ? DMEMBERS : []);
  const [loading, setLoading] = useState(false);
  const [demoBook, setDemoBook] = useState({});

  // Drag
  const [dragM, setDragM] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const curUser = isDemo ? "demo" : user?.id;
  const curProfile = isDemo ? DEMO_USER : profile;

  const show = useCallback((m, t = "success") => {
    setToast({ m, t });
    setTimeout(() => setToast(null), 2500);
  }, []);

  // ═══ AUTH ═══
  useEffect(() => {
    if (isDemo) {
      setAuthLoading(false);
      setUser({ id: "demo" });
      setProfile(DEMO_USER);
      return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) loadProf(session.user.id);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
      setUser(s?.user ?? null);
      if (s?.user) loadProf(s.user.id);
      else setProfile(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadProf(uid) {
    const { data } = await supabase.from("profiles").select("*").eq("id", uid).single();
    if (data) setProfile(data);
  }

  async function handleAuth(e) {
    e.preventDefault();
    setAuthErr("");
    setAuthLoading(true);
    try {
      if (authView === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: authForm.email, password: authForm.password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email: authForm.email, password: authForm.password, options: { data: { full_name: authForm.name } } });
        if (error) throw error;
        show("Cuenta creada ✓");
      }
    } catch (err) {
      setAuthErr(err.message);
    }
    setAuthLoading(false);
  }

  async function signOut() {
    if (!isDemo) await supabase.auth.signOut();
    setProfile(null);
    setUser(null);
  }

  // ═══ DATA ═══
  useEffect(() => {
    if (!user) return;
    if (isDemo) loadDemo();
    else { loadTypes(); loadMemb(); }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (isDemo) loadDemo();
    else loadDay();
  }, [selDate, user]);

  function loadDemo() {
    const sched = demoSched(selDate);
    const d = dk(selDate);
    const cls = sched.map((s) => {
      const ct = DTYPES.find(t => t.id === s.tp);
      return {
        id: `${d}-${s.tp}-${s.t}`, start_time: s.t, class_type_id: s.tp,
        class_name: ct.name, class_icon: ct.icon, class_color: ct.color,
        duration_min: ct.duration_min, max_spots: ct.max_spots,
        coach_name: s.c, coach_emoji: "💪",
      };
    });
    setClasses(cls);
    if (!demoBook[d]) {
      const init = {};
      cls.forEach(c => {
        const n = Math.floor(Math.random() * 5) + 1;
        const sh = [...DMEMBERS].sort(() => Math.random() - 0.5);
        init[c.id] = sh.slice(0, n).map(m => ({ userId: m.id, userName: m.full_name, isTemplate: Math.random() > 0.6 }));
      });
      setDemoBook(p => ({ ...p, [d]: init }));
    }
  }

  async function loadTypes() {
    const { data } = await supabase.from("class_types").select("*").eq("active", true).order("sort_order");
    if (data) setClassTypes(data);
  }

  async function loadMemb() {
    const { data } = await supabase.from("profiles").select("*").eq("active", true).order("full_name");
    if (data) setMembers(data);
  }

  async function loadDay() {
    setLoading(true);
    const d = dk(selDate);
    const { data: cd } = await supabase.from("daily_classes").select("*").eq("class_date", d);
    if (cd) {
      setClasses(cd);
      const ids = cd.map(c => c.id);
      if (ids.length > 0) {
        const { data: bd } = await supabase
          .from("bookings")
          .select("id, class_instance_id, user_id, is_template, profiles(full_name)")
          .in("class_instance_id", ids)
          .eq("status", "confirmed");
        const bm = {};
        ids.forEach(i => bm[i] = []);
        (bd || []).forEach(b => {
          if (!bm[b.class_instance_id]) bm[b.class_instance_id] = [];
          bm[b.class_instance_id].push({
            bookingId: b.id, userId: b.user_id,
            userName: b.profiles?.full_name || "Sin nombre",
            isTemplate: b.is_template,
          });
        });
        setBookings(bm);
      }
    }
    setLoading(false);
  }

  function getBk(cid) {
    return isDemo ? (demoBook[dk(selDate)]?.[cid] || []) : (bookings[cid] || []);
  }

  // ═══ ACTIONS ═══
  async function selfBook(cid) {
    const bk = getBk(cid);
    if (bk.some(b => b.userId === curUser)) { setConfirmM({ cid }); return; }
    if (isDemo) {
      const d = dk(selDate);
      setDemoBook(p => ({ ...p, [d]: { ...p[d], [cid]: [...(p[d]?.[cid] || []), { userId: "demo", userName: "Demo Admin", isTemplate: false }] } }));
      show("¡Reserva confirmada! 💪");
      return;
    }
    const { data } = await supabase.rpc("book_class", { instance_id: cid });
    if (data?.ok) { show("¡Reserva confirmada! 💪"); loadDay(); }
    else show(data?.error || "Error", "error");
  }

  async function selfCancel() {
    if (!confirmM) return;
    const { cid } = confirmM;
    if (isDemo) {
      const d = dk(selDate);
      setDemoBook(p => ({ ...p, [d]: { ...p[d], [cid]: (p[d]?.[cid] || []).filter(b => b.userId !== "demo") } }));
      show("Cancelada");
      setConfirmM(null);
      return;
    }
    const bk = (bookings[cid] || []).find(b => b.userId === user.id);
    if (!bk) return;
    const { data } = await supabase.rpc("cancel_booking", { booking_id: bk.bookingId });
    if (data?.ok) { show("Cancelada"); loadDay(); }
    else show(data?.error || "Error", "error");
    setConfirmM(null);
  }

  async function adminAdd(cid, m) {
    if (isDemo) {
      const d = dk(selDate), cur = demoBook[d]?.[cid] || [];
      if (cur.some(b => b.userId === m.id)) { show("Ya está", "error"); return; }
      setDemoBook(p => ({ ...p, [d]: { ...p[d], [cid]: [...cur, { userId: m.id, userName: m.full_name, isTemplate: false }] } }));
      show(`${m.full_name} añadido`);
      return;
    }
    const { data } = await supabase.rpc("admin_add_to_class", { instance_id: cid, member_id: m.id });
    if (data?.ok) { show(`${m.full_name} añadido`); loadDay(); }
    else show(data?.error || "Error", "error");
  }

  async function adminRemove(cid, uid, name) {
    if (isDemo) {
      const d = dk(selDate);
      setDemoBook(p => ({ ...p, [d]: { ...p[d], [cid]: (p[d]?.[cid] || []).filter(b => b.userId !== uid) } }));
      show(`${name} eliminado`, "info");
      return;
    }
    const { data } = await supabase.rpc("admin_remove_from_class", { instance_id: cid, member_id: uid });
    if (data?.ok) { show(`${name} eliminado`, "info"); loadDay(); }
    else show(data?.error || "Error", "error");
  }

  async function adminMove(from, to, uid, name) {
    if (from === to) return;
    if (isDemo) {
      const d = dk(selDate), tb = demoBook[d]?.[to] || [], cls = classes.find(c => c.id === to);
      if (tb.length >= cls.max_spots) { show("Llena", "error"); return; }
      if (tb.some(b => b.userId === uid)) { show("Ya está", "error"); return; }
      const mem = demoBook[d]?.[from]?.find(b => b.userId === uid);
      setDemoBook(p => ({ ...p, [d]: { ...p[d], [from]: (p[d]?.[from] || []).filter(b => b.userId !== uid), [to]: [...tb, mem || { userId: uid, userName: name, isTemplate: false }] } }));
      show(`${name} movido ✓`);
      return;
    }
    const { data } = await supabase.rpc("admin_move_member", { from_instance: from, to_instance: to, member_id: uid });
    if (data?.ok) { show(`${name} movido ✓`); loadDay(); }
    else show(data?.error || "Error", "error");
  }

  async function toggleRole(t) {
    if (isDemo) { show("Conecta Supabase para roles"); return; }
    const nr = t.role === "admin" ? "member" : "admin";
    const { data } = await supabase.rpc("set_user_role", { target_user: t.id, new_role: nr });
    if (data?.ok) { show(`${t.full_name} → ${nr}`); loadMemb(); }
    else show(data?.error || "Error", "error");
  }

  // Drag
  const onDS = (uid, name, from) => setDragM({ uid, name, from });
  const onDO = (e, cid) => { e.preventDefault(); setDragOver(cid); };
  const onDr = (e, to) => { e.preventDefault(); if (dragM) adminMove(dragM.from, to, dragM.uid, dragM.name); setDragM(null); setDragOver(null); };
  const onDE = () => { setDragM(null); setDragOver(null); };

  const dates = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i - 1); return d; });

  // ═══ RENDER ═══
  if (authLoading) return (
    <div style={{ ...S.root, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <Logo s={56} />
    </div>
  );

  if (!user && !isDemo) return (
    <AuthScreen authView={authView} setAuthView={setAuthView} authForm={authForm} setAuthForm={setAuthForm}
      authErr={authErr} setAuthErr={setAuthErr} authLoading={authLoading} handleAuth={handleAuth} />
  );

  return (
    <div style={S.root}>
      <style>{CSS}</style>

      {/* HEADER */}
      <header style={S.header}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Logo />
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 2 }}>LA NAVE</div>
              <div style={{ fontSize: 7, color: "#475569", fontWeight: 600, letterSpacing: 1.5 }}>STRENGTH CENTER</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {isAdmin && <div style={{ fontSize: 8, fontWeight: 700, color: "#F59E0B", background: "rgba(245,158,11,0.12)", padding: "2px 6px", borderRadius: 3 }}>ADMIN</div>}
            {isDemo && <div style={{ fontSize: 8, fontWeight: 700, color: "#8B5CF6", background: "rgba(139,92,246,0.12)", padding: "2px 6px", borderRadius: 3 }}>DEMO</div>}
            <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg,${acol(curProfile?.full_name)},#1E293B)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff" }}>
              {ini(curProfile?.full_name || "U")}
            </div>
          </div>
        </div>

        {tab === "horarios" && (
          <>
            <div style={{ marginTop: 12, fontSize: 16, fontWeight: 700, color: "#E2E8F0", fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1.5 }}>
              {dayF[selDate.getDay()]}, {selDate.getDate()} de {mos[selDate.getMonth()]}
            </div>
            <div style={{ display: "flex", gap: 3, overflowX: "auto", padding: "8px 0 2px" }}>
              {dates.map((d, i) => {
                const sel = dk(d) === dk(selDate);
                return (
                  <div key={i} onClick={() => setSelDate(d)} className="date-pill" style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
                    padding: "5px 9px", borderRadius: 10, minWidth: 40, cursor: "pointer",
                    background: sel ? "#2563EB" : "transparent",
                    border: td(d) && !sel ? "1px solid rgba(37,99,235,0.4)" : "1px solid transparent",
                  }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: sel ? "#fff" : "#64748B", letterSpacing: 0.5 }}>{dayN[d.getDay()]}</span>
                    <span style={{ fontSize: 17, fontWeight: 700, color: sel ? "#fff" : "#CBD5E1", fontFamily: "'Bebas Neue', sans-serif" }}>{d.getDate()}</span>
                    {td(d) && <div style={{ width: 4, height: 4, borderRadius: 2, background: sel ? "#fff" : "#2563EB" }} />}
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "#64748B" }}>
              <span>{classes.length} clases</span>
              <span>{classes.reduce((a, c) => a + getBk(c.id).length, 0)} reservas hoy</span>
            </div>
          </>
        )}
      </header>

      {/* CONTENT */}
      <main style={{ padding: "10px 12px 100px" }}>
        {/* HORARIOS TAB */}
        {tab === "horarios" && (
          loading ? <div style={{ textAlign: "center", padding: 40, color: "#475569" }}>Cargando...</div>
          : classes.length === 0 ? (
            <div style={{ textAlign: "center", padding: "50px 20px", color: "#475569" }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📅</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>No hay clases este día</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {classes.map((cls, idx) => (
                <ClassCard key={cls.id} cls={cls} members={getBk(cls.id)} isAdmin={isAdmin} curUser={curUser}
                  expanded={expanded === cls.id} onToggle={() => setExpanded(expanded === cls.id ? null : cls.id)}
                  onSelfBook={selfBook} onAddModal={(cid) => { setAddModal(cid); setSearch(""); }}
                  onAdminRemove={adminRemove}
                  onDragStart={onDS} onDragOver={onDO} onDrop={onDr} onDragEnd={onDE}
                  isDragOver={dragOver === cls.id} allMembers={members} idx={idx}
                />
              ))}
            </div>
          )
        )}

        {/* PERFIL TAB */}
        {tab === "perfil" && (
          <div style={{ padding: "16px 4px" }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ width: 70, height: 70, borderRadius: 20, margin: "0 auto 12px", background: `linear-gradient(135deg,${acol(curProfile?.full_name)},#1E293B)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: "#fff", fontFamily: "'Bebas Neue', sans-serif" }}>
                {ini(curProfile?.full_name || "U")}
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 2, margin: 0 }}>
                {(curProfile?.full_name || "Usuario").toUpperCase()}
              </h2>
              <p style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>{curProfile?.plan || "Sin plan"}</p>
              {isAdmin && <span style={{ fontSize: 9, fontWeight: 700, color: "#F59E0B", background: "rgba(245,158,11,0.12)", padding: "2px 8px", borderRadius: 4 }}>ADMIN</span>}
            </div>
            <div style={S.card}>
              <h4 style={S.cardTitle}>La Nave Strength Center</h4>
              <div style={{ fontSize: 12, color: "#94A3B8", lineHeight: 2 }}>
                📍 Calle Menor, 46 – Colmenar Viejo<br />🕐 L-V: 07:00 – 22:00 · S: 09:00 – 14:00<br />📞 +34 612 345 678
              </div>
            </div>
            {isAdmin && (
              <button onClick={() => setUsersModal(true)} style={{ ...S.btn, marginTop: 12 }}>
                👥 Gestionar usuarios y roles
              </button>
            )}
            <button onClick={signOut} style={{ width: "100%", padding: "12px", borderRadius: 10, border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.06)", color: "#F87171", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Outfit', sans-serif", marginTop: 12 }}>
              Cerrar sesión
            </button>
          </div>
        )}

        {/* ADMIN TAB */}
        {tab === "admin" && isAdmin && (
          <div style={{ padding: "12px 4px" }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 2, marginBottom: 16 }}>PANEL ADMIN</h2>
            <div style={S.card}>
              <h4 style={S.cardTitle}>Acciones</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                <button onClick={() => setUsersModal(true)} style={S.adminAct} className="btn-hover">👥 Gestionar roles</button>
                <button onClick={() => setTab("horarios")} style={S.adminAct} className="btn-hover">📅 Ir a clases del día</button>
                {!isDemo && (
                  <button onClick={async () => { await supabase.rpc("generate_class_instances", { days_ahead: 14 }); show("Clases regeneradas"); }} style={S.adminAct} className="btn-hover">
                    🔄 Regenerar horario (14 días)
                  </button>
                )}
              </div>
            </div>
            <div style={{ ...S.card, marginTop: 10 }}>
              <h4 style={S.cardTitle}>Miembros ({members.length})</h4>
              <div style={{ maxHeight: 300, overflowY: "auto", marginTop: 8 }}>
                {members.map(m => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: acol(m.full_name), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff" }}>{ini(m.full_name)}</div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#E2E8F0" }}>{m.full_name}</div>
                        <div style={{ fontSize: 9, color: "#64748B" }}>{m.plan} · {m.role}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3, background: m.role === "admin" ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.04)", color: m.role === "admin" ? "#F59E0B" : "#64748B" }}>
                      {m.role.toUpperCase()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ADD MEMBER MODAL */}
      {addModal && (
        <div style={S.overlay} onClick={() => setAddModal(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#E2E8F0" }}>Añadir a clase</h3>
              <button onClick={() => setAddModal(null)} style={{ background: "none", border: "none", color: "#64748B", fontSize: 16, cursor: "pointer" }}>✕</button>
            </div>
            <input autoFocus type="text" placeholder="Buscar miembro..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, marginBottom: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#E2E8F0", fontSize: 13, outline: "none", fontFamily: "'Outfit', sans-serif" }} />
            <div style={{ maxHeight: 280, overflowY: "auto" }}>
              {members.filter(m => !getBk(addModal).some(b => b.userId === m.id)).filter(m => m.full_name.toLowerCase().includes(search.toLowerCase())).map(m => (
                <div key={m.id} onClick={() => { adminAdd(addModal, m); setAddModal(null); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 6px", borderRadius: 8, cursor: "pointer" }} className="btn-hover">
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: acol(m.full_name), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff" }}>{ini(m.full_name)}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#E2E8F0" }}>{m.full_name}</div>
                    <div style={{ fontSize: 9, color: "#64748B" }}>{m.plan}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MANAGE USERS MODAL */}
      {usersModal && (
        <div style={S.overlay} onClick={() => setUsersModal(false)}>
          <div style={{ ...S.modal, maxHeight: "80vh" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#E2E8F0" }}>Gestionar roles</h3>
              <button onClick={() => setUsersModal(false)} style={{ background: "none", border: "none", color: "#64748B", fontSize: 16, cursor: "pointer" }}>✕</button>
            </div>
            <p style={{ fontSize: 11, color: "#64748B", marginBottom: 12 }}>Toca un usuario para cambiar su rol entre admin y member.</p>
            <div style={{ maxHeight: 400, overflowY: "auto" }}>
              {members.map(m => (
                <div key={m.id} onClick={() => toggleRole(m)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 6px", borderRadius: 8, cursor: "pointer" }} className="btn-hover">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: acol(m.full_name), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff" }}>{ini(m.full_name)}</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#E2E8F0" }}>{m.full_name}</div>
                      <div style={{ fontSize: 9, color: "#64748B" }}>{m.plan}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 5, background: m.role === "admin" ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.05)", color: m.role === "admin" ? "#F59E0B" : "#94A3B8", border: `1px solid ${m.role === "admin" ? "rgba(245,158,11,0.25)" : "rgba(255,255,255,0.08)"}` }}>
                    {m.role === "admin" ? "👑 Admin" : "👤 Member"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CANCEL CONFIRM */}
      {confirmM && (
        <div style={S.overlay} onClick={() => setConfirmM(null)}>
          <div style={{ ...S.modal, maxWidth: 300, textAlign: "center" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>⚠️</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#E2E8F0", marginBottom: 6 }}>¿Cancelar reserva?</h3>
            <p style={{ fontSize: 12, color: "#64748B", marginBottom: 16 }}>Debes cancelar al menos 2h antes.</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirmM(null)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#94A3B8", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Volver</button>
              <button onClick={selfCancel} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "rgba(239,68,68,0.15)", color: "#F87171", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)",
          padding: "9px 18px", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600,
          zIndex: 300, boxShadow: "0 6px 20px rgba(0,0,0,0.4)", animation: "slideUp 0.25s ease",
          background: toast.t === "error" ? "rgba(239,68,68,0.95)" : toast.t === "info" ? "rgba(59,130,246,0.95)" : "rgba(16,185,129,0.95)",
        }}>
          {toast.t === "error" ? "✕ " : toast.t === "info" ? "ℹ " : "✓ "}{toast.m}
        </div>
      )}

      {/* BOTTOM NAV */}
      <nav style={S.nav}>
        {[
          { id: "horarios", icon: "🗓️", label: "HORARIOS" },
          ...(isAdmin ? [{ id: "admin", icon: "⚙️", label: "ADMIN" }] : []),
          { id: "perfil", icon: "👤", label: "PERFIL" },
        ].map(n => (
          <div key={n.id} onClick={() => setTab(n.id)} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            cursor: "pointer", padding: "4px 14px",
            color: tab === n.id ? "#3B82F6" : "#475569", transition: "color 0.2s",
          }}>
            <span style={{ fontSize: 18, transform: tab === n.id ? "scale(1.1)" : "scale(1)", transition: "transform 0.2s" }}>{n.icon}</span>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.8, fontFamily: "'Bebas Neue', sans-serif" }}>{n.label}</span>
            {tab === n.id && <div style={{ width: 4, height: 4, borderRadius: 2, background: "#3B82F6" }} />}
          </div>
        ))}
      </nav>
    </div>
  );
}

const S = {
  root: { fontFamily: "'Outfit', sans-serif", background: "#0A0E1A", minHeight: "100vh", maxWidth: 480, margin: "0 auto", color: "#E2E8F0", position: "relative" },
  header: { position: "sticky", top: 0, zIndex: 50, background: "linear-gradient(180deg,#0D1225,#0A0E1Af0)", backdropFilter: "blur(16px)", padding: "12px 14px 10px", borderBottom: "1px solid rgba(37,99,235,0.1)" },
  card: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 16 },
  cardTitle: { fontSize: 10, fontWeight: 700, color: "#64748B", letterSpacing: 1.2, textTransform: "uppercase", margin: 0 },
  btn: { width: "100%", padding: "12px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#2563EB,#1D4ED8)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Outfit', sans-serif", boxShadow: "0 4px 12px rgba(37,99,235,0.3)" },
  adminAct: { width: "100%", padding: "11px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)", color: "#CBD5E1", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit', sans-serif", textAlign: "left" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200, padding: 16, animation: "fadeIn 0.15s ease" },
  modal: { background: "#141829", borderRadius: 18, padding: 18, width: "100%", maxWidth: 380, border: "1px solid rgba(255,255,255,0.08)", animation: "slideUp 0.25s ease", marginBottom: 16 },
  nav: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, display: "flex", justifyContent: "space-around", padding: "8px 0 26px", background: "linear-gradient(180deg,rgba(10,14,26,0.9),#0A0E1A)", backdropFilter: "blur(16px)", borderTop: "1px solid rgba(37,99,235,0.08)", zIndex: 100 },
};
