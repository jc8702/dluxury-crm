import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../../context/AppContext';
import type { Material, Project, Orcamento } from '../../../context/AppContext';
import { converterParaUso } from '../../../utils/estoque';
import { X, ArrowUpCircle, ArrowDownCircle, Settings2 } from 'lucide-react';

interface MovimentacaoModalProps {
  material: Material;
  onClose: () => void;
  onSuccess: () => void;
}

const MovimentacaoModal: React.FC<MovimentacaoModalProps> = ({ material, onClose, onSuccess }) => {
  const { registrarMovimentacao, projects, orcamentos } = useAppContext();
  const [tipo, setTipo] = useState<'entrada' | 'saida' | 'ajuste'>('entrada');
  const [quantidade, setQuantidade] = useState<number>(0);
  const [motivo, setMotivo] = useState('');
  const [projetoId, setProjetoId] = useState('');
  const [orcamentoId, setOrcamentoId] = useState('');
  const [precoUnitario, setPrecoUnitario] = useState<number>(material.preco_custo || 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const equivalencia = useMemo(() => 
    converterParaUso(quantidade, material.fator_conversao)
  , [quantidade, material.fator_conversao]);

  const novoEstoque = useMemo(() => {
    const atual = Number(material.estoque_atual);
    if (tipo === 'entrada') return atual + quantidade;
    if (tipo === 'saida') return atual - quantidade;
    if (tipo === 'ajuste') return quantidade;
    return atual;
  }, [tipo, quantidade, material.estoque_atual]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantidade <= 0 && tipo !== 'ajuste') {
      setError('A quantidade deve ser maior que zero.');
      return;
    }
    if (tipo === 'saida' && novoEstoque < 0) {
      setError('Estoque insuficiente.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await registrarMovimentacao({
        material_id: material.id,
        tipo,
        quantidade,
        motivo,
        projeto_id: projetoId || null,
        orcamento_id: orcamentoId || null,
        preco_unitario: tipo === 'entrada' ? precoUnitario : null
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar movimentação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-content animate-pop-in" style={{ maxWidth: '500px', width: '90%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0 }}>Registrar Movimentação</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{material.nome}</p>
          </div>
          <button onClick={onClose} style={{ all: 'unset', cursor: 'pointer', color: 'var(--text-muted)' }}><X /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '12px' }}>
            {[
              { id: 'entrada', label: 'Entrada', icon: <ArrowUpCircle size={18} />, color: '#10b981' },
              { id: 'saida', label: 'Saída', icon: <ArrowDownCircle size={18} />, color: '#ef4444' },
              { id: 'ajuste', label: 'Ajuste', icon: <Settings2 size={18} />, color: '#3b82f6' }
            ].map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTipo(t.id as any)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  background: tipo === t.id ? t.color : 'transparent',
                  color: tipo === t.id ? '#1a1a2e' : 'var(--text-muted)',
                  transition: 'all 0.2s'
                }}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          <div className="grid-2">
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Quantidade ({material.unidade_compra})
              </label>
              <input 
                type="number" 
                step="0.0001"
                className="input-base" 
                value={quantidade} 
                onChange={e => setQuantidade(Number(e.target.value))}
                autoFocus
              />
              <p style={{ fontSize: '0.7rem', color: '#d4af37', marginTop: '0.3rem' }}>
                = {equivalencia.toFixed(2)} {material.unidade_uso}
              </p>
            </div>
            {tipo === 'entrada' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  Preço Custo (R$)
                </label>
                <input 
                  type="number" 
                  step="0.01"
                  className="input-base" 
                  value={precoUnitario} 
                  onChange={e => setPrecoUnitario(Number(e.target.value))}
                />
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Motivo / Referência</label>
            <input 
              className="input-base" 
              placeholder="Ex: Compra NF 123, Consumo projeto X..." 
              value={motivo} 
              onChange={e => setMotivo(e.target.value)}
              required
            />
          </div>

          {tipo === 'saida' && (
            <div className="grid-2">
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Projeto (Opcional)</label>
                <select className="input-base" value={projetoId} onChange={e => setProjetoId(e.target.value)}>
                  <option value="">Selecione...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.clientName} - {p.ambiente}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Orçamento (Opcional)</label>
                <select className="input-base" value={orcamentoId} onChange={e => setOrcamentoId(e.target.value)}>
                  <option value="">Selecione...</option>
                  {orcamentos.map(o => <option key={o.id} value={o.id}>{o.numero}</option>)}
                </select>
              </div>
            </div>
          )}

          <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span color="var(--text-muted)">Estoque Atual:</span>
              <span style={{ fontWeight: '700' }}>{material.estoque_atual} {material.unidade_compra}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginTop: '0.5rem', color: novoEstoque < 0 ? '#ef4444' : '#d4af37' }}>
              <span style={{ fontWeight: '600' }}>Novo Estoque:</span>
              <span style={{ fontWeight: '800' }}>{novoEstoque.toFixed(4)} {material.unidade_compra}</span>
            </div>
          </div>

          {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', textAlign: 'center' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={onClose} className="btn btn-outline" style={{ flex: 1 }}>Cancelar</button>
            <button 
              type="submit" 
              disabled={loading || (tipo === 'saida' && novoEstoque < 0)} 
              className="btn btn-primary" 
              style={{ flex: 2 }}
            >
              {loading ? 'Processando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MovimentacaoModal;
