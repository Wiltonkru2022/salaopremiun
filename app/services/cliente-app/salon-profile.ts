import "server-only";

import { getDatabaseAdmin } from "@/lib/db/admin";
import {
  getClientAppSalonDetail,
  type ClientAppSalonDetail,
} from "@/lib/client-app/queries";
import { getClienteAppBookingAvailability } from "@/app/services/cliente-app/appointments";

type SalonExtrasRow = {
  plano?: string | null;
  instagram_url?: string | null;
  acessibilidade?: boolean | null;
  wifi?: boolean | null;
  cafe?: boolean | null;
  ar_condicionado?: boolean | null;
};

type SalonConfigRow = {
  hora_abertura?: string | null;
  hora_fechamento?: string | null;
  dias_funcionamento?: unknown;
  fuso_horario?: string | null;
};

type RawReview = {
  id?: string | null;
  id_agendamento?: string | null;
  id_profissional?: string | null;
  nota?: number | string | null;
  comentario?: string | null;
  created_at?: string | null;
  imagens_url?: unknown;
  clientes?: { nome?: string | null } | { nome?: string | null }[] | null;
};

export type ClientSalonProfileReview = {
  id: string;
  clienteNome: string;
  nota: number;
  comentario: string | null;
  createdAt: string;
  idProfissional: string | null;
  imagensUrl: string[];
};

export type ClientSalonProfileProfessional = ClientAppSalonDetail["profissionais"][number] & {
  notaMedia: number | null;
  totalAvaliacoes: number;
};

export type ClientSalonProfileService = ClientAppSalonDetail["servicos"][number] & {
  imagemUrl: string | null;
};

export type ClientSalonOpeningInfo = {
  horaAbertura: string;
  horaFechamento: string;
  diasFuncionamento: string[];
  fusoHorario: string;
  abertoAgora: boolean;
};

export type ClientSalonNextSlot = {
  data: string;
  hora: string;
  label: string;
  servicoId: string;
  servicoNome: string;
  profissionalId: string;
};

export type ClientSalonProfile = Omit<
  ClientAppSalonDetail,
  "profissionais" | "servicos" | "avaliacoes" | "horarioFuncionamento"
> & {
  plano: string | null;
  isPremium: boolean;
  instagramUrl: string | null;
  acessibilidade: boolean;
  wifi: boolean;
  cafe: boolean;
  arCondicionado: boolean;
  profissionais: ClientSalonProfileProfessional[];
  servicos: ClientSalonProfileService[];
  avaliacoes: ClientSalonProfileReview[];
  notaMedia: number | null;
  totalAvaliacoes: number;
  distribuicaoAvaliacoes: Record<1 | 2 | 3 | 4 | 5, number>;
  horarioFuncionamento: ClientSalonOpeningInfo | null;
  proximoHorario: ClientSalonNextSlot | null;
};

function normalizeDay(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/-feira/g, "")
    .trim();
}

function normalizeInstagramUrl(value: string | null | undefined) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const handle = raw
    .replace(/^@/, "")
    .replace(/^instagram\.com\//i, "")
    .replace(/^www\.instagram\.com\//i, "");
  return handle
    ? `https://www.instagram.com/${handle.replace(/^\/+|\/+$/g, "")}`
    : null;
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function getClientName(value: RawReview["clientes"]) {
  if (Array.isArray(value)) {
    return String(value[0]?.nome || "").trim() || "Cliente";
  }
  return String(value?.nome || "").trim() || "Cliente";
}

function getZonedClock(timeZone: string) {
  try {
    const parts = new Intl.DateTimeFormat("pt-BR", {
      timeZone,
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date());
    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value || "";
    return {
      day: normalizeDay(get("weekday")),
      minutes: Number(get("hour")) * 60 + Number(get("minute")),
    };
  } catch {
    return null;
  }
}

function timeToMinutes(value: string) {
  const [hour, minute] = String(value || "")
    .slice(0, 5)
    .split(":")
    .map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

function buildOpeningInfo(
  config: SalonConfigRow | null
): ClientSalonOpeningInfo | null {
  if (!config?.hora_abertura || !config?.hora_fechamento) return null;

  const horaAbertura = String(config.hora_abertura).slice(0, 5);
  const horaFechamento = String(config.hora_fechamento).slice(0, 5);
  const diasFuncionamento = stringArray(config.dias_funcionamento).map(normalizeDay);
  const fusoHorario = String(config.fuso_horario || "America/Sao_Paulo").trim();
  const clock = getZonedClock(fusoHorario);
  const openingMinutes = timeToMinutes(horaAbertura);
  const closingMinutes = timeToMinutes(horaFechamento);

  const abertoAgora = Boolean(
    clock &&
      openingMinutes !== null &&
      closingMinutes !== null &&
      diasFuncionamento.includes(clock.day) &&
      clock.minutes >= openingMinutes &&
      clock.minutes < closingMinutes
  );

  return {
    horaAbertura,
    horaFechamento,
    diasFuncionamento,
    fusoHorario,
    abertoAgora,
  };
}

function formatNextSlotLabel(data: string, hora: string) {
  const parsed = new Date(`${data}T12:00:00Z`);
  const dateLabel = Number.isNaN(parsed.getTime())
    ? data
    : new Intl.DateTimeFormat("pt-BR", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        timeZone: "UTC",
      }).format(parsed);
  return `${dateLabel} às ${String(hora).slice(0, 5)}`;
}

async function findNextSlot(params: {
  idSalao: string;
  servicos: ClientSalonProfileService[];
  profissionais: ClientSalonProfileProfessional[];
}) {
  const professionalIds = new Set(params.profissionais.map((item) => item.id));
  const candidate = params.servicos.slice(0, 5).find((servico) => {
    if (!params.profissionais.length) return false;
    return (
      servico.profissionaisPermitidos.length === 0 ||
      servico.profissionaisPermitidos.some((id) => professionalIds.has(id))
    );
  });

  if (!candidate || !params.profissionais.length) return null;

  const allowedProfessional = candidate.profissionaisPermitidos.find((id) =>
    professionalIds.has(id)
  );
  const profissionalId = allowedProfessional || params.profissionais[0]?.id || "";
  if (!profissionalId) return null;

  const result = await getClienteAppBookingAvailability({
    idSalao: params.idSalao,
    idServico: candidate.id,
    idsServicos: [candidate.id],
    idProfissional: profissionalId,
    ignoreAgendamentoId: null,
    startDate: null,
  });

  if (!result.ok) return null;
  const firstDay = result.dias[0];
  const firstTime = firstDay?.horarios[0];
  const data = String(firstDay?.data || "").slice(0, 10);
  const hora = String(firstTime?.horaInicio || "").slice(0, 5);
  if (!data || !hora) return null;

  return {
    data,
    hora,
    label: formatNextSlotLabel(data, hora),
    servicoId: candidate.id,
    servicoNome: candidate.nome,
    profissionalId,
  } satisfies ClientSalonNextSlot;
}

export async function getClientSalonProfile(
  idSalaoOrSlug: string
): Promise<ClientSalonProfile> {
  const base = await getClientAppSalonDetail(idSalaoOrSlug);
  const supabaseAdmin = getDatabaseAdmin();

  const [extrasResult, configResult, serviceImagesResult, reviewsResult] =
    await Promise.all([
      (supabaseAdmin as any)
        .from("saloes")
        .select(
          "plano, instagram_url, acessibilidade, wifi, cafe, ar_condicionado"
        )
        .eq("id", base.id)
        .limit(1)
        .maybeSingle(),
      (supabaseAdmin as any)
        .from("configuracoes_salao")
        .select(
          "hora_abertura, hora_fechamento, dias_funcionamento, fuso_horario"
        )
        .eq("id_salao", base.id)
        .limit(1)
        .maybeSingle(),
      base.servicos.length
        ? (supabaseAdmin as any)
            .from("servicos")
            .select("id, imagem_url")
            .eq("id_salao", base.id)
            .in(
              "id",
              base.servicos.map((item) => item.id)
            )
            .limit(200)
        : Promise.resolve({ data: [] }),
      (supabaseAdmin as any)
        .from("clientes_avaliacoes")
        .select(
          "id, id_agendamento, id_profissional, nota, comentario, created_at, imagens_url, clientes(nome)"
        )
        .eq("id_salao", base.id)
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

  const extras = (extrasResult.data || {}) as SalonExtrasRow;
  const config = (configResult.data || null) as SalonConfigRow | null;
  const imageMap = new Map<string, string>();
  for (const row of (serviceImagesResult.data || []) as Array<
    Record<string, unknown>
  >) {
    const serviceId = String(row.id || "").trim();
    const url = String(row.imagem_url || "").trim();
    if (serviceId && url) imageMap.set(serviceId, url);
  }

  const rawReviews = ((reviewsResult.data || []) as unknown as RawReview[]).filter(
    (item) => Number(item.nota || 0) >= 1 && Number(item.nota || 0) <= 5
  );
  const unresolvedAppointmentIds = rawReviews
    .filter((item) => !item.id_profissional && item.id_agendamento)
    .map((item) => String(item.id_agendamento || ""))
    .filter(Boolean);

  const appointmentProfessionalMap = new Map<string, string>();
  if (unresolvedAppointmentIds.length) {
    const { data: appointmentRows } = await (supabaseAdmin as any)
      .from("agendamentos")
      .select("id, profissional_id")
      .eq("id_salao", base.id)
      .in("id", unresolvedAppointmentIds)
      .limit(500);
    for (const row of (appointmentRows || []) as Array<Record<string, unknown>>) {
      const appointmentId = String(row.id || "").trim();
      const professionalId = String(row.profissional_id || "").trim();
      if (appointmentId && professionalId) {
        appointmentProfessionalMap.set(appointmentId, professionalId);
      }
    }
  }

  const avaliacoes: ClientSalonProfileReview[] = rawReviews.map((item) => {
    const appointmentId = String(item.id_agendamento || "").trim();
    return {
      id: String(item.id || ""),
      clienteNome: getClientName(item.clientes),
      nota: Number(item.nota || 0),
      comentario: String(item.comentario || "").trim() || null,
      createdAt: String(item.created_at || ""),
      idProfissional:
        String(item.id_profissional || "").trim() ||
        appointmentProfessionalMap.get(appointmentId) ||
        null,
      imagensUrl: stringArray(item.imagens_url).slice(0, 6),
    };
  });

  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  for (const review of avaliacoes) {
    const rounded = Math.max(
      1,
      Math.min(5, Math.round(review.nota))
    ) as 1 | 2 | 3 | 4 | 5;
    distribution[rounded] += 1;
  }

  const professionalMetrics = new Map<
    string,
    { sum: number; total: number }
  >();
  for (const review of avaliacoes) {
    if (!review.idProfissional) continue;
    const metric = professionalMetrics.get(review.idProfissional) || {
      sum: 0,
      total: 0,
    };
    metric.sum += review.nota;
    metric.total += 1;
    professionalMetrics.set(review.idProfissional, metric);
  }

  const profissionais: ClientSalonProfileProfessional[] = base.profissionais.map(
    (item) => {
      const metric = professionalMetrics.get(item.id);
      return {
        ...item,
        notaMedia: metric?.total
          ? Number((metric.sum / metric.total).toFixed(1))
          : null,
        totalAvaliacoes: metric?.total || 0,
      };
    }
  );

  const servicos: ClientSalonProfileService[] = base.servicos.map((item) => ({
    ...item,
    imagemUrl: imageMap.get(item.id) || null,
  }));

  const totalAvaliacoes = avaliacoes.length;
  const notaMedia = totalAvaliacoes
    ? Number(
        (
          avaliacoes.reduce((sum, item) => sum + item.nota, 0) /
          totalAvaliacoes
        ).toFixed(1)
      )
    : null;

  const proximoHorario = await findNextSlot({
    idSalao: base.id,
    servicos,
    profissionais,
  }).catch(() => null);

  const plano = String(extras.plano || "").trim().toLowerCase() || null;

  return {
    ...base,
    plano,
    isPremium: plano === "premium",
    instagramUrl: normalizeInstagramUrl(extras.instagram_url),
    acessibilidade: Boolean(extras.acessibilidade),
    wifi: Boolean(extras.wifi),
    cafe: Boolean(extras.cafe),
    arCondicionado: Boolean(extras.ar_condicionado),
    profissionais,
    servicos,
    avaliacoes,
    notaMedia,
    totalAvaliacoes,
    distribuicaoAvaliacoes: distribution,
    horarioFuncionamento: buildOpeningInfo(config),
    proximoHorario,
  };
}
