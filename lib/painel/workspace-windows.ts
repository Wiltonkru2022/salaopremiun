"use client";

import { getPainelUrl } from "@/lib/site-urls";

type WorkspaceWindowKind = "agenda" | "caixa";

const WORKSPACE_WINDOW_NAMES: Record<WorkspaceWindowKind, string> = {
  agenda: "salaopremium_agenda",
  caixa: "salaopremium_caixa",
};

function getPathnameFromHref(href: string) {
  try {
    return new URL(href, window.location.origin).pathname;
  } catch {
    return href.startsWith("/") ? href : `/${href}`;
  }
}

export function getWorkspaceWindowKind(href: string): WorkspaceWindowKind | null {
  const pathname = getPathnameFromHref(href);

  if (pathname === "/agenda" || pathname.startsWith("/agenda/")) {
    return "agenda";
  }

  if (pathname === "/caixa" || pathname.startsWith("/caixa/")) {
    return "caixa";
  }

  return null;
}

export function getWorkspaceWindowTarget(href: string) {
  const kind = getWorkspaceWindowKind(href);
  return kind ? WORKSPACE_WINDOW_NAMES[kind] : undefined;
}

export function openPainelWorkspaceWindow(href: string) {
  if (typeof window === "undefined") return;

  const target = getWorkspaceWindowTarget(href);
  const url = /^https?:\/\//i.test(href) ? href : getPainelUrl(href);

  if (!target) {
    window.location.assign(url);
    return;
  }

  const opened = window.open(url, target);

  if (opened) {
    opened.focus();
    return;
  }

  window.location.assign(url);
}
