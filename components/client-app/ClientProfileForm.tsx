"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  deleteClienteProfileAction,
  updateClienteProfileAction,
  type ClienteProfileState,
} from "@/app/app-cliente/perfil/actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="h-12 w-full rounded-2xl bg-zinc-950 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Salvando..." : "Salvar perfil"}
    </button>
  );
}

export default function ClientProfileForm({
  nome,
  email,
  telefone,
  preferenciasGerais,
  successKey,
}: {
  nome: string;
  email: string;
  telefone?: string | null;
  preferenciasGerais?: string | null;
  successKey?: string | null;
}) {
  const initialState: ClienteProfileState = { error: null };
  const [state, formAction] = useActionState<ClienteProfileState, FormData>(
    updateClienteProfileAction,
    initialState
  );

  return (
    <div className="space-y-4">
      <form
        action={formAction}
        className="rounded-[1.8rem] border border-white/70 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)]"
      >
        <h2 className="text-lg font-black tracking-[-0.03em] text-zinc-950">
          Dados principais
        </h2>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">
              Nome
            </label>
            <input
              name="nome"
              type="text"
              defaultValue={nome}
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
              defaultValue={email}
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
              defaultValue={telefone || ""}
              className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-zinc-400"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">
              Preferencias
            </label>
            <textarea
              name="preferencias"
              defaultValue={preferenciasGerais || ""}
              rows={4}
              placeholder="Ex.: profissional favorito, estilo de atendimento, cuidados importantes."
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-400"
            />
          </div>

          {successKey === "salvo" ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Perfil atualizado com sucesso.
            </div>
          ) : null}

          {successKey === "erro_excluir" ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Nao foi possivel encerrar sua conta agora.
            </div>
          ) : null}

          {state.error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {state.error}
            </div>
          ) : null}

          <SubmitButton />
        </div>
      </form>

      <form
        action={deleteClienteProfileAction}
        className="rounded-[1.8rem] border border-red-200 bg-red-50 p-5 shadow-[0_18px_48px_rgba(15,23,42,0.04)]"
      >
        <h2 className="text-lg font-black tracking-[-0.03em] text-red-900">
          Encerrar conta
        </h2>
        <p className="mt-2 text-sm leading-6 text-red-800">
          Isso desativa seu acesso global, cancela agendamentos futuros feitos
          por este app e remove sua sessao atual. O historico operacional do
          salao continua preservado.
        </p>
        <button
          type="submit"
          className="mt-4 inline-flex h-11 items-center justify-center rounded-2xl bg-red-700 px-4 text-sm font-bold text-white transition hover:bg-red-800"
        >
          Excluir minha conta
        </button>
      </form>
    </div>
  );
}
