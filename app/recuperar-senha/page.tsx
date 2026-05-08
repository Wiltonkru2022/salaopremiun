"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getErrorMessage } from "@/lib/get-error-message";
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
      <div className="w-full max-w-xl rounded-[24px] border border-zinc-200 bg-white p-8 text-center shadow-xl">
        <p className="text-sm text-zinc-500">Carregando recuperação...</p>
      </div>
    </div>
  );
}

function RecuperarSenhaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

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

      const response = await fetch("/api/auth/password-recovery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: emailLimpo }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        const msg = String(payload.message || "").toLowerCase();

        if (
          msg.includes("security purposes") ||
          msg.includes("only request this after") ||
          msg.includes("rate limit")
        ) {
          setCooldown(30);
          throw new Error(
            "Aguarde alguns segundos para solicitar um novo link. Por segurança, limitamos o envio de e-mails em sequência."
          );
        }

        throw new Error(
          payload.message || "Não foi possível enviar o link de recuperação."
        );
      }

      setSucesso(
        "Enviamos o link de recuperação com sucesso. Verifique sua caixa de entrada e também o spam."
      );
      setEnviadoComSucesso(true);
      setCooldown(30);
    } catch (e: unknown) {
      console.error("ERRO RECUPERAR SENHA:", e);
      setErro(
        getErrorMessage(
          e,
          "Não foi possível enviar o link de recuperação."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <header className="flex h-[74px] items-center justify-between border-b border-zinc-200 bg-white px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-zinc-950">
            <img src="/favicon-preview.png" alt="" className="h-full w-full object-cover" />
          </span>
          <span className="font-display text-lg font-black tracking-[-0.03em]">
            SalaoPremium
          </span>
        </Link>

        <Link
          href="/login"
          className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-black text-zinc-800 transition hover:border-zinc-950"
        >
          Entrar
        </Link>
      </header>

      <main className="grid min-h-[calc(100vh-74px)] lg:grid-cols-2">
        <section
          className="relative hidden overflow-hidden bg-zinc-950 bg-cover bg-center lg:block"
          style={{ backgroundImage: "url('/site/cadastro-salão-bg.jpeg')" }}
        >
          <div className="absolute inset-0 bg-zinc-950/58" />
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-950/55 to-transparent" />

          <div className="relative flex h-full flex-col justify-between p-10 text-white xl:p-14">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-300">
              <Sparkles size={14} />
              SalaoPremium
            </div>

            <h1 className="mt-5 text-[2.2rem] font-bold leading-tight">
              Recuperacao de acesso com segurança
            </h1>

            <p className="mt-3 max-w-md text-sm leading-6 text-zinc-300">
              Envie um link de redefinicao para seu e-mail e recupere o acesso
              ao painel do seu salão de forma rápida e segura.
            </p>
          </div>

          <div className="space-y-3">
            <div className="rounded-[22px] border border-white/10 bg-white/[0.05] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[18px] bg-white/10">
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

            <div className="rounded-[22px] border border-white/10 bg-white/[0.05] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[18px] bg-white/10">
                  <Mail size={20} />
                </div>
                <div>
                  <p className="font-semibold">Link por e-mail</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    Verifique também a pasta de spam.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-white/[0.05] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[18px] bg-white/10">
                  <Check size={20} />
                </div>
                <div>
                  <p className="font-semibold">Redefinicao rápida</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    Em poucos passos você volta ao sistema.
                  </p>
                </div>
              </div>
            </div>
          </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-8 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-md">
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition hover:text-zinc-900"
            >
              <ArrowLeft size={16} />
              Voltar para login
            </button>

            {!enviadoComSucesso ? (
              <>
                <div className="mb-6">
                  <h2 className="text-[2rem] font-bold tracking-tight text-zinc-900">
                    Recuperar senha
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    Digite seu e-mail para receber o link de redefinicao
                  </p>
                </div>

                <form onSubmit={handleRecuperarSenha} className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-zinc-700">
                      E-mail
                    </label>

                    <div className="flex items-center gap-3 rounded-[20px] border border-zinc-300 bg-white px-4 py-3 transition focus-within:border-zinc-900 focus-within:ring-4 focus-within:ring-zinc-200">
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
                    <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm leading-6 text-rose-700">
                      {erro}
                    </div>
                  ) : null}

                  {cooldown > 0 && !enviadoComSucesso ? (
                    <div className="rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm leading-6 text-amber-800">
                      Você podera solicitar novamente em{" "}
                      <span className="font-bold">{cooldown}s</span>.
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={loading || cooldown > 0}
                    className="flex h-12 w-full items-center justify-center rounded-[20px] bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <span className="flex items-center gap-3">
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Enviando link...
                      </span>
                    ) : cooldown > 0 ? (
                      `Aguarde ${cooldown}s`
                    ) : (
                      "Enviar link de recuperação"
                    )}
                  </button>
                </form>

                <div className="mt-5 rounded-[22px] border border-zinc-200 bg-zinc-50 px-5 py-4 text-sm leading-6 text-zinc-600">
                  Depois de clicar no link enviado por e-mail, você será
                  redirecionado para criar uma nova senha.
                </div>
              </>
            ) : (
              <div className="animate-in fade-in duration-300">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 shadow-inner">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg">
                      <Check size={26} strokeWidth={3} />
                    </div>
                  </div>

                  <h2 className="text-[2rem] font-bold tracking-tight text-zinc-900">
                    Link enviado
                  </h2>

                  <p className="mt-3 max-w-sm text-sm leading-7 text-zinc-500">
                    Enviamos as instrucoes de recuperação para o e-mail{" "}
                    <span className="font-semibold text-zinc-800">{email}</span>.
                  </p>

                  <div className="mt-5 w-full rounded-[22px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-left text-sm leading-6 text-emerald-800">
                    <p className="font-semibold">Tudo certo por aqui.</p>
                    <p className="mt-1">{sucesso}</p>
                  </div>

                  <div className="mt-4 w-full rounded-[22px] border border-zinc-200 bg-zinc-50 px-5 py-4 text-left text-sm leading-6 text-zinc-600">
                    <p className="font-semibold text-zinc-800">Importante</p>
                    <p className="mt-1">
                      Abra o link no mesmo navegador e dispositivo em que a
                      solicitação foi feita. Para evitar erro de dominio ou
                      sessao velha, finalize a troca de senha sempre pelo link
                      seguro enviado no e-mail.
                    </p>
                  </div>

                  <div className="mt-5 grid w-full gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEnviadoComSucesso(false);
                        setErro("");
                        setSucesso("");
                      }}
                      disabled={cooldown > 0}
                      className="flex h-12 items-center justify-center rounded-[20px] border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {cooldown > 0
                        ? `Reenviar em ${cooldown}s`
                        : "Enviar novamente"}
                    </button>

                    <button
                      type="button"
                      onClick={() => router.push("/login")}
                      className="flex h-12 items-center justify-center rounded-[20px] bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:opacity-95"
                    >
                      Voltar ao login
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
