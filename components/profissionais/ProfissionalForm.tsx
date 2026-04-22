"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getUsuarioLogado } from "@/lib/auth/getUsuarioLogado";
import { getErrorMessage } from "@/lib/get-error-message";
import type {
  ProfissionalProcessarBody,
  ProfissionalProcessarResponse,
} from "@/types/profissional";


type Servico = {
  id: string;
  nome: string;
  duracao_minutos?: number | null;
  preco?: number | null;
};

type ProfissionalServico = {
  id_servico: string;
  duracao_minutos: string;
  ativo: boolean;
};

type DiaTrabalho = {
  dia: string;
  ativo: boolean;
  inicio: string;
  fim: string;
};

type Pausa = {
  inicio: string;
  fim: string;
  descricao: string;
};

type AssistenteOption = {
  id: string;
  nome: string;
  nome_social?: string | null;
  categoria?: string | null;
  cargo?: string | null;
  foto_url?: string | null;
  status?: string | null;
  ativo?: boolean | null;
  tipo_profissional?: string | null;
};

type Profissional = {
  id?: string;
  id_salao: string;
  nome: string;
  nome_social: string;
  foto_url: string;
  categoria: string;
  cargo: string;
  cpf: string;
  rg: string;
  data_nascimento: string;
  telefone: string;
  whatsapp: string;
  email: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  especialidades: string[];
  data_admissao: string;
  bio: string;
  tipo_profissional: string;
  tipo_vinculo: string;
  comissao_produto_percentual: string;
  pix_tipo: string;
  pix_chave: string;
  nivel_acesso: string;
  status: string;
  ativo: boolean;
  dias_trabalho: DiaTrabalho[];
  pausas: Pausa[];
};

type ProfissionalAcesso = {
  ativo: boolean;
  cpf: string;
  senha: string;
  possuiCadastro: boolean;
};

type ProfissionalServicoRow = {
  id_servico: string;
  duracao_minutos?: number | string | null;
  ativo?: boolean | null;
};

type ProfissionalAssistenteRow = {
  id_assistente: string;
};

const DIAS_FIXOS: DiaTrabalho[] = [
  { dia: "Segunda", ativo: false, inicio: "09:00", fim: "18:00" },
  { dia: "Terça", ativo: true, inicio: "09:00", fim: "18:00" },
  { dia: "Quarta", ativo: true, inicio: "09:00", fim: "18:00" },
  { dia: "Quinta", ativo: true, inicio: "09:00", fim: "18:00" },
  { dia: "Sexta", ativo: true, inicio: "09:00", fim: "18:00" },
  { dia: "Sábado", ativo: true, inicio: "09:00", fim: "18:00" },
  { dia: "Domingo", ativo: false, inicio: "09:00", fim: "18:00" },
];

const PAUSA_INICIAL: Pausa[] = [
  { inicio: "12:00", fim: "13:00", descricao: "Almoço" },
];

const initialForm: Profissional = {
  id_salao: "",
  nome: "",
  nome_social: "",
  foto_url: "",
  categoria: "",
  cargo: "",
  cpf: "",
  rg: "",
  data_nascimento: "",
  telefone: "",
  whatsapp: "",
  email: "",
  endereco: "",
  numero: "",
  bairro: "",
  cidade: "",
  estado: "",
  cep: "",
  especialidades: [],
  data_admissao: "",
  bio: "",
  tipo_profissional: "profissional",
  tipo_vinculo: "AUTONOMO",
  comissao_produto_percentual: "0",
  pix_tipo: "CPF",
  pix_chave: "",
  nivel_acesso: "proprio",
  status: "ativo",
  ativo: true,
  dias_trabalho: DIAS_FIXOS,
  pausas: PAUSA_INICIAL,
};

const initialAcesso: ProfissionalAcesso = {
  ativo: false,
  cpf: "",
  senha: "",
  possuiCadastro: false,
};

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

function onlyDigits(value: string) {
  return (value || "").replace(/\D/g, "");
}

function isDiaTrabalho(value: unknown): value is DiaTrabalho {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.dia === "string" &&
    typeof item.ativo === "boolean" &&
    typeof item.inicio === "string" &&
    typeof item.fim === "string"
  );
}

function isPausa(value: unknown): value is Pausa {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.inicio === "string" &&
    typeof item.fim === "string" &&
    typeof item.descricao === "string"
  );
}


export default function ProfissionalForm({
  modo,
}: {
  modo: "novo" | "editar";
}) {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();

  const profissionalId = typeof params?.id === "string" ? params.id : "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  const [idSalao, setIdSalao] = useState("");
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [especialidadesInput, setEspecialidadesInput] = useState("");
  const [fotoFile, setFotoFile] = useState<File | null>(null);

  const [assistentesDisponiveis, setAssistentesDisponiveis] = useState<AssistenteOption[]>([]);
  const [assistentesSelecionados, setAssistentesSelecionados] = useState<string[]>([]);

  const [form, setForm] = useState<Profissional>(initialForm);
  const [servicosSelecionados, setServicosSelecionados] = useState<ProfissionalServico[]>([]);
  const [acesso, setAcesso] = useState<ProfissionalAcesso>(initialAcesso);

  const especialidadesPreview = useMemo(() => {
    return especialidadesInput
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }, [especialidadesInput]);

  useEffect(() => {
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, profissionalId]);

  useEffect(() => {
    setAcesso((prev) => ({
      ...prev,
      cpf: onlyDigits(form.cpf),
    }));
  }, [form.cpf]);

  useEffect(() => {
    if (form.tipo_profissional !== "assistente") return;

    setAcesso((prev) => ({
      ...prev,
      ativo: false,
      senha: "",
    }));
    setServicosSelecionados([]);
    setAssistentesSelecionados([]);
  }, [form.tipo_profissional]);

  async function bootstrap() {
    try {
      setLoading(true);
      setErro("");
      setMsg("");

      const usuarioLogado = await getUsuarioLogado();

      if (!usuarioLogado) {
        throw new Error("Usuário não autenticado.");
      }

      if (!usuarioLogado.idSalao) {
        throw new Error("Não foi possível identificar o salão do usuário.");
      }

      setIdSalao(usuarioLogado.idSalao);
      setForm((prev) => ({ ...prev, id_salao: usuarioLogado.idSalao }));

      const { data: listaServicos, error: servicosError } = await supabase
        .from("servicos")
        .select("id, nome, duracao_minutos, preco")
        .eq("id_salao", usuarioLogado.idSalao)
        .order("nome", { ascending: true });

      if (servicosError) throw servicosError;

      setServicos((listaServicos as Servico[]) || []);

      const { data: listaAssistentes, error: assistentesDisponiveisError } = await supabase
        .from("profissionais")
        .select("id, nome, nome_social, categoria, cargo, foto_url, status, ativo, tipo_profissional")
        .eq("id_salao", usuarioLogado.idSalao)
        .eq("tipo_profissional", "assistente")
        .order("nome", { ascending: true });

      if (assistentesDisponiveisError) throw assistentesDisponiveisError;

      setAssistentesDisponiveis((listaAssistentes as AssistenteOption[]) || []);

      if (modo === "editar" && profissionalId) {
        await carregarProfissional(profissionalId, usuarioLogado.idSalao);
      }
    } catch (e: unknown) {
      setErro(getErrorMessage(e, "Erro ao carregar formulário."));
    } finally {
      setLoading(false);
    }
  }

  async function carregarProfissional(id: string, salaoId: string) {
    const { data, error } = await supabase
      .from("profissionais")
      .select("ativo, bairro, bio, cargo, categoria, cep, cidade, comissao_percentual, comissao_produto_percentual, cor_agenda, cpf, data_admissao, data_nascimento, dias_trabalho, eh_assistente, email, endereco, especialidades, estado, foto, foto_url, id, id_profissional_principal, id_salao, nivel_acesso, nome, nome_exibicao, nome_social, numero, ordem_agenda, pausas, percentual_comissao_assistente, permite_comissao, pix_chave, pix_tipo, pode_usar_sistema, recebe_comissao, rg, status, telefone, tipo_profissional, tipo_vinculo, whatsapp")
      .eq("id", id)
      .eq("id_salao", salaoId)
      .limit(1);

    if (error) throw error;

    const profissional = data?.[0];
    if (!profissional) throw new Error("Profissional não encontrado.");

    const dias =
      Array.isArray(profissional.dias_trabalho) && profissional.dias_trabalho.length > 0
        ? profissional.dias_trabalho.filter(isDiaTrabalho)
        : DIAS_FIXOS;

    const pausas =
      Array.isArray(profissional.pausas) && profissional.pausas.length > 0
        ? profissional.pausas.filter(isPausa)
        : PAUSA_INICIAL;

    setForm({
      id: profissional.id,
      id_salao: profissional.id_salao || salaoId,
      nome: profissional.nome || "",
      nome_social: profissional.nome_social || "",
      foto_url: profissional.foto_url || profissional.foto || "",
      categoria: profissional.categoria || "",
      cargo: profissional.cargo || "",
      cpf: profissional.cpf || "",
      rg: profissional.rg || "",
      data_nascimento: profissional.data_nascimento || "",
      telefone: profissional.telefone || "",
      whatsapp: profissional.whatsapp || "",
      email: profissional.email || "",
      endereco: profissional.endereco || "",
      numero: profissional.numero || "",
      bairro: profissional.bairro || "",
      cidade: profissional.cidade || "",
      estado: profissional.estado || "",
      cep: profissional.cep || "",
      especialidades: profissional.especialidades || [],
      data_admissao: profissional.data_admissao || "",
      bio: profissional.bio || "",
      tipo_profissional: profissional.tipo_profissional || "profissional",
      tipo_vinculo: profissional.tipo_vinculo || "AUTONOMO",
      comissao_produto_percentual: String(
        profissional.comissao_produto_percentual ?? 0
      ),
      pix_tipo: profissional.pix_tipo || "CPF",
      pix_chave: profissional.pix_chave || "",
      nivel_acesso: profissional.nivel_acesso || "proprio",
      status: profissional.status || "ativo",
      ativo:
        profissional.ativo !== null && profissional.ativo !== undefined
          ? profissional.ativo
          : profissional.status === "ativo",
      dias_trabalho: dias,
      pausas: pausas,
    });

    setEspecialidadesInput((profissional.especialidades || []).join(", "));

    const { data: vinculos, error: vinculosError } = await supabase
      .from("profissional_servicos")
      .select("id_servico, duracao_minutos, ativo")
      .eq("id_profissional", id);

    if (vinculosError) throw vinculosError;

    setServicosSelecionados(
      (vinculos || []).map((item: ProfissionalServicoRow) => ({
        id_servico: item.id_servico,
        duracao_minutos: String(item.duracao_minutos || 0),
        ativo: item.ativo ?? true,
      }))
    );

    const { data: assistentesVinculados, error: assistentesVinculadosError } = await supabase
      .from("profissional_assistentes")
      .select("id_assistente")
      .eq("id_salao", salaoId)
      .eq("id_profissional", id);

    if (assistentesVinculadosError) throw assistentesVinculadosError;

    setAssistentesSelecionados(
      (assistentesVinculados || []).map(
        (item: ProfissionalAssistenteRow) => item.id_assistente
      )
    );

    const { data: acessoRow, error: acessoError } = await supabase
      .from("profissionais_acessos")
      .select("cpf, ativo")
      .eq("id_profissional", id)
      .maybeSingle();

    if (acessoError) throw acessoError;

    if (acessoRow) {
      setAcesso({
        ativo: acessoRow.ativo ?? false,
        cpf: acessoRow.cpf || onlyDigits(profissional.cpf || ""),
        senha: "",
        possuiCadastro: true,
      });
    } else {
      setAcesso({
        ativo: false,
        cpf: onlyDigits(profissional.cpf || ""),
        senha: "",
        possuiCadastro: false,
      });
    }
  }

  function handleChange<K extends keyof Profissional>(field: K, value: Profissional[K]) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleDiaChange(index: number, field: keyof DiaTrabalho, value: string | boolean) {
    setForm((prev) => {
      const dias = [...prev.dias_trabalho];
      dias[index] = { ...dias[index], [field]: value };
      return { ...prev, dias_trabalho: dias };
    });
  }

  function handlePausaChange(index: number, field: keyof Pausa, value: string) {
    setForm((prev) => {
      const pausas = [...prev.pausas];
      pausas[index] = { ...pausas[index], [field]: value };
      return { ...prev, pausas };
    });
  }

  function addPausa() {
    setForm((prev) => ({
      ...prev,
      pausas: [...prev.pausas, { inicio: "00:00", fim: "00:00", descricao: "" }],
    }));
  }

  function removePausa(index: number) {
    setForm((prev) => ({
      ...prev,
      pausas: prev.pausas.filter((_, i) => i !== index),
    }));
  }

  function toggleServico(servico: Servico) {
    setServicosSelecionados((prev) => {
      const existe = prev.find((item) => item.id_servico === servico.id);
      if (existe) {
        return prev.filter((item) => item.id_servico !== servico.id);
      }

      return [
        ...prev,
        {
          id_servico: servico.id,
          duracao_minutos: String(servico.duracao_minutos || 60),
          ativo: true,
        },
      ];
    });
  }

  function changeDuracaoServico(idServico: string, duracao: string) {
    setServicosSelecionados((prev) =>
      prev.map((item) =>
        item.id_servico === idServico ? { ...item, duracao_minutos: duracao } : item
      )
    );
  }

  function servicoEstaSelecionado(idServico: string) {
    return servicosSelecionados.some((item) => item.id_servico === idServico);
  }

  function toggleAssistente(idAssistente: string) {
    setAssistentesSelecionados((prev) =>
      prev.includes(idAssistente)
        ? prev.filter((item) => item !== idAssistente)
        : [...prev, idAssistente]
    );
  }

  async function uploadFoto(idProfissional: string) {
    if (!fotoFile) return form.foto_url;

    const ext = fotoFile.name.split(".").pop();
    const fileName = `${idSalao}/${idProfissional}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("profissionais")
      .upload(fileName, fotoFile, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("profissionais").getPublicUrl(fileName);
    return data.publicUrl;
  }
async function salvarAcessoProfissional(idProfissional: string) {
  const cpfLimpo = onlyDigits(acesso.cpf || form.cpf);

  if (!cpfLimpo) {
    throw new Error("Informe o CPF do profissional para criar o acesso ao app.");
  }

  const response = await fetch("/api/profissionais-acessos", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id_profissional: idProfissional,
      cpf: cpfLimpo,
      senha: acesso.senha.trim() || "",
      ativo: acesso.ativo,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Erro ao salvar acesso do profissional.");
  }
}

  async function salvar() {
    try {
      setSaving(true);
      setErro("");
      setMsg("");

      if (!form.nome.trim()) {
        throw new Error("Informe o nome do profissional.");
      }

      const especialidadesTratadas = especialidadesInput
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      const isAssistenteSalao = form.tipo_profissional === "assistente";

      const payloadBase = {
        id_salao: idSalao,
        nome: form.nome.trim(),
        nome_social: form.nome_social.trim() || null,
        categoria: form.categoria.trim() || form.cargo.trim() || null,
        cargo: form.cargo.trim() || null,
        cpf: form.cpf.trim() || null,
        rg: form.rg.trim() || null,
        data_nascimento: form.data_nascimento || null,
        telefone: form.telefone.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        email: form.email.trim() || null,
        endereco: form.endereco.trim() || null,
        numero: form.numero.trim() || null,
        bairro: form.bairro.trim() || null,
        cidade: form.cidade.trim() || null,
        estado: form.estado.trim() || null,
        cep: form.cep.trim() || null,
        especialidades: especialidadesTratadas,
        data_admissao: form.data_admissao || null,
        bio: form.bio.trim() || null,
        tipo_profissional: form.tipo_profissional || "profissional",
        tipo_vinculo: form.tipo_vinculo || null,
        comissao_produto_percentual: Number(form.comissao_produto_percentual || 0),
        pix_tipo: form.pix_tipo || null,
        pix_chave: form.pix_chave.trim() || null,
        nivel_acesso: isAssistenteSalao ? "sem_acesso" : form.nivel_acesso || "proprio",
        status: form.ativo ? "ativo" : "inativo",
        ativo: form.ativo,
        dias_trabalho: form.dias_trabalho,
        pausas: form.pausas.filter((p) => p.inicio && p.fim),
        foto_url: form.foto_url || null,
      };

      const requestBody: ProfissionalProcessarBody = {
        acao: modo === "novo" ? "criar" : "atualizar",
        idSalao,
        idProfissional: form.id || null,
        profissional: payloadBase,
        servicos: isAssistenteSalao ? [] : servicosSelecionados,
        assistentes: isAssistenteSalao ? [] : assistentesSelecionados,
      };

      const salvarResponse = await fetch("/api/profissionais/processar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const salvarResult =
        (await salvarResponse.json()) as ProfissionalProcessarResponse;

      if (!salvarResponse.ok) {
        throw new Error(salvarResult.error || "Erro ao salvar profissional.");
      }

      const idProfissional = salvarResult.idProfissional || form.id || "";

      if (!idProfissional) {
        throw new Error("Não foi possível obter o ID do profissional.");
      }

      if (fotoFile) {
        const fotoUrlFinal = await uploadFoto(idProfissional);
        const fotoRequestBody: ProfissionalProcessarBody = {
          acao: "atualizar_foto",
          idSalao,
          idProfissional,
          foto_url: fotoUrlFinal,
        };

        const fotoResponse = await fetch("/api/profissionais/processar", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(fotoRequestBody),
        });
        const fotoResult =
          (await fotoResponse.json()) as ProfissionalProcessarResponse;

        if (!fotoResponse.ok) {
          throw new Error(fotoResult.error || "Erro ao salvar foto.");
        }
      }

      if (!isAssistenteSalao) {
        await salvarAcessoProfissional(idProfissional);
      }

      if (modo === "novo") {
        router.push("/profissionais");
        return;
      }

      setMsg("Profissional atualizado com sucesso.");
      setAcesso((prev) => ({ ...prev, senha: "", possuiCadastro: true }));
    } catch (e: unknown) {
      setErro(getErrorMessage(e, "Erro ao salvar profissional."));
    } finally {
      setSaving(false);
    }
  }

  const assistentesFiltrados = useMemo(() => {
    return assistentesDisponiveis.filter((item) => item.id !== profissionalId);
  }, [assistentesDisponiveis, profissionalId]);
  const isAssistenteSalao = form.tipo_profissional === "assistente";

  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          Carregando cadastro de profissionais...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-zinc-950 shadow-sm">
          <h1 className="mt-2 text-2xl font-bold md:text-3xl">
            {modo === "novo" ? "Novo Profissional" : "Editar Profissional"}
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Preencha os dados pessoais, agenda, serviços, comissão, acesso e assistentes.
          </p>
        </div>

        {erro ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {erro}
          </div>
        ) : null}

        {msg ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {msg}
          </div>
        ) : null}

        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => router.push("/profissionais")}
            className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-700"
          >
            Voltar para lista
          </button>

          <button
            type="button"
            onClick={salvar}
            disabled={saving}
            className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving
              ? "Salvando..."
              : modo === "novo"
              ? "Salvar profissional"
              : "Atualizar profissional"}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <Card title="1. Dados Pessoais e Contato" subtitle="Identificação e comunicação do profissional">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input label="Nome completo" value={form.nome} onChange={(v) => handleChange("nome", v)} required />
                <Input label="Nome social / artístico" value={form.nome_social} onChange={(v) => handleChange("nome_social", v)} />
                <Input label="CPF" value={form.cpf} onChange={(v) => handleChange("cpf", v)} />
                <Input label="RG" value={form.rg} onChange={(v) => handleChange("rg", v)} />
                <Input label="Data de nascimento" type="date" value={form.data_nascimento} onChange={(v) => handleChange("data_nascimento", v)} />
                <Input label="E-mail" type="email" value={form.email} onChange={(v) => handleChange("email", v)} />
                <Input label="Telefone" value={form.telefone} onChange={(v) => handleChange("telefone", v)} />
                <Input label="WhatsApp" value={form.whatsapp} onChange={(v) => handleChange("whatsapp", v)} />
                <Input label="CEP" value={form.cep} onChange={(v) => handleChange("cep", v)} />
                <Input label="Estado" value={form.estado} onChange={(v) => handleChange("estado", v.toUpperCase())} maxLength={2} />
                <div className="md:col-span-2">
                  <Input label="Endereço" value={form.endereco} onChange={(v) => handleChange("endereco", v)} />
                </div>
                <Input label="Número" value={form.numero} onChange={(v) => handleChange("numero", v)} />
                <Input label="Bairro" value={form.bairro} onChange={(v) => handleChange("bairro", v)} />
                <Input label="Cidade" value={form.cidade} onChange={(v) => handleChange("cidade", v)} />
              </div>
            </Card>

            <Card title="2. Dados Profissionais e Especialidades" subtitle="Função, bio e posicionamento do profissional">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input label="Cargo / Função" value={form.cargo} onChange={(v) => handleChange("cargo", v)} />
                <Select
                  label="Funcao no salao"
                  value={form.tipo_profissional}
                  onChange={(v) => handleChange("tipo_profissional", v)}
                  options={[
                    { value: "profissional", label: "Profissional (agenda e app)" },
                    { value: "assistente", label: "Assistente do salao" },
                  ]}
                />
                <Input label="Categoria" value={form.categoria} onChange={(v) => handleChange("categoria", v)} />
                <Input label="Data de admissão / início" type="date" value={form.data_admissao} onChange={(v) => handleChange("data_admissao", v)} />
                <Select
                  label="Tipo de vínculo"
                  value={form.tipo_vinculo}
                  onChange={(v) => handleChange("tipo_vinculo", v)}
                  options={[
                    { value: "CLT", label: "CLT" },
                    { value: "MEI", label: "MEI / Parceiro" },
                    { value: "AUTONOMO", label: "Autônomo" },
                  ]}
                />
                <div className="md:col-span-2">
                  <Input
                    label="Especialidades"
                    value={especialidadesInput}
                    onChange={setEspecialidadesInput}
                    placeholder="Ex: Loiros, corte a seco, design de sobrancelhas"
                  />
                  {especialidadesPreview.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {especialidadesPreview.map((item) => (
                        <span
                          key={item}
                          className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="md:col-span-2">
                  <Textarea
                    label="Bio curta"
                    value={form.bio}
                    onChange={(v) => handleChange("bio", v)}
                    rows={4}
                  />
                </div>
              </div>
            </Card>

            <Card title="3. Configurações de Agenda" subtitle="Dias, horários e pausas">
              <div className="space-y-4">
                <div className="overflow-x-auto rounded-2xl border border-zinc-200">
                  <table className="min-w-full divide-y divide-zinc-200">
                    <thead className="bg-zinc-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-zinc-600">Dia</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-zinc-600">Ativo</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-zinc-600">Início</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-zinc-600">Fim</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 bg-white">
                      {form.dias_trabalho.map((dia, index) => (
                        <tr key={dia.dia}>
                          <td className="px-4 py-3 font-medium text-zinc-800">{dia.dia}</td>
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={dia.ativo}
                              onChange={(e) => handleDiaChange(index, "ativo", e.target.checked)}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="time"
                              value={dia.inicio}
                              onChange={(e) => handleDiaChange(index, "inicio", e.target.value)}
                              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="time"
                              value={dia.fim}
                              onChange={(e) => handleDiaChange(index, "fim", e.target.value)}
                              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-zinc-900">Pausas fixas</h3>
                    </div>
                    <button
                      type="button"
                      onClick={addPausa}
                      className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Adicionar pausa
                    </button>
                  </div>

                  <div className="space-y-3">
                    {form.pausas.map((pausa, index) => (
                      <div key={index} className="grid grid-cols-1 gap-3 md:grid-cols-4">
                        <input
                          type="time"
                          value={pausa.inicio}
                          onChange={(e) => handlePausaChange(index, "inicio", e.target.value)}
                          className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                        />
                        <input
                          type="time"
                          value={pausa.fim}
                          onChange={(e) => handlePausaChange(index, "fim", e.target.value)}
                          className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                        />
                        <input
                          type="text"
                          value={pausa.descricao}
                          onChange={(e) => handlePausaChange(index, "descricao", e.target.value)}
                          placeholder="Descrição"
                          className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => removePausa(index)}
                          className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600"
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Serviços Vinculados" subtitle="Serviços e duração personalizada">
              {isAssistenteSalao ? (
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                  Assistente do salao nao recebe servicos vinculados nem acesso ao app profissional.
                </div>
              ) : (
              <div className="space-y-3">
                {servicos.map((servico) => {
                  const ativo = servicoEstaSelecionado(servico.id);
                  const vinculo = servicosSelecionados.find((item) => item.id_servico === servico.id);

                  return (
                    <div
                      key={servico.id}
                      className={classNames(
                        "rounded-2xl border p-4",
                        ativo
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-200 bg-white text-zinc-900"
                      )}
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={ativo}
                            onChange={() => toggleServico(servico)}
                          />
                          <div>
                            <p className="font-semibold">{servico.nome}</p>
                            <p className={classNames("text-sm", ativo ? "text-zinc-300" : "text-zinc-500")}>
                              Duração padrão: {servico.duracao_minutos || 0} min
                            </p>
                          </div>
                        </div>

                        {ativo && (
                          <div className="w-full md:w-52">
                            <label
                              className={classNames(
                                "mb-1 block text-xs font-semibold uppercase tracking-wider",
                                ativo ? "text-white" : "text-zinc-600"
                              )}
                            >
                              Duração do profissional
                            </label>

                            <input
                              type="number"
                              min={1}
                              value={vinculo?.duracao_minutos || ""}
                              onChange={(e) => changeDuracaoServico(servico.id, e.target.value)}
                              className="w-full rounded-xl border border-white bg-white px-3 py-2 text-sm font-semibold text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-white focus:ring-2 focus:ring-white/40"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            <Card title="Foto de Perfil" subtitle="Humaniza o cadastro">
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border-4 border-zinc-200 bg-zinc-100">
                    {fotoFile ? (
                      <img
                        src={URL.createObjectURL(fotoFile)}
                        alt="Prévia da foto"
                        className="h-full w-full object-cover"
                      />
                    ) : form.foto_url ? (
                      <img
                        src={form.foto_url}
                        alt="Foto do profissional"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-sm text-zinc-500">Sem foto</span>
                    )}
                  </div>
                </div>

                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFotoFile(e.target.files?.[0] || null)}
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                />

                <Input
                  label="Ou cole a URL da foto"
                  value={form.foto_url}
                  onChange={(v) => handleChange("foto_url", v)}
                />
              </div>
            </Card>

            <Card title="Assistentes vinculados" subtitle="Selecione quem pode auxiliar este profissional">
              {isAssistenteSalao ? (
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                  Este cadastro e um assistente. Vincule ele dentro do cadastro de um profissional.
                </div>
              ) : (
              <div className="space-y-3">
                {assistentesFiltrados.length === 0 ? (
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                    Nenhum outro profissional disponível para vínculo.
                  </div>
                ) : (
                  assistentesFiltrados.map((item) => {
                    const checked = assistentesSelecionados.includes(item.id);
                    const ativo = item.ativo ?? item.status === "ativo";

                    return (
                      <label
                        key={item.id}
                        className={classNames(
                          "flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition",
                          checked
                            ? "border-zinc-900 bg-zinc-50"
                            : "border-zinc-200 bg-white hover:bg-zinc-50"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleAssistente(item.id)}
                          className="mt-1 h-4 w-4"
                        />

                        <div className="h-11 w-11 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100">
                          {item.foto_url ? (
                            <img
                              src={item.foto_url}
                              alt={item.nome}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs font-bold text-zinc-500">
                              {item.nome?.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-zinc-900">{item.nome}</p>
                          <p className="text-sm text-zinc-500">
                            {item.cargo || item.categoria || item.nome_social || "Sem descrição"}
                          </p>
                          <p className="mt-1 text-xs text-zinc-400">
                            {ativo ? "Ativo" : "Inativo"}
                          </p>
                        </div>
                      </label>
                    );
                  })
                )}

                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
                  Total selecionado:{" "}
                  <strong className="text-zinc-900">{assistentesSelecionados.length}</strong>
                </div>
              </div>
              )}
            </Card>

            <Card title="4. Financeiro e Acesso" subtitle="PIX, comissão, status e acesso ao app">
              <div className="space-y-4">
                <Input
                  label="Comissão sobre produtos (%)"
                  type="number"
                  step="0.01"
                  value={form.comissao_produto_percentual}
                  onChange={(v) => handleChange("comissao_produto_percentual", v)}
                />

                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                  A comissão de serviços não é configurada aqui. Para ajustar percentual, base de cálculo
                  e taxa da maquininha por serviço, use <strong className="text-zinc-900">Serviços &gt; Editar serviço</strong>.
                </div>

                <Select
                  label="Tipo de PIX"
                  value={form.pix_tipo}
                  onChange={(v) => handleChange("pix_tipo", v)}
                  options={[
                    { value: "CPF", label: "CPF" },
                    { value: "CNPJ", label: "CNPJ" },
                    { value: "EMAIL", label: "E-mail" },
                    { value: "TELEFONE", label: "Telefone" },
                    { value: "ALEATORIA", label: "Chave Aleatória" },
                  ]}
                />

                <Input
                  label="Chave PIX"
                  value={form.pix_chave}
                  onChange={(v) => handleChange("pix_chave", v)}
                />

                <Select
                  label="Nível de acesso"
                  value={form.nivel_acesso}
                  onChange={(v) => handleChange("nivel_acesso", v)}
                  options={[
                    { value: "proprio", label: "Ver apenas a própria agenda" },
                    { value: "todos", label: "Ver agenda de todos" },
                    { value: "sem_acesso", label: "Sem acesso ao sistema" },
                  ]}
                />

                <Select
                  label="Status"
                  value={form.ativo ? "ativo" : "inativo"}
                  onChange={(v) => {
                    const ativo = v === "ativo";
                    handleChange("ativo", ativo);
                    handleChange("status", ativo ? "ativo" : "inativo");
                  }}
                  options={[
                    { value: "ativo", label: "Ativo" },
                    { value: "inativo", label: "Inativo" },
                  ]}
                />

                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <p className="font-semibold text-zinc-900">Acesso ao app profissional</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Aqui você libera o login do profissional no app usando CPF e senha.
                  </p>

                  {isAssistenteSalao ? (
                    <div className="mt-4 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
                      Assistente do salao nao acessa o app profissional. O sistema mantem qualquer acesso existente desativado ao salvar.
                    </div>
                  ) : (
                  <div className="mt-4 space-y-4">
                    <Switch
                      label="Permitir acesso ao app"
                      checked={acesso.ativo}
                      onChange={(v) => setAcesso((prev) => ({ ...prev, ativo: v }))}
                    />

                    <Input
                      label="CPF de login"
                      value={acesso.cpf}
                      onChange={(v) =>
                        setAcesso((prev) => ({ ...prev, cpf: onlyDigits(v) }))
                      }
                    />

                    <Input
                      label={
                        acesso.possuiCadastro
                          ? "Nova senha do app (opcional)"
                          : "Senha inicial do app"
                      }
                      type="password"
                      value={acesso.senha}
                      onChange={(v) => setAcesso((prev) => ({ ...prev, senha: v }))}
                      placeholder={
                        acesso.possuiCadastro
                          ? "Deixe em branco para manter a atual"
                          : "Informe a senha inicial"
                      }
                    />

                    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-xs text-zinc-600">
                      {acesso.possuiCadastro
                        ? "Este profissional já possui cadastro no app. Preencha a senha somente se quiser redefinir."
                        : "Ao salvar, será criado o acesso do profissional na tabela profissionais_acessos."}
                    </div>
                  </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-zinc-900">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-zinc-500">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  maxLength,
  step,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  step?: string;
  min?: number | string;
  max?: number | string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-zinc-700">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>
      <input
        type={type}
        value={value}
        maxLength={maxLength}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-900"
      />
    </div>
  );
}

function Textarea({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-zinc-700">{label}</label>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-900"
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-zinc-700">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-900"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-2xl border border-zinc-200 px-4 py-3">
      <span className="text-sm font-medium text-zinc-700">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
