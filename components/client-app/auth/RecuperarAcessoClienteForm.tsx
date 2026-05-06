"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  recoverClienteAccessAction,
  type RecoverClienteAccessState,
} from "@/app/app-cliente/recuperar-acesso/actions";

const initialState: RecoverClienteAccessState = {
  error: null,
  success: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="h-12 w-full rounded-2xl bg-zinc-950 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Atualizando acesso..." : "Recuperar acesso"}
    </button>
  );
}

export default function RecuperarAcessoClienteForm() {
  const [state, formAction] = useActionState(
    recoverClienteAccessAction,
    initialState
  );

  return (
    <form
      action={formAction}
      className="overflow-hidden rounded-[1.9rem] border border-white/70 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)]"
    >
      <div className="mb-4 inline-flex rounded-full bg-zinc-100 p-1 text-xs font-bold text-zinc-600">
        <span className="rounded-full bg-zinc-950 px-3 py-1.5 text-white">
          Recuperacao
        </span>
        <span className="px-3 py-1.5">Cliente</span>
      </div>

      <h2 className="text-[1.55rem] font-semibold text-zinc-950">
        Recuperar acesso
      </h2>
      <p className="mt-2 text-sm leading-6 text-zinc-500">
        Confirme e-mail e telefone da conta global, depois escolha uma senha
        nova. Isso atualiza tambem seus vinculos antigos com os saloes.
      </p>

      <div className="mt-5 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            E-mail da conta
          </label>
          <input
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="voce@exemplo.com"
            className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-base outline-none transition focus:border-zinc-400"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            Telefone cadastrado
          </label>
          <input
            name="telefone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder="(00) 00000-0000"
            className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-base outline-none transition focus:border-zinc-400"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            Nova senha
          </label>
          <input
            name="senha"
            type="password"
            autoComplete="new-password"
            placeholder="Pelo menos 6 caracteres"
            className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-base outline-none transition focus:border-zinc-400"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            Confirmar nova senha
          </label>
          <input
            name="confirmacao"
            type="password"
            autoComplete="new-password"
            placeholder="Repita a nova senha"
            className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-base outline-none transition focus:border-zinc-400"
          />
        </div>

        {state.success ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {state.success}
          </div>
        ) : null}

        {state.error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        ) : null}

        <SubmitButton />

        <div className="space-y-2 pt-1 text-center">
          <Link
            href="/app-cliente/login"
            className="block w-full text-sm font-medium text-zinc-700 underline underline-offset-4"
          >
            Voltar para o login
          </Link>
        </div>
      </div>
    </form>
  );
}
