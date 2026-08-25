import { MapPin, Star } from "lucide-react";
import ClientAppPendingLink from "@/components/client-app/ClientAppPendingLink";
import type { ClientAppSalonListItem } from "@/lib/client-app/queries";
import { buildSalaoPublicPath } from "@/lib/saloes/public-link";

export default function ClientAppSalonCard({
  salao,
  distanceKm = null,
  variant = "dark",
}: {
  salao: ClientAppSalonListItem;
  distanceKm?: number | null;
  isLoggedIn?: boolean;
  variant?: "dark" | "light";
}) {
  const publicPath = buildSalaoPublicPath(salao.appClienteSlug || salao.id);
  const address =
    [salao.bairro, salao.cidade, salao.estado].filter(Boolean).join(" - ") ||
    salao.enderecoCompleto;
  const light = variant === "light";

  return (
    <article
      className={`overflow-hidden rounded-[1.35rem] border transition-shadow ${
        light
          ? "border-zinc-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.07)]"
          : "border-white/8 bg-[#121315] shadow-[0_20px_55px_rgba(0,0,0,0.38)]"
      }`}
    >
      <ClientAppPendingLink href={publicPath} className="block">
        <div className="relative h-[240px] overflow-hidden bg-zinc-100 sm:h-[260px]">
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

          <div className="absolute right-4 top-4 rounded-xl bg-white/95 px-3 py-2 text-sm font-black text-zinc-950 shadow-sm backdrop-blur">
            {salao.notaMedia !== null && salao.totalAvaliacoes > 0
              ? salao.notaMedia.toFixed(1)
              : "Novo"}
          </div>

          {distanceKm !== null ? (
            <div className="absolute bottom-4 left-4 rounded-full bg-black/70 px-3 py-2 text-xs font-bold text-white backdrop-blur">
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
            <h2
              className={`min-w-0 text-[1.45rem] font-black leading-tight tracking-[-0.04em] ${
                light ? "text-zinc-950" : "text-white"
              }`}
            >
              {salao.nome}
            </h2>

            {salao.notaMedia !== null && salao.totalAvaliacoes > 0 ? (
              <div
                className={`inline-flex shrink-0 items-center gap-1 text-sm ${
                  light ? "text-zinc-800" : "text-white"
                }`}
              >
                <Star size={17} className="text-[#b7791f]" fill="currentColor" />
                <span className="font-black">{salao.notaMedia.toFixed(1)}</span>
                <span className={light ? "text-zinc-400" : "text-zinc-400"}>
                  ({salao.totalAvaliacoes})
                </span>
              </div>
            ) : null}
          </div>

          {address ? (
            <div
              className={`mt-3 flex items-start gap-2 text-sm ${
                light ? "text-zinc-500" : "text-zinc-300"
              }`}
            >
              <MapPin size={17} className="mt-0.5 shrink-0" />
              <span>{address}</span>
            </div>
          ) : null}

          <div className={`mt-4 text-base ${light ? "text-zinc-700" : "text-white"}`}>
            {salao.precoMinimo !== null ? (
              <>
                A partir de{" "}
                <span className="font-black text-[#9b6a14]">
                  {salao.precoMinimo.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </span>
              </>
            ) : (
              <span className={light ? "font-semibold text-zinc-500" : "font-semibold text-zinc-300"}>
                Preço sob consulta
              </span>
            )}
          </div>
        </div>
      </ClientAppPendingLink>
    </article>
  );
}
