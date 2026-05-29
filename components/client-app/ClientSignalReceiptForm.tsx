"use client";

import { FileImage, ImageIcon, Send, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { enviarComprovanteSinalAction } from "@/app/app-cliente/agendamentos/[id]/sinal/actions";

type ReceiptPreview = {
  name: string;
  type: string;
  url: string | null;
};

export default function ClientSignalReceiptForm({
  agendamentoId,
}: {
  agendamentoId: string;
}) {
  const [preview, setPreview] = useState<ReceiptPreview | null>(null);

  useEffect(() => {
    return () => {
      if (preview?.url) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  const isImage = useMemo(
    () => Boolean(preview?.type && preview.type.startsWith("image/") && preview.url),
    [preview]
  );

  return (
    <form action={enviarComprovanteSinalAction} className="mt-7 space-y-8">
      <input type="hidden" name="agendamento" value={agendamentoId} />
      <label className="flex min-h-72 flex-col items-center justify-center rounded-[1.4rem] border border-dashed border-zinc-300 px-5 py-8 text-center">
        {isImage ? (
          <span className="block w-full overflow-hidden rounded-[1.25rem] border border-zinc-200 bg-zinc-100">
            <img
              src={preview?.url || ""}
              alt="Prévia do comprovante"
              className="max-h-80 w-full object-contain"
            />
          </span>
        ) : (
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <FileImage size={34} />
          </span>
        )}

        <span className="mt-6 text-xl font-black">
          {preview ? "Comprovante selecionado" : "Adicionar comprovante"}
        </span>
        <span className="mt-2 break-words text-base text-zinc-500">
          {preview
            ? preview.name || "Arquivo pronto para enviar"
            : "Arraste ou selecione um arquivo"}
        </span>
        {preview && !isImage ? (
          <span className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-bold text-zinc-700">
            PDF selecionado para envio
          </span>
        ) : null}
        <span className="mt-7 flex h-16 w-full items-center justify-center gap-3 rounded-2xl border border-zinc-200 text-lg font-bold text-emerald-600">
          <ImageIcon size={26} />
          {preview ? "Trocar arquivo" : "Selecionar da galeria"}
        </span>
        <input
          type="file"
          name="comprovante"
          accept="image/*,application/pdf"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0] || null;
            setPreview((current) => {
              if (current?.url) URL.revokeObjectURL(current.url);
              if (!file) return null;
              return {
                name: file.name,
                type: file.type || "application/octet-stream",
                url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
              };
            });
          }}
        />
      </label>

      <div className="flex gap-4 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5 text-emerald-950">
        <ShieldCheck size={28} className="shrink-0 text-emerald-600" />
        <div>
          <p className="text-lg font-semibold">Confira antes de enviar</p>
          <p className="mt-1 text-base leading-7 text-zinc-600">
            Depois do envio, o salão ou profissional confere o Pix e confirma seu horário.
          </p>
        </div>
      </div>

      <SubmitReceiptButton disabled={!preview} />
    </form>
  );
}

function SubmitReceiptButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-emerald-600 text-xl font-black text-white shadow-[0_12px_30px_rgba(5,150,105,0.25)] transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-55"
    >
      <Send size={27} />
      {pending ? "Enviando..." : "Enviar comprovante"}
    </button>
  );
}
