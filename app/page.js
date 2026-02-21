'use client';

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Data & Config ────────────────────────────────────────────────
const CLASSES = [
  { id: "crossfit", name: "CrossFit", icon: "🔥", color: "#2563EB", description: "WOD de alta intensidad", maxSpots: 16 },
  { id: "halterofilia", name: "Técnica Halterofilia", icon: "🏋️", color: "#1E40AF", description: "Snatch, Clean & Jerk", maxSpots: 10 },
  { id: "powerlifting", name: "Powerlifting", icon: "💪", color: "#1D4ED8", description: "Squat, Bench, Deadlift", maxSpots: 12 },
  { id: "openbox", name: "Open Box", icon: "🏗️", color: "#3B82F6", description: "Entreno libre con supervisión", maxSpots: 20 },
  { id: "mobility", name: "Movilidad & Recovery", icon: "🧘", color: "#60A5FA", description: "Estiramientos y recuperación", maxSpots: 14 },
  { id: "strongman", name: "Strongman", icon: "⚡", color: "#1E3A8A", description: "Yoke, Atlas Stones, Log Press", maxSpots: 8 },
];

const generateSchedule = (date) => {
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0) {
    return [
      { time: "09:00", classType: "openbox", coach: "Carlos M.", duration: 60 },
      { time: "10:30", classType: "crossfit", coach: "Ana R.", duration: 60 },
      { time: "12:00", classType: "mobility", coach: "Laura G.", duration: 45 },
    ];
  }
  const weekday = [
    { time: "07:00", classType: "crossfit", coach: "Carlos M.", duration: 60 },
    { time: "08:15", classType: "halterofilia", coach: "Ana R.", duration: 75 },
    { time: "09:30", classType: "powerlifting", coach: "David P.", duration: 90 },
    { time: "11:00", classType: "openbox", coach: "Carlos M.", duration: 60 },
    { time: "13:00", classType: "crossfit", coach: "Laura G.", duration: 60 },
    { time: "16:00", classType: "mobility", coach: "Ana R.", duration: 45 },
    { time: "17:00", classType: "halterofilia", coach: "David P.", duration: 75 },
    { time: "18:30", classType: "crossfit", coach: "Carlos M.", duration: 60 },
    { time: "19:45", classType: "powerlifting", coach: "Laura G.", duration: 90 },
    { time: "21:00", classType: "strongman", coach: "David P.", duration: 60 },
  ];
  if (dayOfWeek === 6) return weekday.slice(0, 7);
  return weekday;
};

const formatDate = (d) => {
  const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
};

const shortDay = (d) => ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"][d.getDay()];

const seedBookings = () => {
  const bookings = {};
  const today = new Date();
  for (let d = 0; d < 7; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() + d);
    const key = date.toDateString();
    const schedule = generateSchedule(date);
    bookings[key] = {};
    schedule.forEach((s) => {
      const cls = CLASSES.find((c) => c.id === s.classType);
      const taken = Math.floor(Math.random() * (cls.maxSpots - 2)) + 1;
      bookings[key][s.time] = taken;
    });
  }
  return bookings;
};

// ─── SVG Logo ─────────────────────────────────────────────────────
const NaveLogo = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <polygon points="50,8 85,85 72,85 50,35 28,85 15,85" fill="#2563EB" />
    <rect x="20" y="78" width="60" height="4" rx="2" fill="#2563EB" />
    <text x="50" y="98" textAnchor="middle" fill="#2563EB" fontSize="10" fontWeight="800" fontFamily="'Bebas Neue', sans-serif" letterSpacing="2">LA NAVE</text>
  </svg>
);

// ─── Main App ─────────────────────────────────────────────────────
export default function Home() {
  const [currentView, setCurrentView] = useState("home");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookingsData, setBookingsData] = useState(() => seedBookings());
  const [myBookings, setMyBookings] = useState([]);
  const [filterClass, setFilterClass] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [cancelModal, setCancelModal] = useState(null);
  const [userName] = useState("Aitor");
  const [animateIn, setAnimateIn] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setAnimateIn(false);
    const t = setTimeout(() => setAnimateIn(true), 50);
    return () => clearTimeout(t);
  }, [currentView, selectedDate]);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  const schedule = generateSchedule(selectedDate);
  const filteredSchedule = filterClass ? schedule.filter((s) => s.classType === filterClass) : schedule;

  const getSpotsTaken = (date, time) => {
    const key = typeof date === 'string' ? date : date.toDateString();
    return bookingsData[key]?.[time] || 0;
  };

  const isBooked = (date, time) => {
    const key = typeof date === 'string' ? date : date.toDateString();
    return myBookings.some((b) => b.date === key && b.time === time);
  };

  const canCancel = (date, time) => {
    const classDate = new Date(date);
    const [h, m] = time.split(":").map(Number);
    classDate.setHours(h, m, 0, 0);
    const now = new Date();
    return classDate.getTime() - now.getTime() > 2 * 60 * 60 * 1000;
  };

  const isPast = (date, time) => {
    const d = new Date(date);
    const [h, m] = time.split(":").map(Number);
    d.setHours(h, m, 0, 0);
    return d < new Date();
  };

  const handleBook = (date, time, classType) => {
    const cls = CLASSES.find((c) => c.id === classType);
    const taken = getSpotsTaken(date, time);
    if (taken >= cls.maxSpots) return showToast("Clase completa", "error");
    if (isBooked(date, time)) return showToast("Ya estás apuntado", "error");
    setConfirmModal({ date, time, classType, cls, taken });
  };

  const confirmBook = () => {
    const { date, time, classType } = confirmModal;
    const key = date.toDateString();
    setBookingsData((prev) => ({
      ...prev,
      [key]: { ...prev[key], [time]: (prev[key]?.[time] || 0) + 1 },
    }));
    setMyBookings((prev) => [...prev, { date: date.toDateString(), time, classType }]);
    showToast("¡Reserva confirmada! 💪");
    setConfirmModal(null);
  };

  const handleCancel = (date, time) => {
    if (!canCancel(date, time)) return showToast("No puedes cancelar con menos de 2h de antelación", "error");
    setCancelModal({ date, time });
  };

  const confirmCancel = () => {
    const { date, time } = cancelModal;
    setBookingsData((prev) => ({
      ...prev,
      [date]: { ...prev[date], [time]: Math.max(0, (prev[date]?.[time] || 1) - 1) },
    }));
    setMyBookings((prev) => prev.filter((b) => !(b.date === date && b.time === time)));
    showToast("Reserva cancelada");
    setCancelModal(null);
  };

  if (!mounted) {
    return (
      <div style={{ background: "#0A0E1A", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <NaveLogo size={60} />
      </div>
    );
  }

  // ─── Render helpers ───────────────────────────────────────────
  const renderHome = () => (
    <div style={{ paddingBottom: 90 }}>
      {/* Hero */}
      <div style={{
        padding: "24px 20px 16px",
        background: "linear-gradient(135deg, rgba(37,99,235,0.12) 0%, rgba(30,58,138,0.08) 100%)",
        borderBottom: "1px solid rgba(37,99,235,0.1)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 14, color: "#64748B", margin: 0, fontWeight: 500 }}>Bienvenido de vuelta</p>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: "4px 0 0", fontFamily: "'Bebas Neue', 'Outfit', sans-serif", letterSpacing: 1.5 }}>
              {userName.toUpperCase()}
            </h1>
          </div>
          <div style={{
            width: 50, height: 50, borderRadius: 15, background: "linear-gradient(135deg, #2563EB, #1E3A8A)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800,
            fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1, boxShadow: "0 4px 15px rgba(37,99,235,0.3)"
          }}>
            {userName[0]}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          {[
            { label: "Reservas activas", value: myBookings.length, icon: "📋" },
            { label: "Esta semana", value: myBookings.length, icon: "🔥" },
            { label: "Total mes", value: myBookings.length + 12, icon: "📊" },
          ].map((s, i) => (
            <div key={i} style={{
              flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: "14px 12px",
              border: "1px solid rgba(255,255,255,0.06)", textAlign: "center"
            }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "#64748B", fontWeight: 500, letterSpacing: 0.3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Date selector */}
      <div style={{ display: "flex", gap: 8, padding: "16px 20px", overflowX: "auto", scrollbarWidth: "none" }}>
        {dates.map((d, i) => {
          const active = d.toDateString() === selectedDate.toDateString();
          const isToday = d.toDateString() === new Date().toDateString();
          return (
            <div key={i} onClick={() => setSelectedDate(d)} style={{
              minWidth: 56, padding: "10px 6px", borderRadius: 14, textAlign: "center", cursor: "pointer",
              transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
              background: active ? "linear-gradient(135deg, #2563EB, #1D4ED8)" : "rgba(255,255,255,0.04)",
              border: active ? "1px solid #3B82F6" : "1px solid rgba(255,255,255,0.06)",
              transform: active ? "scale(1.05)" : "scale(1)",
              boxShadow: active ? "0 4px 20px rgba(37,99,235,0.4)" : "none",
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: active ? "#93C5FD" : "#64748B", letterSpacing: 1 }}>
                {shortDay(d)}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, margin: "4px 0 2px", fontFamily: "'Bebas Neue', sans-serif" }}>
                {d.getDate()}
              </div>
              {isToday && <div style={{ width: 5, height: 5, borderRadius: "50%", margin: "0 auto", background: active ? "#fff" : "#2563EB" }} />}
            </div>
          );
        })}
      </div>

      {/* Date label */}
      <div style={{ padding: "4px 20px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#CBD5E1" }}>{formatDate(selectedDate)}</h2>
        <span style={{ fontSize: 12, color: "#64748B", fontWeight: 500 }}>{filteredSchedule.length} clases</span>
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 8, padding: "4px 20px 16px", overflowX: "auto", scrollbarWidth: "none" }}>
        <span onClick={() => setFilterClass(null)} style={{
          padding: "8px 16px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
          transition: "all 0.25s ease", whiteSpace: "nowrap",
          background: !filterClass ? "#2563EB" : "rgba(255,255,255,0.05)",
          color: !filterClass ? "#fff" : "#94A3B8",
          border: !filterClass ? "1px solid #3B82F6" : "1px solid rgba(255,255,255,0.08)",
        }}>Todas</span>
        {CLASSES.map((c) => (
          <span key={c.id} onClick={() => setFilterClass(filterClass === c.id ? null : c.id)} style={{
            padding: "8px 16px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
            transition: "all 0.25s ease", whiteSpace: "nowrap",
            background: filterClass === c.id ? "#2563EB" : "rgba(255,255,255,0.05)",
            color: filterClass === c.id ? "#fff" : "#94A3B8",
            border: filterClass === c.id ? "1px solid #3B82F6" : "1px solid rgba(255,255,255,0.08)",
          }}>{c.icon} {c.name}</span>
        ))}
      </div>

      {/* Class cards */}
      {filteredSchedule.map((slot, idx) => {
        const cls = CLASSES.find((c) => c.id === slot.classType);
        const taken = getSpotsTaken(selectedDate, slot.time);
        const available = cls.maxSpots - taken;
        const pct = (taken / cls.maxSpots) * 100;
        const booked = isBooked(selectedDate, slot.time);
        const past = isPast(selectedDate, slot.time);
        const full = available <= 0;

        return (
          <div key={idx} style={{
            background: past ? "rgba(255,255,255,0.02)" : booked ? "linear-gradient(135deg, rgba(37,99,235,0.15), rgba(30,64,175,0.1))" : "rgba(255,255,255,0.04)",
            border: booked ? "1px solid rgba(37,99,235,0.4)" : "1px solid rgba(255,255,255,0.06)",
            borderRadius: 16, padding: "16px 18px", margin: "0 20px 12px",
            opacity: past ? 0.4 : animateIn ? 1 : 0,
            transform: animateIn ? "translateY(0)" : "translateY(20px)",
            transition: `all 0.4s cubic-bezier(0.4,0,0.2,1) ${idx * 0.06}s`,
            position: "relative", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", top: 0, left: 0, width: 3, height: "100%",
              background: booked ? "#2563EB" : past ? "transparent" : cls.color,
              borderRadius: "3px 0 0 3px"
            }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "#2563EB", fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1.5 }}>{slot.time}</span>
                  <span style={{ fontSize: 11, color: "#475569" }}>·</span>
                  <span style={{ fontSize: 11, color: "#475569", fontWeight: 500 }}>{slot.duration} min</span>
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 4px", color: "#E2E8F0" }}>{cls.icon} {cls.name}</h3>
                <p style={{ fontSize: 12, color: "#64748B", margin: "0 0 2px", fontWeight: 500 }}>{cls.description}</p>
                <p style={{ fontSize: 11, color: "#475569", margin: 0 }}>Coach: <span style={{ color: "#94A3B8", fontWeight: 600 }}>{slot.coach}</span></p>
              </div>
              <div style={{ textAlign: "right", minWidth: 90, marginLeft: 12 }}>
                {past ? (
                  <span style={{ fontSize: 11, color: "#334155", fontWeight: 600, background: "rgba(255,255,255,0.03)", padding: "6px 12px", borderRadius: 8 }}>Finalizada</span>
                ) : booked ? (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#3B82F6", background: "rgba(37,99,235,0.15)", padding: "4px 10px", borderRadius: 6, marginBottom: 8, letterSpacing: 0.5, textAlign: "center" }}>✓ RESERVADA</div>
                    <button onClick={() => handleCancel(selectedDate.toDateString(), slot.time)} style={{
                      padding: "10px 24px", borderRadius: 10, border: "1px solid rgba(239,68,68,0.3)",
                      fontWeight: 700, fontSize: 13, cursor: "pointer", background: "rgba(239,68,68,0.1)",
                      color: "#F87171", transition: "all 0.25s ease", fontFamily: "'Outfit', sans-serif",
                    }}>Cancelar</button>
                  </div>
                ) : (
                  <button onClick={() => !full && handleBook(selectedDate, slot.time, slot.classType)} style={{
                    padding: "10px 24px", borderRadius: 10, border: "none", fontWeight: 700, fontSize: 13,
                    cursor: full ? "not-allowed" : "pointer", fontFamily: "'Outfit', sans-serif",
                    background: full ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #2563EB, #1D4ED8)",
                    color: full ? "#475569" : "#fff", transition: "all 0.25s ease",
                    boxShadow: full ? "none" : "0 4px 15px rgba(37,99,235,0.3)", letterSpacing: 0.5,
                  }}>{full ? "Completa" : "Reservar"}</button>
                )}
              </div>
            </div>
            {!past && (
              <div>
                <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", marginTop: 10, position: "relative", overflow: "hidden" }}>
                  <div style={{
                    position: "absolute", top: 0, left: 0, height: "100%", width: `${pct}%`, borderRadius: 2,
                    background: pct > 85 ? "linear-gradient(90deg, #EF4444, #DC2626)" : pct > 60 ? "linear-gradient(90deg, #F59E0B, #D97706)" : "linear-gradient(90deg, #2563EB, #3B82F6)",
                    transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
                  }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  <span style={{ fontSize: 10, color: pct > 85 ? "#F87171" : pct > 60 ? "#FBBF24" : "#64748B", fontWeight: 600 }}>
                    {available <= 0 ? "Sin plazas" : `${available} plazas disponibles`}
                  </span>
                  <span style={{ fontSize: 10, color: "#334155" }}>{taken}/{cls.maxSpots}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {filteredSchedule.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#334155" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏋️</div>
          <p style={{ fontSize: 16, fontWeight: 600, color: "#475569" }}>No hay clases programadas</p>
          <p style={{ fontSize: 13, color: "#334155" }}>Prueba otro día o quita los filtros</p>
        </div>
      )}
    </div>
  );

  const renderMyBookings = () => {
    const upcoming = myBookings.filter((b) => !isPast(b.date, b.time));
    const pastBookings = myBookings.filter((b) => isPast(b.date, b.time));

    return (
      <div style={{ paddingBottom: 90 }}>
        <div style={{ padding: "24px 20px 8px" }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 2 }}>MIS RESERVAS</h1>
          <p style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>Gestiona tus próximas clases</p>
        </div>

        {upcoming.length === 0 && pastBookings.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", color: "#334155" }}>
            <div style={{ fontSize: 56, marginBottom: 16, opacity: 0.5 }}>📋</div>
            <p style={{ fontSize: 18, fontWeight: 700, color: "#475569", marginBottom: 8 }}>Sin reservas</p>
            <p style={{ fontSize: 13, color: "#334155", marginBottom: 24 }}>Apúntate a una clase para empezar</p>
            <button onClick={() => setCurrentView("home")} style={{
              padding: "14px 32px", borderRadius: 10, border: "none", fontWeight: 700, fontSize: 14,
              cursor: "pointer", background: "linear-gradient(135deg, #2563EB, #1D4ED8)", color: "#fff",
              boxShadow: "0 4px 15px rgba(37,99,235,0.3)", fontFamily: "'Outfit', sans-serif",
            }}>Ver horarios →</button>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div style={{ padding: "8px 20px" }}>
                <h3 style={{ fontSize: 12, fontWeight: 700, color: "#64748B", letterSpacing: 1.5, marginBottom: 12, textTransform: "uppercase" }}>Próximas ({upcoming.length})</h3>
                {upcoming.map((b, i) => {
                  const cls = CLASSES.find((c) => c.id === b.classType);
                  const d = new Date(b.date);
                  const canCxl = canCancel(b.date, b.time);
                  return (
                    <div key={i} style={{
                      background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.2)",
                      borderRadius: 16, padding: "16px 18px", marginBottom: 10,
                      opacity: animateIn ? 1 : 0, transform: animateIn ? "translateY(0)" : "translateY(15px)",
                      transition: `all 0.3s ease ${i * 0.08}s`,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: 11, color: "#3B82F6", fontWeight: 700, marginBottom: 4, letterSpacing: 0.5 }}>{formatDate(d)} · {b.time}</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: "#E2E8F0" }}>{cls.icon} {cls.name}</div>
                        </div>
                        <button onClick={() => canCxl && handleCancel(b.date, b.time)} style={{
                          padding: "8px 16px", borderRadius: 10, border: "1px solid rgba(239,68,68,0.3)",
                          fontWeight: 700, fontSize: 12, cursor: canCxl ? "pointer" : "not-allowed",
                          background: "rgba(239,68,68,0.1)", color: "#F87171", opacity: canCxl ? 1 : 0.3,
                          fontFamily: "'Outfit', sans-serif",
                        }}>Cancelar</button>
                      </div>
                      {!canCxl && <p style={{ fontSize: 10, color: "#F59E0B", marginTop: 8, marginBottom: 0, fontWeight: 500 }}>⚠️ No cancelable (menos de 2h)</p>}
                    </div>
                  );
                })}
              </div>
            )}
            {pastBookings.length > 0 && (
              <div style={{ padding: "16px 20px" }}>
                <h3 style={{ fontSize: 12, fontWeight: 700, color: "#475569", letterSpacing: 1.5, marginBottom: 12, textTransform: "uppercase" }}>Historial</h3>
                {pastBookings.map((b, i) => {
                  const cls = CLASSES.find((c) => c.id === b.classType);
                  return (
                    <div key={i} style={{
                      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
                      borderRadius: 14, padding: "12px 16px", marginBottom: 8, opacity: 0.5,
                    }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#94A3B8" }}>{cls.icon} {cls.name}</div>
                      <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{b.date} · {b.time}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderProfile = () => (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ padding: "32px 20px", textAlign: "center" }}>
        <div style={{
          width: 90, height: 90, borderRadius: 24, margin: "0 auto 16px",
          background: "linear-gradient(135deg, #2563EB, #1E3A8A)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 36, fontWeight: 800, fontFamily: "'Bebas Neue', sans-serif",
          boxShadow: "0 8px 30px rgba(37,99,235,0.3)", letterSpacing: 2,
        }}>{userName[0]}</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px", fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 2 }}>{userName.toUpperCase()}</h1>
        <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>Miembro desde Enero 2025</p>
      </div>
      <div style={{ padding: "0 20px" }}>
        <div style={{
          background: "linear-gradient(135deg, rgba(37,99,235,0.15), rgba(30,64,175,0.08))",
          border: "1px solid rgba(37,99,235,0.25)", borderRadius: 18, padding: 22, marginBottom: 16,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#3B82F6", letterSpacing: 1 }}>PLAN ACTIVO</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#10B981", background: "rgba(16,185,129,0.15)", padding: "4px 10px", borderRadius: 6 }}>ACTIVO</span>
          </div>
          <h3 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px", fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1.5 }}>MENSUALIDAD COMPLETA</h3>
          <p style={{ fontSize: 13, color: "#64748B", margin: "0 0 12px" }}>Acceso a todas las clases</p>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#2563EB", fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1 }}>
            50€<span style={{ fontSize: 14, color: "#64748B", fontWeight: 500, fontFamily: "'Outfit', sans-serif" }}>/mes</span>
          </div>
        </div>
        <div style={{
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 18, padding: 22, marginBottom: 16,
        }}>
          <h4 style={{ fontSize: 12, fontWeight: 700, color: "#64748B", letterSpacing: 1.5, marginTop: 0, marginBottom: 16, textTransform: "uppercase" }}>Estadísticas</h4>
          {[
            { label: "Clases este mes", value: myBookings.length + 12 },
            { label: "Racha actual", value: "5 días" },
            { label: "Clase favorita", value: "CrossFit" },
            { label: "Coach favorito", value: "Carlos M." },
          ].map((stat, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", padding: "10px 0",
              borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.04)" : "none",
            }}>
              <span style={{ fontSize: 14, color: "#94A3B8" }}>{stat.label}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#E2E8F0" }}>{stat.value}</span>
            </div>
          ))}
        </div>
        <div style={{
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 18, padding: 22,
        }}>
          <h4 style={{ fontSize: 12, fontWeight: 700, color: "#64748B", letterSpacing: 1.5, marginTop: 0, marginBottom: 16, textTransform: "uppercase" }}>La Nave Strength Center</h4>
          <div style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.8 }}>
            📍 Calle Menor, 46 – Colmenar Viejo<br />
            🕐 L-D: 06:00 – 23:00<br />
            📞 +34 612 345 678<br />
            📧 info@lanavestrength.com
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", background: "#0A0E1A", minHeight: "100vh", maxWidth: 480, margin: "0 auto", position: "relative", overflow: "hidden", color: "#E8ECF4" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(180deg, #0D1225 0%, #0A0E1A 100%)",
        padding: "16px 20px 12px", position: "sticky", top: 0, zIndex: 50,
        borderBottom: "1px solid rgba(37,99,235,0.15)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <NaveLogo size={36} />
            <div>
              <span style={{ fontSize: 16, fontWeight: 800, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 2 }}>LA NAVE</span>
              <span style={{ fontSize: 9, display: "block", color: "#64748B", fontWeight: 600, letterSpacing: 2 }}>STRENGTH CENTER</span>
            </div>
          </div>
          <div style={{
            width: 38, height: 38, borderRadius: 12,
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}>
            <span style={{ fontSize: 18 }}>🔔</span>
          </div>
        </div>
      </div>

      {currentView === "home" && renderHome()}
      {currentView === "bookings" && renderMyBookings()}
      {currentView === "profile" && renderProfile()}

      {/* Bottom Nav */}
      <div className="bottom-nav" style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480, display: "flex", justifyContent: "space-around",
        padding: "12px 0 28px", background: "linear-gradient(180deg, rgba(10,14,26,0.95), #0A0E1A)",
        backdropFilter: "blur(20px)", borderTop: "1px solid rgba(37,99,235,0.12)", zIndex: 100,
      }}>
        {[
          { id: "home", icon: "🗓️", label: "HORARIOS" },
          { id: "bookings", icon: "📋", label: "RESERVAS" },
          { id: "profile", icon: "👤", label: "PERFIL" },
        ].map((nav) => (
          <div key={nav.id} onClick={() => setCurrentView(nav.id)} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            cursor: "pointer", color: currentView === nav.id ? "#3B82F6" : "#475569",
            fontSize: 10, fontWeight: 600, transition: "all 0.25s ease", letterSpacing: 0.5,
          }}>
            <span style={{ fontSize: 22, transition: "transform 0.2s", transform: currentView === nav.id ? "scale(1.15)" : "scale(1)" }}>{nav.icon}</span>
            <span style={{ letterSpacing: 1, fontFamily: "'Bebas Neue', sans-serif", fontSize: 12 }}>{nav.label}</span>
            {currentView === nav.id && <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#3B82F6" }} />}
          </div>
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          padding: "14px 24px", borderRadius: 14, fontSize: 14, fontWeight: 600, zIndex: 300,
          background: toast.type === "error" ? "linear-gradient(135deg, #991B1B, #7F1D1D)" : "linear-gradient(135deg, #1D4ED8, #1E40AF)",
          color: "#fff", boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
          border: toast.type === "error" ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(59,130,246,0.3)",
          animation: "slideDown 0.3s ease",
        }}>{toast.msg}</div>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <div onClick={() => setConfirmModal(null)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: "linear-gradient(180deg, #141B2D, #0D1225)", borderRadius: 20, padding: 28,
            width: "100%", maxWidth: 360, border: "1px solid rgba(37,99,235,0.2)", boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
          }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>{confirmModal.cls.icon}</div>
              <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px", fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1.5 }}>CONFIRMAR RESERVA</h2>
              <p style={{ fontSize: 13, color: "#64748B" }}>¿Quieres apuntarte a esta clase?</p>
            </div>
            <div style={{
              background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 16, marginBottom: 20,
              border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "#E2E8F0" }}>{confirmModal.cls.name}</div>
              <div style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.8 }}>
                📅 {formatDate(confirmModal.date)}<br />
                🕐 {confirmModal.time}<br />
                👤 {confirmModal.taken}/{confirmModal.cls.maxSpots} plazas ocupadas
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmModal(null)} style={{
                flex: 1, padding: "14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.05)", color: "#94A3B8", fontWeight: 700, fontSize: 14,
                cursor: "pointer", fontFamily: "'Outfit', sans-serif",
              }}>Cancelar</button>
              <button onClick={confirmBook} style={{
                flex: 1, padding: "14px", borderRadius: 12, border: "none",
                background: "linear-gradient(135deg, #2563EB, #1D4ED8)", color: "#fff",
                fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "'Outfit', sans-serif",
                boxShadow: "0 4px 15px rgba(37,99,235,0.4)",
              }}>Confirmar ✓</button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModal && (
        <div onClick={() => setCancelModal(null)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: "linear-gradient(180deg, #141B2D, #0D1225)", borderRadius: 20, padding: 28,
            width: "100%", maxWidth: 360, border: "1px solid rgba(37,99,235,0.2)", boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
          }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
              <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px", fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1.5 }}>CANCELAR RESERVA</h2>
              <p style={{ fontSize: 13, color: "#64748B" }}>¿Seguro que quieres cancelar esta clase?</p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setCancelModal(null)} style={{
                flex: 1, padding: "14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.05)", color: "#94A3B8", fontWeight: 700, fontSize: 14,
                cursor: "pointer", fontFamily: "'Outfit', sans-serif",
              }}>Volver</button>
              <button onClick={confirmCancel} style={{
                flex: 1, padding: "14px", borderRadius: 12, border: "none",
                background: "linear-gradient(135deg, #EF4444, #DC2626)", color: "#fff",
                fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "'Outfit', sans-serif",
                boxShadow: "0 4px 15px rgba(239,68,68,0.3)",
              }}>Sí, cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
