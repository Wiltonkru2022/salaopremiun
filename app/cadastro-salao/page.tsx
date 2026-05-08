"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  FileText,
  Loader2,
  LockKeyhole,
  Monitor,
  Sparkles,
  Smartphone,
  X,
} from "lucide-react";
import { getErrorMessage } from "@/lib/get-error-message";
import { createClient } from "@/lib/supabase/client";

type StepKey = "dados" | "acesso" | "endereco" | "resumo";

const STEPS: StepKey[] = ["dados", "acesso", "endereco", "resumo"];
const CREATION_STEPS = [
  "Seja bem-vindo ao SalãoPremium",
  "Estamos criando seu acesso",
  "Estamos criando seu ambiente",
  "Criando seu usuário principal",
  "Criando o perfil do seu salão",
  "Organizando agenda, caixa e clientes",
  "Por favor, aguarde...",
];
const CREATION_TYPING_DELAY_MS = 58;
const CREATION_FIRST_STEP_PAUSE_MS = 1200;
const CREATION_STEP_PAUSE_MS = 900;

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

function getDashboardRedirectHref() {
  if (typeof window === "undefined") return "/dashboard?boot=1";

  const isManagedHost = window.location.hostname.endsWith("salaopremiun.com.br");
  if (!isManagedHost) return "/dashboard?boot=1";

  return "https://painel.salaopremiun.com.br/dashboard?boot=1&novo=1";
}

function getStepTitle(step: StepKey) {
  switch (step) {
    case "dados":
      return "Dados iniciais";
    case "acesso":
      return "Acesso";
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
        <div className="flex min-h-screen items-center justify-center bg-white">
          <Loader2 className="animate-spin text-zinc-500" size={24} />
        </div>
      }
    >
      <CadastroSalaoContent />
    </Suspense>
  );
}

function CadastroSalaoContent() {
  const [step, setStep] = useState<StepKey>("dados");
  const [legalModal, setLegalModal] = useState<"termos" | "privacidade" | null>(
    null
  );
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [checking, setChecking] = useState(false);
  const [aceiteTermos, setAceiteTermos] = useState(false);
  const [creatingExperience, setCreatingExperience] = useState(false);
  const [creationStepIndex, setCreationStepIndex] = useState(0);
  const [typedCreationText, setTypedCreationText] = useState("");
  const [mobileCreationBlocked, setMobileCreationBlocked] = useState(false);

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
  const progresso = Math.round(((currentStepIndex + 1) / STEPS.length) * 100);

  useEffect(() => {
    try {
      const supabase = createClient();
      supabase.auth
        .getSession()
        .then(({ data }) => {
          if (data.session?.user) {
            window.location.replace(getDashboardRedirectHref());
          }
        })
        .catch(() => undefined);
    } catch {
      // Se o Supabase nao estiver pronto no navegador, o cadastro segue normal.
    }
  }, []);

  useEffect(() => {
    if (!creatingExperience) return;

    let cancelled = false;
    const timers: number[] = [];

    function wait(ms: number) {
      return new Promise<void>((resolve) => {
        const timer = window.setTimeout(resolve, ms);
        timers.push(timer);
      });
    }

    async function typeStep(text: string, index: number) {
      setCreationStepIndex(index);
      setTypedCreationText("");

      for (let i = 1; i <= text.length; i += 1) {
        if (cancelled) return;
        setTypedCreationText(text.slice(0, i));
        await wait(CREATION_TYPING_DELAY_MS);
      }

      await wait(index === 0 ? CREATION_FIRST_STEP_PAUSE_MS : CREATION_STEP_PAUSE_MS);
    }

    async function finalizeCadastro() {
      const isMobileDevice =
        window.matchMedia("(max-width: 1023px)").matches ||
        (window.matchMedia("(pointer: coarse)").matches && window.screen.width < 1100);

      if (isMobileDevice) {
        setMobileCreationBlocked(true);
        setSaving(false);
        return;
      }

      try {
        const supabase = createClient();
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: senha.trim(),
        });

        if (loginError) throw loginError;

        window.location.assign(getDashboardRedirectHref());
      } catch {
        const params = new URLSearchParams({ email: email.trim(), criado: "1" });
        window.location.assign(getLoginRedirectHref(params));
      }
    }

    async function run() {
      for (let index = 0; index < CREATION_STEPS.length; index += 1) {
        await typeStep(CREATION_STEPS[index], index);
        if (cancelled) return;
      }

      await finalizeCadastro();
    }

    void run();

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [creatingExperience, email, senha]);

  async function verificarDadosExistentes(fields: {
    email?: string;
    nomeSalao?: string;
    whatsapp?: string;
  }) {
    const hasValue = Object.values(fields).some((value) => String(value || "").trim());
    if (!hasValue) return true;

    setChecking(true);
    try {
      const response = await fetch("/api/cadastro-salao/verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const data = await response.json();
      const exists = data?.exists || {};

      if (fields.email && exists.email) {
        setErro("Esse e-mail já está cadastrado. Use outro e-mail ou entre no login.");
        return false;
      }
      if (fields.nomeSalao && exists.nomeSalao) {
        setErro("Já existe um salão com esse nome. Ajuste o nome para continuar.");
        return false;
      }
      if (fields.whatsapp && exists.whatsapp) {
        setErro("Esse WhatsApp já aparece em outro cadastro de salão.");
        return false;
      }

      return true;
    } catch {
      return true;
    } finally {
      setChecking(false);
    }
  }

  async function validarStepAtual() {
    setErro("");

    if (step === "dados") {
      if (!responsavel.trim()) return setErro("Informe seu nome completo."), false;
      if (!whatsapp.trim()) return setErro("Informe seu celular ou WhatsApp."), false;
      if (!email.trim()) return setErro("Informe o e-mail."), false;
      if (!nomeSalao.trim()) return setErro("Informe o nome do negocio."), false;
      if (!aceiteTermos) {
        return setErro("Aceite os termos de uso e a politica de privacidade para continuar."), false;
      }
      return verificarDadosExistentes({ email, nomeSalao, whatsapp });
    }

    if (step === "acesso") {
      if (!senha.trim()) return setErro("Informe a senha."), false;
      if (senha.trim().length < 6) {
        return setErro("A senha deve ter pelo menos 6 caracteres."), false;
      }
    }

    if (step === "endereco") {
      if (!cep.trim()) return setErro("Informe o CEP."), false;
      if (!endereco.trim()) return setErro("Informe o endereço."), false;
      if (!bairro.trim()) return setErro("Informe o bairro."), false;
      if (!cidade.trim()) return setErro("Informe a cidade."), false;
      if (!estado.trim()) return setErro("Informe o estado."), false;
    }

    return true;
  }

  async function irParaProximoPasso() {
    if (!(await validarStepAtual())) return;

    const next = STEPS[currentStepIndex + 1];
    if (!next) return;
    setStep(next);
  }

  function voltarPasso() {
    const prev = STEPS[currentStepIndex - 1];
    if (!prev || saving) return;
    setErro("");
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

      if (data.erro) throw new Error("CEP não encontrado.");

      setEndereco(data.logradouro || "");
      setBairro(data.bairro || "");
      setCidade(data.localidade || "");
      setEstado((data.uf || "").toUpperCase());
    } catch (e: unknown) {
      const message = getErrorMessage(e, "Erro ao buscar CEP.");
      setErro(
        message === "Failed to fetch"
          ? "Não foi possível buscar o CEP automaticamente. Preencha manualmente."
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
          origem: "cadastro_publico_site",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao cadastrar salão.");

      setMsg("");
      setCreatingExperience(true);
    } catch (e: unknown) {
      setErro(getErrorMessage(e, "Erro ao cadastrar salão."));
    } finally {
      if (!creatingExperience) {
        setSaving(false);
      }
    }
  }

  if (creatingExperience) {
    return (
      <CadastroCreationExperience
        typedText={typedCreationText}
        stepIndex={creationStepIndex}
        totalSteps={CREATION_STEPS.length}
        mobileBlocked={mobileCreationBlocked}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <header className="flex h-[74px] items-center justify-between border-b border-zinc-200 bg-white px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-950 text-[var(--app-accent)]">
            <Sparkles size={18} />
          </span>
          <span className="font-display text-lg font-black tracking-[-0.03em]">
            SalaoPremium
          </span>
        </Link>

        <Link
          href="/login"
          className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-black text-zinc-800 transition hover:border-zinc-950"
        >
          Entrar
        </Link>
      </header>

      <main className="grid min-h-[calc(100vh-74px)] lg:grid-cols-2">
        <section
          className="relative hidden overflow-hidden bg-zinc-950 bg-cover bg-center lg:block"
          style={{ backgroundImage: "url('/site/cadastro-salão-bg.jpeg')" }}
        >
          <div className="absolute inset-0 bg-zinc-950/58" />
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-950/55 to-transparent" />

          <div className="relative flex h-full flex-col justify-between p-10 text-white xl:p-14">
            <div className="max-w-lg">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-white/75">
                Gestao para beleza
              </div>
              <h1 className="mt-7 font-display text-[3.2rem] font-black leading-[0.95] tracking-[-0.05em] xl:text-[4.2rem]">
                Tudo para o seu salão crescer em um só lugar.
              </h1>
              <p className="mt-5 max-w-md text-base leading-7 text-white/78">
                Agenda, clientes, equipe, caixa e app cliente com uma experiência
                premium para sua operação.
              </p>
            </div>

            <div className="grid max-w-xl gap-3 sm:grid-cols-3">
              <HeroBadge label="Agenda online" />
              <HeroBadge label="App cliente" />
              <HeroBadge label="Controle financeiro" />
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-8 sm:px-8 lg:px-10">
          <div className="w-full max-w-[430px]">
            <div className="mb-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-3xl font-black tracking-[-0.04em] text-zinc-950">
                    Cadastre seu negocio
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-zinc-500">
                    {getStepTitle(step)} - etapa {currentStepIndex + 1} de {STEPS.length}
                  </p>
                </div>
                <span className="rounded-full bg-zinc-950 px-3 py-1.5 text-xs font-black text-white">
                  {progresso}%
                </span>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-[var(--app-accent)] transition-all"
                  style={{ width: `${progresso}%` }}
                />
              </div>
            </div>

            {erro ? <Alert tone="error">{erro}</Alert> : null}
            {msg ? <Alert tone="success">{msg}</Alert> : null}

            <div className="mt-5">{renderCurrentStepForm()}</div>
          </div>
        </section>
      </main>
      {legalModal ? (
        <LegalPreviewModal
          type={legalModal}
          onClose={() => setLegalModal(null)}
        />
      ) : null}
    </div>
  );

  function renderCurrentStepForm() {
    if (step === "dados") {
      return (
        <FormPanel>
          <Input
            autoFocus
            label="Nome completo"
            value={responsavel}
            onChange={(value) => {
              setResponsavel(value);
              if (erro) setErro("");
            }}
            placeholder="Seu nome"
          />
          <Input
            label="Celular"
            value={whatsapp}
            onChange={(value) => {
              setWhatsapp(maskPhone(value));
              if (erro) setErro("");
            }}
            placeholder="(67) 99999-9999"
          />
          <Input
            label="E-mail"
            value={email}
            onChange={(value) => {
              setEmail(value);
              if (erro) setErro("");
            }}
            type="email"
            placeholder="voce@seusalao.com"
          />
          <Input
            label="Nome do negocio"
            value={nomeSalao}
            onChange={(value) => {
              setNomeSalao(value);
              if (erro) setErro("");
            }}
            placeholder="Ex: Studio Mão de Fadas"
          />

          <label className="flex items-start gap-3 text-sm leading-6 text-zinc-600">
            <input
              type="checkbox"
              checked={aceiteTermos}
              onChange={(event) => setAceiteTermos(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-zinc-300 text-zinc-950"
            />
            <span>
              Li e aceito os{" "}
              <button
                type="button"
                onClick={() => setLegalModal("termos")}
                className="font-bold text-zinc-950 underline"
              >
                termos de uso
              </button>{" "}
              e a{" "}
              <button
                type="button"
                onClick={() => setLegalModal("privacidade")}
                className="font-bold text-zinc-950 underline"
              >
                politica de privacidade
              </button>
              .
            </span>
          </label>

          <FormActions
            canBack={false}
            primaryLabel={checking ? "Verificando..." : "Continuar cadastro"}
            onBack={voltarPasso}
            onPrimary={irParaProximoPasso}
            disabled={checking}
          />

          <p className="text-center text-xs text-zinc-500">
            Já faz parte do SalãoPremium?{" "}
            <Link href="/login" className="font-black text-zinc-950 underline">
              Acesse sua conta
            </Link>
          </p>
        </FormPanel>
      );
    }

    if (step === "acesso") {
      return (
        <FormPanel>
          <div className="rounded-[22px] border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white">
                <LockKeyhole size={18} />
              </div>
              <div>
                <h3 className="font-black text-zinc-950">Crie sua senha</h3>
                <p className="text-sm text-zinc-500">Ela será usada no login do painel.</p>
              </div>
            </div>
          </div>
          <Input
            autoFocus
            label="Senha"
            value={senha}
            onChange={setSenha}
            type="password"
            placeholder="Mínimo de 6 caracteres"
          />
          <FormActions
            canBack
            primaryLabel="Continuar"
            onBack={voltarPasso}
            onPrimary={irParaProximoPasso}
          />
        </FormPanel>
      );
    }

    if (step === "endereco") {
      return (
        <FormPanel>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              autoFocus
              label="CEP"
              value={cep}
              onChange={(value) => setCep(maskCep(value))}
              onBlur={buscarCep}
              placeholder="00000-000"
            />
            <div className="flex min-h-[74px] items-end">
              <div className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-600">
                {buscandoCep ? "Buscando endereço..." : "Preencha pelo CEP ou manualmente."}
              </div>
            </div>
            <div className="sm:col-span-2">
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
              onChange={(value) => setEstado(value.toUpperCase().slice(0, 2))}
              placeholder="UF"
            />
          </div>
          <FormActions
            canBack
            primaryLabel="Revisar cadastro"
            onBack={voltarPasso}
            onPrimary={irParaProximoPasso}
          />
        </FormPanel>
      );
    }

    return (
      <FormPanel>
        <div className="grid gap-3">
          <SummaryCard label="Responsavel" value={responsavel || "-"} />
          <SummaryCard label="E-mail" value={email || "-"} />
          <SummaryCard label="Negocio" value={nomeSalao || "-"} />
          <SummaryCard label="WhatsApp" value={whatsapp || "-"} />
          <SummaryCard
            label="Endereco"
            value={[endereco, numero, complemento, bairro, cidade, estado]
              .filter(Boolean)
              .join(" - ") || "-"}
          />
        </div>
        <FormActions
          canBack
          primaryLabel={saving ? "Cadastrando..." : "Cadastrar negocio"}
          onBack={voltarPasso}
          onPrimary={handleFinish}
          disabled={saving}
        />
      </FormPanel>
    );
  }
}

function CadastroCreationExperience({
  mobileBlocked,
  typedText,
  stepIndex,
  totalSteps,
}: {
  mobileBlocked: boolean;
  typedText: string;
  stepIndex: number;
  totalSteps: number;
}) {
  const progress = Math.min(
    100,
    Math.round(((stepIndex + 1) / totalSteps) * 100)
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-5 text-zinc-950">
      <div className="w-full max-w-[520px] text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] border border-zinc-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
          <Image
            src="/favicon-preview.png"
            alt="SalaoPremium"
            width={64}
            height={64}
            className="h-16 w-16 rounded-[1.35rem]"
          />
        </div>

        <div className="mt-8 min-h-[118px]">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">
            {mobileBlocked ? "Acesso criado" : "Cadastro aprovado"}
          </p>
          <h1 className="mt-3 font-display text-[2.25rem] font-black leading-tight tracking-[-0.05em] text-zinc-950 sm:text-[3rem]">
            {mobileBlocked
              ? "Tudo pronto, mas o painel e para computador"
              : typedText}
            {!mobileBlocked ? (
              <span className="ml-1 inline-block h-8 w-[3px] translate-y-1 animate-pulse rounded-full bg-[var(--app-accent)]" />
            ) : null}
          </h1>
        </div>

        <div className="mx-auto mt-4 max-w-sm rounded-[1.6rem] border border-zinc-200 bg-zinc-50 p-4">
          {mobileBlocked ? (
            <div className="space-y-4 text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-amber-800">
                <Smartphone size={14} />
                Celular detectado
              </div>
              <p className="text-sm leading-6 text-zinc-700">
                Seu salão foi criado e o teste grátis já está ativo. Só temos um
                ponto importante: o painel do salão foi feito para PC ou
                notebook, porque Agenda e Caixa precisam de tela grande.
              </p>
              <div className="rounded-[22px] border border-zinc-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <Monitor size={20} className="mt-0.5 shrink-0 text-zinc-950" />
                  <div>
                    <div className="text-sm font-black text-zinc-950">
                      Abra no computador
                    </div>
                    <p className="mt-1 text-xs leading-5 text-zinc-600">
                      Entre pelo PC com o mesmo e-mail e senha. Depois do login,
                      o sistema mostra a instalacao do Dashboard, Agenda e Caixa.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                <span>Preparando sistema</span>
                <span>{progress}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-[var(--app-accent)] transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </>
          )}
        </div>

        {!mobileBlocked ? (
          <div className="mt-7 flex items-center justify-center gap-2 text-sm font-semibold text-zinc-500">
            <Loader2 size={16} className="animate-spin" />
            Tudo pronto em alguns segundos. Não feche esta tela.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function HeroBadge({ label }: { label: string }) {
  return (
    <div className="rounded-[20px] border border-white/15 bg-white/10 px-4 py-3 text-sm font-black text-white backdrop-blur">
      {label}
    </div>
  );
}

function LegalPreviewModal({
  type,
  onClose,
}: {
  type: "termos" | "privacidade";
  onClose: () => void;
}) {
  const isTerms = type === "termos";
  const fullHref = isTerms
    ? "https://salaopremiun.com.br/termos-de-uso"
    : "https://salaopremiun.com.br/politica-de-privacidade";
  const title = isTerms ? "Termos de Uso" : "Política de Privacidade";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/65 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[88vh] w-full max-w-2xl overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-950 text-[var(--app-accent)]">
              <FileText size={18} />
            </div>
            <div>
              <h2 className="font-display text-xl font-black text-zinc-950">
                {title}
              </h2>
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                Resumo para conferência rápida antes de continuar o cadastro.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 text-zinc-600 transition hover:bg-zinc-50"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="scroll-premium max-h-[58vh] overflow-y-auto p-5 text-sm leading-7 text-zinc-700">
          {isTerms ? <TermsSummary /> : <PrivacySummary />}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 bg-zinc-50 p-5">
          <a
            href={fullHref}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-black text-zinc-950 underline"
          >
            Abrir documento completo
          </a>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-black text-white transition hover:bg-zinc-800"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}

function TermsSummary() {
  return (
    <div className="space-y-4">
      <p>
        Ao criar uma conta, você concorda em utilizar o SalãoPremium de forma
        lícita, manter dados corretos e proteger suas credenciais de acesso.
      </p>
      <ul className="list-disc space-y-2 pl-5">
        <li>O salão é responsável pelos dados de clientes, serviços, equipe e agenda.</li>
        <li>Recursos podem variar conforme plano contratado, pagamento e regras comerciais.</li>
        <li>É proibido compartilhar senha, praticar fraude, inserir dados indevidos ou comprometer a segurança da plataforma.</li>
        <li>Agenda, notificações, app cliente e integrações dependem de configurações, permissões e disponibilidade técnica.</li>
      </ul>
      <p>
        O documento completo está disponível em https://salaopremiun.com.br/termos-de-uso.
      </p>
    </div>
  );
}

function PrivacySummary() {
  return (
    <div className="space-y-4">
      <p>
        O SalãoPremium trata dados pessoais para criar contas, autenticar
        usuários, operar agenda, clientes, equipe, vendas, notificações, suporte
        e segurança.
      </p>
      <ul className="list-disc space-y-2 pl-5">
        <li>Podemos tratar dados cadastrais, dados de acesso, registros técnicos e dados operacionais do salão.</li>
        <li>Não vendemos dados pessoais.</li>
        <li>Dados podem ser compartilhados com provedores essenciais para hospedagem, autenticação, notificações, pagamentos e suporte.</li>
        <li>O titular pode solicitar acesso, correção, informações e demais direitos previstos na LGPD.</li>
      </ul>
      <p>
        O documento completo está disponível em https://salaopremiun.com.br/politica-de-privacidade.
      </p>
    </div>
  );
}

function FormPanel({ children }: { children: React.ReactNode }) {
  return <div className="space-y-5">{children}</div>;
}

function FormActions({
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
    <div className="flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={onBack}
        disabled={!canBack || disabled}
        className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-black text-zinc-700 transition hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-40"
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
        className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-black text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {disabled ? <Loader2 size={16} className="animate-spin" /> : null}
        {primaryLabel}
        {!disabled ? <ChevronRight size={16} /> : null}
      </button>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">{label}</p>
      <p className="mt-1.5 text-sm font-black text-zinc-900">{value}</p>
    </div>
  );
}

function Alert({
  tone,
  children,
}: {
  tone: "error" | "success";
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
        tone === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-800"
      }`}
    >
      {children}
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
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  onBlur?: () => void;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-zinc-800">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="min-h-12 w-full rounded-xl border border-zinc-300 bg-white px-4 text-base text-zinc-950 outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-[rgba(199,162,92,0.20)]"
      />
    </label>
  );
}
