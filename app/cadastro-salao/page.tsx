"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getErrorMessage } from "@/lib/get-error-message";

type StepKey =
  | "boas_vindas"
  | "conta"
  | "salao"
  | "documento"
  | "endereco"
  | "resumo";

const STEPS: StepKey[] = [
  "boas_vindas",
  "conta",
  "salao",
  "documento",
  "endereco",
  "resumo",
];

function onlyNumbers(value: string) {
  return value.replace(/\D/g, "");
}

function maskCep(value: string) {
  const v = onlyNumbers(value).slice(0, 8);
  if (v.length <= 5) return v;
  return `${v.slice(0, 5)}-${v.slice(5)}`;
}

function maskPhone(value: string) {
  const v = onlyNumbers(value).slice(0, 11);

  if (v.length <= 2) return v;
  if (v.length <= 6) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
  if (v.length <= 10) return `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
  return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
}

function maskCpfCnpj(value: string) {
  const v = onlyNumbers(value).slice(0, 14);

  if (v.length <= 11) {
    if (v.length <= 3) return v;
    if (v.length <= 6) return `${v.slice(0, 3)}.${v.slice(3)}`;
    if (v.length <= 9) return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6)}`;
    return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9)}`;
  }

  if (v.length <= 2) return v;
  if (v.length <= 5) return `${v.slice(0, 2)}.${v.slice(2)}`;
  if (v.length <= 8) return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5)}`;
  if (v.length <= 12) {
    return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8)}`;
  }
  return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(
    8,
    12
  )}-${v.slice(12)}`;
}

function normalizarPlanoSelecionado(value: string | null) {
  const plano = String(value || "").trim().toLowerCase();

  if (plano === "basico" || plano === "pro" || plano === "premium") {
    return plano;
  }

  return "";
}

function getPlanoLabel(plano: string) {
  switch (plano) {
    case "basico":
      return "Essencial";
    case "pro":
      return "Profissional";
    case "premium":
      return "Premium";
    default:
      return "Escolher depois";
  }
}

function getStepTitle(step: StepKey) {
  switch (step) {
    case "boas_vindas":
      return "Bem-vinda ao SalaoPremium";
    case "conta":
      return "Vamos criar sua conta";
    case "salao":
      return "Agora os dados do salão";
    case "documento":
      return "Dados fiscais";
    case "endereco":
      return "Endereço do salão";
    case "resumo":
      return "Tudo pronto para finalizar";
    default:
      return "";
  }
}

function getStepSubtitle(step: StepKey) {
  switch (step) {
    case "boas_vindas":
      return "Vou te guiar em um cadastro rápido e bonito, passo a passo.";
    case "conta":
      return "Essa conta será a administradora principal do seu salão.";
    case "salao":
      return "Essas informações aparecem na operação e no cadastro principal.";
    case "documento":
      return "Aqui ficam os dados fiscais do estabelecimento.";
    case "endereco":
      return "Pode digitar o CEP que eu preencho parte do endereço automaticamente.";
    case "resumo":
      return "Confere tudo e finaliza. Depois seguimos para o login.";
    default:
      return "";
  }
}

export default function CadastroSalaoPage() {
  return (
    <Suspense
      fallback={
      <div className="min-h-screen bg-white px-4 py-6 md:px-6">
          <div className="mx-auto max-w-6xl rounded-[32px] border border-zinc-200 bg-white p-10 text-center shadow-xl">
            <p className="text-sm text-zinc-500">Carregando cadastro...</p>
          </div>
        </div>
      }
    >
      <CadastroSalaoContent />
    </Suspense>
  );
}

function CadastroSalaoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<StepKey>("boas_vindas");
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [buscandoCep, setBuscandoCep] = useState(false);

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const [nomeSalao, setNomeSalao] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  const [cpfCnpj, setCpfCnpj] = useState("");

  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");

  const planoSelecionado = normalizarPlanoSelecionado(searchParams.get("plano"));
  const planoLabel = getPlanoLabel(planoSelecionado);

  const currentStepIndex = STEPS.indexOf(step);
  const progresso = Math.round((currentStepIndex / (STEPS.length - 1)) * 100);

  function nextStep() {
    const currentIndex = STEPS.indexOf(step);
    const next = STEPS[currentIndex + 1];
    if (next) setStep(next);
  }

  function prevStep() {
    const currentIndex = STEPS.indexOf(step);
    const prev = STEPS[currentIndex - 1];
    if (prev) setStep(prev);
  }

  function validarStepAtual() {
    setErro("");

    if (step === "conta") {
      if (!email.trim()) {
        setErro("Informe o e-mail.");
        return false;
      }
      if (!senha.trim()) {
        setErro("Informe a senha.");
        return false;
      }
      if (senha.trim().length < 6) {
        setErro("A senha deve ter pelo menos 6 caracteres.");
        return false;
      }
    }

    if (step === "salao") {
      if (!nomeSalao.trim()) {
        setErro("Informe o nome do salão.");
        return false;
      }
      if (!responsavel.trim()) {
        setErro("Informe o responsável.");
        return false;
      }
    }

    if (step === "documento") {
      if (!cpfCnpj.trim()) {
        setErro("Informe o CPF ou CNPJ.");
        return false;
      }
    }

    if (step === "endereco") {
      if (!cep.trim()) {
        setErro("Informe o CEP.");
        return false;
      }
      if (!endereco.trim()) {
        setErro("Informe o endereço.");
        return false;
      }
      if (!bairro.trim()) {
        setErro("Informe o bairro.");
        return false;
      }
      if (!cidade.trim()) {
        setErro("Informe a cidade.");
        return false;
      }
      if (!estado.trim()) {
        setErro("Informe o estado.");
        return false;
      }
    }

    return true;
  }

  async function irParaProximoPasso() {
    if (!validarStepAtual()) return;
    nextStep();
  }

  async function buscarCep() {
    try {
      const cepLimpo = onlyNumbers(cep);
      if (cepLimpo.length !== 8) return;

      setBuscandoCep(true);
      setErro("");

      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();

      if (data.erro) {
        throw new Error("CEP não encontrado.");
      }

      setEndereco(data.logradouro || "");
      setBairro(data.bairro || "");
      setCidade(data.localidade || "");
      setEstado((data.uf || "").toUpperCase());
    } catch (e: unknown) {
      console.error(e);
      const message = getErrorMessage(e, "Erro ao buscar CEP.");
      setErro(
        message === "Failed to fetch"
          ? "Nao foi possivel buscar o CEP automaticamente. Preencha o endereco manualmente."
          : message
      );
    } finally {
      setBuscandoCep(false);
    }
  }

  async function handleFinish() {
    try {
      setSaving(true);
      setErro("");
      setMsg("");

      if (!email.trim()) throw new Error("Informe o e-mail.");
      if (!senha.trim()) throw new Error("Informe a senha.");
      if (!nomeSalao.trim()) throw new Error("Informe o nome do salão.");
      if (!responsavel.trim()) throw new Error("Informe o responsável.");
      if (!cpfCnpj.trim()) throw new Error("Informe CPF/CNPJ.");

      const res = await fetch("/api/cadastro-salao", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          senha,
          nomeSalao,
          responsavel,
          whatsapp,
          cpfCnpj,
          cep,
          endereco,
          numero,
          complemento,
          bairro,
          cidade,
          estado,
          plano: planoSelecionado || undefined,
          origem: "cadastro_publico",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Erro ao cadastrar salão.");
      }

      setMsg("Cadastro realizado com sucesso.");

      const params = new URLSearchParams({
        email: email.trim(),
      });

      if (planoSelecionado) {
        params.set("plano", planoSelecionado);
      }

      router.push(`/login?${params.toString()}`);
    } catch (e: unknown) {
      console.error("ERRO FINAL CADASTRO:", e);
      setErro(getErrorMessage(e, "Erro ao cadastrar salão."));
    } finally {
      setSaving(false);
    }
  }

  function renderStepContent() {
    switch (step) {
      case "boas_vindas":
        return (
          <div className="space-y-5">
            <AssistantBubble>
              Oi! Vou te ajudar a criar o seu salão no sistema em poucos passos.
            </AssistantBubble>

            <AssistantBubble>
              {planoSelecionado
                ? `Seu plano ${planoLabel} vai seguir com você para a assinatura logo após o primeiro login.`
                : "Depois do primeiro login, você escolhe o plano na tela de assinatura e pode iniciar o teste grátis por lá."}
            </AssistantBubble>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FeatureCard
                title="Agenda inteligente"
                text="Organize horários, profissionais e serviços com visual premium."
              />
              <FeatureCard
                title="Comandas e caixa"
                text="Controle consumo, fechamento, pagamentos e comissões."
              />
              <FeatureCard
                title="Gestão do salão"
                text="Clientes, relatórios, serviços, produtos e operação em um lugar só."
              />
            </div>
          </div>
        );

      case "conta":
        return (
          <div className="space-y-5">
            <AssistantBubble>
              Primeiro, vamos criar sua conta de acesso principal.
            </AssistantBubble>

            <div className="grid grid-cols-1 gap-4">
              <Input
                label="Seu e-mail de acesso"
                value={email}
                onChange={setEmail}
                type="email"
                placeholder="exemplo@seusalao.com"
              />

              <Input
                label="Crie uma senha"
                value={senha}
                onChange={setSenha}
                type="password"
                placeholder="Mínimo de 6 caracteres"
              />
            </div>
          </div>
        );

      case "salao":
        return (
          <div className="space-y-5">
            <AssistantBubble>
              Agora me fale os dados principais do seu salão.
            </AssistantBubble>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Nome do salão"
                value={nomeSalao}
                onChange={setNomeSalao}
                placeholder="Ex: Studio Mão de Fadas"
              />

              <Input
                label="Responsável"
                value={responsavel}
                onChange={setResponsavel}
                placeholder="Ex: Kawane Natiely"
              />

              <div className="md:col-span-2">
                <Input
                  label="WhatsApp"
                  value={whatsapp}
                  onChange={(v) => setWhatsapp(maskPhone(v))}
                  placeholder="(67) 99999-9999"
                />
              </div>
            </div>
          </div>
        );

      case "documento":
        return (
          <div className="space-y-5">
            <AssistantBubble>
              Agora preciso do documento do salão para o cadastro fiscal.
            </AssistantBubble>

            <div className="grid grid-cols-1 gap-4">
              <Input
                label="CPF ou CNPJ"
                value={cpfCnpj}
                onChange={(v) => setCpfCnpj(maskCpfCnpj(v))}
                placeholder="Digite CPF ou CNPJ"
              />
            </div>
          </div>
        );

      case "endereco":
        return (
          <div className="space-y-5">
            <AssistantBubble>
              Digite o CEP e eu completo parte do endereço automaticamente.
            </AssistantBubble>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="CEP"
                value={cep}
                onChange={(v) => setCep(maskCep(v))}
                onBlur={buscarCep}
                placeholder="00000-000"
              />

              <InfoMini
                text={
                  buscandoCep
                    ? "Buscando CEP..."
                    : "Ao sair do campo CEP eu busco o endereço."
                }
              />

              <div className="md:col-span-2">
                <Input
                  label="Endereço"
                  value={endereco}
                  onChange={setEndereco}
                  placeholder="Rua / Avenida"
                />
              </div>

              <Input
                label="Número"
                value={numero}
                onChange={setNumero}
                placeholder="Número"
              />

              <Input
                label="Complemento"
                value={complemento}
                onChange={setComplemento}
                placeholder="Complemento (opcional)"
              />

              <Input
                label="Bairro"
                value={bairro}
                onChange={setBairro}
                placeholder="Bairro"
              />

              <Input
                label="Cidade"
                value={cidade}
                onChange={setCidade}
                placeholder="Cidade"
              />

              <Input
                label="Estado"
                value={estado}
                onChange={(v) => setEstado(v.toUpperCase().slice(0, 2))}
                placeholder="UF"
              />
            </div>
          </div>
        );

      case "resumo":
        return (
          <div className="space-y-5">
            <AssistantBubble>
              Agora é só revisar e finalizar seu cadastro.
            </AssistantBubble>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <SummaryCard label="E-mail" value={email || "-"} />
              <SummaryCard label="Salão" value={nomeSalao || "-"} />
              <SummaryCard label="Responsável" value={responsavel || "-"} />
              <SummaryCard label="WhatsApp" value={whatsapp || "-"} />
              <SummaryCard label="CPF/CNPJ" value={cpfCnpj || "-"} />
              {planoSelecionado ? (
                <SummaryCard label="Plano" value={planoLabel} />
              ) : null}
              <SummaryCard
                label="Endereço"
                value={[
                  endereco,
                  numero,
                  complemento,
                  bairro,
                  cidade,
                  estado,
                ]
                  .filter(Boolean)
                  .join(" - ") || "-"}
              />
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
              Ao finalizar, sua conta será criada. No primeiro acesso você será direcionado para a assinatura, onde poderá iniciar o teste grátis.
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div className="min-h-screen bg-white px-4 py-6 md:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <aside className="overflow-hidden rounded-[32px] border border-zinc-200 bg-white text-zinc-950 shadow-sm">
            <div className="p-8">
              <div className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-zinc-600">
                SalaoPremium
              </div>

              {planoSelecionado ? (
                <div className="mt-4 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  Plano escolhido: {planoLabel}
                </div>
              ) : null}

              <h1 className="mt-6 text-3xl font-bold leading-tight md:text-4xl">
                Cadastro bonito, guiado e profissional para o seu salão
              </h1>

              <p className="mt-4 text-sm leading-6 text-zinc-500 md:text-base">
                Crie sua conta, configure seu salão e comece com agenda, caixa, comandas,
                serviços, clientes e gestão completa em um único sistema.
              </p>

              <div className="mt-8 space-y-4">
                <BenefitItem
                  title="Cadastro guiado"
                  text="Você preenche passo a passo, sem confusão."
                />
                <BenefitItem
                  title="Visual premium"
                  text="Experiência moderna, elegante e mais profissional."
                />
                <BenefitItem
                  title="Pronto para crescer"
                  text="Estrutura preparada para operação real de salão."
                />
              </div>

              <div className="mt-10">
                <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  <span>Progresso</span>
                  <span>{progresso}%</span>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full bg-zinc-950 transition-all duration-300"
                    style={{ width: `${progresso}%` }}
                  />
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3">
                {STEPS.slice(1).map((item, index) => {
                  const stepNumber = index + 1;
                  const active = currentStepIndex >= index + 1;

                  return (
                    <div
                      key={item}
                      className={`rounded-2xl border px-4 py-3 text-sm transition ${
                        active
                          ? "border-zinc-950 bg-zinc-950 text-white"
                          : "border-zinc-200 bg-zinc-50 text-zinc-500"
                      }`}
                    >
                      <div className="text-xs uppercase tracking-wider">
                        Etapa {stepNumber}
                      </div>
                      <div className="mt-1 font-semibold">{getStepTitle(item)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>

          <main className="rounded-[32px] border border-zinc-200 bg-white shadow-xl">
            <div className="border-b border-zinc-200 px-6 py-6 md:px-8">
              <div className="inline-flex rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                Etapa {Math.max(currentStepIndex, 1)} de {STEPS.length - 1}
              </div>

              <h2 className="mt-4 text-2xl font-bold text-zinc-900">
                {getStepTitle(step)}
              </h2>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                {getStepSubtitle(step)}
              </p>
            </div>

            <div className="px-6 py-6 md:px-8 md:py-8">
              {erro ? (
                <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {erro}
                </div>
              ) : null}

              {msg ? (
                <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {msg}
                </div>
              ) : null}

              {renderStepContent()}

              <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-6">
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={step === "boas_vindas" || saving}
                  className="rounded-2xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Voltar
                </button>

                {step !== "resumo" ? (
                  <button
                    type="button"
                    onClick={irParaProximoPasso}
                    disabled={saving}
                    className="rounded-2xl bg-zinc-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:opacity-60"
                  >
                    {step === "boas_vindas" ? "Começar cadastro" : "Continuar"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinish}
                    disabled={saving}
                    className="rounded-2xl bg-zinc-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:opacity-60"
                  >
                    {saving ? "Finalizando..." : "Cadastrar salão"}
                  </button>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function AssistantBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-2xl rounded-[24px] rounded-tl-md bg-zinc-900 px-5 py-4 text-sm leading-6 text-white shadow-sm">
      {children}
    </div>
  );
}

function FeatureCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
      <h3 className="text-sm font-bold text-zinc-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-500">{text}</p>
    </div>
  );
}

function BenefitItem({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4">
      <p className="font-semibold text-zinc-950">{title}</p>
      <p className="mt-1 text-sm text-zinc-500">{text}</p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-zinc-900">{value}</p>
    </div>
  );
}

function InfoMini({ text }: { text: string }) {
  return (
    <div className="flex h-[50px] items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-600">
      {text}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  onBlur,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  onBlur?: () => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-zinc-700">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-900 focus:ring-4 focus:ring-zinc-200"
      />
    </div>
  );
}
