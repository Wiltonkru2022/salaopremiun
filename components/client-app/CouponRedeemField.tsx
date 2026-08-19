"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, Gift } from "lucide-react";

function extractToken(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    const parts = url.pathname.split("/").filter(Boolean);
    const index = parts.findIndex((item) => item === "resgatar-cupom");
    if (index >= 0 && parts[index + 1]) return decodeURIComponent(parts[index + 1]);
  } catch {}
  const match = raw.match(/resgatar-cupom\/([^?\s#]+)/i);
  if (match?.[1]) return decodeURIComponent(match[1]);
  return raw.replace(/\s+/g, "");
}

export default function CouponRedeemField() {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const token = extractToken(value);
    if (!token || token.length < 8) {
      setError("Cole o link ou código de resgate que você recebeu no WhatsApp.");
      return;
    }
    window.location.assign(`/resgatar-cupom/${encodeURIComponent(token)}`);
  }

  return (
    <form onSubmit={submit} className="rounded-[1.5rem] border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-800"><Gift size={21} /></div>
        <div>
          <h2 className="text-base font-black text-zinc-950">Resgatar cupom recebido</h2>
          <p className="mt-1 text-xs font-bold leading-5 text-zinc-500">Cole aqui o link exclusivo enviado pelo salão no WhatsApp. Cupons privados não ficam visíveis antes do resgate.</p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <input value={value} onChange={(event) => { setValue(event.target.value); setError(""); }} placeholder="Cole o link ou código" className="h-12 min-w-0 flex-1 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-bold outline-none focus:border-amber-400" />
        <button type="submit" className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-zinc-950 text-white" aria-label="Resgatar cupom"><ArrowRight size={20} /></button>
      </div>
      {error ? <p className="mt-2 text-xs font-bold text-red-600">{error}</p> : null}
    </form>
  );
}
