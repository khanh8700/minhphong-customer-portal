import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireEnv } from "@/lib/env";

const ADMIN_COOKIE = "admin_session";

export async function requireAdminSession(): Promise<void> {
  const store = await cookies();
  if (store.get(ADMIN_COOKIE)?.value !== "true") {
    redirect("/admin/login");
  }
}

export async function setAdminSession() {
  const store = await cookies();
  store.set(ADMIN_COOKIE, "true", {
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

export async function loginAdmin(password: string): Promise<boolean> {
  const adminPassword = requireEnv("ADMIN_PASSWORD");
  if (password === adminPassword) {
    await setAdminSession();
    return true;
  }
  return false;
}
