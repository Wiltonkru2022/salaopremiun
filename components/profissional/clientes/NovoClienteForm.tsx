"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import ProfissionalSectionHeader from "@/components/profissional/ui/ProfissionalSectionHeader";
import {
  criarClienteProfissionalAction,
  type NovoClienteState,
} from "@/app/app-profissional/clientes/novo/actions";

const initialState: NovoClienteState = {
  error: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="h-12 w-full rounded-2xl bg-zinc-950 text-base font-semibold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Salvando cliente..." : "Salvar cliente"}
    </button>
  );
}

function formatTelefone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return digits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

export default function NovoClienteForm() {
  const [state, formAction] = useActionState(
    criarClienteProfissionalAction,
    initialState
  );

  const [telefone, setTelefone] = useState("");
  const telefoneFormatado = useMemo(() => telefone, [telefone]);

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-[1.6rem] border border-zinc-200 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.06)]"
    >
      <ProfissionalSectionHeader
        title="Novo cliente"
        description="Cadastre o essencial para agendar e abrir comandas mais rapido."
      />

      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-700">
          Nome completo
        </label>
        <input
          name="nome"
          type="text"
          placeholder="Digite o nome do cliente"
          className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-zinc-400"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-700">
          Telefone
        </label>
        <input
          name="telefone"
          type="text"
          inputMode="numeric"
          value={telefoneFormatado}
          onChange={(e) => setTelefone(formatTelefone(e.target.value))}
          placeholder="(00) 00000-0000"
          className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-zinc-400"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-700">
          Email
        </label>
        <input
          name="email"
          type="email"
          placeholder="cliente@email.com"
          className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-zinc-400"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-700">
          Observacoes
        </label>
        <textarea
          name="observacoes"
          placeholder="Ex.: prefere atendimento pela manha"
          className="min-h-[110px] w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-400"
        />
      </div>

      {state.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
          Depois do cadastro, o cliente ja fica disponivel para agenda e comanda.
        </div>
      )}

      <SubmitButton />
    </form>
  );
}
