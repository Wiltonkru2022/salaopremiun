import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import { runAdminOperation } from "@/lib/supabase/admin-ops";

function formatCpf(value: string | null | undefined) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length !== 11) return value || "Não informado";

  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex min-h-16 flex-col justify-center border-b border-zinc-100 px-1">
      <span className="text-sm text-zinc-500">{label}</span>
      <span className="break-all text-lg text-zinc-950">
        {value || "Não informado"}
      </span>
    </div>
  );
}

export default async function DetalhesContaProfissionalPage() {
  const session = await requireProfissionalAppContext();
  const profissional = await runAdminOperation({
    action: "profissional_perfil_detalhes",
    actorId: session.idProfissional,
    idSalao: session.idSalao,
    run: async (supabase) => {
      const { data, error } = await supabase
        .from("profissionais")
        .select("nome, nome_exibicao, nome_social, telefone, whatsapp, email, cpf, pix_tipo, pix_chave, bio")
        .eq("id", session.idProfissional)
        .eq("id_salao", session.idSalao)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data;
    },
  });

  return (
    <ProfissionalShell
      title="Detalhes da conta"
      subtitle="Dados usados no App Profissional."
    >
      <section className="space-y-4 pb-8">
        <div className="rounded-[1.5rem] bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <div className="mb-3 bg-zinc-50 px-3 py-3 text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">
            Dados profissionais
          </div>
          <DetailRow label="Nome" value={profissional?.nome_exibicao || profissional?.nome_social || profissional?.nome} />
          <DetailRow label="Telefone" value={profissional?.telefone} />
          <DetailRow label="WhatsApp" value={profissional?.whatsapp} />
          <DetailRow label="E-mail" value={profissional?.email} />
          <DetailRow label="CPF" value={formatCpf(profissional?.cpf)} />
        </div>

        <div className="rounded-[1.5rem] bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <div className="mb-3 bg-zinc-50 px-3 py-3 text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">
            Recebimento
          </div>
          <DetailRow label="Tipo de chave Pix" value={profissional?.pix_tipo} />
          <DetailRow label="Chave Pix" value={profissional?.pix_chave} />
        </div>
      </section>
    </ProfissionalShell>
  );
}
