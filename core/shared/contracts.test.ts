import { describe, expect, it } from "vitest";
import {
  CLIENT_FUNNEL_EVENTS,
  PROFESSIONAL_PRODUCTIVITY_EVENTS,
  STATUS_AGENDAMENTO,
  STATUS_COMANDA,
  STATUS_SINAL,
} from "./contracts";

describe("contratos compartilhados", () => {
  it("mantém os estados operacionais essenciais", () => {
    expect(STATUS_AGENDAMENTO).toContain("confirmado");
    expect(STATUS_AGENDAMENTO).toContain("cancelado");
    expect(STATUS_COMANDA).toEqual(
      expect.arrayContaining(["aberta", "fechada"])
    );
    expect(STATUS_SINAL).toContain("comprovante_enviado");
  });

  it("expõe todos os eventos de produto", () => {
    expect(CLIENT_FUNNEL_EVENTS).toEqual(
      expect.arrayContaining([
        "salao_visualizado",
        "servico_selecionado",
        "horario_selecionado",
        "login_iniciado",
        "reserva_confirmada",
        "sinal_pago",
      ])
    );
    expect(PROFESSIONAL_PRODUCTIVITY_EVENTS).toEqual(
      expect.arrayContaining([
        "agendamento_confirmado",
        "comanda_aberta",
        "comanda_finalizada",
        "sincronizacao_falhou",
        "modo_offline_ativado",
      ])
    );
  });
});
