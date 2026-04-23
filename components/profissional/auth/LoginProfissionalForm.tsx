"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  loginProfissionalAction,
  type LoginProfissionalState,
} from "@/app/app-profissional/login/actions";

const initialState: LoginProfissionalState = {
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
      {pending ? "Entrando..." : "Entrar"}
    </button>
  );
}

function formatCpf(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export default function LoginProfissionalForm() {
  const [state, formAction] = useActionState(
    loginProfissionalAction,
    initialState
  );
  const [cpf, setCpf] = useState("");
  const cpfFormatado = useMemo(() => cpf, [cpf]);

  return (
    <form
      action={formAction}
      className="overflow-hidden rounded-[1.9rem] border border-white/70 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)]"
    >
      <div className="mb-4 inline-flex rounded-full bg-zinc-100 p-1 text-xs font-bold text-zinc-600">
        <span className="rounded-full bg-zinc-950 px-3 py-1.5 text-white">
          CPF e senha
        </span>
        <span className="px-3 py-1.5">Google</span>
      </div>

      <h2 className="text-[1.55rem] font-semibold text-zinc-950">
        Acesse sua conta
      </h2>
      <p className="mt-2 text-sm leading-6 text-zinc-500">
        Login rapido para abrir agenda, comandas e clientes direto no celular.
      </p>

      <div className="mt-5 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            CPF
          </label>

          <input
            name="cpf"
            type="text"
            inputMode="numeric"
            placeholder="000.000.000-00"
            value={cpfFormatado}
            onChange={(event) => setCpf(formatCpf(event.target.value))}
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
            placeholder="Digite sua senha"
            className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-zinc-400"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-600">
          <input type="checkbox" className="rounded border-zinc-300" />
          Lembrar meu acesso
        </label>

        {state.error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        ) : null}

        <SubmitButton />

        <button
          type="button"
          onClick={() =>
            alert(
              "Login Google para profissionais precisa de configuracao OAuth e vinculo da conta no painel. A interface ja esta preparada."
            )
          }
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white text-sm font-semibold text-zinc-700"
        >
          G
          Entrar com Google
        </button>

        <Link
          href="/app-profissional/recuperar-senha"
          className="block w-full text-center text-sm font-medium text-zinc-600 underline underline-offset-4"
        >
          Esqueceu sua senha?
        </Link>

        <div className="pt-2 text-center text-xs text-zinc-400">
          Versao 1.0.0
        </div>
      </div>
    </form>
  );
}
