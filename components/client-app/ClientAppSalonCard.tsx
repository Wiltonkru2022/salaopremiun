import { Heart, MapPin, Star } from "lucide-react";
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
    "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?q=80&w=1200&auto=format&fit=crop";

  return (
    <article className="overflow-hidden rounded-[1.35rem] border border-white/8 bg-[#121315] shadow-[0_20px_55px_rgba(0,0,0,0.38)]">
      <ClientAppPendingLink href={publicPath} className="block">
        <div className="relative h-[260px] overflow-hidden bg-zinc-900">
          <img
            src={cover}
            alt={`Capa do salão ${salao.nome}`}
            className="h-full w-full object-cover"
          />
          <button
            type="button"
            className="absolute left-5 top-5 flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur"
            aria-label="Favoritar"
          >
            <Heart size={26} />
          </button>
          <div className="absolute right-5 top-5 rounded-2xl bg-white px-4 py-3 text-lg font-black text-zinc-950">
            {salao.notaMedia ? "5,0" : "Novo"}
          </div>
          {distanceKm !== null ? (
            <div className="absolute bottom-5 left-5 rounded-full bg-black/65 px-4 py-2 text-sm font-bold text-white backdrop-blur">
              {distanceKm < 1
                ? `A ${Math.max(100, Math.round(distanceKm * 1000))}m de você`
                : `A ${distanceKm.toLocaleString("pt-BR", {
                    maximumFractionDigits: 1,
                  })} km de você`}
            </div>
          ) : null}
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="min-w-0 text-[1.65rem] font-black leading-tight tracking-[-0.04em] text-white">
              {salao.nome}
            </h2>
            <div className="shrink-0 inline-flex items-center gap-1 text-lg text-white">
              <Star size={18} className="text-[#f5b83d]" fill="currentColor" />
              <span className="font-black">
                {salao.notaMedia ? salao.notaMedia.toFixed(1) : "5,0"}
              </span>
              <span className="text-zinc-400">({salao.totalAvaliacoes || 128})</span>
            </div>
          </div>
          <div className="mt-3 flex items-start gap-2 text-base text-zinc-300">
            <MapPin size={18} className="mt-1 shrink-0" />
            <span>
              {[salao.bairro, salao.cidade, salao.estado].filter(Boolean).join(" - ") ||
                salao.enderecoCompleto ||
                "Santos Dumont, Três Lagoas - MS"}
            </span>
          </div>
          <div className="mt-5 text-lg text-white">
            A partir de{" "}
            <span className="font-black text-[#f5b83d]">
              {(salao.precoMinimo ?? 20).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </div>
        </div>
      </ClientAppPendingLink>
    </article>
  );
}
