"use client";

import Link from "next/link";
import { getAssinaturaUrl } from "@/lib/site-urls";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/db/client";
import { getUsuarioLogado } from "@/lib/auth/getUsuarioLogado";
import { getErrorMessage } from "@/lib/get-error-message";
import PlanoLimiteNotice from "@/components/plans/PlanoLimiteNotice";
import {
  PainelListLoading,
  PainelPageHeader,
} from "@/components/painel-ui";
import { usePlanoAccessSnapshot } from "@/components/plans/usePlanoAccessSnapshot";
import type {
  AutorizacoesCliente,
  ClienteAuthPayload,
  ClienteAuthState,
  ClienteFichaPayload,
  ClienteFormProps,
  ClientePayload,
  ClientePreferenciasPayload,
  ClienteProcessarBody,
  ClienteProcessarErrorResponse,
  ClienteProcessarResponse,
  ClienteState,
  FichaTecnicaCliente,
  PreferenciasCliente,
  ProfissionalCliente,
} from "@/types/clientes";
import {
  dateBrToIso,
  dateIsoToBr,
  maskCEP,
  maskCPF,
  maskDate,
  maskPhone,
  onlyDigits,
} from "@/lib/utils/masks";
import {
  initialAutorizacoes,
  initialAuth,
  initialCliente,
  initialFicha,
  initialPreferencias,
} from "./cliente-form-defaults";
import { Card, Input, Select, Switch, Textarea } from "./ClienteFormFields";

export default function ClienteForm({ modo }: ClienteFormProps) {
  const database = createClient();
  const router = useRouter();
  const params = useParams();
  const clienteId = typeof params?.id === "string" ? params.id : "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [idSalao, setIdSalao] = useState("");
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [profissionais, setProfissionais] = useState<ProfissionalCliente[]>([]);
  const [cliente, setCliente] = useState<ClienteState>(initialCliente);
  const [ficha, setFicha] = useState<FichaTecnicaCliente>(initialFicha);
  const [preferencias, setPreferencias] = useState<PreferenciasCliente>(initialPreferencias);
  const [autorizacoes, setAutorizacoes] = useState<AutorizacoesCliente>(initialAutorizacoes);
  const [authCliente, setAuthCliente] = useState<ClienteAuthState>(initialAuth);
  const { planoAccess, upgradeTarget } = usePlanoAccessSnapshot(modo === "novo");

  useEffect(() => {
    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, clienteId]);

  async function bootstrap() {
    try {
      setLoading(true);
      setErro("");
      setMsg("");

      const usuarioLogado = await getUsuarioLogado();
      if (!usuarioLogado) throw new Error("Usuário não autenticado.");
      if (!usuarioLogado.idSalao) {
        throw new Error("Não foi possível identificar o salão do usuário.");
      }

      setIdSalao(usuarioLogado.idSalao);
      setCliente((prev) => ({ ...prev, id_salao: usuarioLogado.idSalao }));

      const { data: listaProfissionais, error: profissionaisError } = await database
        .from("profissionais")
        .select("id, nome")
        .eq("id_salao", usuarioLogado.idSalao)
        .eq("ativo", true)
        .order("nome", { ascending: true });

      if (profissionaisError) throw profissionaisError;
      setProfissionais((listaProfissionais as ProfissionalCliente[]) || []);

      if (modo === "editar" && clienteId) {
        await carregarCliente(clienteId, usuarioLogado.idSalao);
      }
    } catch (error: unknown) {
      console.error(error);
      setErro(getErrorMessage(error, "Erro ao carregar formulário."));
    } finally {
      setLoading(false);
    }
  }

  async function carregarCliente(id: string, salaoId: string) {
    const { data: clienteRows, error: clienteError } = await database
      .from("clientes")
      .select("ativo, atualizado_em, bairro, cashback, cep, cidade, cpf, created_at, data_nascimento, deleted_at, email, endereco, estado, foto_url, id, id_salao, nome, nome_social, numero, observacoes, profissao, rua, status, telefone, whatsapp")
      .eq("id", id)
      .eq("id_salao", salaoId)
      .limit(1);

    if (clienteError) throw clienteError;

    const row = clienteRows?.[0];
    const rowIdSalao = row?.id_salao;
    if (!rowIdSalao) throw new Error("Cliente sem salão vinculado.");
    if (!row) throw new Error("Cliente não encontrado.");

    setCliente({
      id: row.id,
      id_salao: rowIdSalao,
      nome: row.nome || "",
      nome_social: row.nome_social || "",
      cashback: Number(row.cashback || 0),
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
      ativo: String(row.ativo || "ativo").toLowerCase() === "ativo",
    });

    const { data: fichaRows } = await database
      .from("clientes_ficha_tecnica")
      .select("alergias, condicoes_couro_cabeludo_pele, created_at, gestante, historico_quimico, id, id_cliente, id_salao, lactante, observacoes_tecnicas, restricoes_quimicas, updated_at, uso_medicamentos")
      .eq("id_cliente", id)
      .limit(1);

    const fichaRow = fichaRows?.[0];
    if (fichaRow) {
      setFicha({
        alergias: fichaRow.alergias || "",
        historico_quimico: fichaRow.historico_quimico || "",
        condicoes_couro_cabeludo_pele: fichaRow.condicoes_couro_cabeludo_pele || "",
        uso_medicamentos: fichaRow.uso_medicamentos || "",
        gestante: fichaRow.gestante ?? false,
        lactante: fichaRow.lactante ?? false,
        restricoes_quimicas: fichaRow.restricoes_quimicas || "",
        observacoes_tecnicas: fichaRow.observacoes_tecnicas || "",
      });
    }

    const { data: prefRows } = await database
      .from("clientes_preferencias")
      .select("bebida_favorita, como_conheceu_salao, created_at, estilo_atendimento, frequencia_visitas, id, id_cliente, id_salao, preferencias_gerais, profissional_favorito_id, revistas_assuntos_preferidos, updated_at")
      .eq("id_cliente", id)
      .limit(1);

    const prefRow = prefRows?.[0];
    if (prefRow) {
      setPreferencias({
        bebida_favorita: prefRow.bebida_favorita || "",
        estilo_atendimento: prefRow.estilo_atendimento || "",
        revistas_assuntos_preferidos: prefRow.revistas_assuntos_preferidos || "",
        como_conheceu_salao: prefRow.como_conheceu_salao || "",
        profissional_favorito_id: prefRow.profissional_favorito_id || "",
        frequencia_visitas: prefRow.frequencia_visitas || "",
        preferencias_gerais: prefRow.preferencias_gerais || "",
      });
    }

    const { data: autRows } = await database
      .from("clientes_autorizacoes")
      .select("autoriza_email_marketing, autoriza_uso_imagem, autoriza_whatsapp_marketing, created_at, data_aceite_lgpd, id, id_cliente, id_salao, observacoes_autorizacao, termo_lgpd_aceito, updated_at")
      .eq("id_cliente", id)
      .limit(1);

    const autRow = autRows?.[0];
    if (autRow) {
      setAutorizacoes({
        autoriza_uso_imagem: autRow.autoriza_uso_imagem ?? false,
        autoriza_whatsapp_marketing: autRow.autoriza_whatsapp_marketing ?? false,
        autoriza_email_marketing: autRow.autoriza_email_marketing ?? false,
        termo_lgpd_aceito: autRow.termo_lgpd_aceito ?? false,
        observacoes_autorizacao: autRow.observacoes_autorizacao || "",
      });
    }

    const { data: authRows } = await database
      .from("clientes_auth")
      .select("app_ativo, created_at, email, id, id_cliente, id_salao, reset_token, reset_token_expira_em, senha_hash, ultimo_login_em, updated_at")
      .eq("id_cliente", id)
      .limit(1);

    const authRow = authRows?.[0];
    if (authRow) {
      setAuthCliente({
        email: authRow.email || row.email || "",
        senha_hash: authRow.senha_hash || "",
        app_ativo: authRow.app_ativo ?? false,
      });
    } else {
      setAuthCliente((prev) => ({ ...prev, email: row.email || "" }));
    }
  }

  function setClienteField<K extends keyof ClienteState>(field: K, value: ClienteState[K]) {
    setCliente((prev) => ({ ...prev, [field]: value }));
  }

  function setFichaField<K extends keyof FichaTecnicaCliente>(field: K, value: FichaTecnicaCliente[K]) {
    setFicha((prev) => ({ ...prev, [field]: value }));
  }

  function setPreferenciasField<K extends keyof PreferenciasCliente>(
    field: K,
    value: PreferenciasCliente[K]
  ) {
    setPreferencias((prev) => ({ ...prev, [field]: value }));
  }

  function setAutorizacoesField<K extends keyof AutorizacoesCliente>(
    field: K,
    value: AutorizacoesCliente[K]
  ) {
    setAutorizacoes((prev) => ({ ...prev, [field]: value }));
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

      if (!cliente.nome.trim()) throw new Error("Informe o nome da cliente.");
      if (atingiuLimiteClientes) {
        throw new Error(`Limite do plano atingido: ${usoClientes} de ${limiteClientes} clientes.`);
      }

      const payloadCliente: ClientePayload = {
        id_salao: idSalao,
        id: cliente.id || null,
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

      const payloadFicha: ClienteFichaPayload = {
        id_salao: idSalao,
        id_cliente: cliente.id || null,
        alergias: ficha.alergias.trim() || null,
        historico_quimico: ficha.historico_quimico.trim() || null,
        condicoes_couro_cabeludo_pele: ficha.condicoes_couro_cabeludo_pele.trim() || null,
        uso_medicamentos: ficha.uso_medicamentos.trim() || null,
        gestante: ficha.gestante,
        lactante: ficha.lactante,
        restricoes_quimicas: ficha.restricoes_quimicas.trim() || null,
        observacoes_tecnicas: ficha.observacoes_tecnicas.trim() || null,
      };

      const payloadPreferencias: ClientePreferenciasPayload = {
        id_salao: idSalao,
        id_cliente: cliente.id || null,
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
        id_cliente: cliente.id || null,
        autoriza_uso_imagem: autorizacoes.autoriza_uso_imagem,
        autoriza_whatsapp_marketing: autorizacoes.autoriza_whatsapp_marketing,
        autoriza_email_marketing: autorizacoes.autoriza_email_marketing,
        termo_lgpd_aceito: autorizacoes.termo_lgpd_aceito,
        data_aceite_lgpd: autorizacoes.termo_lgpd_aceito ? new Date().toISOString() : null,
        observacoes_autorizacao: autorizacoes.observacoes_autorizacao.trim() || null,
      };

      const payloadAuth: ClienteAuthPayload = {
        id_salao: idSalao,
        id_cliente: cliente.id || null,
        email: authCliente.email.trim() || cliente.email.trim() || null,
        senha_hash: authCliente.senha_hash.trim() || null,
        app_ativo: authCliente.app_ativo,
      };

      const requestBody: ClienteProcessarBody = {
        idSalao,
        acao: "salvar",
        cliente: payloadCliente,
        ficha: payloadFicha,
        preferencias: payloadPreferencias,
        autorizacoes: payloadAutorizacoes,
        auth: payloadAuth,
      };

      const response = await fetch("/api/clientes/processar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const result = (await response.json().catch(() => ({}))) as Partial<ClienteProcessarResponse> &
        ClienteProcessarErrorResponse;

      if (!response.ok) throw new Error(result.error || "Erro ao salvar cliente.");

      if (modo === "novo") {
        router.push("/clientes");
        return;
      }

      if (result.idCliente) {
        setCliente((prev) => ({ ...prev, id: result.idCliente || prev.id }));
      }
      setMsg("Cliente atualizado com sucesso.");
    } catch (error: unknown) {
      console.error(error);
      setErro(getErrorMessage(error, "Erro ao salvar cliente."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <PainelListLoading
        title="Carregando cadastro"
        message="Aguarde enquanto preparamos os dados da cliente."
      />
    );
  }

  const limiteClientes = planoAccess?.limites?.clientes ?? null;
  const usoClientes = planoAccess?.uso?.clientes ?? 0;
  const atingiuLimiteClientes =
    modo === "novo" && limiteClientes != null && usoClientes >= limiteClientes;

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <PainelPageHeader
          eyebrow="Cadastro"
          title={modo === "novo" ? "Novo cliente" : "Editar cliente"}
          description="Dados principais, cuidados de atendimento, app cliente e status da cliente."
          actions={
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-800">
              Credito:{" "}
              {cliente.cashback.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </div>
          }
        />

        {modo === "novo" && limiteClientes != null ? (
          <PlanoLimiteNotice
            titulo="Cadastro de clientes controlado pelo plano"
            descricao="O limite vale para novos cadastros. Seus dados atuais continuam preservados mesmo em downgrade."
            usado={usoClientes}
            limite={limiteClientes}
            planoNome={planoAccess?.planoNome}
            upgradeTarget={upgradeTarget}
            disabled={atingiuLimiteClientes}
          />
        ) : null}

        {erro ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>
        ) : null}
        {msg ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{msg}</div>
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
            disabled={saving || atingiuLimiteClientes}
            className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving ? "Salvando..." : modo === "novo" ? "Salvar cliente" : "Atualizar cliente"}
          </button>
        </div>

        {modo === "novo" && atingiuLimiteClientes ? (
          <div className="flex flex-wrap gap-2">
            <Link
              href="/comparar-planos"
              className="inline-flex items-center justify-center rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
            >
              Comparar planos
            </Link>
            <Link
              href={getAssinaturaUrl(`/assinatura?plano=${upgradeTarget}`)}
              className="inline-flex items-center justify-center rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Fazer upgrade
            </Link>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <Card title="1. Dados principais" subtitle="Informações básicas para identificar e atender bem a cliente.">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input label="Nome completo" value={cliente.nome} onChange={(value) => setClienteField("nome", value)} required />
                <Input label="Nome social" value={cliente.nome_social} onChange={(value) => setClienteField("nome_social", value)} />
                <Input label="Data de nascimento" value={cliente.data_nascimento} onChange={(value) => setClienteField("data_nascimento", maskDate(value))} placeholder="dd/mm/aaaa" maxLength={10} />
                <Input label="WhatsApp" value={cliente.whatsapp} onChange={(value) => setClienteField("whatsapp", maskPhone(value))} placeholder="(00) 00000-0000" maxLength={15} />
                <Input label="Telefone" value={cliente.telefone} onChange={(value) => setClienteField("telefone", maskPhone(value))} placeholder="(00) 00000-0000" maxLength={15} />
                <Input label="E-mail" type="email" value={cliente.email} onChange={(value) => setClienteField("email", value)} />
                <Input label="CPF" value={cliente.cpf} onChange={(value) => setClienteField("cpf", maskCPF(value))} placeholder="000.000.000-00" maxLength={14} />
                <Input label="Profissão" value={cliente.profissao} onChange={(value) => setClienteField("profissao", value)} />
                <Input label="CEP" value={cliente.cep} onChange={(value) => setClienteField("cep", maskCEP(value))} onBlur={() => void buscarCep(cliente.cep)} placeholder="00000-000" maxLength={9} helperText={buscandoCep ? "Buscando CEP..." : ""} />
                <Input label="Estado" value={cliente.estado} onChange={(value) => setClienteField("estado", value.toUpperCase())} maxLength={2} />
                <div className="md:col-span-2"><Input label="Endereço" value={cliente.endereco} onChange={(value) => setClienteField("endereco", value)} /></div>
                <Input label="Número" value={cliente.numero} onChange={(value) => setClienteField("numero", value)} />
                <Input label="Bairro" value={cliente.bairro} onChange={(value) => setClienteField("bairro", value)} />
                <Input label="Cidade" value={cliente.cidade} onChange={(value) => setClienteField("cidade", value)} />
                <div className="md:col-span-2"><Textarea label="Observações gerais" value={cliente.observacoes} onChange={(value) => setClienteField("observacoes", value)} /></div>
              </div>
            </Card>

            <Card title="2. Cuidados e ficha técnica" subtitle="Informações importantes para um atendimento seguro.">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Textarea label="Alergias" value={ficha.alergias} onChange={(value) => setFichaField("alergias", value)} />
                <Textarea label="Uso de medicamentos" value={ficha.uso_medicamentos} onChange={(value) => setFichaField("uso_medicamentos", value)} />
                <Textarea label="Histórico químico" value={ficha.historico_quimico} onChange={(value) => setFichaField("historico_quimico", value)} />
                <Textarea label="Condições do couro cabeludo / pele" value={ficha.condicoes_couro_cabeludo_pele} onChange={(value) => setFichaField("condicoes_couro_cabeludo_pele", value)} />
                <Textarea label="Restrições químicas" value={ficha.restricoes_quimicas} onChange={(value) => setFichaField("restricoes_quimicas", value)} />
                <Textarea label="Observações técnicas" value={ficha.observacoes_tecnicas} onChange={(value) => setFichaField("observacoes_tecnicas", value)} />
                <Switch label="Gestante" checked={ficha.gestante} onChange={(value) => setFichaField("gestante", value)} />
                <Switch label="Lactante" checked={ficha.lactante} onChange={(value) => setFichaField("lactante", value)} />
              </div>
            </Card>

            <Card title="3. Preferencias de atendimento" subtitle="Detalhes que ajudam a personalizar a experiência.">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input label="Bebida favorita" value={preferencias.bebida_favorita} onChange={(value) => setPreferenciasField("bebida_favorita", value)} />
                <Select label="Estilo de atendimento" value={preferencias.estilo_atendimento} onChange={(value) => setPreferenciasField("estilo_atendimento", value)} options={[{ value: "", label: "Selecione" }, { value: "conversa", label: "Gosta de conversar" }, { value: "silencio", label: "Prefere silêncio" }, { value: "tanto_faz", label: "Tanto faz" }]} />
                <Input label="Como conheceu o salão?" value={preferencias.como_conheceu_salao} onChange={(value) => setPreferenciasField("como_conheceu_salao", value)} />
                <Select label="Frequência de visitas" value={preferencias.frequencia_visitas} onChange={(value) => setPreferenciasField("frequencia_visitas", value)} options={[{ value: "", label: "Selecione" }, { value: "semanal", label: "Semanal" }, { value: "quinzenal", label: "Quinzenal" }, { value: "mensal", label: "Mensal" }, { value: "eventual", label: "Eventual" }]} />
                <Select label="Profissional favorito" value={preferencias.profissional_favorito_id} onChange={(value) => setPreferenciasField("profissional_favorito_id", value)} options={[{ value: "", label: "Selecione" }, ...profissionais.map((profissional) => ({ value: profissional.id, label: profissional.nome }))]} />
                <div className="md:col-span-2"><Textarea label="Revistas / assuntos preferidos" value={preferencias.revistas_assuntos_preferidos} onChange={(value) => setPreferenciasField("revistas_assuntos_preferidos", value)} /></div>
                <div className="md:col-span-2"><Textarea label="Preferências gerais" value={preferencias.preferencias_gerais} onChange={(value) => setPreferenciasField("preferencias_gerais", value)} /></div>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card title="4. Autorizacoes" subtitle="Imagem, comunicacao e consentimentos da cliente.">
              <div className="space-y-4">
                <Switch label="Autoriza uso de imagem" checked={autorizacoes.autoriza_uso_imagem} onChange={(value) => setAutorizacoesField("autoriza_uso_imagem", value)} />
                <Switch label="Autoriza promoções no WhatsApp" checked={autorizacoes.autoriza_whatsapp_marketing} onChange={(value) => setAutorizacoesField("autoriza_whatsapp_marketing", value)} />
                <Switch label="Autoriza promoções por e-mail" checked={autorizacoes.autoriza_email_marketing} onChange={(value) => setAutorizacoesField("autoriza_email_marketing", value)} />
                <Switch label="Termo LGPD aceito" checked={autorizacoes.termo_lgpd_aceito} onChange={(value) => setAutorizacoesField("termo_lgpd_aceito", value)} />
                <Textarea label="Observações" value={autorizacoes.observacoes_autorizacao} onChange={(value) => setAutorizacoesField("observacoes_autorizacao", value)} />
              </div>
            </Card>

            <Card title="5. Status e foto" subtitle="Controle simples do cadastro.">
              <div className="space-y-4">
                <Select label="Status" value={cliente.ativo ? "ativo" : "inativo"} onChange={(value) => { const ativo = value === "ativo"; setClienteField("ativo", ativo); setClienteField("status", ativo ? "ativo" : "inativo"); }} options={[{ value: "ativo", label: "Ativo" }, { value: "inativo", label: "Inativo" }]} />
                <Input label="URL da foto" value={cliente.foto_url} onChange={(value) => setClienteField("foto_url", value)} />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
