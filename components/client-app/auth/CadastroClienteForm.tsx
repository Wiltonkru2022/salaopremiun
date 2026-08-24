"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { cadastroClienteAction, type CadastroClienteState } from "@/app/app-cliente/cadastro/actions";

const initialState: CadastroClienteState = { error: null, existingProfileFound: false, existingProfileIdentity: null };
function onlyDigits(value: string) { return value.replace(/\D/g, ""); }
function maskCpf(value: string) { const d = onlyDigits(value).slice(0,11); return d.replace(/^(\d{3})(\d)/,"$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/,"$1.$2.$3").replace(/\.(\d{3})(\d)/,".$1-$2"); }
function maskDate(value: string) { const d = onlyDigits(value).slice(0,8); if (d.length <= 2) return d; if (d.length <= 4) return `${d.slice(0,2)}/${d.slice(2)}`; return `${d.slice(0,2)}/${d.slice(2,4)}/${d.slice(4)}`; }
function maskWhatsapp(value: string) { const d = onlyDigits(value).slice(0,11); if (d.length <= 2) return d ? `(${d}` : ""; if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`; if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`; return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`; }

function SubmitButton({ existingProfileFound }: { existingProfileFound?: boolean }) { const { pending } = useFormStatus(); return <button type="submit" disabled={pending} className="h-12 w-full rounded-2xl bg-zinc-950 text-sm font-black text-white transition disabled:opacity-60">{pending ? (existingProfileFound ? "Atualizando cadastro..." : "Criando conta...") : (existingProfileFound ? "Continuar e atualizar cadastro" : "Criar minha conta")}</button>; }

export default function CadastroClienteForm({ salaoId, salaoNome, next }: { salaoId?: string | null; salaoNome?: string | null; next?: string | null }) {
  const [state, formAction] = useActionState(cadastroClienteAction, initialState);
  const [cpf, setCpf] = useState("");
  const [birth, setBirth] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  return <form action={formAction} className="overflow-hidden rounded-[1.55rem] border border-zinc-100 bg-white p-5 shadow-[0_16px_38px_rgba(15,23,42,0.07)]">
    {salaoId ? <input type="hidden" name="salao" value={salaoId} /> : null}{next ? <input type="hidden" name="next" value={next} /> : null}
    {state.existingProfileFound && state.existingProfileIdentity ? <input type="hidden" name="confirm_existing_profile" value={state.existingProfileIdentity} /> : null}
    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-700">Cadastro único</div>
    <h2 className="mt-1 text-[1.5rem] font-black tracking-[-0.035em] text-zinc-950">Crie sua conta de cliente</h2>
    <p className="mt-2 text-sm leading-6 text-zinc-500">Você entra usando CPF + data de nascimento. O e-mail continua opcional.</p>
    {salaoNome ? <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Depois do cadastro, você volta para <strong>{salaoNome}</strong>.</div> : null}
    {state.existingProfileFound ? <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950"><strong>Encontramos um cadastro que pode ser seu.</strong><br />Seus dados já aparecem em um salão que usa o SalãoPremium. Ao continuar, vamos conectar sua nova conta a esse cadastro e atualizar seus dados, sem criar uma ficha duplicada.</div> : null}
    <div className="mt-5 space-y-4">
      <div><label className="mb-1.5 block text-sm font-bold text-zinc-700">Nome completo</label><input name="nome" type="text" autoComplete="name" placeholder="Seu nome completo" required className="h-12 w-full rounded-xl border border-zinc-200 px-4 text-base outline-none focus:border-amber-400" /></div>
      <div className="grid grid-cols-2 gap-3"><div><label className="mb-1.5 block text-sm font-bold text-zinc-700">Nascimento</label><input name="dataNascimento" value={birth} onChange={(e)=>setBirth(maskDate(e.target.value))} type="text" inputMode="numeric" autoComplete="bday" placeholder="DD/MM/AAAA" maxLength={10} required className="h-12 w-full rounded-xl border border-zinc-200 px-3 text-base outline-none focus:border-amber-400" /></div><div><label className="mb-1.5 block text-sm font-bold text-zinc-700">CPF</label><input name="cpf" value={cpf} onChange={(e)=>setCpf(maskCpf(e.target.value))} type="text" inputMode="numeric" placeholder="000.000.000-00" maxLength={14} required className="h-12 w-full rounded-xl border border-zinc-200 px-3 text-base outline-none focus:border-amber-400" /></div></div>
      <div><label className="mb-1.5 block text-sm font-bold text-zinc-700">WhatsApp</label><input name="whatsapp" value={whatsapp} onChange={(e)=>setWhatsapp(maskWhatsapp(e.target.value))} type="tel" autoComplete="tel" inputMode="tel" placeholder="(00) 00000-0000" required maxLength={15} className="h-12 w-full rounded-xl border border-zinc-200 px-4 text-base outline-none focus:border-amber-400" /></div>
      <div><label className="mb-1.5 block text-sm font-bold text-zinc-700">E-mail <span className="font-medium text-zinc-400">(opcional)</span></label><input name="email" type="email" autoComplete="email" inputMode="email" placeholder="voce@exemplo.com" className="h-12 w-full rounded-xl border border-zinc-200 px-4 text-base outline-none focus:border-amber-400" /></div>
      {state.error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div> : null}
      <SubmitButton existingProfileFound={state.existingProfileFound} />
      <div className="space-y-2 pt-1 text-center"><Link href={salaoId ? `/app-cliente/login?salao=${salaoId}${next ? `&next=${encodeURIComponent(next)}` : ""}` : next ? `/app-cliente/login?next=${encodeURIComponent(next)}` : "/app-cliente/login"} className="block text-sm font-bold text-zinc-700 underline underline-offset-4">Já tenho conta</Link><Link href="/app-cliente/explorar" className="block text-sm font-medium text-zinc-500 underline underline-offset-4">Voltar para os salões</Link></div>
    </div>
  </form>;
}
