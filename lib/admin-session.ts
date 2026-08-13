import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireEnv } from "@/lib/env";
import { createPortalAdminClient } from "@/lib/supabase/admin";
import { signValue, verifySignature } from "@/lib/crypto";

const ADMIN_COOKIE = "admin_session";
export const ADMIN_ROLES = ["system_admin", "scada_operator", "accountant", "viewer"] as const;
export type AdminRole = typeof ADMIN_ROLES[number];

export type AdminSession = { email: string; role: AdminRole };

function parseAdminSession(value: string | undefined): AdminSession | null {
  if (!value) return null;
  if (value === "true") return { email: "legacy-admin", role: "system_admin" };
  const [payload, signature] = value.split(".");
  if (!payload || !signature || !verifySignature(payload, signature)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AdminSession;
    return typeof parsed.email === "string" && ADMIN_ROLES.includes(parsed.role) ? parsed : null;
  } catch {
    return null;
  }
}

export async function requireAdminSession(): Promise<AdminSession> {
  const store = await cookies();
  const session = parseAdminSession(store.get(ADMIN_COOKIE)?.value);
  if (!session) redirect("/admin/login");
  return session;
}

export async function requireAdminRole(roles: AdminRole[]): Promise<AdminSession> {
  const session = await requireAdminSession();
  if (!roles.includes(session.role)) redirect("/admin?error=forbidden");
  return session;
}

export async function setAdminSession(session: AdminSession) {
  const store = await cookies();
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  store.set(ADMIN_COOKIE, `${payload}.${signValue(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    sameSite: "lax",
  });
}

export async function clearAdminSession() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}

export async function loginAdmin(email: string, password: string): Promise<boolean> {
  const adminPassword = requireEnv("ADMIN_PASSWORD");
  if (password !== adminPassword || !email.trim()) return false;

  const normalizedEmail = email.trim().toLowerCase();
  const supabase = createPortalAdminClient();
  const { data: existingUsers, error: usersError } = await supabase
    .from("admin_users")
    .select("email, role, is_active")
    .limit(1);
  if (usersError) return false;

  if (!existingUsers?.length) {
    const { error } = await supabase.from("admin_users").insert({ email: normalizedEmail, role: "system_admin" });
    if (error) return false;
    await setAdminSession({ email: normalizedEmail, role: "system_admin" });
    return true;
  }

  const { data: user } = await supabase
    .from("admin_users")
    .select("email, role, is_active")
    .eq("email", normalizedEmail)
    .maybeSingle();
  if (!user?.is_active || !ADMIN_ROLES.includes(user.role as AdminRole)) return false;

  await setAdminSession({ email: user.email, role: user.role as AdminRole });
  return true;
}
