import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClienteService } from "@/services/clienteService";

function createQuery(result: Record<string, unknown>) {
  const query: Record<string, any> = {};
  const chain = vi.fn(() => query);

  query.select = vi.fn(() => query);
  query.insert = vi.fn(() => query);
  query.update = vi.fn(() => query);
  query.delete = vi.fn(() => query);
  query.eq = chain;
  query.in = chain;
  query.order = chain;
  query.limit = chain;
  query.maybeSingle = vi.fn(() => Promise.resolve(result));
  query.single = vi.fn(() => Promise.resolve(result));
  query.then = (onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(onFulfilled, onRejected);

  return query;
}

const defaultResult = { data: [], error: null };
const mockSupabaseAdmin = {
  from: vi.fn(() => createQuery(defaultResult)),
  rpc: vi.fn(() => Promise.resolve(defaultResult)),
};

describe("createClienteService", () => {
  let service: ReturnType<typeof createClienteService>;

  beforeEach(() => {
    mockSupabaseAdmin.from.mockReset();
    mockSupabaseAdmin.from.mockImplementation(() => createQuery(defaultResult));
    service = createClienteService(mockSupabaseAdmin as any);
  });

  describe("verificarDuplicidade", () => {
    it("throws when email already exists for another client", async () => {
      mockSupabaseAdmin.from.mockImplementationOnce(() =>
        createQuery({ data: [{ id: "cliente-456", nome: "João" }], error: null })
      );

      await expect(
        service.verificarDuplicidade({
          idSalao: "salao-1",
          idClienteAtual: "cliente-123",
          email: "joao@email.com",
        })
      ).rejects.toThrow("Ja existe cliente com este e-mail: João");
    });

    it("allows same email for current client being updated", async () => {
      mockSupabaseAdmin.from.mockImplementationOnce(() =>
        createQuery({ data: [{ id: "cliente-123", nome: "João" }], error: null })
      );

      await expect(
        service.verificarDuplicidade({
          idSalao: "salao-1",
          idClienteAtual: "cliente-123",
          email: "joao@email.com",
        })
      ).resolves.toBeUndefined();
    });

    it("throws when whatsapp matches existing client", async () => {
      mockSupabaseAdmin.from.mockImplementationOnce(() =>
        createQuery({ data: [{ id: "cliente-456", nome: "Maria", whatsapp: "11999999999" }], error: null })
      );

      await expect(
        service.verificarDuplicidade({ idSalao: "salao-1", whatsapp: "11999999999" })
      ).rejects.toThrow("Ja existe cliente com contato ou CPF parecido: Maria");
    });

    it("normalizes phone numbers before comparison", async () => {
      mockSupabaseAdmin.from.mockImplementationOnce(() =>
        createQuery({ data: [{ id: "cliente-456", nome: "Maria", telefone: "(11) 99999-9999" }], error: null })
      );

      await expect(
        service.verificarDuplicidade({ idSalao: "salao-1", telefone: "11 99999-9999" })
      ).rejects.toThrow("Maria");
    });
  });

  describe("salvar", () => {
    it("creates new client when no id provided", async () => {
      mockSupabaseAdmin.from.mockImplementationOnce(() =>
        createQuery({ data: { id: "cliente-123" }, error: null })
      );

      const result = await service.salvar({
        idSalao: "salao-1",
        payload: { nome: "Novo Cliente", email: "novo@email.com" },
      });

      expect(result.idCliente).toBe("cliente-123");
      expect(mockSupabaseAdmin.from).toHaveBeenCalledWith("clientes");
    });

    it("updates existing client when id provided", async () => {
      mockSupabaseAdmin.from.mockImplementationOnce(() =>
        createQuery({ data: { id: "cliente-123" }, error: null })
      );

      const result = await service.salvar({
        idSalao: "salao-1",
        idCliente: "cliente-123",
        payload: { nome: "Cliente Atualizado" },
      });

      expect(result.idCliente).toBe("cliente-123");
    });

    it("throws when updating non-existent client", async () => {
      mockSupabaseAdmin.from.mockImplementationOnce(() => createQuery({ data: null, error: null }));

      await expect(
        service.salvar({
          idSalao: "salao-1",
          idCliente: "inexistente",
          payload: { nome: "Teste" },
        })
      ).rejects.toThrow("Cliente nao encontrado para atualizacao");
    });
  });

  describe("alterarStatus", () => {
    it("activates client", async () => {
      mockSupabaseAdmin.from.mockImplementationOnce(() =>
        createQuery({ data: { id: "cliente-123", ativo: "ativo", status: "ativo" }, error: null })
      );

      const result = await service.alterarStatus({ idSalao: "salao-1", idCliente: "cliente-123", ativo: true });

      expect(result.ativo).toBe(true);
      expect(result.status).toBe("ativo");
    });

    it("deactivates client", async () => {
      mockSupabaseAdmin.from.mockImplementationOnce(() =>
        createQuery({ data: { id: "cliente-123", ativo: "inativo", status: "inativo" }, error: null })
      );

      const result = await service.alterarStatus({ idSalao: "salao-1", idCliente: "cliente-123", ativo: false });

      expect(result.ativo).toBe(false);
      expect(result.status).toBe("inativo");
    });
  });

  describe("contarDependenciasExclusao", () => {
    it("returns counts of appointments and comandas", async () => {
      mockSupabaseAdmin.from
        .mockImplementationOnce(() => createQuery({ count: 5, error: null }))
        .mockImplementationOnce(() => createQuery({ count: 3, error: null }));

      const result = await service.contarDependenciasExclusao({ idSalao: "salao-1", idCliente: "cliente-123" });

      expect(result.agendamentosCount).toBe(5);
      expect(result.comandasCount).toBe(3);
    });
  });

  describe("excluir", () => {
    it("deletes all related records then the client", async () => {
      mockSupabaseAdmin.from.mockImplementation(() => createQuery({ error: null }));

      const result = await service.excluir({ idSalao: "salao-1", idCliente: "cliente-123" });

      expect(result.idCliente).toBe("cliente-123");
      expect(mockSupabaseAdmin.from).toHaveBeenCalledTimes(6);
    });

    it("throws on first delete error", async () => {
      mockSupabaseAdmin.from
        .mockImplementationOnce(() => createQuery({ error: { message: "FK violation" } }))
        .mockImplementation(() => createQuery({ error: null }));

      await expect(
        service.excluir({ idSalao: "salao-1", idCliente: "cliente-123" })
      ).rejects.toThrow("FK violation");
    });
  });

  describe("upsertByCliente", () => {
    it("updates existing record", async () => {
      mockSupabaseAdmin.from
        .mockImplementationOnce(() => createQuery({ data: [{ id: "existing-1" }], error: null }))
        .mockImplementationOnce(() => createQuery({ error: null }));

      await service.upsertByCliente({
        table: "clientes_ficha_tecnica",
        payload: { observacoes: "Nova observacao" },
        idSalao: "salao-1",
        idCliente: "cliente-123",
      });

      expect(mockSupabaseAdmin.from).toHaveBeenCalledWith("clientes_ficha_tecnica");
    });

    it("inserts new record when none exists", async () => {
      mockSupabaseAdmin.from
        .mockImplementationOnce(() => createQuery({ data: [], error: null }))
        .mockImplementationOnce(() => createQuery({ error: null }));

      await service.upsertByCliente({
        table: "clientes_preferencias",
        payload: { preferencia: "valor" },
        idSalao: "salao-1",
        idCliente: "cliente-123",
      });
    });
  });
});
