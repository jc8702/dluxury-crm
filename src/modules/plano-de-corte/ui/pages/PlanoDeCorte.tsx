import React, { useState } from 'react';
import { usePlanoDeCorte } from '../../hooks/usePlanoDeCorte';
import { MaterialCard } from '../components/MaterialCard';
import { ResultadoCanvas } from '../components/ResultadoCanvas';
import { 
  Play, 
  Save, 
  FileUp, 
  FolderOpen, 
  ChevronRight, 
  BarChart3, 
  Layers, 
  Maximize2,
  Package,
  Cpu
} from 'lucide-react';
import { parseCSV, downloadCSVTemplate } from '../../application/usecases/csvHandler';
import { StressTester } from '../components/StressTester';
import { generateLabelsPDF } from '../../application/usecases/labelGenerator';
import { planoDeCorteRepository } from '../../infrastructure/api/planoDeCorteRepository';
import type { ChapaMaterial } from '../../domain/entities/CuttingPlan';
import '../planoDeCorte.css';

const PlanoDeCortePage: React.FC = () => {
  const { 
    plano, 
    setPlano, 
    resultado, 
    loading, 
    calculando, 
    otimizar, 
    addMaterial, 
    removeMaterial, 
    updateMaterial, 
    salvar,
    handleAprovarProducao
  } = usePlanoDeCorte();

  const [searchStock, setSearchStock] = useState('');
  const [stockResults, setStockResults] = useState<any[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleSearchStock = async (term: string) => {
    setSearchStock(term);
    if (term.length > 2) {
      const results = await planoDeCorteRepository.buscarChapas(term);
      setStockResults(results);
    } else {
      setStockResults([]);
    }
  };

  const selectChapa = (chapa: any) => {
    addMaterial({
      id: Math.random().toString(36).substr(2, 9),
      sku: chapa.sku,
      nome: chapa.nome,
      largura_mm: Number(chapa.largura_mm),
      altura_mm: Number(chapa.altura_mm),
      espessura_mm: Number(chapa.espessura_mm),
      preco_unitario: Number(chapa.preco_unitario),
      pecas: []
    });
    setSearchStock('');
    setStockResults([]);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const novosMateriais = parseCSV(text);
        setPlano(prev => ({
          ...prev,
          materiais: [...(prev.materiais || []), ...novosMateriais]
        }));
        alert(`Importação concluída: ${novosMateriais.length} materiais adicionados.`);
      } catch (err) {
        alert('Erro ao processar CSV. Verifique o formato.');
      }
    };
    reader.readAsText(file);
  };

  const handleImportEngenharia = async () => {
    const sku = prompt('Digite o SKU de Engenharia: (Ex: KIT-COZINHA-LUX-01)');
    if (!sku) return;
    
    try {
      const results = await planoDeCorteRepository.buscarEngenharia(sku);
      if (results.length > 0) {
        const eng = results[0];
        const grupos: Record<string, any[]> = {};
        eng.componentes.forEach((c: any) => {
          if (!grupos[c.material_ref]) grupos[c.material_ref] = [];
          grupos[c.material_ref].push(c);
        });

        const novosMateriais: ChapaMaterial[] = [];
        for (const matSku in grupos) {
          const chapasDisponiveis = await planoDeCorteRepository.buscarChapas(matSku);
          const chapaInfo = chapasDisponiveis.find(c => c.sku === matSku) || {
            sku: matSku,
            nome: `Material: ${matSku}`,
            largura_mm: 2750,
            altura_mm: 1830,
            espessura_mm: 18
          };

          novosMateriais.push({
            id: Math.random().toString(36).substr(2, 9),
            sku: chapaInfo.sku,
            nome: chapaInfo.nome,
            largura_mm: Number(chapaInfo.largura_mm),
            altura_mm: Number(chapaInfo.altura_mm),
            espessura_mm: Number(chapaInfo.espessura_mm),
            pecas: grupos[matSku].map(p => ({
              id: Math.random().toString(36).substr(2, 9),
              nome: p.nome,
              largura_mm: Number(p.largura_mm),
              altura_mm: Number(p.altura_mm),
              quantidade: Number(p.quantidade),
              rotacionavel: true
            }))
          });
        }

        if (confirm(`Encontrado: ${eng.nome}. Importar ${novosMateriais.length} materiais e ${eng.componentes.length} peças?`)) {
          setPlano(prev => ({
            ...prev,
            sku_engenharia: eng.sku,
            materiais: [...(prev.materiais || []), ...novosMateriais]
          }));
        }
      } else {
        alert('SKU de engenharia não encontrado.');
      }
    } catch (e) {
      alert('Erro na busca de engenharia.');
    }
  };

  const styles = {
    container: { height: '100vh', display: 'flex', flexDirection: 'column' as const, background: 'var(--background)' },
    header: { height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', background: 'var(--surface)', borderBottom: '1px solid var(--border)', zIndex: 10 },
    main: { flex: 1, display: 'flex', overflow: 'hidden' },
    sidebar: { width: '450px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' as const, background: 'var(--sidebar-bg)' },
    content: { flex: 1, background: 'rgba(0,0,0,0.2)', overflow: 'auto', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', padding: '2rem' },
    rightPanel: { width: '320px', borderLeft: '1px solid var(--border)', background: 'var(--surface)', padding: '1.5rem' },
    title: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
    actions: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
    badge: { fontSize: '0.6rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'var(--badge-bg)', color: 'var(--text-muted)', fontWeight: 'bold' }
  };

  return (
    <div className="animate-fade-in plano-corte-page" style={styles.container}>
      {/* Header */}
      <header className="plano-corte-header" style={styles.header}>
        <div style={styles.title}>
          <div style={{ background: 'var(--primary)', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Maximize2 className="text-inverse" size={20} style={{ color: 'var(--primary-text)' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>Plano de Corte Industrial</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              <span>D'Luxury ERP</span>
              <ChevronRight size={10} />
              <span style={{ color: 'var(--primary)' }}>Otimizador v2.0</span>
            </div>
          </div>
        </div>

        <div className="plano-corte-actions" style={styles.actions}>
          <input type="file" ref={fileInputRef} onChange={handleImportCSV} accept=".csv" style={{ display: 'none' }} />
          
          <button onClick={() => fileInputRef.current?.click()} className="btn btn-outline" style={{ padding: '0.5rem 0.75rem' }}>
            <FileUp size={16} /> <span style={{fontSize: '0.75rem'}}>CVS</span>
          </button>
          
          <button onClick={handleImportEngenharia} className="btn btn-outline" style={{ padding: '0.5rem 0.75rem' }}>
            <FolderOpen size={16} /> <span style={{fontSize: '0.75rem'}}>ENGENHARIA</span>
          </button>

          <div style={{ width: '1px', height: '20px', background: 'var(--border)', margin: '0 8px' }} />

          {resultado && (
            <button onClick={handleAprovarProducao} disabled={loading} className="btn badge" style={{ background: 'var(--success)', color: 'white', padding: '0.5rem 1rem' }}>
              <Package size={16} /> APROVAR PRODUÇÃO
            </button>
          )}

          <button onClick={salvar} disabled={loading} className="btn btn-outline">
            <Save size={18} /> SALVAR
          </button>

          <button onClick={otimizar} disabled={calculando} className="btn btn-primary" style={{ minWidth: '160px' }}>
            {calculando ? <Cpu className="animate-spin" size={18} /> : <Play fill="currentColor" size={18} />}
            OTIMIZAR AGORA
          </button>
        </div>
      </header>

      <main className="plano-corte-main" style={styles.main}>
        {/* Left Sidebar */}
        <aside className="plano-corte-sidebar" style={styles.sidebar}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
            <label className="label-base" style={{ marginBottom: '1rem' }}>Materiais e Peças</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="text"
                placeholder="Buscar material no estoque..."
                value={searchStock}
                onChange={(e) => handleSearchStock(e.target.value)}
                className="input"
              />
              {stockResults.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px', background: 'var(--surface-overlay)', border: '1px solid var(--border-strong)', borderRadius: '12px', zIndex: 100, overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
                  {stockResults.map(s => (
                    <div key={s.id} onClick={() => selectChapa(s)} style={{ padding: '12px', borderBottom: '1px solid var(--border)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="hover-scale">
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>{s.sku}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.nome}</div>
                      </div>
                      <div style={{ color: 'var(--primary)', fontWeight: '800', fontSize: '0.75rem' }}>{s.largura_mm}x{s.altura_mm}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button 
              onClick={() => selectChapa({ sku: 'MANUAL', nome: 'Material Customizado', largura_mm: 2750, altura_mm: 1840, espessura_mm: 18 })}
              className="btn btn-outline"
              style={{ width: '100%', marginTop: '1rem', fontSize: '0.7rem' }}
            >
              + CONFIGURAÇÃO MANUAL
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
            <StressTester onInject={(mats) => setPlano(prev => ({ ...prev, materiais: [...(prev.materiais || []), ...mats] }))} />
            {plano.materiais?.map((mat, idx) => (
              <MaterialCard 
                key={mat.id} 
                material={mat} 
                onUpdate={(upd) => updateMaterial(idx, upd)}
                onRemove={() => removeMaterial(idx)}
              />
            ))}
            {(!plano.materiais || plano.materiais.length === 0) && (
              <div style={{ height: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', opacity: 0.5 }}>
                <Package size={48} style={{ color: 'var(--border-strong)', marginBottom: '1rem' }} />
                <h4 style={{ margin: 0 }}>Vazio</h4>
                <p style={{ fontSize: '0.8rem' }}>Adicione materiais para começar.</p>
              </div>
            )}
          </div>
        </aside>

        {/* Canvas Area */}
        <section className="plano-corte-content" style={styles.content}>
          {resultado ? (
            <ResultadoCanvas resultado={resultado} />
          ) : (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.15 }}>
              <Layers size={80} style={{ marginBottom: '1.5rem' }} />
              <h2 style={{ fontWeight: '200', fontSize: '2rem' }}>Aguardando Otimização</h2>
              <p>Configure materiais e peças e clique em <b>OTIMIZAR</b></p>
            </div>
          )}
        </section>

        {/* Right Info Panel */}
        <aside className="plano-corte-right-panel" style={styles.rightPanel}>
          <h3 style={{ fontSize: '0.75rem', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={14} /> Estatísticas
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <span style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>APROVEITAMENTO GERAL</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1, height: '8px', background: 'var(--input-bg)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      height: '100%', 
                      width: `${resultado?.aproveitamento_percentual || 0}%`,
                      background: (resultado?.aproveitamento_percentual || 0) >= 80 ? 'var(--success)' : (resultado?.aproveitamento_percentual || 0) >= 60 ? 'var(--warning)' : 'var(--danger)',
                      transition: 'width 1s ease'
                    }} 
                  />
                </div>
                <span style={{ fontWeight: '800', color: 'var(--primary)' }}>{Math.round(resultado?.aproveitamento_percentual || 0)}%</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="card" style={{ padding: '0.75rem' }}>
                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block' }}>CHAPAS</span>
                <span style={{ fontSize: '1.2rem', fontWeight: '800' }}>{resultado?.chapas_necessarias || 0}</span>
              </div>
              <div className="card" style={{ padding: '0.75rem' }}>
                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block' }}>ÁREA ÚTIL</span>
                <span style={{ fontSize: '1.2rem', fontWeight: '800' }}>{Math.round((resultado?.layouts.reduce((acc, l) => acc + l.area_aproveitada_mm2, 0) || 0) / 1000000)}m²</span>
              </div>
            </div>

            <div style={{ paddingTop: '1.5rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Cálculo:</span>
                <span style={{ fontWeight: '700' }}>{resultado?.tempo_calculo_ms.toFixed(0)} ms</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                <span style={{ fontWeight: '800', color: resultado ? 'var(--success)' : 'var(--warning)' }}>
                  {calculando ? 'Processando...' : resultado ? 'Otimizado' : 'Aguardando'}
                </span>
              </div>
            </div>

            {resultado && (
              <button onClick={() => generateLabelsPDF(resultado)} className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }}>
                IMPRIMIR ETIQUETAS
              </button>
            )}
            
            <button onClick={downloadCSVTemplate} style={{ color: 'var(--text-muted)', fontSize: '0.6rem', border: 'none', background: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
              Baixar Template CSV
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
};

export default PlanoDeCortePage;
