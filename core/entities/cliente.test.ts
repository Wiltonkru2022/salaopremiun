import { describe, it, expect } from 'vitest';
import {
  normalizarEmailCliente,
  normalizarTelefoneCliente,
} from '@/core/entities/cliente';

describe('cliente entity utils', () => {
  describe('normalizarEmailCliente', () => {
    it('normalizes email to lowercase and trimmed', () => {
      expect(normalizarEmailCliente('  JOAO@EMAIL.COM  ')).toBe('joao@email.com');
      expect(normalizarEmailCliente('Test@Example.COM')).toBe('test@example.com');
    });

    it('returns null for empty or whitespace', () => {
      expect(normalizarEmailCliente('')).toBeNull();
      expect(normalizarEmailCliente('   ')).toBeNull();
      expect(normalizarEmailCliente(null)).toBeNull();
      expect(normalizarEmailCliente(undefined)).toBeNull();
    });
  });

  describe('normalizarTelefoneCliente', () => {
    it('extracts only digits', () => {
      expect(normalizarTelefoneCliente('(11) 99999-9999')).toBe('11999999999');
      expect(normalizarTelefoneCliente('11 99999-9999')).toBe('11999999999');
      expect(normalizarTelefoneCliente('+55 11 99999-9999')).toBe('5511999999999');
    });

    it('returns null for empty or no digits', () => {
      expect(normalizarTelefoneCliente('')).toBeNull();
      expect(normalizarTelefoneCliente('abc')).toBeNull();
      expect(normalizarTelefoneCliente(null)).toBeNull();
      expect(normalizarTelefoneCliente(undefined)).toBeNull();
    });
  });
});