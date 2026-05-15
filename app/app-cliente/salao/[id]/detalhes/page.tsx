import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, MapPinned, MessageCircle, Navigation, Phone } from "lucide-react";
import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import ClientSalonSectionTabs from "@/components/client-app/ClientSalonSectionTabs";
import { getClientAppSalonDetail } from "@/lib/client-app/queries";

export const metadata = {
  title: "Detalhes do Salão",
};

const DIAS_LABEL: Record<string, string> = {
  domingo: "Domingo",
  segunda: "Segunda",
  terca: "Terça",
  quarta: "Quarta",
  quinta: "Quinta",
  sexta: "Sexta",
  sabado: "Sábado",
};

const DIAS_BY_INDEX = [
  "domingo",
  "segunda",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
];

function normalizePhone(value?: string | null) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return null;
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function normalizeDia(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatDiasFuncionamento(dias: string[]) {
  const normalized = dias.map(normalizeDia).filter(Boolean);
  if (!normalized.length) return "Dias em atualização";
  return normalized.map((dia) => DIAS_LABEL[dia] || dia).join(", ");
}

export default async function ClienteSalonDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const salao = await getClientAppSalonDetail(id);
    const phone = normalizePhone(salao.whatsapp || salao.telefone);
    const mapsUrl = salao.enderecoCompleto
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          salao.enderecoCompleto
        )}`
      : null;
    const hojeKey = DIAS_BY_INDEX[new Date().getDay()];
    const diasFuncionamento = salao.horarioFuncionamento.diasFuncionamento.map(
      normalizeDia
    );
    const abertoHoje = diasFuncionamento.includes(hojeKey);
    const horarioLabel = `${salao.horarioFuncionamento.horaAbertura} - ${salao.horarioFuncionamento.horaFechamento}`;
    const diasLabel = formatDiasFuncionamento(
      salao.horarioFuncionamento.diasFuncionamento
    );

    return (
      <ClientAppFrame title={salao.nome} subtitle="Contato e funcionamento">
        <ClientSalonSectionTabs salonId={id} active="detalhes" />
        <section className="mx-auto max-w-4xl px-4 py-5 md:px-6">
          <Link
            href={`/app-cliente/salao/${id}`}
            className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-zinc-950 shadow-sm"
            aria-label="Voltar"
          >
            <ArrowLeft size={22} />
          </Link>

          <h1 className="text-3xl font-black tracking-[-0.04em] text-zinc-950">
            Detalhes
          </h1>
          <p className="mt-2 text-base leading-7 text-zinc-500">
            Endereço, horário de funcionamento e canais de contato do salão.
          </p>

          <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="grid gap-4 border-b border-zinc-100 p-5 md:grid-cols-[1fr_auto] md:items-center">
              <div className="flex min-w-0 gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-950 text-white">
                  <MapPinned size={22} />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-black uppercase tracking-[0.16em] text-zinc-400">
                    Endereço
                  </div>
                  <div className="mt-1 text-lg font-black text-zinc-950">
                    {salao.nome}
                  </div>
                  <p className="mt-1 text-sm leading-6 text-zinc-500">
                    {salao.enderecoCompleto || "Endereço em atualização"}
                  </p>
                </div>
              </div>
              {mapsUrl ? (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-zinc-200 px-5 text-sm font-black text-zinc-950"
                >
                  <Navigation size={18} />
                  Abrir rota
                </a>
              ) : null}
            </div>

            <div className="divide-y divide-zinc-100">
              <div className="flex items-center justify-between gap-4 px-4 py-5">
                <span className="inline-flex items-center gap-3 text-zinc-500">
                  <Clock size={20} className="text-zinc-400" />
                  {abertoHoje ? "Aberto hoje" : "Fechado hoje"}
                </span>
                <span className="text-right font-black text-zinc-950">
                  {abertoHoje ? horarioLabel : diasLabel}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-5">
                <span className="text-zinc-500">Funcionamento</span>
                <span className="max-w-[68%] text-right font-semibold text-zinc-950">
                  {diasLabel}
                </span>
              </div>
              {phone ? (
                <div className="flex items-center justify-between gap-4 px-4 py-5">
                  <div className="flex min-w-0 items-center gap-3 text-lg">
                    <Phone size={22} className="shrink-0 text-zinc-400" />
                    <span className="truncate">
                      {salao.telefone || salao.whatsapp}
                    </span>
                  </div>
                  <a
                    href={`tel:+${phone}`}
                    className="rounded-xl border border-zinc-200 px-5 py-2 text-sm font-black"
                  >
                    Ligar
                  </a>
                </div>
              ) : null}
              {phone ? (
                <a
                  href={`https://wa.me/${phone}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between px-4 py-5 text-lg"
                >
                  <span className="inline-flex items-center gap-3">
                    <MessageCircle size={22} className="text-zinc-400" />
                    WhatsApp
                  </span>
                  <span className="text-zinc-300">{">"}</span>
                </a>
              ) : null}
            </div>
          </div>
        </section>
      </ClientAppFrame>
    );
  } catch {
    notFound();
  }
}
