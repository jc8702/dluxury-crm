import React from 'react';
import { Layers, Plus, Search, Filter } from 'lucide-react';

const SKUPage: React.FC = () => {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '2.25rem', fontWeight: '900', color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Layers size={32} style={{ color: 'var(--primary)' }} /> Catálogo de Peças / SKUs
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '0.25rem' }}>
             Gerenciamento atômico de insumos técnicos e acessórios.
          </p>
        </div>
        <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem' }}>
          <Plus size={20} /> Novo SKU
        </button>
      </header>

      <div className="card" style={{ padding: '0.75rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              className="input-base" 
              style={{ paddingLeft: '2.5rem', width: '100%' }}
              placeholder="Buscar por código SKU ou nome..." 
            />
          </div>
          <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={18} /> Filtros
          </button>
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '5rem 0' }}>
         <Layers size={64} style={{ color: 'var(--border)', marginBottom: '1.5rem', opacity: 0.3 }} />
         <h3 style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Iniciando sincronização com o banco de dados industrial...</h3>
         <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Suas tabelas `erp_skus` e `erp_inventory` já estão ativas.</p>
      </div>
    </div>
  );
};

export default SKUPage;
