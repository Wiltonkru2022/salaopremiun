"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { getErrorMessage } from "@/lib/get-error-message";
import { getPublicAuthUrl } from "@/lib/auth/public-auth-url";
import {
  ArrowLeft,
  Check,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export default function RecuperarSenhaPage() {
  return (
    <Suspense fallback={<RecuperarSenhaFallback />}>
      <RecuperarSenhaContent />
    </Suspense>
  );
}

function RecuperarSenhaFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4">
      <div className="w-full max-w-xl rounded-[32px] border border-zinc-200 bg-white p-10 text-center shadow-2xl">
        <p className="text-sm text-zinc-500">Carregando recuperacao...</p>
      </div>
    </div>
  );
}

function RecuperarSenhaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [enviadoComSucesso, setEnviadoComSucesso] = useState(false);
  const emailQuery = searchParams.get("email")?.trim() || "";

  useEffect(() => {
    if (!emailQuery) return;
    setEmail((current) => current || emailQuery);
  }, [emailQuery]);

  useEffect(() => {
    if (cooldown <= 0) return;

    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldown]);

  async function handleRecuperarSenha(e: React.FormEvent) {
    e.preventDefault();
    if (loading || cooldown > 0) return;

    setLoading(true);
    setErro("");
    setSucesso("");
    setEnviadoComSucesso(false);

    try {
      const emailLimpo = email.trim();

      if (!emailLimpo) {
        throw new Error("Informe seu e-mail.");
      }

      const { error } = await supabase.auth.resetPasswordForEmail(emailLimpo, {
        redirectTo: getPublicAuthUrl(
          "/atualizar-senha",
          typeof window === "undefined" ? undefined : window.location.hostname
        ),
      });

      if (error) {
        const msg = error.message?.toLowerCase() || "";

        if (
          msg.includes("security purposes") ||
          msg.includes("only request this after") ||
          msg.includes("rate limit")
        ) {
          setCooldown(30);
          throw new Error(
            "Aguarde alguns segundos para solicitar um novo link. Por seguranca, limitamos o envio de e-mails em sequencia."
          );
        }

        throw new Error(
          error.message || "Nao foi possivel enviar o link de recuperacao."
        );
      }

      setSucesso(
        "Enviamos o link de recuperacao com sucesso. Verifique sua caixa de entrada e tambem o spam."
      );
      setEnviadoComSucesso(true);
      setCooldown(30);
    } catch (e: unknown) {
      console.error("ERRO RECUPERAR SENHA:", e);
      setErro(
        getErrorMessage(
          e,
          "Nao foi possivel enviar o link de recuperacao."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-4 py-8">
      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[36px] bg-white shadow-[0_25px_80px_rgba(0,0,0,0.12)] md:grid-cols-2">
        <div className="hidden bg-zinc-950 p-10 text-white md:flex md:flex-col md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-zinc-300">
              <Sparkles size={14} />
              SalaoPremium
            </div>

            <h1 className="mt-6 text-4xl font-bold leading-tight">
              Recuperacao de acesso com seguranca
            </h1>

            <p className="mt-4 max-w-md text-sm leading-7 text-zinc-300">
              Envie um link de redefinicao para seu e-mail e recupere o acesso
              ao painel do seu salao de forma rapida e segura.
            </p>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <p className="font-semibold">Fluxo protegido</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    Recuperacao com validacao segura.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                  <Mail size={20} />
                </div>
                <div>
                  <p className="font-semibold">Link por e-mail</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    Verifique tambem a pasta de spam.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                  <Check size={20} />
                </div>
                <div>
                  <p className="font-semibold">Redefinicao rapida</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    Em poucos passos voce volta ao sistema.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-10">
          <div className="mx-auto max-w-md">
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition hover:text-zinc-900"
            >
              <ArrowLeft size={16} />
              Voltar para login
            </button>

            {!enviadoComSucesso ? (
              <>
                <div className="mb-8">
                  <h2 className="text-3xl font-bold tracking-tight text-zinc-900">
                    Recuperar senha
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    Digite seu e-mail para receber o link de redefinicao
                  </p>
                </div>

                <form onSubmit={handleRecuperarSenha} className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-zinc-700">
                      E-mail
                    </label>

                    <div className="flex items-center gap-3 rounded-[24px] border border-zinc-300 bg-white px-4 py-4 transition focus-within:border-zinc-900 focus-within:ring-4 focus-within:ring-zinc-200">
                      <Mail size={18} className="text-zinc-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seuemail@exemplo.com"
                        className="w-full bg-transparent text-sm text-zinc-900 outline-none"
                        required
                      />
                    </div>
                  </div>

                  {erro ? (
                    <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm leading-6 text-rose-700">
                      {erro}
                    </div>
                  ) : null}

                  {cooldown > 0 && !enviadoComSucesso ? (
                    <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-800">
                      Voce podera solicitar novamente em{" "}
                      <span className="font-bold">{cooldown}s</span>.
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={loading || cooldown > 0}
                    className="flex h-14 w-full items-center justify-center rounded-[24px] bg-zinc-950 px-5 text-base font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <span className="flex items-center gap-3">
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Enviando link...
                      </span>
                    ) : cooldown > 0 ? (
                      `Aguarde ${cooldown}s`
                    ) : (
                      "Enviar link de recuperacao"
                    )}
                  </button>
                </form>

                <div className="mt-6 rounded-[28px] border border-zinc-200 bg-zinc-50 px-5 py-5 text-sm leading-6 text-zinc-600">
                  Depois de clicar no link enviado por e-mail, voce sera
                  redirecionado para criar uma nova senha.
                </div>
              </>
            ) : (
              <div className="animate-in fade-in duration-300">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 shadow-inner">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg">
                      <Check size={30} strokeWidth={3} />
                    </div>
                  </div>

                  <h2 className="text-3xl font-bold tracking-tight text-zinc-900">
                    Link enviado
                  </h2>

                  <p className="mt-3 max-w-sm text-sm leading-7 text-zinc-500">
                    Enviamos as instrucoes de recuperacao para o e-mail{" "}
                    <span className="font-semibold text-zinc-800">{email}</span>.
                  </p>

                  <div className="mt-6 w-full rounded-[28px] border border-emerald-200 bg-emerald-50 px-5 py-5 text-left text-sm leading-6 text-emerald-800">
                    <p className="font-semibold">Tudo certo por aqui.</p>
                    <p className="mt-1">{sucesso}</p>
                  </div>

                  <div className="mt-5 w-full rounded-[28px] border border-zinc-200 bg-zinc-50 px-5 py-5 text-left text-sm leading-6 text-zinc-600">
                    <p className="font-semibold text-zinc-800">Importante</p>
                    <p className="mt-1">
                      Abra o link no mesmo navegador e dispositivo em que a
                      solicitacao foi feita. Para evitar erro de dominio ou
                      sessao velha, finalize a troca de senha sempre pelo link
                      seguro enviado no e-mail.
                    </p>
                  </div>

                  <div className="mt-6 grid w-full gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEnviadoComSucesso(false);
                        setErro("");
                        setSucesso("");
                      }}
                      disabled={cooldown > 0}
                      className="flex h-14 items-center justify-center rounded-[24px] border border-zinc-300 bg-white px-5 text-base font-semibold text-zinc-900 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {cooldown > 0
                        ? `Reenviar em ${cooldown}s`
                        : "Enviar novamente"}
                    </button>

                    <button
                      type="button"
                      onClick={() => router.push("/login")}
                      className="flex h-14 items-center justify-center rounded-[24px] bg-zinc-950 px-5 text-base font-semibold text-white transition hover:opacity-95"
                    >
                      Voltar ao login
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
