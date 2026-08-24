"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }
  return value;
}

export default function MfaPage() {
  return (
    <Suspense fallback={<MfaLoading />}>
      <MfaContent />
    </Suspense>
  );
}

function MfaLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-sm text-zinc-600 shadow-sm">
        <Loader2 className="animate-spin" size={18} /> Preparando verificacao em duas etapas...
      </div>
    </main>
  );
}

function MfaContent() {
  const searchParams = useSearchParams();
  const next = useMemo(() => safeNext(searchParams.get("next")), [searchParams]);
  const adminMaster = searchParams.get("mode") === "admin-master";
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [factorId, setFactorId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [setup, setSetup] = useState(false);
  const [error, setError] = useState("");

  async function finish() {
    if (adminMaster) {
      const response = await fetch("/api/admin-master/auth/finalize-mfa", {
        method: "POST",
        cache: "no-store",
        credentials: "include",
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; message?: string; redirectTo?: string }
        | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message || "Nao foi possivel concluir o MFA do Admin Master.");
      }
      window.location.replace(payload.redirectTo || next || "/admin-master");
      return;
    }

    window.location.replace(next);
  }

  useEffect(() => {
    let cancelled = false;

    async function prepare() {
      try {
        setLoading(true);
        setError("");

        const { data: assurance, error: assuranceError } =
          await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (assuranceError) throw assuranceError;
        if (assurance.currentLevel === "aal2") {
          await finish();
          return;
        }

        const { data: factors, error: factorsError } =
          await supabase.auth.mfa.listFactors();
        if (factorsError) throw factorsError;
        if (cancelled) return;

        const verified = factors.totp.find((factor) => factor.status === "verified");
        if (verified) {
          setFactorId(verified.id);
          setSetup(false);
          return;
        }

        // Fatores TOTP incompletos nao devem se acumular. Remove os pendentes
        // antes de gerar um novo QR Code de configuracao.
        for (const pending of factors.totp.filter((factor) => factor.status !== "verified")) {
          await supabase.auth.mfa.unenroll({ factorId: pending.id }).catch(() => null);
        }

        const { data: enrollment, error: enrollmentError } =
          await supabase.auth.mfa.enroll({
            factorType: "totp",
            friendlyName: adminMaster
              ? "SalaoPremium Admin Master"
              : "SalaoPremium Administrador",
          });
        if (enrollmentError) throw enrollmentError;
        if (cancelled) return;

        setFactorId(enrollment.id);
        setQrCode(enrollment.totp.qr_code || "");
        setSecret(enrollment.totp.secret || "");
        setSetup(true);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Nao foi possivel preparar o MFA.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void prepare();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    if (verifying || !factorId || code.trim().length < 6) return;

    try {
      setVerifying(true);
      setError("");
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: code.trim(),
      });
      if (verifyError) throw verifyError;

      const { data: assurance, error: assuranceError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assuranceError) throw assuranceError;
      if (assurance.currentLevel !== "aal2") {
        throw new Error("A verificacao nao elevou a sessao para AAL2.");
      }

      await finish();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Codigo invalido. Tente novamente.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-4 sm:p-6">
      <div className="mx-auto mt-8 max-w-lg rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-950 text-white">
          <ShieldCheck size={24} />
        </div>
        <h1 className="mt-5 text-2xl font-black text-zinc-950">Verificacao em duas etapas</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Administradores usam um codigo temporario do aplicativo autenticador para proteger dados financeiros, assinatura, Pix, e-mail e configuracoes sensiveis.
        </p>

        {loading ? (
          <div className="mt-6 flex items-center gap-3 rounded-2xl bg-zinc-50 px-4 py-4 text-sm text-zinc-600">
            <Loader2 className="animate-spin" size={18} /> Carregando seguranca da conta...
          </div>
        ) : (
          <form onSubmit={verify} className="mt-6 space-y-5">
            {setup ? (
              <div className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-sm font-bold text-zinc-900">1. Escaneie o QR Code</p>
                <p className="text-xs leading-5 text-zinc-600">
                  Abra Google Authenticator, Microsoft Authenticator, 1Password ou outro app TOTP e adicione uma nova conta.
                </p>
                {qrCode ? (
                  // Supabase fornece um data URI seguro para o QR do fator recém-criado.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrCode} alt="QR Code do autenticador" className="mx-auto h-52 w-52 rounded-xl bg-white p-2" />
                ) : null}
                {secret ? (
                  <div className="rounded-xl border border-zinc-200 bg-white p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Chave manual</div>
                    <div className="mt-1 break-all font-mono text-sm font-bold text-zinc-900">{secret}</div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Seu autenticador ja esta configurado. Digite o codigo atual para entrar.
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-bold text-zinc-800">
                {setup ? "2. Digite o codigo de 6 digitos" : "Codigo de 6 digitos"}
              </label>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus={!setup}
                placeholder="000000"
                className="h-14 w-full rounded-2xl border border-zinc-300 px-4 text-center font-mono text-2xl font-black tracking-[0.35em] outline-none transition focus:border-zinc-900"
              />
            </div>

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
            ) : null}

            <button
              type="submit"
              disabled={verifying || code.length !== 6 || !factorId}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {verifying ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
              {verifying ? "Verificando..." : "Confirmar e continuar"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
