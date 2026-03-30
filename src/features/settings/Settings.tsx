import React from 'react';
import { useAppContext } from '../../context/AppContext';

const Settings: React.FC = () => {
  const { 
    taxaFinanceiraPadrao, setTaxaFinanceiraPadrao, 
    monthlyGoals, setMonthlyGoal 
  } = useAppContext();

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header>
        <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Configurações do Sistema</h2>
        <p style={{ color: 'var(--text-muted)' }}>Gerencie permissões, metas e parâmetros globais de simulação.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="card">
            <h3 style={{ fontSize: '1.125rem', marginBottom: '1.25rem' }}>Parâmetros de Simulação (Global)</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '600' }}>Taxa Financeira Padrão Mensal (%)</label>
                <input 
                  type="number" 
                  className="input" 
                  value={taxaFinanceiraPadrao} 
                  onChange={(e) => setTaxaFinanceiraPadrao(parseFloat(e.target.value) || 0)}
                  step="0.1"
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>* Esta taxa será aplicada automaticamente pro-rata no simulador de preços.</p>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.125rem', marginBottom: '1.25rem' }}>Gestão de Metas Mensais (2026)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
               {[
                 { id: '01', name: 'Janeiro' }, { id: '02', name: 'Fevereiro' },
                 { id: '03', name: 'Março' }, { id: '04', name: 'Abril' },
                 { id: '05', name: 'Maio' }, { id: '06', name: 'Junho' },
                 { id: '07', name: 'Julho' }, { id: '08', name: 'Agosto' },
                 { id: '09', name: 'Setembro' }, { id: '10', name: 'Outubro' },
                 { id: '11', name: 'Novembro' }, { id: '12', name: 'Dezembro' }
               ].map(m => (
                 <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{m.name}</label>
                    <input 
                      type="number" 
                      className="input" 
                      placeholder="R$ 0,00"
                      value={monthlyGoals[`2026-${m.id}`] || ''}
                      onChange={(e) => setMonthlyGoal(`2026-${m.id}`, parseFloat(e.target.value) || 0)}
                    />
                 </div>
               ))}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
              As metas definidas aqui são comparadas com o faturamento real no Dashboard.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
           <div className="card glass">
              <h3 style={{ fontSize: '1.125rem', marginBottom: '1.25rem' }}>Segurança & Acessos</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontWeight: '500' }}>Permitir Alçada Extra (Salesforce)</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Habilita botão de solicitação em casos bloqueados.</p>
                    </div>
                    <input type="checkbox" defaultChecked style={{ width: '20px', height: '20px' }} />
                 </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                       <p style={{ fontWeight: '500' }}>Logs de Simulação</p>
                       <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Registra todas as consultas feitas pelos vendedores.</p>
                    </div>
                    <input type="checkbox" defaultChecked style={{ width: '20px', height: '20px' }} />
                 </div>
              </div>
           </div>

           <div className="card" style={{ borderStyle: 'dotted', background: 'transparent' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--danger)', marginBottom: '1rem' }}>Informações do Sistema</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Versão: 1.2.0-stable<br/>
                Ambiente: Produção<br/>
                Última sincronização de preços: Hoje, 08:30
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
