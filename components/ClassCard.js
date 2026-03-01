'use client';
import { ini, acol } from "@/lib/data";

export default function ClassCard({
  cls, members, isAdmin, curUser, expanded, onToggle,
  onSelfBook, onAddModal, onAdminRemove,
  onDragStart, onDragOver, onDrop, onDragEnd, isDragOver,
  allMembers, idx,
}) {
  const spots = cls.max_spots;
  const available = spots - members.length;
  const isFull = available <= 0;
  const isBooked = members.some(b => b.userId === curUser);
  const fillPct = Math.min((members.length / spots) * 100, 100);

  return (
    <div
      data-classkey={cls.id}
      className={`class-card ${isDragOver ? "drag-over" : ""}`}
      onDragOver={isAdmin ? (e) => onDragOver(e, cls.id) : undefined}
      onDrop={isAdmin ? (e) => onDrop(e, cls.id) : undefined}
      onDragLeave={onDragEnd}
      style={{
        background: "rgba(255,255,255,0.025)", borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.04)", overflow: "hidden",
        borderLeft: `3px solid ${cls.class_color || "#2563EB"}`,
        animation: `slideUp 0.25s ease ${idx * 0.04}s both`,
      }}
    >
      {/* Header */}
      <div onClick={onToggle} style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 14px", cursor: "pointer",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          <div style={{ width: 50, textAlign: "center" }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: "#E2E8F0", fontFamily: "'Bebas Neue', sans-serif" }}>
              {cls.start_time?.slice(0, 5)}
            </span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 13 }}>{cls.class_icon}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#E2E8F0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {cls.class_name}
              </span>
              {isBooked && (
                <span style={{ fontSize: 9, color: "#3B82F6", fontWeight: 700, background: "rgba(59,130,246,0.12)", padding: "1px 5px", borderRadius: 3 }}>TÚ</span>
              )}
            </div>
            {cls.coach_name && (
              <div style={{ fontSize: 10, color: "#64748B", marginTop: 1 }}>
                {cls.coach_emoji || "💪"} {cls.coach_name} · {cls.duration_min}min
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {members.length > 0 && (
            <div style={{ display: "flex" }}>
              {members.slice(0, 3).map((m, mi) => (
                <div key={m.userId} style={{
                  width: 22, height: 22, borderRadius: 7,
                  background: acol(m.userName), border: "2px solid #141829",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 7, fontWeight: 700, color: "#fff",
                  marginLeft: mi > 0 ? -6 : 0, zIndex: 3 - mi,
                }}>{ini(m.userName)}</div>
              ))}
              {members.length > 3 && (
                <div style={{
                  width: 22, height: 22, borderRadius: 7,
                  background: "#1E293B", border: "2px solid #141829",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 7, fontWeight: 700, color: "#94A3B8", marginLeft: -6,
                }}>+{members.length - 3}</div>
              )}
            </div>
          )}

          <div style={{
            fontSize: 11, fontWeight: 700, padding: "3px 7px", borderRadius: 5,
            fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 0.5,
            background: isFull ? "rgba(239,68,68,0.1)" : available <= 3 ? "rgba(245,158,11,0.1)" : "rgba(16,185,129,0.1)",
            color: isFull ? "#F87171" : available <= 3 ? "#FBBF24" : "#34D399",
            border: `1px solid ${isFull ? "rgba(239,68,68,0.2)" : available <= 3 ? "rgba(245,158,11,0.2)" : "rgba(16,185,129,0.2)"}`,
          }}>
            {members.length}/{spots}
          </div>
          <span style={{ fontSize: 12, color: "#475569", transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
        </div>
      </div>

      {/* Fill bar */}
      <div style={{ height: 2, background: "rgba(255,255,255,0.03)", margin: "0 14px" }}>
        <div style={{
          height: "100%", borderRadius: 1, width: `${fillPct}%`,
          background: isFull ? "#EF4444" : available <= 3 ? "#F59E0B" : (cls.class_color || "#2563EB"),
          transition: "width 0.3s ease",
        }} />
      </div>

      {/* Expanded */}
      {expanded && (
        <div style={{ padding: "10px 14px 14px", animation: "fadeIn 0.2s ease" }}>
          {/* Client booking */}
          {!isAdmin && (
            <button
              onClick={(e) => { e.stopPropagation(); onSelfBook(cls.id); }}
              disabled={isFull && !isBooked}
              style={{
                width: "100%", padding: "11px", borderRadius: 10, border: "none",
                fontSize: 13, fontWeight: 700, cursor: isFull && !isBooked ? "not-allowed" : "pointer",
                fontFamily: "'Outfit', sans-serif", marginBottom: 10,
                background: isBooked ? "rgba(239,68,68,0.1)" : isFull ? "rgba(255,255,255,0.03)" : "linear-gradient(135deg, #2563EB, #1D4ED8)",
                color: isBooked ? "#F87171" : isFull ? "#475569" : "#fff",
                opacity: isFull && !isBooked ? 0.5 : 1,
                boxShadow: !isBooked && !isFull ? "0 4px 12px rgba(37,99,235,0.3)" : "none",
              }}
              className="btn-hover"
            >
              {isBooked ? "✕ Cancelar reserva" : isFull ? "Clase completa" : "✓ Reservar plaza"}
            </button>
          )}

          {/* Member list */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#64748B", letterSpacing: 0.5, textTransform: "uppercase" }}>
              Asistentes ({members.length})
            </span>
            {isAdmin && !isFull && (
              <button
                onClick={(e) => { e.stopPropagation(); onAddModal(cls.id); }}
                style={{
                  fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 5,
                  border: "1px solid rgba(59,130,246,0.2)", background: "rgba(59,130,246,0.08)",
                  color: "#60A5FA", cursor: "pointer",
                }}
                className="btn-hover"
              >+ Añadir</button>
            )}
          </div>

          {members.length === 0 ? (
            <div style={{ fontSize: 11, color: "#334155", padding: "10px 0", textAlign: "center" }}>Sin reservas</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {members.map(m => {
                const memberInfo = allMembers.find(mm => mm.id === m.userId);
                return (
                  <div key={m.userId} className="member-chip"
                    draggable={isAdmin}
                    onDragStart={() => isAdmin && onDragStart(m.userId, m.userName, cls.id)}
                    onDragEnd={onDragEnd}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "5px 6px", borderRadius: 8,
                      background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.03)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 7, flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                        background: acol(m.userName),
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 9, fontWeight: 700, color: "#fff",
                      }}>{ini(m.userName)}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#E2E8F0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {m.userName}
                          {m.userId === curUser && <span style={{ marginLeft: 4, fontSize: 9, color: "#3B82F6" }}>(tú)</span>}
                        </div>
                        <div style={{ fontSize: 9, color: "#475569" }}>
                          {m.isTemplate && <span style={{ color: "#8B5CF6" }}>📋 Fijo · </span>}
                          {memberInfo?.plan || ""}
                        </div>
                      </div>
                    </div>
                    {isAdmin && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); onAdminRemove(cls.id, m.userId, m.userName); }}
                          style={{
                            width: 22, height: 22, borderRadius: 5,
                            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)",
                            color: "#F87171", cursor: "pointer", fontSize: 9,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}
                        >✕</button>
                        <span style={{ color: "#334155", fontSize: 11, cursor: "grab", padding: "0 2px" }}>⠿</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
