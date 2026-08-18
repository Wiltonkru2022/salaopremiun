"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  deleteClienteProfileAction,
  updateClienteProfileAction,
  type ClienteProfileState,
} from "@/app/app-cliente/perfil/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="h-12 w-full rounded-2xl bg-zinc-950 text-sm font-semibold text-white disabled:opacity-60">
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [state, formAction] = useActionState<ClienteProfileState, FormData>(
    updateClienteProfileAction,
    { error: null }
  );

  return (
    <div className="space-y-4">
      <form id="editar-cadastro" action={formAction} className="rounded-[1.8rem] border border-white/70 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
        <h2 className="text-lg font-black text-zinc-950">Editar dados</h2>
        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Nome</label>
            <input name="nome" type="text" autoComplete="name" defaultValue={nome} required className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-base outline-none" />
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="text-sm font-medium text-zinc-700">E-mail</div>
            <div className="mt-1 break-all text-sm font-semibold text-zinc-950">{email || "Nenhum e-mail cadastrado"}</div>
            <p className="mt-2 text-xs leading-5 text-zinc-500">Por segurança, o e-mail não pode ser alterado diretamente neste formulário.</p>
            <Link href="/app-cliente/recuperar-acesso" className="mt-3 inline-flex text-sm font-bold text-amber-800 underline underline-offset-4">
              Alterar e-mail com verificação
            </Link>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">WhatsApp</label>
            <input name="telefone" type="tel" autoComplete="tel" inputMode="tel" defaultValue={telefone || ""} required className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-base outline-none" />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Preferências para atendimento</label>
            <textarea name="preferencias" defaultValue={preferenciasGerais || ""} rows={4} placeholder="Ex.: profissional favorito, estilo de atendimento, cuidados importantes." className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base outline-none" />
          </div>

          {successKey === "salvo" ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Perfil atualizado com sucesso.</div> : null}
          {successKey === "email_alterado" ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">E-mail atualizado e confirmado com sucesso.</div> : null}
          {successKey === "erro_excluir" ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Não foi possível encerrar sua conta agora.</div> : null}
          {state.error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div> : null}
          <SubmitButton />
        </div>
      </form>

      <form action={deleteClienteProfileAction} className="rounded-[1.8rem] border border-red-200 bg-red-50 p-5">
        <h2 className="text-lg font-black text-red-900">Encerrar conta</h2>
        <p className="mt-2 text-sm leading-6 text-red-800">Isso desativa seu acesso ao app e cancela agendamentos futuros feitos pelo App Cliente. O histórico operacional do salão continua preservado.</p>
        {confirmDelete ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-white p-3">
            <p className="text-sm font-semibold text-red-900">Tem certeza?</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => setConfirmDelete(false)} className="h-11 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-bold">Manter minha conta</button>
              <button type="submit" className="h-11 rounded-2xl bg-red-700 px-4 text-sm font-bold text-white">Sim, encerrar conta</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className="mt-4 inline-flex h-11 items-center justify-center rounded-2xl bg-red-700 px-4 text-sm font-bold text-white">Excluir minha conta</button>
        )}
      </form>
    </div>
  );
}
