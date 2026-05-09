import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import { requireClienteAppContext } from "@/lib/client-context.server";

function ToggleRow({
  label,
  helper,
  enabled = true,
}: {
  label: string;
  helper?: string;
  enabled?: boolean;
}) {
  return (
    <div className="flex min-h-20 items-center justify-between gap-4 border-b border-zinc-100 px-1">
      <div>
        <div className="text-lg text-zinc-950">{label}</div>
        {helper ? <div className="mt-1 text-sm text-zinc-500">{helper}</div> : null}
      </div>
      <span
        className={`relative h-9 w-16 rounded-full transition ${
          enabled ? "bg-teal-600" : "bg-zinc-200"
        }`}
      >
        <span
          className={`absolute top-1 h-7 w-7 rounded-full bg-white transition ${
            enabled ? "left-8" : "left-1"
          }`}
        />
      </span>
    </div>
  );
}

export default async function ClienteProfileSettingsPage() {
  await requireClienteAppContext();

  return (
    <ClientAppFrame title="Configuracoes" subtitle="Preferencias do app cliente.">
      <section className="mx-auto max-w-3xl px-4 py-4 md:px-6">
        <Link
          href="/app-cliente/perfil"
          className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-zinc-950 shadow-sm"
          aria-label="Voltar"
        >
          <ArrowLeft size={24} />
        </Link>

        <div className="rounded-[1.5rem] bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <div className="mb-3 bg-zinc-50 px-3 py-3 text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">
            Notificacoes
          </div>
          <ToggleRow label="Ativar notificacoes" />
          <ToggleRow
            label="Notificacao do app"
            helper="Avisos de reserva, reagendamento e avaliacao."
          />
          <ToggleRow label="E-mail" helper="Confirmacoes importantes no e-mail." />

          <div className="mb-3 mt-6 bg-zinc-50 px-3 py-3 text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">
            Conta
          </div>
          <Link
            href="/app-cliente/recuperar-acesso"
            className="flex min-h-16 items-center justify-between border-b border-zinc-100 px-1 text-lg text-zinc-950"
          >
            Alterar senha
            <ChevronRight size={26} className="text-zinc-300" />
          </Link>
          <div className="flex min-h-16 items-center justify-between border-b border-zinc-100 px-1 text-lg text-zinc-950">
            <span>
              <span className="block text-sm text-zinc-500">Idioma</span>
              Automatico (portugues)
            </span>
            <ChevronRight size={26} className="text-zinc-300" />
          </div>
          <div className="flex min-h-16 items-center justify-between px-1 text-lg text-zinc-950">
            <span>
              <span className="block text-sm text-zinc-500">Pais</span>
              Brasil
            </span>
            <ChevronRight size={26} className="text-zinc-300" />
          </div>
        </div>
      </section>
    </ClientAppFrame>
  );
}
