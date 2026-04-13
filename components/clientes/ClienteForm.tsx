"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getUsuarioLogado } from "@/lib/auth/getUsuarioLogado";
import {
  dateBrToIso,
  dateIsoToBr,
  maskCEP,
  maskCPF,
  maskDate,
  maskPhone,
  onlyDigits,
} from "@/lib/utils/masks";

type Profissional = {
  id: string;
  nome: string;
};

type ClienteFormProps = {
  modo: "novo" | "editar";
};

type Cliente = {
  id?: string;
  id_salao: string;
  nome: string;
  nome_social: string;
  data_nascimento: string;
  whatsapp: string;
  telefone: string;
  email: string;
  cpf: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  profissao: string;
  observacoes: string;
  foto_url: string;
  status: string;
  ativo: boolean;
};

type FichaTecnica = {
  alergias: string;
  historico_quimico: string;
  condicoes_couro_cabeludo_pele: string;
  uso_medicamentos: string;
  gestante: boolean;
  lactante: boolean;
  restricoes_quimicas: string;
  observacoes_tecnicas: string;
};

type Preferencias = {
  bebida_favorita: string;
  estilo_atendimento: string;
  revistas_assuntos_preferidos: string;
  como_conheceu_salao: string;
  profissional_favorito_id: string;
  frequencia_visitas: string;
  preferencias_gerais: string;
};

type Autorizacoes = {
  autoriza_uso_imagem: boolean;
  autoriza_whatsapp_marketing: boolean;
  autoriza_email_marketing: boolean;
  termo_lgpd_aceito: boolean;
  observacoes_autorizacao: string;
};

type ClienteAuth = {
  email: string;
  senha_hash: string;
  app_ativo: boolean;
};

const initialCliente: Cliente = {
  id_salao: "",
  nome: "",
  nome_social: "",
  data_nascimento: "",
  whatsapp: "",
  telefone: "",
  email: "",
  cpf: "",
  endereco: "",
  numero: "",
  bairro: "",
  cidade: "",
  estado: "",
  cep: "",
  profissao: "",
  observacoes: "",
  foto_url: "",
  status: "ativo",
  ativo: true,
};

const initialFicha: FichaTecnica = {
  alergias: "",
  historico_quimico: "",
  condicoes_couro_cabeludo_pele: "",
  uso_medicamentos: "",
  gestante: false,
  lactante: false,
  restricoes_quimicas: "",
  observacoes_tecnicas: "",
};

const initialPreferencias: Preferencias = {
  bebida_favorita: "",
  estilo_atendimento: "",
  revistas_assuntos_preferidos: "",
  como_conheceu_salao: "",
  profissional_favorito_id: "",
  frequencia_visitas: "",
  preferencias_gerais: "",
};

const initialAutorizacoes: Autorizacoes = {
  autoriza_uso_imagem: false,
  autoriza_whatsapp_marketing: false,
  autoriza_email_marketing: false,
  termo_lgpd_aceito: false,
  observacoes_autorizacao: "",
};

const initialAuth: ClienteAuth = {
  email: "",
  senha_hash: "",
  app_ativo: false,
};

export default function ClienteForm({ modo }: ClienteFormProps) {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();

  const clienteId = typeof params?.id === "string" ? params.id : "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [idSalao, setIdSalao] = useState("");
  const [buscandoCep, setBuscandoCep] = useState(false);

  const [profissionais, setProfissionais] = useState<Profissional[]>([]);

  const [cliente, setCliente] = useState<Cliente>(initialCliente);
  const [ficha, setFicha] = useState<FichaTecnica>(initialFicha);
  const [preferencias, setPreferencias] = useState<Preferencias>(initialPreferencias);
  const [autorizacoes, setAutorizacoes] = useState<Autorizacoes>(initialAutorizacoes);
  const [authCliente, setAuthCliente] = useState<ClienteAuth>(initialAuth);

  useEffect(() => {
    bootstrap();
  }, [modo, clienteId]);

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
    setCliente((prev) => ({ ...prev, id_salao: usuarioLogado.idSalao }));

    const { data: listaProfissionais, error: profissionaisError } = await supabase
      .from("profissionais")
      .select("id, nome")
      .eq("id_salao", usuarioLogado.idSalao)
      .eq("ativo", true)
      .order("nome", { ascending: true });

    if (profissionaisError) throw profissionaisError;

    setProfissionais((listaProfissionais as Profissional[]) || []);

    if (modo === "editar" && clienteId) {
      await carregarCliente(clienteId, usuarioLogado.idSalao);
    }
  } catch (e: any) {
    console.error(e);
    setErro(e.message || "Erro ao carregar formulário.");
  } finally {
    setLoading(false);
  }
}

  async function carregarCliente(id: string, salaoId: string) {
    const { data: clienteRows, error: clienteError } = await supabase
      .from("clientes")
      .select("*")
      .eq("id", id)
      .eq("id_salao", salaoId)
      .limit(1);

    if (clienteError) throw clienteError;

    const row = clienteRows?.[0];
    if (!row) throw new Error("Cliente não encontrado.");

    setCliente({
      id: row.id,
      id_salao: row.id_salao,
      nome: row.nome || "",
      nome_social: row.nome_social || "",
      data_nascimento: dateIsoToBr(row.data_nascimento),
      whatsapp: row.whatsapp || "",
      telefone: row.telefone || "",
      email: row.email || "",
      cpf: row.cpf || "",
      endereco: row.endereco || "",
      numero: row.numero || "",
      bairro: row.bairro || "",
      cidade: row.cidade || "",
      estado: row.estado || "",
      cep: row.cep || "",
      profissao: row.profissao || "",
      observacoes: row.observacoes || "",
      foto_url: row.foto_url || "",
      status: row.status || "ativo",
      ativo: row.ativo ?? true,
    });

    const { data: fichaRows } = await supabase
      .from("clientes_ficha_tecnica")
      .select("*")
      .eq("id_cliente", id)
      .limit(1);

    const f = fichaRows?.[0];
    if (f) {
      setFicha({
        alergias: f.alergias || "",
        historico_quimico: f.historico_quimico || "",
        condicoes_couro_cabeludo_pele: f.condicoes_couro_cabeludo_pele || "",
        uso_medicamentos: f.uso_medicamentos || "",
        gestante: f.gestante ?? false,
        lactante: f.lactante ?? false,
        restricoes_quimicas: f.restricoes_quimicas || "",
        observacoes_tecnicas: f.observacoes_tecnicas || "",
      });
    }

    const { data: prefRows } = await supabase
      .from("clientes_preferencias")
      .select("*")
      .eq("id_cliente", id)
      .limit(1);

    const p = prefRows?.[0];
    if (p) {
      setPreferencias({
        bebida_favorita: p.bebida_favorita || "",
        estilo_atendimento: p.estilo_atendimento || "",
        revistas_assuntos_preferidos: p.revistas_assuntos_preferidos || "",
        como_conheceu_salao: p.como_conheceu_salao || "",
        profissional_favorito_id: p.profissional_favorito_id || "",
        frequencia_visitas: p.frequencia_visitas || "",
        preferencias_gerais: p.preferencias_gerais || "",
      });
    }

    const { data: autRows } = await supabase
      .from("clientes_autorizacoes")
      .select("*")
      .eq("id_cliente", id)
      .limit(1);

    const a = autRows?.[0];
    if (a) {
      setAutorizacoes({
        autoriza_uso_imagem: a.autoriza_uso_imagem ?? false,
        autoriza_whatsapp_marketing: a.autoriza_whatsapp_marketing ?? false,
        autoriza_email_marketing: a.autoriza_email_marketing ?? false,
        termo_lgpd_aceito: a.termo_lgpd_aceito ?? false,
        observacoes_autorizacao: a.observacoes_autorizacao || "",
      });
    }

    const { data: authRows } = await supabase
      .from("clientes_auth")
      .select("*")
      .eq("id_cliente", id)
      .limit(1);

    const ac = authRows?.[0];
    if (ac) {
      setAuthCliente({
        email: ac.email || row.email || "",
        senha_hash: ac.senha_hash || "",
        app_ativo: ac.app_ativo ?? false,
      });
    } else {
      setAuthCliente((prev) => ({
        ...prev,
        email: row.email || "",
      }));
    }
  }

  function setClienteField<K extends keyof Cliente>(field: K, value: Cliente[K]) {
    setCliente((prev) => ({ ...prev, [field]: value }));
  }

  function setFichaField<K extends keyof FichaTecnica>(field: K, value: FichaTecnica[K]) {
    setFicha((prev) => ({ ...prev, [field]: value }));
  }

  function setPreferenciasField<K extends keyof Preferencias>(
    field: K,
    value: Preferencias[K]
  ) {
    setPreferencias((prev) => ({ ...prev, [field]: value }));
  }

  function setAutorizacoesField<K extends keyof Autorizacoes>(
    field: K,
    value: Autorizacoes[K]
  ) {
    setAutorizacoes((prev) => ({ ...prev, [field]: value }));
  }

  function setAuthField<K extends keyof ClienteAuth>(field: K, value: ClienteAuth[K]) {
    setAuthCliente((prev) => ({ ...prev, [field]: value }));
  }

  async function buscarCep(cepFormatado: string) {
    const cep = onlyDigits(cepFormatado);

    if (cep.length !== 8) return;

    try {
      setBuscandoCep(true);

      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (data.erro) return;

      setCliente((prev) => ({
        ...prev,
        endereco: data.logradouro || prev.endereco,
        bairro: data.bairro || prev.bairro,
        cidade: data.localidade || prev.cidade,
        estado: data.uf || prev.estado,
      }));
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    } finally {
      setBuscandoCep(false);
    }
  }

  async function salvar() {
    try {
      setSaving(true);
      setErro("");
      setMsg("");

      if (!cliente.nome.trim()) {
        throw new Error("Informe o nome da cliente.");
      }

      const payloadCliente = {
        id_salao: idSalao,
        nome: cliente.nome.trim(),
        nome_social: cliente.nome_social.trim() || null,
        data_nascimento: dateBrToIso(cliente.data_nascimento) || null,
        whatsapp: cliente.whatsapp.trim() || null,
        telefone: cliente.telefone.trim() || null,
        email: cliente.email.trim() || null,
        cpf: cliente.cpf.trim() || null,
        endereco: cliente.endereco.trim() || null,
        numero: cliente.numero.trim() || null,
        bairro: cliente.bairro.trim() || null,
        cidade: cliente.cidade.trim() || null,
        estado: cliente.estado.trim() || null,
        cep: cliente.cep.trim() || null,
        profissao: cliente.profissao.trim() || null,
        observacoes: cliente.observacoes.trim() || null,
        foto_url: cliente.foto_url.trim() || null,
        status: cliente.ativo ? "ativo" : "inativo",
        ativo: cliente.ativo,
      };

      let idCliente = cliente.id || "";

      if (modo === "novo") {
        const { data, error } = await supabase
          .from("clientes")
          .insert(payloadCliente)
          .select("id")
          .limit(1);

        if (error) throw error;

        idCliente = data?.[0]?.id;
        if (!idCliente) throw new Error("Não foi possível obter o ID da cliente.");
      } else {
        const { error } = await supabase
          .from("clientes")
          .update(payloadCliente)
          .eq("id", cliente.id)
          .eq("id_salao", idSalao);

        if (error) throw error;
        idCliente = cliente.id || "";
      }

      const payloadFicha = {
        id_salao: idSalao,
        id_cliente: idCliente,
        alergias: ficha.alergias.trim() || null,
        historico_quimico: ficha.historico_quimico.trim() || null,
        condicoes_couro_cabeludo_pele: ficha.condicoes_couro_cabeludo_pele.trim() || null,
        uso_medicamentos: ficha.uso_medicamentos.trim() || null,
        gestante: ficha.gestante,
        lactante: ficha.lactante,
        restricoes_quimicas: ficha.restricoes_quimicas.trim() || null,
        observacoes_tecnicas: ficha.observacoes_tecnicas.trim() || null,
      };

      const payloadPreferencias = {
        id_salao: idSalao,
        id_cliente: idCliente,
        bebida_favorita: preferencias.bebida_favorita.trim() || null,
        estilo_atendimento: preferencias.estilo_atendimento.trim() || null,
        revistas_assuntos_preferidos: preferencias.revistas_assuntos_preferidos.trim() || null,
        como_conheceu_salao: preferencias.como_conheceu_salao.trim() || null,
        profissional_favorito_id: preferencias.profissional_favorito_id || null,
        frequencia_visitas: preferencias.frequencia_visitas.trim() || null,
        preferencias_gerais: preferencias.preferencias_gerais.trim() || null,
      };

      const payloadAutorizacoes = {
        id_salao: idSalao,
        id_cliente: idCliente,
        autoriza_uso_imagem: autorizacoes.autoriza_uso_imagem,
        autoriza_whatsapp_marketing: autorizacoes.autoriza_whatsapp_marketing,
        autoriza_email_marketing: autorizacoes.autoriza_email_marketing,
        termo_lgpd_aceito: autorizacoes.termo_lgpd_aceito,
        data_aceite_lgpd: autorizacoes.termo_lgpd_aceito ? new Date().toISOString() : null,
        observacoes_autorizacao: autorizacoes.observacoes_autorizacao.trim() || null,
      };

      const payloadAuth = {
        id_salao: idSalao,
        id_cliente: idCliente,
        email: authCliente.email.trim() || cliente.email.trim() || null,
        senha_hash: authCliente.senha_hash.trim() || null,
        app_ativo: authCliente.app_ativo,
      };

      const { data: fichaExists } = await supabase
        .from("clientes_ficha_tecnica")
        .select("id")
        .eq("id_cliente", idCliente)
        .limit(1);

      if (fichaExists?.[0]?.id) {
        await supabase.from("clientes_ficha_tecnica").update(payloadFicha).eq("id_cliente", idCliente);
      } else {
        await supabase.from("clientes_ficha_tecnica").insert(payloadFicha);
      }

      const { data: prefExists } = await supabase
        .from("clientes_preferencias")
        .select("id")
        .eq("id_cliente", idCliente)
        .limit(1);

      if (prefExists?.[0]?.id) {
        await supabase.from("clientes_preferencias").update(payloadPreferencias).eq("id_cliente", idCliente);
      } else {
        await supabase.from("clientes_preferencias").insert(payloadPreferencias);
      }

      const { data: autExists } = await supabase
        .from("clientes_autorizacoes")
        .select("id")
        .eq("id_cliente", idCliente)
        .limit(1);

      if (autExists?.[0]?.id) {
        await supabase.from("clientes_autorizacoes").update(payloadAutorizacoes).eq("id_cliente", idCliente);
      } else {
        await supabase.from("clientes_autorizacoes").insert(payloadAutorizacoes);
      }

      const { data: authExists } = await supabase
        .from("clientes_auth")
        .select("id")
        .eq("id_cliente", idCliente)
        .limit(1);

      if (authExists?.[0]?.id) {
        await supabase.from("clientes_auth").update(payloadAuth).eq("id_cliente", idCliente);
      } else {
        await supabase.from("clientes_auth").insert(payloadAuth);
      }

      if (modo === "novo") {
        router.push("/clientes");
        return;
      }

      setMsg("Cliente atualizado com sucesso.");
    } catch (e: any) {
      console.error(e);
      setErro(e.message || "Erro ao salvar cliente.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          Carregando cadastro de cliente...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 p-6 text-white shadow-xl">
          <h1 className="mt-2 text-2xl font-bold md:text-3xl">
            {modo === "novo" ? "Novo Cliente" : "Editar Cliente"}
          </h1>
          <p className="mt-2 text-sm text-zinc-300">
            Cadastro completo com dados pessoais, ficha técnica, preferências, LGPD e login futuro.
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

        <div className="flex flex-wrap justify-between gap-3">
          <button
            type="button"
            onClick={() => router.push("/clientes")}
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
            {saving ? "Salvando..." : modo === "novo" ? "Salvar cliente" : "Atualizar cliente"}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <Card title="1. Dados Pessoais e Contato" subtitle="Base principal da cliente">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input label="Nome completo" value={cliente.nome} onChange={(v) => setClienteField("nome", v)} required />
                <Input label="Nome social" value={cliente.nome_social} onChange={(v) => setClienteField("nome_social", v)} />
                <Input
                  label="Data de nascimento"
                  value={cliente.data_nascimento}
                  onChange={(v) => setClienteField("data_nascimento", maskDate(v))}
                  placeholder="dd/mm/aaaa"
                  maxLength={10}
                />
                <Input
                  label="WhatsApp"
                  value={cliente.whatsapp}
                  onChange={(v) => setClienteField("whatsapp", maskPhone(v))}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
                <Input
                  label="Telefone"
                  value={cliente.telefone}
                  onChange={(v) => setClienteField("telefone", maskPhone(v))}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
                <Input label="E-mail" type="email" value={cliente.email} onChange={(v) => setClienteField("email", v)} />
                <Input
                  label="CPF"
                  value={cliente.cpf}
                  onChange={(v) => setClienteField("cpf", maskCPF(v))}
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
                <Input label="Profissão" value={cliente.profissao} onChange={(v) => setClienteField("profissao", v)} />

                <Input
                  label="CEP"
                  value={cliente.cep}
                  onChange={(v) => setClienteField("cep", maskCEP(v))}
                  onBlur={() => buscarCep(cliente.cep)}
                  placeholder="00000-000"
                  maxLength={9}
                  helperText={buscandoCep ? "Buscando CEP..." : ""}
                />

                <Input label="Estado" value={cliente.estado} onChange={(v) => setClienteField("estado", v.toUpperCase())} maxLength={2} />

                <div className="md:col-span-2">
                  <Input label="Endereço" value={cliente.endereco} onChange={(v) => setClienteField("endereco", v)} />
                </div>

                <Input label="Número" value={cliente.numero} onChange={(v) => setClienteField("numero", v)} />
                <Input label="Bairro" value={cliente.bairro} onChange={(v) => setClienteField("bairro", v)} />
                <Input label="Cidade" value={cliente.cidade} onChange={(v) => setClienteField("cidade", v)} />

                <div className="md:col-span-2">
                  <Textarea label="Observações gerais" value={cliente.observacoes} onChange={(v) => setClienteField("observacoes", v)} />
                </div>
              </div>
            </Card>

            <Card title="2. Ficha Técnica e Saúde" subtitle="Protege o salão e melhora o atendimento">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Textarea label="Alergias" value={ficha.alergias} onChange={(v) => setFichaField("alergias", v)} />
                <Textarea
                  label="Uso de medicamentos"
                  value={ficha.uso_medicamentos}
                  onChange={(v) => setFichaField("uso_medicamentos", v)}
                />
                <Textarea
                  label="Histórico químico"
                  value={ficha.historico_quimico}
                  onChange={(v) => setFichaField("historico_quimico", v)}
                />
                <Textarea
                  label="Condições do couro cabeludo / pele"
                  value={ficha.condicoes_couro_cabeludo_pele}
                  onChange={(v) => setFichaField("condicoes_couro_cabeludo_pele", v)}
                />
                <Textarea
                  label="Restrições químicas"
                  value={ficha.restricoes_quimicas}
                  onChange={(v) => setFichaField("restricoes_quimicas", v)}
                />
                <Textarea
                  label="Observações técnicas"
                  value={ficha.observacoes_tecnicas}
                  onChange={(v) => setFichaField("observacoes_tecnicas", v)}
                />

                <Switch
                  label="Gestante"
                  checked={ficha.gestante}
                  onChange={(v) => setFichaField("gestante", v)}
                />

                <Switch
                  label="Lactante"
                  checked={ficha.lactante}
                  onChange={(v) => setFichaField("lactante", v)}
                />
              </div>
            </Card>

            <Card title="3. Preferências e Mimos" subtitle="Atendimento premium">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Bebida favorita"
                  value={preferencias.bebida_favorita}
                  onChange={(v) => setPreferenciasField("bebida_favorita", v)}
                />

                <Select
                  label="Estilo de atendimento"
                  value={preferencias.estilo_atendimento}
                  onChange={(v) => setPreferenciasField("estilo_atendimento", v)}
                  options={[
                    { value: "", label: "Selecione" },
                    { value: "conversa", label: "Gosta de conversar" },
                    { value: "silencio", label: "Prefere silêncio" },
                    { value: "tanto_faz", label: "Tanto faz" },
                  ]}
                />

                <Input
                  label="Como conheceu o salão?"
                  value={preferencias.como_conheceu_salao}
                  onChange={(v) => setPreferenciasField("como_conheceu_salao", v)}
                />

                <Select
                  label="Frequência de visitas"
                  value={preferencias.frequencia_visitas}
                  onChange={(v) => setPreferenciasField("frequencia_visitas", v)}
                  options={[
                    { value: "", label: "Selecione" },
                    { value: "semanal", label: "Semanal" },
                    { value: "quinzenal", label: "Quinzenal" },
                    { value: "mensal", label: "Mensal" },
                    { value: "eventual", label: "Eventual" },
                  ]}
                />

                <Select
                  label="Profissional favorito"
                  value={preferencias.profissional_favorito_id}
                  onChange={(v) => setPreferenciasField("profissional_favorito_id", v)}
                  options={[
                    { value: "", label: "Selecione" },
                    ...profissionais.map((p) => ({ value: p.id, label: p.nome })),
                  ]}
                />

                <div className="md:col-span-2">
                  <Textarea
                    label="Revistas / assuntos preferidos"
                    value={preferencias.revistas_assuntos_preferidos}
                    onChange={(v) => setPreferenciasField("revistas_assuntos_preferidos", v)}
                  />
                </div>

                <div className="md:col-span-2">
                  <Textarea
                    label="Preferências gerais"
                    value={preferencias.preferencias_gerais}
                    onChange={(v) => setPreferenciasField("preferencias_gerais", v)}
                  />
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card title="4. Autorizações (LGPD)" subtitle="Imagem e marketing">
              <div className="space-y-4">
                <Switch
                  label="Autoriza uso de imagem"
                  checked={autorizacoes.autoriza_uso_imagem}
                  onChange={(v) => setAutorizacoesField("autoriza_uso_imagem", v)}
                />

                <Switch
                  label="Autoriza promoções no WhatsApp"
                  checked={autorizacoes.autoriza_whatsapp_marketing}
                  onChange={(v) => setAutorizacoesField("autoriza_whatsapp_marketing", v)}
                />

                <Switch
                  label="Autoriza promoções por e-mail"
                  checked={autorizacoes.autoriza_email_marketing}
                  onChange={(v) => setAutorizacoesField("autoriza_email_marketing", v)}
                />

                <Switch
                  label="Termo LGPD aceito"
                  checked={autorizacoes.termo_lgpd_aceito}
                  onChange={(v) => setAutorizacoesField("termo_lgpd_aceito", v)}
                />

                <Textarea
                  label="Observações"
                  value={autorizacoes.observacoes_autorizacao}
                  onChange={(v) => setAutorizacoesField("observacoes_autorizacao", v)}
                />
              </div>
            </Card>

            <Card title="5. Login futuro do app" subtitle="Preparação para agendamento pelo cliente">
              <div className="space-y-4">
                <Input
                  label="E-mail de login"
                  type="email"
                  value={authCliente.email}
                  onChange={(v) => setAuthField("email", v)}
                />

                <Input
                  label="Senha hash"
                  value={authCliente.senha_hash}
                  onChange={(v) => setAuthField("senha_hash", v)}
                  placeholder="No futuro salvar hash, nunca senha pura"
                />

                <Switch
                  label="App ativo"
                  checked={authCliente.app_ativo}
                  onChange={(v) => setAuthField("app_ativo", v)}
                />
              </div>
            </Card>

            <Card title="6. Status" subtitle="Controle do cadastro">
              <div className="space-y-4">
                <Select
                  label="Status"
                  value={cliente.ativo ? "ativo" : "inativo"}
                  onChange={(v) => {
                    const ativo = v === "ativo";
                    setClienteField("ativo", ativo);
                    setClienteField("status", ativo ? "ativo" : "inativo");
                  }}
                  options={[
                    { value: "ativo", label: "Ativo" },
                    { value: "inativo", label: "Inativo" },
                  ]}
                />

                <Input
                  label="URL da foto"
                  value={cliente.foto_url}
                  onChange={(v) => setClienteField("foto_url", v)}
                />
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
  onBlur,
  helperText,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  onBlur?: () => void;
  helperText?: string;
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
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-900"
      />
      {helperText ? <p className="mt-1 text-xs text-zinc-500">{helperText}</p> : null}
    </div>
  );
}

function Textarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-zinc-700">{label}</label>
      <textarea
        rows={4}
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