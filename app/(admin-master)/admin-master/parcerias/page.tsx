import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { autentiqueConfigurado } from "@/lib/parcerias/autentique";
import {
  atualizarCampanhaParceria,
  criarCampanhaParceria,
  criarParceiro,
  gerarContratoParceria,
  salvarCriativoParceria,
} from "./actions";
import { enviarContratoAutentique, sincronizarContratoAutentique } from "./autentique-actions";

export const dynamic = "force-dynamic";

function brl(value: unknown) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
}

export default async function AdminMasterParceriasPage() {
  await requireAdminMasterUser("comunicacao_ver");
  const supabase = getSupabaseAdmin() as any;
  const autentiqueAtivo = autentiqueConfigurado();

  const [{ data: parceiros }, { data: campanhas }, { data: contratos }, { data: metricas }] = await Promise.all([
    supabase.from("parceiros_comerciais").select("id,razao_social,nome_fantasia,segmento,cidade,uf,status,email,whatsapp").order("criado_em", { ascending: false }).limit(100),
    supabase.from("parceria_campanhas").select("id,id_parceiro,nome,status,valor_contratado,inicio_em,fim_em,publico,locais_exibicao,prioridade,peso_rotacao,limite_frequencia_dia,limite_impressoes_dia,exclusiva,parceiros_comerciais(razao_social,nome_fantasia)").order("criado_em", { ascending: false }).limit(100),
    supabase.from("parceria_contratos").select("id,id_campanha,numero,status,valor,hash_documento_sha256,assinado_em,signatario_email,provedor_assinatura,envelope_externo_id,url_assinatura,evidencia_assinatura,parceiros_comerciais(razao_social,nome_fantasia)").order("criado_em", { ascending: false }).limit(100),
    supabase.from("parceria_metricas_diarias").select("id_campanha,impressoes,cliques,conversoes,cupons").order("data", { ascending: false }).limit(5000),
  ]);

  const parceirosRows = parceiros || [];
  const campanhasRows = campanhas || [];
  const contratosRows = contratos || [];
  const metricasRows = metricas || [];
  const receitaContratada = campanhasRows.reduce((sum: number, row: any) => sum + Number(row.valor_contratado || 0), 0);
  const totalImpressoes = metricasRows.reduce((sum: number, row: any) => sum + Number(row.impressoes || 0), 0);
  const totalCliques = metricasRows.reduce((sum: number, row: any) => sum + Number(row.cliques || 0), 0);
  const totalConversoes = metricasRows.reduce((sum: number, row: any) => sum + Number(row.conversoes || 0), 0);
  const ctr = totalImpressoes ? (totalCliques / totalImpressoes) * 100 : 0;

  const metricasPorCampanha = new Map<string, { impressoes: number; cliques: number; conversoes: number }>();
  for (const row of metricasRows) {
    const current = metricasPorCampanha.get(row.id_campanha) || { impressoes: 0, cliques: 0, conversoes: 0 };
    current.impressoes += Number(row.impressoes || 0);
    current.cliques += Number(row.cliques || 0);
    current.conversoes += Number(row.conversoes || 0);
    metricasPorCampanha.set(row.id_campanha, current);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.24em] text-amber-700">Receita • Parcerias diretas</div>
            <h1 className="mt-2 font-display text-3xl font-bold text-zinc-950">Publicidade e Parcerias</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">Um único anúncio por slot. O motor escolhe automaticamente por segmentação, prioridade, peso, limite de frequência e teto diário.</p>
          </div>
          <div className="rounded-2xl bg-zinc-950 px-5 py-4 text-white"><div className="text-xs uppercase tracking-[0.2em] text-zinc-400">Receita contratada</div><div className="mt-1 text-2xl font-black">{brl(receitaContratada)}</div></div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <div className="rounded-2xl bg-zinc-50 p-4"><div className="text-xs font-bold uppercase text-zinc-500">Parceiros</div><div className="mt-1 text-2xl font-black">{parceirosRows.length}</div></div>
          <div className="rounded-2xl bg-zinc-50 p-4"><div className="text-xs font-bold uppercase text-zinc-500">Campanhas</div><div className="mt-1 text-2xl font-black">{campanhasRows.length}</div></div>
          <div className="rounded-2xl bg-zinc-50 p-4"><div className="text-xs font-bold uppercase text-zinc-500">Impressões</div><div className="mt-1 text-2xl font-black">{totalImpressoes}</div></div>
          <div className="rounded-2xl bg-zinc-50 p-4"><div className="text-xs font-bold uppercase text-zinc-500">Cliques</div><div className="mt-1 text-2xl font-black">{totalCliques}</div></div>
          <div className="rounded-2xl bg-zinc-50 p-4"><div className="text-xs font-bold uppercase text-zinc-500">CTR</div><div className="mt-1 text-2xl font-black">{ctr.toFixed(1)}%</div></div>
          <div className="rounded-2xl bg-zinc-50 p-4"><div className="text-xs font-bold uppercase text-zinc-500">Conversões</div><div className="mt-1 text-2xl font-black">{totalConversoes}</div></div>
        </div>

        <div className={`mt-5 rounded-2xl border p-4 text-sm ${autentiqueAtivo ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
          <b>Assinatura eletrônica Autentique:</b> {autentiqueAtivo ? "configurada no servidor." : "integração pronta, aguardando AUTENTIQUE_API_TOKEN na Vercel."}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <form action={criarParceiro} className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black">Novo parceiro</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <input name="razao_social" required placeholder="Razão social *" className="rounded-2xl border border-zinc-200 px-4 py-3" />
            <input name="nome_fantasia" placeholder="Nome fantasia" className="rounded-2xl border border-zinc-200 px-4 py-3" />
            <input name="cpf_cnpj" placeholder="CPF/CNPJ" className="rounded-2xl border border-zinc-200 px-4 py-3" />
            <input name="segmento" placeholder="Segmento" className="rounded-2xl border border-zinc-200 px-4 py-3" />
            <input name="email" type="email" placeholder="E-mail" className="rounded-2xl border border-zinc-200 px-4 py-3" />
            <input name="whatsapp" placeholder="WhatsApp" className="rounded-2xl border border-zinc-200 px-4 py-3" />
            <input name="cidade" placeholder="Cidade" className="rounded-2xl border border-zinc-200 px-4 py-3" />
            <input name="uf" placeholder="UF" maxLength={2} className="rounded-2xl border border-zinc-200 px-4 py-3" />
          </div>
          <button className="mt-4 rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-black text-white">Cadastrar parceiro</button>
        </form>

        <form action={criarCampanhaParceria} className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black">Nova campanha direta</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <select name="id_parceiro" required className="rounded-2xl border border-zinc-200 px-4 py-3"><option value="">Selecione o parceiro *</option>{parceirosRows.map((p: any) => <option key={p.id} value={p.id}>{p.nome_fantasia || p.razao_social}</option>)}</select>
            <input name="nome" required placeholder="Nome da campanha *" className="rounded-2xl border border-zinc-200 px-4 py-3" />
            <input name="valor_contratado" inputMode="decimal" placeholder="Valor contratado" className="rounded-2xl border border-zinc-200 px-4 py-3" />
            <select name="modelo_cobranca" className="rounded-2xl border border-zinc-200 px-4 py-3"><option value="mensal">Mensal</option><option value="periodo">Período fechado</option><option value="cpm">CPM</option><option value="cpc">CPC</option><option value="cpa">CPA</option><option value="permuta">Permuta</option></select>
            <input name="inicio_em" type="datetime-local" className="rounded-2xl border border-zinc-200 px-4 py-3" />
            <input name="fim_em" type="datetime-local" className="rounded-2xl border border-zinc-200 px-4 py-3" />
            <input name="cidade" placeholder="Cidade alvo (vazio = qualquer)" className="rounded-2xl border border-zinc-200 px-4 py-3" />
            <input name="uf" placeholder="UF alvo" maxLength={2} className="rounded-2xl border border-zinc-200 px-4 py-3" />
            <input name="destino_url" placeholder="Site / WhatsApp / Instagram" className="rounded-2xl border border-zinc-200 px-4 py-3 sm:col-span-2" />
            <input name="cupom_codigo" placeholder="Cupom opcional" className="rounded-2xl border border-zinc-200 px-4 py-3" />
            <input name="descricao" placeholder="Descrição" className="rounded-2xl border border-zinc-200 px-4 py-3" />
            <input name="prioridade" type="number" min={0} max={100} defaultValue={0} placeholder="Prioridade 0-100" className="rounded-2xl border border-zinc-200 px-4 py-3" />
            <input name="peso_rotacao" type="number" min={1} max={100} defaultValue={1} placeholder="Peso de rotação" className="rounded-2xl border border-zinc-200 px-4 py-3" />
            <input name="limite_frequencia_dia" type="number" min={1} max={50} defaultValue={2} placeholder="Exibições por navegador/dia" className="rounded-2xl border border-zinc-200 px-4 py-3" />
            <input name="limite_impressoes_dia" type="number" min={1} placeholder="Teto total/dia (opcional)" className="rounded-2xl border border-zinc-200 px-4 py-3" />
          </div>
          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <label className="flex gap-2"><input type="checkbox" name="publico" value="salao" defaultChecked /> Salões</label>
            <label className="flex gap-2"><input type="checkbox" name="publico" value="profissional" /> Profissionais</label>
            <label className="flex gap-2"><input type="checkbox" name="publico" value="cliente" /> Clientes</label>
            <label className="flex gap-2"><input type="checkbox" name="locais_exibicao" value="dashboard" defaultChecked /> Dashboard do salão</label>
            <label className="flex gap-2"><input type="checkbox" name="locais_exibicao" value="app_cliente" /> App Cliente</label>
            <label className="flex gap-2"><input type="checkbox" name="locais_exibicao" value="parceiros" defaultChecked /> Vitrine Parceiros</label>
            <label className="flex gap-2 font-bold text-amber-800"><input type="checkbox" name="exclusiva" /> Exclusividade na prioridade</label>
          </div>
          <button className="mt-4 rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-black text-white">Criar campanha</button>
        </form>
      </div>

      <section className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black">Campanhas, distribuição e contratos</h2>
        <div className="mt-4 space-y-4">
          {campanhasRows.map((c: any) => {
            const parceiro = Array.isArray(c.parceiros_comerciais) ? c.parceiros_comerciais[0] : c.parceiros_comerciais;
            const contrato = contratosRows.find((x: any) => x.id_campanha === c.id);
            const m = metricasPorCampanha.get(c.id) || { impressoes: 0, cliques: 0, conversoes: 0 };
            return (
              <article key={c.id} className="rounded-[22px] border border-zinc-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><div className="text-xs font-bold text-zinc-500">{parceiro?.nome_fantasia || parceiro?.razao_social || "—"}</div><h3 className="mt-1 text-lg font-black">{c.nome}</h3><div className="mt-2 text-xs text-zinc-500">{m.impressoes} impressões • {m.cliques} cliques • {m.conversoes} conversões</div></div>
                  <div className="text-right"><div className="text-sm font-black">{brl(c.valor_contratado)}</div><div className="mt-1 text-xs font-bold uppercase text-zinc-500">{c.status}</div></div>
                </div>

                <form action={atualizarCampanhaParceria} className="mt-4 grid gap-2 md:grid-cols-6">
                  <input type="hidden" name="id_campanha" value={c.id} />
                  <select name="status" defaultValue={c.status} className="rounded-xl border border-zinc-200 px-3 py-2 text-sm"><option value="aguardando_contrato">Aguardando contrato</option><option value="agendada">Agendada</option><option value="ativa">Ativa</option><option value="pausada">Pausada</option><option value="encerrada">Encerrada</option></select>
                  <input name="prioridade" type="number" min={0} max={100} defaultValue={c.prioridade || 0} title="Prioridade" className="rounded-xl border border-zinc-200 px-3 py-2 text-sm" />
                  <input name="peso_rotacao" type="number" min={1} max={100} defaultValue={c.peso_rotacao || 1} title="Peso" className="rounded-xl border border-zinc-200 px-3 py-2 text-sm" />
                  <input name="limite_frequencia_dia" type="number" min={1} max={50} defaultValue={c.limite_frequencia_dia || 2} title="Frequência por dia" className="rounded-xl border border-zinc-200 px-3 py-2 text-sm" />
                  <input name="limite_impressoes_dia" type="number" min={1} defaultValue={c.limite_impressoes_dia || ""} placeholder="Teto/dia" className="rounded-xl border border-zinc-200 px-3 py-2 text-sm" />
                  <label className="flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-sm"><input name="exclusiva" type="checkbox" defaultChecked={Boolean(c.exclusiva)} /> Exclusiva</label>
                  <button className="rounded-xl bg-zinc-950 px-3 py-2 text-sm font-black text-white md:col-span-6">Salvar distribuição</button>
                </form>

                <form action={salvarCriativoParceria} className="mt-3 grid gap-2 border-t border-zinc-100 pt-3 md:grid-cols-3">
                  <input type="hidden" name="id_campanha" value={c.id} />
                  <input name="titulo" required placeholder="Título do anúncio *" className="rounded-xl border border-zinc-200 px-3 py-2 text-sm" />
                  <input name="subtitulo" placeholder="Subtítulo" className="rounded-xl border border-zinc-200 px-3 py-2 text-sm" />
                  <input name="imagem_url" placeholder="URL da imagem/banner" className="rounded-xl border border-zinc-200 px-3 py-2 text-sm" />
                  <input name="cta_texto" placeholder="Texto do botão" className="rounded-xl border border-zinc-200 px-3 py-2 text-sm" />
                  <input name="destino_url" placeholder="Destino do clique" className="rounded-xl border border-zinc-200 px-3 py-2 text-sm" />
                  <input name="alt_text" placeholder="Descrição acessível da imagem" className="rounded-xl border border-zinc-200 px-3 py-2 text-sm" />
                  <button className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-black md:col-span-3">Adicionar criativo</button>
                </form>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3">
                  {!contrato ? (
                    <form action={gerarContratoParceria}><input type="hidden" name="id_campanha" value={c.id} /><button className="rounded-xl border border-zinc-300 px-3 py-2 text-xs font-black">Gerar contrato</button></form>
                  ) : (
                    <>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{contrato.status} • {contrato.numero}</span>
                      {!contrato.envelope_externo_id ? <form action={enviarContratoAutentique}><input type="hidden" name="id_contrato" value={contrato.id} /><button disabled={!autentiqueAtivo || !contrato.signatario_email} className="rounded-xl bg-zinc-950 px-3 py-2 text-xs font-black text-white disabled:opacity-40">Enviar para assinatura</button></form> : <form action={sincronizarContratoAutentique}><input type="hidden" name="id_contrato" value={contrato.id} /><button disabled={!autentiqueAtivo} className="rounded-xl border border-zinc-300 px-3 py-2 text-xs font-black disabled:opacity-40">Sincronizar assinatura</button></form>}
                      {contrato.url_assinatura ? <a href={contrato.url_assinatura} target="_blank" rel="noreferrer" className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-black text-amber-900">Abrir assinatura</a> : null}
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black">Como a publicidade é distribuída</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl bg-zinc-50 p-4 text-sm leading-6"><b>1 anúncio por slot.</b><br />Nunca empilha vários banners no Dashboard ou no App Cliente.</div>
          <div className="rounded-2xl bg-zinc-50 p-4 text-sm leading-6"><b>Rotação justa.</b><br />Prioridade, peso e impressões do dia determinam a próxima campanha.</div>
          <div className="rounded-2xl bg-zinc-50 p-4 text-sm leading-6"><b>Frequency cap.</b><br />O mesmo navegador deixa de ver a campanha quando atinge o limite diário.</div>
          <div className="rounded-2xl bg-zinc-50 p-4 text-sm leading-6"><b>Sem venda de base.</b><br />A segmentação fica dentro do Salão Premium e as métricas são agregadas.</div>
        </div>
      </section>
    </div>
  );
}
