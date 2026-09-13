import React, { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { Button } from '../../../components/common/Button';
import * as calc from '../domain/calculations';
import { Card } from '../../../components/common/Card';

const statusCycle: Record<string, string> = {
  presente: 'falta',
  falta: 'meio_periodo',
  meio_periodo: 'falta_justificada',
  falta_justificada: 'atestado',
  atestado: 'presente',
};

const statusColor: Record<string, string> = {
  presente: '#28A745',
  falta: '#DC3545',
  meio_periodo: '#E2AC00',
  falta_justificada: '#6c757d',
  atestado: '#17A2B8',
};

const statusLabel: Record<string, string> = {
  presente: 'P',
  falta: 'F',
  meio_periodo: 'M',
  falta_justificada: 'J',
  atestado: 'A',
};

function daysInMonth(competencia: string): number {
  const [y, m] = competencia.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

interface Props {
  colaboradores: any[];
  competencia: string; // YYYY-MM
  onChanged?: () => void;
}

export function PresencaCalendario({ colaboradores, competencia, onChanged }: Props) {
  const [matrix, setMatrix] = useState<Record<string, Record<number, string>>>({}); // colabId -> {dia->status}
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const dias = daysInMonth(competencia);

  const load = async () => {
    setLoading(true);
    const newMatrix: any = {};
    for (const c of colaboradores) {
      try {
        const rows = await api.rh.presencas.list(c.id, competencia);
        const map: Record<number, string> = {};
        for (const r of rows as any[]) {
          const d = new Date(r.data);
          const day = d.getUTCDate() || new Date(r.data).getDate();
          // data is ISO, extract day via string
          const dayNum = Number(String(r.data).slice(8, 10));
          map[dayNum] = r.status;
        }
        newMatrix[c.id] = map;
      } catch {
        newMatrix[c.id] = {};
      }
    }
    setMatrix(newMatrix);
    setLoading(false);
  };

  useEffect(() => {
    if (colaboradores.length && competencia) load();
  }, [colaboradores, competencia]);

  const toggle = (colabId: string, dia: number) => {
    setMatrix((prev) => {
      const cur = prev[colabId]?.[dia] || 'presente';
      const next = statusCycle[cur] || 'presente';
      return { ...prev, [colabId]: { ...(prev[colabId] || {}), [dia]: next } };
    });
  };

  const salvar = async () => {
    setSaving(true);
    try {
      const payload: any[] = [];
      for (const c of colaboradores) {
        const colMap = matrix[c.id] || {};
        for (let d = 1; d <= dias; d++) {
          const status = colMap[d];
          if (!status || status === 'presente') continue; // só envia não-presente? mas para teste enviar tudo
          // Actually send all modified: we send every day where status !== 'presente'
          // For simplicity send all where defined and not presente
          const dateStr = `${competencia}-${String(d).padStart(2, '0')}`;
          payload.push({ colaborador_id: c.id, data: dateStr, status });
        }
        // Also ensure we send presente as explicit? If no entry, means presente. Bulk API will upsert only sent.
        // To clear falta, user must cycle back to presente -> then we don't send, but we need to update DB to presente? The bulk upsert with ON CONFLICT will only update sent statuses. If we don't send presente, the old falta remains.
        // So we need to send all days where we have a value in matrix, even presente, if it was previously set.
        // For simplicity, send all dias where matrix has entry (including presente) - but our matrix only has entries when toggled. Initially matrix loaded with existing DB values, so we have full map.
        // The above already includes only non-presente; but to revert falta to presente we need to send presente.
        // Let's adjust: if matrix has entry for day, send it regardless (even presente)
        // Our matrix after load contains all DB statuses, including presente not stored (we default to presente). So after toggle to presente, we would have entry 'presente' but our loop skips presente.
        // We should actually send all entries that exist in matrix (including presente) to update DB.
      }
      // Build payload correctly: include every dia where matrix has explicit status (including presente if it was previously non-presente and now presente)
      const fullPayload: any[] = [];
      for (const c of colaboradores) {
        const colMap = matrix[c.id] || {};
        for (let d = 1; d <= dias; d++) {
          if (colMap[d] !== undefined) {
            const dateStr = `${competencia}-${String(d).padStart(2, '0')}`;
            fullPayload.push({ colaborador_id: c.id, data: dateStr, status: colMap[d] });
          }
        }
      }
      if (fullPayload.length === 0) {
        // nothing to save
        return;
      }
      await api.rh.presencas.upsertBulk(fullPayload);
      onChanged?.();
    } finally {
      setSaving(false);
    }
  };

  // calculates preview for each colab
  const preview = (colabId: string, salario: number) => {
    const map = matrix[colabId] || {};
    const statuses = Object.values(map).map((s) => ({ status: s }));
    // also need to consider days without entry as presente (0)
    // calc faltas only from map values
    const diasFalta = calc.calcFaltasDias(statuses as any);
    const valor = calc.calcValorFaltas(diasFalta, Number(salario));
    return { diasFalta, valor };
  };

  if (loading)
    return <div className="p-6 text-sm text-muted-foreground">Carregando presenças...</div>;
  if (!colaboradores.length)
    return <div className="p-6 text-sm text-muted-foreground">Nenhum colaborador ativo</div>;

  return (
    <Card className="p-0 overflow-hidden" data-testid="presenca-calendario">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold">Presenças — {competencia}</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden md:inline">
            P=Presente F=Falta M=Meio J=Justificada A=Atestado
          </span>
          <Button size="sm" onClick={salvar} isLoading={saving} data-testid="btn-salvar-presencas">
            Salvar
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted">
              <th className="p-2 text-left min-w-[180px]">Colaborador</th>
              {Array.from({ length: dias }, (_, i) => i + 1).map((d) => (
                <th key={d} className="p-1 text-center min-w-[32px]">
                  {d}
                </th>
              ))}
              <th className="p-2 text-center">Faltas</th>
              <th className="p-2 text-center">Valor</th>
            </tr>
          </thead>
          <tbody>
            {colaboradores.map((c) => {
              const p = preview(c.id, Number(c.salario_base));
              return (
                <tr key={c.id} className="border-t border-border">
                  <td className="p-2 font-medium whitespace-nowrap">
                    {c.nome}
                    <br />
                    <span className="text-muted-foreground text-[11px]">
                      R$ {Number(c.salario_base).toLocaleString('pt-BR')}
                    </span>
                  </td>
                  {Array.from({ length: dias }, (_, i) => i + 1).map((d) => {
                    const status = matrix[c.id]?.[d] || 'presente';
                    const color = statusColor[status] || '#28A745';
                    return (
                      <td key={d} className="p-0.5">
                        <button
                          onClick={() => toggle(c.id, d)}
                          className="w-7 h-7 rounded flex items-center justify-center text-white text-[11px] font-bold border border-border"
                          style={{ background: color }}
                          title={`${d}/${competencia} — ${status}`}
                          data-testid={`cell-${c.id}-${d}`}
                          data-status={status}
                        >
                          {statusLabel[status]}
                        </button>
                      </td>
                    );
                  })}
                  <td className="p-2 text-center font-mono" data-testid={`faltas-${c.id}`}>
                    {p.diasFalta}
                  </td>
                  <td
                    className="p-2 text-center font-mono text-destructive"
                    data-testid={`valor-faltas-${c.id}`}
                  >
                    R$ {p.valor.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="p-3 bg-muted/50 border-t border-border flex gap-4 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ background: '#28A745' }}></span> Presente
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ background: '#DC3545' }}></span> Falta
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ background: '#E2AC00' }}></span> Meio
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ background: '#6c757d' }}></span> Justificada
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ background: '#17A2B8' }}></span> Atestado
        </span>
      </div>
    </Card>
  );
}
