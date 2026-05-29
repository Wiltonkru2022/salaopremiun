import { Save } from "lucide-react";
import ProfissionalNotificationSettings from "@/components/profissional/ProfissionalNotificationSettings";
import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import { runAdminOperation } from "@/lib/supabase/admin-ops";
import { salvarPixSinalProfissionalAction } from "./actions";

type SearchParams = Promise<{
  ok?: string;
  erro?: string;
}>;

export default async function ConfiguracoesProfissionalPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requireProfissionalAppContext();
  const { ok, erro } = await searchParams;
  const profissional = await runAdminOperation({
    action: "profissional_configuracoes_carregar",
    actorId: session.idProfissional,
    idSalao: session.idSalao,
    run: async (supabase) => {
      const { data, error } = await supabase
        .from("profissionais")
        .select(
          "nome, nome_social, whatsapp, notificacoes_ativas, notificacao_app_ativa, notificacao_email_ativa, pix_tipo, pix_chave, sinal_pix_proprio, sinal_pix_recebedor, sinal_whatsapp, sinal_confirmacao_responsavel"
        )
        .eq("id", session.idProfissional)
        .eq("id_salao", session.idSalao)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data;
    },
  });

  const row = profissional as {
    notificacoes_ativas?: boolean | null;
    notificacao_app_ativa?: boolean | null;
    notificacao_email_ativa?: boolean | null;
    nome?: string | null;
    nome_social?: string | null;
    whatsapp?: string | null;
    pix_tipo?: string | null;
    pix_chave?: string | null;
    sinal_pix_proprio?: boolean | null;
    sinal_pix_recebedor?: string | null;
    sinal_whatsapp?: string | null;
    sinal_confirmacao_responsavel?: string | null;
  } | null;

  const settings = {
    notificacoes_ativas: row?.notificacoes_ativas !== false,
    notificacao_app_ativa: row?.notificacao_app_ativa !== false,
    notificacao_email_ativa: row?.notificacao_email_ativa !== false,
  };
  const pixTipo = String(row?.pix_tipo || "").toUpperCase();
  const nomeRecebedor = row?.sinal_pix_recebedor || row?.nome_social || row?.nome || "";
  const whatsappRecebedor = row?.sinal_whatsapp || row?.whatsapp || "";

  return (
    <ProfissionalShell
      title="Configurações"
      subtitle="Preferências do App Profissional."
    >
      <section className="space-y-4 pb-8">
        {ok ? (
          <div className="rounded-[1.25rem] border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 shadow-sm">
            {ok}
          </div>
        ) : null}
        {erro ? (
          <div className="rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
            {erro}
          </div>
        ) : null}

        <div className="rounded-[1.5rem] bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <form action={salvarPixSinalProfissionalAction} className="space-y-4">
            <div>
              <h2 className="text-lg font-black tracking-[-0.03em] text-zinc-950">
                Pix do sinal
              </h2>
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                Dados usados quando o cliente paga o sinal para este profissional.
              </p>
            </div>

            <label className="flex items-center justify-between gap-3 rounded-[1rem] border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm font-bold text-zinc-800">
              <span>Receber sinal no Pix proprio</span>
              <input
                name="sinal_pix_proprio"
                type="checkbox"
                defaultChecked={row?.sinal_pix_proprio === true}
                className="h-5 w-5"
              />
            </label>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">
                Tipo da chave Pix
              </label>
              <select
                name="pix_tipo"
                defaultValue={pixTipo}
                className="mt-2 h-12 w-full rounded-[1rem] border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-950 outline-none focus:border-zinc-950"
              >
                <option value="">Selecione</option>
                <option value="CPF">CPF</option>
                <option value="CNPJ">CNPJ</option>
                <option value="TELEFONE">Telefone</option>
                <option value="EMAIL">E-mail</option>
                <option value="ALEATORIA">Chave aleatoria</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">
                Chave Pix
              </label>
              <input
                name="pix_chave"
                defaultValue={row?.pix_chave || ""}
                className="mt-2 h-12 w-full rounded-[1rem] border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-950 outline-none focus:border-zinc-950"
                placeholder="CPF, telefone, e-mail ou chave aleatoria"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">
                Nome do recebedor
              </label>
              <input
                name="sinal_pix_recebedor"
                defaultValue={nomeRecebedor}
                className="mt-2 h-12 w-full rounded-[1rem] border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-950 outline-none focus:border-zinc-950"
                placeholder="Nome que aparece para a cliente"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">
                WhatsApp do recebedor
              </label>
              <input
                name="sinal_whatsapp"
                defaultValue={whatsappRecebedor}
                inputMode="tel"
                className="mt-2 h-12 w-full rounded-[1rem] border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-950 outline-none focus:border-zinc-950"
                placeholder="67999999999"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">
                Quem confirma o sinal
              </label>
              <select
                name="sinal_confirmacao_responsavel"
                defaultValue={row?.sinal_confirmacao_responsavel || "profissional"}
                className="mt-2 h-12 w-full rounded-[1rem] border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-950 outline-none focus:border-zinc-950"
              >
                <option value="profissional">Profissional</option>
                <option value="salao">Salao</option>
              </select>
            </div>

            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-[18px] bg-zinc-950 px-4 text-sm font-black text-white">
              <Save size={16} />
              Salvar Pix
            </button>
          </form>
        </div>

        <div className="rounded-[1.5rem] bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <ProfissionalNotificationSettings initialSettings={settings} />
        </div>
      </section>
    </ProfissionalShell>
  );
}
