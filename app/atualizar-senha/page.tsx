"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, LockKeyhole, RefreshCcw } from "lucide-react";
import { getErrorMessage } from "@/lib/get-error-message";

const MENSAGEM_ERRO_LINK =
  "Não foi possível validar este link de recuperação. Por segurança, a redefinição de senha deve ser concluída no mesmo navegador e dispositivo em que a solicitação foi feita. Solicite um novo link e abra-o no mesmo navegador para continuar.";

export default function AtualizarSenhaPage() {
  const router = useRouter();

  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null);
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [validandoLink, setValidandoLink] = useState(true);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [erroSessaoRecuperacao, setErroSessaoRecuperacao] = useState(false);

  useEffect(() => {
    setSupabase(createClient());
  }, []);

useEffect(() => {
  if (!supabase) return;

  const client = supabase;

  async function prepararSessaoDeRecuperacao() {
    try {
      setErro("");
      setErroSessaoRecuperacao(false);

      const {
        data: { session: sessaoExistenteAntes },
      } = await client.auth.getSession();

      if (sessaoExistenteAntes) {
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

          setErroSessaoRecuperacao(true);
          throw new Error(MENSAGEM_ERRO_LINK);
        }

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

            setErroSessaoRecuperacao(true);
            throw new Error(MENSAGEM_ERRO_LINK);
          }

          setValidandoLink(false);
          return;
        }
      }

      const {
        data: { session: sessaoFinal },
      } = await client.auth.getSession();

      if (sessaoFinal) {
        setValidandoLink(false);
        return;
      }

      setErroSessaoRecuperacao(true);
      throw new Error(MENSAGEM_ERRO_LINK);
    } catch (e: unknown) {
      console.error("ERRO AO PREPARAR SESSÃO:", e);
      setErro(getErrorMessage(e, "Erro ao validar link de recuperação."));
    } finally {
      setValidandoLink(false);
    }
  }

  prepararSessaoDeRecuperacao();
}, [supabase]);

  async function handleAtualizarSenha(e: React.FormEvent) {
    e.preventDefault();

    if (!supabase) {
      setErro("Cliente de autenticação ainda não carregado.");
      return;
    }

    setLoading(true);
    setErro("");
    setSucesso("");

    try {
      if (!senha.trim()) {
        throw new Error("Informe a nova senha.");
      }

      if (senha.trim().length < 6) {
        throw new Error("A senha deve ter pelo menos 6 caracteres.");
      }

      if (senha !== confirmarSenha) {
        throw new Error("As senhas não coincidem.");
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

        throw new Error(error.message || "Não foi possível atualizar a senha.");
      }

      setSucesso("Senha atualizada com sucesso. Redirecionando para o login...");

      setTimeout(() => {
        router.push("/login");
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
      <div className="w-full max-w-md rounded-[32px] bg-white p-8 shadow-2xl">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-zinc-900">Nova senha</h2>

          <button
            type="button"
            onClick={() => router.push("/login")}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-600 transition hover:border-zinc-900 hover:text-zinc-900"
          >
            <ArrowLeft size={14} />
            Login
          </button>
        </div>

        <p className="mt-2 text-sm text-zinc-500">
          Digite e confirme sua nova senha
        </p>

        <form onSubmit={handleAtualizarSenha} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-zinc-700">
              Nova senha
            </label>

            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-zinc-300 px-4 py-3">
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

            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-zinc-300 px-4 py-3">
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
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
              Validando link de recuperação...
            </div>
          ) : null}

          {erro ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              <div className="flex items-start gap-3">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Não foi possível concluir a validação.</p>
                  <p className="mt-1 leading-6">{erro}</p>
                </div>
              </div>
            </div>
          ) : null}

          {erroSessaoRecuperacao ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <p className="font-semibold">Como resolver</p>
              <p className="mt-1 leading-6">
                Solicite um novo link de recuperação e abra-o no mesmo navegador e dispositivo
                em que o pedido foi feito.
              </p>
              <p className="mt-2 leading-6">
                Exemplo: se você pediu a recuperação no Safari do iPhone, finalize também pelo
                Safari do iPhone.
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/recuperar-senha")}
                  className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 font-semibold text-white transition hover:opacity-95"
                >
                  <RefreshCcw size={16} />
                  Solicitar novo link
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="inline-flex items-center gap-2 rounded-2xl border border-zinc-300 bg-white px-4 py-3 font-semibold text-zinc-700 transition hover:bg-zinc-50"
                >
                  <ArrowLeft size={16} />
                  Voltar ao login
                </button>
              </div>
            </div>
          ) : null}

          {sucesso ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              {sucesso}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading || validandoLink || erroSessaoRecuperacao || !supabase}
            className="mt-4 w-full rounded-2xl bg-zinc-900 py-3 font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
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
