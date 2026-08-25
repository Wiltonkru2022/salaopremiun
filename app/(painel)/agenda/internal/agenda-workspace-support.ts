import { normalizeTimeString } from "@/lib/utils/agenda";

export const AGENDA_WORKSPACE_STATE_KEY = "salaopremium:painel:agenda:workspace:v1";

export type ClienteHistoricoItem = {
  id: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  status: string;
  servicoNome: string;
  observacoes: string | null;
  sinalStatus?: string | null;
  sinalComprovantePath?: string | null;
};

export function getAgendaReturnPath() {
  if (typeof window === "undefined") return "/agenda";
  return `${window.location.pathname}${window.location.search}`;
}

export function withAgendaReturnTo(href: string) {
  if (typeof window === "undefined") return href;

  const url = new URL(href, window.location.origin);
  url.searchParams.set("returnTo", getAgendaReturnPath());
  return `${url.pathname}${url.search}`;
}

export function addMinutesToSlotTime(time: string, minutes: number) {
  const [hour, minute] = normalizeTimeString(time).split(":").map(Number);
  const total = hour * 60 + minute + minutes;
  return normalizeTimeString(
    `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(
      total % 60
    ).padStart(2, "0")}`
  );
}
