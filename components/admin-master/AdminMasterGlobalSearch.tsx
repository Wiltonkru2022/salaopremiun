"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Building2,
  CreditCard,
  Handshake,
  Search,
  ShieldCheck,
  Sparkles,
  Ticket,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

type SearchResultAction = {
  label: string;
  href: string;
};

type SearchResult = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  href: string;
  actions?: SearchResultAction[];
};

type SearchResponse = {
  ok?: boolean;
  results?: SearchResult[];
};

const TYPE_LABELS: Record<string, string> = {
  salao: "Salão",
  cliente: "Cliente",
  parceiro: "Parceiro",
  cobranca: "Cobrança",
  ticket: "Ticket",
  webhook: "Webhook",
  admin: "Admin",
  plano: "Plano",
};

const COMMANDS = [
  { label: "Novo ticket", description: "Abrir atendimento interno", href: "/admin-master/tickets/novo", icon: Ticket },
  { label: "Nova campanha", description: "Criar campanha de comunicação", href: "/admin-master/campanhas/nova", icon: Sparkles },
  { label: "Nova parceria", description: "Cadastrar empresa ou ação comercial", href: "/admin-master/parcerias#empresas", icon: Handshake },
  { label: "Abrir financeiro", description: "Receita, cobranças e inadimplência", href: "/admin-master/financeiro", icon: CreditCard },
  { label: "Ver salões", description: "Pesquisar e abrir Raio-X", href: "/admin-master/saloes", icon: Building2 },
  { label: "Abrir alertas", description: "Itens que exigem ação", href: "/admin-master/alertas", icon: Activity },
  { label: "Central de atividades", description: "Auditoria e alterações administrativas", href: "/admin-master/atividades", icon: Zap },
  { label: "Segurança", description: "Bloqueios e eventos sensíveis", href: "/admin-master/seguranca", icon: ShieldCheck },
];

export default function AdminMasterGlobalSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const deferredQuery = useDeferredValue(query.trim());

  useEffect(() => {
    function openPalette() {
      setOpen(true);
      window.setTimeout(() => inputRef.current?.focus(), 20);
    }
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openPalette();
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("admin-master-command-palette", openPalette as EventListener);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("admin-master-command-palette", openPalette as EventListener);
    };
  }, []);

  useEffect(() => {
    setOpen(false);
    setQuery("");
  }, [pathname]);

  useEffect(() => {
    if (deferredQuery.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    startTransition(() => {
      void fetch(`/api/admin-master/search?q=${encodeURIComponent(deferredQuery)}`, {
        signal: controller.signal,
        cache: "no-store",
      })
        .then(async (response) => {
          if (!response.ok) return { ok: false, results: [] } satisfies SearchResponse;
          return (await response.json()) as SearchResponse;
        })
        .then((payload) => setResults(Array.isArray(payload.results) ? payload.results : []))
        .catch((error: unknown) => {
          if (error && typeof error === "object" && "name" in error && error.name === "AbortError") return;
          setResults([]);
        })
        .finally(() => setLoading(false));
    });
    return () => controller.abort();
  }, [deferredQuery]);

  const commands = useMemo(() => {
    const normalized = deferredQuery.toLowerCase();
    if (!normalized) return COMMANDS;
    return COMMANDS.filter((command) => `${command.label} ${command.description}`.toLowerCase().includes(normalized));
  }, [deferredQuery]);

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          window.setTimeout(() => inputRef.current?.focus(), 20);
        }}
        className="flex h-10 w-full items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-left text-sm font-medium text-zinc-500 shadow-sm transition hover:border-violet-200 hover:text-zinc-700"
      >
        <Search size={16} className="shrink-0 text-zinc-400" />
        <span className="min-w-0 flex-1 truncate">Buscar ou executar comando</span>
        <span className="hidden rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-bold text-zinc-400 lg:inline-flex">Ctrl K</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[90] flex items-start justify-center bg-zinc-950/35 p-3 pt-[8vh] backdrop-blur-sm sm:p-6 sm:pt-[12vh]" onMouseDown={() => setOpen(false)}>
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 sm:px-5">
              <Search size={19} className="shrink-0 text-violet-600" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Salão, cliente, parceiro, ticket, cobrança..."
                className="h-10 min-w-0 flex-1 bg-transparent text-base font-semibold text-zinc-950 outline-none placeholder:font-medium placeholder:text-zinc-400"
              />
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" aria-label="Fechar busca"><X size={18} /></button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto p-2 sm:p-3">
              {commands.length ? (
                <div>
                  <div className="px-2 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">Comandos rápidos</div>
                  <div className="grid gap-1 sm:grid-cols-2">
                    {commands.slice(0, deferredQuery ? 5 : 8).map((command) => {
                      const Icon = command.icon;
                      return (
                        <button key={command.href} type="button" onClick={() => navigate(command.href)} className="flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-violet-50">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700"><Icon size={17} /></span>
                          <span className="min-w-0"><span className="block text-sm font-black text-zinc-900">{command.label}</span><span className="mt-0.5 block truncate text-xs text-zinc-500">{command.description}</span></span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {deferredQuery.length >= 2 ? (
                <div className="mt-3 border-t border-zinc-100 pt-3">
                  <div className="flex items-center justify-between px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                    <span>Resultados</span>{loading ? <span>Buscando...</span> : null}
                  </div>
                  {!loading && results.length ? results.map((result) => (
                    <div key={`${result.type}-${result.id}`} className="rounded-2xl px-3 py-3 transition hover:bg-zinc-50">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-600">{TYPE_LABELS[result.type] || result.type}</span>
                        <Link href={result.href} onClick={() => setOpen(false)} className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-black text-zinc-950">{result.title}</span>
                          <span className="mt-1 block text-xs leading-5 text-zinc-500">{result.subtitle}</span>
                        </Link>
                      </div>
                      {result.actions?.length ? (
                        <div className="mt-2 flex flex-wrap gap-2 pl-0 sm:pl-[76px]">
                          {result.actions.slice(0, 3).map((action) => (
                            <Link key={`${result.id}-${action.label}`} href={action.href} onClick={() => setOpen(false)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 text-[11px] font-bold text-zinc-700 hover:border-violet-200 hover:text-violet-700">
                              {result.type === "cliente" ? <UserRound size={12} /> : null}{action.label}
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )) : null}
                  {!loading && !results.length ? <div className="rounded-2xl bg-zinc-50 px-4 py-5 text-sm text-zinc-500">Nenhum resultado encontrado. Tente nome, telefone, e-mail, ticket, parceiro ou salão.</div> : null}
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2 border-t border-zinc-100 px-2 pt-3 text-xs text-zinc-400"><Zap size={14} /> Ctrl + K abre esta central de qualquer tela.</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
