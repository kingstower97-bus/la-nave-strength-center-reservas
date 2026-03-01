'use client';
import { CSS } from "@/lib/data";

const Logo = ({ s = 50 }) => (
  <svg width={s} height={s} viewBox="0 0 100 100" fill="none">
    <polygon points="50,8 85,82 72,82 50,30 28,82 15,82" fill="#2563EB" />
    <rect x="20" y="86" width="60" height="5" rx="2.5" fill="#2563EB" />
  </svg>
);

const I = {
  width: "100%", padding: "11px 14px", borderRadius: 10, marginBottom: 10,
  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
  color: "#E2E8F0", fontSize: 13, outline: "none", fontFamily: "'Outfit', sans-serif",
};

const PB = {
  width: "100%", padding: "12px", borderRadius: 10, border: "none",
  background: "linear-gradient(135deg, #2563EB, #1D4ED8)", color: "#fff",
  fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Outfit', sans-serif",
  boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
};

export default function AuthScreen({ authView, setAuthView, authForm, setAuthForm, authErr, setAuthErr, authLoading, handleAuth }) {
  return (
    <div style={{
      fontFamily: "'Outfit', sans-serif", background: "#0A0E1A", minHeight: "100vh",
      maxWidth: 480, margin: "0 auto", color: "#E2E8F0",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <style>{CSS}</style>
      <Logo />
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, letterSpacing: 3, marginTop: 14, color: "#E2E8F0" }}>LA NAVE</h1>
      <p style={{ fontSize: 9, color: "#64748B", letterSpacing: 2, fontWeight: 600, marginTop: -2 }}>STRENGTH CENTER</p>

      <form onSubmit={handleAuth} style={{ width: "100%", maxWidth: 320, marginTop: 36 }}>
        {authView === "register" && (
          <input
            placeholder="Nombre completo"
            value={authForm.name}
            onChange={e => setAuthForm(p => ({ ...p, name: e.target.value }))}
            style={I} required
          />
        )}
        <input
          type="email" placeholder="Email"
          value={authForm.email}
          onChange={e => setAuthForm(p => ({ ...p, email: e.target.value }))}
          style={I} required
        />
        <input
          type="password" placeholder="Contraseña" minLength={6}
          value={authForm.password}
          onChange={e => setAuthForm(p => ({ ...p, password: e.target.value }))}
          style={I} required
        />
        {authErr && <p style={{ color: "#F87171", fontSize: 11, textAlign: "center", margin: "6px 0" }}>{authErr}</p>}
        <button type="submit" style={PB} disabled={authLoading}>
          {authLoading ? "..." : authView === "login" ? "Entrar" : "Crear cuenta"}
        </button>
        <p style={{ textAlign: "center", fontSize: 12, color: "#64748B", marginTop: 14 }}>
          {authView === "login" ? "¿Sin cuenta? " : "¿Ya tienes? "}
          <span
            onClick={() => { setAuthView(authView === "login" ? "register" : "login"); setAuthErr(""); }}
            style={{ color: "#3B82F6", cursor: "pointer", fontWeight: 600 }}
          >
            {authView === "login" ? "Regístrate" : "Inicia sesión"}
          </span>
        </p>
      </form>
    </div>
  );
}
