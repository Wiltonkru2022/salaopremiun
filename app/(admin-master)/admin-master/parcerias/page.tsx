import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { criarCampanhaParceria, criarParceiro, gerarContratoParceria } from "./actions";

export const dynamic = "force-dynamic";

function brl(value: unknown) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
}

export default async function AdminMasterParceriasPage() {
  await requireAdminMasterUser("comunicacao_ver");
  const supabase = getSupabaseAdmin() as any;

  const [{ data: parceiros }, { data: campanhas }, { data: contratos }] = await Promise.all([
    supabase.from("parceiros_comerciais").select("id,razao_social,nome_fantasia,segmento,cidade,uf,status,email,whatsapp").order("criado_em", { ascending: false }).limit(100),
    supabase.from("parceria_campanhas").select("id,id_parceiro,nome,status,valor_contratado,inicio_em,fim_em,publico,locais_exibicao,parceiros_comerciais(razao_social,nome_fantasia)").order("criado_em", { ascending: false }).limit(100),
    supabase.from("parceria_contratos").select("id,id_campanha,numero,status,valor,hash_documento_sha256,assinado_em,parceiros_comerciais(razao_social,nome_fantasia)").order("criado_em", { ascending: false }).limit(100),
  ]);

  const parceirosRows = parceiros || [];
  const campanhasRows = campanhas || [];
  const contratosRows = contratos || [];
  const receitaContratada = campanhasRows.reduce((sum: number, row: any) => sum + Number(row.valor_contratado || 0), 0);

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.24em] text-amber-700">Receita • Parcerias diretas</div>
            <h1 className="mt-2 font-display text-3xl font-bold text-zinc-950">Publicidade e Parcerias</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">Gerencie anunciantes, campanhas patrocinadas, contratos e métricas sem vender a base de dados dos usuários.</p>
          </div>
          <div className="rounded-2xl bg-zinc-950 px-5 py-4 text-white">
            <div className="text-xs uppercase tracking-[0.2em] text-zinc-400">Receita contratada</div>
            <div className="mt-1 text-2xl font-black">{brl(receitaContratada)}</div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-zinc-50 p-4"><div className="text-xs font-bold uppercase text-zinc-500">Parceiros</div><div className="mt-1 text-2xl font-black">{parceirosRows.length}</div></div>
          <div className="rounded-2xl bg-zinc-50 p-4"><div className="text-xs font-bold uppercase text-zinc-500">Campanhas</div><div className="mt-1 text-2xl font-black">{campanhasRows.length}</div></div>
          <div className="rounded-2xl bg-zinc-50 p-4"><div className="text-xs font-bold uppercase text-zinc-500">Contratos</div><div className="mt-1 text-2xl font-black">{contratosRows.length}</div></div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <form action={criarParceiro} className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black">Novo parceiro</h2>
          <p className="mt-1 text-sm text-zinc-500">Cadastre a empresa antes de criar a campanha.</p>
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
            <input name="cidade" placeholder="Cidade alvo" className="rounded-2xl border border-zinc-200 px-4 py-3" />
            <input name="uf" placeholder="UF alvo" maxLength={2} className="rounded-2xl border border-zinc-200 px-4 py-3" />
            <input name="destino_url" placeholder="Site / WhatsApp / Instagram" className="rounded-2xl border border-zinc-200 px-4 py-3 sm:col-span-2" />
            <input name="cupom_codigo" placeholder="Cupom opcional" className="rounded-2xl border border-zinc-200 px-4 py-3" />
            <input name="descricao" placeholder="Descrição" className="rounded-2xl border border-zinc-200 px-4 py-3" />
          </div>
          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <label className="flex gap-2"><input type="checkbox" name="publico" value="salao" defaultChecked /> Salões</label>
            <label className="flex gap-2"><input type="checkbox" name="publico" value="profissional" /> Profissionais</label>
            <label className="flex gap-2"><input type="checkbox" name="publico" value="cliente" /> Clientes</label>
            <label className="flex gap-2"><input type="checkbox" name="locais_exibicao" value="dashboard" defaultChecked /> Dashboard</label>
            <label className="flex gap-2"><input type="checkbox" name="locais_exibicao" value="parceiros" /> Área de parceiros</label>
            <label className="flex gap-2"><input type="checkbox" name="locais_exibicao" value="app_cliente" /> App Cliente</label>
          </div>
          <button className="mt-4 rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-black text-white">Criar campanha</button>
        </form>
      </div>

      <section className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black">Campanhas e contratos</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-zinc-500"><tr><th className="py-3">Parceiro</th><th>Campanha</th><th>Status</th><th>Valor</th><th>Público</th><th>Contrato</th></tr></thead>
            <tbody className="divide-y divide-zinc-100">
              {campanhasRows.map((c: any) => {
                const parceiro = Array.isArray(c.parceiros_comerciais) ? c.parceiros_comerciais[0] : c.parceiros_comerciais;
                const contrato = contratosRows.find((x: any) => x.id_campanha === c.id);
                return <tr key={c.id}><td className="py-4 font-semibold">{parceiro?.nome_fantasia || parceiro?.razao_social || "—"}</td><td>{c.nome}</td><td>{c.status}</td><td>{brl(c.valor_contratado)}</td><td>{(c.publico || []).join(", ")}</td><td>{contrato ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{contrato.status} • {contrato.numero}</span> : <form action={gerarContratoParceria}><input type="hidden" name="id_campanha" value={c.id} /><button className="rounded-xl border border-zinc-300 px-3 py-2 text-xs font-black">Gerar contrato</button></form>}</td></tr>;
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black">Regras de privacidade da publicidade</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-zinc-50 p-4 text-sm leading-6"><b>Sem venda de base.</b><br />O anunciante não recebe dados pessoais de clientes, profissionais ou salões.</div>
          <div className="rounded-2xl bg-zinc-50 p-4 text-sm leading-6"><b>Segmentação interna.</b><br />Cidade, público e posição são processados pela própria plataforma.</div>
          <div className="rounded-2xl bg-zinc-50 p-4 text-sm leading-6"><b>Métricas agregadas.</b><br />Impressões e cliques devem ser consolidados por dia para reduzir custo e exposição de dados.</div>
        </div>
      </section>
    </div>
  );
}
