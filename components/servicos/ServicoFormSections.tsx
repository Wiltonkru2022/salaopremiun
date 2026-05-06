"use client";

import { ComissaoHelpPanel } from "@/components/comissoes/ComissaoHelpPanel";
import {
  Card,
  Info,
  Input,
  Select,
  Switch,
  Textarea,
  type SelectOption,
} from "@/components/servicos/ServicoFormFields";
import { maskMoneyInput } from "@/lib/utils/serviceMasks";
import type {
  CategoriaServico,
  ProdutoConsumoServico,
  ProdutoServico,
  ProfissionalServico,
  RecursoServico,
  ServicoState,
  VinculoProfissionalServico,
} from "@/types/servicos";

type SetServicoField = <K extends keyof ServicoState>(
  field: K,
  value: ServicoState[K]
) => void;

type UpdateVinculo = (
  idProfissional: string,
  field: keyof VinculoProfissionalServico,
  value: VinculoProfissionalServico[keyof VinculoProfissionalServico]
) => void;

type UpdateConsumo = (
  index: number,
  field: keyof ProdutoConsumoServico,
  value: ProdutoConsumoServico[keyof ProdutoConsumoServico]
) => void;

export function ServicoFormGeralSection({
  servico,
  categorias,
  novaCategoria,
  recursos,
  planoPremium,
  setField,
  setNovaCategoria,
}: {
  servico: ServicoState;
  categorias: CategoriaServico[];
  novaCategoria: string;
  recursos: RecursoServico[];
  planoPremium: boolean;
  setField: SetServicoField;
  setNovaCategoria: (value: string) => void;
}) {
  return (
    <Card title="1. Dados basicos e descricao" subtitle="O que esta sendo vendido">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Input
          label="Nome do servico"
          value={servico.nome}
          onChange={(v) => setField("nome", v)}
          required
        />
        <Select
          label="Categoria"
          value={servico.id_categoria}
          onChange={(v) => {
            setField("id_categoria", v);
            const categoria = categorias.find((item) => item.id === v);
            setField("categoria", categoria?.nome || "");
          }}
          options={[
            { value: "", label: "Sem categoria" },
            ...categorias.map((categoria) => ({
              value: categoria.id,
              label: categoria.nome,
            })),
            { value: "__nova__", label: "+ Criar nova categoria" },
          ]}
        />
        {servico.id_categoria === "__nova__" ? (
          <Input
            label="Nova categoria"
            value={novaCategoria}
            onChange={setNovaCategoria}
          />
        ) : null}
        <Input
          label="Gatilho de retorno (dias)"
          value={servico.gatilho_retorno_dias}
          onChange={(v) => setField("gatilho_retorno_dias", v)}
        />
        <Select
          label="Recurso especifico"
          value={servico.recurso_nome}
          onChange={(v) => setField("recurso_nome", v)}
          options={[
            { value: "", label: "Nenhum" },
            ...recursos.map((recurso) => ({
              value: recurso.nome,
              label: recurso.nome,
            })),
          ]}
        />

        <div className="md:col-span-2">
          <Textarea
            label="Descricao do servico"
            value={servico.descricao}
            onChange={(v) => setField("descricao", v)}
          />
        </div>

        {planoPremium ? (
          <div className="md:col-span-2">
            <Switch
              label="Mostrar servico no app cliente"
              checked={servico.app_cliente_visivel}
              onChange={(v) => setField("app_cliente_visivel", v)}
            />
            <p className="mt-2 text-xs leading-5 text-zinc-500">
              O app cliente mostra apenas servicos ativos e marcados para aparecer.
            </p>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

export function ServicoFormAgendaSection({
  servico,
  setField,
}: {
  servico: ServicoState;
  setField: SetServicoField;
}) {
  return (
    <Card title="2. Tempo e dinamica" subtitle="Agenda e pausas" defaultOpen={false}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Input
          label="Duracao total (min)"
          value={servico.duracao_minutos}
          onChange={(v) => setField("duracao_minutos", v)}
        />
        <Input
          label="Tempo de pausa (min)"
          value={servico.pausa_minutos}
          onChange={(v) => setField("pausa_minutos", v)}
        />
        <Switch
          label="Exige avaliacao"
          checked={servico.exige_avaliacao}
          onChange={(v) => setField("exige_avaliacao", v)}
        />
      </div>
    </Card>
  );
}

export function ServicoFormPrecoSection({
  servico,
  setField,
}: {
  servico: ServicoState;
  setField: SetServicoField;
}) {
  return (
    <Card title="3. Precificacao e custos" subtitle="Lucro real do servico" defaultOpen={false}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Input
          label="Preco padrao"
          value={servico.preco_padrao}
          onChange={(v) => setField("preco_padrao", maskMoneyInput(v))}
        />

        <Input
          label="Preco minimo"
          value={servico.preco_minimo}
          onChange={(v) => setField("preco_minimo", maskMoneyInput(v))}
        />

        <Input
          label="Custo de produto"
          value={servico.custo_produto}
          onChange={(v) => setField("custo_produto", maskMoneyInput(v))}
        />

        <Switch
          label="Preco variavel / a partir de"
          checked={servico.preco_variavel}
          onChange={(v) => setField("preco_variavel", v)}
        />
      </div>
    </Card>
  );
}

export function ServicoFormComissaoSection({
  servico,
  setField,
  formatPercentPreview,
  formatBaseCalculoLabel,
}: {
  servico: ServicoState;
  setField: SetServicoField;
  formatPercentPreview: (value: string) => string;
  formatBaseCalculoLabel: (value: string) => string;
}) {
  return (
    <Card title="4. Regras de comissao" subtitle="Padrao do servico" defaultOpen={false}>
      <div className="space-y-4">
        <ComissaoHelpPanel
          title="Use uma regra padrao e mexa so nas excecoes"
          description="A forma mais simples de trabalhar com comissao e definir o padrao do servico aqui e personalizar apenas quem foge da regra."
          steps={[
            {
              title: "Defina o padrao do servico",
              description:
                "Esse percentual vira a referencia principal para o caixa e para os proximos lancamentos.",
            },
            {
              title: "Personalize so quando precisar",
              description:
                "Campos vazios na secao de profissionais significam herdar o padrao deste servico.",
            },
            {
              title: "Revise a taxa da maquininha",
              description:
                "A taxa geral do salao fica em Configuracoes. Aqui voce decide se este servico entra nessa regra.",
            },
          ]}
        />

        <div className="flex flex-wrap gap-2 text-xs font-medium text-zinc-600">
          <span className="rounded-full bg-zinc-100 px-3 py-1">
            Profissional: {formatPercentPreview(servico.comissao_percentual_padrao)}
          </span>
          <span className="rounded-full bg-zinc-100 px-3 py-1">
            Assistente: {formatPercentPreview(servico.comissao_assistente_percentual)}
          </span>
          <span className="rounded-full bg-zinc-100 px-3 py-1">
            Base: {formatBaseCalculoLabel(servico.base_calculo)}
          </span>
          <span className="rounded-full bg-zinc-100 px-3 py-1">
            Taxa: {servico.desconta_taxa_maquininha ? "Desconta taxa" : "Nao desconta taxa"}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Comissao profissional (%)"
            value={servico.comissao_percentual_padrao}
            onChange={(v) => setField("comissao_percentual_padrao", v)}
          />

          <Input
            label="Comissao assistente (%)"
            value={servico.comissao_assistente_percentual}
            onChange={(v) => setField("comissao_assistente_percentual", v)}
          />

          <Select
            label="Base de calculo"
            value={servico.base_calculo}
            onChange={(v) => setField("base_calculo", v)}
            options={[
              { value: "bruto", label: "Bruto" },
              { value: "liquido", label: "Liquido" },
            ]}
          />

          <Switch
            label="Desconta taxa da maquininha"
            checked={servico.desconta_taxa_maquininha}
            onChange={(v) => setField("desconta_taxa_maquininha", v)}
          />
        </div>
      </div>
    </Card>
  );
}

export function ServicoFormProfissionaisSection({
  profissionais,
  vinculos,
  vinculosAtivos,
  totalRegrasPersonalizadas,
  updateVinculo,
  limparRegraComissao,
  hasRegraComissaoPersonalizada,
  getTaxaMaquininhaSelectValue,
  parseTaxaMaquininhaSelectValue,
  formatPercentPreview,
  formatBaseCalculoLabel,
  formatTaxaMaquininhaLabel,
}: {
  profissionais: ProfissionalServico[];
  vinculos: VinculoProfissionalServico[];
  vinculosAtivos: VinculoProfissionalServico[];
  totalRegrasPersonalizadas: number;
  updateVinculo: UpdateVinculo;
  limparRegraComissao: (idProfissional: string) => void;
  hasRegraComissaoPersonalizada: (
    vinculo: VinculoProfissionalServico
  ) => boolean;
  getTaxaMaquininhaSelectValue: (value: boolean | null) => string;
  parseTaxaMaquininhaSelectValue: (value: string) => boolean | null;
  formatPercentPreview: (value: string) => string;
  formatBaseCalculoLabel: (value: string) => string;
  formatTaxaMaquininhaLabel: (value: boolean | null | undefined) => string;
}) {
  return (
    <Card
      title="5. Profissionais vinculados"
      subtitle="Onde voce controla 40%, 50% etc."
      defaultOpen={false}
    >
      <div className="space-y-4">
        <ComissaoHelpPanel
          eyebrow="Excecoes"
          title="Deixe vazio para usar o padrao do servico"
          description="Esta area serve para excecoes por profissional. Quando voce nao preencher uma regra aqui, o sistema usa o padrao configurado acima."
          steps={[
            {
              title: "Ative o profissional",
              description:
                "O vinculo libera o agendamento e, se necessario, permite personalizar preco, tempo e comissao.",
            },
            {
              title: "Preencha so o que muda",
              description:
                "Comissao, base e taxa podem ficar vazias para herdar a configuracao principal do servico.",
            },
            {
              title: "Volte ao padrao com um clique",
              description:
                "Use o botao de limpar excecoes quando o profissional voltar a seguir a regra geral.",
            },
          ]}
        >
          <div className="flex flex-wrap gap-2 text-xs font-medium text-zinc-600">
            <span className="rounded-full bg-white px-3 py-1 ring-1 ring-zinc-200">
              Vinculos ativos: {vinculosAtivos.length}
            </span>
            <span className="rounded-full bg-white px-3 py-1 ring-1 ring-zinc-200">
              Regras personalizadas: {totalRegrasPersonalizadas}
            </span>
            <span className="rounded-full bg-white px-3 py-1 ring-1 ring-zinc-200">
              Herdando padrao: {Math.max(vinculosAtivos.length - totalRegrasPersonalizadas, 0)}
            </span>
          </div>
        </ComissaoHelpPanel>

        {profissionais.map((profissional) => {
          const vinculo = vinculos.find((item) => item.id_profissional === profissional.id);
          if (!vinculo) return null;

          const usaPadraoServico = !hasRegraComissaoPersonalizada(vinculo);

          return (
            <div
              key={profissional.id}
              className="rounded-2xl border border-zinc-200 p-4"
            >
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-zinc-900">{profissional.nome}</p>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        usaPadraoServico
                          ? "bg-zinc-100 text-zinc-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {usaPadraoServico
                        ? "Usando padrao do servico"
                        : "Regra personalizada"}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-500">
                    Ative para permitir agendamento deste servico com esse profissional
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {vinculo.ativo ? (
                    <button
                      type="button"
                      onClick={() => limparRegraComissao(profissional.id)}
                      className="rounded-xl border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
                    >
                      Limpar excecoes
                    </button>
                  ) : null}

                  <input
                    type="checkbox"
                    checked={vinculo.ativo}
                    onChange={(e) =>
                      updateVinculo(profissional.id, "ativo", e.target.checked)
                    }
                  />
                </div>
              </div>

              {vinculo.ativo ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <Input
                    label="Duracao personalizada"
                    value={vinculo.duracao_minutos}
                    onChange={(v) =>
                      updateVinculo(profissional.id, "duracao_minutos", v)
                    }
                  />

                  <Input
                    label="Preco personalizado"
                    value={vinculo.preco_personalizado}
                    onChange={(v) =>
                      updateVinculo(
                        profissional.id,
                        "preco_personalizado",
                        maskMoneyInput(v)
                      )
                    }
                  />

                  <Input
                    label="Comissao (%)"
                    value={vinculo.comissao_percentual}
                    onChange={(v) =>
                      updateVinculo(profissional.id, "comissao_percentual", v)
                    }
                  />

                  <Input
                    label="Comissao assistente (%)"
                    value={vinculo.comissao_assistente_percentual}
                    onChange={(v) =>
                      updateVinculo(
                        profissional.id,
                        "comissao_assistente_percentual",
                        v
                      )
                    }
                  />

                  <Select
                    label="Base calculo"
                    value={vinculo.base_calculo}
                    onChange={(v) =>
                      updateVinculo(profissional.id, "base_calculo", v)
                    }
                    options={[
                      { value: "", label: "Usar padrao" },
                      { value: "bruto", label: "Bruto" },
                      { value: "liquido", label: "Liquido" },
                    ]}
                  />

                  <Select
                    label="Taxa da maquininha"
                    value={getTaxaMaquininhaSelectValue(
                      vinculo.desconta_taxa_maquininha
                    )}
                    onChange={(value) =>
                      updateVinculo(
                        profissional.id,
                        "desconta_taxa_maquininha",
                        parseTaxaMaquininhaSelectValue(value)
                      )
                    }
                    options={[
                      { value: "", label: "Usar padrao do servico" },
                      { value: "descontar", label: "Descontar taxa" },
                      { value: "nao_descontar", label: "Nao descontar taxa" },
                    ]}
                  />

                  <div className="rounded-2xl border border-dashed border-zinc-200 px-4 py-3 text-sm text-zinc-600 md:col-span-2 xl:col-span-3">
                    Resumo desta regra: profissional{" "}
                    {formatPercentPreview(vinculo.comissao_percentual)}, assistente{" "}
                    {formatPercentPreview(vinculo.comissao_assistente_percentual)},
                    base{" "}
                    {vinculo.base_calculo
                      ? formatBaseCalculoLabel(vinculo.base_calculo)
                      : "usar padrao do servico"}{" "}
                    e{" "}
                    {formatTaxaMaquininhaLabel(
                      vinculo.desconta_taxa_maquininha
                    ).toLowerCase()}
                    .
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function ServicoFormConsumoSection({
  consumos,
  produtos,
  adicionarConsumo,
  removerConsumo,
  updateConsumo,
}: {
  consumos: ProdutoConsumoServico[];
  produtos: ProdutoServico[];
  adicionarConsumo: () => void;
  removerConsumo: (index: number) => void;
  updateConsumo: UpdateConsumo;
}) {
  const produtoOptions: SelectOption[] = [
    { value: "", label: "Selecione" },
    ...produtos.map((produto) => ({
      value: produto.id,
      label: produto.nome,
    })),
  ];

  return (
    <Card
      title="6. Consumo de produtos"
      subtitle="Base para baixar estoque automaticamente"
      defaultOpen={false}
    >
      <div className="space-y-4">
        <button
          type="button"
          onClick={adicionarConsumo}
          className="rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white"
        >
          Adicionar produto consumido
        </button>

        {consumos.map((consumo, index) => (
          <div
            key={index}
            className="grid grid-cols-1 gap-4 rounded-2xl border border-zinc-200 p-4 md:grid-cols-4"
          >
            <Select
              label="Produto"
              value={consumo.id_produto}
              onChange={(value) => {
                const produto = produtos.find((item) => item.id === value);
                updateConsumo(index, "id_produto", value);
                updateConsumo(
                  index,
                  "unidade_medida",
                  produto?.unidade_medida || ""
                );
              }}
              options={produtoOptions}
            />

            <Input
              label="Quantidade"
              value={consumo.quantidade_consumo}
              onChange={(v) => updateConsumo(index, "quantidade_consumo", v)}
            />

            <Input
              label="Unidade"
              value={consumo.unidade_medida}
              onChange={(v) => updateConsumo(index, "unidade_medida", v)}
            />

            <Input
              label="Custo estimado"
              value={consumo.custo_estimado}
              onChange={(v) =>
                updateConsumo(index, "custo_estimado", maskMoneyInput(v))
              }
            />

            <div className="md:col-span-4">
              <button
                type="button"
                onClick={() => removerConsumo(index)}
                className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600"
              >
                Remover item
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function ServicoFormResumoStatus({
  precoPadraoNumero,
  custoProdutoNumero,
  servicoAtivo,
  onChangeStatus,
}: {
  precoPadraoNumero: number;
  custoProdutoNumero: number;
  servicoAtivo: boolean;
  onChangeStatus: (ativo: boolean) => void;
}) {
  return (
    <div className="space-y-6">
      <Card title="Resumo" subtitle="Visao rapida">
        <div className="space-y-4">
          <Info
            label="Preco padrao"
            value={`R$ ${precoPadraoNumero.toFixed(2)}`}
          />
          <Info
            label="Custo produto"
            value={`R$ ${custoProdutoNumero.toFixed(2)}`}
          />
          <Info
            label="Lucro bruto estimado"
            value={`R$ ${(precoPadraoNumero - custoProdutoNumero).toFixed(2)}`}
          />
        </div>
      </Card>

      <Card title="Status" subtitle="Controle do cadastro">
        <div className="space-y-4">
          <Select
            label="Status"
            value={servicoAtivo ? "ativo" : "inativo"}
            onChange={(value) => onChangeStatus(value === "ativo")}
            options={[
              { value: "ativo", label: "Ativo" },
              { value: "inativo", label: "Inativo" },
            ]}
          />
        </div>
      </Card>
    </div>
  );
}
