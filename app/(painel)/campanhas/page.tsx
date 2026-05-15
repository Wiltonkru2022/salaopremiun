import { redirect } from "next/navigation";
import { Megaphone, Copy, Gift, Cake, Clock3 } from "lucide-react";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { criarCampanhaCupomAction } from "./actions";

export const metadata = {
  title: "Campanhas",
};

type SearchParams = {
  ok?: string | string[];
  erro?: string | string[];
};

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value || "";
}

function siteUrl() {
  return String(process.env.NEXT_PUBLIC_SITE_URL || "https://salaopremiun.com.br").replace(/\/$/, "");
}

function formatDate(value: unknown) {
  const iso = String(value || "").slice(0, 10);
  return iso ? iso.split("-").reverse().join("/") : "Sem validade";
}

async function loadCampanhasData(idSalao: string) {
  const supabase = getSupabaseAdmin();
  const hoje = new Date();
  const mesAtual = String(hoje.getMonth() + 1).padStart(2, "0");
  const limiteInativos = new Date();
  limiteInativos.setDate(limiteInativos.getDate() - 30);

  const [cuponsResult, aniversariantesResult, clientesResult, agendamentosResult] =
    await Promise.all([
      (supabase as any)
        .from("cupons_salao")
        .select("id, codigo, nome, descricao, tipo_campanha, publico_alvo, valor_desconto, tipo_desconto, valido_ate, ativo, resgate_token, created_at")
        .eq("id_salao", idSalao)
        .order("created_at", { ascending: false })
        .limit(12),
      (supabase as any)
        .from("clientes")
        .select("id, nome, telefone, whatsapp, data_nascimento")
        .eq("id_salao", idSalao)
        .eq("ativo", true)
        .not("data_nascimento", "is", null)
        .limit(80),
      (supabase as any)
        .from("clientes")
        .select("id, nome, telefone, whatsapp, created_at")
        .eq("id_salao", idSalao)
        .eq("ativo", true)
        .limit(120),
      (supabase as any)
        .from("agendamentos")
        .select("cliente_id, data")
        .eq("id_salao", idSalao)
        .in("status", ["atendido", "aguardando_pagamento"])
        .gte("data", limiteInativos.toISOString().slice(0, 10))
        .limit(500),
    ]);

  const clientesComAtendimentoRecente = new Set(
    ((agendamentosResult.data || []) as Array<Record<string, unknown>>).map((item) =>
      String(item.cliente_id || "")
    )
  );
  const inativos = ((clientesResult.data || []) as Array<Record<string, unknown>>)
    .filter((cliente) => !clientesComAtendimentoRecente.has(String(cliente.id || "")))
    .slice(0, 8);
  const aniversariantes = ((aniversariantesResult.data || []) as Array<Record<string, unknown>>)
    .filter((cliente) => String(cliente.data_nascimento || "").slice(5, 7) === mesAtual)
    .slice(0, 8);

  return {
    cupons: (cuponsResult.data || []) as Array<Record<string, unknown>>,
    aniversariantes,
    inativos,
  };
}

export default async function CampanhasPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { user, usuario } = await getPainelUserContext();
  if (!user || !usuario?.id_salao) redirect("/login");
  if (String(usuario.nivel || "").toLowerCase() !== "admin") redirect("/dashboard");

  const params = await searchParams;
  const data = await loadCampanhasData(usuario.id_salao).catch(() => ({
    cupons: [],
    aniversariantes: [],
    inativos: [],
  }));
  const baseUrl = siteUrl();

  return (
    <main className="space-y-6">
      <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm md:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-amber-800">
              <Megaphone size={14} />
              Campanhas em desenvolvimento
            </span>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-zinc-950 md:text-4xl">
              Cupons com resgate por link
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">
              Crie campanhas, copie o link de resgate e envie pelo WhatsApp manualmente.
              O cupom so aparece no app cliente depois que a pessoa resgatar.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
            <strong className="block text-zinc-950">Regra ativa</strong>
            Validade, resgate obrigatorio e limite de 1 uso por cliente.
          </div>
        </div>

        {firstParam(params.ok) ? (
          <p className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
            {firstParam(params.ok)}
          </p>
        ) : null}
        {firstParam(params.erro) ? (
          <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {firstParam(params.erro)}
          </p>
        ) : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <form action={criarCampanhaCupomAction} className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white">
              <Gift size={20} />
            </span>
            <div>
              <h2 className="text-xl font-black text-zinc-950">Criar cupom manual</h2>
              <p className="text-sm text-zinc-500">Para enviar o link pelo WhatsApp.</p>
            </div>
          </div>

          <input type="hidden" name="tipo" value="manual" />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Titulo
              <input name="titulo" required className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 outline-none focus:border-zinc-950" placeholder="Saudades de voce" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Codigo base
              <input name="codigo" className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 uppercase outline-none focus:border-zinc-950" placeholder="SAUDADES" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Tipo de desconto
              <select name="tipo_desconto" className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 outline-none focus:border-zinc-950">
                <option value="percentual">Percentual</option>
                <option value="valor_fixo">Valor fixo</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Desconto
              <input name="valor_desconto" required type="number" min="1" step="0.01" className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 outline-none focus:border-zinc-950" placeholder="15" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Publico
              <select name="publico_alvo" className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 outline-none focus:border-zinc-950">
                <option value="manual">Manual</option>
                <option value="inativos_30">Clientes sem voltar ha 30 dias</option>
                <option value="inativos_45">Clientes sem voltar ha 45 dias</option>
                <option value="inativos_60">Clientes sem voltar ha 60 dias</option>
                <option value="aniversariantes_mes">Aniversariantes do mes</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Validade
              <input name="valido_ate" type="date" className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 outline-none focus:border-zinc-950" />
            </label>
          </div>
          <label className="mt-4 grid gap-2 text-sm font-bold text-zinc-700">
            Mensagem
            <textarea name="descricao" rows={3} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 outline-none focus:border-zinc-950" placeholder="Use este cupom no seu proximo agendamento." />
          </label>
          <button className="mt-5 h-12 rounded-2xl bg-zinc-950 px-5 text-sm font-black text-white" type="submit">
            Criar campanha
          </button>
        </form>

        <div className="space-y-4">
          <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-black text-zinc-950">
              <Clock3 size={18} /> Recuperacao
            </h2>
            <p className="mt-1 text-sm text-zinc-500">{data.inativos.length} cliente(s) sem atendimento recente.</p>
            <div className="mt-4 space-y-2">
              {data.inativos.slice(0, 5).map((cliente) => (
                <div key={String(cliente.id)} className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm">
                  <strong>{String(cliente.nome || "Cliente")}</strong>
                  <span className="ml-2 text-zinc-500">{String(cliente.whatsapp || cliente.telefone || "")}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-black text-zinc-950">
              <Cake size={18} /> Aniversariantes do mes
            </h2>
            <p className="mt-1 text-sm text-zinc-500">{data.aniversariantes.length} cliente(s) encontrados.</p>
            <div className="mt-4 space-y-2">
              {data.aniversariantes.slice(0, 5).map((cliente) => (
                <div key={String(cliente.id)} className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm">
                  <strong>{String(cliente.nome || "Cliente")}</strong>
                  <span className="ml-2 text-zinc-500">{formatDate(cliente.data_nascimento)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
        <h2 className="text-xl font-black text-zinc-950">Datas especiais prontas</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {[
            ["maes", "Dia das Maes"],
            ["namorados", "Dia dos Namorados"],
            ["natal", "Natal"],
            ["black_friday", "Black Friday"],
          ].map(([key, label]) => (
            <form key={key} action={criarCampanhaCupomAction} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <input type="hidden" name="tipo" value="data_especial" />
              <input type="hidden" name="publico_alvo" value="data_especial" />
              <input type="hidden" name="template" value={key} />
              <input type="hidden" name="tipo_desconto" value="percentual" />
              <input type="hidden" name="valor_desconto" value="10" />
              <strong className="block text-sm text-zinc-950">{label}</strong>
              <button type="submit" className="mt-3 h-10 w-full rounded-xl bg-zinc-950 px-3 text-xs font-black text-white">
                Criar 10%
              </button>
            </form>
          ))}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
        <h2 className="text-xl font-black text-zinc-950">Campanhas criadas</h2>
        <div className="mt-4 grid gap-3">
          {data.cupons.map((cupom) => {
            const link = cupom.resgate_token
              ? `${baseUrl}/resgatar-cupom/${cupom.resgate_token}`
              : "";
            return (
              <div key={String(cupom.id)} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <strong className="text-base text-zinc-950">{String(cupom.nome || "Cupom")}</strong>
                    <p className="mt-1 text-sm text-zinc-500">
                      Codigo {String(cupom.codigo || "-")} · valido ate {formatDate(cupom.valido_ate)}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-zinc-700">
                    {String(cupom.tipo_campanha || "manual")}
                  </span>
                </div>
                {link ? (
                  <div className="mt-3 flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-3 md:flex-row md:items-center">
                    <code className="min-w-0 flex-1 truncate text-xs text-zinc-600">{link}</code>
                    <span className="inline-flex items-center gap-2 text-xs font-black text-zinc-500">
                      <Copy size={14} /> copie e envie no WhatsApp
                    </span>
                  </div>
                ) : null}
              </div>
            );
          })}
          {!data.cupons.length ? (
            <p className="rounded-2xl border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500">
              Nenhuma campanha criada ainda.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
