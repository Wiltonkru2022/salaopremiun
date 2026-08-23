"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  CreditCard,
  Loader2,
  PackagePlus,
  Plus,
  Scissors,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getUsuarioLogado } from "@/lib/auth/getUsuarioLogado";
import { getErrorMessage } from "@/lib/get-error-message";

type StepKey =
  | "perfil"
  | "profissionais"
  | "produtos"
  | "pix"
  | "horarios"
  | "revisao";

type ProfissionalDraft = {
  nome: string;
  cargo: string;
  especialidades: string;
};

type ProdutoDraft = {
  nome: string;
  categoria: string;
  preco_custo: string;
  preco_venda: string;
  estoque_atual: string;
};

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
  const normalized = String(value || "")
    .replace(/\s/g, "")
    .replace(/R\$/gi, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const number = Number(normalized || 0);
  return Number.isFinite(number) ? number : 0;
}

function emptyProfessional(): ProfissionalDraft {
  return { nome: "", cargo: "", especialidades: "" };
}

function emptyProduct(): ProdutoDraft {
  return {
    nome: "",
    categoria: "",
    preco_custo: "",
    preco_venda: "",
    estoque_atual: "0",
  };
}

export default function OnboardingSalaoPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [step, setStep] = useState<StepKey>("perfil");
  const [idSalao, setIdSalao] = useState("");

  const [nomeSalao, setNomeSalao] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [descricao, setDescricao] = useState("");
  const [instagram, setInstagram] = useState("");

  const [profissionais, setProfissionais] = useState<ProfissionalDraft[]>([
    emptyProfessional(),
  ]);
  const [profissionaisExistentes, setProfissionaisExistentes] = useState(0);

  const [produtos, setProdutos] = useState<ProdutoDraft[]>([emptyProduct()]);
  const [produtosExistentes, setProdutosExistentes] = useState(0);

  const [pixChave, setPixChave] = useState("");
  const [pixRecebedor, setPixRecebedor] = useState("");
  const [pixCidade, setPixCidade] = useState("");

  const [horaAbertura, setHoraAbertura] = useState("08:00");
  const [horaFechamento, setHoraFechamento] = useState("19:00");
  const [diasFuncionamento, setDiasFuncionamento] = useState<string[]>([
    "Segunda",
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sábado",
  ]);

  const stepIndex = STEPS.findIndex((item) => item.key === step);
  const progresso = Math.round(((stepIndex + 1) / STEPS.length) * 100);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        setLoading(true);
        setErro("");
        const usuario = await getUsuarioLogado();
        if (!usuario?.idSalao) throw new Error("Não foi possível identificar o salão.");

        const salaoId = usuario.idSalao;
        if (!active) return;
        setIdSalao(salaoId);

        const [salaoResult, configResult, profissionaisResult, produtosResult] =
          await Promise.all([
            (supabase as any)
              .from("saloes")
              .select(
                "nome, whatsapp, telefone, descricao_publica, instagram_url, cidade, onboarding_concluido, onboarding_etapa"
              )
              .eq("id", salaoId)
              .maybeSingle(),
            (supabase as any)
              .from("configuracoes_salao")
              .select(
                "hora_abertura, hora_fechamento, dias_funcionamento, sinal_pix_chave, sinal_pix_recebedor, sinal_pix_cidade"
              )
              .eq("id_salao", salaoId)
              .maybeSingle(),
            supabase
              .from("profissionais")
              .select("id", { count: "exact", head: true })
              .eq("id_salao", salaoId)
              .eq("ativo", true),
            supabase
              .from("produtos")
              .select("id", { count: "exact", head: true })
              .eq("id_salao", salaoId)
              .eq("ativo", true),
          ]);

        if (salaoResult.error) throw salaoResult.error;
        if (configResult.error && configResult.error.code !== "PGRST116") {
          throw configResult.error;
        }

        const salao = salaoResult.data || {};
        const config = configResult.data || {};

        if (salao.onboarding_concluido === true) {
          router.replace("/dashboard");
          return;
        }

        if (!active) return;
        setNomeSalao(String(salao.nome || ""));
        setWhatsapp(String(salao.whatsapp || salao.telefone || ""));
        setDescricao(String(salao.descricao_publica || ""));
        setInstagram(String(salao.instagram_url || ""));
        setPixChave(String(config.sinal_pix_chave || ""));
        setPixRecebedor(String(config.sinal_pix_recebedor || ""));
        setPixCidade(String(config.sinal_pix_cidade || salao.cidade || ""));
        setHoraAbertura(String(config.hora_abertura || "08:00").slice(0, 5));
        setHoraFechamento(String(config.hora_fechamento || "19:00").slice(0, 5));
        if (Array.isArray(config.dias_funcionamento) && config.dias_funcionamento.length) {
          setDiasFuncionamento(config.dias_funcionamento.filter((dia: unknown) => typeof dia === "string"));
        }
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
    return () => {
      active = false;
    };
  }, [router, supabase]);

  const resumo = useMemo(
    () => [
      { label: "Perfil", value: nomeSalao || "Não informado" },
      {
        label: "Profissionais",
        value: `${profissionaisExistentes} cadastrado${profissionaisExistentes === 1 ? "" : "s"}`,
      },
      {
        label: "Produtos",
        value: `${produtosExistentes} cadastrado${produtosExistentes === 1 ? "" : "s"}`,
      },
      { label: "Pix", value: pixChave ? "Configurado" : "Pendente" },
      {
        label: "Atendimento",
        value: `${diasFuncionamento.length} dias • ${horaAbertura} às ${horaFechamento}`,
      },
    ],
    [
      nomeSalao,
      profissionaisExistentes,
      produtosExistentes,
      pixChave,
      diasFuncionamento.length,
      horaAbertura,
      horaFechamento,
    ]
  );

  async function salvarProgresso(next: StepKey) {
    const { error } = await (supabase as any)
      .from("saloes")
      .update({ onboarding_etapa: next, updated_at: new Date().toISOString() })
      .eq("id", idSalao);
    if (error) throw error;
  }

  async function salvarPerfil() {
    if (!nomeSalao.trim()) throw new Error("Informe o nome do salão.");
    if (!whatsapp.trim()) throw new Error("Informe o WhatsApp do salão.");
    if (!descricao.trim()) throw new Error("Escreva uma descrição curta para o perfil do salão.");

    const { error } = await (supabase as any)
      .from("saloes")
      .update({
        nome: nomeSalao.trim(),
        whatsapp: whatsapp.trim(),
        telefone: whatsapp.trim(),
        descricao_publica: descricao.trim(),
        instagram_url: instagram.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", idSalao);
    if (error) throw error;
  }

  async function salvarProfissionais() {
    const novos = profissionais.filter((item) => item.nome.trim());
    if (profissionaisExistentes + novos.length < 1) {
      throw new Error("Adicione pelo menos um profissional para continuar.");
    }

    for (const item of novos) {
      const response = await fetch("/api/profissionais/processar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "criar",
          idSalao,
          idProfissional: null,
          profissional: {
            nome: item.nome.trim(),
            cargo: item.cargo.trim() || null,
            categoria: item.cargo.trim() || null,
            especialidades: item.especialidades
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean),
            tipo_profissional: "profissional",
            tipo_vinculo: "AUTONOMO",
            comissao_produto_percentual: 0,
            intervalo_agenda_minutos: 30,
            sinal_pix_proprio: false,
            sinal_confirmacao_responsavel: "salao",
            nivel_acesso: "proprio",
            ativo: true,
            status: "ativo",
            dias_trabalho: [],
            pausas: [],
          },
          servicos: [],
          assistentes: [],
          acesso_app: null,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Erro ao cadastrar profissional.");
    }

    if (novos.length) {
      setProfissionaisExistentes((value) => value + novos.length);
      setProfissionais([emptyProfessional()]);
    }
  }

  async function salvarProdutos() {
    const novos = produtos.filter((item) => item.nome.trim());
    if (produtosExistentes + novos.length < 1) {
      throw new Error("Adicione pelo menos um produto para continuar.");
    }

    for (const item of novos) {
      const custo = parseMoney(item.preco_custo);
      const venda = parseMoney(item.preco_venda);
      const margem = venda > 0 ? ((venda - custo) / venda) * 100 : 0;
      const response = await fetch("/api/produtos/processar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idSalao,
          acao: "salvar",
          produto: {
            id: null,
            id_salao: idSalao,
            nome: item.nome.trim(),
            categoria: item.categoria.trim() || null,
            unidade_medida: "un",
            quantidade_por_embalagem: 1,
            preco_custo: custo,
            custos_extras: 0,
            custo_por_dose: custo,
            dose_padrao: 1,
            unidade_dose: "un",
            preco_venda: venda,
            margem_lucro_percentual: margem,
            estoque_atual: Number(item.estoque_atual || 0),
            estoque_minimo: 0,
            destinacao: "uso_interno",
            comissao_revenda_percentual: 0,
            ativo: true,
            status: "ativo",
          },
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Erro ao cadastrar produto.");
    }

    if (novos.length) {
      setProdutosExistentes((value) => value + novos.length);
      setProdutos([emptyProduct()]);
    }
  }

  async function salvarPix() {
    if (!pixChave.trim()) throw new Error("Informe a chave Pix do salão.");
    if (!pixRecebedor.trim()) throw new Error("Informe o nome do recebedor do Pix.");
    if (!pixCidade.trim()) throw new Error("Informe a cidade do recebedor do Pix.");

    const { error } = await (supabase as any)
      .from("configuracoes_salao")
      .upsert(
        {
          id_salao: idSalao,
          sinal_pix_chave: pixChave.trim(),
          sinal_pix_recebedor: pixRecebedor.trim(),
          sinal_pix_cidade: pixCidade.trim(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id_salao" }
      );
    if (error) throw error;
  }

  async function salvarHorarios() {
    if (!diasFuncionamento.length) throw new Error("Selecione pelo menos um dia de atendimento.");
    if (!horaAbertura || !horaFechamento) throw new Error("Informe os horários de abertura e fechamento.");
    if (horaAbertura >= horaFechamento) {
      throw new Error("O horário de fechamento deve ser depois da abertura.");
    }

    const { error } = await (supabase as any)
      .from("configuracoes_salao")
      .upsert(
        {
          id_salao: idSalao,
          hora_abertura: horaAbertura,
          hora_fechamento: horaFechamento,
          dias_funcionamento: diasFuncionamento,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id_salao" }
      );
    if (error) throw error;
  }

  async function avancar() {
    try {
      setSaving(true);
      setErro("");

      if (step === "perfil") await salvarPerfil();
      if (step === "profissionais") await salvarProfissionais();
      if (step === "produtos") await salvarProdutos();
      if (step === "pix") await salvarPix();
      if (step === "horarios") await salvarHorarios();

      const next = STEPS[stepIndex + 1]?.key;
      if (!next) return;
      await salvarProgresso(next);
      setStep(next);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setErro(getErrorMessage(error, "Não foi possível salvar esta etapa."));
    } finally {
      setSaving(false);
    }
  }

  async function finalizar() {
    try {
      setSaving(true);
      setErro("");
      if (profissionaisExistentes < 1) throw new Error("Cadastre ao menos um profissional.");
      if (produtosExistentes < 1) throw new Error("Cadastre ao menos um produto.");
      if (!pixChave.trim()) throw new Error("Configure o Pix.");
      if (!diasFuncionamento.length) throw new Error("Configure os dias de atendimento.");

      const { error } = await (supabase as any)
        .from("saloes")
        .update({
          onboarding_concluido: true,
          onboarding_etapa: "concluido",
          onboarding_concluido_em: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", idSalao);
      if (error) throw error;

      router.replace("/dashboard?novo=1&onboarding=concluido");
    } catch (error) {
      setErro(getErrorMessage(error, "Não foi possível finalizar o cadastro."));
    } finally {
      setSaving(false);
    }
  }

  function voltar() {
    if (saving || stepIndex <= 0) return;
    setErro("");
    setStep(STEPS[stepIndex - 1].key);
  }

  function toggleDia(dia: string) {
    setDiasFuncionamento((current) =>
      current.includes(dia) ? current.filter((item) => item !== dia) : [...current, dia]
    );
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#f6f7f9]">
        <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-5 py-4 font-bold text-zinc-700 shadow-sm">
          <Loader2 className="animate-spin" size={20} />
          Carregando configuração inicial...
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-[#f6f7f9] text-zinc-950">
      <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-5 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-zinc-950 text-[#e8c56b]">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-lg font-black tracking-tight">SalãoPremium</p>
              <p className="text-xs font-semibold text-zinc-500">Configuração inicial do salão</p>
            </div>
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">Progresso</p>
            <p className="mt-1 text-sm font-black">{progresso}% concluído</p>
          </div>
        </div>
        <div className="h-1 bg-zinc-100">
          <div className="h-full bg-zinc-950 transition-all" style={{ width: `${progresso}%` }} />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
        <div className="mb-7 overflow-x-auto pb-1">
          <div className="flex min-w-max gap-2">
            {STEPS.map((item, index) => {
              const Icon = item.icon;
              const done = index < stepIndex;
              const active = item.key === step;
              return (
                <div
                  key={item.key}
                  className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-black ${
                    active
                      ? "border-zinc-950 bg-zinc-950 text-white"
                      : done
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-zinc-200 bg-white text-zinc-500"
                  }`}
                >
                  {done ? <Check size={14} /> : <Icon size={14} />}
                  {item.label}
                </div>
              );
            })}
          </div>
        </div>

        {erro ? (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {erro}
          </div>
        ) : null}

        <section className="rounded-[30px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-7 lg:p-9">
          {step === "perfil" ? (
            <StepShell
              eyebrow="Etapa 1 de 6"
              title="Configure o perfil do seu salão"
              text="Esses dados serão usados no painel e também na apresentação pública do salão."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nome do salão" value={nomeSalao} onChange={setNomeSalao} required />
                <Field label="WhatsApp do salão" value={whatsapp} onChange={setWhatsapp} required />
                <div className="md:col-span-2">
                  <TextArea
                    label="Descrição do salão"
                    value={descricao}
                    onChange={setDescricao}
                    placeholder="Conte em poucas linhas o que seu salão oferece e o que torna seu atendimento especial."
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <Field
                    label="Instagram (opcional)"
                    value={instagram}
                    onChange={setInstagram}
                    placeholder="https://instagram.com/seusalao"
                  />
                </div>
              </div>
            </StepShell>
          ) : null}

          {step === "profissionais" ? (
            <StepShell
              eyebrow="Etapa 2 de 6"
              title="Adicione seus primeiros profissionais"
              text="Cadastre quem atende no salão. Você poderá completar documentos, comissão, foto e acesso ao app depois."
            >
              {profissionaisExistentes > 0 ? (
                <StatusBanner text={`${profissionaisExistentes} profissional${profissionaisExistentes === 1 ? "" : "is"} já cadastrado${profissionaisExistentes === 1 ? "" : "s"}.`} />
              ) : null}
              <div className="space-y-4">
                {profissionais.map((item, index) => (
                  <div key={index} className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 font-black">
                        <Scissors size={17} /> Profissional {index + 1}
                      </div>
                      {profissionais.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => setProfissionais((list) => list.filter((_, i) => i !== index))}
                          className="grid h-9 w-9 place-items-center rounded-full border border-zinc-200 bg-white text-zinc-500 hover:text-red-600"
                          aria-label="Remover profissional"
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : null}
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <Field
                        label="Nome"
                        value={item.nome}
                        onChange={(value) =>
                          setProfissionais((list) =>
                            list.map((row, i) => (i === index ? { ...row, nome: value } : row))
                          )
                        }
                        required={profissionaisExistentes === 0 && index === 0}
                      />
                      <Field
                        label="Cargo"
                        value={item.cargo}
                        onChange={(value) =>
                          setProfissionais((list) =>
                            list.map((row, i) => (i === index ? { ...row, cargo: value } : row))
                          )
                        }
                        placeholder="Cabeleireiro, manicure..."
                      />
                      <Field
                        label="Especialidades"
                        value={item.especialidades}
                        onChange={(value) =>
                          setProfissionais((list) =>
                            list.map((row, i) =>
                              i === index ? { ...row, especialidades: value } : row
                            )
                          )
                        }
                        placeholder="Corte, cor, escova"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setProfissionais((list) => [...list, emptyProfessional()])}
                className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm font-black hover:bg-zinc-50"
              >
                <Plus size={16} /> Adicionar outro profissional
              </button>
            </StepShell>
          ) : null}

          {step === "produtos" ? (
            <StepShell
              eyebrow="Etapa 3 de 6"
              title="Adicione seus primeiros produtos"
              text="Comece seu estoque com os produtos que o salão usa ou vende. Depois você pode completar fornecedor, lote, validade e estoque mínimo."
            >
              {produtosExistentes > 0 ? (
                <StatusBanner text={`${produtosExistentes} produto${produtosExistentes === 1 ? "" : "s"} já cadastrado${produtosExistentes === 1 ? "" : "s"}.`} />
              ) : null}
              <div className="space-y-4">
                {produtos.map((item, index) => (
                  <div key={index} className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 font-black">
                        <PackagePlus size={17} /> Produto {index + 1}
                      </div>
                      {produtos.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => setProdutos((list) => list.filter((_, i) => i !== index))}
                          className="grid h-9 w-9 place-items-center rounded-full border border-zinc-200 bg-white text-zinc-500 hover:text-red-600"
                          aria-label="Remover produto"
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : null}
                    </div>
                    <div className="grid gap-3 md:grid-cols-5">
                      <div className="md:col-span-2">
                        <Field
                          label="Nome"
                          value={item.nome}
                          onChange={(value) =>
                            setProdutos((list) =>
                              list.map((row, i) => (i === index ? { ...row, nome: value } : row))
                            )
                          }
                          required={produtosExistentes === 0 && index === 0}
                        />
                      </div>
                      <Field
                        label="Categoria"
                        value={item.categoria}
                        onChange={(value) =>
                          setProdutos((list) =>
                            list.map((row, i) => (i === index ? { ...row, categoria: value } : row))
                          )
                        }
                      />
                      <Field
                        label="Custo"
                        value={item.preco_custo}
                        onChange={(value) =>
                          setProdutos((list) =>
                            list.map((row, i) => (i === index ? { ...row, preco_custo: value } : row))
                          )
                        }
                        placeholder="0,00"
                      />
                      <Field
                        label="Venda"
                        value={item.preco_venda}
                        onChange={(value) =>
                          setProdutos((list) =>
                            list.map((row, i) => (i === index ? { ...row, preco_venda: value } : row))
                          )
                        }
                        placeholder="0,00"
                      />
                      <Field
                        label="Estoque inicial"
                        value={item.estoque_atual}
                        onChange={(value) =>
                          setProdutos((list) =>
                            list.map((row, i) => (i === index ? { ...row, estoque_atual: value } : row))
                          )
                        }
                        type="number"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setProdutos((list) => [...list, emptyProduct()])}
                className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm font-black hover:bg-zinc-50"
              >
                <Plus size={16} /> Adicionar outro produto
              </button>
            </StepShell>
          ) : null}

          {step === "pix" ? (
            <StepShell
              eyebrow="Etapa 4 de 6"
              title="Configure o Pix do salão"
              text="Essa chave será usada nas configurações financeiras e nos fluxos de sinal/agendamento que usam Pix."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Chave Pix" value={pixChave} onChange={setPixChave} required />
                <Field label="Nome do recebedor" value={pixRecebedor} onChange={setPixRecebedor} required />
                <Field label="Cidade do recebedor" value={pixCidade} onChange={setPixCidade} required />
              </div>
            </StepShell>
          ) : null}

          {step === "horarios" ? (
            <StepShell
              eyebrow="Etapa 5 de 6"
              title="Defina os dias e horários de atendimento"
              text="Esses horários serão a base da agenda do salão. Cada profissional poderá ter sua própria disponibilidade depois."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Abre às" value={horaAbertura} onChange={setHoraAbertura} type="time" required />
                <Field label="Fecha às" value={horaFechamento} onChange={setHoraFechamento} type="time" required />
              </div>
              <div className="mt-6">
                <p className="mb-3 text-sm font-black text-zinc-800">Dias de funcionamento</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                  {DIAS.map((dia) => {
                    const active = diasFuncionamento.includes(dia);
                    return (
                      <button
                        key={dia}
                        type="button"
                        onClick={() => toggleDia(dia)}
                        className={`rounded-2xl border px-3 py-3 text-sm font-black transition ${
                          active
                            ? "border-zinc-950 bg-zinc-950 text-white"
                            : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                        }`}
                      >
                        {dia}
                      </button>
                    );
                  })}
                </div>
              </div>
            </StepShell>
          ) : null}

          {step === "revisao" ? (
            <StepShell
              eyebrow="Etapa 6 de 6"
              title="Seu salão está pronto para começar"
              text="Confira a configuração inicial. Ao finalizar, o cadastro é concluído e o painel completo será liberado."
            >
              <div className="grid gap-3 md:grid-cols-2">
                {resumo.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.15em] text-zinc-400">{item.label}</p>
                    <p className="mt-2 text-base font-black text-zinc-950">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 shrink-0" size={22} />
                  <div>
                    <p className="font-black">Tudo certo para liberar o painel</p>
                    <p className="mt-1 text-sm leading-6 text-emerald-800">
                      Depois de finalizar, você poderá editar qualquer uma dessas informações normalmente nas áreas de Perfil, Profissionais, Produtos e Configurações.
                    </p>
                  </div>
                </div>
              </div>
            </StepShell>
          ) : null}

          <div className="mt-8 flex flex-col-reverse justify-between gap-3 border-t border-zinc-100 pt-6 sm:flex-row">
            <button
              type="button"
              onClick={voltar}
              disabled={saving || stepIndex === 0}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-zinc-300 bg-white px-5 text-sm font-black text-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft size={17} /> Voltar
            </button>

            {step === "revisao" ? (
              <button
                type="button"
                onClick={finalizar}
                disabled={saving}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 text-sm font-black text-white shadow-lg transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? <Loader2 className="animate-spin" size={17} /> : <CheckCircle2 size={17} />}
                Finalizar cadastro e entrar no painel
              </button>
            ) : (
              <button
                type="button"
                onClick={avancar}
                disabled={saving}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-6 text-sm font-black text-white shadow-lg transition hover:bg-zinc-800 disabled:opacity-60"
              >
                {saving ? <Loader2 className="animate-spin" size={17} /> : null}
                Salvar e continuar
                {!saving ? <ArrowRight size={17} /> : null}
              </button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function StepShell({
  eyebrow,
  title,
  text,
  children,
}: {
  eyebrow: string;
  title: string;
  text: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9a681d]">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600 sm:text-base">{text}</p>
      <div className="mt-7">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-zinc-800">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-2xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-950 outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-zinc-800">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={5}
        className="w-full resize-none rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold leading-6 text-zinc-950 outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
      />
    </label>
  );
}

function StatusBanner({ text }: { text: string }) {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
      <CheckCircle2 size={17} /> {text}
    </div>
  );
}
