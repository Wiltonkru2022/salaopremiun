"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertTriangle, ShieldCheck, X } from "lucide-react";
import {
  desbloquearSalaoSegurancaAction,
  desbloquearUsuarioSegurancaAction,
  limparLogsSegurancaAction,
  type SecurityActionResult,
} from "@/app/(admin-master)/admin-master/seguranca/actions";

type Props =
  | { type: "user"; userId: string; tipoUsuario: string; label?: string }
  | { type: "salao"; idSalao: string; label?: string }
  | { type: "retention"; label?: string };

export default function AdminMasterSecurityActionButton(props: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<SecurityActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  const label = props.label || (props.type === "retention" ? "Aplicar retenção" : props.type === "salao" ? "Reativar salão" : "Desbloquear usuário");

  function submit() {
    if (motivo.trim().length < 8 || !confirmed || pending) return;
    const form = new FormData();
    form.set("motivo", motivo.trim());
    if (props.type === "user") {
      form.set("userId", props.userId);
      form.set("tipoUsuario", props.tipoUsuario);
    }
    if (props.type === "salao") form.set("idSalao", props.idSalao);

    startTransition(async () => {
      let response: SecurityActionResult;
      if (props.type === "user") response = await desbloquearUsuarioSegurancaAction(form);
      else if (props.type === "salao") response = await desbloquearSalaoSegurancaAction(form);
      else response = await limparLogsSegurancaAction(form);
      setResult(response);
      if (response.ok) {
        setMotivo("");
        setConfirmed(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <button type="button" onClick={() => { setResult(null); setOpen(true); }} className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-700 transition hover:border-violet-200 hover:text-violet-700">
        <ShieldCheck size={14} /> {label}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/40 p-3 backdrop-blur-sm sm:p-4" onMouseDown={() => !pending && setOpen(false)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-zinc-200 bg-white p-4 shadow-2xl sm:p-5" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-700"><AlertTriangle size={14} /> Ação sensível</div>
                <h2 className="mt-2 text-xl font-black text-zinc-950">{label}</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-500">Exige motivo administrativo, confirmação explícita e sessão MFA AAL2. A alteração ficará registrada na auditoria com antes/depois.</p>
              </div>
              <button type="button" disabled={pending} onClick={() => setOpen(false)} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100" aria-label="Fechar"><X size={18} /></button>
            </div>

            <label className="mt-5 block"><span className="text-xs font-bold text-zinc-700">Motivo obrigatório</span><textarea value={motivo} onChange={(event) => setMotivo(event.target.value)} rows={3} placeholder="Explique por que esta ação está sendo executada..." className="mt-2 w-full resize-none rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-violet-300 focus:bg-white" /></label>
            <label className="mt-4 flex items-start gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-0.5 h-4 w-4 accent-violet-700" /><span className="text-xs leading-5 text-zinc-600">Confirmo que revisei o alvo e entendo o impacto desta alteração.</span></label>

            {result ? (
              <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${result.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
                {result.message}
                {result.mfaRequired ? <div className="mt-2"><Link href="/seguranca/mfa?mode=admin-master&next=/admin-master/seguranca" className="font-black underline">Verificar MFA agora</Link></div> : null}
              </div>
            ) : null}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setOpen(false)} disabled={pending} className="h-10 rounded-xl border border-zinc-200 px-4 text-sm font-bold text-zinc-600 hover:bg-zinc-50">Cancelar</button><button type="button" onClick={submit} disabled={pending || !confirmed || motivo.trim().length < 8} className="h-10 rounded-xl bg-violet-700 px-4 text-sm font-bold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-40">{pending ? "Validando..." : "Confirmar com MFA"}</button></div>
          </div>
        </div>
      ) : null}
    </>
  );
}
