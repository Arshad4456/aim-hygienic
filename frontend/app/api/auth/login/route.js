import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req) {
  const body = await req.json();
  const { login, password } = body;

  const filePath = path.join(process.cwd(), "data", "data.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  const db = JSON.parse(raw);

  const user = db.users.find(
    (u) => u.login === login && u.password === password && u.status === "Active"
  );

  if (!user) {
    return NextResponse.json({ ok: false, message: "Invalid credentials" }, { status: 401 });
  }

  // Demo session cookie (simple; later replace with JWT/NextAuth)
  const res = NextResponse.json({
    ok: true,
    user: { id: user.id, fullName: user.fullName, role: user.role, companyId: user.companyId }
  });

  res.cookies.set("demo_user", JSON.stringify({
    id: user.id,
    role: user.role,
    companyId: user.companyId,
    fullName: user.fullName
  }), { httpOnly: true, sameSite: "lax", path: "/" });

  return res;
}

