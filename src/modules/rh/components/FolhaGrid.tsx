import React, { useState, useCallback, useEffect } from 'react';
import { Save, FileText } from 'lucide-react';
import * as calc from '../domain/calculations';
import type { TipoHE } from '../domain/types';

interface FolhaGridProps {
  folhaId: string;
  itens: any[];
  status: 'rascunho' | 'fechada' | 'paga';
  divisor?: number;
  onUpdateItem: (folhaId: string, itemId: string, payload: any) => Promise<any>;
  onReciboClick?: (itemId: string) => void;
  onItemsChanged?: () => void;
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

function parseNum(v: unknown): number {
  return calc.toNum(v);
}

interface EditableRow {
  id: string;
  colaboradorNome: string;
  colaboradorTipo: string;
  salarioBase: number;
  faltasDias: number;
  valorFaltas: number;
  horasExtrasTipo: TipoHE;
  horasExtrasPrevistas: number;
  horasExtrasQtd: number;
  valorHorasExtrasPrevisto: number;
  valorHorasExtras: number;
  bonusProducao: number;
  adiantamento: number;
  outrosDescontos: number;
  outrosDescricao: string;
  valorLiquidoPrevisto: number;
  valorLiquido: number;
  dirty: boolean;
  saving: boolean;
}

function buildRow(item: any, divisor: number): EditableRow {
  const salarioBase = parseNum(item.salario_base ?? item.salarioBase);
  const faltasDias = parseNum(item.faltas_dias ?? item.faltasDias);
  const valorFaltas = parseNum(item.valor_faltas ?? item.valorFaltas);
  const heTipo = (item.horas_extras_tipo ?? item.horasExtrasTipo ?? '50') as TipoHE;
  const hePrev = parseNum(item.horas_extras_previstas ?? item.horasExtrasPrevistas);
  const heReal = parseNum(item.horas_extras_qtd ?? item.horasExtrasQtd);
  const bonus = parseNum(item.bonus_producao ?? item.bonusProducao);
  const adiant = parseNum(item.adiantamento);
  const outros = parseNum(item.outros_descontos ?? item.outrosDescontos);
  const outrosDesc = item.outros_descricao ?? item.outrosDescricao ?? '';

  const valorHEPrev = calc.calcValorHE(hePrev, salarioBase, divisor, heTipo);
  const valorHEReal = calc.calcValorHE(heReal, salarioBase, divisor, heTipo);

  const liquidoPrev = calc.calcLiquidoPrevisto({
    salarioBase,
    valorFaltas,
    valorHorasExtrasPrevisto: valorHEPrev,
    bonusProducao: bonus,
    adiantamento: adiant,
    outrosDescontos: outros,
  });
  const liquidoReal = calc.calcLiquido({
    salarioBase,
    valorFaltas,
    valorHorasExtras: valorHEReal,
    bonusProducao: bonus,
    adiantamento: adiant,
    outrosDescontos: outros,
  });

  return {
    id: item.id,
    colaboradorNome: item.colaborador_nome ?? item.colaboradorNome ?? '—',
    colaboradorTipo: item.colaborador_tipo ?? item.colaboradorTipo ?? '',
    salarioBase,
    faltasDias,
    valorFaltas,
    horasExtrasTipo: heTipo,
    horasExtrasPrevistas: hePrev,
    horasExtrasQtd: heReal,
    valorHorasExtrasPrevisto: valorHEPrev,
    valorHorasExtras: valorHEReal,
    bonusProducao: bonus,
    adiantamento: adiant,
    outrosDescontos: outros,
    outrosDescricao: outrosDesc,
    valorLiquidoPrevisto: liquidoPrev,
    valorLiquido: liquidoReal,
    dirty: false,
    saving: false,
  };
}

export function FolhaGrid({
  folhaId,
  itens,
  status,
  divisor = 220,
  onUpdateItem,
  onReciboClick,
  onItemsChanged,
}: FolhaGridProps) {
  const editable = status === 'rascunho';

  const [rows, setRows] = useState<EditableRow[]>(() => itens.map((i) => buildRow(i, divisor)));

  useEffect(() => {
    setRows(itens.map((i) => buildRow(i, divisor)));
  }, [itens, divisor]);

  const recalcRow = useCallback(
    (row: EditableRow): EditableRow => {
      const valorHEPrev = calc.calcValorHE(
        row.horasExtrasPrevistas,
        row.salarioBase,
        divisor,
        row.horasExtrasTipo,
      );
      const valorHEReal = calc.calcValorHE(
        row.horasExtrasQtd,
        row.salarioBase,
        divisor,
        row.horasExtrasTipo,
      );
      const liquidoPrev = calc.calcLiquidoPrevisto({
        salarioBase: row.salarioBase,
        valorFaltas: row.valorFaltas,
        valorHorasExtrasPrevisto: valorHEPrev,
        bonusProducao: row.bonusProducao,
        adiantamento: row.adiantamento,
        outrosDescontos: row.outrosDescontos,
      });
      const liquidoReal = calc.calcLiquido({
        salarioBase: row.salarioBase,
        valorFaltas: row.valorFaltas,
        valorHorasExtras: valorHEReal,
        bonusProducao: row.bonusProducao,
        adiantamento: row.adiantamento,
        outrosDescontos: row.outrosDescontos,
      });
      return {
        ...row,
        valorHorasExtrasPrevisto: valorHEPrev,
        valorHorasExtras: valorHEReal,
        valorLiquidoPrevisto: liquidoPrev,
        valorLiquido: liquidoReal,
        dirty: true,
      };
    },
    [divisor],
  );

  const updateField = (rowIdx: number, field: keyof EditableRow, value: any) => {
    setRows((prev) => {
      const next = [...prev];
      const updated = { ...next[rowIdx], [field]: value };
      next[rowIdx] = recalcRow(updated);
      return next;
    });
  };

  const saveRow = async (rowIdx: number) => {
    const row = rows[rowIdx];
    if (!row.dirty) return;
    setRows((prev) => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], saving: true };
      return next;
    });
    try {
      await onUpdateItem(folhaId, row.id, {
        horas_extras_tipo: row.horasExtrasTipo,
        horas_extras_previstas: row.horasExtrasPrevistas,
        horas_extras_qtd: row.horasExtrasQtd,
        bonus_producao: row.bonusProducao,
        outros_descontos: row.outrosDescontos,
        outros_descricao: row.outrosDescricao,
      });
      setRows((prev) => {
        const next = [...prev];
        next[rowIdx] = { ...next[rowIdx], dirty: false, saving: false };
        return next;
      });
      onItemsChanged?.();
    } catch {
      setRows((prev) => {
        const next = [...prev];
        next[rowIdx] = { ...next[rowIdx], saving: false };
        return next;
      });
    }
  };

  const totalPrev = rows.reduce((s, r) => s + r.valorLiquidoPrevisto, 0);
  const totalReal = rows.reduce((s, r) => s + r.valorLiquido, 0);

  return (
    <div className="overflow-x-auto" data-testid="folha-grid">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="text-left p-2 font-semibold whitespace-nowrap">Colaborador</th>
            <th className="p-2 font-semibold text-right whitespace-nowrap">Base</th>
            <th className="p-2 font-semibold text-right whitespace-nowrap">Faltas (dias/valor)</th>
            <th className="p-2 font-semibold text-center whitespace-nowrap">HE Tipo</th>
            <th className="p-2 font-semibold text-right whitespace-nowrap">HE Prev. (qtd/valor)</th>
            <th className="p-2 font-semibold text-right whitespace-nowrap">HE Real (qtd/valor)</th>
            <th className="p-2 font-semibold text-right whitespace-nowrap">Bônus Prod.</th>
            <th className="p-2 font-semibold text-right whitespace-nowrap">Adiant.</th>
            <th className="p-2 font-semibold text-right whitespace-nowrap">Outros Desc.</th>
            <th className="p-2 font-semibold text-right whitespace-nowrap">Líq. Previsto</th>
            <th className="p-2 font-semibold text-right whitespace-nowrap font-black">Líq. Real</th>
            <th className="p-2 font-semibold text-center whitespace-nowrap">Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={row.id}
              className={`border-b transition-colors ${row.dirty ? 'bg-warning/5' : 'hover:bg-muted/30'}`}
              data-testid={`folha-item-${row.id}`}
            >
              {/* Colaborador */}
              <td className="p-2 font-medium whitespace-nowrap">
                <span>{row.colaboradorNome}</span>
                {row.colaboradorTipo === 'socio' && (
                  <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-warning/20 text-warning-foreground">
                    Sócio
                  </span>
                )}
              </td>

              {/* Base */}
              <td className="p-2 text-right font-mono">{fmt(row.salarioBase)}</td>

              {/* Faltas read-only */}
              <td className="p-2 text-right font-mono">
                <span className="text-muted-foreground">{row.faltasDias}d</span>
                <span className="mx-1">/</span>
                <span className={row.valorFaltas > 0 ? 'text-destructive' : ''}>
                  {fmt(row.valorFaltas)}
                </span>
              </td>

              {/* HE Tipo */}
              <td className="p-2 text-center">
                {editable ? (
                  <select
                    value={row.horasExtrasTipo}
                    onChange={(e) => updateField(idx, 'horasExtrasTipo', e.target.value as TipoHE)}
                    className="bg-background border rounded px-1.5 py-1 text-xs w-16"
                    data-testid={`he-tipo-${row.id}`}
                  >
                    <option value="50">50%</option>
                    <option value="100">100%</option>
                  </select>
                ) : (
                  <span className="text-xs">{row.horasExtrasTipo}%</span>
                )}
              </td>

              {/* HE Prevista */}
              <td className="p-2 text-right font-mono">
                {editable ? (
                  <div className="flex items-center gap-1 justify-end">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={row.horasExtrasPrevistas || ''}
                      onChange={(e) =>
                        updateField(idx, 'horasExtrasPrevistas', parseFloat(e.target.value) || 0)
                      }
                      className="bg-background border rounded px-1.5 py-1 text-xs w-14 text-right"
                      placeholder="0"
                      data-testid={`he-prev-${row.id}`}
                    />
                    <span className="text-muted-foreground text-xs">h</span>
                    <span className="text-muted-foreground">
                      {fmt(row.valorHorasExtrasPrevisto)}
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">
                    {row.horasExtrasPrevistas}h {fmt(row.valorHorasExtrasPrevisto)}
                  </span>
                )}
              </td>

              {/* HE Real */}
              <td className="p-2 text-right font-mono">
                {editable ? (
                  <div className="flex items-center gap-1 justify-end">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={row.horasExtrasQtd || ''}
                      onChange={(e) =>
                        updateField(idx, 'horasExtrasQtd', parseFloat(e.target.value) || 0)
                      }
                      className="bg-background border rounded px-1.5 py-1 text-xs w-14 text-right"
                      placeholder="0"
                      data-testid={`he-real-${row.id}`}
                    />
                    <span className="text-muted-foreground text-xs">h</span>
                    <span className="font-bold">{fmt(row.valorHorasExtras)}</span>
                  </div>
                ) : (
                  <span className="font-bold">
                    {row.horasExtrasQtd}h {fmt(row.valorHorasExtras)}
                  </span>
                )}
              </td>

              {/* Bônus */}
              <td className="p-2 text-right font-mono">
                {editable ? (
                  <input
                    type="number"
                    step="50"
                    min="0"
                    value={row.bonusProducao || ''}
                    onChange={(e) =>
                      updateField(idx, 'bonusProducao', parseFloat(e.target.value) || 0)
                    }
                    className="bg-background border rounded px-1.5 py-1 text-xs w-20 text-right"
                    placeholder="0"
                    data-testid={`bonus-${row.id}`}
                  />
                ) : (
                  <span>{fmt(row.bonusProducao)}</span>
                )}
              </td>

              {/* Adiantamento read-only */}
              <td className="p-2 text-right font-mono text-muted-foreground">
                {fmt(row.adiantamento)}
              </td>

              {/* Outros descontos */}
              <td className="p-2 text-right font-mono">
                {editable ? (
                  <input
                    type="number"
                    step="10"
                    min="0"
                    value={row.outrosDescontos || ''}
                    onChange={(e) =>
                      updateField(idx, 'outrosDescontos', parseFloat(e.target.value) || 0)
                    }
                    className="bg-background border rounded px-1.5 py-1 text-xs w-20 text-right"
                    placeholder="0"
                    data-testid={`outros-${row.id}`}
                  />
                ) : (
                  <span>{fmt(row.outrosDescontos)}</span>
                )}
              </td>

              {/* Líquido Previsto */}
              <td
                className="p-2 text-right font-mono text-muted-foreground"
                data-testid={`liq-prev-${row.id}`}
              >
                {fmt(row.valorLiquidoPrevisto)}
              </td>

              {/* Líquido Real */}
              <td
                className="p-2 text-right font-mono font-black text-lg"
                data-testid={`liq-real-${row.id}`}
              >
                {fmt(row.valorLiquido)}
              </td>

              {/* Ações */}
              <td className="p-2 text-center">
                <div className="flex items-center gap-1 justify-center">
                  {editable && row.dirty && (
                    <button
                      onClick={() => saveRow(idx)}
                      disabled={row.saving}
                      className="px-2 py-1 rounded bg-primary text-primary-foreground text-xs flex items-center gap-1 disabled:opacity-50"
                      data-testid={`btn-save-${row.id}`}
                    >
                      <Save size={12} />
                      {row.saving ? '...' : 'Salvar'}
                    </button>
                  )}
                  {onReciboClick && (
                    <button
                      onClick={() => onReciboClick(row.id)}
                      className="px-2 py-1 rounded bg-muted hover:bg-muted/80 text-xs flex items-center gap-1"
                      data-testid={`btn-recibo-${row.id}`}
                    >
                      <FileText size={12} />
                      Recibo
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}

          {rows.length === 0 && (
            <tr>
              <td colSpan={12} className="p-8 text-center text-muted-foreground">
                Nenhum item na folha. Gere uma folha para preencher automaticamente.
              </td>
            </tr>
          )}
        </tbody>

        {/* Footer totals */}
        {rows.length > 0 && (
          <tfoot>
            <tr className="border-t-2 bg-muted/20">
              <td
                colSpan={9}
                className="p-2 text-right font-bold uppercase text-xs tracking-widest"
              >
                Totais
              </td>
              <td
                className="p-2 text-right font-mono text-muted-foreground font-bold"
                data-testid="total-previsto"
              >
                {fmt(totalPrev)}
              </td>
              <td className="p-2 text-right font-mono font-black text-lg" data-testid="total-real">
                {fmt(totalReal)}
              </td>
              <td className="p-2" />
            </tr>
            {Math.abs(totalPrev - totalReal) > 0.01 && (
              <tr className="bg-warning/5">
                <td colSpan={9} className="p-2 text-right text-xs text-muted-foreground">
                  Diferença (Real - Previsto)
                </td>
                <td
                  colSpan={2}
                  className="p-2 text-right font-mono font-bold text-sm"
                  data-testid="total-diff"
                >
                  <span className={totalReal - totalPrev > 0 ? 'text-success' : 'text-destructive'}>
                    {totalReal - totalPrev > 0 ? '+' : ''}
                    {fmt(totalReal - totalPrev)}
                  </span>
                </td>
                <td className="p-2" />
              </tr>
            )}
          </tfoot>
        )}
      </table>
    </div>
  );
}
