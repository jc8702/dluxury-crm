import React, { useState, useEffect, useRef } from 'react';

interface Item { id: string; label: string; sku?: string; [key: string]: any }

const SearchableSelect: React.FC<{
  items: Item[];
  value?: string;
  placeholder?: string;
  onChange: (id: string) => void;
  style?: React.CSSProperties;
}> = ({ items, value, placeholder = 'Buscar...', onChange, style }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const selected = items.find(i => i.id === value);

  const filtered = items.filter(i => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const label = (i.label || '').toString().toLowerCase();
    const sku = (i.sku || '').toString().toLowerCase();
    return label.includes(q) || sku.includes(q);
  });

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%', ...style }}>
      <div className="flex gap-1">
        <input
          className="input flex-1"
          placeholder={placeholder}
          value={open ? query : (selected ? `${selected.label} ${selected.sku ? `(${selected.sku})` : ''}` : '')}
          onFocus={() => { setOpen(true); setQuery(''); }}
          onChange={e => { setOpen(true); setQuery(e.target.value); }}
          style={{ width: '100%', minHeight: 40, fontSize: '0.8rem' }}
        />
        <button
          type="button"
          onClick={() => { setOpen(s => !s); setQuery(''); }}
          className="btn"
          style={{ padding: '0.4rem 0.6rem', minHeight: 40, fontSize: '0.75rem' }}
        >
          {open ? '▲' : '▼'}
        </button>
      </div>

      {open && (
        <div
          className="custom-scrollbar"
          style={{
            position: 'absolute',
            left: 0, right: 0, top: 'calc(100% + 4px)',
            background: '#111827',
            border: '1px solid #374151',
            borderRadius: 10,
            maxHeight: 320,
            overflowY: 'auto',
            zIndex: 2100,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            minWidth: 320,
          }}
        >
          <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.65rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1F2937', background: '#0D1117' }}>
            {filtered.length} material(is) encontrado(s)
          </div>
          {filtered.length === 0 ? (
            <div style={{ padding: '1rem', color: '#6B7280', fontSize: '0.8rem', textAlign: 'center' }}>
              Nenhum material encontrado
            </div>
          ) : (
            filtered.map(it => (
              <div
                key={it.id}
                onClick={() => { onChange(it.id); setOpen(false); }}
                style={{
                  padding: '0.75rem 0.85rem',
                  borderBottom: '1px solid #1F2937',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'background 0.15s',
                  background: it.id === value ? '#1E293B' : 'transparent',
                }}
                onMouseEnter={e => { if (it.id !== value) (e.currentTarget as HTMLElement).style.background = '#1F2937'; }}
                onMouseLeave={e => { if (it.id !== value) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#F9FAFB', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {it.label}
                  </div>
                  {it.sku && (
                    <div style={{ fontSize: '0.7rem', color: '#E2AC00', fontWeight: 600 }}>
                      SKU: {it.sku}
                    </div>
                  )}
                </div>
                {it.id === value && (
                  <span style={{ fontSize: '0.65rem', color: '#10B981', fontWeight: 700, marginLeft: 8, whiteSpace: 'nowrap' }}>
                    ✓ SELECIONADO
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
