import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";
import ProfissionalStatCard from "@/components/profissional/cards/ProfissionalStatCard";

const repasses = [
  { data: "10/04/2026", valor: "R$ 850,00", status: "Pago" },
  { data: "03/04/2026", valor: "R$ 620,00", status: "Pago" },
  { data: "27/03/2026", valor: "R$ 580,00", status: "Pago" },
];

export default function ComissaoProfissionalPage() {
  return (
    <ProfissionalShell
      title="Comissão"
      subtitle="Resumo e repasses"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <ProfissionalStatCard
            label="Comissão do mês"
            value="R$ 2.350,00"
            helper="+12% vs março"
          />
          <ProfissionalStatCard
            label="Ticket médio"
            value="R$ 89,90"
            helper="Mês atual"
          />
        </div>

        <div className="rounded-[1.25rem] border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Últimos repasses
          </div>

          <div className="space-y-3">
            {repasses.map((repasse) => (
              <div
                key={`${repasse.data}-${repasse.valor}`}
                className="flex items-center justify-between rounded-2xl border border-zinc-100 bg-zinc-50 px-3 py-3"
              >
                <div>
                  <div className="text-sm font-medium text-zinc-900">
                    {repasse.data}
                  </div>
                  <div className="text-sm text-zinc-500">{repasse.valor}</div>
                </div>

                <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                  {repasse.status}
                </span>
              </div>
            ))}
          </div>

          <button className="mt-4 h-11 w-full rounded-2xl border border-zinc-200 bg-white text-sm font-semibold text-zinc-700">
            Ver extrato completo
          </button>
        </div>
      </div>
    </ProfissionalShell>
  );
}