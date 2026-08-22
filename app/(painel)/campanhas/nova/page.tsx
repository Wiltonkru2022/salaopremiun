import { redirect } from "next/navigation";
import { ArrowLeft, Scissors, Sparkles } from "lucide-react";
import {
  PainelLinkButton,
  PainelPageHeader,
} from "@/components/painel-ui";
import { criarCampanhaCupomAction } from "../actions";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { canUsePlanFeature } from "@/lib/plans/access";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const metadata = {
  title: "Nova campanha",
};

type SearchParams = {
  erro?: string | string[];
  template?: string | string[];
};

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value || "";
}

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function futureDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

async function loadServicos(idSalao: string) {
  const { data } = await (getSupabaseAdmin() as any)
    .from("servicos")
    .select("id, nome, preco, preco_padrao, ativo, app_cliente_visivel")
    .eq("id_salao", idSalao)
    .eq("ativo", true)
    .order("nome", { ascending: true })
    .limit(160);

  return (data || []) as Array<Record<string, unknown>>;
}

export default async function NovaCampanhaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { user, usuario } = await getPainelUserContext();
  if (!user || !usuario?.id_salao) redirect("/login");
  if (String(usuario.nivel || "").toLowerCase() !== "admin") redirect("/dashboard");

  const featureAccess = await canUsePlanFeature(usuario.id_salao, "campanhas");
  if (!featureAccess.allowed) {
    redirect(
      `/comparar-planos?recurso=campanhas&erro=${encodeURIComponent(
        featureAccess.reason || "Campanhas não está liberado no plano atual."
      )}`
    );
  }

  const params = await searchParams;
  const template = firstParam(params.template);
  const erro = firstParam(params.erro);
  const servicos = await loadServicos(usuario.id_salao);

  const isAniversario = template === "aniversario";
  const defaults = {
    tipo: isAniversario ? "aniversariantes" : "manual",
    titulo: isAniversario ? "Aniversariantes do mês" : "",
    slug: isAniversario ? "aniversariantes-mes" : "",
    codigo: isAniversario ? "NIVER" : "",
    descricaoInterna: isAniversario
      ? "Cupom criado para clientes aniversariantes do mês."
      : "",
    mensagemCliente: isAniversario
      ? "Feliz aniversário! Você ganhou um cupom especial para cuidar de você neste mês."
      : "",
    publicoAlvo: isAniversario ? "aniversariantes_mes" : "manual",
    publicoTipo: isAniversario ? "clientes_especificos" : "link",
    valorDesconto: isAniversario ? "10" : "",
    limiteTotal: isAniversario ? "50" : "",
  };

  return (
    <main className="space-y-6">
      <PainelPageHeader
        eyebrow="Nova campanha"
        title="Criar campanha"
        description="Configure dados, link, validade, limites, publico e servicos permitidos em uma tela propria."
        actions={
          <PainelLinkButton href="/campanhas" variant="secondary">
            <ArrowLeft size={16} />
            Voltar
          </PainelLinkButton>
        }
      />

      {erro ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {erro}
        </p>
      ) : null}

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900 shadow-sm">
        Campanhas ficam disponiveis apenas para Premium, Pro e teste gratis ativo.
        O plano Basico ve o convite de upgrade antes de usar.
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
        <form action={criarCampanhaCupomAction} className="space-y-6">
          <input type="hidden" name="tipo" value={defaults.tipo} />
          <input type="hidden" name="template" value={template} />
          <input type="hidden" name="publico_alvo" value={defaults.publicoAlvo} />

          <div className="grid gap-4 lg:grid-cols-3">
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Nome da campanha
              <input name="titulo" required defaultValue={defaults.titulo} className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 outline-none focus:border-zinc-950" placeholder="Promoção Escova Maio" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Slug do link
              <input name="slug" defaultValue={defaults.slug} className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 lowercase outline-none focus:border-zinc-950" placeholder="escova-maio" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Código
              <input name="codigo" defaultValue={defaults.codigo} className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 uppercase outline-none focus:border-zinc-950" placeholder="ESCOVA20" />
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Descrição interna
              <textarea name="descricao_interna" rows={3} defaultValue={defaults.descricaoInterna} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 outline-none focus:border-zinc-950" placeholder="Controle interno do salão." />
            </label>
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Mensagem para cliente
              <textarea name="mensagem_cliente" rows={3} defaultValue={defaults.mensagemCliente} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 outline-none focus:border-zinc-950" placeholder="Agende pelo link e ganhe 20% de desconto." />
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Status
              <select name="status_campanha" className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 outline-none">
                <option value="ativa">Ativa</option>
                <option value="pausada">Pausada</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Início
              <input name="valido_de" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 outline-none" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Fim
              <input name="valido_ate" type="date" defaultValue={futureDate(30)} className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 outline-none" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Limite total
              <input name="limite_total" type="number" min="1" defaultValue={defaults.limiteTotal} className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 outline-none" placeholder="50" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Limite por dia
              <input name="limite_dia" type="number" min="1" className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 outline-none" placeholder="5" />
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Público
              <select name="publico_tipo" defaultValue={defaults.publicoTipo} className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 outline-none">
                <option value="link">Aberta pelo link</option>
                <option value="clientes_especificos">Clientes específicos</option>
                <option value="novos_clientes">Novos clientes</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Tipo de benefício
              <select name="tipo_desconto" className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 outline-none">
                <option value="percentual">Desconto em %</option>
                <option value="valor_fixo">Desconto em R$</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Valor padrão
              <input name="valor_desconto" required type="number" min="1" step="0.01" defaultValue={defaults.valorDesconto} className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 outline-none" placeholder="20" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Limite por cliente
              <input name="limite_cliente" type="number" min="1" defaultValue={1} className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 outline-none" />
            </label>
          </div>

          <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-center gap-2">
              <Scissors size={18} className="text-amber-700" />
              <h2 className="text-lg font-black text-zinc-950">Serviços permitidos</h2>
            </div>
            <p className="mt-1 text-sm text-zinc-500">Se nenhum serviço for marcado, o cupom não aparece com vitrine pública de serviços.</p>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {servicos.map((servico) => {
                const preco = Number(servico.preco_padrao ?? servico.preco ?? 0);
                return (
                  <label key={String(servico.id)} className="rounded-2xl border border-zinc-200 bg-white p-4">
                    <div className="flex items-start gap-3">
                      <input name="servicos" value={String(servico.id)} type="checkbox" className="mt-1 h-4 w-4 accent-zinc-950" />
                      <div className="min-w-0 flex-1">
                        <strong className="block truncate text-sm text-zinc-950">{String(servico.nome || "Serviço")}</strong>
                        <span className="text-xs font-bold text-zinc-500">Preço normal: {money(preco)}</span>
                        <div className="mt-3 grid gap-2 md:grid-cols-3">
                          <select name={`beneficio_tipo_${servico.id}`} className="h-10 rounded-xl border border-zinc-200 bg-zinc-50 px-2 text-xs font-bold">
                            <option value="desconto_percentual">%</option>
                            <option value="desconto_valor">R$ off</option>
                            <option value="preco_fixo">Preço fixo</option>
                            <option value="brinde">Brinde</option>
                          </select>
                          <input name={`beneficio_valor_${servico.id}`} type="number" min="0" step="0.01" className="h-10 rounded-xl border border-zinc-200 bg-zinc-50 px-2 text-xs font-bold" placeholder="20" />
                          <input name={`limite_servico_${servico.id}`} type="number" min="1" className="h-10 rounded-xl border border-zinc-200 bg-zinc-50 px-2 text-xs font-bold" placeholder="limite" />
                        </div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <button className="inline-flex min-h-13 items-center gap-2 rounded-2xl bg-zinc-950 px-6 py-4 text-sm font-black text-white shadow-[0_18px_30px_rgba(15,23,42,0.18)]" type="submit">
            <Sparkles size={18} />
            Criar campanha
          </button>
        </form>
      </section>
    </main>
  );
}
