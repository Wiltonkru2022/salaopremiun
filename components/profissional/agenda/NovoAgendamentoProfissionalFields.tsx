"use client";

import { useEffect, useMemo, useState } from "react";
import SearchableSelect, {
  type SearchableOption,
} from "@/components/ui/SearchableSelect";

type ServicoOption = SearchableOption;
type ProfissionalOption = SearchableOption;

type VinculoServicoProfissional = {
  idServico: string;
  idProfissional: string;
};

type Props = {
  servicos: ServicoOption[];
  profissionais: ProfissionalOption[];
  vinculos: VinculoServicoProfissional[];
  defaultServicoId?: string | null;
  defaultProfissionalId?: string | null;
  permiteEscolherProfissional: boolean;
};

export default function NovoAgendamentoProfissionalFields({
  servicos,
  profissionais,
  vinculos,
  defaultServicoId = "",
  defaultProfissionalId = "",
  permiteEscolherProfissional,
}: Props) {
  const [servicoId, setServicoId] = useState(defaultServicoId || "");
  const [profissionalId, setProfissionalId] = useState(
    defaultProfissionalId || ""
  );

  const profissionaisDoServico = useMemo(() => {
    if (!permiteEscolherProfissional) return profissionais;
    if (!servicoId) return [];

    const idsPermitidos = new Set(
      vinculos
        .filter((vinculo) => vinculo.idServico === servicoId)
        .map((vinculo) => vinculo.idProfissional)
    );

    return profissionais.filter((profissional) =>
      idsPermitidos.has(profissional.value)
    );
  }, [permiteEscolherProfissional, profissionais, servicoId, vinculos]);

  useEffect(() => {
    if (!permiteEscolherProfissional) return;

    if (!servicoId || !profissionalId) {
      setProfissionalId("");
      return;
    }

    const profissionalAtualAindaAtende = profissionaisDoServico.some(
      (profissional) => profissional.value === profissionalId
    );

    if (!profissionalAtualAindaAtende) setProfissionalId("");
  }, [
    permiteEscolherProfissional,
    profissionalId,
    profissionaisDoServico,
    servicoId,
  ]);

  return (
    <div className="space-y-3.5">
      <div className="block text-sm font-medium text-zinc-700">
        <SearchableSelect
          label="Servico"
          placeholder="Digite o nome do servico"
          emptyText="Nenhum servico encontrado."
          options={servicos}
          value={servicoId}
          onChange={setServicoId}
        />
        <input type="hidden" name="servico_id" value={servicoId} />
      </div>

      {permiteEscolherProfissional ? (
        <div className="block text-sm font-medium text-zinc-700">
          <SearchableSelect
            label="Profissional"
            placeholder={
              servicoId
                ? "Selecione o profissional"
                : "Escolha um servico primeiro"
            }
            emptyText={
              servicoId
                ? "Nenhum profissional vinculado a este servico."
                : "Escolha um servico primeiro."
            }
            options={profissionaisDoServico}
            value={profissionalId}
            onChange={setProfissionalId}
            disabled={!servicoId}
          />
          <input type="hidden" name="profissional_id" value={profissionalId} />
        </div>
      ) : (
        <input type="hidden" name="profissional_id" value={profissionalId} />
      )}
    </div>
  );
}
