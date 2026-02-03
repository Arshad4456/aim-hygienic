"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Login failed");

      localStorage.setItem("aim_token", data.token);
      localStorage.setItem("aim_user", JSON.stringify(data.user));

      router.push("/dashboard");
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="loginRoot">
      <div className="loginCard">
        <div className="loginHeader">
          <div className="logoCircle">AIM</div>
          <div>
            <div className="title">AIM Hygienic ERP</div>
            <div className="subtitle">Login to your dashboard</div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="form">
          <label className="label">Username</label>
          <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} />

          <label className="label">Password</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

          {err ? <div className="error">{err}</div> : null}

          <button className="btn" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>

          <div className="hint">
            Demo users: <b>admin/admin123</b> or <b>manager/123456</b>
          </div>
        </form>
      </div>
    </div>
  );
}
