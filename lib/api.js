import { supabase } from "./supabaseClient";

// ============================================================
// AUTH
// ============================================================
export async function signUp(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
      scopes: "https://www.googleapis.com/auth/gmail.readonly",
    },
  });
  if (error) throw error;
  return data; // بيحوّل المستخدم تلقائيًا لصفحة تسجيل دخول Google
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

export function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange((_event, session) => callback(session));
}

// ============================================================
// IDENTITY PROFILE
// ============================================================
export async function getIdentityProfile(userId) {
  const { data, error } = await supabase
    .from("identity_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateIdentityProfile(userId, updates) {
  const { data, error } = await supabase
    .from("identity_profiles")
    .update(updates)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  await logAuditEvent(userId, "profile_updated", "تم تحديث بيانات الهوية", "info");
  return data;
}

// ============================================================
// LINKED EMAILS (Gmail / Outlook)
// ============================================================
export async function getLinkedEmails(userId) {
  const { data, error } = await supabase
    .from("linked_emails")
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;
  return data;
}

// يبدأ تدفق OAuth الحقيقي مع Google لربط Gmail
export async function startGmailOAuth() {
  const { data, error } = await supabase.auth.linkIdentity({
    provider: "google",
    options: {
      scopes: "https://www.googleapis.com/auth/gmail.readonly",
      redirectTo: window.location.origin + "/auth/callback",
    },
  });
  if (error) throw error;
  return data; // data.url يوديك لصفحة تسجيل دخول Google
}

export async function disconnectEmail(linkId, userId) {
  const { error } = await supabase.from("linked_emails").delete().eq("id", linkId);
  if (error) throw error;
  await logAuditEvent(userId, "email_disconnected", "تم فصل ربط البريد الإلكتروني", "warning");
}

export async function updateEmailPermissions(linkId, permissions) {
  const { data, error } = await supabase
    .from("linked_emails")
    .update({ permissions })
    .eq("id", linkId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================================
// TWO-FACTOR AUTH
// ============================================================
export async function getTwoFactorStatus(userId) {
  const { data, error } = await supabase
    .from("two_factor_auth")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  return data;
}

// تفعيل 2FA الحقيقي عبر Supabase MFA (TOTP)
export async function enrollTOTP() {
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
  if (error) throw error;
  // data.totp.qr_code (SVG) و data.totp.secret تُستخدم لعرض QR للمستخدم
  return data;
}

export async function verifyTOTP(factorId, code) {
  const challenge = await supabase.auth.mfa.challenge({ factorId });
  if (challenge.error) throw challenge.error;

  const { data, error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.data.id,
    code,
  });
  if (error) throw error;
  return data;
}

export async function disableTOTP(factorId, userId) {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw error;

  await supabase
    .from("two_factor_auth")
    .update({ is_enabled: false, method: null })
    .eq("user_id", userId);

  await logAuditEvent(userId, "2fa_disabled", "تم تعطيل المصادقة الثنائية", "danger");
}

export async function markTwoFactorEnabled(userId, method) {
  const { data, error } = await supabase
    .from("two_factor_auth")
    .update({ is_enabled: true, method, enabled_at: new Date().toISOString() })
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  await logAuditEvent(userId, "2fa_enabled", "تم تفعيل المصادقة الثنائية", "success");
  return data;
}

// ============================================================
// AUDIT LOGS
// ============================================================
export async function getAuditLogs(userId, limit = 20) {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function logAuditEvent(userId, action, actionLabelAr, status = "info", metadata = {}) {
  const { error } = await supabase.rpc("log_audit_event", {
    p_user_id: userId,
    p_action: action,
    p_action_label_ar: actionLabelAr,
    p_ip: null,
    p_device: navigator?.userAgent?.slice(0, 100) || null,
    p_status: status,
    p_metadata: metadata,
  });
  if (error) console.error("audit log error:", error);
}
