import React, { useState, useEffect, useRef } from 'react';
import { Search, Package, Loader2 } from 'lucide-react';
import { apiCall } from '../../../lib/api';

interface SKU {
  id: string;
  codigo: string;
  nome: string;
  precoUnitario: number | string;
  tipo: 'INDUSTRIAL' | 'COMERCIAL';
}

interface SKUAutocompleteProps {
  onSelect: (sku: SKU) => void;
  onChange?: (value: string) => void;
  defaultValue?: string;
  value?: string;
  placeholder?: string;
  className?: string;
  error?: string;
  categoria?: string;
}

export function SKUAutocomplete({
  onSelect,
  onChange,
  value,
  defaultValue = '',
  placeholder = 'Buscar SKU ou descrição...',
  className = '',
  error,
  categoria,
}: SKUAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value !== undefined ? value : defaultValue);
  const [results, setResults] = useState<SKU[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (value !== undefined) {
      setQuery(value);
    }
  }, [value]);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchSKUs = async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const catParam = categoria ? `&categoria=${encodeURIComponent(categoria)}` : '';
      const data = await apiCall<SKU[]>(`/api/match-skus?q=${encodeURIComponent(q)}${catParam}`);
      setResults(data || []);
    } catch (error) {
      console.error('Erro ao buscar SKUs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setOpen(true);
    if (onChange) onChange(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchSKUs(val);
    }, 300);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={`w-full bg-background border ${error ? 'border-red-500' : 'border-border'} text-foreground pl-10 pr-4 py-2 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none placeholder:text-muted-foreground/60`}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
        )}
      </div>

      {open && (results.length > 0 || query.length >= 2) && (
        <div className="absolute z-50 left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-2xl max-h-80 overflow-y-auto overflow-x-hidden">
          {results.length === 0 && !loading ? (
            <div className="p-4 text-center text-muted-foreground text-sm italic">
              Nenhum SKU encontrado para "{query}"
            </div>
          ) : (
            <div className="py-2">
              {results.map((sku) => (
                <button
                  key={sku.id}
                  onClick={() => {
                    onSelect(sku);
                    setQuery(sku.codigo);
                    setOpen(false);
                    if (onChange) onChange(sku.codigo);
                  }}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left border-b border-border last:border-0"
                >
                  <div
                    className={`mt-1 p-1.5 rounded-md ${sku.tipo === 'INDUSTRIAL' ? 'bg-primary/10 text-primary' : 'bg-info/10 text-info'}`}
                  >
                    <Package className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-mono text-xs font-bold text-muted-foreground truncate">
                        {sku.codigo}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${sku.tipo === 'INDUSTRIAL' ? 'bg-primary/10 text-primary' : 'bg-info/10 text-info'}`}
                      >
                        {sku.tipo}
                      </span>
                    </div>
                    <div className="text-sm text-foreground font-medium mt-0.5 truncate">
                      {sku.nome}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Custo Base: R$ {Number(sku.precoUnitario || 0).toFixed(2)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
