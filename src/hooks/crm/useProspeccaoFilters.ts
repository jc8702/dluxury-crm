import { useMemo } from 'react';
import type { Prospeccao } from './useProspeccaoHook';

export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  novo_contato: { label: 'Novo Contato', color: '#6366f1', bg: '#eef2ff' },
  primeiro_contato_feito: { label: '1º Contato Feito', color: '#0ea5e9', bg: '#e0f2fe' },
  aguardando_retorno: { label: 'Aguard. Retorno', color: '#f59e0b', bg: '#fef3c7' },
  visita_agendada: { label: 'Visita Agendada', color: '#8b5cf6', bg: '#f5f3ff' },
  proposta_enviada: { label: 'Proposta Enviada', color: '#3b82f6', bg: '#eff6ff' },
  negociacao: { label: 'Negociação', color: '#f97316', bg: '#fff7ed' },
  ganho: { label: 'Ganho ✓', color: '#22c55e', bg: '#f0fdf4' },
  perdido: { label: 'Perdido', color: '#ef4444', bg: '#fef2f2' },
  desqualificado: { label: 'Desqualificado', color: '#94a3b8', bg: '#f8fafc' },
};

export const ORIGENS = [
  'indicacao',
  'instagram',
  'google',
  'tiktok',
  'facebook',
  'feira',
  'passante',
  'whatsapp',
  'ligacao_ativa',
  'outro',
];

export const KANBAN_COLS = [
  'novo_contato',
  'primeiro_contato_feito',
  'aguardando_retorno',
  'visita_agendada',
  'proposta_enviada',
  'negociacao',
];

export function useProspeccaoFilters(leads: Prospeccao[]) {
  const groupedByStatus = useMemo(() => {
    const groups: Record<string, Prospeccao[]> = {};
    KANBAN_COLS.forEach((s) => {
      groups[s] = [];
    });
    leads.forEach((l) => {
      if (groups[l.status]) groups[l.status].push(l);
    });
    return groups;
  }, [leads]);

  return { groupedByStatus };
}

export function fmtCurrency(val?: number | string | null): string {
  if (val === null || val === undefined) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val));
}

export function fmtDate(dt: string): string {
  return new Date(dt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });
}
