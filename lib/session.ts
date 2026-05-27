import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { randomToken, sha256, signValue, verifySignature } from "@/lib/crypto";
import { createPortalAdminClient } from "@/lib/supabase/admin";
import type { PortalSession } from "@/lib/types";

export const SESSION_COOKIE = "cp_session";
const SESSION_MINUTES = 30;

export function buildSessionCookieValue(sessionToken: string): string {
  return `${sessionToken}.${signValue(sessionToken)}`;
}

export function parseSessionCookie(value: string | undefined): string | null {
  if (!value) return null;
  const [sessionToken, signature] = value.split(".");
  if (!sessionToken || !signature) return null;
  if (!verifySignature(sessionToken, signature)) return null;
  return sessionToken;
}

export async function createLookupSession(
  supabase: SupabaseClient,
  input: { customerId: string; ipHash?: string | null; userAgent?: string | null }
): Promise<{ cookieValue: string; expiresAt: Date }> {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_MINUTES * 60 * 1000);
  const { error } = await supabase.from("lookup_sessions").insert({
    customer_id: input.customerId,
    token_hash: sha256(token),
    ip_hash: input.ipHash ?? null,
    user_agent: input.userAgent ?? null,
    expires_at: expiresAt.toISOString()
  });

  if (error) throw new Error(error.message);
  return { cookieValue: buildSessionCookieValue(token), expiresAt };
}

export function setSessionCookie(res: NextResponse, cookieValue: string, expiresAt: Date): void {
  res.cookies.set(SESSION_COOKIE, cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

export async function getSessionFromRequest(req: NextRequest, supabase = createPortalAdminClient()): Promise<PortalSession | null> {
  const token = parseSessionCookie(req.cookies.get(SESSION_COOKIE)?.value);
  if (!token) return null;
  return getSessionByToken(supabase, token);
}

export async function getSessionFromCookies(supabase = createPortalAdminClient()): Promise<PortalSession | null> {
  const store = await cookies();
  const token = parseSessionCookie(store.get(SESSION_COOKIE)?.value);
  if (!token) return null;
  return getSessionByToken(supabase, token);
}

async function getSessionByToken(supabase: SupabaseClient, token: string): Promise<PortalSession | null> {
  const tokenHash = sha256(token);
  const { data, error } = await supabase
    .from("lookup_sessions")
    .select("id, customer_id, expires_at, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !data) return null;
  if (data.revoked_at) return null;
  if (new Date(data.expires_at as string).getTime() <= Date.now()) return null;

  await supabase
    .from("lookup_sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", data.id);

  return {
    id: data.id as string,
    customer_id: data.customer_id as string,
    expires_at: data.expires_at as string
  };
}

export async function requirePortalSession(): Promise<PortalSession> {
  const session = await getSessionFromCookies();
  if (!session) redirect("/");
  return session;
}

export async function revokeRequestSession(req: NextRequest, supabase = createPortalAdminClient()): Promise<void> {
  const token = parseSessionCookie(req.cookies.get(SESSION_COOKIE)?.value);
  if (!token) return;
  await supabase
    .from("lookup_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("token_hash", sha256(token));
}

