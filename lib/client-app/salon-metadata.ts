import type { Metadata } from "next";
import { getClientAppSalonDetail } from "@/lib/client-app/queries";
import { buildSalaoPublicUrl } from "@/lib/saloes/public-link";

function cleanText(value: string | null | undefined) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function truncateMeta(value: string, maxLength = 155) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trimEnd()}...`;
}

function buildLocation(cidade: string | null, estado: string | null) {
  return [cidade, estado].map(cleanText).filter(Boolean).join(" - ");
}

export async function generateClientSalonMetadata(
  idSalaoOrSlug: string
): Promise<Metadata> {
  try {
    const salao = await getClientAppSalonDetail(idSalaoOrSlug);
    const publicKey = salao.appClienteSlug || salao.id;
    const canonicalUrl = buildSalaoPublicUrl(publicKey);
    const location = buildLocation(salao.cidade, salao.estado);
    const fallbackDescription = truncateMeta(
      [
        `Agende seu horario online no ${salao.nome}.`,
        location ? `Atendimento em ${location}.` : null,
        "Veja servicos, profissionais e horarios disponiveis.",
      ]
        .filter(Boolean)
        .join(" ")
    );
    const description = truncateMeta(
      cleanText(salao.descricaoPublica) || fallbackDescription
    );
    const imageUrl = salao.fotoCapaUrl || salao.logoUrl || "/logo.png";
    const title = `${salao.nome} - Agendamento online`;

    return {
      title,
      description,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title,
        description,
        url: canonicalUrl,
        siteName: salao.nome,
        type: "website",
        locale: "pt_BR",
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: salao.nome,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [imageUrl],
      },
      robots: {
        index: true,
        follow: true,
      },
    };
  } catch {
    return {
      title: "Agendamento online",
      description:
        "Abra a pagina do salao para ver servicos e reservar seu horario online.",
      openGraph: {
        title: "Agendamento online",
        description:
          "Abra a pagina do salao para ver servicos e reservar seu horario online.",
        type: "website",
        locale: "pt_BR",
        images: ["/logo.png"],
      },
      twitter: {
        card: "summary_large_image",
        title: "Agendamento online",
        description:
          "Abra a pagina do salao para ver servicos e reservar seu horario online.",
        images: ["/logo.png"],
      },
      robots: {
        index: false,
        follow: false,
      },
    };
  }
}
