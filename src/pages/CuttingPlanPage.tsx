import React, { useState, useEffect } from 'react';
import { Scissors, Plus, Trash2, Calculator, Download, Package } from 'lucide-react';
import { api } from '../lib/api';
import { calcularPlanoCorte } from '../utils/planodeCorte';
import type { ResultadoCorte, PecaPositionada } from '../utils/planodeCorte';
import PlanoCorteVisual from '../components/production/PlanoCorteVisual';

interface PecaInput {
  id: string;
  descricao: string;
  largura: number;
  altura: number;
  quantidade: number;
  virarFibra: boolean;
  ambiente: string;
}

const CuttingPlanPage: React.FC = () => {
  const [pecas, setPecas] = useState<PecaInput[]>([
    { id: '1', descricao: 'Lateral Esquerda', largura: 2200, altura: 600, quantidade: 2, virarFibra: false, ambiente: 'Cozinha' },
    { id: '2', descricao: 'Tampo Superior', largura: 1800, altura: 600, quantidade: 1, virarFibra: false, ambiente: 'Cozinha' }
  ]);
  
  const [config, setConfig] = useState({
    sku: 'MDF-BRANCO-18',
    larguraChapa: 2750,
    alturaChapa: 1830,
    kerf: 3
  });

  const [resultado, setResultado] = useState<ResultadoCorte | null>(null);
  const [chapaAtiva, setChapaAtiva] = useState(1);
  const [loading, setLoading] = useState(false);

  const adicionarPeca = () => {
    const nova: PecaInput = {
      id: Math.random().toString(36).substr(2, 9),
      descricao: '',
      largura: 0,
      altura: 0,
      quantidade: 1,
      virarFibra: false,
      ambiente: ''
    };
    setPecas([...pecas, nova]);
  };

  const removerPeca = (id: string) => {
    setPecas(pecas.filter(p => p.id !== id));
  };

  const handlePecaChange = (id: string, field: keyof PecaInput, value: any) => {
    setPecas(pecas.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleCalcular = () => {
    setLoading(true);
    try {
      const res = calcularPlanoCorte(
        pecas.map(p => ({ ...p, id: p.id })), // Mapear para o formato do algoritmo
        { largura: config.larguraChapa, altura: config.alturaChapa, kerf: config.kerf }
      );
      setResultado(res);
      setChapaAtiva(1);
    } catch (err) {
      alert('Erro ao calcular: verifique se as peças cabem na chapa.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 280px', gap: '1.5rem', height: 'calc(100vh - 100px)', overflow: 'hidden' }}>
      
      {/* Coluna Esquerda: Configuração */}
      <div className="card" style={{ overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <header>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
            <Scissors size={20} /> Configuração
          </h3>
        </header>

        <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="label">Material (SKU)</label>
            <select className="input-base w-full" value={config.sku} onChange={e => setConfig({...config, sku: e.target.value})}>
              <option value="MDF-BRANCO-18">MDF Branco Polar 18mm</option>
              <option value="MDF-GRAFITE-15">MDF Grafite 15mm</option>
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div>
              <label className="label">Largura Chapa</label>
              <input type="number" className="input-base w-full" value={config.larguraChapa} onChange={e => setConfig({...config, larguraChapa: Number(e.target.value)})} />
            </div>
            <div>
              <label className="label">Altura Chapa</label>
              <input type="number" className="input-base w-full" value={config.alturaChapa} onChange={e => setConfig({...config, alturaChapa: Number(e.target.value)})} />
            </div>
          </div>
          <div>
            <label className="label">Serra (Kerf) mm</label>
            <input type="number" className="input-base w-full" value={config.kerf} onChange={e => setConfig({...config, kerf: Number(e.target.value)})} />
          </div>
        </section>

        <section style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="label" style={{ marginBottom: 0 }}>Lista de Peças</label>
            <button onClick={adicionarPeca} className="btn-sm" style={{ background: 'rgba(212, 175, 55, 0.1)', color: 'var(--primary)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
               <Plus size={14} /> Adicionar
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {pecas.map(p => (
              <div key={p.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px', border: '1px solid #333' }}>
                <input 
                  placeholder="Descrição da peça" 
                  className="input-base w-full" 
                  style={{ marginBottom: '0.5rem', fontSize: '0.75rem' }} 
                  value={p.descricao} 
                  onChange={e => handlePecaChange(p.id, 'descricao', e.target.value)}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.25rem' }}>
                  <input type="number" placeholder="L" className="input-base w-full" style={{ fontSize: '0.7rem' }} value={p.largura} onChange={e => handlePecaChange(p.id, 'largura', Number(e.target.value))} />
                  <input type="number" placeholder="H" className="input-base w-full" style={{ fontSize: '0.7rem' }} value={p.altura} onChange={e => handlePecaChange(p.id, 'altura', Number(e.target.value))} />
                  <input type="number" placeholder="Qtd" className="input-base w-full" style={{ fontSize: '0.7rem' }} value={p.quantidade} onChange={e => handlePecaChange(p.id, 'quantidade', Number(e.target.value))} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                   <label style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <input type="checkbox" checked={p.virarFibra} onChange={e => handlePecaChange(p.id, 'virarFibra', e.target.checked)} /> Girar?
                   </label>
                   <button onClick={() => removerPeca(p.id)} style={{ all: 'unset', cursor: 'pointer', color: '#ff4444' }}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <button onClick={handleCalcular} className="btn btn-primary w-full" disabled={loading}>
          {loading ? 'Calculando...' : 'CALCULAR PLANO'}
        </button>
      </div>

      {/* Coluna Central: Visualização */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem' }}>
        {resultado ? (
          <>
            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
              {Array.from({ length: resultado.totalChapas }).map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => setChapaAtiva(i + 1)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: chapaAtiva === i + 1 ? 'var(--primary)' : '#333',
                    background: chapaAtiva === i + 1 ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                    color: chapaAtiva === i + 1 ? 'var(--primary)' : '#888',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Chapa {i + 1}
                </button>
              ))}
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PlanoCorteVisual 
                pecas={resultado.pecasPositionadas}
                chapaLargura={config.larguraChapa}
                chapaAltura={config.alturaChapa}
                chapaAtiva={chapaAtiva}
              />
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#555', gap: '1rem' }}>
             <Calculator size={48} />
             <p>Preencha os dados e clique em calcular para visualizar o plano.</p>
          </div>
        )}
      </div>

      {/* Coluna Direita: Resumo */}
      <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <section>
          <h4 style={{ margin: '0 0 1rem 0', color: '#888', fontSize: '0.75rem', letterSpacing: '0.1em' }}>RESULTADO DO CORTE</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>Total de chapas:</span>
                <span style={{ fontWeight: 'bold' }}>{resultado?.totalChapas || 0}</span>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>Aproveitamento:</span>
                <span style={{ fontWeight: 'bold', color: '#10b981' }}>{resultado?.aproveitamentoPct.toFixed(1) || 0}%</span>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>Área útil:</span>
                <span>{resultado?.areaUtilM2.toFixed(2) || 0} m²</span>
             </div>
          </div>
        </section>

        <section>
          <h4 style={{ margin: '0 0 1rem 0', color: '#888', fontSize: '0.75rem', letterSpacing: '0.1em' }}>CUSTO ESTIMADO</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>Custo p/ chapa:</span>
                <span>R$ 380,00</span>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', marginTop: '0.5rem' }}>
                <span style={{ fontWeight: 'bold' }}>Total Mat:</span>
                <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>R$ {((resultado?.totalChapas || 0) * 380).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
             </div>
          </div>
        </section>

        <section style={{ flex: 1 }}>
          <h4 style={{ margin: '0 0 1rem 0', color: '#888', fontSize: '0.75rem', letterSpacing: '0.1em' }}>SOBRAS ({">"}20cm)</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '200px', overflowY: 'auto' }}>
             {resultado?.sobras.filter(s => s.largura > 200 && s.altura > 200).map((s, i) => (
               <div key={i} style={{ fontSize: '0.7rem', padding: '0.4rem', background: '#1a1a1a', borderRadius: '4px', border: '1px solid #333', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{s.largura} x {s.altura}mm</span>
                  <span style={{ color: '#888' }}>Chapa {s.chapa}</span>
               </div>
             ))}
             {(!resultado || resultado.sobras.length === 0) && <p style={{ fontSize: '0.75rem', color: '#444' }}>Nenhuma sobra significativa.</p>}
          </div>
        </section>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
           <button className="btn btn-outline btn-sm w-full"><Download size={14} /> Exportar PDF</button>
           <button className="btn btn-primary btn-sm w-full"><Package size={14} /> Enviar p/ Produção</button>
        </div>
      </div>
    </div>
  );
};

export default CuttingPlanPage;
