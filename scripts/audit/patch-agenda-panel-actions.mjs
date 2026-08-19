import fs from "node:fs";

const mutationsFile = "components/agenda/useAgendaMutations.ts";
let content = fs.readFileSync(mutationsFile, "utf8");

content = content.replace(
  'import { cancelarAgendamentoComComanda } from "@/lib/agenda/cancelarAgendamentoComComanda";\n',
  ""
);

function replaceBlock(startMarker, endMarker, replacement) {
  const start = content.indexOf(startMarker);
  const end = content.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) {
    throw new Error(`Marcadores não encontrados: ${startMarker} / ${endMarker}`);
  }
  content = content.slice(0, start) + replacement + content.slice(end);
}

replaceBlock(
  "  const handleDeleteEvent = useCallback(",
  "  const handleQuickStatusChange = useCallback(",
  `  const handleDeleteEvent = useCallback(\n    async (item: Agendamento) => {\n      if (bloquearSeAssinaturaInvalida()) return;\n\n      abrirConfirmacao({\n        title: "Cancelar agendamento",\n        message:\n          "Deseja cancelar este agendamento? O atendimento permanecerá no histórico e os itens vinculados serão tratados com segurança.",\n        confirmLabel: "Cancelar agendamento",\n        tone: "warning",\n        onConfirm: async () => {\n          const response = await fetch("/api/painel/agendamentos/status", {\n            method: "POST",\n            credentials: "same-origin",\n            headers: { "Content-Type": "application/json" },\n            body: JSON.stringify({ idAgendamento: item.id, status: "cancelado" }),\n          });\n          const payload = await response.json().catch(() => ({}));\n          if (!response.ok || !payload.ok) {\n            throw new Error(String(payload.error || "Não foi possível cancelar o agendamento."));\n          }\n          await loadAgenda();\n        },\n      });\n    },\n    [bloquearSeAssinaturaInvalida, loadAgenda, abrirConfirmacao]\n  );\n\n`
);

replaceBlock(
  "  const handleQuickStatusChange = useCallback(",
  "  const handleCancelAppointment = useCallback(",
  `  const handleQuickStatusChange = useCallback(\n    async (\n      item: Agendamento,\n      nextStatus:\n        | "confirmado"\n        | "pendente"\n        | "atendido"\n        | "aguardando_pagamento"\n        | "cancelado"\n    ) => {\n      if (bloquearSeAssinaturaInvalida()) return;\n\n      const { error } = await monitorClientOperation(\n        {\n          module: "agenda",\n          action: "alterar_status_agendamento",\n          screen: "agenda_grid",\n          entity: "agendamento",\n          entityId: item.id,\n          details: {\n            idSalao,\n            statusAtual: item.status,\n            proximoStatus: nextStatus,\n          },\n          successMessage: "Status do agendamento atualizado.",\n          errorMessage: "Falha ao atualizar status do agendamento.",\n        },\n        async () => {\n          const response = await fetch("/api/painel/agendamentos/status", {\n            method: "POST",\n            credentials: "same-origin",\n            headers: { "Content-Type": "application/json" },\n            body: JSON.stringify({ idAgendamento: item.id, status: nextStatus }),\n          });\n          const payload = await response.json().catch(() => ({}));\n          return {\n            data: null,\n            error:\n              response.ok && payload.ok\n                ? null\n                : new Error(String(payload.error || "Falha ao atualizar status do agendamento.")),\n          };\n        }\n      );\n\n      if (error) {\n        console.error(error);\n        abrirAviso("Erro", "Não foi possível atualizar o status.", "danger");\n        return;\n      }\n\n      await loadAgenda();\n    },\n    [\n      bloquearSeAssinaturaInvalida,\n      idSalao,\n      loadAgenda,\n      abrirAviso,\n    ]\n  );\n\n`
);

replaceBlock(
  "  const handleCancelAppointment = useCallback(",
  "  const handleDeleteBlock = useCallback(",
  `  const handleCancelAppointment = useCallback(\n    async (item: Agendamento) => {\n      if (bloquearSeAssinaturaInvalida()) return;\n\n      abrirConfirmacao({\n        title: "Cancelar agendamento",\n        message:\n          "Deseja cancelar este agendamento? Os itens vinculados serão removidos da comanda e o horário poderá ser oferecido novamente.",\n        confirmLabel: "Cancelar agendamento",\n        tone: "warning",\n        onConfirm: async () => {\n          const response = await fetch("/api/painel/agendamentos/status", {\n            method: "POST",\n            credentials: "same-origin",\n            headers: { "Content-Type": "application/json" },\n            body: JSON.stringify({ idAgendamento: item.id, status: "cancelado" }),\n          });\n          const payload = await response.json().catch(() => ({}));\n          if (!response.ok || !payload.ok) {\n            throw new Error(String(payload.error || "Não foi possível cancelar o agendamento."));\n          }\n\n          setModalOpen(false);\n          setEditingItem(null);\n          await loadAgenda();\n        },\n      });\n    },\n    [\n      bloquearSeAssinaturaInvalida,\n      loadAgenda,\n      setEditingItem,\n      setModalOpen,\n      abrirConfirmacao,\n    ]\n  );\n\n`
);

fs.writeFileSync(mutationsFile, content, "utf8");

const modalFile = "components/agenda/AgendaModal.tsx";
let modal = fs.readFileSync(modalFile, "utf8");
modal = modal.replace('    { value: "cancelado", label: "Cancelado" },\n', "");
modal = modal.replace(
  'descricao="A agenda continua disponível para consulta e edição. O limite vale para novos horários criados no mes."',
  'descricao="A agenda continua disponível para consulta e edição. O limite vale para novos horários criados no mês."'
);
fs.writeFileSync(modalFile, modal, "utf8");

const saveRouteFile = "app/api/painel/agendamentos/salvar/route.ts";
let saveRoute = fs.readFileSync(saveRouteFile, "utf8");
const statusSetStart = saveRoute.indexOf("const STATUS_PERMITIDOS = new Set([\n");
const statusSetEnd = saveRoute.indexOf("]);", statusSetStart);
if (statusSetStart < 0 || statusSetEnd < 0) {
  throw new Error("STATUS_PERMITIDOS não encontrado na rota de salvar.");
}
const statusBlock = saveRoute.slice(statusSetStart, statusSetEnd);
const normalizedStatusBlock = statusBlock.replace('  "cancelado",\n', "");
saveRoute =
  saveRoute.slice(0, statusSetStart) +
  normalizedStatusBlock +
  saveRoute.slice(statusSetEnd);
fs.writeFileSync(saveRouteFile, saveRoute, "utf8");

console.log("Agenda do painel normalizada para ações server-side e cancelamento dedicado.");
