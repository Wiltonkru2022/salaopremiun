import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComandaService } from '@/services/comandaService';

const mockDatabaseAdmin = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
          limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
        limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      in: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
          limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        maybeSingle: vi.fn(() => Promise.resolve({ data: { id: 'comanda-123' }, error: null })),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: { id: 'comanda-123' }, error: null })),
          })),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
  })),
};

vi.mock('@/lib/comandas/processar', () => ({
  processarCriacaoPorAgendamento: vi.fn(),
  salvarBaseComanda: vi.fn(),
  adicionarItemComanda: vi.fn(),
  editarItemComanda: vi.fn(),
  removerItemComanda: vi.fn(),
  enviarComandaParaPagamento: vi.fn(),
}));

vi.mock('@/lib/system-logs', () => ({
  registrarLogSistema: vi.fn(),
}));

describe('createComandaService', () => {
  let service: ReturnType<typeof createComandaService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = createComandaService(mockDatabaseAdmin as any);
  });

  describe('criarPorAgendamento', () => {
    it('calls processarCriacaoPorAgendamento with correct params', async () => {
      const { processarCriacaoPorAgendamento } = await import('@/lib/comandas/processar');
      vi.mocked(processarCriacaoPorAgendamento).mockResolvedValue({
        idComanda: 'comanda-123',
        jaExistia: false,
      });

      const result = await service.criarPorAgendamento({
        idSalao: 'salao-1',
        idAgendamento: 'agend-123',
      });

      expect(result.idComanda).toBe('comanda-123');
      expect(result.jaExistia).toBe(false);
      expect(processarCriacaoPorAgendamento).toHaveBeenCalledWith({
        databaseAdmin: mockDatabaseAdmin,
        idSalao: 'salao-1',
        idAgendamento: 'agend-123',
      });
    });
  });

  describe('salvarBase', () => {
    it('calls salvarBaseComanda with correct params', async () => {
      const { salvarBaseComanda } = await import('@/lib/comandas/processar');
      vi.mocked(salvarBaseComanda).mockResolvedValue({
        idComanda: 'comanda-123',
        numero: 1,
        status: 'aberta',
      });

      const result = await service.salvarBase({
        idSalao: 'salao-1',
        comanda: { numero: 1, status: 'aberta' },
      });

      expect(result.idComanda).toBe('comanda-123');
      expect(result.numero).toBe(1);
      expect(salvarBaseComanda).toHaveBeenCalledWith({
        databaseAdmin: mockDatabaseAdmin,
        idSalao: 'salao-1',
        comanda: { numero: 1, status: 'aberta' },
      });
    });
  });

  describe('adicionarItem', () => {
    it('calls adicionarItemComanda with correct params', async () => {
      const { adicionarItemComanda } = await import('@/lib/comandas/processar');
      vi.mocked(adicionarItemComanda).mockResolvedValue({
        idComanda: 'comanda-123',
        idItem: 'item-456',
        idempotencyKey: 'idem-123',
        idempotentReplay: false,
        resolved: {
          tipoItem: 'servico',
          quantidade: 1,
          valorUnitario: 100,
          idServico: 'serv-1',
          idProduto: null,
          idProfissional: null,
          idAssistente: null,
          descricao: 'Corte',
          custoTotal: 10,
          comissaoPercentual: 50,
          comissaoAssistentePercentual: 0,
          baseCalculo: 'bruto',
          descontaTaxaMaquininha: false,
          origem: 'manual',
          observacoes: null,
          idAgendamento: null,
          ehCombo: false,
          comboResumo: null,
        },
      });

      const result = await service.adicionarItem({
        idSalao: 'salao-1',
        comanda: { idComanda: 'comanda-123' },
        item: { tipo_item: 'servico', id_servico: 'serv-1' },
        idempotencyKey: 'idem-123',
      });

      expect(result.idComanda).toBe('comanda-123');
      expect(result.idItem).toBe('item-456');
      expect(adicionarItemComanda).toHaveBeenCalledWith({
        databaseAdmin: mockDatabaseAdmin,
        idSalao: 'salao-1',
        comanda: { idComanda: 'comanda-123' },
        item: { tipo_item: 'servico', id_servico: 'serv-1' },
        idempotencyKey: 'idem-123',
      });
    });
  });

  describe('editarItem', () => {
    it('calls editarItemComanda with correct params', async () => {
      const { editarItemComanda } = await import('@/lib/comandas/processar');
      vi.mocked(editarItemComanda).mockResolvedValue({
        idComanda: 'comanda-123',
        idItem: 'item-456',
        resolved: {
          tipoItem: 'servico',
          quantidade: 2,
          valorUnitario: 100,
          idServico: 'serv-1',
          idProduto: null,
          idProfissional: null,
          idAssistente: null,
          descricao: 'Corte',
          custoTotal: 20,
          comissaoPercentual: 50,
          comissaoAssistentePercentual: 0,
          baseCalculo: 'bruto',
          descontaTaxaMaquininha: false,
          origem: 'manual',
          observacoes: null,
          idAgendamento: null,
          ehCombo: false,
          comboResumo: null,
        },
      });

      const result = await service.editarItem({
        idSalao: 'salao-1',
        comanda: { idComanda: 'comanda-123' },
        item: { idItem: 'item-456', tipo_item: 'servico', quantidade: 2 },
      });

      expect(result.idItem).toBe('item-456');
    });
  });

  describe('removerItem', () => {
    it('calls removerItemComanda with correct params', async () => {
      const { removerItemComanda } = await import('@/lib/comandas/processar');
      vi.mocked(removerItemComanda).mockResolvedValue({
        idComanda: 'comanda-123',
        idItem: 'item-456',
      });

      const result = await service.removerItem({
        idSalao: 'salao-1',
        comanda: { idComanda: 'comanda-123' },
        item: { idItem: 'item-456' },
      });

      expect(result.idComanda).toBe('comanda-123');
      expect(result.idItem).toBe('item-456');
    });
  });

  describe('enviarParaPagamento', () => {
    it('calls enviarComandaParaPagamento with correct params', async () => {
      const { enviarComandaParaPagamento } = await import('@/lib/comandas/processar');
      vi.mocked(enviarComandaParaPagamento).mockResolvedValue({
        idComanda: 'comanda-123',
        status: 'aguardando_pagamento',
      });

      const result = await service.enviarParaPagamento({
        idSalao: 'salao-1',
        comanda: { idComanda: 'comanda-123' },
      });

      expect(result.idComanda).toBe('comanda-123');
      expect(result.status).toBe('aguardando_pagamento');
    });
  });

  describe('registrarLog', () => {
    it('calls registrarLogSistema with correct params', async () => {
      const { registrarLogSistema } = await import('@/lib/system-logs');
      vi.mocked(registrarLogSistema).mockResolvedValue(undefined);

      await service.registrarLog({
        gravidade: 'info',
        idSalao: 'salao-1',
        idUsuario: 'user-123',
        mensagem: 'Test log',
        detalhes: { acao: 'test' },
      });

      expect(registrarLogSistema).toHaveBeenCalledWith({
        gravidade: 'info',
        modulo: 'comandas',
        idSalao: 'salao-1',
        idUsuario: 'user-123',
        mensagem: 'Test log',
        detalhes: { acao: 'test' },
      });
    });
  });
});