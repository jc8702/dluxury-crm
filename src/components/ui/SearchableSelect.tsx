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
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          className="input"
          placeholder={placeholder}
          value={open ? query : (selected ? `${selected.label} ${selected.sku ? `(${selected.sku})` : ''}` : '')}
          onFocus={() => { setOpen(true); setQuery(''); }}
          onChange={e => { setOpen(true); setQuery(e.target.value); }}
          style={{ width: '100%' }}
        />
        <button onClick={() => { setOpen(s => !s); setQuery(''); }} className="btn" style={{ padding: '0.5rem' }}>{open ? '▴' : '▾'}</button>
      </div>

      {open && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 'calc(100% + 6px)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, maxHeight: 260, overflowY: 'auto', zIndex: 2000, boxShadow: 'var(--shadow-md)' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Nenhum item encontrado</div>
          ) : (
            filtered.map(it => (
              <div key={it.id} onClick={() => { onChange(it.id); setOpen(false); }} style={{ padding: '0.65rem 0.85rem', borderBottom: '1px solid var(--border)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontWeight: 700 }}>{it.label}</div>
                  {it.sku && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{it.sku}</div>}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{it._meta || ''}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
