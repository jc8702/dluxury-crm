import React, { useState } from 'react';

interface AmbienteModalProps {
  onClose: () => void;
  onSave: (nome: string) => void;
}

const AmbienteModal: React.FC<AmbienteModalProps> = ({ onClose, onSave }) => {
  const [nome, setNome] = useState('');

  const sugestoes = [
    'Quarto Casal', 'Quarto Solteiro', 'Quarto Filhos',
    'Cozinha', 'Sala', 'Banheiro', 'Lavabo', 'Home Office',
    'Área de Serviço', 'Closet', 'Garagem'
  ];

  const handleSave = () => {
    if (!nome.trim()) return;
    onSave(nome);
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

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
      <div style={{ background: 'var(--surface)', padding: '2.5rem', borderRadius: '16px', width: '450px', border: '1px solid var(--border)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
        <h3 style={{ marginBottom: '1.5rem', color: '#d4af37', fontSize: '1.25rem' }}>Adicionar Novo Ambiente</h3>
        
        <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>NOME DO AMBIENTE</label>
        <input 
          autoFocus 
          style={inputStyle} 
          value={nome} 
          onChange={e => setNome(e.target.value)} 
          placeholder="Ex: Sala de Jantar, Sacada..." 
        />

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2rem' }}>
          {sugestoes.map(s => (
            <button 
              key={s} 
              onClick={() => setNome(s)}
              style={{
                background: 'rgba(212, 175, 55, 0.05)',
                border: '1px solid rgba(212, 175, 55, 0.2)',
                borderRadius: '6px',
                padding: '0.4rem 0.8rem',
                fontSize: '0.75rem',
                color: '#d4af37',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(212, 175, 55, 0.15)'}
              onMouseOut={e => e.currentTarget.style.background = 'rgba(212, 175, 55, 0.05)'}
            >
              {s}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className="btn btn-primary" 
            style={{ flex: 1, padding: '0.8rem' }} 
            onClick={handleSave}
          >
            CONFIRMAR
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

export default AmbienteModal;
