import { getSupabaseAdmin } from "@/lib/supabase/admin";

/* ---------------- TYPES ---------------- */

type DiaTrabalho = {
  dia: string;
  ativo: boolean;
  inicio: string;
  fim: string;
};

type Pausa = {
  inicio: string;
  fim: string;
  descricao?: string;
};

type ValidarHorarioParams = {
  dataISO: string;
  horaInicio: string;
  duracaoMinutos: number;
  diasTrabalho: DiaTrabalho[];
  pausas: Pausa[];
};

type BuscarConflitosParams = {
  idSalao: string;
  idProfissional: string;
  dataISO: string;
  horaInicio: string;
  horaFim: string;
};

/* ---------------- UTILS ---------------- */

function hojeLocal() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function toDateLabel(dateISO: string) {
  const [y, m, d] = dateISO.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(new Date(y, m - 1, d));
}

function dayNamePt(dateISO: string) {
  const [y, m, d] = dateISO.split("-").map(Number);

  return new Intl.DateTimeFormat("pt-BR", { weekday: "long" })
    .format(new Date(y, m - 1, d))
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace("-feira", "")
    .toLowerCase()
    .trim();
}

function normalizeDia(v: string) {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace("-feira", "")
    .toLowerCase()
    .trim();
}

function timeToMinutes(v: string) {
  const [h, m] = v.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(v: number) {
  return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(
    v % 60
  ).padStart(2, "0")}`;
}

function overlaps(a1: number, a2: number, b1: number, b2: number) {
  return a1 < b2 && a2 > b1;
}

/* ---------------- SERVICES ---------------- */

export async function buscarConfiguracaoAgendaProfissional(
  idSalao: string,
  idProfissional: string
) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("profissionais")
    .select("id, nome, nome_exibicao, ativo, dias_trabalho, pausas")
    .eq("id", idProfissional)
    .eq("id_salao", idSalao)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Profissional não encontrado.");

  return {
    id: data.id,
    nome: data.nome_exibicao || data.nome,
    ativo: Boolean(data.ativo),
    diasTrabalho: data.dias_trabalho || [],
    pausas: data.pausas || [],
  };
}

export async function buscarServicoPorId(idSalao: string, idServico: string) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("servicos")
    .select("id, nome, duracao_minutos, preco, preco_padrao")
    .eq("id", idServico)
    .eq("id_salao", idSalao)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Serviço não encontrado.");

  return data;
}

export async function buscarConflitosNoHorario(params: BuscarConflitosParams) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("agendamentos")
    .select("*")
    .eq("id_salao", params.idSalao)
    .eq("profissional_id", params.idProfissional)
    .eq("data", params.dataISO)
    .not("status", "eq", "cancelado");

  if (error) throw new Error(error.message);

  const novoInicio = timeToMinutes(params.horaInicio);
  const novoFim = timeToMinutes(params.horaFim);

  return (data ?? []).filter((i: any) =>
    overlaps(
      novoInicio,
      novoFim,
      timeToMinutes(i.hora_inicio),
      timeToMinutes(i.hora_fim)
    )
  );
}

export function validarHorarioAgendamento({
  dataISO,
  horaInicio,
  duracaoMinutos,
  diasTrabalho,
  pausas,
}: ValidarHorarioParams) {
  const dia = dayNamePt(dataISO);

  const regra = diasTrabalho.find(
    (d) => normalizeDia(d.dia) === normalizeDia(dia)
  );

  if (!regra?.ativo) throw new Error("Não atende neste dia.");

  const ini = timeToMinutes(horaInicio);
  const fim = ini + duracaoMinutos;

  if (
    ini < timeToMinutes(regra.inicio) ||
    fim > timeToMinutes(regra.fim)
  ) {
    throw new Error("Fora do expediente.");
  }

  for (const p of pausas) {
    if (
      overlaps(
        ini,
        fim,
        timeToMinutes(p.inicio),
        timeToMinutes(p.fim)
      )
    ) {
      throw new Error("Horário em pausa.");
    }
  }

  return {
    horaInicio,
    horaFim: minutesToTime(fim),
  };
}

export async function buscarAgendaProfissional(
  idSalao: string,
  idProfissional: string,
  data?: string
) {
  const supabase = getSupabaseAdmin();

  const dataSelecionada = data || hojeLocal();

  const { data: agendamentos } = await supabase
    .from("agendamentos")
    .select("*")
    .eq("id_salao", idSalao)
    .eq("profissional_id", idProfissional)
    .eq("data", dataSelecionada);

  return {
    profissional: { id: idProfissional, nome: "Profissional" },
    dataSelecionada,
    dataLabel: toDateLabel(dataSelecionada),
    expedienteAtivo: true,
    horaInicioExpediente: "08:00",
    horaFimExpediente: "18:00",
    totalAtendimentos: agendamentos?.length || 0,
    totalPrevisto: 0,
    cards: [],
    labels: [],
    pausas: [],
    timelineHeight: 400,
  };
}