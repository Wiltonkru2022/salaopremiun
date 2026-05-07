"use client";

import { Suspense, useState } from "react";
import { ArrowLeft, Check, Loader2, MessageCircle } from "lucide-react";
import { getErrorMessage } from "@/lib/get-error-message";

type StepKey = "boas_vindas" | "conta" | "salao" | "endereco" | "resumo";

const STEPS: StepKey[] = ["boas_vindas", "conta", "salao", "endereco", "resumo"];

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

function getLoginRedirectHref(params: URLSearchParams) {
  const host =
    process.env.NEXT_PUBLIC_APP_LOGIN_HOST ||
    process.env.APP_LOGIN_HOST ||
    "login.salaopremiun.com.br";

  return `https://${String(host).replace(/^https?:\/\//, "")}/login?${params.toString()}`;
}

function getStepTitle(step: StepKey) {
  switch (step) {
    case "boas_vindas":
      return "Comeco";
    case "conta":
      return "Acesso";
    case "salao":
      return "Salao";
    case "endereco":
      return "Endereco";
    case "resumo":
      return "Revisao";
    default:
      return "";
  }
}

export default function CadastroSalaoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 px-4 py-5 md:px-6">
          <div className="mx-auto max-w-4xl rounded-[26px] border border-white/20 bg-white/90 p-8 text-center shadow-xl">
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
  const [step, setStep] = useState<StepKey>("boas_vindas");
  const [typing, setTyping] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [buscandoCep, setBuscandoCep] = useState(false);

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nomeSalao, setNomeSalao] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");

  const currentStepIndex = STEPS.indexOf(step);
  const progresso = Math.round((currentStepIndex / (STEPS.length - 1)) * 100);

  function validarStepAtual() {
    setErro("");

    if (step === "conta") {
      if (!email.trim()) return setErro("Informe o e-mail."), false;
      if (!senha.trim()) return setErro("Informe a senha."), false;
      if (senha.trim().length < 6) {
        return setErro("A senha deve ter pelo menos 6 caracteres."), false;
      }
    }

    if (step === "salao") {
      if (!nomeSalao.trim()) return setErro("Informe o nome do salao."), false;
      if (!responsavel.trim()) return setErro("Informe o responsavel."), false;
    }

    if (step === "endereco") {
      if (!cep.trim()) return setErro("Informe o CEP."), false;
      if (!endereco.trim()) return setErro("Informe o endereco."), false;
      if (!bairro.trim()) return setErro("Informe o bairro."), false;
      if (!cidade.trim()) return setErro("Informe a cidade."), false;
      if (!estado.trim()) return setErro("Informe o estado."), false;
    }

    return true;
  }

  function irParaProximoPasso() {
    if (!validarStepAtual()) return;

    const next = STEPS[currentStepIndex + 1];
    if (!next) return;

    setTyping(true);
    window.setTimeout(() => {
      setStep(next);
      setTyping(false);
    }, 1200);
  }

  function voltarPasso() {
    const prev = STEPS[currentStepIndex - 1];
    if (!prev || saving || typing) return;
    setErro("");
    setTyping(false);
    setStep(prev);
  }

  async function buscarCep() {
    try {
      const cepLimpo = onlyNumbers(cep);
      if (cepLimpo.length !== 8) return;

      setBuscandoCep(true);
      setErro("");

      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();

      if (data.erro) throw new Error("CEP nao encontrado.");

      setEndereco(data.logradouro || "");
      setBairro(data.bairro || "");
      setCidade(data.localidade || "");
      setEstado((data.uf || "").toUpperCase());
    } catch (e: unknown) {
      const message = getErrorMessage(e, "Erro ao buscar CEP.");
      setErro(
        message === "Failed to fetch"
          ? "Nao foi possivel buscar o CEP automaticamente. Preencha manualmente."
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
      if (!nomeSalao.trim()) throw new Error("Informe o nome do salao.");
      if (!responsavel.trim()) throw new Error("Informe o responsavel.");

      const res = await fetch("/api/cadastro-salao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          senha,
          nomeSalao,
          responsavel,
          whatsapp,
          cpfCnpj: "",
          cep,
          endereco,
          numero,
          complemento,
          bairro,
          cidade,
          estado,
          origem: "cadastro_publico_chat",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao cadastrar salao.");

      setMsg("Cadastro realizado com sucesso.");

      const params = new URLSearchParams({ email: email.trim() });
      window.location.assign(getLoginRedirectHref(params));
    } catch (e: unknown) {
      setErro(getErrorMessage(e, "Erro ao cadastrar salao."));
    } finally {
      setSaving(false);
    }
  }

  const completedSteps = STEPS.slice(0, currentStepIndex);

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-slate-950 bg-cover bg-center px-4 py-4 md:px-6 md:py-6"
      style={{ backgroundImage: "url('/site/cadastro-salao-bg.jpeg')" }}
    >
      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[3px]" />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/45 to-slate-950/25" />

      <div className="relative mx-auto grid max-w-6xl gap-5 xl:grid-cols-[0.72fr_1.28fr]">
        <aside className="rounded-[28px] border border-white/20 bg-white/12 p-5 text-white shadow-2xl backdrop-blur-md md:p-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em]">
            <MessageCircle size={15} />
            SalaoPremium
          </div>
          <h1 className="mt-5 text-[2.05rem] font-black leading-tight md:text-[2.7rem]">
            Cadastro em conversa, sem complicar.
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/80">
            Responda uma coisa por vez. Eu vou mostrando a proxima mensagem como
            em um atendimento pelo WhatsApp.
          </p>

          <div className="mt-7">
            <div className="mb-3 flex items-center justify-between text-xs font-bold uppercase tracking-[0.16em] text-white/65">
              <span>Progresso</span>
              <span>{progresso}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                style={{ width: `${progresso}%` }}
              />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2.5">
            {STEPS.slice(1).map((item, index) => {
              const active = currentStepIndex >= index + 1;
              return (
                <div
                  key={item}
                  className={`rounded-2xl border px-4 py-3 text-sm transition ${
                    active
                      ? "border-white bg-white text-zinc-950"
                      : "border-white/15 bg-white/10 text-white/70"
                  }`}
                >
                  <div className="text-xs uppercase tracking-wider">Etapa {index + 1}</div>
                  <div className="mt-1 font-bold">{getStepTitle(item)}</div>
                </div>
              );
            })}
          </div>
        </aside>

        <main className="overflow-hidden rounded-[28px] border border-white/50 bg-[#efeae2]/95 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between border-b border-black/10 bg-emerald-800 px-5 py-4 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-emerald-800">
                <MessageCircle size={22} />
              </div>
              <div>
                <h2 className="text-base font-black">Assistente SalaoPremium</h2>
                <p className="text-xs text-emerald-50/80">
                  {typing ? "digitando..." : "online agora"}
                </p>
              </div>
            </div>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
              {currentStepIndex + 1}/{STEPS.length}
            </span>
          </div>

          <div className="max-h-[calc(100vh-150px)] min-h-[650px] overflow-y-auto px-4 py-5 md:px-6">
            <div className="mx-auto max-w-3xl space-y-3">
              {completedSteps.map((item) => (
                <StepTranscript
                  key={item}
                  step={item}
                  email={email}
                  nomeSalao={nomeSalao}
                  responsavel={responsavel}
                  whatsapp={whatsapp}
                  endereco={[endereco, numero, bairro, cidade, estado]
                    .filter(Boolean)
                    .join(" - ")}
                />
              ))}

              <CurrentStepMessages step={step} email={email} />

              {erro ? <AlertBubble tone="error">{erro}</AlertBubble> : null}
              {msg ? <AlertBubble tone="success">{msg}</AlertBubble> : null}

              {typing ? <TypingBubble /> : <CurrentStepForm />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );

  function CurrentStepForm() {
    if (step === "boas_vindas") {
      return (
        <ChatActions
          canBack={false}
          primaryLabel="Sim, vamos comecar"
          onBack={voltarPasso}
          onPrimary={irParaProximoPasso}
        />
      );
    }

    if (step === "conta") {
      return (
        <ChatFormCard>
          <Input
            label="E-mail de acesso"
            value={email}
            onChange={setEmail}
            type="email"
            placeholder="voce@seusalao.com"
          />
          <Input
            label="Senha"
            value={senha}
            onChange={setSenha}
            type="password"
            placeholder="Minimo de 6 caracteres"
          />
          <ChatActions
            canBack
            primaryLabel="Continuar"
            onBack={voltarPasso}
            onPrimary={irParaProximoPasso}
          />
        </ChatFormCard>
      );
    }

    if (step === "salao") {
      return (
        <ChatFormCard>
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="Nome do salao"
              value={nomeSalao}
              onChange={setNomeSalao}
              placeholder="Ex: Salao Bella"
            />
            <Input
              label="Responsavel"
              value={responsavel}
              onChange={setResponsavel}
              placeholder="Seu nome completo"
            />
            <div className="md:col-span-2">
              <Input
                label="WhatsApp do salao"
                value={whatsapp}
                onChange={(v) => setWhatsapp(maskPhone(v))}
                placeholder="(67) 99999-9999"
              />
            </div>
          </div>
          <ChatActions
            canBack
            primaryLabel="Proximo passo"
            onBack={voltarPasso}
            onPrimary={irParaProximoPasso}
          />
        </ChatFormCard>
      );
    }

    if (step === "endereco") {
      return (
        <ChatFormCard>
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="CEP"
              value={cep}
              onChange={(v) => setCep(maskCep(v))}
              onBlur={buscarCep}
              placeholder="00000-000"
            />
            <InfoMini
              text={buscandoCep ? "Buscando endereco..." : "Ao sair do CEP eu tento completar."}
            />
            <div className="md:col-span-2">
              <Input
                label="Endereco"
                value={endereco}
                onChange={setEndereco}
                placeholder="Rua / Avenida"
              />
            </div>
            <Input label="Numero" value={numero} onChange={setNumero} placeholder="Numero" />
            <Input
              label="Complemento"
              value={complemento}
              onChange={setComplemento}
              placeholder="Opcional"
            />
            <Input label="Bairro" value={bairro} onChange={setBairro} placeholder="Bairro" />
            <Input label="Cidade" value={cidade} onChange={setCidade} placeholder="Cidade" />
            <Input
              label="Estado"
              value={estado}
              onChange={(v) => setEstado(v.toUpperCase().slice(0, 2))}
              placeholder="UF"
            />
          </div>
          <ChatActions
            canBack
            primaryLabel="Revisar cadastro"
            onBack={voltarPasso}
            onPrimary={irParaProximoPasso}
          />
        </ChatFormCard>
      );
    }

    return (
      <ChatFormCard>
        <div className="grid gap-3 md:grid-cols-2">
          <SummaryCard label="E-mail" value={email || "-"} />
          <SummaryCard label="Salao" value={nomeSalao || "-"} />
          <SummaryCard label="Responsavel" value={responsavel || "-"} />
          <SummaryCard label="WhatsApp" value={whatsapp || "-"} />
          <SummaryCard
            label="Endereco"
            value={[endereco, numero, complemento, bairro, cidade, estado]
              .filter(Boolean)
              .join(" - ") || "-"}
          />
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Quando finalizar, sua conta sera criada e voce segue para o login do painel.
        </div>
        <ChatActions
          canBack
          primaryLabel={saving ? "Finalizando..." : "Cadastrar salao"}
          onBack={voltarPasso}
          onPrimary={handleFinish}
          disabled={saving}
        />
      </ChatFormCard>
    );
  }
}

function CurrentStepMessages({
  step,
  email,
}: {
  step: StepKey;
  email: string;
}) {
  if (step === "boas_vindas") {
    return (
      <>
        <AssistantBubble>Ola! Que bom ter voce aqui. Vamos comecar seu cadastro?</AssistantBubble>
        <AssistantBubble>
          Eu vou perguntar uma coisa por vez. Assim fica leve, rapido e sem tela cheia de campo.
        </AssistantBubble>
        <AssistantBubble>
          O plano voce escolhe depois, dentro do painel. Agora vamos criar seu salao primeiro.
        </AssistantBubble>
      </>
    );
  }

  if (step === "conta") {
    return (
      <>
        <AssistantBubble>Primeiro, digite o e-mail que voce quer usar para entrar no painel do salao.</AssistantBubble>
        <AssistantBubble>
          {email.trim()
            ? `Bem-vindo, ${email.trim()}. Agora vamos criar sua senha.`
            : "Depois do e-mail, eu peço a senha e seguimos para os dados do salao."}
        </AssistantBubble>
      </>
    );
  }

  if (step === "salao") {
    return (
      <>
        <AssistantBubble>Vi que voce ja deu o proximo passo. Agora vamos colocar seu salao no sistema.</AssistantBubble>
        <AssistantBubble>Digite o nome do salao, o responsavel e o WhatsApp principal.</AssistantBubble>
      </>
    );
  }

  if (step === "endereco") {
    return (
      <>
        <AssistantBubble>Voce esta fazendo a melhor escolha. Agora falta o endereco do salao.</AssistantBubble>
        <AssistantBubble>Digite o CEP. Quando sair do campo, eu tento completar rua, bairro, cidade e estado.</AssistantBubble>
      </>
    );
  }

  return (
    <>
      <AssistantBubble>Pronto, chegamos na revisao.</AssistantBubble>
      <AssistantBubble>Confere os dados abaixo. Se estiver tudo certo, eu crio o cadastro do salao para voce.</AssistantBubble>
    </>
  );
}

function StepTranscript({
  step,
  email,
  nomeSalao,
  responsavel,
  whatsapp,
  endereco,
}: {
  step: StepKey;
  email: string;
  nomeSalao: string;
  responsavel: string;
  whatsapp: string;
  endereco: string;
}) {
  if (step === "boas_vindas") {
    return (
      <>
        <AssistantBubble>Ola! Que bom ter voce aqui. Vamos comecar seu cadastro?</AssistantBubble>
        <UserBubble>Vamos sim.</UserBubble>
      </>
    );
  }

  if (step === "conta") {
    return (
      <>
        <AssistantBubble>Perfeito. Me passe seu e-mail de acesso e crie uma senha.</AssistantBubble>
        <UserBubble>
          E-mail: {email || "-"}
          <br />
          Senha criada com seguranca.
        </UserBubble>
      </>
    );
  }

  if (step === "salao") {
    return (
      <>
        <AssistantBubble>Agora me conte os dados principais do salao.</AssistantBubble>
        <UserBubble>
          Salao: {nomeSalao || "-"}
          <br />
          Responsavel: {responsavel || "-"}
          <br />
          WhatsApp: {whatsapp || "-"}
        </UserBubble>
      </>
    );
  }

  if (step === "endereco") {
    return (
      <>
        <AssistantBubble>Agora vamos deixar o endereco pronto.</AssistantBubble>
        <UserBubble>{endereco || "Endereco informado."}</UserBubble>
      </>
    );
  }

  return null;
}

function AssistantBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[86%] rounded-[20px] rounded-tl-md bg-white px-4 py-3 text-sm leading-6 text-zinc-900 shadow-sm ring-1 ring-black/5">
        {children}
        <div className="mt-1 text-right text-[10px] font-medium text-zinc-400">agora</div>
      </div>
    </div>
  );
}

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[86%] rounded-[20px] rounded-tr-md bg-[#d9fdd3] px-4 py-3 text-sm leading-6 text-zinc-900 shadow-sm ring-1 ring-emerald-900/5">
        {children}
        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] font-medium text-emerald-800/70">
          enviado <Check size={12} />
        </div>
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="inline-flex items-center gap-2 rounded-[20px] rounded-tl-md bg-white px-4 py-3 text-sm text-zinc-500 shadow-sm ring-1 ring-black/5">
        <span>digitando</span>
        <span className="flex gap-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:120ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:240ms]" />
        </span>
      </div>
    </div>
  );
}

function AlertBubble({
  tone,
  children,
}: {
  tone: "error" | "success";
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm ${
        tone === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      {children}
    </div>
  );
}

function ChatFormCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="ml-auto max-w-[92%] space-y-4 rounded-[22px] rounded-tr-md bg-white/95 p-4 shadow-sm ring-1 ring-black/5">
      {children}
    </div>
  );
}

function ChatActions({
  canBack,
  primaryLabel,
  onBack,
  onPrimary,
  disabled,
}: {
  canBack: boolean;
  primaryLabel: string;
  onBack: () => void;
  onPrimary: () => void | Promise<void>;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <button
        type="button"
        onClick={onBack}
        disabled={!canBack || disabled}
        className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ArrowLeft size={16} />
        Voltar
      </button>
      <button
        type="button"
        onClick={() => {
          void onPrimary();
        }}
        disabled={disabled}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 text-sm font-black text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {disabled ? <Loader2 size={16} className="animate-spin" /> : null}
        {primaryLabel}
      </button>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-2 text-sm font-bold text-zinc-900">{value}</p>
    </div>
  );
}

function InfoMini({ text }: { text: string }) {
  return (
    <div className="flex min-h-12 items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-600">
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
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-zinc-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className="min-h-12 w-full rounded-2xl border border-zinc-300 bg-white px-4 text-base text-zinc-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
      />
    </label>
  );
}
