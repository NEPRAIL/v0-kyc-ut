"use client";

import { useState } from "react";

export function LoginForm() {
  const [emailOrUsername, setE] = useState("");
  const [password, setP] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailOrUsername, password }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Login failed");
      return;
    }
    window.location.href = "/account"; // or /shop
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input
        type="text"
        placeholder="Email or username"
        value={emailOrUsername}
        onChange={(e) => setE(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setP(e.target.value)}
        required
      />
      {error && <p style={{ color: "red" }}>{error}</p>}
      <button type="submit">Sign in</button>
    </form>
  );
}
