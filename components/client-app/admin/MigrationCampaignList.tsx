"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  generateClienteMigrationLinkAction,
  sendClienteMigrationEmailAction,
  type MigrationContactState,
} from "@/app/(painel)/clientes/migracao-acesso/actions";

export type MigrationClientRow = {
  id: string;
  nome: string;
  whatsapp: string | null;
  email: string | null;
  appConectado: boolean;
  temCpf: boolean;
  temNascimento: boolean;
};

const initial: MigrationContactState = { error: null, success: null };

function GenerateButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="h-10 rounded-xl bg-zinc-950 px-4 text-xs font-black text-white disabled:opacity-60">{pending ? "Gerando..." : "Gerar link"}</button>;
}

function EmailButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="h-10 rounded-xl border border-zinc-200 bg-white px-4 text-xs font-black text-zinc-800 disabled:opacity-60">{pending ? "Enviando..." : "Enviar por e-mail"}</button>;
}

function MigrationContactCard({ client }: { client: MigrationClientRow }) {
  const [state, generateAction] = useActionState(generateClienteMigrationLinkAction, initial);
  const [emailState, emailAction] = useActionState(sendClienteMigrationEmailAction, initial);

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-black text-zinc-950">{client.nome}</div>
          <div className="mt-1 text-xs text-zinc-500">
            {client.whatsapp || "Sem WhatsApp"} · {client.email || "Sem e-mail"}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold">
            <span className={`rounded-full px-2 py-1 ${client.appConectado ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-600"}`}>
              {client.appConectado ? "App conectado" : "Sem vínculo do app"}
            </span>
            {!client.temCpf ? <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-800">Sem CPF</span> : null}
            {!client.temNascimento ? <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-800">Sem nascimento</span> : null}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <form action={generateAction}>
          <input type="hidden" name="idCliente" value={client.id} />
          <GenerateButton />
        </form>
        {client.email ? (
          <form action={emailAction}>
            <input type="hidden" name="idCliente" value={client.id} />
            <EmailButton />
          </form>
        ) : null}
      </div>

      {state.whatsappUrl ? (
        <a
          href={state.whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex h-11 items-center rounded-xl bg-emerald-600 px-4 text-sm font-black text-white"
        >
          Abrir WhatsApp com mensagem pronta
        </a>
      ) : state.link ? (
        <div className="mt-3 rounded-xl bg-zinc-50 p-3 text-xs text-zinc-600">
          Este número não está em formato compatível com wa.me. Copie o link e envie manualmente:<br />
          <span className="break-all font-semibold text-zinc-900">{state.link}</span>
        </div>
      ) : null}

      {state.success ? <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">{state.success}</div> : null}
      {state.error ? <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{state.error}</div> : null}
      {emailState.success ? <div className="mt-3 rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800">{emailState.success}</div> : null}
      {emailState.error ? <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{emailState.error}</div> : null}
    </article>
  );
}

export default function MigrationCampaignList({ clients }: { clients: MigrationClientRow[] }) {
  const priority = clients.filter((item) => item.appConectado);
  const remaining = clients.filter((item) => !item.appConectado);
  return (
    <div className="space-y-7">
      {priority.length ? (
        <section>
          <h2 className="text-lg font-black text-zinc-950">Prioridade: já usam o App Cliente ({priority.length})</h2>
          <p className="mt-1 text-sm text-zinc-500">Contate estes primeiro para evitar perda de acesso quando a migração for concluída.</p>
          <div className="mt-3 grid gap-3">{priority.map((client) => <MigrationContactCard key={client.id} client={client} />)}</div>
        </section>
      ) : null}
      <section>
        <h2 className="text-lg font-black text-zinc-950">Demais cadastros pendentes ({remaining.length})</h2>
        <div className="mt-3 grid gap-3">{remaining.map((client) => <MigrationContactCard key={client.id} client={client} />)}</div>
      </section>
    </div>
  );
}
