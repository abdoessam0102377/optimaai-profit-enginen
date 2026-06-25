import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  signUp, signIn, signOut, signInWithGoogle, onAuthChange,
  getIdentityProfile, updateIdentityProfile,
  getLinkedEmails, disconnectEmail,
  getTwoFactorStatus, enrollTOTP, verifyTOTP, disableTOTP,
  getAuditLogs, logAuditEvent,
} from "../lib/api";

// ============================================================
// نفس متغيرات الألوان والـ styles من النسخة السابقة
// (مقتصرة هنا للمساحة — استخدم ملف identity-auth-phase2.jsx الأصلي كمرجع كامل للـ CSS)
// ============================================================
const COLORS = {
  bg: "#0a0c10", surface: "#111318", card: "#161b22", border: "#21262d",
  accent: "#00d4aa", accentDim: "#00d4aa22", accentBorder: "#00d4aa44",
  gold: "#f0a500", goldDim: "#f0a50022", red: "#ff4d4f", redDim: "#ff4d4f22",
  blue: "#4fa3e0", blueDim: "#4fa3e022", text: "#e6edf3",
  textMuted: "#7d8590", textDim: "#4a5260",
};

// ============================================================
// شاشة تسجيل الدخول / التسجيل (حقيقية عبر Supabase Auth)
// ============================================================
function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signup") {
        await signUp(email, password, fullName);
        setError("✅ تم إنشاء الحساب! تحقق من بريدك الإلكتروني لتأكيد الحساب.");
      } else {
        const data = await signIn(email, password);
        onAuthed(data.session);
      }
    } catch (err) {
      setError("❌ " + (err.message || "حدث خطأ، حاول مرة أخرى"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: COLORS.bg, direction: "rtl", fontFamily: "'IBM Plex Sans Arabic', sans-serif",
    }}>
      <div style={{
        width: "380px", background: COLORS.card, border: `1px solid ${COLORS.border}`,
        borderRadius: "16px", padding: "32px",
      }}>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{
            width: "50px", height: "50px", margin: "0 auto 12px",
            background: `linear-gradient(135deg, ${COLORS.accent}, #00a884)`,
            borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "24px", fontWeight: 700, color: "#000",
          }}>O</div>
          <div style={{ fontSize: "18px", fontWeight: 700, color: COLORS.text }}>OptimaAI</div>
          <div style={{ fontSize: "12px", color: COLORS.textMuted }}>
            {mode === "signin" ? "تسجيل الدخول إلى حسابك" : "إنشاء حساب جديد"}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <div style={{ marginBottom: "14px" }}>
              <input
                placeholder="الاسم الكامل" value={fullName} required
                onChange={e => setFullName(e.target.value)}
                style={inputStyle}
              />
            </div>
          )}
          <div style={{ marginBottom: "14px" }}>
            <input
              type="email" placeholder="البريد الإلكتروني" value={email} required
              onChange={e => setEmail(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: "18px" }}>
            <input
              type="password" placeholder="كلمة المرور" value={password} required minLength={6}
              onChange={e => setPassword(e.target.value)}
              style={inputStyle}
            />
          </div>

          {error && (
            <div style={{
              fontSize: "12px", padding: "10px", borderRadius: "8px", marginBottom: "14px",
              background: error.startsWith("✅") ? COLORS.accentDim : COLORS.redDim,
              color: error.startsWith("✅") ? COLORS.accent : COLORS.red,
            }}>{error}</div>
          )}

          <button type="submit" disabled={loading} style={{
            width: "100%", padding: "11px", borderRadius: "8px", border: "none",
            background: COLORS.accent, color: "#000", fontWeight: 700, fontSize: "14px",
            cursor: "pointer", opacity: loading ? 0.6 : 1,
          }}>
            {loading ? "جاري المعالجة..." : mode === "signin" ? "تسجيل الدخول" : "إنشاء الحساب"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "16px", fontSize: "13px", color: COLORS.textMuted }}>
          {mode === "signin" ? "ليس لديك حساب؟" : "لديك حساب بالفعل؟"}{" "}
          <span
            style={{ color: COLORS.accent, cursor: "pointer", fontWeight: 600 }}
            onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); }}
          >
            {mode === "signin" ? "سجّل الآن" : "سجّل دخولك"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "20px 0" }}>
          <div style={{ flex: 1, height: "1px", background: COLORS.border }} />
          <span style={{ fontSize: "11px", color: COLORS.textDim }}>أو</span>
          <div style={{ flex: 1, height: "1px", background: COLORS.border }} />
        </div>

        <button
          type="button"
          onClick={async () => {
            setError("");
            try {
              await signInWithGoogle();
            } catch (err) {
              setError("❌ " + (err.message || "فشل تسجيل الدخول بجوجل"));
            }
          }}
          style={{
            width: "100%", padding: "11px", borderRadius: "8px",
            border: `1px solid ${COLORS.border}`, background: COLORS.surface,
            color: COLORS.text, fontWeight: 600, fontSize: "14px", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.07-1.8 2.71v2.26h2.92c1.71-1.57 2.68-3.88 2.68-6.61z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.87-3.04.87-2.34 0-4.32-1.58-5.03-3.71H.96v2.33C2.44 15.98 5.48 18 9 18z"/>
            <path fill="#FBBC05" d="M3.97 10.72c-.18-.54-.28-1.12-.28-1.72s.1-1.18.28-1.72V4.95H.96A8.997 8.997 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.01-2.33z"/>
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/>
          </svg>
          تسجيل الدخول بحساب Google
        </button>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "11px 14px", borderRadius: "8px",
  border: `1px solid ${COLORS.border}`, background: COLORS.surface,
  color: COLORS.text, fontSize: "14px", outline: "none", direction: "rtl",
  fontFamily: "inherit", boxSizing: "border-box",
};

// ============================================================
// التطبيق الرئيسي — متصل فعليًا بـ Supabase
// ============================================================
export default function App() {
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [profile, setProfile] = useState(null);
  const [emails, setEmails] = useState([]);
  const [twoFA, setTwoFA] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [toast, setToast] = useState("");

  // 1) تتبّع جلسة المستخدم الحقيقية
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoadingSession(false);
    });
    const { data: sub } = onAuthChange((s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // 2) جلب البيانات الحقيقية لما يكون فيه مستخدم مسجّل دخول
  useEffect(() => {
    if (!session?.user) return;
    setLoadingData(true);
    const userId = session.user.id;

    Promise.all([
      getIdentityProfile(userId).catch(() => null),
      getLinkedEmails(userId).catch(() => []),
      getTwoFactorStatus(userId).catch(() => null),
      getAuditLogs(userId).catch(() => []),
    ]).then(([p, e, t, l]) => {
      setProfile(p);
      setEmails(e);
      setTwoFA(t);
      setLogs(l);
      setLoadingData(false);
    });
  }, [session]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const handleSaveProfile = async (updates) => {
    try {
      const updated = await updateIdentityProfile(session.user.id, updates);
      setProfile(updated);
      showToast("✅ تم حفظ البيانات بنجاح");
    } catch (err) {
      showToast("❌ " + err.message);
    }
  };

  const handleEnrollTOTP = async () => {
    try {
      const data = await enrollTOTP();
      return data; // يحتوي على QR code والـ secret الحقيقيين من Supabase MFA
    } catch (err) {
      showToast("❌ " + err.message);
      return null;
    }
  };

  const handleVerifyTOTP = async (factorId, code) => {
    try {
      await verifyTOTP(factorId, code);
      const updated = await getTwoFactorStatus(session.user.id);
      setTwoFA(updated);
      showToast("✅ تم تفعيل المصادقة الثنائية");
    } catch (err) {
      showToast("❌ كود غير صحيح، حاول مرة أخرى");
    }
  };

  const handleDisableTOTP = async (factorId) => {
    try {
      await disableTOTP(factorId, session.user.id);
      const updated = await getTwoFactorStatus(session.user.id);
      setTwoFA(updated);
      showToast("تم تعطيل 2FA");
    } catch (err) {
      showToast("❌ " + err.message);
    }
  };

  const handleDisconnectEmail = async (linkId) => {
    try {
      await disconnectEmail(linkId, session.user.id);
      setEmails(emails.filter(e => e.id !== linkId));
      showToast("تم فصل البريد الإلكتروني");
    } catch (err) {
      showToast("❌ " + err.message);
    }
  };

  if (loadingSession) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: COLORS.bg, color: COLORS.textMuted, fontFamily: "sans-serif",
      }}>
        جاري التحميل...
      </div>
    );
  }

  if (!session) {
    return <AuthScreen onAuthed={setSession} />;
  }

  // ============================================================
  // المستخدم مسجّل دخول — عرض لوحة الهوية الحقيقية
  // ============================================================
  return (
    <div style={{
      minHeight: "100vh", background: COLORS.bg, color: COLORS.text,
      direction: "rtl", fontFamily: "'IBM Plex Sans Arabic', sans-serif", padding: "24px",
    }}>
      {toast && (
        <div style={{
          position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)",
          background: COLORS.card, border: `1px solid ${COLORS.accentBorder}`,
          color: COLORS.text, padding: "10px 20px", borderRadius: "8px", zIndex: 999,
          fontSize: "13px",
        }}>{toast}</div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <div style={{ fontSize: "20px", fontWeight: 700 }}>🪪 نظام الهوية والمصادقة</div>
          <div style={{ fontSize: "13px", color: COLORS.textMuted }}>
            {session.user.email} — متصل فعليًا بـ Supabase
          </div>
        </div>
        <button
          onClick={() => signOut()}
          style={{
            padding: "8px 16px", borderRadius: "8px", border: `1px solid ${COLORS.border}`,
            background: "transparent", color: COLORS.text, cursor: "pointer", fontSize: "13px",
          }}
        >
          تسجيل الخروج
        </button>
      </div>

      {loadingData ? (
        <div style={{ color: COLORS.textMuted, padding: "40px", textAlign: "center" }}>
          جاري جلب البيانات من قاعدة البيانات...
        </div>
      ) : (
        <div style={{ display: "grid", gap: "20px" }}>
          {/* بيانات الهوية */}
          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: "12px", padding: "20px" }}>
            <div style={{ fontWeight: 600, marginBottom: "14px" }}>🪪 الهوية الرسمية</div>
            <div style={{ fontSize: "13px", color: COLORS.textMuted, lineHeight: 1.8 }}>
              <div>الاسم: {profile?.full_name || "—"}</div>
              <div>اسم العرض: {profile?.display_name || "—"}</div>
              <div>الدولة: {profile?.country || "—"}</div>
              <div>الحالة: {profile?.is_verified ? "✅ موثّق" : "⏳ غير موثّق"}</div>
            </div>
            <button
              onClick={() => handleSaveProfile({ country: "مصر" })}
              style={{
                marginTop: "14px", padding: "7px 14px", borderRadius: "7px", border: "none",
                background: COLORS.accent, color: "#000", fontWeight: 600, fontSize: "12px", cursor: "pointer",
              }}
            >
              تجربة حفظ (تحديث الدولة)
            </button>
          </div>

          {/* البريد المربوط */}
          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: "12px", padding: "20px" }}>
            <div style={{ fontWeight: 600, marginBottom: "14px" }}>📧 البريد المربوط ({emails.length})</div>
            {emails.length === 0 ? (
              <div style={{ fontSize: "13px", color: COLORS.textMuted }}>
                لا يوجد بريد مربوط حالياً. لربط Gmail تحتاج تفعيل Google كـ OAuth Provider من Supabase Dashboard أولاً (Authentication → Providers → Google).
              </div>
            ) : (
              emails.map(e => (
                <div key={e.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: "13px" }}>
                  <span>{e.email_address} ({e.provider})</span>
                  <button onClick={() => handleDisconnectEmail(e.id)} style={{ color: COLORS.red, background: "none", border: "none", cursor: "pointer" }}>فصل</button>
                </div>
              ))
            )}
          </div>

          {/* 2FA */}
          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: "12px", padding: "20px" }}>
            <div style={{ fontWeight: 600, marginBottom: "14px" }}>
              🔐 المصادقة الثنائية — {twoFA?.is_enabled ? "✅ مفعّلة" : "⏳ معطّلة"}
            </div>
            <TwoFASetup
              enabled={twoFA?.is_enabled}
              onEnroll={handleEnrollTOTP}
              onVerify={handleVerifyTOTP}
              onDisable={handleDisableTOTP}
            />
          </div>

          {/* سجل الأنشطة */}
          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: "12px", padding: "20px" }}>
            <div style={{ fontWeight: 600, marginBottom: "14px" }}>📋 آخر الأنشطة ({logs.length})</div>
            {logs.length === 0 ? (
              <div style={{ fontSize: "13px", color: COLORS.textMuted }}>لا يوجد نشاط مسجّل بعد</div>
            ) : (
              logs.map(l => (
                <div key={l.id} style={{ fontSize: "12.5px", color: COLORS.textMuted, padding: "6px 0", borderBottom: `1px solid ${COLORS.border}33` }}>
                  <span style={{ color: COLORS.text }}>{l.action_label_ar}</span>
                  {" — "}
                  {new Date(l.created_at).toLocaleString("ar-EG")}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// مكوّن تفعيل 2FA الحقيقي (Supabase MFA / TOTP)
// ============================================================
function TwoFASetup({ enabled, onEnroll, onVerify, onDisable }) {
  const [enrollData, setEnrollData] = useState(null);
  const [code, setCode] = useState("");

  const handleStart = async () => {
    const data = await onEnroll();
    if (data) setEnrollData(data);
  };

  if (enabled) {
    return (
      <button
        onClick={() => onDisable(null)}
        style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: COLORS.redDim, color: COLORS.red, cursor: "pointer", fontSize: "13px" }}
      >
        إلغاء تفعيل 2FA
      </button>
    );
  }

  if (!enrollData) {
    return (
      <button
        onClick={handleStart}
        style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: COLORS.accent, color: "#000", fontWeight: 600, cursor: "pointer", fontSize: "13px" }}
      >
        🔒 تفعيل المصادقة الثنائية
      </button>
    );
  }

  return (
    <div>
      <div style={{ fontSize: "13px", color: COLORS.textMuted, marginBottom: "10px" }}>
        افتح تطبيق Google Authenticator وامسح هذا الكود:
      </div>
      <div
        dangerouslySetInnerHTML={{ __html: enrollData.totp.qr_code }}
        style={{ width: "180px", margin: "0 auto 12px", background: "#fff", borderRadius: "8px", padding: "10px" }}
      />
      <div style={{ display: "flex", gap: "8px" }}>
        <input
          value={code} onChange={e => setCode(e.target.value)} placeholder="ادخل الكود من 6 أرقام"
          style={{ ...inputStyle, width: "auto", flex: 1 }}
        />
        <button
          onClick={() => onVerify(enrollData.id, code)}
          style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: COLORS.accent, color: "#000", fontWeight: 600, cursor: "pointer" }}
        >
          تأكيد
        </button>
      </div>
    </div>
  );
    }
