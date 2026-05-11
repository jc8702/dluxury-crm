import React, { useState, useEffect, useRef } from 'react';
import { Search, Package, Loader2 } from 'lucide-react';

interface SKU {
    id: string;
    codigo: string;
    nome: string;
    precoUnitario: number | string;
    tipo: 'INDUSTRIAL' | 'COMERCIAL';
}

interface SKUAutocompleteProps {
    onSelect: (sku: SKU) => void;
    defaultValue?: string;
    placeholder?: string;
    className?: string;
}

export function SKUAutocomplete({ onSelect, defaultValue = '', placeholder = 'Buscar SKU ou descrição...', className = '' }: SKUAutocompleteProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState(defaultValue);
    const [results, setResults] = useState<SKU[]>([]);
    const [loading, setLoading] = useState(false);
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
            const res = await fetch(`/api/match-skus?q=${encodeURIComponent(q)}`);
            const data = await res.json();
            if (data.success) {
                setResults(data.data);
            }
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

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            searchSKUs(val);
        }, 300);
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => setOpen(true)}
                    placeholder={placeholder}
                    className="w-full bg-gray-900 border border-gray-700 text-white pl-10 pr-4 py-2 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
                />
                {loading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500 animate-spin" />
                )}
            </div>

            {open && (results.length > 0 || query.length >= 2) && (
                <div className="absolute z-50 left-0 right-0 mt-2 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl max-h-80 overflow-y-auto overflow-x-hidden">
                    {results.length === 0 && !loading ? (
                        <div className="p-4 text-center text-gray-500 text-sm italic">
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
                                    }}
                                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-800 transition-colors text-left border-b border-gray-800 last:border-0"
                                >
                                    <div className={`mt-1 p-1.5 rounded-md ${sku.tipo === 'INDUSTRIAL' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                        <Package className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center gap-2">
                                            <span className="font-mono text-xs font-bold text-gray-300 truncate">
                                                {sku.codigo}
                                            </span>
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${sku.tipo === 'INDUSTRIAL' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                                {sku.tipo}
                                            </span>
                                        </div>
                                        <div className="text-sm text-white font-medium mt-0.5 truncate">
                                            {sku.nome}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
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
