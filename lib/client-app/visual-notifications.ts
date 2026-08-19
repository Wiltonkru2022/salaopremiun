export const CLIENT_VISUAL_NOTIFICATION_CHANNEL = "app_cliente_visual";

export type ClientVisualNoticePresentation = "banner" | "modal";
export type ClientVisualNoticeTone =
  | "informacao"
  | "manutencao"
  | "aviso"
  | "promocao";

export type ClientVisualNoticeConfig = {
  canal: typeof CLIENT_VISUAL_NOTIFICATION_CHANNEL;
  apresentacao: ClientVisualNoticePresentation;
  dispensavel: boolean;
  bloqueante: boolean;
  botao_texto: string | null;
  fim_em: string | null;
  prioridade: number;
};

export type ClientVisualNoticeRow = {
  id: string;
  titulo: string;
  descricao: string;
  tipo: string;
  publico_tipo: string;
  filtros_json: unknown;
  link_url?: string | null;
  imagem_url?: string | null;
  status: string;
  agendada_em?: string | null;
  enviada_em?: string | null;
  criada_em?: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function parseClientVisualNoticeConfig(
  value: unknown
): ClientVisualNoticeConfig | null {
  const record = asRecord(value);
  if (!record || record.canal !== CLIENT_VISUAL_NOTIFICATION_CHANNEL) return null;

  const presentation: ClientVisualNoticePresentation =
    record.apresentacao === "banner" ? "banner" : "modal";
  const blocking = record.bloqueante === true;
  const dismissible = blocking ? false : record.dispensavel !== false;
  const priorityRaw = Number(record.prioridade ?? 0);
  const priority = Number.isFinite(priorityRaw)
    ? Math.max(-100, Math.min(100, Math.trunc(priorityRaw)))
    : 0;
  const buttonText =
    typeof record.botao_texto === "string" && record.botao_texto.trim()
      ? record.botao_texto.trim().slice(0, 40)
      : null;
  const endsAt =
    typeof record.fim_em === "string" && record.fim_em.trim()
      ? record.fim_em.trim()
      : null;

  return {
    canal: CLIENT_VISUAL_NOTIFICATION_CHANNEL,
    apresentacao: blocking ? "modal" : presentation,
    dispensavel: dismissible,
    bloqueante: blocking,
    botao_texto: buttonText,
    fim_em: endsAt,
    prioridade: priority,
  };
}

export function normalizeClientVisualNoticeUrl(value: unknown) {
  const normalized = String(value || "").trim();
  if (!normalized) return null;
  if (!normalized.startsWith("/") || normalized.startsWith("//")) return null;
  return normalized.slice(0, 500);
}

export function isClientVisualNoticeActive(
  row: ClientVisualNoticeRow,
  nowValue: Date | number = new Date()
) {
  const config = parseClientVisualNoticeConfig(row.filtros_json);
  if (!config) return false;

  const status = String(row.status || "").trim().toLowerCase();
  if (!["publicada", "agendada"].includes(status)) return false;

  const now =
    typeof nowValue === "number" ? nowValue : new Date(nowValue).getTime();
  if (!Number.isFinite(now)) return false;

  const startsAt = row.agendada_em
    ? new Date(row.agendada_em).getTime()
    : row.criada_em
      ? new Date(row.criada_em).getTime()
      : Number.NEGATIVE_INFINITY;
  if (Number.isFinite(startsAt) && startsAt > now) return false;

  if (config.fim_em) {
    const endsAt = new Date(config.fim_em).getTime();
    if (Number.isFinite(endsAt) && endsAt <= now) return false;
  }

  return ["todos", "clientes"].includes(
    String(row.publico_tipo || "").trim().toLowerCase()
  );
}

export function sortClientVisualNotices<T extends ClientVisualNoticeRow>(
  rows: T[]
) {
  return [...rows].sort((a, b) => {
    const priorityA = parseClientVisualNoticeConfig(a.filtros_json)?.prioridade ?? 0;
    const priorityB = parseClientVisualNoticeConfig(b.filtros_json)?.prioridade ?? 0;
    if (priorityA !== priorityB) return priorityB - priorityA;

    const dateA = new Date(a.criada_em || 0).getTime();
    const dateB = new Date(b.criada_em || 0).getTime();
    return dateB - dateA;
  });
}

export function parseSaoPauloDateTimeLocal(value: unknown) {
  const normalized = String(value || "").trim();
  if (!normalized) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) return null;

  const parsed = new Date(`${normalized}:00-03:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export function formatSaoPauloDateTimeLocal(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return formatter.format(date).replace(" ", "T");
}
