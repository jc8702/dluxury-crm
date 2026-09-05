import { useMemo } from 'react';
import type { Prospeccao } from './useProspeccaoHook';

export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  novo_contato: { label: 'Novo Contato', color: '#0D66CC', bg: '#E0EFFF' },
  primeiro_contato_feito: { label: '1º Contato Feito', color: '#17A2B8', bg: '#E0F2FE' },
  aguardando_retorno: { label: 'Aguard. Retorno', color: '#FFC107', bg: '#FFF3CD' },
  visita_agendada: { label: 'Visita Agendada', color: '#0D66CC', bg: '#E0EFFF' },
  proposta_enviada: { label: 'Proposta Enviada', color: '#17A2B8', bg: '#E0F7FA' },
  negociacao: { label: 'Negociação', color: '#E2AC00', bg: '#FFF8E0' },
  ganho: { label: 'Ganho ✓', color: '#28A745', bg: '#E6F4EA' },
  perdido: { label: 'Perdido', color: '#DC3545', bg: '#FBE9EB' },
  desqualificado: { label: 'Desqualificado', color: '#6B7280', bg: '#F5F5F5' },
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
