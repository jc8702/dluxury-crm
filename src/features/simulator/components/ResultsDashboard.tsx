import React, { useState } from 'react';
import { useSimulation } from '../../../context/simulator/SimulationContext';
import { CalculationMemorial } from './CalculationMemorial';
import { useAppContext } from '../../../context/AppContext';
import { generateProposalPDF } from '../../../services/pdf/ProposalGenerator';

export const ResultsDashboard: React.FC = () => {
  const { result, input, calculating, persistSimulation } = useSimulation();
  const { clients } = useAppContext();
  const [showMemorial, setShowMemorial] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  const handleGeneratePDF = () => {
    if (!result) return;
    if (!selectedClientId) {
      alert('Selecione um cliente para gerar a proposta nominal.');
      return;
    }
    
    const client = clients.find(c => c.id === selectedClientId);
    generateProposalPDF({
      clienteNome: client?.razaoSocial || 'Cliente Exemplo',
      clienteCNPJ: client?.cnpj,
      simulationResult: result,
      proposalId: `PROP-${Date.now().toString().slice(-6)}`
    });
  };

  const handleSave = async () => {
    if (!result) return;
    if (!selectedClientId) {
      alert('Por favor, selecione um cliente para vincular a simulação.');
      return;
    }
    
    setSaving(true);
    setSaveStatus(null);
    
    try {
      const client = clients.find(c => c.id === selectedClientId);
      const clienteNome = client?.razaoSocial || 'Cliente Desconhecido';
      
      await persistSimulation(selectedClientId, clienteNome);
      
      setSaveStatus({ type: 'success', message: `Simulação salva para ${clienteNome} com sucesso!` });
    } catch (error: any) {
      console.error('Erro ao salvar no Supabase:', error);
      setSaveStatus({ type: 'error', message: error.message || 'Falha ao salvar no Supabase. Verifique a configuração da tabela "simulations".' });
    } finally {
      setSaving(false);
    }
  };

  if (!result || result.totalMonthlyRevenue === 0) return null;

  const isProfitable = result.totalMonthlyProfit >= 0;
  const marginColor = result.averageMargin >= 0.15 ? 'var(--success)' : 
                      result.averageMargin >= 0.10 ? 'var(--secondary)' : 
                      result.averageMargin >= 0.05 ? 'var(--warning)' : 'var(--danger)';

  return (
    <div className="card" style={{ 
      padding: '1.5rem', 
      borderRadius: 'var(--radius-lg)', 
      marginTop: '1.5rem', 
      border: `1.5px solid ${isProfitable ? 'var(--success)' : 'var(--danger)'}`,
      background: `linear-gradient(135deg, var(--surface) 0%, ${isProfitable ? 'hsla(155, 65%, 50%, 0.1)' : 'hsla(0, 75%, 60%, 0.1)'} 100%)`
    }}>
      <h3 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '1.2rem', letterSpacing: '0.12em' }}>Resumo Geral do Projeto</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
        <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)' }}>
           <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Faturamento Mensal</div>
           <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--secondary)', marginTop: '0.2rem' }}>
             {result.totalMonthlyRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
           </div>
        </div>

        <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)' }}>
           <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Lucro do Projeto</div>
           <div style={{ fontSize: '1.2rem', fontWeight: 800, color: marginColor, marginTop: '0.2rem' }}>
             {result.totalMonthlyProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
           </div>
        </div>

        <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)' }}>
           <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Margem Média</div>
           <div style={{ fontSize: '1.2rem', fontWeight: 800, color: marginColor, marginTop: '0.2rem' }}>
             {(result.averageMargin * 100).toFixed(1)}%
           </div>
        </div>
      </div>

      <div style={{ marginTop: '1.2rem', padding: '1rem', background: 'rgba(0,0,0,0.1)', borderRadius: 'var(--radius-sm)' }}>
         <label style={{ display: 'block', fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 700 }}>Vincular a um Cliente:</label>
         <select 
           className="input" 
           value={selectedClientId} 
           onChange={(e) => setSelectedClientId(e.target.value)}
           style={{ width: '100%', fontSize: '0.75rem', background: 'var(--surface)', borderColor: 'var(--border)' }}
         >
           <option value="">Selecione o Cliente...</option>
           {clients.sort((a,b) => a.razaoSocial.localeCompare(b.razaoSocial)).map(c => (
             <option key={c.id} value={c.id}>{c.razaoSocial}</option>
           ))}
         </select>
      </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button 
              onClick={() => setShowMemorial(!showMemorial)}
              className="btn btn-secondary" 
              style={{ 
                width: '100%',
                padding: '0.8rem', 
                fontSize: '0.65rem', 
                fontWeight: 800, 
                letterSpacing: '0.1em',
                border: '1px solid var(--border)',
                background: 'rgba(255,255,255,0.03)',
                color: 'var(--text-main)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer'
              }}
          >
              {showMemorial ? 'OCULTAR MEMORIAL' : 'VER DETALHAMENTO TÉCNICO (MEMORIAL)'}
          </button>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
                onClick={handleGeneratePDF}
                className="btn btn-secondary" 
                style={{ 
                  flex: 1,
                  padding: '0.8rem', 
                  fontSize: '0.65rem', 
                  fontWeight: 800, 
                  letterSpacing: '0.1em',
                  background: 'hsla(215, 100%, 50%, 0.1)',
                  color: 'var(--primary)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--primary)',
                  cursor: 'pointer'
                }}
            >
                EMISSÃO DE PROPOSTA (PDF)
            </button>

            <button 
                onClick={handleSave}
                disabled={saving || calculating || !isProfitable}
                className="btn btn-primary" 
                style={{ 
                  flex: 1,
                  padding: '0.8rem', 
                  fontSize: '0.65rem', 
                  fontWeight: 800, 
                  letterSpacing: '0.1em',
                  borderRadius: 'var(--radius-sm)',
                  opacity: (saving || calculating || !isProfitable) ? 0.5 : 1,
                  cursor: (saving || calculating || !isProfitable) ? 'not-allowed' : 'pointer',
                  boxShadow: 'none',
                  textAlign: 'center'
                }}
            >
                {saving ? 'SALVANDO...' : 'REGISTRAR NO CRM'}
            </button>
          </div>
        </div>

       {saveStatus && (
         <div style={{ 
           marginTop: '1rem', 
           padding: '0.8rem', 
           borderRadius: '8px', 
           fontSize: '0.7rem',
           background: saveStatus.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
           color: saveStatus.type === 'success' ? 'var(--success)' : 'var(--danger)',
           border: `1px solid ${saveStatus.type === 'success' ? 'var(--success)' : 'var(--danger)'}`,
           textAlign: 'center'
         }}>
           {saveStatus.message}
         </div>
       )}

       {showMemorial && (
         <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
           <CalculationMemorial 
              slots={result.slots} 
              cfPct={input.cfPct} 
              contractMonths={input.contractMonths} 
           />
         </div>
       )}
    </div>
  );
};
