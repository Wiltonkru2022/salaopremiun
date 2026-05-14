import { MapPin, Star } from "lucide-react";
import ClientAppPendingLink from "@/components/client-app/ClientAppPendingLink";
import type { ClientAppSalonListItem } from "@/lib/client-app/queries";
import { buildSalaoPublicPath } from "@/lib/saloes/public-link";

export default function ClientAppSalonCard({
  salao,
  distanceKm = null,
}: {
  salao: ClientAppSalonListItem;
  distanceKm?: number | null;
  isLoggedIn?: boolean;
}) {
  const publicPath = buildSalaoPublicPath(salao.appClienteSlug || salao.id);
  const cover =
    salao.fotoCapaUrl ||
    "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=1200&auto=format&fit=crop";

  return (
    <article className="group border-b border-zinc-200 pb-7">
      <ClientAppPendingLink href={publicPath} className="block">
        <div className="relative overflow-hidden rounded-[0.9rem] bg-zinc-100">
          <img
            src={cover}
            alt={`Capa do salão ${salao.nome}`}
            className="aspect-[1.74/1] w-full object-cover transition duration-500 group-hover:scale-[1.02]"
          />
          <div className="absolute right-3 top-3 rounded-xl bg-zinc-950/82 px-3 py-2 text-right text-white backdrop-blur">
            <div className="flex items-center justify-end gap-1 text-lg font-black leading-none">
              <Star size={15} fill="currentColor" />
              {salao.notaMedia ? salao.notaMedia.toFixed(1) : "Novo"}
            </div>
            <div className="mt-0.5 text-xs text-white/80">
              {salao.totalAvaliacoes || 0} avaliações
            </div>
          </div>
          {distanceKm !== null ? (
            <div className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-zinc-900">
              {distanceKm < 1
                ? `${Math.max(100, Math.round(distanceKm * 1000))} m`
                : `${distanceKm.toFixed(1)} km`}
            </div>
          ) : null}
        </div>

        <div className="mt-4 space-y-2">
          <div className="inline-flex rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-bold text-zinc-800">
            Recomendado pelo Salão Premium
          </div>
          <h2 className="text-[1.6rem] font-black leading-tight tracking-[-0.04em] text-zinc-950">
            {salao.nome}
          </h2>
          <div className="flex items-start gap-1.5 text-base leading-6 text-zinc-500">
            <MapPin size={18} className="mt-0.5 shrink-0" />
            <span>
              {[salao.bairro, salao.cidade, salao.estado].filter(Boolean).join(" - ") ||
                salao.enderecoCompleto ||
                "Endereço em atualização"}
            </span>
          </div>
          {salao.precoMinimo !== null ? (
            <div className="text-sm font-semibold text-zinc-700">
              A partir de{" "}
              {salao.precoMinimo.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </div>
          ) : null}
          <div className="pt-1">
            <span className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-950 px-5 text-sm font-black text-white">
              Reservar
            </span>
          </div>
        </div>
      </ClientAppPendingLink>
    </article>
  );
}
