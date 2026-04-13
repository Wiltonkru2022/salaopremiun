"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { loginProfissionalAction, type LoginProfissionalState } from "@/app/app-profissional/login/actions";

const initialState: LoginProfissionalState = {
  error: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="h-12 w-full rounded-2xl bg-gradient-to-r from-yellow-600 to-yellow-400 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Entrando..." : "Entrar"}
    </button>
  );
}

export default function LoginProfissionalForm() {
  const [state, formAction] = useActionState(loginProfissionalAction, initialState);
  const [cpf, setCpf] = useState("");

  const cpfFormatado = useMemo(() => cpf, [cpf]);

  function formatCpf(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 11);

    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }

  return (
    <form
      action={formAction}
      className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm"
    >
      <h2 className="text-[1.55rem] font-semibold text-zinc-950">
        Acesse sua conta
      </h2>

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
            onChange={(e) => setCpf(formatCpf(e.target.value))}
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
          className="w-full text-center text-sm font-medium text-zinc-600 underline underline-offset-4"
        >
          Esqueceu sua senha?
        </button>

        <div className="pt-2 text-center text-xs text-zinc-400">
          Versão 1.0.0
        </div>
      </div>
    </form>
  );
}