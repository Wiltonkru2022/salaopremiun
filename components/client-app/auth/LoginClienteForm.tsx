"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  loginClienteAction,
  loginClienteLegacyAction,
  type LoginClienteState,
} from "@/app/app-cliente/login/actions";

const initialState: LoginClienteState = { error: null };

function SubmitButton({ legacy = false }: { legacy?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-12 w-full rounded-2xl bg-zinc-950 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Validando..." : legacy ? "Entrar com acesso antigo" : "Entrar"}
    </button>
  );
}

export default function LoginClienteForm({
  salaoId,
  salaoNome,
  oauthError,
  next,
}: {
  salaoId?: string | null;
  salaoNome?: string | null;
  oauthError?: string | null;
  next?: string | null;
}) {
  const [state, formAction] = useActionState(loginClienteAction, initialState);
  const [legacyState, legacyFormAction] = useActionState(loginClienteLegacyAction, initialState);

  return (
    <div className="space-y-3">
      <form
        action={formAction}
        className="overflow-hidden rounded-[1.9rem] border border-white/70 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)]"
      >
        {salaoId ? <input type="hidden" name="salao" value={salaoId} /> : null}
        {next ? <input type="hidden" name="next" value={next} /> : null}

        <div className="mb-4 inline-flex rounded-full bg-zinc-100 p-1 text-xs font-bold text-zinc-600">
          <span className="rounded-full bg-zinc-950 px-3 py-1.5 text-white">Novo acesso</span>
          <span className="px-3 py-1.5">CPF + nascimento</span>
        </div>

        <h2 className="text-[1.55rem] font-semibold text-zinc-950">Entre no App Cliente</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Use seu CPF e sua data de nascimento. A mesma conta funciona nos salões publicados no SalãoPremium.
        </p>

        {salaoNome ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Depois do login, você volta para <strong>{salaoNome}</strong>.
          </div>
        ) : null}

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">CPF</label>
            <input
              name="cpf"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="000.000.000-00"
              required
              maxLength={14}
              className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-base outline-none transition focus:border-zinc-400"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Data de nascimento</label>
            <input
              name="dataNascimento"
              type="text"
              inputMode="numeric"
              autoComplete="bday"
              placeholder="DD/MM/AAAA"
              required
              maxLength={10}
              className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-base outline-none transition focus:border-zinc-400"
            />
          </div>

          {oauthError ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{oauthError}</div>
          ) : null}
          {state.error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div>
          ) : null}

          <SubmitButton />
          <div className="space-y-2 pt-1 text-center">
            <Link href="/app-cliente/recuperar-acesso" className="block text-sm font-medium text-zinc-700 underline underline-offset-4">
              Problemas para acessar?
            </Link>
            <Link
              href={
                salaoId
                  ? `/app-cliente/cadastro?salao=${salaoId}${next ? `&next=${encodeURIComponent(next)}` : ""}`
                  : next
                    ? `/app-cliente/cadastro?next=${encodeURIComponent(next)}`
                    : "/app-cliente/cadastro"
              }
              className="block text-sm font-medium text-zinc-700 underline underline-offset-4"
            >
              Criar conta
            </Link>
          </div>
        </div>
      </form>

      <details className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-4 text-zinc-700">
        <summary className="cursor-pointer text-sm font-bold">Minha conta ainda usa o acesso antigo</summary>
        <p className="mt-2 text-xs leading-5 text-zinc-500">
          Use esta opção somente para entrar uma última vez e completar CPF e data de nascimento.
        </p>
        <form action={legacyFormAction} className="mt-4 space-y-3">
          {salaoId ? <input type="hidden" name="salao" value={salaoId} /> : null}
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <input
            name="identidade"
            type="text"
            placeholder="Telefone ou e-mail antigo"
            required
            className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none"
          />
          <input
            name="senha"
            type="password"
            placeholder="Senha antiga"
            required
            className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none"
          />
          {legacyState.error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{legacyState.error}</div>
          ) : null}
          <SubmitButton legacy />
        </form>
      </details>
    </div>
  );
}
