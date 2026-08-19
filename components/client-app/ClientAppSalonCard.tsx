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
  const address =
    [salao.bairro, salao.cidade, salao.estado].filter(Boolean).join(" - ") ||
    salao.enderecoCompleto;

  return (
    <article className="overflow-hidden rounded-[1.35rem] border border-white/8 bg-[#121315] shadow-[0_20px_55px_rgba(0,0,0,0.38)]">
      <ClientAppPendingLink href={publicPath} className="block">
        <div className="relative h-[260px] overflow-hidden bg-zinc-900">
          {salao.fotoCapaUrl ? (
            <img
              src={salao.fotoCapaUrl}
              alt={`Capa do salão ${salao.nome}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-800 to-[#8b651e] text-6xl font-black text-white/80">
              {salao.nome.slice(0, 2).toUpperCase()}
            </div>
          )}

          <div className="absolute right-5 top-5 rounded-2xl bg-white px-4 py-3 text-base font-black text-zinc-950">
            {salao.notaMedia !== null && salao.totalAvaliacoes > 0
              ? salao.notaMedia.toFixed(1)
              : "Novo"}
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

            {salao.notaMedia !== null && salao.totalAvaliacoes > 0 ? (
              <div className="inline-flex shrink-0 items-center gap-1 text-lg text-white">
                <Star size={18} className="text-[#f5b83d]" fill="currentColor" />
                <span className="font-black">{salao.notaMedia.toFixed(1)}</span>
                <span className="text-zinc-400">({salao.totalAvaliacoes})</span>
              </div>
            ) : null}
          </div>

          {address ? (
            <div className="mt-3 flex items-start gap-2 text-base text-zinc-300">
              <MapPin size={18} className="mt-1 shrink-0" />
              <span>{address}</span>
            </div>
          ) : null}

          <div className="mt-5 text-lg text-white">
            {salao.precoMinimo !== null ? (
              <>
                A partir de{" "}
                <span className="font-black text-[#f5b83d]">
                  {salao.precoMinimo.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </span>
              </>
            ) : (
              <span className="font-semibold text-zinc-300">Preço sob consulta</span>
            )}
          </div>
        </div>
      </ClientAppPendingLink>
    </article>
  );
}
