import { useState } from 'react';
import { Box, Settings2, Search } from 'lucide-react';

const ESPESSURAS_PADRAO = [6, 15, 18, 25];
const TIPOS_PADRAO = ['Branco', 'Madeirado', 'Lacca', 'Estrutura', 'Fundo'];

export const ModalMaterial = ({ materiais, onAddEstoque, onAddManual, onClose }: any) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [manualEsp, setManualEsp] = useState(15);
  const [manualTipo, setManualTipo] = useState('Branco');

  const filtered = materiais.filter((m: any) => 
    (m.categoria_id === 'chapas' || m.unidade === 'CHAPA') &&
    (m.nome.toLowerCase().includes(searchTerm.toLowerCase()) || (m.sku && m.sku.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  return (
    <div className="modal-overlay hide-on-print" onClick={onClose} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }} tabIndex={-1}>
      <div className="modal-content animate-pop-in" style={{ width: '800px', display: 'flex', gap: '2rem' }} onClick={e => e.stopPropagation()}>
        {/* Esquerda: Cadastro do Estoque */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', borderRight: '1px solid var(--border)', paddingRight: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Box className="text-[#E2AC00]" /> Selecionar do Estoque
          </h3>
          
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Buscar por Nome ou SKU..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '8px 10px 8px 34px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)' }}
            />
          </div>

          <div style={{ overflowY: 'auto', maxHeight: '450px', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '4px' }}>
            {filtered.map((m: any) => (
              <div key={m.id} onClick={() => onAddEstoque(m)} className="card hover-scale" style={{ padding: '0.75rem', cursor: 'pointer', background: 'var(--surface-hover)' }}>
                <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>{m.nome}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  <span>{m.sku}</span>
                  <span style={{ color: 'var(--primary)', fontWeight: '800' }}>E: {m.espessura || '?'}mm</span>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <p style={{ textAlign: 'center', opacity: 0.5, padding: '2rem' }}>Nenhuma chapa encontrada.</p>}
          </div>
        </div>

        {/* Direita: Adição Manual */}
        <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings2 className="text-[#E2AC00]" /> Configuração Manual
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="section" style={{ padding: '1rem' }}>
              <label className="label-base">ESPESSURA (mm)</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                {ESPESSURAS_PADRAO.map(e => (
                  <button 
                    key={e}
                    onClick={() => setManualEsp(e)}
                    className="btn"
                    style={{ 
                      fontSize: '0.75rem', padding: '0.4rem 0.6rem',
                      background: manualEsp === e ? 'var(--primary)' : 'transparent',
                      color: manualEsp === e ? '#000' : 'var(--text)',
                      border: `1px solid ${manualEsp === e ? 'var(--primary)' : 'var(--border)'}`
                    }}
                  >
                    {e}mm
                  </button>
                ))}
              </div>
            </div>

            <div className="section" style={{ padding: '1rem' }}>
              <label className="label-base">TIPO</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                {TIPOS_PADRAO.map(t => (
                  <button 
                    key={t}
                    onClick={() => setManualTipo(t)}
                    className="btn"
                    style={{ 
                      fontSize: '0.75rem', padding: '0.4rem 0.6rem',
                      background: manualTipo === t ? 'var(--primary)' : 'transparent',
                      color: manualTipo === t ? '#000' : 'var(--text)',
                      border: `1px solid ${manualTipo === t ? 'var(--primary)' : 'var(--border)'}`
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={() => onAddManual({ nome: `MDF ${manualTipo}`, sku: `MDF-${manualTipo.toUpperCase()}-${manualEsp}MM`, espessura: manualEsp, tipo: manualTipo })}
              className="btn btn-primary mt-4" style={{ width: '100%' }}>
              + INSERIR CHAPA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
