"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, Clock3, CreditCard, Loader2, PackagePlus, Plus, Scissors, Sparkles, Trash2, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getUsuarioLogado } from "@/lib/auth/getUsuarioLogado";
import { getErrorMessage } from "@/lib/get-error-message";

type StepKey = "perfil" | "profissionais" | "produtos" | "pix" | "horarios" | "revisao";
type ProfissionalDraft = { nome: string; cargo: string; especialidades: string };
type ProdutoDraft = { nome: string; categoria: string; preco_custo: string; preco_venda: string; estoque_atual: string };

const STEPS: Array<{ key: StepKey; label: string; icon: React.ComponentType<{ size?: number }> }> = [
  { key: "perfil", label: "Perfil", icon: Building2 },
  { key: "profissionais", label: "Profissionais", icon: Users },
  { key: "produtos", label: "Produtos", icon: PackagePlus },
  { key: "pix", label: "Pix", icon: CreditCard },
  { key: "horarios", label: "Horários", icon: Clock3 },
  { key: "revisao", label: "Finalizar", icon: CheckCircle2 },
];
const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

function parseMoney(value: string) {
  const normalized = String(value || "").replace(/\s/g, "").replace(/R\$/gi, "").replace(/\./g, "").replace(",", ".");
  const number = Number(normalized || 0);
  return Number.isFinite(number) ? number : 0;
}
function emptyProfessional(): ProfissionalDraft { return { nome: "", cargo: "", especialidades: "" }; }
function emptyProduct(): ProdutoDraft { return { nome: "", categoria: "", preco_custo: "", preco_venda: "", estoque_atual: "0" }; }

export default function OnboardingSalaoPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [step, setStep] = useState<StepKey>("perfil");
  const [idSalao, setIdSalao] = useState("");
  const [nomeSalao, setNomeSalao] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [descricao, setDescricao] = useState("");
  const [instagram, setInstagram] = useState("");
  const [profissionais, setProfissionais] = useState<ProfissionalDraft[]>([emptyProfessional()]);
  const [profissionaisExistentes, setProfissionaisExistentes] = useState(0);
  const [produtos, setProdutos] = useState<ProdutoDraft[]>([emptyProduct()]);
  const [produtosExistentes, setProdutosExistentes] = useState(0);
  const [usaProdutos, setUsaProdutos] = useState(true);
  const [pixChave, setPixChave] = useState("");
  const [pixRecebedor, setPixRecebedor] = useState("");
  const [pixCidade, setPixCidade] = useState("");
  const [horaAbertura, setHoraAbertura] = useState("08:00");
  const [horaFechamento, setHoraFechamento] = useState("19:00");
  const [diasFuncionamento, setDiasFuncionamento] = useState<string[]>(["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]);

  const stepIndex = STEPS.findIndex((item) => item.key === step);
  const progresso = Math.round(((stepIndex + 1) / STEPS.length) * 100);

  useEffect(() => {
    let active = true;
    async function bootstrap() {
      try {
        const usuario = await getUsuarioLogado();
        if (!usuario?.idSalao) throw new Error("Não foi possível identificar o salão.");
        const salaoId = usuario.idSalao;
        setIdSalao(salaoId);
        const [salaoResult, configResult, profissionaisResult, produtosResult] = await Promise.all([
          (supabase as any).from("saloes").select("nome, whatsapp, telefone, descricao_publica, instagram_url, cidade, onboarding_concluido, onboarding_etapa, produtos_modulo_ativo").eq("id", salaoId).maybeSingle(),
          (supabase as any).from("configuracoes_salao").select("hora_abertura, hora_fechamento, dias_funcionamento, sinal_pix_chave, sinal_pix_recebedor, sinal_pix_cidade").eq("id_salao", salaoId).maybeSingle(),
          supabase.from("profissionais").select("id", { count: "exact", head: true }).eq("id_salao", salaoId).eq("ativo", true),
          supabase.from("produtos").select("id", { count: "exact", head: true }).eq("id_salao", salaoId).eq("ativo", true),
        ]);
        if (salaoResult.error) throw salaoResult.error;
        if (salaoResult.data?.onboarding_concluido === true) { router.replace("/dashboard"); return; }
        if (!active) return;
        const salao = salaoResult.data || {};
        const config = configResult.data || {};
        setNomeSalao(String(salao.nome || ""));
        setWhatsapp(String(salao.whatsapp || salao.telefone || ""));
        setDescricao(String(salao.descricao_publica || ""));
        setInstagram(String(salao.instagram_url || ""));
        setUsaProdutos(salao.produtos_modulo_ativo !== false);
        setPixChave(String(config.sinal_pix_chave || ""));
        setPixRecebedor(String(config.sinal_pix_recebedor || ""));
        setPixCidade(String(config.sinal_pix_cidade || salao.cidade || ""));
        setHoraAbertura(String(config.hora_abertura || "08:00").slice(0, 5));
        setHoraFechamento(String(config.hora_fechamento || "19:00").slice(0, 5));
        if (Array.isArray(config.dias_funcionamento) && config.dias_funcionamento.length) setDiasFuncionamento(config.dias_funcionamento.filter((dia: unknown) => typeof dia === "string"));
        setProfissionaisExistentes(profissionaisResult.count || 0);
        setProdutosExistentes(produtosResult.count || 0);
        const etapa = String(salao.onboarding_etapa || "perfil") as StepKey;
        if (STEPS.some((item) => item.key === etapa)) setStep(etapa);
      } catch (error) {
        setErro(getErrorMessage(error, "Erro ao carregar configuração inicial."));
      } finally {
        if (active) setLoading(false);
      }
    }
    void bootstrap();
    return () => { active = false; };
  }, [router, supabase]);

  const resumo = [
    ["Perfil", nomeSalao || "Não informado"],
    ["Profissionais", `${profissionaisExistentes} cadastrado${profissionaisExistentes === 1 ? "" : "s"}`],
    ["Produtos", usaProdutos ? `${produtosExistentes} cadastrado${produtosExistentes === 1 ? "" : "s"}` : "Funcionalidade desativada"],
    ["Pix", pixChave ? "Configurado" : "Pendente"],
    ["Atendimento", `${diasFuncionamento.length} dias • ${horaAbertura} às ${horaFechamento}`],
  ];

  async function salvarProgresso(next: StepKey) {
    const { error } = await (supabase as any).from("saloes").update({ onboarding_etapa: next, updated_at: new Date().toISOString() }).eq("id", idSalao);
    if (error) throw error;
  }
  async function salvarPerfil() {
    if (!nomeSalao.trim() || !whatsapp.trim() || !descricao.trim()) throw new Error("Preencha nome, WhatsApp e descrição do salão.");
    const { error } = await (supabase as any).from("saloes").update({ nome: nomeSalao.trim(), whatsapp: whatsapp.trim(), telefone: whatsapp.trim(), descricao_publica: descricao.trim(), instagram_url: instagram.trim() || null, updated_at: new Date().toISOString() }).eq("id", idSalao);
    if (error) throw error;
  }
  async function salvarProfissionais() {
    const novos = profissionais.filter((item) => item.nome.trim());
    if (profissionaisExistentes + novos.length < 1) throw new Error("Adicione pelo menos um profissional para continuar.");
    for (const item of novos) {
      const response = await fetch("/api/profissionais/processar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao: "criar", idSalao, idProfissional: null, profissional: { nome: item.nome.trim(), cargo: item.cargo.trim() || null, categoria: item.cargo.trim() || null, especialidades: item.especialidades.split(",").map((v) => v.trim()).filter(Boolean), tipo_profissional: "profissional", tipo_vinculo: "AUTONOMO", comissao_produto_percentual: 0, intervalo_agenda_minutos: 30, sinal_pix_proprio: false, sinal_confirmacao_responsavel: "salao", nivel_acesso: "proprio", ativo: true, status: "ativo", dias_trabalho: [], pausas: [] }, servicos: [], assistentes: [], acesso_app: null }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Erro ao cadastrar profissional.");
    }
    if (novos.length) { setProfissionaisExistentes((v) => v + novos.length); setProfissionais([emptyProfessional()]); }
  }
  async function salvarProdutos() {
    const { error: prefError } = await (supabase as any).from("saloes").update({ produtos_modulo_ativo: usaProdutos, updated_at: new Date().toISOString() }).eq("id", idSalao);
    if (prefError) throw prefError;
    if (!usaProdutos) return;
    const novos = produtos.filter((item) => item.nome.trim());
    if (produtosExistentes + novos.length < 1) throw new Error("Adicione pelo menos um produto ou escolha 'Meu salão não trabalha com produtos'.");
    for (const item of novos) {
      const custo = parseMoney(item.preco_custo); const venda = parseMoney(item.preco_venda); const margem = venda > 0 ? ((venda - custo) / venda) * 100 : 0;
      const response = await fetch("/api/produtos/processar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idSalao, acao: "salvar", produto: { id: null, id_salao: idSalao, nome: item.nome.trim(), categoria: item.categoria.trim() || null, unidade_medida: "un", quantidade_por_embalagem: 1, preco_custo: custo, custos_extras: 0, custo_por_dose: custo, dose_padrao: 1, unidade_dose: "un", preco_venda: venda, margem_lucro_percentual: margem, estoque_atual: Number(item.estoque_atual || 0), estoque_minimo: 0, destinacao: "uso_interno", comissao_revenda_percentual: 0, ativo: true, status: "ativo" } }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Erro ao cadastrar produto.");
    }
    if (novos.length) { setProdutosExistentes((v) => v + novos.length); setProdutos([emptyProduct()]); }
  }
  async function salvarPix() {
    if (!pixChave.trim() || !pixRecebedor.trim() || !pixCidade.trim()) throw new Error("Preencha chave Pix, recebedor e cidade.");
    const { error } = await (supabase as any).from("configuracoes_salao").upsert({ id_salao: idSalao, sinal_pix_chave: pixChave.trim(), sinal_pix_recebedor: pixRecebedor.trim(), sinal_pix_cidade: pixCidade.trim(), updated_at: new Date().toISOString() }, { onConflict: "id_salao" });
    if (error) throw error;
  }
  async function salvarHorarios() {
    if (!diasFuncionamento.length || !horaAbertura || !horaFechamento) throw new Error("Configure dias e horários de atendimento.");
    if (horaAbertura >= horaFechamento) throw new Error("O fechamento deve ser depois da abertura.");
    const { error } = await (supabase as any).from("configuracoes_salao").upsert({ id_salao: idSalao, hora_abertura: horaAbertura, hora_fechamento: horaFechamento, dias_funcionamento: diasFuncionamento, updated_at: new Date().toISOString() }, { onConflict: "id_salao" });
    if (error) throw error;
  }
  async function avancar() {
    try {
      setSaving(true); setErro("");
      if (step === "perfil") await salvarPerfil();
      if (step === "profissionais") await salvarProfissionais();
      if (step === "produtos") await salvarProdutos();
      if (step === "pix") await salvarPix();
      if (step === "horarios") await salvarHorarios();
      const next = STEPS[stepIndex + 1]?.key; if (!next) return;
      await salvarProgresso(next); setStep(next); window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) { setErro(getErrorMessage(error, "Não foi possível salvar esta etapa.")); }
    finally { setSaving(false); }
  }
  async function finalizar() {
    try {
      setSaving(true); setErro("");
      if (profissionaisExistentes < 1) throw new Error("Cadastre ao menos um profissional.");
      if (usaProdutos && produtosExistentes < 1) throw new Error("Cadastre ao menos um produto ou desative o módulo de produtos.");
      if (!pixChave.trim()) throw new Error("Configure o Pix.");
      if (!diasFuncionamento.length) throw new Error("Configure os dias de atendimento.");
      const { error } = await (supabase as any).from("saloes").update({ onboarding_concluido: true, onboarding_etapa: "concluido", onboarding_concluido_em: new Date().toISOString(), produtos_modulo_ativo: usaProdutos, updated_at: new Date().toISOString() }).eq("id", idSalao);
      if (error) throw error;
      router.replace("/dashboard?novo=1&onboarding=concluido");
    } catch (error) { setErro(getErrorMessage(error, "Não foi possível finalizar o cadastro.")); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#f6f7f9]"><Loader2 className="animate-spin" size={24} /></div>;

  return <div className="fixed inset-0 z-[90] overflow-y-auto bg-[#f6f7f9] text-zinc-950">
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 backdrop-blur"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-zinc-950 text-[#e8c56b]"><Sparkles size={20}/></div><div><p className="text-lg font-black">SalãoPremium</p><p className="text-xs font-semibold text-zinc-500">Configuração inicial</p></div></div><strong className="text-sm">{progresso}%</strong></div><div className="h-1 bg-zinc-100"><div className="h-full bg-zinc-950" style={{width:`${progresso}%`}}/></div></header>
    <main className="mx-auto max-w-6xl px-4 py-8"><div className="mb-6 overflow-x-auto"><div className="flex min-w-max gap-2">{STEPS.map((item,index)=>{const Icon=item.icon;const done=index<stepIndex;const active=item.key===step;return <div key={item.key} className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-black ${active?"border-zinc-950 bg-zinc-950 text-white":done?"border-emerald-200 bg-emerald-50 text-emerald-700":"border-zinc-200 bg-white text-zinc-500"}`}>{done?<Check size={14}/>:<Icon size={14}/>} {item.label}</div>})}</div></div>
      {erro?<div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{erro}</div>:null}
      <section className="rounded-[30px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
        {step==="perfil"?<StepShell title="Configure o perfil do seu salão" text="Esses dados serão usados no painel e na apresentação pública do salão."><div className="grid gap-4 md:grid-cols-2"><Field label="Nome do salão" value={nomeSalao} onChange={setNomeSalao}/><Field label="WhatsApp" value={whatsapp} onChange={setWhatsapp}/><div className="md:col-span-2"><TextArea label="Descrição" value={descricao} onChange={setDescricao}/></div><div className="md:col-span-2"><Field label="Instagram (opcional)" value={instagram} onChange={setInstagram}/></div></div></StepShell>:null}
        {step==="profissionais"?<StepShell title="Adicione seus primeiros profissionais" text="Cadastre pelo menos uma pessoa que atende no salão.">{profissionaisExistentes>0?<StatusBanner text={`${profissionaisExistentes} profissional(is) já cadastrado(s).`}/>:null}<div className="space-y-3">{profissionais.map((p,i)=><div key={i} className="rounded-3xl border bg-zinc-50 p-4"><div className="mb-3 flex justify-between"><b className="flex items-center gap-2"><Scissors size={16}/> Profissional {i+1}</b>{profissionais.length>1?<button onClick={()=>setProfissionais(v=>v.filter((_,x)=>x!==i))}><Trash2 size={16}/></button>:null}</div><div className="grid gap-3 md:grid-cols-3"><Field label="Nome" value={p.nome} onChange={v=>setProfissionais(list=>list.map((r,x)=>x===i?{...r,nome:v}:r))}/><Field label="Cargo" value={p.cargo} onChange={v=>setProfissionais(list=>list.map((r,x)=>x===i?{...r,cargo:v}:r))}/><Field label="Especialidades" value={p.especialidades} onChange={v=>setProfissionais(list=>list.map((r,x)=>x===i?{...r,especialidades:v}:r))}/></div></div>)}</div><button className="mt-4 inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black" onClick={()=>setProfissionais(v=>[...v,emptyProfessional()])}><Plus size={16}/>Adicionar outro</button></StepShell>:null}
        {step==="produtos"?<StepShell title="Seu salão trabalha com produtos?" text="O controle de produtos é opcional. Se não usar, a área Produtos ficará desativada no painel até você ativá-la."><div className="mb-5 grid gap-3 sm:grid-cols-2"><button type="button" onClick={()=>setUsaProdutos(true)} className={`rounded-3xl border p-5 text-left ${usaProdutos?"border-zinc-950 bg-zinc-950 text-white":"border-zinc-200 bg-white"}`}><b>Sim, trabalho com produtos</b><p className="mt-1 text-sm opacity-80">Quero controlar estoque, custo e venda.</p></button><button type="button" onClick={()=>setUsaProdutos(false)} className={`rounded-3xl border p-5 text-left ${!usaProdutos?"border-zinc-950 bg-zinc-950 text-white":"border-zinc-200 bg-white"}`}><b>Não trabalho com produtos</b><p className="mt-1 text-sm opacity-80">Desativar a funcionalidade por enquanto.</p></button></div>{usaProdutos?<><div className="space-y-3">{produtos.map((p,i)=><div key={i} className="rounded-3xl border bg-zinc-50 p-4"><div className="grid gap-3 md:grid-cols-5"><div className="md:col-span-2"><Field label="Nome" value={p.nome} onChange={v=>setProdutos(list=>list.map((r,x)=>x===i?{...r,nome:v}:r))}/></div><Field label="Categoria" value={p.categoria} onChange={v=>setProdutos(list=>list.map((r,x)=>x===i?{...r,categoria:v}:r))}/><Field label="Custo" value={p.preco_custo} onChange={v=>setProdutos(list=>list.map((r,x)=>x===i?{...r,preco_custo:v}:r))}/><Field label="Venda" value={p.preco_venda} onChange={v=>setProdutos(list=>list.map((r,x)=>x===i?{...r,preco_venda:v}:r))}/></div></div>)}</div><button className="mt-4 inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black" onClick={()=>setProdutos(v=>[...v,emptyProduct()])}><Plus size={16}/>Adicionar outro produto</button></>:<StatusBanner text="Produtos ficará indisponível no painel. Você poderá ativar essa funcionalidade quando quiser."/>}</StepShell>:null}
        {step==="pix"?<StepShell title="Configure o Pix" text="Dados usados nos fluxos financeiros do salão."><div className="grid gap-4 md:grid-cols-3"><Field label="Chave Pix" value={pixChave} onChange={setPixChave}/><Field label="Recebedor" value={pixRecebedor} onChange={setPixRecebedor}/><Field label="Cidade" value={pixCidade} onChange={setPixCidade}/></div></StepShell>:null}
        {step==="horarios"?<StepShell title="Defina os dias e horários" text="Esses horários serão a base da agenda do salão."><div className="grid gap-4 sm:grid-cols-2"><Field label="Abre às" type="time" value={horaAbertura} onChange={setHoraAbertura}/><Field label="Fecha às" type="time" value={horaFechamento} onChange={setHoraFechamento}/></div><div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">{DIAS.map(d=><button key={d} type="button" onClick={()=>setDiasFuncionamento(v=>v.includes(d)?v.filter(x=>x!==d):[...v,d])} className={`rounded-2xl border px-3 py-3 text-sm font-bold ${diasFuncionamento.includes(d)?"border-zinc-950 bg-zinc-950 text-white":"border-zinc-200 bg-white"}`}>{d}</button>)}</div></StepShell>:null}
        {step==="revisao"?<StepShell title="Tudo pronto para começar" text="Confira a configuração inicial antes de liberar o painel."><div className="grid gap-3 sm:grid-cols-2">{resumo.map(([l,v])=><div key={l} className="rounded-2xl border bg-zinc-50 p-4"><p className="text-xs font-black uppercase text-zinc-400">{l}</p><strong className="mt-1 block">{v}</strong></div>)}</div></StepShell>:null}
        <div className="mt-8 flex flex-col-reverse justify-between gap-3 border-t pt-6 sm:flex-row"><button type="button" onClick={()=>{if(stepIndex>0)setStep(STEPS[stepIndex-1].key)}} disabled={saving||stepIndex===0} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border px-5 text-sm font-black disabled:opacity-40"><ArrowLeft size={17}/>Voltar</button>{step==="revisao"?<button onClick={finalizar} disabled={saving} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 text-sm font-black text-white">{saving?<Loader2 className="animate-spin" size={17}/>:<CheckCircle2 size={17}/>}Finalizar cadastro e entrar no painel</button>:<button onClick={avancar} disabled={saving} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-6 text-sm font-black text-white">{saving?<Loader2 className="animate-spin" size={17}/>:<ArrowRight size={17}/>}Salvar e continuar</button>}</div>
      </section></main></div>;
}

function StepShell({title,text,children}:{title:string;text:string;children:React.ReactNode}){return <div><h1 className="text-2xl font-black tracking-tight sm:text-3xl">{title}</h1><p className="mt-2 mb-6 text-sm leading-6 text-zinc-600">{text}</p>{children}</div>}
function Field({label,value,onChange,type="text"}:{label:string;value:string;onChange:(v:string)=>void;type?:string}){return <label className="block"><span className="mb-1.5 block text-sm font-bold">{label}</span><input type={type} value={value} onChange={e=>onChange(e.target.value)} className="h-12 w-full rounded-2xl border border-zinc-300 px-4 outline-none focus:border-zinc-950"/></label>}
function TextArea({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){return <label className="block"><span className="mb-1.5 block text-sm font-bold">{label}</span><textarea rows={4} value={value} onChange={e=>onChange(e.target.value)} className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-950"/></label>}
function StatusBanner({text}:{text:string}){return <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{text}</div>}
