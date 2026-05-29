import Link from "next/link";
import { Save, Trash2 } from "lucide-react";
import ProfissionalSurface from "@/components/profissional/ui/ProfissionalSurface";
import {
  excluirServicoProfissionalAction,
  salvarServicoProfissionalAction,
} from "./actions";

type CategoriaOption = {
  id: string;
  nome: string | null;
};

type ServicoFormData = {
  id?: string | null;
  nome?: string | null;
  descricao?: string | null;
  id_categoria?: string | null;
  duracao_minutos?: number | string | null;
  pausa_minutos?: number | string | null;
  preco_padrao?: number | string | null;
  preco?: number | string | null;
  ativo?: boolean | null;
  app_cliente_visivel?: boolean | null;
  cobra_sinal_agendamento?: boolean | null;
  sinal_percentual_personalizado?: number | string | null;
};

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatNumber(value: unknown) {
  const parsed = toNumber(value, 0);
  return parsed ? String(parsed).replace(".", ",") : "";
}

export default function ServicoProfissionalForm({
  servico,
  categorias,
  podeExcluir,
  motivoBloqueioExclusao,
}: {
  servico?: ServicoFormData | null;
  categorias: CategoriaOption[];
  podeExcluir?: boolean;
  motivoBloqueioExclusao?: string | null;
}) {
  const isEdit = Boolean(servico?.id);
  const ativo = servico?.ativo !== false;
  const appClienteVisivel = servico?.app_cliente_visivel !== false;
  const cobraSinal = Boolean(servico?.cobra_sinal_agendamento);
  const preco = servico?.preco_padrao ?? servico?.preco ?? 0;

  return (
    <div className="space-y-3.5">
      <ProfissionalSurface>
        <form action={salvarServicoProfissionalAction} className="space-y-4">
          <input type="hidden" name="servico_id" value={servico?.id || ""} />

          <div>
            <label className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">
              Nome do servico
            </label>
            <input
              name="nome"
              defaultValue={servico?.nome || ""}
              required
              className="mt-2 h-12 w-full rounded-[1rem] border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-950 outline-none focus:border-zinc-950"
              placeholder="Ex: Manicure"
            />
          </div>

          <div>
            <label className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">
              Descricao
            </label>
            <textarea
              name="descricao"
              defaultValue={servico?.descricao || ""}
              rows={3}
              className="mt-2 w-full rounded-[1rem] border border-zinc-200 bg-white px-3 py-3 text-sm font-medium text-zinc-950 outline-none focus:border-zinc-950"
              placeholder="Detalhe rapido para equipe e cliente."
            />
          </div>

          <div>
            <label className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">
              Categoria
            </label>
            <select
              name="id_categoria"
              defaultValue={servico?.id_categoria || ""}
              className="mt-2 h-12 w-full rounded-[1rem] border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-950 outline-none focus:border-zinc-950"
            >
              <option value="">Sem categoria</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nome || "Categoria"}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">
                Duracao
              </label>
              <input
                name="duracao_minutos"
                type="number"
                min={5}
                step={5}
                defaultValue={toNumber(servico?.duracao_minutos, 60)}
                required
                className="mt-2 h-12 w-full rounded-[1rem] border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-950 outline-none focus:border-zinc-950"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">
                Pausa
              </label>
              <input
                name="pausa_minutos"
                type="number"
                min={0}
                step={5}
                defaultValue={toNumber(servico?.pausa_minutos, 0)}
                className="mt-2 h-12 w-full rounded-[1rem] border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-950 outline-none focus:border-zinc-950"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">
                Valor
              </label>
              <input
                name="preco_padrao"
                inputMode="decimal"
                defaultValue={formatNumber(preco)}
                className="mt-2 h-12 w-full rounded-[1rem] border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-950 outline-none focus:border-zinc-950"
                placeholder="0,00"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">
                Sinal %
              </label>
              <input
                name="sinal_percentual_personalizado"
                type="number"
                min={0}
                max={100}
                step={1}
                defaultValue={toNumber(servico?.sinal_percentual_personalizado, 0)}
                className="mt-2 h-12 w-full rounded-[1rem] border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-950 outline-none focus:border-zinc-950"
              />
            </div>
          </div>

          <div className="space-y-2 rounded-[1rem] border border-zinc-200 bg-zinc-50 p-3">
            <label className="flex items-center justify-between gap-3 text-sm font-bold text-zinc-800">
              <span>Servico ativo</span>
              <input name="ativo" type="checkbox" defaultChecked={ativo} className="h-5 w-5" />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm font-bold text-zinc-800">
              <span>Mostrar no app cliente</span>
              <input
                name="app_cliente_visivel"
                type="checkbox"
                defaultChecked={appClienteVisivel}
                className="h-5 w-5"
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm font-bold text-zinc-800">
              <span>Cobra sinal Pix</span>
              <input
                name="cobra_sinal_agendamento"
                type="checkbox"
                defaultChecked={cobraSinal}
                className="h-5 w-5"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-[18px] bg-zinc-950 px-4 text-sm font-black text-white">
              <Save size={16} />
              Salvar
            </button>
            <Link
              href="/app-profissional/servicos"
              className="inline-flex h-11 items-center justify-center rounded-[18px] border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-700"
            >
              Voltar
            </Link>
          </div>
        </form>
      </ProfissionalSurface>

      {isEdit ? (
        <ProfissionalSurface>
          <form action={excluirServicoProfissionalAction} className="space-y-3">
            <input type="hidden" name="servico_id" value={servico?.id || ""} />
            <div>
              <h2 className="text-base font-black tracking-[-0.03em] text-zinc-950">
                Excluir servico
              </h2>
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                {podeExcluir
                  ? "Disponivel somente para servicos sem agendamentos e sem comandas."
                  : motivoBloqueioExclusao ||
                    "Este servico possui vinculos e deve ser apenas inativado."}
              </p>
            </div>
            <button
              disabled={!podeExcluir}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[18px] border border-red-200 bg-red-50 px-4 text-sm font-black text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 size={16} />
              Excluir
            </button>
          </form>
        </ProfissionalSurface>
      ) : null}
    </div>
  );
}
