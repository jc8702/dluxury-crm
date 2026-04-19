import React, { useState } from 'react';
import Modal from '../../../../components/ui/Modal';
import { planoDeCorteRepository } from '../../infrastructure/api/planoDeCorteRepository';
import type { ChapaMaterial } from '../../domain/entities/CuttingPlan';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImported: (skuEng: string, materiais: ChapaMaterial[], componentesCount: number) => void;
}

const evalFormulaMm = (formula: unknown, dims: { L: number; A: number; P: number }, fallback: number) => {
  const source = String(formula || fallback);
  const safe = source.replace(/[^0-9+\-*/().LAPlap\s]/g, '');
  if (!safe) return fallback;
  try {
    const expr = safe
      .replace(/\bL\b/gi, String(dims.L))
      .replace(/\bA\b/gi, String(dims.A))
      .replace(/\bP\b/gi, String(dims.P));
    const value = Number(Function(`"use strict"; return (${expr});`)());
    if (!Number.isFinite(value)) return fallback;
    return Math.max(1, Math.round(value));
  } catch {
    return fallback;
  }
};

export const EngineeringImportModal: React.FC<Props> = ({ isOpen, onClose, onImported }) => {
  const [sku, setSku] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewMaterials, setPreviewMaterials] = useState<ChapaMaterial[] | null>(null);
  const [foundName, setFoundName] = useState<string | null>(null);

  const normalizeSku = (v: string) => String(v || '').trim().toUpperCase();

  const handleSearch = async () => {
    if (!sku) return;
    const searchedSku = normalizeSku(sku);
    setLoading(true);
    try {
      const industrialResults = await planoDeCorteRepository.buscarEngenharia(searchedSku);
      const engIndustrial = industrialResults.find((item: any) => normalizeSku(item.sku || '') === searchedSku) || industrialResults[0];

      let eng = engIndustrial;
      let componentes: any[] = Array.isArray(engIndustrial?.componentes) ? engIndustrial.componentes : [];

      if (!eng || componentes.length === 0) {
        const [engenhariaGeral, skus] = await Promise.all([
          planoDeCorteRepository.buscarEngenhariaGeral(searchedSku),
          planoDeCorteRepository.listarSkusBasicos(),
        ]);
        const foundGeral = engenhariaGeral.find((item: any) => normalizeSku(item.codigo_modelo || '') === searchedSku) || engenhariaGeral[0];

        if (foundGeral) {
          const skuById = new Map((skus || []).map((item: any) => [String(item.id), String(item.sku || 'MANUAL')]));
          const dims = {
            L: Number(foundGeral.largura_padrao || 600),
            A: Number(foundGeral.altura_padrao || 700),
            P: Number(foundGeral.profundidade_padrao || 500),
          };
          const regras = Array.isArray(foundGeral.regras_calculo) ? foundGeral.regras_calculo : [];
          const mapped = regras.map((regra: any, idx: number) => ({
            nome: regra.componente_nome || `Componente ${idx + 1}`,
            material_ref: skuById.get(String(regra.sku_id || '')) || regra.material_ref || 'MANUAL',
            largura_mm: evalFormulaMm(regra.formula_largura, dims, dims.L),
            altura_mm: evalFormulaMm(regra.formula_altura, dims, dims.A),
            quantidade: Number(regra.quantidade || 1),
          }));
          eng = { sku: foundGeral.codigo_modelo, nome: foundGeral.nome, componentes: mapped };
          componentes = mapped;
        }
      }

      if (!eng) {
        alert('SKU de engenharia não encontrado.');
        return;
      }

      const grupos: Record<string, any[]> = {};
      componentes.forEach((c: any) => {
        if (!grupos[c.material_ref]) grupos[c.material_ref] = [];
        grupos[c.material_ref].push(c);
      });

      if (componentes.length === 0) {
        alert('SKU encontrado, mas sem componentes para plano de corte.');
        return;
      }

      const novosMateriais: ChapaMaterial[] = [];
      for (const matSku in grupos) {
        const chapasDisponiveis = await planoDeCorteRepository.buscarChapas(matSku);
        const chapaInfo = chapasDisponiveis.find((c: any) => normalizeSku(c.sku || '') === normalizeSku(matSku)) || {
          sku: matSku,
          nome: `Material: ${matSku}`,
          tipo_material: 'MDF',
          cor: 'Branco',
          largura_mm: 2750,
          altura_mm: 1830,
          espessura_mm: 18
        };

        novosMateriais.push({
          id: Math.random().toString(36).substr(2, 9),
          sku: chapaInfo.sku,
          nome: chapaInfo.nome,
          tipo_material: chapaInfo.tipo_material || chapaInfo.tipo || 'MDF',
          cor: chapaInfo.cor || 'Branco',
          largura_mm: Number(chapaInfo.largura_mm),
          altura_mm: Number(chapaInfo.altura_mm),
          espessura_mm: Number(chapaInfo.espessura_mm),
          pecas: grupos[matSku].map((p: any) => ({
            id: Math.random().toString(36).substr(2, 9),
            nome: p.nome,
            largura_mm: Number(p.largura_mm),
            altura_mm: Number(p.altura_mm),
            quantidade: Number(p.quantidade),
            rotacionavel: true
          }))
        });
      }

      setPreviewMaterials(novosMateriais);
      setFoundName(String(eng.nome || eng.sku || sku));
    } catch (e) {
      console.error(e);
      alert('Erro na busca de engenharia.');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = () => {
    if (!previewMaterials || previewMaterials.length === 0) return;
    onImported(sku, previewMaterials, previewMaterials.reduce((acc, m) => acc + (m.pecas?.length || 0), 0));
    setPreviewMaterials(null);
    setSku('');
    setFoundName(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Importar SKU de Engenharia" width="840px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input className="input" placeholder="Digite o SKU de Engenharia" value={sku} onChange={e => setSku(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }} />
          <button className="btn btn-primary" onClick={handleSearch} disabled={loading}>{loading ? 'Buscando...' : 'Buscar'}</button>
          <button className="btn btn-outline" onClick={() => { setSku(''); setPreviewMaterials(null); setFoundName(null); }}>Limpar</button>
        </div>

        {foundName && <div style={{ fontWeight: 800 }}>{foundName}</div>}

        {previewMaterials && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1rem' }}>
            <div>
              <h4 style={{ marginTop: 0 }}>Materiais a importar</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '40vh', overflowY: 'auto' }}>
                {previewMaterials.map(m => (
                  <div key={m.id} style={{ padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '8px' }}>
                    <div style={{ fontWeight: '800' }}>{m.sku} • {m.nome}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{m.largura_mm}x{m.altura_mm} • {m.pecas.length} peças</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '0.75rem' }}>
              <h4 style={{ marginTop: 0 }}>Resumo</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div>Total de materiais: <strong>{previewMaterials.length}</strong></div>
                <div>Total de peças: <strong>{previewMaterials.reduce((acc, m) => acc + (m.pecas?.reduce((a,p) => a + (p.quantidade||0),0) || 0), 0)}</strong></div>
                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-outline" onClick={() => { setPreviewMaterials(null); }}>Cancelar</button>
                  <button className="btn btn-primary" onClick={handleImport}>Importar</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default EngineeringImportModal;
