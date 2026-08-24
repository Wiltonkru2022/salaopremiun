"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { PainelPageHeader } from "@/components/painel-ui";
import { createClient } from "@/lib/supabase/client";

export default function SegurancaConfiguracoesPage() {
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [mfaAtivo, setMfaAtivo] = useState(false);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function carregar() {
      try {
        setLoading(true);
        const { data, error } = await supabase.auth.mfa.listFactors();
        if (error) throw error;
        if (!cancelled) {
          setMfaAtivo(Boolean(data?.totp?.some((factor) => factor.status === "verified")));
        }
      } catch {
        if (!cancelled) setMfaAtivo(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void carregar();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function alterarSenha(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setErro("");
    setMsg("");

    if (novaSenha.length < 8) {
      setErro("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setErro("As senhas não conferem.");
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase.auth.updateUser({ password: novaSenha });
      if (error) throw error;
      setNovaSenha("");
      setConfirmarSenha("");
      setMsg("Senha alterada com sucesso.");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível alterar a senha.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <PainelPageHeader
        eyebrow="Configurações"
        title="Segurança da conta"
        description="Centralize aqui senha, verificação em 2 etapas e outras proteções da sua conta."
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[26px] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white">
              <ShieldCheck size={21} />
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-black ${mfaAtivo ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-600"}`}>
              {loading ? "Verificando..." : mfaAtivo ? "Ativada" : "Opcional"}
            </span>
          </div>
          <h2 className="mt-5 text-xl font-black tracking-[-0.03em] text-zinc-950">Verificação em 2 etapas</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Recurso opcional para proteger sua conta com um código do aplicativo autenticador.
          </p>
          <Link
            href="/seguranca/mfa?next=/configuracoes/seguranca"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-bold text-white"
          >
            {mfaAtivo ? "Gerenciar verificação" : "Configurar verificação"}
          </Link>
        </div>

        <div className="rounded-[26px] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-950 text-white">
            <KeyRound size={21} />
          </div>
          <h2 className="mt-5 text-xl font-black tracking-[-0.03em] text-zinc-950">Alterar senha</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">Troque a senha usada para entrar no painel.</p>

          <form onSubmit={alterarSenha} className="mt-5 space-y-3">
            <input
              type="password"
              value={novaSenha}
              onChange={(event) => setNovaSenha(event.target.value)}
              placeholder="Nova senha"
              autoComplete="new-password"
              className="h-12 w-full rounded-2xl border border-zinc-300 px-4 text-sm outline-none focus:border-zinc-950"
            />
            <input
              type="password"
              value={confirmarSenha}
              onChange={(event) => setConfirmarSenha(event.target.value)}
              placeholder="Confirmar nova senha"
              autoComplete="new-password"
              className="h-12 w-full rounded-2xl border border-zinc-300 px-4 text-sm outline-none focus:border-zinc-950"
            />

            {erro ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{erro}</div> : null}
            {msg ? <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700"><CheckCircle2 size={17} />{msg}</div> : null}

            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-bold text-white disabled:opacity-50"
            >
              {saving ? <Loader2 size={17} className="animate-spin" /> : <KeyRound size={17} />}
              {saving ? "Salvando..." : "Alterar senha"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
