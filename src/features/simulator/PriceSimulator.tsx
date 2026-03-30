import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { INITIAL_PRODUCTS } from '../../services/dataService';


const PriceSimulator: React.FC = () => {
  const { taxaFinanceiraPadrao, syncToSalesforce, isCircuitOpen, syncQueue, addLog } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductDesc, setSelectedProductDesc] = useState('');
  const [useBureau] = useState(false);
  const [basePrice, setBasePrice] = useState<string>('');
  const [prazoDias, setPrazoDias] = useState<number>(0);
  const [valorSubsidio, setValorSubsidio] = useState<number>(0);
  const [showSalesforceModal, setShowSalesforceModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ loading: boolean; message: string; success?: boolean; degraded?: boolean } | null>(null);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return [];
    return INITIAL_PRODUCTS.filter(p => 
      p.descricao.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.codigo.includes(searchTerm)
    ).slice(0, 10);
  }, [searchTerm]);

  const selectedProduct = useMemo(() => 
    INITIAL_PRODUCTS.find(p => p.descricao === selectedProductDesc),
    [selectedProductDesc]
  );

  const simulationResults = useMemo(() => {
    if (!selectedProduct || !basePrice) return null;
    const valBase = parseFloat(basePrice);
    const taxaDiaria = (taxaFinanceiraPadrao / 100) / 30;
    const custoFinanceiroPrazo = valBase * (taxaDiaria * prazoDias);
    const margemSimuladaFinal = valBase + custoFinanceiroPrazo - valorSubsidio;
    const minPermitido = useBureau ? selectedProduct.minComBureau : selectedProduct.minSemBureau;
    const isBlocked = margemSimuladaFinal < minPermitido;

    return { custoFinanceiroPrazo, margemSimuladaFinal, minPermitido, isBlocked };
  }, [selectedProduct, basePrice, taxaFinanceiraPadrao, prazoDias, valorSubsidio, useBureau]);

  useEffect(() => {
    if (simulationResults?.isBlocked) {
      setShowSalesforceModal(true);
      // SRE AUDIT: Log the protection trigger
      addLog('RECALC_LOCKED', `Tentativa de negociação abaixo do mínimo para ${selectedProduct?.descricao}`, 'WARNING');
    } else {
      setShowSalesforceModal(false);
      setSyncStatus(null);
    }
  }, [simulationResults?.isBlocked]);

  const handleSalesforceSync = async () => {
    if (!selectedProduct || !simulationResults) return;

    setSyncStatus({ loading: true, message: 'Validando Proposta (SRE Module)...' });

    const result = await syncToSalesforce({
      product: selectedProduct,
      basePrice: parseFloat(basePrice),
      subsidio: valorSubsidio,
      finalPrice: simulationResults.margemSimuladaFinal,
      minAllowed: simulationResults.minPermitido
    });

    setSyncStatus({ 
      loading: false, 
      message: result.message, 
      success: result.success,
      degraded: result.degraded
    });
  };

  const formatBRL = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '5rem' }}>
      <header style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Simulador de Alta Precisão (Prod-Ready)</h2>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
             <span className="badge" style={{ background: isCircuitOpen ? 'var(--danger)' : 'var(--success)', color: 'white' }}>
               SF API: {isCircuitOpen ? 'CIRCUIT OPEN (FailSafe Active)' : 'CIRCUIT CLOSED (Online)'}
             </span>
             {syncQueue.length > 0 && (
               <span className="badge" style={{ background: 'var(--warning)', color: 'white' }}>
                 DEAD LETTER QUEUE: {syncQueue.length} itens
               </span>
             )}
          </div>
        </div>
        <p style={{ color: 'var(--danger)', fontWeight: 'bold', fontSize: '0.875rem', padding: '0.5rem', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)' }}>
           OBS: Tabela Preço A vista | Preços S/ IPI
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem' }}>1. Localizar Produto</h3>
            <div style={{ position: 'relative' }}>
              <input type="text" className="input" placeholder="Código ou Descrição..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              {filteredProducts.length > 0 && !selectedProductDesc && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', zIndex: 10, marginTop: '0.5rem' }}>
                  {filteredProducts.map(p => (
                    <div key={p.descricao} onClick={() => { setSelectedProductDesc(p.descricao); setSearchTerm(''); }} style={{ padding: '0.75rem', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{p.codigo}</span> - {p.descricao}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {selectedProduct && (
            <div className="card glass animate-fade-in" style={{ borderColor: simulationResults?.isBlocked ? 'var(--danger)' : 'var(--border)' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>2. Simulação Comercial</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input type="number" className="input" placeholder="Preço Base (A vista)" value={basePrice} onChange={e => setBasePrice(e.target.value)} />
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <input type="number" className="input" placeholder="Prazo (Dias)" value={prazoDias} onChange={e => setPrazoDias(parseInt(e.target.value) || 0)} />
                  <input type="number" className="input" placeholder="Subsídio (R$)" value={valorSubsidio} onChange={e => setValorSubsidio(parseFloat(e.target.value) || 0)} />
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ position: 'sticky', top: '2rem' }}>
           <div className="card">
              <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem' }}>Resumo da Proposta</h3>
              {simulationResults ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                   <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--background)', borderRadius: 'var(--radius-md)', border: `1px solid ${simulationResults.isBlocked ? 'var(--danger)' : 'var(--border)'}` }}>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>MARGEM SIMULADA FINAL</p>
                      <h4 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: simulationResults.isBlocked ? 'var(--danger)' : 'var(--success)' }}>
                         {formatBRL(simulationResults.margemSimuladaFinal)}
                      </h4>
                   </div>
                   <button className="btn btn-primary" style={{ width: '100%' }} disabled={simulationResults.isBlocked}>Avançar / Salvar Pedido</button>
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Selecione um produto e insira o preço.</p>
              )}
           </div>

           {showSalesforceModal && (
             <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                <div className="card animate-fade-in" style={{ maxWidth: '460px', textAlign: 'center', borderColor: 'var(--danger)', padding: '2.5rem' }}>
                   <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚨</div>
                   <h2 style={{ fontSize: '1.25rem', color: 'var(--danger)', fontWeight: 'bold', marginBottom: '0.5rem' }}>Simulação Bloqueada</h2>
                   <p style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '1.5rem' }}>
                     Prazos e negociações de preços, abrir caso no <strong style={{ color: 'var(--danger)' }}>SALESFORCE</strong>
                   </p>
                   
                   {syncStatus && (
                     <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--background)', borderRadius: '8px', border: `1px solid ${syncStatus.degraded ? 'var(--warning)' : (syncStatus.success ? 'var(--success)' : (syncStatus.loading ? 'var(--primary)' : 'var(--danger)'))}` }}>
                        <p style={{ fontSize: '0.875rem', fontWeight: '600', color: syncStatus.degraded ? 'var(--warning)' : (syncStatus.success ? 'var(--success)' : 'white') }}>
                          {syncStatus.loading ? '⏳ Processando...' : (syncStatus.success ? '✅ Caso Sincronizado' : '📋 Contingência Ativa')}
                        </p>
                        {syncStatus.degraded && (
                           <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--text-muted)' }}>
                              O sistema de aprovações está temporariamente indisponível. Sua solicitação foi salva localmente e será sincronizada assim que a conexão retornar.
                           </p>
                        )}
                        {!syncStatus.loading && !syncStatus.success && !syncStatus.degraded && (
                           <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--danger)' }}>{syncStatus.message}</p>
                        )}
                     </div>
                   )}

                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                     <button 
                       onClick={handleSalesforceSync} 
                       disabled={syncStatus?.loading || syncStatus?.success || syncStatus?.degraded}
                       className="btn btn-primary" 
                       style={{ width: '100%', justifyContent: 'center' }}
                     >
                       {syncStatus?.degraded ? 'Registrado em Fila Offline' : (syncStatus?.success ? 'Sincronizado' : 'Solicitar Alçada Especial')}
                     </button>
                     <button onClick={() => setValorSubsidio(0)} style={{ all: 'unset', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        Revisar Negociação
                     </button>
                   </div>
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default PriceSimulator;
