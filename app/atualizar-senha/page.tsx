"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, LockKeyhole, RefreshCcw } from "lucide-react";
import { getErrorMessage } from "@/lib/get-error-message";

const MENSAGEM_ERRO_LINK =
  "Nao foi possivel validar este link de recuperacao. Por seguranca, a redefinicao de senha deve ser concluida no mesmo navegador e dispositivo em que a solicitacao foi feita. Solicite um novo link e abra-o no mesmo navegador para continuar.";

function getRecoveryRedirectReason(error: unknown) {
  const text =
    error instanceof Error ? error.message.toLowerCase() : String(error || "").toLowerCase();

  if (
    text.includes("expired") ||
    text.includes("otp_expired") ||
    text.includes("token has expired") ||
    text.includes("refresh token") ||
    text.includes("invalid grant")
  ) {
    return "recuperacao_expirada";
  }

  return "recuperacao_invalida";
}

export default function AtualizarSenhaPage() {
  const router = useRouter();
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(
    null
  );

  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [validandoLink, setValidandoLink] = useState(true);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [erroSessaoRecuperacao, setErroSessaoRecuperacao] = useState(false);
  const [modoSenha, setModoSenha] = useState<"recovery" | "authenticated" | null>(
    null
  );
  const [motivoFalhaRecuperacao, setMotivoFalhaRecuperacao] = useState<
    "recuperacao_invalida" | "recuperacao_expirada"
  >("recuperacao_invalida");

  useEffect(() => {
    try {
      setSupabase(createClient());
    } catch (error) {
      console.warn("Supabase indisponivel para atualizar senha:", error);
      setErro("Servico de autenticacao indisponivel neste ambiente.");
      setValidandoLink(false);
    }
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;

    async function prepararSessaoDeRecuperacao() {
      try {
        setErro("");
        setErroSessaoRecuperacao(false);
        setMotivoFalhaRecuperacao("recuperacao_invalida");

        const {
          data: { session: sessaoExistenteAntes },
        } = await client.auth.getSession();

        if (sessaoExistenteAntes) {
          setModoSenha("authenticated");
          setValidandoLink(false);
          return;
        }

        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          const { error } = await client.auth.exchangeCodeForSession(code);

          if (error) {
            const {
              data: { session: sessaoAposErro },
            } = await client.auth.getSession();

            if (sessaoAposErro) {
              setValidandoLink(false);
              return;
            }

            setMotivoFalhaRecuperacao(getRecoveryRedirectReason(error));
            setErroSessaoRecuperacao(true);
            throw new Error(MENSAGEM_ERRO_LINK);
          }

          window.history.replaceState({}, document.title, "/atualizar-senha");
          setModoSenha("recovery");
          setValidandoLink(false);
          return;
        }

        const hash = window.location.hash?.replace(/^#/, "");
        if (hash) {
          const params = new URLSearchParams(hash);
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");

          if (access_token && refresh_token) {
            const { error } = await client.auth.setSession({
              access_token,
              refresh_token,
            });

            if (error) {
              const {
                data: { session: sessaoAposErro },
              } = await client.auth.getSession();

              if (sessaoAposErro) {
                setValidandoLink(false);
                return;
              }

              setMotivoFalhaRecuperacao(getRecoveryRedirectReason(error));
              setErroSessaoRecuperacao(true);
              throw new Error(MENSAGEM_ERRO_LINK);
            }

            window.history.replaceState({}, document.title, "/atualizar-senha");
            setModoSenha("recovery");
            setValidandoLink(false);
            return;
          }
        }

        const {
          data: { session: sessaoFinal },
        } = await client.auth.getSession();

        if (sessaoFinal) {
          setModoSenha("authenticated");
          setValidandoLink(false);
          return;
        }

        setErroSessaoRecuperacao(true);
        setMotivoFalhaRecuperacao("recuperacao_invalida");
        setModoSenha(null);
        throw new Error(MENSAGEM_ERRO_LINK);
      } catch (e: unknown) {
        console.error("ERRO AO PREPARAR SESSAO:", e);
        setModoSenha(null);
        setErro(getErrorMessage(e, "Erro ao validar link de recuperacao."));
      } finally {
        setValidandoLink(false);
      }
    }

    prepararSessaoDeRecuperacao();
  }, [supabase]);

  async function handleAtualizarSenha(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setErro("");
    setSucesso("");

    try {
      if (!supabase) {
        throw new Error("Servico de autenticacao indisponivel neste ambiente.");
      }

      if (!senha.trim()) {
        throw new Error("Informe a nova senha.");
      }

      if (senha.trim().length < 6) {
        throw new Error("A senha deve ter pelo menos 6 caracteres.");
      }

      if (senha !== confirmarSenha) {
        throw new Error("As senhas nao coincidem.");
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setErroSessaoRecuperacao(true);
        throw new Error(MENSAGEM_ERRO_LINK);
      }

      const { error } = await supabase.auth.updateUser({
        password: senha,
      });

      if (error) {
        if (
          error.message?.toLowerCase().includes("auth session missing") ||
          error.message?.toLowerCase().includes("session")
        ) {
          setErroSessaoRecuperacao(true);
          throw new Error(MENSAGEM_ERRO_LINK);
        }

        throw new Error(error.message || "Nao foi possivel atualizar a senha.");
      }

      await supabase.auth.signOut();

      setSucesso(
        modoSenha === "authenticated"
          ? "Senha atualizada com sucesso. Encerrando a sessao atual para voce entrar novamente com a nova senha..."
          : "Senha atualizada com sucesso. Redirecionando para o login..."
      );

      setTimeout(() => {
        router.push("/login?motivo=senha_atualizada");
      }, 1800);
    } catch (e: unknown) {
      console.error("ERRO ATUALIZAR SENHA:", e);
      setErro(getErrorMessage(e, "Erro ao atualizar senha."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4">
      <div className="w-full max-w-md rounded-[24px] border border-zinc-200 bg-white p-6 shadow-xl">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-[1.85rem] font-bold text-zinc-900">Nova senha</h2>

          <button
            type="button"
            onClick={() => router.push("/login")}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1.5 text-[11px] font-semibold text-zinc-600 transition hover:border-zinc-900 hover:text-zinc-900"
          >
            <ArrowLeft size={14} />
            Login
          </button>
        </div>

        <p className="mt-2 text-sm text-zinc-500">
          {modoSenha === "authenticated"
            ? "Voce ja esta autenticado neste navegador. Atualize sua senha e entre novamente com a nova credencial."
            : "Digite e confirme sua nova senha"}
        </p>

        <form onSubmit={handleAtualizarSenha} className="mt-5 space-y-3.5">
          <div>
            <label className="text-sm font-medium text-zinc-700">
              Nova senha
            </label>

            <div className="mt-2 flex items-center gap-3 rounded-[20px] border border-zinc-300 px-4 py-2.5">
              <LockKeyhole size={18} className="text-zinc-500" />
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full bg-transparent outline-none"
                disabled={validandoLink || loading}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-700">
              Confirmar nova senha
            </label>

            <div className="mt-2 flex items-center gap-3 rounded-[20px] border border-zinc-300 px-4 py-2.5">
              <LockKeyhole size={18} className="text-zinc-500" />
              <input
                type="password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                className="w-full bg-transparent outline-none"
                disabled={validandoLink || loading}
              />
            </div>
          </div>

          {validandoLink ? (
            <div className="rounded-[20px] border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
              Validando link de recuperacao...
            </div>
          ) : null}

          {modoSenha === "authenticated" && !validandoLink ? (
            <div className="rounded-[20px] border border-sky-200 bg-sky-50 p-3.5 text-sm text-sky-800">
              <p className="font-semibold">Sessao autenticada detectada</p>
              <p className="mt-1 leading-6">
                Esta troca de senha esta sendo feita a partir de uma sessao ja autenticada
                neste navegador. Depois de salvar a nova senha, o acesso atual sera encerrado
                para evitar sessao velha.
              </p>
            </div>
          ) : null}

          {erro ? (
            <div className="rounded-[20px] border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-700">
              <div className="flex items-start gap-3">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Nao foi possivel concluir a validacao.</p>
                  <p className="mt-1 leading-6">{erro}</p>
                </div>
              </div>
            </div>
          ) : null}

          {erroSessaoRecuperacao ? (
            <div className="rounded-[20px] border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-800">
              <p className="font-semibold">Como resolver</p>
              <p className="mt-1 leading-6">
                Solicite um novo link de recuperacao e abra-o no mesmo navegador e dispositivo
                em que o pedido foi feito.
              </p>
              <p className="mt-2 leading-6">
                Exemplo: se voce pediu a recuperacao no Safari do iPhone, finalize tambem pelo
                Safari do iPhone.
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/recuperar-senha")}
                  className="inline-flex items-center gap-2 rounded-[20px] bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95"
                >
                  <RefreshCcw size={16} />
                  Solicitar novo link
                </button>

                <button
                  type="button"
                  onClick={() => router.push(`/login?motivo=${motivoFalhaRecuperacao}`)}
                  className="inline-flex items-center gap-2 rounded-[20px] border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                >
                  <ArrowLeft size={16} />
                  Voltar ao login
                </button>
              </div>
            </div>
          ) : null}

          {sucesso ? (
            <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              {sucesso}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading || validandoLink || erroSessaoRecuperacao}
            className="mt-3 w-full rounded-[20px] bg-zinc-900 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
          >
            {loading
              ? "Atualizando..."
              : validandoLink
                ? "Validando link..."
                : "Atualizar senha"}
          </button>
        </form>
      </div>
    </div>
  );
}
