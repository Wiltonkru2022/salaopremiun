"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ModuleAction =
  | {
      kind: "api";
      endpoint: string;
      successLabel: string;
      loadingLabel: string;
    }
  | {
      kind: "link";
      href: string;
      hint?: string;
    }
  | {
      kind: "feedback";
      message: string;
    };

type ActionState = "idle" | "loading" | "success" | "error";

function normalizeAction(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function resolveModuleAction(action: string): ModuleAction {
  const normalized = normalizeAction(action);

  if (normalized === "sincronizar alertas") {
    return {
      kind: "api",
      endpoint: "/api/admin-master/alertas/sincronizar",
      loadingLabel: "Sincronizando...",
      successLabel: "Alertas sincronizados",
    };
  }

  if (
    normalized === "sincronizar webhooks" ||
    normalized === "reprocessar diagnostico"
  ) {
    return {
      kind: "api",
      endpoint: "/api/admin-master/webhooks/sincronizar",
      loadingLabel: "Sincronizando...",
      successLabel: "Webhooks sincronizados",
    };
  }

  if (normalized === "testar endpoint asaas") {
    return {
      kind: "api",
      endpoint: "/api/admin-master/webhooks/diagnostico",
      loadingLabel: "Testando endpoint...",
      successLabel: "Endpoint Asaas OK",
    };
  }

  if (
    normalized === "rodar sincronizacao" ||
    normalized === "reprocessar eventos"
  ) {
    return {
      kind: "api",
      endpoint: "/api/admin-master/operacao/sincronizar",
      loadingLabel: "Rodando...",
      successLabel: "Operacao sincronizada",
    };
  }

  if (
    normalized === "avaliar trial extra" ||
    normalized === "recalcular score"
  ) {
    return {
      kind: "api",
      endpoint: "/api/admin-master/checklists/avaliar-trial-extra",
      loadingLabel: "Avaliando...",
      successLabel: "Trial e score avaliados",
    };
  }

  const linkByAction: Record<string, string> = {
    "abrir ticket": "/admin-master/tickets",
    "criar ticket": "/admin-master/tickets",
    "criar alerta": "/admin-master/alertas",
    "abrir saloes": "/admin-master/saloes",
    "abrir tickets": "/admin-master/tickets",
    "abrir cobrancas": "/admin-master/assinaturas/cobrancas",
    "abrir planos": "/admin-master/planos",
    "abrir recursos": "/admin-master/recursos",
    "abrir financeiro": "/admin-master/financeiro",
    "abrir relatorios": "/admin-master/relatorios",
    "abrir operacao": "/admin-master/operacao",
    "abrir webhooks": "/admin-master/webhooks",
    "abrir logs": "/admin-master/logs",
    "abrir alertas": "/admin-master/alertas",
    "abrir suporte": "/admin-master/suporte",
    "abrir notificacoes": "/admin-master/notificacoes",
    "abrir campanhas": "/admin-master/campanhas",
    "abrir whatsapp": "/admin-master/whatsapp",
    "abrir feature flags": "/admin-master/feature-flags",
    "abrir admins internos": "/admin-master/usuarios-admin",
    "abrir checklists": "/admin-master/checklists",
    "abrir configs globais": "/admin-master/configuracoes-globais",
    "ver saloes": "/admin-master/saloes",
    "ver suporte": "/admin-master/suporte",
    "ver tickets": "/admin-master/tickets",
    "ver notificacoes": "/admin-master/notificacoes",
    "ver campanhas": "/admin-master/campanhas",
    "ver whatsapp": "/admin-master/whatsapp",
    "ver pacotes whatsapp": "/admin-master/whatsapp/pacotes",
    "ver templates whatsapp": "/admin-master/whatsapp/templates",
    "ver feature flags": "/admin-master/feature-flags",
    "ver admins internos": "/admin-master/usuarios-admin",
    "ver configs globais": "/admin-master/configuracoes-globais",
    "ver logs": "/admin-master/logs",
    assumir: "/admin-master/tickets",
    responder: "/admin-master/tickets",
    "alterar status": "/admin-master/tickets",
    "entrar como salao": "/admin-master/saloes",
    "ver detalhes": "/admin-master/saloes",
    "bloquear/desbloquear": "/admin-master/saloes",
    "criar nota interna": "/admin-master/saloes",
    "trocar plano": "/admin-master/assinaturas",
    "ajustar vencimento": "/admin-master/assinaturas",
    "gerar cobranca": "/admin-master/assinaturas/cobrancas",
    "gerar cobranca manual": "/admin-master/assinaturas/cobrancas",
    "reenviar cobranca": "/admin-master/assinaturas/cobrancas",
    "copiar link": "/admin-master/assinaturas/cobrancas",
    reenviar: "/admin-master/assinaturas/cobrancas",
    "reprocessar webhook": "/admin-master/webhooks",
    reprocessar: "/admin-master/webhooks",
    "marcar resolvido": "/admin-master/webhooks",
    "ver checkout travado": "/admin-master/logs",
    "ver checkouts travados": "/admin-master/logs",
    "marcar ajuste manual": "/admin-master/assinaturas/cobrancas",
    "ver payload asaas": "/admin-master/webhooks",
    "ver payload": "/admin-master/webhooks",
    "auditar falhas": "/admin-master/logs",
    "resolver alerta": "/admin-master/alertas",
    resolver: "/admin-master/alertas",
    "ver webhooks com erro": "/admin-master/webhooks",
    "investigar tenant guard": "/admin-master/logs",
    "abrir ticket interno": "/admin-master/tickets",
    "reconciliar checkout": "/admin-master/logs",
    "exportar logs": "/admin-master/logs",
    "ver detalhe": "/admin-master/logs",
    "vincular ticket": "/admin-master/tickets",
    exportar: "/admin-master/relatorios",
    "editar preco e limites": "/admin-master/planos",
    "ajustar matriz de recursos": "/admin-master/recursos",
    "duplicar plano": "/admin-master/planos",
    "ver saloes no plano": "/admin-master/saloes",
    "nova notificacao": "/admin-master/notificacoes/nova",
    agendar: "/admin-master/notificacoes/nova",
    "enviar agora": "/admin-master/notificacoes",
    duplicar: "/admin-master/notificacoes",
    "criar campanha": "/admin-master/campanhas/nova",
    pausar: "/admin-master/campanhas",
    encerrar: "/admin-master/campanhas",
    "ver metricas": "/admin-master/campanhas",
    "notificar cliente": "/admin-master/notificacoes/nova",
    "corrigir manualmente": "/admin-master/operacao",
    "auditar erros": "/admin-master/logs",
    "adicionar pacote": "/admin-master/whatsapp/pacotes",
    "ajustar creditos": "/admin-master/whatsapp/pacotes",
    "suspender envios": "/admin-master/whatsapp",
    ativar: "/admin-master/feature-flags",
    "liberar por plano": "/admin-master/feature-flags",
    "liberar para salao": "/admin-master/feature-flags",
    "criar admin": "/admin-master/usuarios-admin",
    "editar permissoes": "/admin-master/usuarios-admin",
    suspender: "/admin-master/usuarios-admin",
    "forcar logout": "/admin-master/usuarios-admin",
    "ver criterios": "/admin-master/checklists",
    "ver inadimplentes": "/admin-master/assinaturas/cobrancas",
    "exportar receita": "/admin-master/financeiro",
    "recalcular assinaturas": "/admin-master/assinaturas",
    "ver ultimos erros": "/admin-master/logs",
    "ver crescimento": "/admin-master/relatorios",
    "ver uso por modulo": "/admin-master/relatorios",
    "exportar relatorio": "/admin-master/relatorios",
    "publicar aviso": "/admin-master/configuracoes-globais",
    "ativar manutencao": "/admin-master/configuracoes-globais",
    "salvar template": "/admin-master/configuracoes-globais",
    auditar: "/admin-master/logs",
  };

  const href = linkByAction[normalized];
  if (href) return { kind: "link", href };

  return {
    kind: "feedback",
    message:
      "Esta acao precisa de um registro especifico na tabela ou de uma tela dedicada.",
  };
}

function buttonClass(variant: "pill" | "list", state: ActionState) {
  if (variant === "pill") {
    return `inline-flex items-center rounded-full border px-4 py-2 text-sm font-bold transition ${
      state === "success"
        ? "border-emerald-300 bg-emerald-100 text-emerald-900"
        : "border-white/15 bg-white/10 text-white hover:bg-white/20"
    }`;
  }

  return `block w-full rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${
    state === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : state === "error"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-zinc-200 text-zinc-800 hover:border-zinc-950 hover:bg-zinc-950 hover:text-white"
  }`;
}

export default function AdminMasterModuleActionButton({
  action,
  variant = "list",
}: {
  action: string;
  variant?: "pill" | "list";
}) {
  const router = useRouter();
  const [state, setState] = useState<ActionState>("idle");
  const [label, setLabel] = useState(action);
  const resolved = resolveModuleAction(action);

  if (resolved.kind === "link") {
    return (
      <Link
        href={resolved.href}
        className={buttonClass(variant, "idle")}
        title={`Abrir ${resolved.href}`}
      >
        {action}
      </Link>
    );
  }

  async function handleClick() {
    const currentAction = resolveModuleAction(action);

    if (currentAction.kind === "feedback") {
      setState("error");
      setLabel(currentAction.message);
      window.setTimeout(() => {
        setState("idle");
        setLabel(action);
      }, 2500);
      return;
    }

    if (currentAction.kind !== "api") return;

    setState("loading");
    setLabel(currentAction.loadingLabel);

    try {
      const response = await fetch(currentAction.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || data.ok === false) {
        throw new Error(data.error || "Nao foi possivel executar esta acao.");
      }

      setState("success");
      setLabel(currentAction.successLabel);
      router.refresh();
    } catch (error) {
      setState("error");
      setLabel(error instanceof Error ? error.message : "Falha na acao.");
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state === "loading"}
      className={buttonClass(variant, state)}
      title={state === "error" ? label : undefined}
    >
      {label}
    </button>
  );
}
