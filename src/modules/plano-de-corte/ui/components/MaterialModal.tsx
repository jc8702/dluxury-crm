import React, { useEffect, useState } from 'react';
import Modal from '../../../../components/ui/Modal';
import type { ChapaMaterial, PecaCorte as Peca } from '../../domain/entities/CuttingPlan';
import { planoDeCorteRepository } from '../../infrastructure/api/planoDeCorteRepository';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (mat: ChapaMaterial) => void;
  initial?: Partial<ChapaMaterial>;
}

const emptyPeca = (): Peca => ({
  id: Math.random().toString(36).substr(2, 9),
  nome: 'Peça',
  largura_mm: 500,
  altura_mm: 400,
  quantidade: 1,
  rotacionavel: true
});

export const MaterialModal: React.FC<Props> = ({ isOpen, onClose, onSave, initial }) => {
  const [form, setForm] = useState<Partial<ChapaMaterial>>(initial || {});
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    setForm(initial || {});
  }, [initial, isOpen]);

  useEffect(() => {
    if (!query || query.length < 3) {
      setResults([]);
      return;
    }

    let mounted = true;
    setSearching(true);
    planoDeCorteRepository.buscarChapas(query).then(res => {
      if (!mounted) return;
      setResults(res || []);
    }).catch(() => setResults([])).finally(() => setSearching(false));
    return () => { mounted = false; };
  }, [query]);

  const update = (patch: Partial<ChapaMaterial>) => setForm(f => ({ ...(f || {}), ...patch }));

  const addPeca = () => update({ pecas: [ ...(form.pecas || []), emptyPeca() ] });
  const updatePeca = (id: string, patch: Partial<Peca>) => {
    update({ pecas: (form.pecas || []).map(p => p.id === id ? { ...p, ...patch } : p) });
  };
  const removePeca = (id: string) => update({ pecas: (form.pecas || []).filter(p => p.id !== id) });

  const pickChapa = (c: any) => {
    update({
      sku: c.sku,
      nome: c.nome,
      tipo_material: c.tipo_material || c.tipo || 'MDF',
      cor: c.cor || 'Branco',
      largura_mm: Number(c.largura_mm || 2750),
      altura_mm: Number(c.altura_mm || 1830),
      espessura_mm: Number(c.espessura_mm || 18)
    });
    setResults([]);
    setQuery('');
  };

  const handleSave = () => {
    if (!form.sku || !form.largura_mm || !form.altura_mm) return alert('SKU, largura e altura são obrigatórios');
    const material: ChapaMaterial = {
      id: form.id || Math.random().toString(36).substr(2, 9),
      sku: String(form.sku),
      nome: String(form.nome || form.sku),
      tipo_material: String(form.tipo_material || 'MDF'),
      cor: String(form.cor || 'Branco'),
      largura_mm: Number(form.largura_mm),
      altura_mm: Number(form.altura_mm),
      espessura_mm: Number(form.espessura_mm || 18),
      preco_unitario: Number(form.preco_unitario || 0),
      pecas: (form.pecas || []).map(p => ({ ...p })) as Peca[]
    };
    onSave(material);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initial ? 'Editar Material' : 'Configuração Manual de Material'} width="760px">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1rem' }}>
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div>
              <label className="label-base">SKU</label>
              <input className="input" value={form.sku || ''} onChange={e => update({ sku: e.target.value })} />
            </div>
            <div>
              <label className="label-base">Nome</label>
              <input className="input" value={form.nome || ''} onChange={e => update({ nome: e.target.value })} />
            </div>
            <div>
              <label className="label-base">Espessura (mm)</label>
              <input type="number" className="input" value={form.espessura_mm || 18} onChange={e => update({ espessura_mm: Number(e.target.value) })} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div>
              <label className="label-base">Largura (mm)</label>
              <input type="number" className="input" value={form.largura_mm || 2750} onChange={e => update({ largura_mm: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label-base">Altura (mm)</label>
              <input type="number" className="input" value={form.altura_mm || 1830} onChange={e => update({ altura_mm: Number(e.target.value) })} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div>
              <label className="label-base">Tipo Material</label>
              <select className="input" value={form.tipo_material || 'MDF'} onChange={e => update({ tipo_material: e.target.value })}>
                <option value="MDF">MDF</option>
                <option value="MDP">MDP</option>
                <option value="COMPENSADO">Compensado</option>
                <option value="LAMINADO">Laminado</option>
                <option value="OUTRO">Outro</option>
              </select>
            </div>
            <div>
              <label className="label-base">Cor / Acabamento</label>
              <input className="input" value={form.cor || ''} onChange={e => update({ cor: e.target.value })} />
            </div>
          </div>

          <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '0.85rem' }}>Peças</strong>
            <button onClick={addPeca} className="btn btn-outline" type="button">+ Peça</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '38vh', overflowY: 'auto' }}>
            {(form.pecas || []).map(p => (
              <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 60px 40px', gap: '0.5rem', alignItems: 'center' }}>
                <input className="input" value={p.nome} onChange={e => updatePeca(p.id, { nome: e.target.value })} />
                <input type="number" className="input" value={p.largura_mm} onChange={e => updatePeca(p.id, { largura_mm: Number(e.target.value) })} />
                <input type="number" className="input" value={p.altura_mm} onChange={e => updatePeca(p.id, { altura_mm: Number(e.target.value) })} />
                <input type="number" className="input" value={p.quantidade} onChange={e => updatePeca(p.id, { quantidade: Number(e.target.value) })} />
                <button onClick={() => removePeca(p.id)} className="btn btn-outline" type="button">✕</button>
              </div>
            ))}
            {(!(form.pecas || []).length) && <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nenhuma peça adicionada.</div>}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button onClick={onClose} className="btn btn-outline">Cancelar</button>
            <button onClick={handleSave} className="btn btn-primary">Salvar Material</button>
          </div>
        </div>

        <aside style={{ borderLeft: '1px solid var(--border)', paddingLeft: '0.75rem' }}>
          <label className="label-base">Buscar no Estoque</label>
          <input className="input" placeholder="Digite SKU ou nome (3+ chars)" value={query} onChange={e => setQuery(e.target.value)} />
          <div style={{ marginTop: '0.5rem', maxHeight: '55vh', overflowY: 'auto' }}>
            {searching && <div style={{ color: 'var(--text-muted)' }}>Buscando...</div>}
            {!searching && results.map(r => (
              <div key={r.id || r.sku} onClick={() => pickChapa(r)} style={{ padding: '8px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }} className="hover-scale">
                <div style={{ fontWeight: '800' }}>{r.sku}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{r.nome}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>{r.largura_mm}x{r.altura_mm}mm</div>
              </div>
            ))}
            {!searching && query.length >= 3 && results.length === 0 && <div style={{ color: 'var(--text-muted)', padding: '0.5rem' }}>Nenhum resultado.</div>}
          </div>
        </aside>
      </div>
    </Modal>
  );
};

export default MaterialModal;
