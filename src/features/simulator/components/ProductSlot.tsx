import React from 'react';
import { useSimulation } from '../../../context/simulator/SimulationContext';
import { ProductSearch } from './ProductSearch';
import type { MarginStrategy, Product } from '../../../types/simulator';

interface ProductSlotProps {
  index: number;
}

export const ProductSlot: React.FC<ProductSlotProps> = ({ index }) => {
  const { input, result, updateSlot, clearSlot } = useSimulation();
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const slot = input.slots[index];
  const itemResult = result?.slots[index];

  const handleSelectProduct = (product: Product) => {
    updateSlot(index, { productId: product.codigo });
  };

  const handleQtyChange = (val: string) => {
    // Milheiros no campo de input, mas units no DTO
    const qtyUnits = (parseFloat(val) || 0) * 1000;
    updateSlot(index, { monthlyQuantity: qtyUnits });
  };

  const handlePriceChange = (val: string) => {
    const priceRaw = val.replace(',', '.');
    const pricePerMil = parseFloat(priceRaw) || 0;
    updateSlot(index, { customPrice: pricePerMil / 1000 });
  };

  const setStrategy = (strat: MarginStrategy) => {
    updateSlot(index, { selectedMargin: strat, customPrice: undefined }); // Reset custom price to auto
  };

  const strategies: { id: MarginStrategy; label: string; color: string }[] = [
    { id: 'mg0', label: 'MG0%', color: 'var(--danger)' },
    { id: 'mg5', label: '5%', color: 'var(--warning)' },
    { id: 'mg10', label: '10%', color: 'var(--secondary)' },
    { id: 'mg15', label: '15%', color: 'var(--success)' },
  ];

  return (
    <div className={`card ${slot.productId ? 'active' : ''}`} 
      style={{ 
        padding: '1.2rem', 
        borderRadius: 'var(--radius-md)', 
        marginBottom: '1rem',
        border: slot.productId ? '1.5px solid var(--primary)' : '1px solid var(--border)',
        transition: 'all var(--transition-smooth)',
        position: 'relative',
        zIndex: isSearchOpen ? 50 : 1,
        background: 'var(--surface)'
      }}
    >
      {!slot.productId ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--surface-top)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>{index + 1}</div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Selecionar Produto...</span>
          </div>
          <ProductSearch onSelect={handleSelectProduct} onToggleOpen={setIsSearchOpen} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
               <div style={{ width: '32px', height: '32px', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', fontWeight: 900, fontSize: '0.9rem' }}>{index + 1}</div>
               <div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>{itemResult?.product.descricao}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>SKU: {itemResult?.product.codigo}</div>
               </div>
            </div>
            <button onClick={() => clearSlot(index)} style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', padding: '4px' }}>Remover</button>
          </header>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1.2fr) 1fr', gap: '2rem' }}>
             <div className="slot-inputs">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                   <div className="input-group">
                      <label style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-dim)', marginBottom: '0.4rem', textTransform: 'uppercase', fontWeight: 700 }}>Consumo Mensal (Milheiros)</label>
                      <div style={{ position: 'relative' }}>
                        <input 
                          type="number" 
                          value={slot.monthlyQuantity / 1000 || ''} 
                          onChange={(e) => handleQtyChange(e.target.value)}
                          placeholder="Ex: 50"
                          className="input"
                          style={{ width: '100%', paddingRight: '40px' }}
                        />
                        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>MIL</span>
                      </div>
                   </div>

                   <div className="input-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <label style={{ fontSize: '0.65rem', color: slot.customPrice ? 'var(--secondary)' : 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
                          {slot.customPrice ? '★ Preço Manual (R$/Mil)' : 'Preço Sugerido (R$/Mil)'}
                        </label>
                        {slot.customPrice && (
                          <button 
                            onClick={() => updateSlot(index, { customPrice: undefined })}
                            style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.6rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            RESETAR
                          </button>
                        )}
                      </div>
                      <div style={{ position: 'relative' }}>
                        <input 
                          type="text" 
                          value={slot.customPrice ? (slot.customPrice * 1000).toString() : (itemResult?.proposedPrice ? (itemResult.proposedPrice * 1000).toFixed(2) : '')} 
                          onChange={(e) => handlePriceChange(e.target.value)}
                          placeholder="Digite um valor..."
                          className="input"
                          style={{ 
                            width: '100%', 
                            borderColor: slot.customPrice ? 'var(--secondary)' : 'var(--border)',
                            fontWeight: 800,
                            color: slot.customPrice ? 'var(--secondary)' : 'var(--text-main)',
                            paddingRight: '40px'
                          }}
                        />
                        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>R$</span>
                      </div>
                   </div>
                </div>
             </div>

             <div className="slot-strategies">
                <label style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-dim)', marginBottom: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}>Estratégia de Margem Sugerida</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                   {strategies.map(s => (
                     <button 
                       key={s.id}
                       onClick={() => setStrategy(s.id)}
                       style={{
                         padding: '10px 0',
                         borderRadius: 'var(--radius-sm)',
                         border: `1.5px solid ${s.color}`,
                         background: slot.selectedMargin === s.id && !slot.customPrice ? s.color : 'transparent',
                         color: slot.selectedMargin === s.id && !slot.customPrice ? 'white' : s.color,
                         fontWeight: 800,
                         fontSize: '0.7rem',
                         cursor: 'pointer',
                         transition: 'all var(--transition-fast)',
                         textAlign: 'center'
                       }}
                     >
                       {s.label}
                     </button>
                   ))}
                </div>
             </div>
          </div>
          
          {itemResult && (
            <div style={{ marginTop: '0.5rem', background: 'var(--surface-top)', padding: '0.8rem', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div style={{ display: 'flex', gap: '1.5rem' }}>
                  <div>
                    <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Custo Equilíbrio</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>R$ {(itemResult.targetPriceForZeroProfit * 1000).toFixed(2)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Faturamento/mês</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--secondary)' }}>R$ {itemResult.monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                  </div>
               </div>
               <div style={{ 
                 padding: '4px 10px', 
                 borderRadius: '50px', 
                 background: itemResult.isProfitable ? 'var(--success)' : 'var(--danger)',
                 color: 'white',
                 fontSize: '0.65rem',
                 fontWeight: 800
               }}>
                 {itemResult.isProfitable ? 'LUCRO' : 'PREJUÍZO'} ({(itemResult.realMargin * 100).toFixed(1)}%)
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
