import { toNumber } from "./calcularTotal";

export type CalcularComissaoInput = {
  valorBase: number | string | null | undefined;
  percentual?: number | string | null;
  taxaMaquininha?: number | string | null;
  descontaTaxaMaquininha?: boolean | null;
};

export type ComissaoCalculada = {
  baseConsiderada: number;
  percentual: number;
  taxaDescontada: number;
  valorComissao: number;
};

export function calcularComissao(input: CalcularComissaoInput): ComissaoCalculada {
  const valorBase = Math.max(toNumber(input.valorBase, 0), 0);
  const percentual = Math.max(toNumber(input.percentual, 0), 0);
  const taxaDescontada = input.descontaTaxaMaquininha
    ? Math.max(toNumber(input.taxaMaquininha, 0), 0)
    : 0;
  const baseConsiderada = Math.max(valorBase - taxaDescontada, 0);

  return {
    baseConsiderada,
    percentual,
    taxaDescontada,
    valorComissao: baseConsiderada * (percentual / 100),
  };
}
