"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/db/client";

type MigrationStatus = {
  loading: boolean;
  connected: boolean;
  hasIdentity: boolean;
  error: string | null;
};

export default function ClienteAppMigrationCard({ clienteId }: { clienteId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState<MigrationStatus>({
    loading: true,
    connected: false,
    hasIdentity: false,
    error: null,
  });

  useEffect(() => {
    if (!clienteId) {
      setStatus({ loading: false, connected: false, hasIdentity: false, error: null });
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        setStatus((prev) => ({ ...prev, loading: true, error: null }));
        const [clienteResult, authResult] = await Promise.all([
          supabase
            .from("clientes")
            .select("cpf, data_nascimento")
            .eq("id", clienteId)
            .limit(1)
            .maybeSingle(),
          supabase
            .from("clientes_auth")
            .select("app_conta_id, app_ativo")
            .eq("id_cliente", clienteId)
            .limit(1)
            .maybeSingle(),
        ]);

        if (clienteResult.error) throw clienteResult.error;
        if (authResult.error) throw authResult.error;

        const cpf = String(clienteResult.data?.cpf || "").replace(/\D/g, "");
        const dataNascimento = String(clienteResult.data?.data_nascimento || "").trim();
        const connected = Boolean(
          authResult.data?.app_conta_id && authResult.data?.app_ativo !== false
        );
        const hasIdentity = cpf.length === 11 && Boolean(dataNascimento);

        if (!cancelled) {
          setStatus({ loading: false, connected, hasIdentity, error: null });
        }
      } catch (error) {
        console.error("[CLIENTE_APP_MIGRATION_STATUS_ERROR]", error);
        if (!cancelled) {
          setStatus({
            loading: false,
            connected: false,
            hasIdentity: false,
            error: "Não foi possível conferir o status do App Cliente agora.",
          });
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [clienteId, supabase]);

  const label = status.loading
    ? "Verificando status..."
    : status.connected && status.hasIdentity
      ? "App Cliente: atualizado para CPF + nascimento"
      : status.connected
        ? "App Cliente: atualização pendente"
        : status.hasIdentity
          ? "App Cliente: dados de identidade preenchidos, conta ainda não conectada"
          : "App Cliente: atualização pendente";

  const tone = status.connected && status.hasIdentity
    ? "border-emerald-200 bg-emerald-50 text-emerald-950"
    : "border-amber-200 bg-amber-50 text-amber-950";

  return (
    <div className={`mx-auto max-w-7xl rounded-[22px] border p-4 shadow-sm ${tone}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] opacity-70">
            Acesso do cliente
          </div>
          <div className="mt-1 text-base font-black">{label}</div>
          <p className="mt-1 text-sm leading-5 opacity-80">
            {status.connected && status.hasIdentity
              ? "CPF e data de nascimento já estão prontos para o novo login."
              : "Gere um link individual para o cliente concluir CPF, data de nascimento e WhatsApp sem perder histórico ou agendamentos."}
          </p>
          {status.error ? (
            <p className="mt-2 text-sm font-semibold text-red-700">{status.error}</p>
          ) : null}
        </div>

        <Link
          href={`/clientes/migracao-acesso?cliente=${encodeURIComponent(clienteId)}`}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-800"
        >
          {status.connected && status.hasIdentity ? "Revisar App Cliente" : "Atualizar App Cliente"}
        </Link>
      </div>
    </div>
  );
}
