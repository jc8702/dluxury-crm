import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Package, Layers, Info } from 'lucide-react';

interface SKU {
    id: string;
    codigo: string;
    nome: string;
    preco: number;
    tipo: 'COMPONENTE' | 'ENGENHARIA';
}

interface SKUAutocompleteProps {
    value: string;
    onSelect: (sku: SKU) => void;
    placeholder?: string;
    className?: string;
}

export const SKUAutocomplete: React.FC<SKUAutocompleteProps> = ({ value, onSelect, placeholder, className }) => {
    const [inputValue, setInputValue] = useState(value);
    const [suggestions, setSuggestions] = useState<SKU[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const debouncedTimer = useRef<NodeJS.Timeout>();

    useEffect(() => {
        setInputValue(value);
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const searchSKUs = async (query: string) => {
        if (query.length < 2) {
            setSuggestions([]);
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`/api/orcamentos-pro?action=search-skus&q=${encodeURIComponent(query)}`);
            const result = await response.json();
            if (result.success) {
                console.log('✅ SKUs encontrados:', result.data);
                setSuggestions(result.data || []);
                setIsOpen(true);
            }
        } catch (error) {
            console.error('Erro na busca de SKUs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInputValue(val);

        if (debouncedTimer.current) clearTimeout(debouncedTimer.current);
        debouncedTimer.current = setTimeout(() => {
            searchSKUs(val);
        }, 300);
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            <div className="relative">
                <input
                    type="text"
                    className={`w-full bg-zinc-900 border-zinc-800 rounded-xl h-10 px-4 font-bold text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all placeholder:text-zinc-700 ${className}`}
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={() => inputValue.length >= 2 && setIsOpen(true)}
                    placeholder={placeholder || "Procurar por código ou descrição..."}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {loading ? (
                        <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />
                    ) : (
                        <Search className="w-4 h-4 text-zinc-700" />
                    )}
                </div>
            </div>

            {isOpen && suggestions.length > 0 && (
                <div className="absolute z-[100] mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="max-h-[300px] overflow-y-auto p-2 flex flex-col gap-1 custom-scrollbar">
                        {suggestions.map((sku) => (
                            <button
                                key={sku.id}
                                className="flex items-center justify-between p-3 rounded-xl hover:bg-orange-500/10 border border-transparent hover:border-orange-500/20 group transition-all text-left"
                                onClick={() => {
                                    onSelect(sku);
                                    setInputValue(sku.codigo);
                                    setIsOpen(false);
                                }}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${sku.tipo === 'ENGENHARIA' ? 'bg-blue-500/10 text-blue-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                        {sku.tipo === 'ENGENHARIA' ? <Layers className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-white font-black text-sm group-hover:text-orange-500 transition-colors truncate">
                                            {sku.codigo || 'S/ COD'}
                                        </span>
                                        <span className="text-zinc-400 text-[10px] uppercase font-bold tracking-tight truncate">
                                            {sku.nome || 'S/ NOME'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-700">
                                        {sku.tipo}
                                    </span>
                                    {sku.preco > 0 && (
                                        <span className="text-xs font-black text-white italic">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sku.preco)}
                                        </span>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {isOpen && suggestions.length === 0 && !loading && inputValue.length >= 2 && (
                <div className="absolute z-[100] mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center shadow-2xl">
                    <Info className="w-8 h-8 text-zinc-800 mx-auto mb-2" />
                    <p className="text-zinc-600 text-xs font-bold uppercase tracking-widest">Nenhum SKU encontrado</p>
                </div>
            )}
        </div>
    );
};
