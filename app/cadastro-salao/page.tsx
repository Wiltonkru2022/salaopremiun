"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type StepKey = "dados" | "acesso" | "endereco" | "revisao";
const STEPS: Array<{ key: StepKey; label: string }> = [
  { key: "dados", label: "Dados" },
  { key: "acesso", label: "Acesso" },
  { key: "endereco", label: "Endereço" },
  { key: "revisao", label: "Revisão" },
];

function digits(value: string) {
  return value.replace(/\D/g, "");
}
function maskPhone(value: string) {
  const v = digits(value).slice(0, 11);
  if (v.length <= 2) return v;
  if (v.length <= 6) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
  if (v.length <= 10) return `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
  return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
}
function maskCep(value: string) {
  const v = digits(value).slice(0, 8);
  return v.length > 5 ? `${v.slice(0, 5)}-${v.slice(5)}` : v;
}
function maskDocumento(value: string) {
  const v = digits(value).slice(0, 14);
  if (v.length <= 11) {
    return v
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }
  return v
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export default function CadastroSalaoPage() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center bg-zinc-50"><Loader2 className="animate-spin" /></div>}>
      <CadastroSalao />
    </Suspense>
  );
}

function CadastroSalao() {
  const [step, setStep] = useState<StepKey>("dados");
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [aceite, setAceite] = useState(false);
  const [form, setForm] = useState({
    nomeSalao: "",
    responsavel: "",
    cpfCnpj: "",
    whatsapp: "",
    email: "",
    senha: "",
    cep: "",
    endereco: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
  });

  const index = STEPS.findIndex((item) => item.key === step);
  const progress = Math.round(((index + 1) / STEPS.length) * 100);
  const update = (key: keyof typeof form, value: string) => setForm((old) => ({ ...old, [key]: value }));

  function validarEtapa() {
    if (step === "dados") {
      if (!form.nomeSalao.trim() || !form.responsavel.trim() || digits(form.cpfCnpj).length < 11 || digits(form.whatsapp).length < 10) {
        return "Preencha nome do salão, responsável, CPF/CNPJ e WhatsApp.";
      }
    }
    if (step === "acesso") {
      if (!form.email.includes("@") || form.senha.length < 6) return "Informe um e-mail válido e uma senha com pelo menos 6 caracteres.";
    }
    if (step === "endereco") {
      if (digits(form.cep).length !== 8 || !form.endereco.trim() || !form.numero.trim() || !form.bairro.trim() || !form.cidade.trim() || form.estado.trim().length !== 2) {
        return "Complete o endereço do salão.";
      }
    }
    return "";
  }

  async function buscarCep() {
    if (digits(form.cep).length !== 8) return;
    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits(form.cep)}/json/`);
      const data = await response.json();
      if (!data?.erro) {
        setForm((old) => ({
          ...old,
          endereco: data.logradouro || old.endereco,
          bairro: data.bairro || old.bairro,
          cidade: data.localidade || old.cidade,
          estado: data.uf || old.estado,
        }));
      }
    } catch {
      // O cadastro continua permitindo preenchimento manual.
    }
  }

  async function avancar() {
    setErro("");
    const error = validarEtapa();
    if (error) return setErro(error);
    const next = STEPS[index + 1]?.key;
    if (next) setStep(next);
  }

  async function criarConta() {
    if (!aceite) return setErro("Aceite os Termos de Uso e a Política de Privacidade para continuar.");
    try {
      setSaving(true);
      setErro("");
      const response = await fetch("/api/cadastro-salao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, origem: "cadastro_salao" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || data.message || "Não foi possível criar o salão.");

      const supabase = createClient();
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: form.email.trim().toLowerCase(),
        password: form.senha,
      });
      if (loginError) {
        const params = new URLSearchParams({ email: form.email.trim(), criado: "1", returnTo: "/onboarding-salao" });
        window.location.assign(`https://login.salaopremiun.com.br/login?${params.toString()}`);
        return;
      }

      const host = window.location.hostname.endsWith("salaopremiun.com.br")
        ? "https://painel.salaopremiun.com.br/onboarding-salao"
        : "/onboarding-salao";
      window.location.assign(host);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao criar cadastro.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f7f9] px-4 py-6 text-zinc-950 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-zinc-600"><ArrowLeft size={16} /> Voltar</Link>
          <div className="flex items-center gap-2 font-black"><Sparkles size={18} /> SalãoPremium</div>
        </div>

        <section className="overflow-hidden rounded-[30px] border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 p-5 sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Crie sua conta</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Comece seu SalãoPremium</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-600">Depois desta etapa você configura perfil, serviços, profissionais, produtos, Pix e horários antes de liberar o painel.</p>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-zinc-100"><div className="h-full bg-zinc-950 transition-all" style={{ width: `${progress}%` }} /></div>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {STEPS.map((item, i) => <div key={item.key} className={`flex min-w-max items-center gap-2 rounded-full border px-3 py-2 text-xs font-black ${item.key === step ? "border-zinc-950 bg-zinc-950 text-white" : i < index ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-zinc-200 text-zinc-500"}`}>{i < index ? <Check size={13} /> : null}{item.label}</div>)}
            </div>
          </div>

          <div className="p-5 sm:p-7">
            {erro ? <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{erro}</div> : null}

            {step === "dados" ? <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome do salão" value={form.nomeSalao} onChange={(v) => update("nomeSalao", v)} />
              <Field label="Responsável" value={form.responsavel} onChange={(v) => update("responsavel", v)} />
              <Field label="CPF ou CNPJ" value={form.cpfCnpj} onChange={(v) => update("cpfCnpj", maskDocumento(v))} />
              <Field label="WhatsApp" value={form.whatsapp} onChange={(v) => update("whatsapp", maskPhone(v))} />
            </div> : null}

            {step === "acesso" ? <div className="grid gap-4 sm:grid-cols-2">
              <Field label="E-mail" type="email" value={form.email} onChange={(v) => update("email", v)} />
              <Field label="Senha" type="password" value={form.senha} onChange={(v) => update("senha", v)} />
            </div> : null}

            {step === "endereco" ? <div className="grid gap-4 sm:grid-cols-2">
              <div><Field label="CEP" value={form.cep} onChange={(v) => update("cep", maskCep(v))} /><button type="button" onClick={buscarCep} className="mt-2 text-xs font-black text-zinc-600 underline">Buscar CEP</button></div>
              <Field label="Endereço" value={form.endereco} onChange={(v) => update("endereco", v)} />
              <Field label="Número" value={form.numero} onChange={(v) => update("numero", v)} />
              <Field label="Complemento (opcional)" value={form.complemento} onChange={(v) => update("complemento", v)} />
              <Field label="Bairro" value={form.bairro} onChange={(v) => update("bairro", v)} />
              <Field label="Cidade" value={form.cidade} onChange={(v) => update("cidade", v)} />
              <Field label="UF" value={form.estado} onChange={(v) => update("estado", v.toUpperCase().slice(0, 2))} />
            </div> : null}

            {step === "revisao" ? <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Review label="Salão" value={form.nomeSalao} />
                <Review label="Responsável" value={form.responsavel} />
                <Review label="WhatsApp" value={form.whatsapp} />
                <Review label="E-mail" value={form.email} />
                <Review label="Endereço" value={`${form.endereco}, ${form.numero} — ${form.cidade}/${form.estado}`} />
              </div>
              <label className="flex items-start gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-700">
                <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} className="mt-1" />
                <span>Li e aceito os <Link href="/termos" className="font-bold underline">Termos de Uso</Link> e a <Link href="/privacidade" className="font-bold underline">Política de Privacidade</Link>.</span>
              </label>
            </div> : null}

            <div className="mt-8 flex flex-col-reverse justify-between gap-3 border-t border-zinc-100 pt-6 sm:flex-row">
              <button type="button" disabled={saving || index === 0} onClick={() => { setErro(""); setStep(STEPS[index - 1].key); }} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-zinc-200 px-5 text-sm font-black disabled:opacity-40"><ArrowLeft size={16} /> Voltar</button>
              {step === "revisao" ? <button type="button" onClick={criarConta} disabled={saving} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-6 text-sm font-black text-white disabled:opacity-60">{saving ? <Loader2 className="animate-spin" size={17} /> : <Sparkles size={17} />}{saving ? "Criando salão..." : "Criar e configurar meu salão"}</button> : <button type="button" onClick={avancar} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-6 text-sm font-black text-white">Continuar <ArrowRight size={16} /></button>}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="block"><span className="mb-2 block text-sm font-black text-zinc-800">{label}</span><input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-zinc-950" /></label>;
}
function Review({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"><p className="text-xs font-black uppercase tracking-wider text-zinc-400">{label}</p><p className="mt-1 text-sm font-bold text-zinc-800">{value || "—"}</p></div>;
}
