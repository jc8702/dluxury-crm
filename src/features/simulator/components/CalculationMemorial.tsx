import React from 'react';
import type { SimulationResultSlot } from '../../../types/simulator';

interface Props {
  slots: SimulationResultSlot[];
  cfPct: number;
  contractMonths: number;
}

export const CalculationMemorial: React.FC<Props> = ({ slots, cfPct, contractMonths }) => {
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatUnit = (val: number) => 
    new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(val);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <header style={{ marginBottom: '1rem' }}>
        <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Memorial de Cálculo Detalhado
        </h4>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          Entenda a composição do custo e a formação do preço alvo para cada item do projeto.
        </p>
      </header>

      {slots.filter(s => s.product.codigo !== '').map((slot, index) => (
        <div key={slot.product.codigo + index} className="card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--primary)', background: 'var(--surface)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.2rem' }}>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{slot.product.descricao}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>SKU: {slot.product.codigo} | Volume: {slot.quantity.toLocaleString('pt-BR')} un/mês</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Vigência</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{contractMonths} meses</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ background: 'var(--surface-top)', padding: '1rem', borderRadius: '8px' }}>
              <h5 style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 800, marginBottom: '0.8rem', textTransform: 'uppercase' }}>Análise Mensal</h5>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.4rem' }}>
                <span>Custo Base (MG0):</span>
                <span>{formatCurrency(slot.baseCostPerUn * 1000)}/mil</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, borderTop: '1px solid var(--border)', paddingTop: '0.4rem', marginTop: '0.4rem' }}>
                <span>Subtotal Base:</span>
                <span>{formatCurrency(slot.baseCostPerUn * slot.quantity)}</span>
              </div>
            </div>

            <div style={{ background: 'var(--surface-top)', padding: '1rem', borderRadius: '8px' }}>
              <h5 style={{ fontSize: '0.65rem', color: 'var(--success)', fontWeight: 800, marginBottom: '0.8rem', textTransform: 'uppercase' }}>Consolidado Contrato</h5>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.4rem' }}>
                <span style={{ opacity: 0.7 }}>Base ({contractMonths}m):</span>
                <span>{formatCurrency(slot.baseCostTotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.4rem' }}>
                <span style={{ opacity: 0.7 }}>+ Subsídio Alocado:</span>
                <span>{formatCurrency(slot.subsidyAllocated)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.4rem' }}>
                <span style={{ opacity: 0.7 }}>+ Comissão Integrador:</span>
                <span>{formatCurrency(slot.commissionTotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, color: 'var(--success)', borderTop: '1px solid var(--border)', paddingTop: '0.4rem', marginTop: '0.4rem' }}>
                <span>Custo Total:</span>
                <span>{formatCurrency(slot.totalCostContract)}</span>
              </div>
            </div>

            <div style={{ background: 'var(--primary-glow)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--primary)' }}>
              <h5 style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 800, marginBottom: '0.8rem', textTransform: 'uppercase' }}>Formação de Preço</h5>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.4rem' }}>
                <span>Custo Unitário:</span>
                <span>R$ {formatUnit(slot.totalCostPerUn)}</span>
              </div>
              {cfPct > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.4rem' }}>
                  <span>+ C.F. ({(cfPct * 100).toFixed(1)}%):</span>
                  <span>R$ {formatUnit(slot.totalCostPerUn * cfPct)}</span>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', marginTop: '0.8rem', textAlign: 'right' }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 800 }}>PREÇO ALVO (EQUILÍBRIO)</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--primary)' }}>{formatCurrency(slot.costWithCf * 1000)}<span style={{ fontSize: '0.7rem' }}>/mil</span></div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
