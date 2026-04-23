"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  solicitarRecuperacaoSenhaProfissionalAction,
  type RecuperarSenhaProfissionalState,
} from "@/app/app-profissional/recuperar-senha/actions";

const initialState: RecuperarSenhaProfissionalState = {
  ok: false,
  message: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="h-12 w-full rounded-2xl bg-zinc-950 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Enviando..." : "Solicitar redefinicao"}
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

export default function RecuperarSenhaProfissionalForm() {
  const [state, formAction] = useActionState(
    solicitarRecuperacaoSenhaProfissionalAction,
    initialState
  );
  const [cpf, setCpf] = useState("");

  return (
    <form
      action={formAction}
      className="rounded-[1.9rem] border border-white/70 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)]"
    >
      <h2 className="text-[1.45rem] font-semibold text-zinc-950">
        Esqueceu sua senha?
      </h2>
      <p className="mt-2 text-sm leading-6 text-zinc-500">
        Informe seu CPF. O sistema abre um pedido seguro para o salao redefinir
        seu acesso.
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
            value={cpf}
            onChange={(event) => setCpf(formatCpf(event.target.value))}
            className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-zinc-400"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            Telefone ou e-mail para contato
          </label>
          <input
            name="contato"
            type="text"
            placeholder="Opcional"
            className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-zinc-400"
          />
        </div>

        {state.message ? (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              state.ok
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {state.message}
          </div>
        ) : null}

        <SubmitButton />
      </div>
    </form>
  );
}
