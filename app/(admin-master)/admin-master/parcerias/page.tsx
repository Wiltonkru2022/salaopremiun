import {
  BarChart3,
  Building2,
  ChevronDown,
  ExternalLink,
  FileSignature,
  Image as ImageIcon,
  Megaphone,
  MessageCircle,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getDatabaseAdmin } from "@/lib/db/admin";
import { autentiqueConfigurado } from "@/lib/parcerias/autentique";
import { buildPartnerWhatsAppUrl, normalizeExternalDestination } from "@/lib/parcerias/urls";
import {
  atualizarCampanhaParceria,
  atualizarCriativoParceria,
  criarCampanhaParceria,
  criarParceiro,
  excluirCampanhaParceria,
  excluirCriativoParceria,
  excluirParceiro,
  gerarContratoParceria,
  salvarCriativoParceria,
} from "./actions";
import { enviarContratoAutentique, sincronizarContratoAutentique } from "./autentique-actions";
import CampaignImageUpload from "./CampaignImageUpload";
import ContractPreviewButton from "./ContractPreviewButton";

export const dynamic = "force-dynamic";

const inputClass = "h-11 rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100";
const buttonClass = "inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-black text-white transition hover:bg-zinc-800";
const subtleButtonClass = "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-xs font-black text-zinc-800 transition hover:bg-zinc-50";

function brl(value: unknown) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    prospect: "Prospect",
    negociacao: "Negociação",
    ativo: "Ativo",
    pausado: "Pausado",
    encerrado: "Encerrado",
    aguardando_contrato: "Aguardando contrato",
    agendada: "Agendada",
    ativa: "Ativa",
    pausada: "Pausada",
    rascunho: "Rascunho",
    enviado_assinatura: "Enviado para assinatura",
    assinado: "Assinado",
    recusado: "Recusado",
  };
  return labels[status] || status.replaceAll("_", " ");
}

function statusClass(status: string) {
  if (["ativo", "ativa", "assinado"].includes(status)) return "bg-emerald-50 text-emerald-700";
  if (["pausado", "pausada", "encerrado", "encerrada", "recusado"].includes(status)) return "bg-zinc-100 text-zinc-600";
  if (["aguardando_contrato", "negociacao", "agendada", "enviado_assinatura"].includes(status)) return "bg-amber-50 text-amber-800";
  return "bg-sky-50 text-sky-700";
}

export default async function AdminMasterParceriasPage() {
  await requireAdminMasterUser("comunicacao_ver");
  const supabase = getDatabaseAdmin() as any;
  const autentiqueAtivo = autentiqueConfigurado();

  const [
    { data: parceiros },
    { data: campanhas },
    { data: criativos },
    { data: contratos },
    { data: metricas },
  ] = await Promise.all([
    supabase.from("parceiros_comerciais").select("id,razao_social,nome_fantasia,segmento,cidade,uf,status,email,whatsapp").order("criado_em", { ascending: false }).limit(100),
    supabase.from("parceria_campanhas").select("id,id_parceiro,nome,status,valor_contratado,inicio_em,fim_em,publico,locais_exibicao,prioridade,peso_rotacao,limite_frequencia_dia,limite_impressoes_dia,exclusiva,origem,categoria_interna,parceiros_comerciais(razao_social,nome_fantasia)").order("criado_em", { ascending: false }).limit(150),
    supabase.from("parceria_criativos").select("id,id_campanha,titulo,subtitulo,imagem_url,cta_texto,destino_url,formato,ativo").order("criado_em", { ascending: false }).limit(300),
    supabase.from("parceria_contratos").select("id,id_parceiro,id_campanha,numero,status,valor,assinado_em,signatario_email,envelope_externo_id,url_assinatura").order("criado_em", { ascending: false }).limit(150),
    supabase.from("parceria_metricas_diarias").select("id_campanha,impressoes,cliques,conversoes,cupons_utilizados").order("data", { ascending: false }).limit(5000),
  ]);

  const parceirosRows = parceiros || [];
  const campanhasRows = campanhas || [];
  const criativosRows = criativos || [];
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

  const contratosPorParceiro = new Map<string, number>();
  const campanhasPorParceiro = new Map<string, number>();
  for (const contrato of contratosRows) {
    if (contrato.id_parceiro) contratosPorParceiro.set(contrato.id_parceiro, (contratosPorParceiro.get(contrato.id_parceiro) || 0) + 1);
  }
  for (const campanha of comerciais) {
    if (campanha.id_parceiro) campanhasPorParceiro.set(campanha.id_parceiro, (campanhasPorParceiro.get(campanha.id_parceiro) || 0) + 1);
  }

  return (
    <div className="space-y-6 pb-10">
      <section className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">Publicidade e parcerias</div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-950">Empresas e anúncios</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-600">Siga a ordem: empresa → campanha → anúncio. Para campanhas do próprio Salão Premiun, pule a etapa da empresa.</p>
          </div>
          <div className="rounded-2xl bg-zinc-950 px-5 py-4 text-white">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Receita contratada</div>
            <div className="mt-1 text-2xl font-black">{brl(receitaContratada)}</div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {[
            ["1", "Empresa", "Cadastre quem está anunciando.", Building2],
            ["2", "Campanha", "Escolha público, local e período.", Megaphone],
            ["3", "Anúncio", "Envie a imagem e defina o botão.", ImageIcon],
          ].map(([step, title, description, Icon]: any) => (
            <div key={step} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-950 text-sm font-black text-white">{step}</div>
                <Icon size={19} className="text-amber-700" />
                <div className="font-black text-zinc-950">{title}</div>
              </div>
              <p className="mt-3 text-sm text-zinc-500">{description}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[["Empresas", parceirosRows.length], ["Campanhas de parceiros", comerciais.length], ["Campanhas Salão Premiun", internas.length], ["Impressões", totalImpressoes], ["CTR", `${ctr.toFixed(1)}%`]].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">{label}</div>
              <div className="mt-1 text-xl font-black text-zinc-950">{value}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="empresas" className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-500"><Building2 size={15} /> Etapa 1</div>
            <h2 className="mt-1 text-2xl font-black text-zinc-950">Empresas anunciantes</h2>
            <p className="mt-1 text-sm text-zinc-500">Cadastre, consulte e exclua empresas parceiras.</p>
          </div>
          <details>
            <summary className={`${buttonClass} cursor-pointer list-none`}><Plus size={16} /> Nova empresa</summary>
            <form action={criarParceiro} className="mt-4 grid gap-3 rounded-[22px] border border-zinc-200 bg-zinc-50 p-5 sm:min-w-[650px] sm:grid-cols-2">
              <input name="razao_social" required placeholder="Razão social *" className={inputClass} />
              <input name="nome_fantasia" placeholder="Nome fantasia" className={inputClass} />
              <input name="cpf_cnpj" placeholder="CPF/CNPJ" className={inputClass} />
              <input name="segmento" placeholder="Segmento" className={inputClass} />
              <input name="email" type="email" placeholder="E-mail" className={inputClass} />
              <input name="whatsapp" placeholder="WhatsApp" className={inputClass} />
              <input name="cidade" placeholder="Cidade" className={inputClass} />
              <input name="uf" placeholder="UF" maxLength={2} className={inputClass} />
              <button className={`${buttonClass} sm:col-span-2 sm:justify-self-start`}>Cadastrar empresa</button>
            </form>
          </details>
        </div>

        <div className="mt-5 grid gap-3 xl:grid-cols-2">
          {parceirosRows.length ? parceirosRows.map((p: any) => {
            const contratosCount = contratosPorParceiro.get(p.id) || 0;
            const campanhasCount = campanhasPorParceiro.get(p.id) || 0;
            const whatsappUrl = buildPartnerWhatsAppUrl(p.whatsapp, p.nome_fantasia || p.razao_social);
            return (
              <article key={p.id} className="rounded-[22px] border border-zinc-200 bg-zinc-50/60 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${statusClass(p.status)}`}>{statusLabel(p.status)}</span>
                    <h3 className="mt-2 text-lg font-black">{p.nome_fantasia || p.razao_social}</h3>
                    {p.nome_fantasia ? <div className="mt-1 text-xs text-zinc-500">{p.razao_social}</div> : null}
                  </div>
                  <div className="text-right text-xs text-zinc-500"><div><b>{campanhasCount}</b> campanha(s)</div><div className="mt-1"><b>{contratosCount}</b> contrato(s)</div></div>
                </div>
                <div className="mt-4 grid gap-2 text-sm text-zinc-600 sm:grid-cols-2">
                  <div><b>Segmento:</b> {p.segmento || "Não informado"}</div>
                  <div><b>Local:</b> {[p.cidade, p.uf].filter(Boolean).join(" / ") || "Não informado"}</div>
                  <div><b>E-mail:</b> {p.email || "Não informado"}</div>
                  <div><b>WhatsApp:</b> {p.whatsapp || "Não informado"}</div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-zinc-200 pt-4">
                  {whatsappUrl ? (
                    <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-black text-white transition hover:bg-emerald-700">
                      <MessageCircle size={14} /> Falar com a empresa
                    </a>
                  ) : (
                    <span className="inline-flex h-10 items-center rounded-xl bg-zinc-100 px-4 text-xs font-bold text-zinc-500">WhatsApp não informado</span>
                  )}
                  {contratosCount === 0 ? (
                    <details>
                      <summary className="inline-flex h-10 cursor-pointer list-none items-center gap-2 rounded-xl px-3 text-xs font-black text-red-700 hover:bg-red-50"><Trash2 size={14} /> Excluir empresa</summary>
                      <form action={excluirParceiro} className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-4">
                        <input type="hidden" name="id_parceiro" value={p.id} />
                        <p className="text-xs text-red-800">Digite <b>EXCLUIR</b> para confirmar.</p>
                        <div className="mt-3 flex gap-2"><input name="confirmacao" required placeholder="EXCLUIR" className={`${inputClass} flex-1 border-red-200`} /><button className="rounded-2xl bg-red-600 px-4 text-xs font-black text-white">Excluir</button></div>
                      </form>
                    </details>
                  ) : <div className="text-xs font-semibold text-zinc-500">Empresa preservada porque possui contrato registrado.</div>}
                </div>
              </article>
            );
          }) : <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 xl:col-span-2">Nenhuma empresa cadastrada.</div>}
        </div>
      </section>

      <section id="campanhas" className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-500"><Megaphone size={15} /> Etapa 2</div><h2 className="mt-1 text-2xl font-black">Campanhas</h2><p className="mt-1 text-sm text-zinc-500">Crie, pause, configure ou exclua.</p></div>
          <details>
            <summary className={`${buttonClass} cursor-pointer list-none`}><Plus size={16} /> Nova campanha</summary>
            <form action={criarCampanhaParceria} className="mt-4 rounded-[22px] border border-zinc-200 bg-zinc-50 p-5 xl:min-w-[850px]">
              <div className="grid gap-3 sm:grid-cols-2">
                <select name="origem" defaultValue="salao_premium" className={inputClass}><option value="salao_premium">Campanha do Salão Premiun</option><option value="parceiro">Publicidade de empresa parceira</option></select>
                <select name="id_parceiro" className={inputClass}><option value="">Empresa anunciante / não se aplica</option>{parceirosRows.map((p: any) => <option key={p.id} value={p.id}>{p.nome_fantasia || p.razao_social}</option>)}</select>
                <input name="nome" required placeholder="Nome da campanha *" className={inputClass} />
                <input name="descricao" placeholder="Descrição curta" className={inputClass} />
                <input name="destino_url" placeholder="Link de destino" className={`${inputClass} sm:col-span-2`} />
              </div>
              <div className="mt-4 grid gap-4 rounded-2xl border border-zinc-200 bg-white p-4 md:grid-cols-2">
                <div><div className="text-xs font-black uppercase text-zinc-500">Quem vai ver?</div><div className="mt-3 space-y-2 text-sm"><label className="flex gap-2"><input type="checkbox" name="publico" value="salao" defaultChecked /> Salões</label><label className="flex gap-2"><input type="checkbox" name="publico" value="profissional" /> Profissionais</label><label className="flex gap-2"><input type="checkbox" name="publico" value="cliente" /> Clientes</label></div></div>
                <div><div className="text-xs font-black uppercase text-zinc-500">Onde aparece?</div><div className="mt-3 space-y-2 text-sm"><label className="flex gap-2"><input type="checkbox" name="locais_exibicao" value="dashboard" defaultChecked /> Dashboard do salão</label><label className="flex gap-2"><input type="checkbox" name="locais_exibicao" value="app_cliente" /> App Cliente</label><label className="flex gap-2"><input type="checkbox" name="locais_exibicao" value="app_profissional" /> App Profissional</label><label className="flex gap-2"><input type="checkbox" name="locais_exibicao" value="parceiros" /> Parceiros e benefícios</label></div></div>
              </div>
              <details className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-black">Configurações avançadas <ChevronDown size={16} /></summary>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <select name="categoria_interna" defaultValue="novidade" className={inputClass}><option value="novidade">Novidade</option><option value="beneficio">Benefício</option><option value="comunicado">Comunicado</option><option value="critico">Comunicado crítico</option></select>
                  <select name="modelo_cobranca" defaultValue="mensal" className={inputClass}><option value="mensal">Mensal</option><option value="periodo">Período fechado</option><option value="cpm">CPM</option><option value="cpc">CPC</option><option value="cpa">CPA</option><option value="permuta">Permuta</option></select>
                  <input name="valor_contratado" placeholder="Valor contratado" className={inputClass} />
                  <input name="inicio_em" type="datetime-local" className={inputClass} /><input name="fim_em" type="datetime-local" className={inputClass} /><input name="cupom_codigo" placeholder="Cupom" className={inputClass} />
                  <input name="cidade" placeholder="Cidade alvo" className={inputClass} /><input name="uf" placeholder="UF" maxLength={2} className={inputClass} />
                  <input name="prioridade" type="number" min={0} max={100} defaultValue={50} className={inputClass} /><input name="peso_rotacao" type="number" min={1} max={100} defaultValue={1} className={inputClass} /><input name="limite_frequencia_dia" type="number" min={1} max={50} defaultValue={2} className={inputClass} /><input name="limite_impressoes_dia" type="number" min={1} placeholder="Teto/dia" className={inputClass} />
                  <label className="flex h-11 items-center gap-2 rounded-2xl border border-zinc-200 px-4 text-sm font-bold"><input type="checkbox" name="exclusiva" /> Exclusiva</label>
                </div>
              </details>
              <button className={`${buttonClass} mt-4`}>Criar campanha</button>
            </form>
          </details>
        </div>

        <div className="mt-5 space-y-3">
          {campanhasRows.length ? campanhasRows.map((c: any) => {
            const parceiro = Array.isArray(c.parceiros_comerciais) ? c.parceiros_comerciais[0] : c.parceiros_comerciais;
            const contrato = contratosRows.find((x: any) => x.id_campanha === c.id);
            const m = metricasPorCampanha.get(c.id) || { impressoes: 0, cliques: 0, conversoes: 0 };
            const interna = c.origem === "salao_premium";
            const criativosCount = criativosRows.filter((x: any) => x.id_campanha === c.id).length;
            return (
              <article key={c.id} className="rounded-[22px] border border-zinc-200 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div><div className="flex flex-wrap gap-2"><span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${interna ? "bg-sky-50 text-sky-700" : "bg-amber-50 text-amber-800"}`}>{interna ? "Salão Premiun" : parceiro?.nome_fantasia || parceiro?.razao_social || "Empresa"}</span><span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${statusClass(c.status)}`}>{statusLabel(c.status)}</span></div><h3 className="mt-2 text-lg font-black">{c.nome}</h3><div className="mt-2 flex flex-wrap gap-4 text-xs text-zinc-500"><span>{m.impressoes} impressões</span><span>{m.cliques} cliques</span><span>{m.conversoes} conversões</span><span>{criativosCount} anúncio(s)</span></div></div>
                  <div className="text-right"><div className="text-sm font-black">{interna ? "Campanha própria" : brl(c.valor_contratado)}</div><div className="mt-1 text-xs text-zinc-500">Prioridade {c.prioridade || 0}</div></div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-100 pt-4">
                  <details className="w-full xl:w-auto">
                    <summary className={`${subtleButtonClass} cursor-pointer list-none`}>Configurar <ChevronDown size={14} /></summary>
                    <form action={atualizarCampanhaParceria} className="mt-3 grid gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 md:min-w-[760px] md:grid-cols-2 xl:grid-cols-3">
                      <input type="hidden" name="id_campanha" value={c.id} />
                      <select name="status" defaultValue={c.status} className={inputClass}><option value="aguardando_contrato">Aguardando contrato</option><option value="agendada">Agendada</option><option value="ativa">Ativa</option><option value="pausada">Pausada</option><option value="encerrada">Encerrada</option></select>
                      <select name="categoria_interna" defaultValue={c.categoria_interna || ""} className={inputClass}><option value="">Publicidade</option><option value="novidade">Novidade</option><option value="beneficio">Benefício</option><option value="comunicado">Comunicado</option><option value="critico">Crítico</option></select>
                      <input name="prioridade" type="number" min={0} max={100} defaultValue={c.prioridade || 0} className={inputClass} />
                      <input name="peso_rotacao" type="number" min={1} max={100} defaultValue={c.peso_rotacao || 1} className={inputClass} />
                      <input name="limite_frequencia_dia" type="number" min={1} max={50} defaultValue={c.limite_frequencia_dia || 2} className={inputClass} />
                      <input name="limite_impressoes_dia" type="number" min={1} defaultValue={c.limite_impressoes_dia || ""} className={inputClass} />
                      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                        <div className="text-xs font-black uppercase tracking-[0.12em] text-zinc-500">Público</div>
                        <div className="mt-3 grid gap-2 text-xs font-bold text-zinc-700">
                          <label className="flex items-center gap-2"><input type="checkbox" name="publico" value="salao" defaultChecked={Array.isArray(c.publico) && c.publico.includes("salao")} /> Salões</label>
                          <label className="flex items-center gap-2"><input type="checkbox" name="publico" value="profissional" defaultChecked={Array.isArray(c.publico) && c.publico.includes("profissional")} /> Profissionais</label>
                          <label className="flex items-center gap-2"><input type="checkbox" name="publico" value="cliente" defaultChecked={Array.isArray(c.publico) && c.publico.includes("cliente")} /> Clientes</label>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-zinc-200 bg-white p-4 md:col-span-2">
                        <div className="text-xs font-black uppercase tracking-[0.12em] text-zinc-500">Onde aparece</div>
                        <div className="mt-3 grid gap-2 text-xs font-bold text-zinc-700 sm:grid-cols-2">
                          <label className="flex items-center gap-2"><input type="checkbox" name="locais_exibicao" value="dashboard" defaultChecked={Array.isArray(c.locais_exibicao) && c.locais_exibicao.includes("dashboard")} /> Dashboard do salão</label>
                          <label className="flex items-center gap-2"><input type="checkbox" name="locais_exibicao" value="app_cliente" defaultChecked={Array.isArray(c.locais_exibicao) && c.locais_exibicao.includes("app_cliente")} /> App Cliente</label>
                          <label className="flex items-center gap-2"><input type="checkbox" name="locais_exibicao" value="app_profissional" defaultChecked={Array.isArray(c.locais_exibicao) && c.locais_exibicao.includes("app_profissional")} /> App Profissional</label>
                          <label className="flex items-center gap-2"><input type="checkbox" name="locais_exibicao" value="parceiros" defaultChecked={Array.isArray(c.locais_exibicao) && c.locais_exibicao.includes("parceiros")} /> Parceiros e benefícios</label>
                        </div>
                      </div>
                      <label className="flex h-11 items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 text-xs font-bold"><input type="checkbox" name="exclusiva" defaultChecked={Boolean(c.exclusiva)} /> Exclusiva</label>
                      <button className={buttonClass}>Salvar configuração</button>
                    </form>
                  </details>
                  {!interna && !contrato ? <form action={gerarContratoParceria}><input type="hidden" name="id_campanha" value={c.id} /><button className={subtleButtonClass}><FileSignature size={14} /> Gerar contrato</button></form> : null}
                  {contrato ? <span className="inline-flex h-10 items-center rounded-xl bg-emerald-50 px-4 text-xs font-black text-emerald-700">Contrato: {statusLabel(contrato.status)}</span> : null}
                  <details><summary className="inline-flex h-10 cursor-pointer list-none items-center gap-2 rounded-xl px-3 text-xs font-black text-red-700 hover:bg-red-50"><Trash2 size={14} /> Excluir</summary><form action={excluirCampanhaParceria} className="mt-3 max-w-xl rounded-2xl border border-red-200 bg-red-50 p-4"><input type="hidden" name="id_campanha" value={c.id} /><p className="text-xs text-red-800">Digite <b>EXCLUIR</b> para remover campanha, anúncios e métricas.</p><div className="mt-3 flex gap-2"><input name="confirmacao" required placeholder="EXCLUIR" className={`${inputClass} flex-1 border-red-200`} /><button className="rounded-2xl bg-red-600 px-4 text-xs font-black text-white">Excluir</button></div></form></details>
                </div>
              </article>
            );
          }) : <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">Nenhuma campanha criada.</div>}
        </div>
      </section>

      <section id="anuncios" className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-500"><ImageIcon size={15} /> Etapa 3</div><h2 className="mt-1 text-2xl font-black">Anúncios / criativos</h2><p className="mt-1 text-sm text-zinc-500">Você não precisa mais criar link para a imagem. Escolha o arquivo e o sistema envia sozinho.</p></div>
          <details>
            <summary className={`${buttonClass} cursor-pointer list-none`}><Plus size={16} /> Novo anúncio</summary>
            <form action={salvarCriativoParceria} className="mt-4 grid gap-3 rounded-[22px] border border-zinc-200 bg-zinc-50 p-5 md:grid-cols-2 xl:min-w-[850px] xl:grid-cols-3">
              <select name="id_campanha" required className={inputClass}><option value="">Escolha a campanha *</option>{campanhasRows.map((c: any) => <option key={c.id} value={c.id}>{c.origem === "salao_premium" ? "Salão Premiun" : "Parceiro"} • {c.nome}</option>)}</select>
              <input name="titulo" required placeholder="Título do anúncio *" className={inputClass} />
              <select name="formato" defaultValue="poster" className={inputClass}><option value="poster">Popup / poster</option><option value="card">Card</option><option value="banner">Banner</option></select>
              <input name="subtitulo" placeholder="Texto de apoio" className={inputClass} />
              <CampaignImageUpload />
              <input name="cta_texto" placeholder="Texto do botão" defaultValue="Saiba mais" className={inputClass} />
              <input name="destino_url" placeholder="Link para abrir ao clicar (https://... ou wa.me/...)" className={`${inputClass} md:col-span-2`} />
              <button className={buttonClass}>Salvar anúncio</button>
            </form>
          </details>
        </div>

        <div className="mt-5 grid gap-3 xl:grid-cols-2">
          {criativosRows.length ? criativosRows.map((criativo: any) => {
            const campanha = campanhasRows.find((c: any) => c.id === criativo.id_campanha);
            return (
              <article key={criativo.id} className="flex gap-4 rounded-[22px] border border-zinc-200 p-4">
                {criativo.imagem_url ? <img src={criativo.imagem_url} alt={criativo.titulo || "Criativo"} className="h-28 w-24 shrink-0 rounded-2xl border border-zinc-200 bg-zinc-50 object-cover" /> : <div className="grid h-28 w-24 shrink-0 place-items-center rounded-2xl bg-zinc-950 text-white"><ImageIcon size={24} /></div>}
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-700">{criativo.formato || "card"} • {criativo.ativo === false ? "inativo" : "ativo"}</div>
                  <h3 className="mt-1 truncate font-black">{criativo.titulo || "Sem título"}</h3>
                  <div className="mt-1 truncate text-xs text-zinc-500">{campanha?.nome || "Campanha não encontrada"}</div>
                  {criativo.subtitulo ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-600">{criativo.subtitulo}</p> : null}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {normalizeExternalDestination(criativo.destino_url) ? <a href={normalizeExternalDestination(criativo.destino_url) || undefined} target="_blank" rel="noreferrer" className={subtleButtonClass}>{criativo.cta_texto || "Abrir link"} <ExternalLink size={13} /></a> : null}
                    <details className="w-full sm:w-auto">
                      <summary className={`${subtleButtonClass} cursor-pointer list-none`}><Pencil size={13} /> Editar</summary>
                      <form action={atualizarCriativoParceria} className="mt-3 grid gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 md:min-w-[700px] md:grid-cols-2">
                        <input type="hidden" name="id_criativo" value={criativo.id} />
                        <select name="id_campanha" defaultValue={criativo.id_campanha} required className={inputClass}>{campanhasRows.map((row: any) => <option key={row.id} value={row.id}>{row.origem === "salao_premium" ? "Salão Premiun" : "Parceiro"} • {row.nome}</option>)}</select>
                        <input name="titulo" required defaultValue={criativo.titulo || ""} placeholder="Título do anúncio" className={inputClass} />
                        <select name="formato" defaultValue={criativo.formato || "poster"} className={inputClass}><option value="poster">Popup / poster</option><option value="card">Card</option><option value="banner">Banner</option></select>
                        <input name="subtitulo" defaultValue={criativo.subtitulo || ""} placeholder="Texto de apoio" className={inputClass} />
                        <CampaignImageUpload />
                        <input name="cta_texto" defaultValue={criativo.cta_texto || "Saiba mais"} placeholder="Texto do botão" className={inputClass} />
                        <input name="destino_url" defaultValue={criativo.destino_url || ""} placeholder="https://... ou wa.me/..." className={`${inputClass} md:col-span-2`} />
                        <label className="flex h-11 items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 text-xs font-bold"><input type="checkbox" name="ativo" defaultChecked={criativo.ativo !== false} /> Anúncio ativo</label>
                        {criativo.imagem_url ? <label className="flex h-11 items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 text-xs font-bold text-red-700"><input type="checkbox" name="remover_imagem" /> Remover imagem atual</label> : <div />}
                        <button className={`${buttonClass} md:col-span-2 md:justify-self-start`}>Salvar alterações</button>
                      </form>
                    </details>
                    <details><summary className="inline-flex h-10 cursor-pointer list-none items-center gap-2 rounded-xl px-3 text-xs font-black text-red-700 hover:bg-red-50"><Trash2 size={13} /> Excluir</summary><form action={excluirCriativoParceria} className="mt-2 rounded-2xl border border-red-200 bg-red-50 p-3"><input type="hidden" name="id_criativo" value={criativo.id} /><input name="confirmacao" required placeholder="Digite EXCLUIR" className={`${inputClass} w-full border-red-200`} /><button className="mt-2 h-10 w-full rounded-xl bg-red-600 px-4 text-xs font-black text-white">Excluir anúncio</button></form></details>
                  </div>
                </div>
              </article>
            );
          }) : <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 xl:col-span-2">Nenhum anúncio criado.</div>}
        </div>
      </section>

      <details className="rounded-[28px] border border-zinc-200 bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6"><div><div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-500"><FileSignature size={15} /> Etapa opcional</div><h2 className="mt-1 text-xl font-black">Contratos comerciais</h2><p className="mt-1 text-sm text-zinc-500">Somente para publicidade paga ou permuta.</p></div><ChevronDown size={20} className="text-zinc-400" /></summary>
        <div className="border-t border-zinc-100 p-6">
          <div className={`mb-4 rounded-2xl border p-4 text-sm ${autentiqueAtivo ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}><b>Autentique:</b> {autentiqueAtivo ? "configurado e pronto para envio." : "integração pronta, aguardando AUTENTIQUE_API_TOKEN na Vercel."}</div>
          <div className="space-y-3">
            {contratosRows.length ? contratosRows.map((contrato: any) => {
              const campanha = campanhasRows.find((c: any) => c.id === contrato.id_campanha);
              const parceiro = parceirosRows.find((p: any) => p.id === contrato.id_parceiro);
              const parceiroNome = parceiro?.nome_fantasia || parceiro?.razao_social || "Empresa";
              const campanhaNome = campanha?.nome || "Campanha removida";
              return <div key={contrato.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 p-4"><div><div className="font-black">{contrato.numero}</div><div className="mt-1 text-xs text-zinc-500">{parceiroNome} • {campanhaNome}</div></div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-2 text-xs font-black ${statusClass(contrato.status)}`}>{statusLabel(contrato.status)}</span><ContractPreviewButton idContrato={contrato.id} numero={contrato.numero} parceiro={parceiroNome} campanha={campanhaNome} />{!contrato.envelope_externo_id ? <form action={enviarContratoAutentique}><input type="hidden" name="id_contrato" value={contrato.id} /><button disabled={!autentiqueAtivo || !contrato.signatario_email} className={`${subtleButtonClass} disabled:opacity-40`}>Enviar para assinatura</button></form> : <form action={sincronizarContratoAutentique}><input type="hidden" name="id_contrato" value={contrato.id} /><button disabled={!autentiqueAtivo} className={`${subtleButtonClass} disabled:opacity-40`}>Sincronizar</button></form>}{normalizeExternalDestination(contrato.url_assinatura) ? <a href={normalizeExternalDestination(contrato.url_assinatura) || undefined} target="_blank" rel="noreferrer" className={subtleButtonClass}>Abrir assinatura <ExternalLink size={13} /></a> : null}</div></div>;
            }) : <div className="text-sm text-zinc-500">Nenhum contrato gerado.</div>}
          </div>
        </div>
      </details>

      <section className="rounded-[24px] border border-zinc-200 bg-zinc-950 p-5 text-white"><div className="flex items-center gap-3"><BarChart3 size={20} className="text-amber-300" /><div><div className="font-black">Como usar sem se perder</div><div className="mt-1 text-sm text-zinc-400">Empresa → Campanha → Anúncio. No anúncio, agora basta clicar em “Enviar imagem”.</div></div></div></section>
    </div>
  );
}
