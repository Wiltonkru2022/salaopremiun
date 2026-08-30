"use client";

import { FormEvent, useRef, useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";

type LoginPayload = {
  ok?: boolean;
  message?: string;
  redirectTo?: string;
};

function isLocalHost() {
  if (typeof window === "undefined") return false;
  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

export function AdminMasterPasswordLogin({ nextPath }: { nextPath: string }) {
  const submittingRef = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || submittingRef.current) return;

    submittingRef.current = true;
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin-master/auth/login", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          next: nextPath,
        }),
      });

      const payload = (await response.json().catch(() => null)) as LoginPayload | null;
      if (!response.ok || !payload?.ok) {
        setError(payload?.message || "Não foi possível entrar no Admin Master.");
        return;
      }

      const redirectTo = payload.redirectTo || nextPath || "/admin-master";

      if (isLocalHost()) {
        window.location.assign(redirectTo);
        return;
      }

      const painelHost =
        process.env.NEXT_PUBLIC_PAINEL_HOST || "painel.salaopremiun.com.br";
      if (redirectTo.startsWith("/") && window.location.hostname !== painelHost) {
        window.location.assign(`https://${painelHost}${redirectTo}`);
        return;
      }

      window.location.assign(redirectTo);
    } catch {
      setError("Não foi possível conectar ao servidor. Tente novamente.");
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-black text-zinc-900">E-mail</label>
        <div className="flex h-12 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 focus-within:border-zinc-500">
          <Mail size={17} className="text-zinc-400" />
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="voce@exemplo.com"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-black text-zinc-900">Senha</label>
        <div className="flex h-12 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 focus-within:border-zinc-500">
          <LockKeyhole size={17} className="text-zinc-400" />
          <input
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            className="text-zinc-500"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Entrando..." : "Entrar"}
        {!loading ? <ArrowRight size={18} /> : null}
      </button>
    </form>
  );
}
