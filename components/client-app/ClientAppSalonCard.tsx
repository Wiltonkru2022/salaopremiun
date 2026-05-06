import Link from "next/link";
import { CalendarClock, MapPin, ParkingCircle, Star, Wallet } from "lucide-react";
import type { ClientAppSalonListItem } from "@/lib/client-app/queries";

function formatCurrency(value: number | null) {
  if (value === null) return null;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ClientAppSalonCard({
  salao,
  distanceKm = null,
}: {
  salao: ClientAppSalonListItem;
  distanceKm?: number | null;
}) {
  return (
    <article className="overflow-hidden rounded-[1.45rem] border border-zinc-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-[0_22px_60px_rgba(15,23,42,0.12)]">
      <div className="relative h-40 bg-zinc-100">
        {salao.fotoCapaUrl ? (
          <img
            src={salao.fotoCapaUrl}
            alt={`Capa do salao ${salao.nome}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-end bg-gradient-to-br from-zinc-950 via-zinc-800 to-amber-700 p-4 text-white">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-100">
              Agenda online
            </div>
          </div>
        )}
        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1.5 text-xs font-black text-zinc-950 shadow-sm">
            <Star size={14} fill="currentColor" className="text-amber-600" />
            {salao.notaMedia ? salao.notaMedia.toFixed(1) : "Novo"}
          </span>
          {distanceKm !== null ? (
            <span className="rounded-full bg-zinc-950/90 px-3 py-1.5 text-xs font-bold text-white">
              {distanceKm < 1
                ? `${Math.max(100, Math.round(distanceKm * 1000))} m`
                : `${distanceKm.toFixed(1)} km`}
            </span>
          ) : null}
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="flex flex-wrap gap-2 text-xs font-bold text-zinc-700">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">
            <CalendarClock size={14} />
            {salao.proximoHorarioLabel || "Agenda online"}
          </span>
          {salao.totalAvaliacoes ? (
            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-700">
              {salao.totalAvaliacoes} avaliacoes
            </span>
          ) : null}
        </div>

        <div className="flex items-start gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[1.2rem] bg-zinc-100">
            {salao.logoUrl ? (
              <img
                src={salao.logoUrl}
                alt={`Logo do salao ${salao.nome}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="text-lg font-black text-zinc-700">
                {salao.nome.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <h2 className="text-lg font-black tracking-[-0.03em] text-zinc-950">
              {salao.nome}
            </h2>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500">
              <MapPin size={15} />
              <span className="truncate">
                {[salao.bairro, salao.cidade].filter(Boolean).join(" - ") ||
                  "Endereco publico em atualizacao"}
              </span>
            </div>
          </div>
        </div>

        <p className="line-clamp-3 text-sm leading-6 text-zinc-600">
          {salao.descricaoPublica ||
            "Conheca equipe, servicos e horarios desse salao no app cliente."}
        </p>

        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-zinc-100 bg-zinc-50 p-3 text-center">
          <div>
            <div className="text-sm font-black text-zinc-950">
              {salao.totalServicos || "-"}
            </div>
            <div className="mt-0.5 text-[11px] font-semibold text-zinc-500">
              servicos
            </div>
          </div>
          <div>
            <div className="text-sm font-black text-zinc-950">
              {salao.totalProfissionais || "-"}
            </div>
            <div className="mt-0.5 text-[11px] font-semibold text-zinc-500">
              equipe
            </div>
          </div>
          <div>
            <div className="text-sm font-black text-zinc-950">
              {formatCurrency(salao.precoMinimo) || "-"}
            </div>
            <div className="mt-0.5 text-[11px] font-semibold text-zinc-500">
              a partir
            </div>
          </div>
        </div>

        {salao.categorias.length ? (
          <div className="flex flex-wrap gap-2">
            {salao.categorias.slice(0, 3).map((categoria) => (
              <span
                key={categoria}
                className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600"
              >
                {categoria}
              </span>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 text-xs font-semibold text-zinc-600">
          {salao.estacionamento ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">
              <ParkingCircle size={14} />
              Estacionamento
            </span>
          ) : null}
          {salao.formasPagamento.length ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1.5">
              <Wallet size={14} />
              {salao.formasPagamento.slice(0, 2).join(" - ")}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/app-cliente/salao/${salao.id}`}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl bg-zinc-950 px-4 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-zinc-800"
          >
            Ver horarios
          </Link>
          <Link
            href={`/app-cliente/cadastro?next=${encodeURIComponent(`/app-cliente/salao/${salao.id}`)}`}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-800 transition hover:bg-zinc-50"
          >
            Criar conta
          </Link>
        </div>
      </div>
    </article>
  );
}
