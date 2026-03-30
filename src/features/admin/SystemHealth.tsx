import React, { useState } from 'react';
import DataTable from '../../components/common/DataTable';
import { useAppContext } from '../../context/AppContext';
import type { SystemLog } from '../../context/AppContext';
import { runDiagnostics } from '../../tests/simulator.test';

const SystemHealth: React.FC = () => {
  const { isCircuitOpen, systemLogs, syncQueue } = useAppContext();
  const [testResults, setTestResults] = useState<any[]>([]);

  const headers = ['Timestamp', 'Tipo', 'Severidade', 'Mensagem'];

  const renderLog = (log: SystemLog) => {
    const color = log.severity === 'CRITICAL' ? 'var(--danger)' : (log.severity === 'WARNING' ? 'var(--warning)' : 'var(--success)');
    return (
      <>
        <td style={{ padding: '0.75rem' }}>{log.timestamp}</td>
        <td style={{ padding: '0.75rem' }}><span className="badge" style={{ background: 'var(--surface-hover)', color: 'white' }}>{log.type}</span></td>
        <td style={{ padding: '0.75rem' }}><span style={{ color, fontWeight: 'bold' }}>● {log.severity}</span></td>
        <td style={{ padding: '0.75rem', fontSize: '0.75rem' }}>{log.message}</td>
      </>
    );
  };

  const handleRunTests = () => {
    const results = runDiagnostics();
    setTestResults(results);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--primary)' }}>System Health Monitoring</h2>
          <p style={{ color: 'var(--text-muted)' }}>Métricas de SRE em tempo real e Auditoria de Integração.</p>
        </div>
        <button className="btn btn-primary" onClick={handleRunTests}>Rodar Diagnóstico QA</button>
      </header>

      {testResults.length > 0 && (
        <div className="card glass animate-fade-in" style={{ border: '1px solid var(--primary)' }}>
           <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Resultado dos Testes de Unidade (Core Domain)</h3>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {testResults.map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', padding: '0.5rem', background: 'var(--background)' }}>
                   <span>{r.test}</span>
                   <span style={{ color: r.status === 'PASS' ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold' }}>{r.status}</span>
                </div>
              ))}
           </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
         <div className="card glass" style={{ borderTop: `4px solid ${isCircuitOpen ? 'var(--danger)' : 'var(--success)'}` }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Estado do Salesforce API</p>
            <h4 style={{ fontSize: '1.25rem', color: isCircuitOpen ? 'var(--danger)' : 'var(--success)' }}>
               {isCircuitOpen ? '🔴 CIRCUIT OPEN' : '🟢 CIRCUIT CLOSED'}
            </h4>
            <p style={{ fontSize: '0.7rem', marginTop: '0.5rem' }}>Padrão: Disjuntor SRE (Auto-recovery)</p>
         </div>
         <div className="card glass">
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fila Dead Letter (DLQ)</p>
            <h4 style={{ fontSize: '1.25rem' }}>{syncQueue.length} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>itens pendentes</span></h4>
            <p style={{ fontSize: '0.7rem', marginTop: '0.5rem' }}>Sincronização offline garantida.</p>
         </div>
         <div className="card glass">
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Logs na Memória</p>
            <h4 style={{ fontSize: '1.25rem' }}>{systemLogs.length} / 50</h4>
         </div>
      </div>

      <div className="card" style={{ padding: '1.5rem' }}>
         <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem' }}>Audit Log (SRE Transparency)</h3>
         <DataTable 
           headers={headers}
           data={systemLogs}
           renderRow={renderLog}
           emptyMessage="Nenhuma falha ou log registrado até o momento."
         />
      </div>
    </div>
  );
};

export default SystemHealth;
