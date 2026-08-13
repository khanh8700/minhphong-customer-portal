import { NextResponse } from "next/server";
import { loginAdmin } from "@/lib/admin-session";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    const ok = await loginAdmin(email, password);
    if (!ok) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    return NextResponse.json({ ok: true });
  } catch (_error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
