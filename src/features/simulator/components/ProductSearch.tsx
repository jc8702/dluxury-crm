import React, { useState, useRef, useEffect } from 'react';
import type { Product } from '../../../types/simulator';
import { INITIAL_PRODUCTS } from '../../../services/dataService';

interface ProductSearchProps {
  onSelect: (product: Product) => void;
  onToggleOpen?: (isOpen: boolean) => void;
  placeholder?: string;
}

export const ProductSearch: React.FC<ProductSearchProps> = ({ onSelect, onToggleOpen, placeholder }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const search = async () => {
      if (query.length > 1) {
        const q = query.toLowerCase().trim();
        const filtered = INITIAL_PRODUCTS.filter(
            p => p.descricao.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q)
        ).slice(0, 10);
        setResults(filtered);
        setIsOpen(true);
        onToggleOpen?.(true);
      } else {
        setResults([]);
        setIsOpen(false);
        onToggleOpen?.(false);
      }
    };

    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [query, onToggleOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        onToggleOpen?.(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <input 
        type="text" 
        placeholder={placeholder || "Buscar produto por nome ou código..."}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          if (query.length > 1) {
            setIsOpen(true);
            onToggleOpen?.(true);
          }
        }}
        className="input"
        style={{ width: '100%', padding: '14px 18px', background: 'var(--surface-top)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}
      />
      
      {isOpen && results.length > 0 && (
        <div style={{ 
          position: 'absolute', 
          top: '100%', 
          left: 0, 
          right: 0, 
          zIndex: 1000, 
          marginTop: '8px', 
          borderRadius: 'var(--radius-md)', 
          maxHeight: '300px', 
          overflowY: 'auto',
          padding: '8px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
        }}>
          {results.map(product => (
            <div 
              key={`${product.codigo}-${product.descricao}`}
              onClick={() => {
                onSelect(product);
                setIsOpen(false);
                onToggleOpen?.(false);
                setQuery('');
              }}
              style={{
                padding: '12px',
                cursor: 'pointer',
                borderRadius: 'var(--radius-sm)',
                transition: 'all var(--transition-fast)',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                borderBottom: '1px solid var(--border)'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-top)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{product.descricao}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{product.codigo}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
