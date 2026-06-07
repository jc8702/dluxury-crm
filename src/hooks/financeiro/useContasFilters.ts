import { useState, useMemo } from 'react';
import type { ExtratoPayload } from '../../modules/financeiro/domain/types';

export function useContasFilters(extrato: ExtratoPayload | null) {
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'entrada' | 'saida'>('todos');
  const [filtroBusca, setFiltroBusca] = useState('');

  const extratoFiltrado = useMemo(() => {
    if (!extrato?.extrato) return [];
    let items = [...extrato.extrato];

    if (filtroDataInicio) {
      const inicio = new Date(filtroDataInicio);
      items = items.filter((m) => new Date(m.data) >= inicio);
    }
    if (filtroDataFim) {
      const fim = new Date(filtroDataFim + 'T23:59:59');
      items = items.filter((m) => new Date(m.data) <= fim);
    }
    if (filtroTipo === 'entrada') {
      items = items.filter((m) => Number(m.valor) > 0);
    } else if (filtroTipo === 'saida') {
      items = items.filter((m) => Number(m.valor) < 0);
    }
    if (filtroBusca.trim()) {
      const q = filtroBusca.toUpperCase();
      items = items.filter(
        (m) =>
          (m.descricao || '').toUpperCase().includes(q) ||
          (m.tipo || '').toUpperCase().includes(q) ||
          (m.origem || '').toUpperCase().includes(q),
      );
    }
    return items;
  }, [extrato, filtroDataInicio, filtroDataFim, filtroTipo, filtroBusca]);

  const extratoTotais = useMemo(() => {
    let entradas = 0,
      saidas = 0;
    extratoFiltrado.forEach((m) => {
      const v = Number(m.valor);
      if (v > 0) entradas += v;
      else saidas += Math.abs(v);
    });
    return { entradas, saidas, liquido: entradas - saidas, qtd: extratoFiltrado.length };
  }, [extratoFiltrado]);

  const exportCSV = () => {
    const header = 'Data;Descrição;Tipo;Origem;Valor;Saldo\n';
    const rows = extratoFiltrado
      .map(
        (m) =>
          `${new Date(m.data).toLocaleDateString('pt-BR')};${m.descricao || m.tipo};${m.tipo};${m.origem};${Number(m.valor).toFixed(2)};${Number(m.saldo_momento).toFixed(2)}`,
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `extrato_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const resetExtratoFilters = () => {
    setFiltroDataInicio('');
    setFiltroDataFim('');
    setFiltroTipo('todos');
    setFiltroBusca('');
  };

  return {
    filtroDataInicio,
    setFiltroDataInicio,
    filtroDataFim,
    setFiltroDataFim,
    filtroTipo,
    setFiltroTipo,
    filtroBusca,
    setFiltroBusca,
    extratoFiltrado,
    extratoTotais,
    exportCSV,
    resetExtratoFilters,
  };
}
