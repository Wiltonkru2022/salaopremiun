"use client";

import { type ReactNode, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  BriefcaseBusiness,
  DoorClosed,
  DoorOpen,
  Loader2,
  WalletCards,
} from "lucide-react";
import type {
  CaixaMovimentacao,
  CaixaMovimentacaoTipo,
  CaixaSessao,
} from "@/lib/caixa/sessaoCaixa";
import type { ProfissionalResumo } from "@/components/caixa/types";
import { formatCurrency, formatShortDateTime, moneyMask, parseMoney } from "./utils";

type MovimentoPayload = {
  tipo: CaixaMovimentacaoTipo;
  valor: number;
  descricao: string;
  idProfissional?: string | null;
};

type Props = {
  sessao: CaixaSessao | null;
  movimentacoes: CaixaMovimentacao[];
  schemaReady: boolean;
  schemaError?: string;
  profissionais: ProfissionalResumo[];
  saving: boolean;
  onAbrirCaixa: (payload: {
    valorAbertura: number;
    observacoes: string;
  }) => void;
  onFecharCaixa: (payload: {
    valorFechamento: number;
    observacoes: string;
  }) => void;
  onLancamento: (payload: MovimentoPayload) => void;
};

const MOVIMENTOS: Array<{ value: CaixaMovimentacaoTipo; label: string }> = [
  { value: "sangria", label: "Sangria" },
  { value: "suprimento", label: "Suprimento" },
  { value: "vale_profissional", label: "Vale profissional" },
];

function getFechamentoMeta(diferenca: number) {
  if (Math.abs(diferenca) < 0.009) {
    return {
      badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
      cardClass: "border-emerald-200 bg-emerald-50",
      title: "Fechamento confere",
      description: "O valor contado bate com o previsto do caixa.",
    };
  }

  if (diferenca > 0) {
    return {
      badgeClass: "border-sky-200 bg-sky-50 text-sky-700",
      cardClass: "border-sky-200 bg-sky-50",
      title: "Sobra de caixa",
      description: "O valor contado ficou acima do previsto e sera registrado como sobra.",
    };
  }

  return {
    badgeClass: "border-rose-200 bg-rose-50 text-rose-700",
    cardClass: "border-rose-200 bg-rose-50",
    title: "Quebra de caixa",
    description: "O valor contado ficou abaixo do previsto e sera registrado como quebra.",
  };
}

function getFechamentoMetaFromTipo(tipo?: CaixaSessao["tipo_fechamento"] | null) {
  if (tipo === "sobra") {
    return getFechamentoMeta(1);
  }

  if (tipo === "quebra") {
    return getFechamentoMeta(-1);
  }

  return getFechamentoMeta(0);
}

function getMovimentoMeta(tipo: CaixaMovimentacaoTipo) {
  if (tipo === "sangria") {
    return {
      icon: <ArrowDownCircle size={16} />,
      label: "Sangria",
      className: "border-rose-200 bg-rose-50 text-rose-700",
      sinal: "-",
    };
  }

  if (tipo === "suprimento") {
    return {
      icon: <ArrowUpCircle size={16} />,
      label: "Suprimento",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      sinal: "+",
    };
  }

  if (tipo === "vale_profissional") {
    return {
      icon: <BriefcaseBusiness size={16} />,
      label: "Vale",
      className: "border-amber-200 bg-amber-50 text-amber-700",
      sinal: "-",
    };
  }

  if (tipo === "venda") {
    return {
      icon: <WalletCards size={16} />,
      label: "Venda",
      className: "border-sky-200 bg-sky-50 text-sky-700",
      sinal: "+",
    };
  }

  return {
    icon: <WalletCards size={16} />,
    label: "Ajuste",
    className: "border-zinc-200 bg-zinc-50 text-zinc-700",
    sinal: "",
  };
}

export default function CaixaSessaoPanel({
  sessao,
  movimentacoes,
  schemaReady,
  schemaError,
  profissionais,
  saving,
  onAbrirCaixa,
  onFecharCaixa,
  onLancamento,
}: Props) {
  const [valorAbertura, setValorAbertura] = useState("0,00");
  const [obsAbertura, setObsAbertura] = useState("");
  const [valorFechamento, setValorFechamento] = useState("");
  const [obsFechamento, setObsFechamento] = useState("");
  const [tipoMovimento, setTipoMovimento] =
    useState<CaixaMovimentacaoTipo>("sangria");
  const [valorMovimento, setValorMovimento] = useState("");
  const [descricaoMovimento, setDescricaoMovimento] = useState("");
  const [profissionalMovimento, setProfissionalMovimento] = useState("");

  const caixaAberto = schemaReady && sessao?.status === "aberto";

  const totalMovimentos = useMemo(() => {
    return movimentacoes.reduce((acc, movimento) => {
      const valor = Number(movimento.valor || 0);
      if (movimento.tipo === "suprimento" || movimento.tipo === "venda") {
        return acc + valor;
      }
      if (movimento.tipo === "sangria" || movimento.tipo === "vale_profissional") {
        return acc - valor;
      }
      return acc;
    }, Number(sessao?.valor_abertura || 0));
  }, [movimentacoes, sessao?.valor_abertura]);
  const valorFechamentoNumero = parseMoney(valorFechamento);
  const diferencaFechamento = Number(
    (valorFechamentoNumero - totalMovimentos).toFixed(2)
  );
  const fechamentoMeta = caixaAberto
    ? getFechamentoMeta(diferencaFechamento)
    : getFechamentoMetaFromTipo(sessao?.tipo_fechamento);
  const exigeObservacaoFechamento =
    Math.abs(diferencaFechamento) >= 0.009 && !obsFechamento.trim();
  const valorPrevistoSessao = caixaAberto
    ? totalMovimentos
    : Number(sessao?.valor_previsto_fechamento || 0);
  const valorDiferencaSessao = caixaAberto
    ? diferencaFechamento
    : Number(sessao?.valor_diferenca_fechamento || 0);
  const valorContadoSessao = caixaAberto
    ? valorFechamentoNumero
    : Number(sessao?.valor_fechamento_informado || 0);

  if (!schemaReady) {
    return (
      <section className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 text-amber-900 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 shrink-0" size={20} />
          <div>
            <div className="font-bold">Caixa operacional aguardando Supabase</div>
            <p className="mt-1 text-sm leading-6">
              {schemaError ||
                "Aplique a migration de caixa operacional para liberar abertura, fechamento, sangria, suprimento e vale profissional."}
            </p>
            <p className="mt-2 text-xs font-semibold">
              Arquivo: supabase/migrations/202604150001_caixa_operacional.sql
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <WalletCards size={18} className="text-zinc-700" />
            <div className="text-lg font-bold text-zinc-950">Sessao do caixa</div>
            <span
              className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase ${
                caixaAberto
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-zinc-200 bg-zinc-100 text-zinc-600"
              }`}
            >
              {caixaAberto ? "Aberto" : "Fechado"}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Venda, pagamento e fechamento so devem acontecer com caixa aberto.
          </p>
        </div>

        {sessao ? (
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <Info label="Abertura" value={formatCurrency(sessao.valor_abertura)} />
            <Info
              label={caixaAberto ? "Previsto agora" : "Previsto no fechamento"}
              value={formatCurrency(valorPrevistoSessao)}
            />
            <Info
              label={caixaAberto ? "Aberto em" : "Fechado em"}
              value={formatShortDateTime(
                caixaAberto
                  ? sessao.aberto_em || sessao.created_at
                  : sessao.fechado_em || sessao.updated_at
              )}
            />
          </div>
        ) : null}
      </div>

      {!caixaAberto ? (
        <div className="mt-5 grid gap-3 border-t border-zinc-100 pt-5 lg:grid-cols-[180px_minmax(0,1fr)_auto]">
          {sessao?.status === "fechado" ? (
            <div className="lg:col-span-3">
              <div className={`rounded-[24px] border px-4 py-4 ${fechamentoMeta.cardClass}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-zinc-900">
                      Ultimo fechamento registrado
                    </div>
                    <div className="mt-1 text-sm text-zinc-600">
                      O caixa anterior foi encerrado com este resultado.
                    </div>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase ${fechamentoMeta.badgeClass}`}
                  >
                    {fechamentoMeta.title}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <Info label="Previsto" value={formatCurrency(valorPrevistoSessao)} />
                  <Info label="Contado" value={formatCurrency(valorContadoSessao)} />
                  <Info
                    label={
                      valorDiferencaSessao < 0
                        ? "Quebra"
                        : valorDiferencaSessao > 0
                          ? "Sobra"
                          : "Diferenca"
                    }
                    value={formatCurrency(Math.abs(valorDiferencaSessao))}
                    tone={
                      valorDiferencaSessao < 0
                        ? "rose"
                        : valorDiferencaSessao > 0
                          ? "sky"
                          : "emerald"
                    }
                  />
                </div>

                {sessao.observacoes ? (
                  <div className="mt-4 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-zinc-700">
                    <div className="font-semibold text-zinc-900">Observacao</div>
                    <div className="mt-1">{sessao.observacoes}</div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <MoneyField
            label="Valor inicial"
            value={valorAbertura}
            onChange={setValorAbertura}
          />
          <Field label="Observacao">
            <input
              value={obsAbertura}
              onChange={(event) => setObsAbertura(event.target.value)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-900"
              placeholder="Ex.: abertura da manha"
            />
          </Field>
          <button
            type="button"
            disabled={saving}
            onClick={() =>
              onAbrirCaixa({
                valorAbertura: parseMoney(valorAbertura),
                observacoes: obsAbertura,
              })
            }
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:opacity-60 lg:self-end"
          >
            {saving ? <Loader2 className="animate-spin" size={16} /> : <DoorOpen size={16} />}
            Abrir caixa
          </button>
        </div>
      ) : (
        <div className="mt-5 grid gap-5 border-t border-zinc-100 pt-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 p-4">
            <div className="mb-4 text-sm font-bold text-zinc-900">
              Sangria, suprimento ou vale
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Tipo">
                <select
                  value={tipoMovimento}
                  onChange={(event) =>
                    setTipoMovimento(event.target.value as CaixaMovimentacaoTipo)
                  }
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-900"
                >
                  {MOVIMENTOS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </Field>

              <MoneyField
                label="Valor"
                value={valorMovimento}
                onChange={setValorMovimento}
              />

              {tipoMovimento === "vale_profissional" ? (
                <Field label="Profissional">
                  <select
                    value={profissionalMovimento}
                    onChange={(event) => setProfissionalMovimento(event.target.value)}
                    className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-900"
                  >
                    <option value="">Selecione</option>
                    {profissionais.map((profissional) => (
                      <option key={profissional.id} value={profissional.id}>
                        {profissional.nome}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}

              <div
                className={
                  tipoMovimento === "vale_profissional"
                    ? "md:col-span-1"
                    : "md:col-span-2"
                }
              >
                <Field label="Descricao">
                  <input
                    value={descricaoMovimento}
                    onChange={(event) => setDescricaoMovimento(event.target.value)}
                    className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-900"
                    placeholder="Ex.: retirada para troco, vale do Joao..."
                  />
                </Field>
              </div>
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={() => {
                onLancamento({
                  tipo: tipoMovimento,
                  valor: parseMoney(valorMovimento),
                  descricao: descricaoMovimento,
                  idProfissional: profissionalMovimento || null,
                });
                setValorMovimento("");
                setDescricaoMovimento("");
              }}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : <WalletCards size={16} />}
              Lancar movimento
            </button>
          </div>

          <div className="rounded-[24px] border border-zinc-200 bg-white p-4">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-zinc-900">
                  Fechamento do caixa
                </div>
                <div className="mt-1 text-sm text-zinc-500">
                  Conte o caixa e confirme a diferenca antes de fechar.
                </div>
              </div>

              <span
                className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase ${fechamentoMeta.badgeClass}`}
              >
                {fechamentoMeta.title}
              </span>
            </div>
            <div className="grid gap-3">
              <MoneyField
                label="Valor contado"
                value={valorFechamento}
                onChange={setValorFechamento}
              />
              <div className="grid gap-3 sm:grid-cols-3">
                <Info label="Previsto" value={formatCurrency(totalMovimentos)} />
                <Info label="Contado" value={formatCurrency(valorFechamentoNumero)} />
                <Info
                  label={diferencaFechamento < 0 ? "Quebra" : diferencaFechamento > 0 ? "Sobra" : "Diferenca"}
                  value={formatCurrency(Math.abs(diferencaFechamento))}
                  tone={
                    diferencaFechamento < 0
                      ? "rose"
                      : diferencaFechamento > 0
                        ? "sky"
                        : "emerald"
                  }
                />
              </div>
              <div className={`rounded-2xl border px-4 py-3 text-sm ${fechamentoMeta.cardClass}`}>
                <div className="font-semibold">{fechamentoMeta.title}</div>
                <div className="mt-1">{fechamentoMeta.description}</div>
                {Math.abs(diferencaFechamento) >= 0.009 ? (
                  <div className="mt-2 text-xs">
                    Para fechar com diferenca, informe uma observacao explicando o motivo.
                  </div>
                ) : null}
              </div>
              <Field label="Observacao">
                <input
                  value={obsFechamento}
                  onChange={(event) => setObsFechamento(event.target.value)}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-900"
                  placeholder="Ex.: fechamento do dia, falta no troco, ajuste manual..."
                />
              </Field>
              {exigeObservacaoFechamento ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Informe uma observacao para registrar a diferenca do fechamento.
                </div>
              ) : null}
              <button
                type="button"
                disabled={saving || exigeObservacaoFechamento}
                onClick={() => {
                  const observacoesComDiferenca =
                    Math.abs(diferencaFechamento) < 0.009
                      ? obsFechamento
                      : `${obsFechamento.trim()} | ${fechamentoMeta.title}: ${formatCurrency(
                          Math.abs(diferencaFechamento)
                        )}`.trim();

                  onFecharCaixa({
                    valorFechamento: valorFechamentoNumero,
                    observacoes: observacoesComDiferenca,
                  });
                }}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-300 bg-white px-5 py-3 text-sm font-bold text-zinc-900 transition hover:bg-zinc-50 disabled:opacity-60"
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : <DoorClosed size={16} />}
                Fechar caixa
              </button>
            </div>
          </div>
        </div>
      )}

      {movimentacoes.length > 0 ? (
        <div className="mt-5 border-t border-zinc-100 pt-5">
          <div className="mb-3 text-sm font-bold text-zinc-900">
            Ultimos movimentos
          </div>
          <div className="grid gap-2 lg:grid-cols-3">
            {movimentacoes.slice(0, 6).map((movimento) => {
              const meta = getMovimentoMeta(movimento.tipo);
              return (
                <div
                  key={movimento.id}
                  className={`rounded-2xl border px-4 py-3 ${meta.className}`}
                >
                  <div className="flex items-center gap-2 text-sm font-bold">
                    {meta.icon}
                    {meta.label}
                  </div>
                  <div className="mt-2 text-lg font-bold">
                    {meta.sinal}
                    {formatCurrency(movimento.valor)}
                  </div>
                  <div className="mt-1 line-clamp-1 text-xs opacity-75">
                    {movimento.descricao || formatShortDateTime(movimento.created_at)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-zinc-700">
        {label}
      </label>
      {children}
    </div>
  );
}

function MoneyField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <input
        value={value}
        onChange={(event) => onChange(moneyMask(event.target.value))}
        className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-900"
        placeholder="0,00"
      />
    </Field>
  );
}

function Info({
  label,
  value,
  tone = "zinc",
}: {
  label: string;
  value: string;
  tone?: "emerald" | "rose" | "sky" | "zinc";
}) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50"
      : tone === "rose"
        ? "border-rose-200 bg-rose-50"
        : tone === "sky"
          ? "border-sky-200 bg-sky-50"
          : "border-zinc-200 bg-zinc-50";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClass}`}>
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">
        {label}
      </div>
      <div className="mt-1 text-sm font-bold text-zinc-900">{value}</div>
    </div>
  );
}
