import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseProcessarComandaInput,
  processarComandaUseCase,
  ProcessarComandaUseCaseError,
} from '@/core/use-cases/comandas/processarComanda';
import type { ComandaService } from '@/services/comandaService';

vi.mock('@/lib/comandas/processar', () => ({
  COMANDA_ACTIONS: [
    'salvar_base',
    'adicionar_item',
    'editar_item',
    'remover_item',
    'enviar_pagamento',
    'criar_por_agendamento',
  ],
  resolveComandaHttpStatus: vi.fn(() => 500),
  sanitizeIdempotencyKey: vi.fn((v) => v),
  sanitizeUuid: vi.fn((v) => v),
}));

const mockComandaService: ComandaService = {
  criarPorAgendamento: vi.fn(),
  salvarBase: vi.fn(),
  adicionarItem: vi.fn(),
  editarItem: vi.fn(),
  removerItem: vi.fn(),
  enviarParaPagamento: vi.fn(),
  registrarLog: vi.fn(),
};

describe('processarComandaUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseProcessarComandaInput', () => {
    it('parses valid criar_por_agendamento input', () => {
      const input = {
        idSalao: 'salao-123',
        acao: 'criar_por_agendamento' as const,
        idempotencyKey: 'idem-123',
        comanda: {},
        item: { id_agendamento: 'agend-456' },
      };

      const result = parseProcessarComandaInput(input);

      expect(result.idSalao).toBe('salao-123');
      expect(result.acao).toBe('criar_por_agendamento');
      expect(result.idempotencyKey).toBe('idem-123');
    });

    it('parses valid salvar_base input', () => {
      const input = {
        idSalao: 'salao-123',
        acao: 'salvar_base' as const,
        comanda: { numero: 1 },
        item: {},
      };

      const result = parseProcessarComandaInput(input);

      expect(result.acao).toBe('salvar_base');
      expect(result.comanda.numero).toBe(1);
    });

    it('throws on missing idSalao', () => {
      const input = {
        acao: 'salvar_base' as const,
        comanda: { numero: 1 },
        item: {},
      };

      expect(() => parseProcessarComandaInput(input)).toThrow();
    });

    it('throws on invalid acao', () => {
      const input = {
        idSalao: 'salao-123',
        acao: 'acao_invalida',
        comanda: {},
        item: {},
      };

      expect(() => parseProcessarComandaInput(input)).toThrow();
    });

    it('throws on adicionar_item without tipo_item', () => {
      const input = {
        idSalao: 'salao-123',
        acao: 'adicionar_item' as const,
        comanda: { idComanda: 'com-1' },
        item: { quantidade: 1 },
      };

      expect(() => parseProcessarComandaInput(input)).toThrow('Tipo do item obrigatorio');
    });

    it('throws on editar_item without idItem', () => {
      const input = {
        idSalao: 'salao-123',
        acao: 'editar_item' as const,
        comanda: { idComanda: 'com-1' },
        item: { tipo_item: 'servico' },
      };

      expect(() => parseProcessarComandaInput(input)).toThrow('Item obrigatorio para editar');
    });
  });

  describe('processarComandaUseCase', () => {
    const actorUserId = 'user-123';
    const idSalao = 'salao-123';

    it('handles criar_por_agendamento successfully', async () => {
      const input = {
        idSalao,
        acao: 'criar_por_agendamento' as const,
        idempotencyKey: 'idem-123',
        comanda: {},
        item: { id_agendamento: 'agend-456' },
      };

      (mockComandaService.criarPorAgendamento as vi.Mock).mockResolvedValue({
        idComanda: 'comanda-789',
        jaExistia: false,
      });

      const result = await processarComandaUseCase({
        input,
        service: mockComandaService,
        actorUserId,
      });

      expect(result.status).toBe(200);
      expect(result.body.ok).toBe(true);
      expect(result.body.idComanda).toBe('comanda-789');
      expect(mockComandaService.registrarLog).toHaveBeenCalledWith(
        expect.objectContaining({
          gravidade: 'info',
          mensagem: 'Comanda criada a partir de agendamento.',
        })
      );
    });

    it('handles criar_por_agendamento with existing comanda', async () => {
      const input = {
        idSalao,
        acao: 'criar_por_agendamento' as const,
        idempotencyKey: 'idem-123',
        comanda: {},
        item: { id_agendamento: 'agend-456' },
      };

      (mockComandaService.criarPorAgendamento as vi.Mock).mockResolvedValue({
        idComanda: 'comanda-789',
        jaExistia: true,
      });

      const result = await processarComandaUseCase({
        input,
        service: mockComandaService,
        actorUserId,
      });

      expect(result.body.jaExistia).toBe(true);
      expect(mockComandaService.registrarLog).toHaveBeenCalledWith(
        expect.objectContaining({
          gravidade: 'warning',
          mensagem: 'Comanda de agendamento reaproveitada por idempotencia.',
        })
      );
    });

    it('handles salvar_base successfully', async () => {
      const input = {
        idSalao,
        acao: 'salvar_base' as const,
        comanda: { numero: 1, status: 'aberta' },
        item: {},
      };

      (mockComandaService.salvarBase as vi.Mock).mockResolvedValue({
        idComanda: 'comanda-789',
        numero: 1,
        status: 'aberta',
      });

      const result = await processarComandaUseCase({
        input,
        service: mockComandaService,
        actorUserId,
      });

      expect(result.status).toBe(200);
      expect(result.body.idComanda).toBe('comanda-789');
    });

    it('handles adicionar_item successfully', async () => {
      const input = {
        idSalao,
        acao: 'adicionar_item' as const,
        idempotencyKey: 'idem-123',
        comanda: { idComanda: 'com-1', desconto: 0, acrescimo: 0 },
        item: { tipo_item: 'servico', id_servico: 'serv-1', quantidade: 1 },
      };

      (mockComandaService.adicionarItem as vi.Mock).mockResolvedValue({
        idComanda: 'com-1',
        idItem: 'item-1',
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

      const result = await processarComandaUseCase({
        input,
        service: mockComandaService,
        actorUserId,
      });

      expect(result.status).toBe(200);
      expect(result.body.idItem).toBe('item-1');
    });

    it('handles editar_item successfully', async () => {
      const input = {
        idSalao,
        acao: 'editar_item' as const,
        comanda: { idComanda: 'com-1', desconto: 0, acrescimo: 0 },
        item: { idItem: 'item-1', tipo_item: 'servico', quantidade: 2 },
      };

      (mockComandaService.editarItem as vi.Mock).mockResolvedValue({
        idComanda: 'com-1',
        idItem: 'item-1',
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

      const result = await processarComandaUseCase({
        input,
        service: mockComandaService,
        actorUserId,
      });

      expect(result.status).toBe(200);
      expect(result.body.idItem).toBe('item-1');
    });

    it('handles remover_item successfully', async () => {
      const input = {
        idSalao,
        acao: 'remover_item' as const,
        comanda: { idComanda: 'com-1' },
        item: { idItem: 'item-1' },
      };

      (mockComandaService.removerItem as vi.Mock).mockResolvedValue({
        idComanda: 'com-1',
        idItem: 'item-1',
      });

      const result = await processarComandaUseCase({
        input,
        service: mockComandaService,
        actorUserId,
      });

      expect(result.status).toBe(200);
      expect(result.body.ok).toBe(true);
    });

    it('handles enviar_pagamento successfully', async () => {
      const input = {
        idSalao,
        acao: 'enviar_pagamento' as const,
        comanda: { idComanda: 'com-1' },
        item: {},
      };

      (mockComandaService.enviarParaPagamento as vi.Mock).mockResolvedValue({
        idComanda: 'com-1',
        status: 'aguardando_pagamento',
      });

      const result = await processarComandaUseCase({
        input,
        service: mockComandaService,
        actorUserId,
      });

      expect(result.status).toBe(200);
      expect(result.body.status).toBe('aguardando_pagamento');
    });

    it('maps criar_por_agendamento not found error to 404', async () => {
      const input = {
        idSalao,
        acao: 'criar_por_agendamento' as const,
        comanda: {},
        item: { id_agendamento: 'agend-456' },
      };

      const error = new Error('Agendamento não encontrado');
      (mockComandaService.criarPorAgendamento as vi.Mock).mockRejectedValue(error);

      await expect(
        processarComandaUseCase({ input, service: mockComandaService, actorUserId })
      ).rejects.toThrow(ProcessarComandaUseCaseError);
    });

    it('maps validation errors to 400', async () => {
      const input = {
        idSalao,
        acao: 'salvar_base' as const,
        comanda: { numero: 1 },
        item: {},
      };

      const error = new Error('Numero da comanda obrigatorio');
      (mockComandaService.salvarBase as vi.Mock).mockRejectedValue(error);

      await expect(
        processarComandaUseCase({ input, service: mockComandaService, actorUserId })
      ).rejects.toThrow(ProcessarComandaUseCaseError);
    });
  });
});