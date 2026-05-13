import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";

export const metadata = {
  title: "Termos do App Profissional | Salão Premium",
};

export default function ProfissionalTermosPage() {
  return (
    <ProfissionalShell title="Termos de uso" subtitle="Regras do App Profissional.">
      <article className="mx-auto max-w-3xl py-2 text-zinc-800">
        <div className="rounded-[1.5rem] bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <h1 className="text-2xl font-black tracking-[-0.04em] text-zinc-950">
            Termos do App Profissional
          </h1>
          <div className="mt-5 space-y-4 text-sm leading-7 text-zinc-600">
            <p>
              O App Profissional ajuda o profissional a acompanhar agenda,
              clientes, comandas, avaliações e comissões vinculadas ao salão.
            </p>
            <p>
              O acesso é concedido pelo salão. Permissões, serviços, horários,
              comissões e regras operacionais dependem da configuração do salão.
            </p>
            <p>
              O profissional deve usar o app com responsabilidade, manter a
              confidencialidade dos dados de clientes e registrar informações
              reais sobre atendimentos e comandas.
            </p>
            <p>
              Uso indevido, compartilhamento de acesso ou alteração indevida de
              dados pode gerar bloqueio pelo salão ou pela administração do
              sistema.
            </p>
          </div>
        </div>
      </article>
    </ProfissionalShell>
  );
}

