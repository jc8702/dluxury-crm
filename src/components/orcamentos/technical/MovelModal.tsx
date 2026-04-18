import React, { useState } from 'react';

interface MovelModalProps {
  onClose: () => void;
  onSave: (data: any) => void;
}

const MovelModal: React.FC<MovelModalProps> = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState({
    nome: '',
    tipo_movel: 'armario',
    largura_total_cm: 0,
    altura_total_cm: 0,
    profundidade_total_cm: 0,
    observacoes: '',
    erp_product_id: null as string | null
  });

  const [modules, setModules] = React.useState<any[]>([]);
  React.useEffect(() => {
    import('../../../lib/api').then(({ api }) => {
      api.engineering.list().then(setModules).catch(console.error);
    });
  }, []);

  const handleSave = () => {
    if (!formData.nome.trim()) return;
    onSave(formData);
    onClose();
  };

  const inputStyle: React.CSSProperties = {
    background: '#161a29',
    border: '1px solid rgba(212, 175, 55, 0.3)',
    borderRadius: '8px',
    padding: '0.75rem',
    color: 'white',
    width: '100%',
    outline: 'none',
    fontSize: '0.9rem',
    marginBottom: '1rem'
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.7rem',
    color: '#94a3b8',
    marginBottom: '0.4rem',
    display: 'block',
    fontWeight: 'bold',
    textTransform: 'uppercase'
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
      <div style={{ background: 'var(--surface)', padding: '2.5rem', borderRadius: '16px', width: '500px', border: '1px solid var(--border)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
        <h3 style={{ marginBottom: '1.5rem', color: '#d4af37', fontSize: '1.25rem' }}>Novo Móvel no Ambiente</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Módulo de Engenharia (Opcional)</label>
            <select 
              style={inputStyle} 
              value={formData.erp_product_id || ''} 
              onChange={e => {
                const mod = modules.find(m => m.id === e.target.value);
                setFormData({
                  ...formData, 
                  erp_product_id: e.target.value,
                  nome: mod ? mod.nome : formData.nome,
                  largura_total_cm: mod ? Number(mod.largura_padrao) : formData.largura_total_cm,
                  altura_total_cm: mod ? Number(mod.altura_padrao) : formData.altura_total_cm,
                  profundidade_total_cm: mod ? Number(mod.profundidade_padrao) : formData.profundidade_total_cm
                });
              }}
            >
              <option value="">-- Selecione um Módulo --</option>
              {modules.map(m => <option key={m.id} value={m.id}>{m.codigo_modelo} - {m.nome}</option>)}
            </select>
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Nome do Móvel</label>
            <input 
              autoFocus 
              style={inputStyle} 
              value={formData.nome} 
              onChange={e => setFormData({...formData, nome: e.target.value.toUpperCase()})} 
              placeholder="Ex: ROUPEIRO CASAL, BALCÃO PIA..." 
            />
          </div>

          <div>
            <label style={labelStyle}>Tipo de Móvel</label>
            <select style={inputStyle} value={formData.tipo_movel} onChange={e => setFormData({...formData, tipo_movel: e.target.value})}>
              <option value="armario">Armário</option>
              <option value="gaveteiro">Gaveteiro</option>
              <option value="painel">Painel</option>
              <option value="balcao">Balcão</option>
              <option value="estante">Estante</option>
              <option value="bancada">Bancada</option>
              <option value="nicho">Nicho</option>
              <option value="outro">Outro</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Largura Total (cm)</label>
            <input type="number" style={inputStyle} value={formData.largura_total_cm} onChange={e => setFormData({...formData, largura_total_cm: Number(e.target.value)})} />
          </div>

          <div>
            <label style={labelStyle}>Altura Total (cm)</label>
            <input type="number" style={inputStyle} value={formData.altura_total_cm} onChange={e => setFormData({...formData, altura_total_cm: Number(e.target.value)})} />
          </div>

          <div>
            <label style={labelStyle}>Profundidade Total (cm)</label>
            <input type="number" style={inputStyle} value={formData.profundidade_total_cm} onChange={e => setFormData({...formData, profundidade_total_cm: Number(e.target.value)})} />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Observações / Detalhes</label>
            <textarea 
              style={{ ...inputStyle, minHeight: '80px', resize: 'none' }} 
              value={formData.observacoes} 
              onChange={e => setFormData({...formData, observacoes: e.target.value})}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button 
            className="btn btn-primary" 
            style={{ flex: 1, padding: '0.8rem' }} 
            onClick={handleSave}
          >
            NOTAR MÓVEL
          </button>
          <button 
            className="btn" 
            style={{ flex: 1, padding: '0.8rem', background: 'rgba(255,255,255,0.05)' }} 
            onClick={onClose}
          >
            CANCELAR
          </button>
        </div>
      </div>
    </div>
  );
};

export default MovelModal;

