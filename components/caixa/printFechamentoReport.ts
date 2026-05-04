import { createClient } from "@/lib/supabase/client";
import type { CaixaSessao } from "@/lib/caixa/sessaoCaixa";

type FechamentoReportParams = {
  idSalao: string;
  sessao: CaixaSessao;
  valorFechamento: number;
  observacoes?: string;
};

type MovimentoVenda = {
  id: string;
  id_comanda?: string | null;
  forma_pagamento?: string | null;
  valor?: number | null;
  created_at?: string | null;
  tipo?: string | null;
  descricao?: string | null;
};

type ComandaResumo = {
  id: string;
  numero?: number | null;
  total?: number | null;
  fechada_em?: string | null;
  clientes?: { nome?: string | null } | { nome?: string | null }[] | null;
};

function formatCurrency(value?: number | null) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR");
}

function formatFormaPagamento(value?: string | null) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "pix") return "Pix";
  if (normalized === "dinheiro") return "Dinheiro";
  if (normalized === "debito") return "Debito";
  if (normalized === "credito") return "Credito";
  if (normalized === "transferencia") return "Transferencia";
  if (normalized === "credito_cliente") return "Credito da cliente";
  return normalized ? normalized.replace(/_/g, " ") : "Nao informado";
}

function getClienteNome(comanda?: ComandaResumo | null) {
  if (!comanda?.clientes) return "Sem cliente";
  return Array.isArray(comanda.clientes)
    ? comanda.clientes[0]?.nome || "Sem cliente"
    : comanda.clientes.nome || "Sem cliente";
}

function buildHtml(params: {
  sessao: CaixaSessao;
  valorFechamento: number;
  observacoes?: string;
  vendasPorForma: Array<{ forma: string; valor: number }>;
  comandas: ComandaResumo[];
  outrosMovimentos: MovimentoVenda[];
}) {
  const { sessao, valorFechamento, observacoes, vendasPorForma, comandas, outrosMovimentos } =
    params;
  const previsto = Number(sessao.valor_previsto_fechamento || 0);
  const diferenca = Number((valorFechamento - previsto).toFixed(2));
  const fechamentoLabel =
    diferenca > 0 ? "Sobra" : diferenca < 0 ? "Quebra" : "Fechamento confere";

  return `<!doctype html>
  <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <title>Fechamento do caixa</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; color: #111827; margin: 24px; }
        h1,h2,h3,p { margin: 0; }
        .stack { display: grid; gap: 16px; }
        .row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
        .card { border: 1px solid #e5e7eb; border-radius: 14px; padding: 14px; }
        .eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: #6b7280; }
        .value { font-size: 22px; font-weight: 700; margin-top: 6px; }
        .helper { font-size: 13px; color: #4b5563; margin-top: 6px; line-height: 1.5; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border-bottom: 1px solid #e5e7eb; padding: 10px 8px; font-size: 13px; text-align: left; vertical-align: top; }
        th { text-transform: uppercase; letter-spacing: 0.12em; color: #6b7280; font-size: 11px; }
        .tone-ok { color: #047857; }
        .tone-alert { color: #b45309; }
        .tone-danger { color: #b91c1c; }
        @media print { body { margin: 16px; } }
      </style>
    </head>
    <body>
      <div class="stack">
        <div>
          <div class="eyebrow">Fechamento do caixa</div>
          <h1 style="margin-top:8px;font-size:30px;">Relatorio do dia</h1>
          <p class="helper" style="margin-top:8px;">
            Sessao ${sessao.id} aberta em ${formatDateTime(sessao.aberto_em)} e fechada em ${formatDateTime(
              sessao.fechado_em || new Date().toISOString()
            )}.
          </p>
        </div>

        <div class="row">
          <div class="card">
            <div class="eyebrow">Abertura</div>
            <div class="value">${formatCurrency(sessao.valor_abertura)}</div>
          </div>
          <div class="card">
            <div class="eyebrow">Previsto</div>
            <div class="value">${formatCurrency(previsto)}</div>
          </div>
          <div class="card">
            <div class="eyebrow">Contado</div>
            <div class="value">${formatCurrency(valorFechamento)}</div>
          </div>
          <div class="card">
            <div class="eyebrow">${fechamentoLabel}</div>
            <div class="value ${
              diferenca === 0 ? "tone-ok" : diferenca > 0 ? "tone-alert" : "tone-danger"
            }">${formatCurrency(Math.abs(diferenca))}</div>
          </div>
        </div>

        <div class="card">
          <div class="eyebrow">Vendas por forma de pagamento</div>
          <table style="margin-top:10px;">
            <thead>
              <tr><th>Forma</th><th>Valor</th></tr>
            </thead>
            <tbody>
              ${
                vendasPorForma.length
                  ? vendasPorForma
                      .map(
                        (item) =>
                          `<tr><td>${item.forma}</td><td>${formatCurrency(item.valor)}</td></tr>`
                      )
                      .join("")
                  : `<tr><td colspan="2">Nenhuma venda registrada na sessao.</td></tr>`
              }
            </tbody>
          </table>
        </div>

        <div class="card">
          <div class="eyebrow">Vendas fechadas</div>
          <table style="margin-top:10px;">
            <thead>
              <tr><th>Comanda</th><th>Cliente</th><th>Fechada em</th><th>Total</th></tr>
            </thead>
            <tbody>
              ${
                comandas.length
                  ? comandas
                      .map(
                        (comanda) =>
                          `<tr><td>#${comanda.numero || "-"}</td><td>${getClienteNome(
                            comanda
                          )}</td><td>${formatDateTime(comanda.fechada_em)}</td><td>${formatCurrency(
                            comanda.total
                          )}</td></tr>`
                      )
                      .join("")
                  : `<tr><td colspan="4">Nenhuma comanda fechada foi encontrada para a sessao.</td></tr>`
              }
            </tbody>
          </table>
        </div>

        <div class="card">
          <div class="eyebrow">Movimentos adicionais</div>
          <table style="margin-top:10px;">
            <thead>
              <tr><th>Tipo</th><th>Descricao</th><th>Valor</th><th>Horario</th></tr>
            </thead>
            <tbody>
              ${
                outrosMovimentos.length
                  ? outrosMovimentos
                      .map(
                        (item) =>
                          `<tr><td>${String(item.tipo || "-").replace(/_/g, " ")}</td><td>${
                            item.descricao || "-"
                          }</td><td>${formatCurrency(item.valor)}</td><td>${formatDateTime(
                            item.created_at
                          )}</td></tr>`
                      )
                      .join("")
                  : `<tr><td colspan="4">Sem sangria, suprimento, vale ou ajuste na sessao.</td></tr>`
              }
            </tbody>
          </table>
        </div>

        ${
          observacoes
            ? `<div class="card"><div class="eyebrow">Observacoes do fechamento</div><p class="helper" style="margin-top:10px;">${observacoes}</p></div>`
            : ""
        }
      </div>
      <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 300); };</script>
    </body>
  </html>`;
}

export async function imprimirRelatorioFechamentoCaixa(
  params: FechamentoReportParams
) {
  if (typeof window === "undefined") return;

  const supabase = createClient();
  const { idSalao, sessao, valorFechamento, observacoes } = params;

  const { data: movimentos, error: movimentosError } = await supabase
    .from("caixa_movimentacoes")
    .select("id, id_comanda, forma_pagamento, valor, created_at, tipo, descricao")
    .eq("id_salao", idSalao)
    .eq("id_sessao", sessao.id)
    .order("created_at", { ascending: true });

  if (movimentosError) {
    throw movimentosError;
  }

  const vendaMovimentos = ((movimentos as MovimentoVenda[]) || []).filter(
    (item) => item.tipo === "venda"
  );
  const outrosMovimentos = ((movimentos as MovimentoVenda[]) || []).filter(
    (item) => item.tipo !== "venda"
  );

  const porForma = new Map();
  for (const item of vendaMovimentos) {
    const forma = formatFormaPagamento(item.forma_pagamento);
    porForma.set(forma, Number((porForma.get(forma) || 0) + Number(item.valor || 0)));
  }

  const comandasIds = Array.from(
    new Set(
      vendaMovimentos
        .map((item) => item.id_comanda)
        .filter((value): value is string => Boolean(value))
    )
  );

  let comandas: ComandaResumo[] = [];
  if (comandasIds.length) {
    const { data: comandasData, error: comandasError } = await supabase
      .from("comandas")
      .select("id, numero, total, fechada_em, clientes(nome)")
      .in("id", comandasIds);

    if (comandasError) {
      throw comandasError;
    }

    comandas = (comandasData as ComandaResumo[]) || [];
  }

  const html = buildHtml({
    sessao,
    valorFechamento,
    observacoes,
    vendasPorForma: Array.from(porForma.entries()).map(([forma, valor]) => ({
      forma,
      valor,
    })),
    comandas,
    outrosMovimentos,
  });

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  document.body.appendChild(iframe);

  const cleanup = () => {
    window.setTimeout(() => {
      iframe.remove();
    }, 1000);
  };

  const doc = iframe.contentDocument;
  if (!doc) {
    cleanup();
    throw new Error("Nao foi possivel montar o relatorio de fechamento.");
  }

  doc.open();
  doc.write(html);
  doc.close();
  cleanup();
}
