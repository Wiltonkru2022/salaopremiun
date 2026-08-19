"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CheckCircle2, ChevronRight, Globe, Loader2, PencilLine, Sparkles } from "lucide-react";
import AppModal from "@/components/ui/AppModal";
import { Field, TextInput } from "@/components/configuracoes/ui";
import { usePainelSession } from "@/components/layout/PainelSessionProvider";
import { createClient } from "@/lib/supabase/client";
import { asLooseSupabaseClient } from "@/lib/supabase/loose-client";

type PublicDetailsForm = {
  instagram_url: string;
  estacionamento: boolean;
  acessibilidade: boolean;
  wifi: boolean;
  cafe: boolean;
  ar_condicionado: boolean;
  formas_pagamento_publico: string;
};

type PublicDetailsRow = {
  instagram_url?: string | null;
  estacionamento?: boolean | null;
  acessibilidade?: boolean | null;
  wifi?: boolean | null;
  cafe?: boolean | null;
  ar_condicionado?: boolean | null;
  formas_pagamento_publico?: string[] | string | null;
};

const EMPTY_FORM: PublicDetailsForm = {
  instagram_url: "",
  estacionamento: false,
  acessibilidade: false,
  wifi: false,
  cafe: false,
  ar_condicionado: false,
  formas_pagamento_publico: "",
};

function serializePaymentMethods(value: string[] | string | null | undefined) {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  return String(value || "");
}

function parsePaymentMethods(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function normalizeInstagram(value: string) {
  const input = value.trim();
  if (!input) return null;

  if (/^https?:\/\//i.test(input)) {
    try {
      const url = new URL(input);
      if (!/(^|\.)instagram\.com$/i.test(url.hostname)) return input;
      return url.toString();
    } catch {
      return input;
    }
  }

  const handle = input
    .replace(/^@/, "")
    .replace(/^instagram\.com\//i, "")
    .replace(/^www\.instagram\.com\//i, "")
    .replace(/^\/+|\/+$/g, "")
    .split(/[/?#]/)[0]
    .trim();

  return handle ? `https://www.instagram.com/${handle}/` : null;
}

function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 transition hover:bg-zinc-100">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 rounded border-zinc-300"
      />
      <span className="min-w-0">
        <span className="block text-sm font-bold text-zinc-900">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-zinc-500">
          {description}
        </span>
      </span>
    </label>
  );
}

export default function PublicSalonDetailsEditor() {
  const pathname = usePathname();
  const router = useRouter();
  const { snapshot } = usePainelSession();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<PublicDetailsForm>(EMPTY_FORM);
  const idSalao = snapshot?.idSalao || "";

  const visible =
    pathname === "/perfil-salao" &&
    Boolean(idSalao) &&
    Boolean(snapshot?.permissoes?.perfil_salao_editar);

  useEffect(() => {
    if (!open || !idSalao) return;

    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError("");
        setMessage("");
        const supabase = createClient();
        const { data, error: queryError } = await supabase
          .from("saloes")
          .select(
            "instagram_url, estacionamento, acessibilidade, wifi, cafe, ar_condicionado, formas_pagamento_publico"
          )
          .eq("id", idSalao)
          .maybeSingle();

        if (queryError) throw queryError;
        if (!active) return;

        const row = (data || {}) as PublicDetailsRow;
        setForm({
          instagram_url: row.instagram_url || "",
          estacionamento: Boolean(row.estacionamento),
          acessibilidade: Boolean(row.acessibilidade),
          wifi: Boolean(row.wifi),
          cafe: Boolean(row.cafe),
          ar_condicionado: Boolean(row.ar_condicionado),
          formas_pagamento_publico: serializePaymentMethods(
            row.formas_pagamento_publico
          ),
        });
      } catch (loadError) {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Não foi possível carregar as informações públicas."
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [open, idSalao]);

  if (!visible) return null;

  async function save() {
    if (!idSalao) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");
      const supabase = createClient();
      const payload = {
        instagram_url: normalizeInstagram(form.instagram_url),
        estacionamento: form.estacionamento,
        acessibilidade: form.acessibilidade,
        wifi: form.wifi,
        cafe: form.cafe,
        ar_condicionado: form.ar_condicionado,
        formas_pagamento_publico: parsePaymentMethods(
          form.formas_pagamento_publico
        ),
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from("saloes")
        .update(payload)
        .eq("id", idSalao);

      if (updateError) throw updateError;

      try {
        await asLooseSupabaseClient(supabase).rpc(
          "refresh_client_app_marketplace_cache",
          { p_id_salao: idSalao }
        );
      } catch {
        // A vitrine possui fallback ao vivo quando o cache não está disponível.
      }

      setForm((current) => ({
        ...current,
        instagram_url: payload.instagram_url || "",
        formas_pagamento_publico: payload.formas_pagamento_publico.join(", "),
      }));
      setMessage("Informações públicas atualizadas com sucesso.");
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Não foi possível salvar as informações públicas."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="overflow-hidden rounded-[24px] border border-zinc-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-between gap-4 p-4 text-left transition hover:bg-zinc-50 sm:p-5"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-700 ring-1 ring-amber-100">
              <Globe size={19} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-black text-zinc-950">Informações da vitrine</div>
              <div className="mt-1 text-xs leading-5 text-zinc-500">
                Instagram, pagamentos e comodidades exibidas no App Cliente.
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-sm font-bold text-zinc-700">
            <span className="hidden sm:inline">Editar</span>
            <ChevronRight size={18} />
          </div>
        </button>
      </section>

      <AppModal
        open={open}
        onClose={() => {
          if (!saving) setOpen(false);
        }}
        title="Informações da vitrine"
        description="Cadastre somente o que realmente existe no salão. Esses dados aparecem no perfil público do App Cliente."
        eyebrow="Vitrine e portfólio"
        maxWidthClassName="max-w-3xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={saving}
              className="rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <CheckCircle2 size={16} />
              )}
              Salvar informações
            </button>
          </>
        }
      >
        {loading ? (
          <div className="flex min-h-52 items-center justify-center gap-3 text-sm font-semibold text-zinc-600">
            <Loader2 className="animate-spin" size={20} />
            Carregando informações do salão...
          </div>
        ) : (
          <div className="space-y-5">
            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {error}
              </div>
            ) : null}
            {message ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                {message}
              </div>
            ) : null}

            <div className="rounded-[22px] border border-zinc-200 bg-zinc-50 p-4">
              <div className="flex items-center gap-2 text-sm font-black text-zinc-950">
                <Globe size={17} />
                Redes e pagamentos
              </div>
              <div className="mt-4 space-y-4">
                <Field label="Instagram">
                  <TextInput
                    value={form.instagram_url}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        instagram_url: event.target.value,
                      }))
                    }
                    placeholder="@seusalao ou https://instagram.com/seusalao"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                </Field>
                <Field label="Formas de pagamento">
                  <TextInput
                    value={form.formas_pagamento_publico}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        formas_pagamento_publico: event.target.value,
                      }))
                    }
                    placeholder="Pix, Crédito, Débito, Dinheiro"
                  />
                </Field>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 text-sm font-black text-zinc-950">
                <Sparkles size={17} />
                Estrutura e comodidades
              </div>
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                Marque somente itens que o salão realmente oferece. Itens desmarcados não aparecem para o cliente.
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <ToggleField label="Estacionamento" description="O salão possui estacionamento disponível para clientes." checked={form.estacionamento} onChange={(checked) => setForm((current) => ({ ...current, estacionamento: checked }))} />
                <ToggleField label="Acessibilidade" description="O espaço possui recursos de acesso para pessoas com mobilidade reduzida." checked={form.acessibilidade} onChange={(checked) => setForm((current) => ({ ...current, acessibilidade: checked }))} />
                <ToggleField label="Wi-Fi" description="Há Wi-Fi disponível para clientes durante o atendimento." checked={form.wifi} onChange={(checked) => setForm((current) => ({ ...current, wifi: checked }))} />
                <ToggleField label="Café" description="O salão oferece café ou cortesia equivalente aos clientes." checked={form.cafe} onChange={(checked) => setForm((current) => ({ ...current, cafe: checked }))} />
                <ToggleField label="Ar-condicionado" description="O ambiente de atendimento possui climatização por ar-condicionado." checked={form.ar_condicionado} onChange={(checked) => setForm((current) => ({ ...current, ar_condicionado: checked }))} />
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
              O App Cliente mostra somente os dados marcados e salvos aqui.
            </div>
          </div>
        )}
      </AppModal>
    </>
  );
}
