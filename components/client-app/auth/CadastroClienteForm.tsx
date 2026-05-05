"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  cadastroClienteAction,
  type CadastroClienteState,
} from "@/app/app-cliente/cadastro/actions";

const initialState: CadastroClienteState = {
  error: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="h-12 w-full rounded-2xl bg-zinc-950 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Criando conta..." : "Criar conta"}
    </button>
  );
}

export default function CadastroClienteForm({
  salaoId,
  salaoNome,
}: {
  salaoId?: string | null;
  salaoNome?: string | null;
}) {
  const [state, formAction] = useActionState(
    cadastroClienteAction,
    initialState
  );

  return (
    <form
      action={formAction}
      className="overflow-hidden rounded-[1.9rem] border border-white/70 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)]"
    >
      {salaoId ? <input type="hidden" name="salao" value={salaoId} /> : null}

      <div className="mb-4 inline-flex rounded-full bg-zinc-100 p-1 text-xs font-bold text-zinc-600">
        <span className="rounded-full bg-zinc-950 px-3 py-1.5 text-white">
          Novo acesso
        </span>
        <span className="px-3 py-1.5">Cliente</span>
      </div>

      <h2 className="text-[1.55rem] font-semibold text-zinc-950">
        Crie sua conta no app cliente
      </h2>
      <p className="mt-2 text-sm leading-6 text-zinc-500">
        Seu cadastro fica ligado ao salao escolhido para facilitar agenda,
        historico e proximas visitas.
      </p>

      {salaoNome ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Sua conta sera criada para <strong>{salaoNome}</strong>.
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
          Escolha um salao antes do cadastro para aproveitar o acesso sem gerar
          duplicidade na base.
        </div>
      )}

      <div className="mt-5 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            Nome completo
          </label>
          <input
            name="nome"
            type="text"
            placeholder="Seu nome"
            className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-zinc-400"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            Telefone
          </label>
          <input
            name="telefone"
            type="tel"
            placeholder="(00) 00000-0000"
            className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-zinc-400"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            E-mail
          </label>
          <input
            name="email"
            type="email"
            placeholder="voce@exemplo.com"
            className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-zinc-400"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            Senha
          </label>
          <input
            name="senha"
            type="password"
            placeholder="Pelo menos 6 caracteres"
            className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-zinc-400"
          />
        </div>

        {state.error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        ) : null}

        <SubmitButton />

        <div className="space-y-2 pt-1 text-center">
          <Link
            href={salaoId ? `/app-cliente/login?salao=${salaoId}` : "/app-cliente/login"}
            className="block w-full text-sm font-medium text-zinc-700 underline underline-offset-4"
          >
            Ja tenho conta
          </Link>
          <Link
            href="/app-cliente/inicio"
            className="block w-full text-sm font-medium text-zinc-500 underline underline-offset-4"
          >
            Voltar para os saloes
          </Link>
        </div>
      </div>
    </form>
  );
}
