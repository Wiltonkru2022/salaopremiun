"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { loginClienteAction, loginClienteLegacyAction, type LoginClienteState } from "@/app/app-cliente/login/actions";

const initialState: LoginClienteState = { error: null };
function digits(value: string) { return value.replace(/\D/g, ""); }
function maskCpf(value: string) { const d = digits(value).slice(0,11); return d.replace(/^(\d{3})(\d)/,"$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/,"$1.$2.$3").replace(/\.(\d{3})(\d)/,".$1-$2"); }
function maskDate(value: string) { const d = digits(value).slice(0,8); if (d.length <= 2) return d; if (d.length <= 4) return `${d.slice(0,2)}/${d.slice(2)}`; return `${d.slice(0,2)}/${d.slice(2,4)}/${d.slice(4)}`; }
function SubmitButton({ legacy = false }: { legacy?: boolean }) { const { pending } = useFormStatus(); return <button type="submit" disabled={pending} className="h-12 w-full rounded-2xl bg-zinc-950 text-sm font-black text-white transition disabled:opacity-60">{pending ? "Validando..." : legacy ? "Entrar com acesso antigo" : "Entrar"}</button>; }

export default function LoginClienteForm({ salaoId, salaoNome, oauthError, next }: { salaoId?: string | null; salaoNome?: string | null; oauthError?: string | null; next?: string | null }) {
  const [state, formAction] = useActionState(loginClienteAction, initialState);
  const [legacyState, legacyFormAction] = useActionState(loginClienteLegacyAction, initialState);
  const [cpf, setCpf] = useState("");
  const [birth, setBirth] = useState("");
  return <div className="space-y-3">
    <form action={formAction} className="overflow-hidden rounded-[1.55rem] border border-zinc-100 bg-white p-5 shadow-[0_16px_38px_rgba(15,23,42,0.07)]">
      {salaoId ? <input type="hidden" name="salao" value={salaoId} /> : null}{next ? <input type="hidden" name="next" value={next} /> : null}
      <div className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-700">Acesso da cliente</div>
      <h2 className="mt-1 text-[1.5rem] font-black tracking-[-0.035em] text-zinc-950">Entre no App Cliente</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-500">Use seu CPF e sua data de nascimento. Não é necessário lembrar uma senha.</p>
      {salaoNome ? <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Depois do login, você volta para <strong>{salaoNome}</strong>.</div> : null}
      <div className="mt-5 space-y-4"><div><label className="mb-1.5 block text-sm font-bold text-zinc-700">CPF</label><input name="cpf" value={cpf} onChange={(e)=>setCpf(maskCpf(e.target.value))} type="text" inputMode="numeric" placeholder="000.000.000-00" required maxLength={14} className="h-12 w-full rounded-xl border border-zinc-200 px-4 text-base outline-none focus:border-amber-400" /></div><div><label className="mb-1.5 block text-sm font-bold text-zinc-700">Data de nascimento</label><input name="dataNascimento" value={birth} onChange={(e)=>setBirth(maskDate(e.target.value))} type="text" inputMode="numeric" autoComplete="bday" placeholder="DD/MM/AAAA" required maxLength={10} className="h-12 w-full rounded-xl border border-zinc-200 px-4 text-base outline-none focus:border-amber-400" /></div>
        {oauthError ? <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{oauthError}</div> : null}{state.error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div> : null}<SubmitButton />
        <div className="grid grid-cols-2 gap-2 text-center text-sm"><Link href="/app-cliente/recuperar-acesso" className="rounded-xl bg-zinc-50 px-3 py-3 font-bold text-zinc-700">Problemas para acessar?</Link><Link href={salaoId ? `/app-cliente/cadastro?salao=${salaoId}${next ? `&next=${encodeURIComponent(next)}` : ""}` : next ? `/app-cliente/cadastro?next=${encodeURIComponent(next)}` : "/app-cliente/cadastro"} className="rounded-xl bg-amber-50 px-3 py-3 font-bold text-amber-800">Criar conta</Link></div>
      </div>
    </form>
    <details className="rounded-[1.35rem] border border-zinc-200 bg-zinc-50 p-4 text-zinc-700"><summary className="cursor-pointer text-sm font-black">Ainda uso o acesso antigo</summary><p className="mt-2 text-xs leading-5 text-zinc-500">Use esta opção somente para entrar e completar CPF e data de nascimento.</p><form action={legacyFormAction} className="mt-4 space-y-3">{salaoId ? <input type="hidden" name="salao" value={salaoId} /> : null}{next ? <input type="hidden" name="next" value={next} /> : null}<input name="identidade" type="text" placeholder="Telefone ou e-mail antigo" required className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none" /><input name="senha" type="password" placeholder="Senha antiga" required className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none" />{legacyState.error ? <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{legacyState.error}</div> : null}<SubmitButton legacy /></form></details>
  </div>;
}
