import { describe, test, expect } from 'vitest';
import {
  toUTCDate,
  parseLocalDateTime,
  toInputDateString,
  formatDatePtBR,
  formatDateTimePtBR,
} from '../utils/dateUtils';

describe('dateUtils', () => {
  describe('toUTCDate', () => {
    test('cria data em UTC', () => {
      const d = toUTCDate(2024, 6, 15, 14, 30);
      expect(d.toISOString()).toBe('2024-07-15T14:30:00.000Z');
    });

    test('usa meia-noite quando hora nao informada', () => {
      const d = toUTCDate(2024, 0, 1);
      expect(d.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    });
  });

  describe('parseLocalDateTime', () => {
    test('parse string YYYY-MM-DDTHH:mm para UTC', () => {
      const d = parseLocalDateTime('2024-07-15T14:30');
      expect(d?.toISOString()).toBe('2024-07-15T14:30:00.000Z');
    });

    test('retorna null para string vazia', () => {
      expect(parseLocalDateTime('')).toBeNull();
    });

    test('aceita apenas data sem hora', () => {
      const d = parseLocalDateTime('2024-07-15');
      expect(d?.toISOString()).toBe('2024-07-15T00:00:00.000Z');
    });
  });

  describe('toInputDateString', () => {
    test('formata Date para input datetime-local', () => {
      const d = new Date(2024, 6, 15, 14, 30);
      const s = toInputDateString(d);
      expect(s).toMatch(/^2024-07-15T14:30$/);
    });

    test('retorna string vazia para null', () => {
      expect(toInputDateString(null)).toBe('');
    });
  });

  describe('formatDatePtBR', () => {
    test('formata data em pt-BR', () => {
      const d = new Date(2024, 6, 15);
      const s = formatDatePtBR(d);
      expect(s).toMatch(/15\/07\/2024/);
    });

    test('retorna "-" para null', () => {
      expect(formatDatePtBR(null)).toBe('-');
    });
  });

  describe('formatDateTimePtBR', () => {
    test('formata data e hora em pt-BR', () => {
      const d = new Date(2024, 6, 15, 14, 30);
      const s = formatDateTimePtBR(d);
      expect(s).toMatch(/15\/07\/2024/);
      expect(s).toMatch(/14:30/);
    });

    test('retorna "-" para null', () => {
      expect(formatDateTimePtBR(null)).toBe('-');
    });
  });
});
