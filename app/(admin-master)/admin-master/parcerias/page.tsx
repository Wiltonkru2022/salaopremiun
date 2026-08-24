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
    supabase.from("parceria_campanhas").select("id,id_parceiro,nome,status,valor_contratado,inicio_em,fim_em,publico,locais_exibicao,prioridade,peso_rotacao,limite_frequencia_dia,limite_impressoes_dia,exclusiva,origem,categoria_interna,parceiros_comerciais(razao_social,nome_fantasia)").order("criado_em", { ascending: false }).limit(150),
    supabase.from("parceria_contratos").select("id,id_campanha,numero,status,valor,assinado_em,signatario_email,envelope_externo_id,url_assinatura").order("criado_em", { ascending: false }).limit(100),
    supabase.from("parceria_metricas_diarias").select("id_campanha,impressoes,cliques,conversoes,cupons").order("data", { ascending: false }).limit(5000),
  ]);

  const parceirosRows = parceiros || [];
  const campanhasRows = campanhas || [];
  const contratosRows = contratos || [];
  const metricasRows = metricas || [];
  const comerciais = campanhasRows.filter((c: any) => c.origem !== "salao_premium");
  const internas = campanhasRows.filter((c: any) => c.origem === "salao_premium");
  const receitaContratada = comerciais.reduce((sum: number, row: any) => sum + Number(row.valor_contratado || 0), 0);
  const totalImpressoes = metricasRows.reduce((sum: number, row: any) => sum + Number(row.impressoes || 0), 0);
  const totalCliques = metricasRows.reduce((sum: number, row: any) => sum + Number(row.cliques || 0), 0);
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
            <div className="text-xs font-black uppercase tracking-[0.24em] text-amber-700">Comunicação • Receita • Distribuição</div>
            <h1 className="mt-2 font-display text-3xl font-bold text-zinc-950">Publicidade e Campanhas Salão Premium</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">O mesmo motor distribui campanhas de parceiros e comunicações próprias. Cada slot mostra somente uma campanha por vez, com segmentação, prioridade, rotação e limite de frequência.</p>
          </div>
          <div className="rounded-2xl bg-zinc-950 px-5 py-4 text-white"><div className="text-xs uppercase tracking-[0.2em] text-zinc-400">Receita comercial</div><div className="mt-1 text-2xl font-black">{brl(receitaContratada)}</div></div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {[['Parceiros', parceirosRows.length], ['Publicidade', comerciais.length], ['Campanhas próprias', internas.length], ['Impressões', totalImpressoes], ['Cliques', totalCliques], ['CTR', `${ctr.toFixed(1)}%`]].map(([label, value]) => <div key={String(label)} className="rounded-2xl bg-zinc-50 p-4"><div className="text-xs font-bold uppercase text-zinc-500">{label}</div><div className="mt-1 text-2xl font-black">{value}</div></div>)}
        </div>
        <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-950"><b>Prioridade automática:</b> comunicado crítico do Salão Premium sempre passa à frente de publicidade comercial elegível. Novidades e benefícios normais entram na rotação pela prioridade configurada.</div>
        <div className={`mt-3 rounded-2xl border p-4 text-sm ${autentiqueAtivo ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}><b>Autentique:</b> {autentiqueAtivo ? "configurado para contratos comerciais." : "integração pronta, aguardando AUTENTIQUE_API_TOKEN na Vercel."}</div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <form action={criarParceiro} className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black">Novo parceiro comercial</h2>
          <p className="mt-1 text-sm text-zinc-500">Necessário somente para publicidade paga ou permuta.</p>
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
          <h2 className="text-xl font-black">Nova campanha</h2>
          <p className="mt-1 text-sm text-zinc-500">Use para parceiro comercial ou divulgação do próprio Salão Premium.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <select name="origem" defaultValue="parceiro" className="rounded-2xl border border-zinc-200 px-4 py-3"><option value="parceiro">Parceiro comercial</option><option value="salao_premium">Campanha Salão Premium</option></select>
            <select name="categoria_interna" defaultValue="novidade" className="rounded-2xl border border-zinc-200 px-4 py-3"><option value="novidade">Novidade</option><option value="beneficio">Benefício</option><option value="comunicado">Comunicado</option><option value="critico">Comunicado crítico</option></select>
            <select name="id_parceiro" className="rounded-2xl border border-zinc-200 px-4 py-3"><option value="">Parceiro (somente publicidade)</option>{parceirosRows.map((p: any) => <option key={p.id} value={p.id}>{p.nome_fantasia || p.razao_social}</option>)}</select>
            <input name="nome" required placeholder="Nome da campanha *" className="rounded-2xl border border-zinc-200 px-4 py-3" />
            <input name="valor_contratado" inputMode="decimal" placeholder="Valor contratado (publicidade)" className="rounded-2xl border border-zinc-200 px-4 py-3" />
            <select name="modelo_cobranca" className="rounded-2xl border border-zinc-200 px-4 py-3"><option value="mensal">Mensal</option><option value="periodo">Período fechado</option><option value="cpm">CPM</option><option value="cpc">CPC</option><option value="cpa">CPA</option><option value="permuta">Permuta</option></select>
            <input name="inicio_em" type="datetime-local" className="rounded-2xl border border-zinc-200 px-4 py-3" />
            <input name="fim_em" type="datetime-local" className="rounded-2xl border border-zinc-200 px-4 py-3" />
            <input name="cidade" placeholder="Cidade alvo (vazio = qualquer)" className="rounded-2xl border border-zinc-200 px-4 py-3" />
            <input name="uf" placeholder="UF alvo" maxLength={2} className="rounded-2xl border border-zinc-200 px-4 py-3" />
            <input name="destino_url" placeholder="Link de destino" className="rounded-2xl border border-zinc-200 px-4 py-3 sm:col-span-2" />
            <input name="cupom_codigo" placeholder="Cupom opcional" className="rounded-2xl border border-zinc-200 px-4 py-3" />
            <input name="descricao" placeholder="Descrição" className="rounded-2xl border border-zinc-200 px-4 py-3" />
            <input name="prioridade" type="number" min={0} max={100} defaultValue={50} placeholder="Prioridade 0-100" className="rounded-2xl border border-zinc-200 px-4 py-3" />
            <input name="peso_rotacao" type="number" min={1} max={100} defaultValue={1} placeholder="Peso de rotação" className="rounded-2xl border border-zinc-200 px-4 py-3" />
            <input name="limite_frequencia_dia" type="number" min={1} max={50} defaultValue={2} placeholder="Exibições por navegador/dia" className="rounded-2xl border border-zinc-200 px-4 py-3" />
            <input name="limite_impressoes_dia" type="number" min={1} placeholder="Teto total/dia (opcional)" className="rounded-2xl border border-zinc-200 px-4 py-3" />
          </div>
          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <label className="flex gap-2"><input type="checkbox" name="publico" value="salao" defaultChecked /> Salões</label>
            <label className="flex gap-2"><input type="checkbox" name="publico" value="profissional" /> Profissionais</label>
            <label className="flex gap-2"><input type="checkbox" name="publico" value="cliente" defaultChecked /> Clientes</label>
            <label className="flex gap-2"><input type="checkbox" name="locais_exibicao" value="dashboard" defaultChecked /> Dashboard do salão</label>
            <label className="flex gap-2"><input type="checkbox" name="locais_exibicao" value="app_cliente" defaultChecked /> App Cliente</label>
            <label className="flex gap-2"><input type="checkbox" name="locais_exibicao" value="parceiros" defaultChecked /> Parceiros e benefícios</label>
            <label className="flex gap-2 font-bold text-amber-800"><input type="checkbox" name="exclusiva" /> Exclusiva na prioridade</label>
          </div>
          <button className="mt-4 rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-black text-white">Criar campanha</button>
        </form>
      </div>

      <section className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black">Criativo / conteúdo</h2>
        <form action={salvarCriativoParceria} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <select name="id_campanha" required className="rounded-2xl border border-zinc-200 px-4 py-3"><option value="">Campanha *</option>{campanhasRows.map((c: any) => <option key={c.id} value={c.id}>{c.origem === "salao_premium" ? "Salão Premium" : "Parceiro"} • {c.nome}</option>)}</select>
          <input name="titulo" required placeholder="Título *" className="rounded-2xl border border-zinc-200 px-4 py-3" />
          <input name="subtitulo" placeholder="Texto de apoio" className="rounded-2xl border border-zinc-200 px-4 py-3" />
          <input name="imagem_url" placeholder="URL da imagem" className="rounded-2xl border border-zinc-200 px-4 py-3" />
          <input name="cta_texto" placeholder="Texto do botão" defaultValue="Saiba mais" className="rounded-2xl border border-zinc-200 px-4 py-3" />
          <input name="destino_url" placeholder="Link do botão" className="rounded-2xl border border-zinc-200 px-4 py-3" />
          <button className="rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-black text-white">Salvar conteúdo</button>
        </form>
      </section>

      <section className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black">Campanhas, distribuição e contratos</h2>
        <div className="mt-4 space-y-4">
          {campanhasRows.map((c: any) => {
            const parceiro = Array.isArray(c.parceiros_comerciais) ? c.parceiros_comerciais[0] : c.parceiros_comerciais;
            const contrato = contratosRows.find((x: any) => x.id_campanha === c.id);
            const m = metricasPorCampanha.get(c.id) || { impressoes: 0, cliques: 0, conversoes: 0 };
            const interna = c.origem === "salao_premium";
            return <article key={c.id} className="rounded-[22px] border border-zinc-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><div className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase ${interna ? "bg-sky-50 text-sky-700" : "bg-amber-50 text-amber-800"}`}>{interna ? `Salão Premium • ${c.categoria_interna || "novidade"}` : `Publicidade • ${parceiro?.nome_fantasia || parceiro?.razao_social || "Parceiro"}`}</div><h3 className="mt-2 text-lg font-black">{c.nome}</h3><div className="mt-2 text-xs text-zinc-500">{m.impressoes} impressões • {m.cliques} cliques • {m.conversoes} conversões</div></div>
                <div className="text-right"><div className="text-sm font-black">{interna ? "Campanha própria" : brl(c.valor_contratado)}</div><div className="mt-1 text-xs font-bold uppercase text-zinc-500">{c.status}</div></div>
              </div>
              <form action={atualizarCampanhaParceria} className="mt-4 grid gap-2 md:grid-cols-7">
                <input type="hidden" name="id_campanha" value={c.id} />
                <select name="status" defaultValue={c.status} className="rounded-xl border border-zinc-200 px-3 py-2 text-sm"><option value="aguardando_contrato">Aguardando contrato</option><option value="agendada">Agendada</option><option value="ativa">Ativa</option><option value="pausada">Pausada</option><option value="encerrada">Encerrada</option></select>
                <select name="categoria_interna" defaultValue={c.categoria_interna || ""} className="rounded-xl border border-zinc-200 px-3 py-2 text-sm"><option value="">Publicidade</option><option value="novidade">Novidade</option><option value="beneficio">Benefício</option><option value="comunicado">Comunicado</option><option value="critico">Crítico</option></select>
                <input name="prioridade" type="number" min={0} max={100} defaultValue={c.prioridade || 0} title="Prioridade" className="rounded-xl border border-zinc-200 px-3 py-2 text-sm" />
                <input name="peso_rotacao" type="number" min={1} max={100} defaultValue={c.peso_rotacao || 1} title="Peso" className="rounded-xl border border-zinc-200 px-3 py-2 text-sm" />
                <input name="limite_frequencia_dia" type="number" min={1} max={50} defaultValue={c.limite_frequencia_dia || 2} title="Frequência/dia" className="rounded-xl border border-zinc-200 px-3 py-2 text-sm" />
                <input name="limite_impressoes_dia" type="number" min={1} defaultValue={c.limite_impressoes_dia || ""} title="Teto/dia" className="rounded-xl border border-zinc-200 px-3 py-2 text-sm" />
                <label className="flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-bold"><input type="checkbox" name="exclusiva" defaultChecked={Boolean(c.exclusiva)} /> Exclusiva</label>
                <button className="rounded-xl bg-zinc-950 px-3 py-2 text-xs font-black text-white md:col-span-7 md:justify-self-start">Salvar distribuição</button>
              </form>
              {!interna ? <div className="mt-3 flex flex-wrap gap-2">
                {!contrato ? <form action={gerarContratoParceria}><input type="hidden" name="id_campanha" value={c.id} /><button className="rounded-xl border border-zinc-300 px-3 py-2 text-xs font-black">Gerar contrato</button></form> : <>
                  <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">{contrato.status} • {contrato.numero}</span>
                  {!contrato.envelope_externo_id ? <form action={enviarContratoAutentique}><input type="hidden" name="id_contrato" value={contrato.id} /><button disabled={!autentiqueAtivo || !contrato.signatario_email} className="rounded-xl bg-zinc-950 px-3 py-2 text-xs font-black text-white disabled:opacity-40">Enviar para assinatura</button></form> : <form action={sincronizarContratoAutentique}><input type="hidden" name="id_contrato" value={contrato.id} /><button disabled={!autentiqueAtivo} className="rounded-xl border border-zinc-300 px-3 py-2 text-xs font-black disabled:opacity-40">Sincronizar</button></form>}
                  {contrato.url_assinatura ? <a href={contrato.url_assinatura} target="_blank" rel="noreferrer" className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-black text-amber-900">Abrir assinatura</a> : null}
                </>}
              </div> : <div className="mt-3 text-xs font-semibold text-sky-700">Campanha própria: não exige contrato comercial.</div>}
            </article>;
          })}
        </div>
      </section>
    </div>
  );
}
