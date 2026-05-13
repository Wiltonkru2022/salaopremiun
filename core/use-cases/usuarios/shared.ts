import { z } from "zod";

export const NIVEIS_USUARIO = [
  "admin",
  "gerente",
  "recepcao",
  "profissional",
] as const;

export const STATUS_USUARIO = ["ativo", "inativo"] as const;

export const criarUsuarioSchema = z.object({
  idSalao: z.string().trim().min(1, "Salão não informado."),
  nome: z.string().trim().min(1, "Nome é obrigatório."),
  email: z.string().trim().min(1, "E-mail é obrigatório."),
  senha: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
  nivel: z.enum(NIVEIS_USUARIO),
  status: z.enum(STATUS_USUARIO),
});

export const atualizarUsuarioSchema = z.object({
  idUsuario: z.string().trim().min(1, "Usuário inválido."),
  idSalao: z.string().trim().min(1, "Usuário inválido."),
  nome: z.string().trim().min(1, "Nome é obrigatório."),
  email: z.string().trim().min(1, "E-mail é obrigatório."),
  nivel: z.enum(NIVEIS_USUARIO),
  status: z.enum(STATUS_USUARIO),
  senha: z.string().optional().default(""),
});

export const excluirUsuarioSchema = z.object({
  idUsuario: z.string().trim().min(1, "idUsuario e obrigatorio."),
  idSalao: z.string().trim().min(1, "idSalao e obrigatorio."),
});

export class UsuarioUseCaseError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "UsuarioUseCaseError";
  }
}

export function normalizeEmail(value: string) {
  return String(value || "").trim().toLowerCase();
}
