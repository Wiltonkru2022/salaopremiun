import type { TipoItemComanda } from "./types";

export type ModalItemState = {
  open: boolean;
  mode: "create" | "edit";
  itemId: string | null;
  tipoItem: TipoItemComanda;
  catalogoId: string;
  descricao: string;
  quantidade: string;
  valorUnitario: string;
  idProfissional: string;
  idAssistente: string;
};

export const INITIAL_MODAL_ITEM_STATE: ModalItemState = {
  open: false,
  mode: "create",
  itemId: null,
  tipoItem: "servico",
  catalogoId: "",
  descricao: "",
  quantidade: "1",
  valorUnitario: "0,00",
  idProfissional: "",
  idAssistente: "",
};
