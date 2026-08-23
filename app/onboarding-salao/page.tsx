"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  CreditCard,
  ImagePlus,
  Loader2,
  PackagePlus,
  Plus,
  Scissors,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";

type StepKey =
  | "perfil"
  | "servicos"
  | "profissionais"
  | "produtos"
  | "pix"
  | "horarios"
  | "revisao";

type ServicoDraft = {
  key: string;
  nome: string;
  categoria: string;
  duracao: string;
  preco: string;
};
type ProfissionalDraft = {
  key: string;
  nome: string;
  cargo: string;
  especialidades: string;
  servicos: string[];
};
type ProdutoDraft = {
  key: string;
  nome: string;
  categoria: string;
  custo: string;
  venda: string;
  estoque: string;
};

type Estado = {
  salao?: Record<string, any>;
  config?: Record<string, any> | null;
  servicos?: Array<Record<string, any>>;
  profissionais?: Array<Record<string, any>>;
  produtos?: Array<Record<string, any>>;
  vinculos?: Array<Record<string, any>>;
};

const STEPS: Array<{
  key: StepKey;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}> = [
  { key: "perfil", label: "Perfil", icon: Building2 },
  { key: "servicos", label: "Serviços", icon: Scissors },
  { key: "profissionais", label: "Profissionais", icon: Users },
  { key: "produtos", label: "Produtos", icon: PackagePlus },
  { key: "pix", label: "Pix", icon: CreditCard },
  { key: "horarios", label: "Horários", icon: Clock3 },
  { key: "revisao", label: "Finalizar", icon: CheckCircle2 },
];

const DIAS = ["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"];
const LABEL_DIAS: Record<string, string> = {
  segunda: "Segunda",
  terca: "Terça",
  quarta: "Quarta",
  quinta: "Quinta",
  sexta: "Sexta",
  sabado: "Sábado",
  domingo: "Domingo",
};

function makeKey(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}:${crypto.randomUUID()}`;
  }
  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}
function money(value: string) {
  const normalized = value.replace(/\s/g, "").replace(/R\$/gi, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}
function newServico(): ServicoDraft {
  return { key: makeKey("srv"), nome: "", categoria: "", duracao: "30", preco: "" };
}
function newProfissional(): ProfissionalDraft {
  return { key: makeKey("pro"), nome: "", cargo: "", especialidades: "", servicos: [] };
}
function newProduto(): ProdutoDraft {
  return { key: makeKey("prd"), nome: "", categoria: "", custo: "", venda: "", estoque: "0" };
}

export default function OnboardingSalaoPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "capa" | null>(null);
  const [erro, setErro] = useState("");
  const [estado, setEstado] = useState<Estado>({});
  const [step, setStep] = useState<StepKey>("perfil");

  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [descricao, setDescricao] = useState("");
  const [instagram, setInstagram] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [capaUrl, setCapaUrl] = useState("");

  const [servicos, setServicos] = useState<ServicoDraft[]>([newServico()]);
  const [profissionais, setProfissionais] = useState<ProfissionalDraft[]>([newProfissional()]);
  const [produtos, setProdutos] = useState<ProdutoDraft[]>([newProduto()]);
  const [usaProdutos, setUsaProdutos] = useState(true);
  const [usaPix, setUsaPix] = useState(true);
  const [pixChave, setPixChave] = useState("");
  const [pixRecebedor, setPixRecebedor] = useState("");
  const [pixCidade, setPixCidade] = useState("");
  const [dias, setDias] = useState<string[]>(["segunda", "terca", "quarta", "quinta", "sexta", "sabado"]);
  const [inicio, setInicio] = useState("08:00");
  const [fim, setFim] = useState("18:00");

  const stepIndex = STEPS.findIndex((item) => item.key === step);
  const progresso = Math.round(((stepIndex + 1) / STEPS.length) * 100);

  const servicosDisponiveis = useMemo(() => {
    const existentes = (estado.servicos || []).map((item) => ({
      key: String(item.onboarding_chave || item.id || ""),
      nome: String(item.nome || "Serviço"),
    }));
    const novos = servicos.filter((item) => item.nome.trim()).map((item) => ({ key: item.key, nome: item.nome.trim() }));
    const mapa = new Map<string, { key: string; nome: string }>();
    [...existentes, ...novos].forEach((item) => item.key && mapa.set(item.key, item));
    return [...mapa.values()];
  }, [estado.servicos, servicos]);

  useEffect(() => {
    void carregar();
  }, []);

  async function carregar() {
    try {
      setLoading(true);
      setErro("");
      const response = await fetch("/api/onboarding-salao", { cache: "no-store", credentials: "same-origin" });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        window.location.replace("/login?returnTo=/onboarding-salao");
        return;
      }
      if (!response.ok) throw new Error(data.error || "Não foi possível carregar a configuração inicial.");
      aplicarEstado(data);
      if (data.salao?.onboarding_concluido === true) {
        window.location.replace("/dashboard");
      }
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao carregar onboarding.");
    } finally {
      setLoading(false);
    }
  }

  function aplicarEstado(data: any) {
    setEstado({
      salao: data.salao,
      config: data.config,
      servicos: data.servicos || [],
      profissionais: data.profissionais || [],
      produtos: data.produtos || [],
      vinculos: data.vinculos || [],
    });
    const salao = data.salao || {};
    const config = data.config || {};
    setNome(String(salao.nome || ""));
    setWhatsapp(String(salao.whatsapp || salao.telefone || ""));
    setDescricao(String(salao.descricao_publica || ""));
    setInstagram(String(salao.instagram_url || ""));
    setLogoUrl(String(salao.logo_url || ""));
    setCapaUrl(String(salao.foto_capa_url || ""));
    setUsaProdutos(salao.produtos_modulo_ativo !== false);
    setUsaPix(salao.pix_modulo_ativo !== false);
    setPixChave(String(config.sinal_pix_chave || ""));
    setPixRecebedor(String(config.sinal_pix_recebedor || ""));
    setPixCidade(String(config.sinal_pix_cidade || salao.cidade || ""));
    setInicio(String(config.hora_abertura || "08:00").slice(0, 5));
    setFim(String(config.hora_fechamento || "18:00").slice(0, 5));
    if (Array.isArray(config.dias_funcionamento) && config.dias_funcionamento.length) {
      setDias(config.dias_funcionamento.map((d: unknown) => String(d).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")).filter((d: string) => DIAS.includes(d)));
    }
    const savedStep = String(salao.onboarding_etapa || "perfil") as StepKey;
    if (STEPS.some((item) => item.key === savedStep)) setStep(savedStep);
  }

  async function post(body: Record<string, unknown>) {
    const response = await fetch("/api/onboarding-salao", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Não foi possível salvar esta etapa.");
    if (!data.completed) aplicarEstado(data);
    return data;
  }

  async function upload(tipo: "logo" | "capa", file?: File | null) {
    if (!file) return;
    try {
      setUploading(tipo);
      setErro("");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tipo", tipo);
      const response = await fetch("/api/painel/salao-public-assets", { method: "POST", body: formData });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Não foi possível enviar a imagem.");
      if (tipo === "logo") setLogoUrl(String(data.publicUrl || ""));
      else setCapaUrl(String(data.publicUrl || ""));
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao enviar imagem.");
    } finally {
      setUploading(null);
    }
  }

  async function avancar() {
    try {
      setSaving(true);
      setErro("");
      if (step === "perfil") {
        await post({ action: "perfil", nome, whatsapp, descricao, instagram, logoUrl, capaUrl });
      } else if (step === "servicos") {
        const items = servicos.filter((item) => item.nome.trim()).map((item) => ({ ...item, duracao: Number(item.duracao || 30), preco: money(item.preco) }));
        await post({ action: "servicos", items });
        setServicos([newServico()]);
      } else if (step === "profissionais") {
        const items = profissionais.filter((item) => item.nome.trim()).map((item) => ({ ...item, especialidades: item.especialidades.split(",").map((v) => v.trim()).filter(Boolean), servicos: item.servicos.length ? item.servicos : servicosDisponiveis.map((s) => s.key) }));
        await post({ action: "profissionais", items, dias, inicio, fim });
        setProfissionais([newProfissional()]);
      } else if (step === "produtos") {
        const items = produtos.filter((item) => item.nome.trim()).map((item) => ({ ...item, custo: money(item.custo), venda: money(item.venda), estoque: Number(item.estoque || 0) }));
        await post({ action: "produtos", ativo: usaProdutos, items });
        setProdutos([newProduto()]);
      } else if (step === "pix") {
        await post({ action: "pix", ativo: usaPix, chave: pixChave, recebedor: pixRecebedor, cidade: pixCidade });
      } else if (step === "horarios") {
        await post({ action: "horarios", dias, inicio, fim });
      }
      const next = STEPS[stepIndex + 1]?.key;
      if (next) setStep(next);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar esta etapa.");
    } finally {
      setSaving(false);
    }
  }

  async function voltar() {
    if (stepIndex <= 0 || saving) return;
    const previous = STEPS[stepIndex - 1].key;
    try {
      setSaving(true);
      setErro("");
      await post({ action: "voltar", etapa: previous });
      setStep(previous);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível voltar de etapa.");
    } finally {
      setSaving(false);
    }
  }

  async function finalizar() {
    try {
      setSaving(true);
      setErro("");
      await post({ action: "finalizar" });
      window.location.replace("/dashboard?novo=1&onboarding=concluido");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível finalizar o cadastro.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-[#f6f7f9]"><div className="flex items-center gap-3 rounded-2xl border bg-white px-5 py-4 text-sm font-bold shadow-sm"><Loader2 className="animate-spin" size={18} /> Carregando sua configuração...</div></div>;
  }

  return (
    <main className="min-h-screen bg-[#f6f7f9] px-4 py-6 text-zinc-950 sm:py-9">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-zinc-950 text-[#e8c56b]"><Sparkles size={20} /></div><div><h1 className="font-black">SalãoPremium</h1><p className="text-xs font-semibold text-zinc-500">Configuração inicial obrigatória</p></div></div>
            <strong className="text-sm">{progresso}%</strong>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-100"><div className="h-full bg-zinc-950 transition-all" style={{ width: `${progresso}%` }} /></div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {STEPS.map((item, index) => { const Icon = item.icon; const active = item.key === step; const done = index < stepIndex; return <div key={item.key} className={`flex min-w-max items-center gap-2 rounded-full border px-3 py-2 text-xs font-black ${active ? "border-zinc-950 bg-zinc-950 text-white" : done ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-zinc-200 bg-white text-zinc-500"}`}>{done ? <Check size={13} /> : <Icon size={13} />}{item.label}</div>; })}
          </div>
        </header>

        {erro ? <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{erro}</div> : null}

        <section className="rounded-[30px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
          {step === "perfil" ? <Step title="Configure o perfil completo" text="A logo é obrigatória. A capa é opcional e você pode trocar qualquer imagem depois.">
            <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
              <div className="space-y-4">
                <ImagePicker label="Logo do salão" required url={logoUrl} loading={uploading === "logo"} onFile={(file) => upload("logo", file)} />
                <ImagePicker label="Foto de capa (opcional)" url={capaUrl} loading={uploading === "capa"} onFile={(file) => upload("capa", file)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nome do salão" value={nome} onChange={setNome} />
                <Field label="WhatsApp" value={whatsapp} onChange={setWhatsapp} />
                <div className="sm:col-span-2"><TextArea label="Descrição pública" value={descricao} onChange={setDescricao} /></div>
                <div className="sm:col-span-2"><Field label="Instagram (opcional)" value={instagram} onChange={setInstagram} placeholder="https://instagram.com/seusalao" /></div>
              </div>
            </div>
          </Step> : null}

          {step === "servicos" ? <Step title="Cadastre seus primeiros serviços" text="Você precisa ter pelo menos um serviço ativo para que o salão possa receber agendamentos.">
            {(estado.servicos?.length || 0) > 0 ? <Banner>{estado.servicos?.length} serviço(s) já cadastrado(s). Você pode continuar ou adicionar mais.</Banner> : null}
            <div className="space-y-4">{servicos.map((item, i) => <Card key={item.key} title={`Serviço ${i + 1}`} onRemove={servicos.length > 1 ? () => setServicos((list) => list.filter((_, x) => x !== i)) : undefined}>
              <div className="grid gap-3 md:grid-cols-4"><Field label="Nome" value={item.nome} onChange={(v) => setServicos((list) => list.map((r, x) => x === i ? { ...r, nome: v } : r))} /><Field label="Categoria" value={item.categoria} onChange={(v) => setServicos((list) => list.map((r, x) => x === i ? { ...r, categoria: v } : r))} /><Field label="Duração (min)" type="number" value={item.duracao} onChange={(v) => setServicos((list) => list.map((r, x) => x === i ? { ...r, duracao: v } : r))} /><Field label="Preço" value={item.preco} onChange={(v) => setServicos((list) => list.map((r, x) => x === i ? { ...r, preco: v } : r))} placeholder="0,00" /></div>
            </Card>)}</div>
            <AddButton onClick={() => setServicos((list) => [...list, newServico()])}>Adicionar outro serviço</AddButton>
          </Step> : null}

          {step === "profissionais" ? <Step title="Adicione seus primeiros profissionais" text="Os dias e horários abaixo já serão usados como disponibilidade inicial. Cada profissional será vinculado a pelo menos um serviço.">
            {(estado.profissionais?.length || 0) > 0 ? <Banner>{estado.profissionais?.length} profissional(is) já cadastrado(s).</Banner> : null}
            <div className="space-y-4">{profissionais.map((item, i) => <Card key={item.key} title={`Profissional ${i + 1}`} onRemove={profissionais.length > 1 ? () => setProfissionais((list) => list.filter((_, x) => x !== i)) : undefined}>
              <div className="grid gap-3 md:grid-cols-3"><Field label="Nome" value={item.nome} onChange={(v) => setProfissionais((list) => list.map((r, x) => x === i ? { ...r, nome: v } : r))} /><Field label="Cargo" value={item.cargo} onChange={(v) => setProfissionais((list) => list.map((r, x) => x === i ? { ...r, cargo: v } : r))} /><Field label="Especialidades" value={item.especialidades} onChange={(v) => setProfissionais((list) => list.map((r, x) => x === i ? { ...r, especialidades: v } : r))} placeholder="Corte, cor, manicure" /></div>
              <div className="mt-4"><p className="mb-2 text-sm font-black">Serviços que realiza</p><div className="flex flex-wrap gap-2">{servicosDisponiveis.map((srv) => { const selected = item.servicos.includes(srv.key); return <button type="button" key={srv.key} onClick={() => setProfissionais((list) => list.map((r, x) => x === i ? { ...r, servicos: selected ? r.servicos.filter((k) => k !== srv.key) : [...r.servicos, srv.key] } : r))} className={`rounded-full border px-3 py-2 text-xs font-bold ${selected ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white"}`}>{srv.nome}</button>; })}</div><p className="mt-2 text-xs text-zinc-500">Se nenhum for marcado, todos os serviços serão vinculados automaticamente.</p></div>
            </Card>)}</div>
            <AddButton onClick={() => setProfissionais((list) => [...list, newProfissional()])}>Adicionar outro profissional</AddButton>
          </Step> : null}

          {step === "produtos" ? <Step title="Seu salão trabalha com produtos?" text="Produtos e Estoque são opcionais. Se desativar, as duas áreas e os seletores de produto ficam indisponíveis até um administrador ativar novamente.">
            <ChoiceGrid value={usaProdutos} onChange={setUsaProdutos} yesTitle="Sim, trabalho com produtos" yesText="Quero usar Produtos e Estoque." noTitle="Não trabalho com produtos" noText="Desativar Produtos e Estoque por enquanto." />
            {usaProdutos ? <><div className="mt-5 space-y-4">{produtos.map((item, i) => <Card key={item.key} title={`Produto ${i + 1}`} onRemove={produtos.length > 1 ? () => setProdutos((list) => list.filter((_, x) => x !== i)) : undefined}><div className="grid gap-3 md:grid-cols-5"><Field label="Nome" value={item.nome} onChange={(v) => setProdutos((list) => list.map((r, x) => x === i ? { ...r, nome: v } : r))} /><Field label="Categoria" value={item.categoria} onChange={(v) => setProdutos((list) => list.map((r, x) => x === i ? { ...r, categoria: v } : r))} /><Field label="Custo" value={item.custo} onChange={(v) => setProdutos((list) => list.map((r, x) => x === i ? { ...r, custo: v } : r))} /><Field label="Venda" value={item.venda} onChange={(v) => setProdutos((list) => list.map((r, x) => x === i ? { ...r, venda: v } : r))} /><Field label="Estoque inicial" type="number" value={item.estoque} onChange={(v) => setProdutos((list) => list.map((r, x) => x === i ? { ...r, estoque: v } : r))} /></div></Card>)}</div><AddButton onClick={() => setProdutos((list) => [...list, newProduto()])}>Adicionar outro produto</AddButton></> : <Banner>Produtos e Estoque ficarão desativados. Nenhum dado existente será apagado.</Banner>}
          </Step> : null}

          {step === "pix" ? <Step title="Você vai usar Pix no salão?" text="Você pode configurar agora ou deixar para depois. Isso não impede o início do teste grátis.">
            <ChoiceGrid value={usaPix} onChange={setUsaPix} yesTitle="Sim, configurar Pix" yesText="Quero deixar a chave pronta agora." noTitle="Configurar depois" noText="Continuar sem obrigar uma chave Pix." />
            {usaPix ? <div className="mt-5 grid gap-4 md:grid-cols-3"><Field label="Chave Pix" value={pixChave} onChange={setPixChave} /><Field label="Nome do recebedor" value={pixRecebedor} onChange={setPixRecebedor} /><Field label="Cidade" value={pixCidade} onChange={setPixCidade} /></div> : null}
          </Step> : null}

          {step === "horarios" ? <Step title="Defina os dias e horários de atendimento" text="Esses horários serão aplicados ao salão e aos profissionais criados neste onboarding.">
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Abre às" type="time" value={inicio} onChange={setInicio} /><Field label="Fecha às" type="time" value={fim} onChange={setFim} /></div>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">{DIAS.map((dia) => { const active = dias.includes(dia); return <button type="button" key={dia} onClick={() => setDias((list) => active ? list.filter((item) => item !== dia) : [...list, dia])} className={`rounded-2xl border px-3 py-3 text-sm font-bold ${active ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white"}`}>{LABEL_DIAS[dia]}</button>; })}</div>
          </Step> : null}

          {step === "revisao" ? <Step title="Revise e ative seu SalãoPremium" text="Ao finalizar, o servidor confere novamente os dados no banco. Só depois disso o teste grátis de 15 dias começa.">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Review label="Perfil" value={logoUrl && descricao ? "Completo" : "Pendente"} />
              <Review label="Serviços" value={`${estado.servicos?.length || 0} cadastrado(s)`} />
              <Review label="Profissionais" value={`${estado.profissionais?.length || 0} cadastrado(s)`} />
              <Review label="Produtos e Estoque" value={usaProdutos ? `${estado.produtos?.length || 0} produto(s)` : "Desativados"} />
              <Review label="Pix" value={usaPix ? "Configurado" : "Configurar depois"} />
              <Review label="Atendimento" value={`${dias.length} dia(s), ${inicio}–${fim}`} />
            </div>
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800"><strong>Validação final protegida:</strong> serviço, profissional, vínculo, disponibilidade, perfil, produtos (quando ativos), Pix (quando ativo) e horários são verificados novamente no banco antes da ativação.</div>
          </Step> : null}

          <div className="mt-8 flex flex-col-reverse justify-between gap-3 border-t border-zinc-100 pt-6 sm:flex-row">
            <button type="button" onClick={voltar} disabled={saving || stepIndex === 0} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-zinc-200 px-5 text-sm font-black disabled:opacity-40"><ArrowLeft size={16} /> Voltar</button>
            {step === "revisao" ? <button type="button" onClick={finalizar} disabled={saving} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 text-sm font-black text-white disabled:opacity-60">{saving ? <Loader2 className="animate-spin" size={17} /> : <CheckCircle2 size={17} />}{saving ? "Validando..." : "Finalizar cadastro e iniciar teste grátis"}</button> : <button type="button" onClick={avancar} disabled={saving || Boolean(uploading)} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-6 text-sm font-black text-white disabled:opacity-60">{saving ? <Loader2 className="animate-spin" size={17} /> : null}{saving ? "Salvando..." : "Salvar e continuar"}<ArrowRight size={16} /></button>}
          </div>
        </section>
      </div>
    </main>
  );
}

function Step({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return <div><p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Etapa de configuração</p><h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{title}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">{text}</p><div className="mt-6">{children}</div></div>;
}
function Field({ label, value, onChange, type = "text", placeholder = "" }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return <label className="block"><span className="mb-2 block text-sm font-black text-zinc-800">{label}</span><input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-zinc-950" /></label>;
}
function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block"><span className="mb-2 block text-sm font-black text-zinc-800">{label}</span><textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-950" /></label>;
}
function ImagePicker({ label, required, url, loading, onFile }: { label: string; required?: boolean; url: string; loading: boolean; onFile: (file: File | null) => void }) {
  return <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4"><p className="text-sm font-black">{label}{required ? " *" : ""}</p>{url ? <img src={url} alt="Prévia" className="mt-3 h-28 w-full rounded-2xl object-cover" /> : <div className="mt-3 grid h-28 place-items-center rounded-2xl border border-dashed border-zinc-300 bg-white text-zinc-400"><ImagePlus /></div>}<label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-black">{loading ? <Loader2 className="animate-spin" size={14} /> : <ImagePlus size={14} />}{loading ? "Enviando..." : "Escolher imagem"}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" disabled={loading} onChange={(e) => onFile(e.target.files?.[0] || null)} /></label></div>;
}
function Card({ title, onRemove, children }: { title: string; onRemove?: () => void; children: React.ReactNode }) {
  return <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4"><div className="mb-4 flex items-center justify-between gap-3"><strong>{title}</strong>{onRemove ? <button type="button" onClick={onRemove} className="grid h-9 w-9 place-items-center rounded-full border border-zinc-200 bg-white text-zinc-500 hover:text-red-600"><Trash2 size={15} /></button> : null}</div>{children}</div>;
}
function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm font-black"><Plus size={16} />{children}</button>;
}
function Banner({ children }: { children: React.ReactNode }) {
  return <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{children}</div>;
}
function ChoiceGrid({ value, onChange, yesTitle, yesText, noTitle, noText }: { value: boolean; onChange: (value: boolean) => void; yesTitle: string; yesText: string; noTitle: string; noText: string }) {
  return <div className="grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => onChange(true)} className={`rounded-3xl border p-5 text-left ${value ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white"}`}><strong>{yesTitle}</strong><p className="mt-1 text-sm opacity-75">{yesText}</p></button><button type="button" onClick={() => onChange(false)} className={`rounded-3xl border p-5 text-left ${!value ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white"}`}><strong>{noTitle}</strong><p className="mt-1 text-sm opacity-75">{noText}</p></button></div>;
}
function Review({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"><p className="text-xs font-black uppercase tracking-wider text-zinc-400">{label}</p><p className="mt-1 text-sm font-black text-zinc-800">{value}</p></div>;
}
