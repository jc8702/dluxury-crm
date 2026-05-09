import React, { useState } from 'react';
import { Modal, Button } from '@/design-system/components';
import { Upload, CheckCircle2, AlertCircle, FileSpreadsheet, Search, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { GenericCSVParser, type ComponenteImportado } from '../../../utils/parsers/GenericCSVParser.js';
import { CutListParser } from '../../../utils/parsers/CutListParser.js';
import { CSVDetector } from '../../../utils/parsers/CSVDetector.js';
import Papa from 'papaparse';

export function ImportarCSV({ isOpen, onClose, onAddItems, orcamentoId }: { 
    isOpen: boolean, 
    onClose: () => void, 
    onAddItems: (items: any[]) => Promise<void>,
    orcamentoId: string 
}) {
    const [status, setStatus] = useState<'idle' | 'parsing' | 'review' | 'saving'>('idle');
    const [items, setItems] = useState<ComponenteImportado[]>([]);
    const [detectedFormat, setDetectedFormat] = useState<'CutList' | 'Generic' | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [activeSearchIdx, setActiveSearchIdx] = useState<number | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setStatus('parsing');
            
            // Leitura inicial para detecção
            const reader = new FileReader();
            const text = await new Promise<string>((resolve) => {
                reader.onload = (ev) => resolve(ev.target?.result as string);
                reader.readAsText(file, 'UTF-8'); // Tenta UTF-8 primeiro
            });

            // Detectar delimitador e cabeçalhos
            const delimiter = CSVDetector.detectDelimiter(text.substring(0, 1000));
            const results = Papa.parse(text, { delimiter, header: true, preview: 5 });
            const headers = results.meta.fields || [];

            let parsed: ComponenteImportado[];

            if (CSVDetector.isCutList(headers, results.data)) {
                console.log('[ImportarCSV] Formato CutList detectado');
                setDetectedFormat('CutList');
                parsed = await CutListParser.parse(file);
            } else {
                console.log('[ImportarCSV] Formato Genérico detectado');
                setDetectedFormat('Generic');
                parsed = await GenericCSVParser.parse(file);
            }
            
            // Match de SKUs no backend
            const response = await fetch('/api/match-skus', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itens: parsed })
            });
            const result = await response.json();
            
            setItems(result.data || parsed); // Fallback se match falhar
            setStatus('review');
        } catch (err) {
            console.error('[ImportarCSV] Erro:', err);
            alert('Falha ao processar CSV. Verifique se o formato é válido.');
            setStatus('idle');
        }
    };

    const handleSave = async () => {
        setStatus('saving');
        try {
            // Apenas passamos os itens para o componente pai (OrcamentoForm)
            // O pai usará o hook importItems que já lida com a persistência correta
            await onAddItems(items);
            onClose();
        } catch (err) {
            console.error('[ImportarCSV] Erro ao salvar:', err);
            alert('Erro ao adicionar itens ao orçamento');
        } finally {
            setStatus('review');
        }
    };

    const handleSearchSKU = async (query: string) => {
        setSearchQuery(query);
        if (query.length > 2) {
            try {
                const results = await api.engineering.list({ q: query });
                setSearchResults(results);
            } catch (err) {
                console.error(err);
            }
        } else {
            setSearchResults([]);
        }
    };

    const selectSKU = (idx: number, sku: any) => {
        setItems(prev => prev.map((item, i) => i === idx ? {
            ...item,
            produto_id: sku.id,
            sku_encontrado: sku.codigo,
            status: 'encontrado'
        } : item));
        setActiveSearchIdx(null);
        setSearchQuery('');
        setSearchResults([]);
    };

    const removeItem = (idx: number) => {
        setItems(prev => prev.filter((_, i) => i !== idx));
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Importar CSV do SketchUp" size="xl">
            <div className="py-4">
                {status === 'idle' && (
                    <div className="border-2 border-dashed border-zinc-800 rounded-2xl p-12 text-center hover:border-orange-500 transition-all cursor-pointer relative">
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} accept=".csv" />
                        <FileSpreadsheet className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
                        <p className="text-white font-bold">Arraste seu CSV do SketchUp aqui</p>
                        <p className="text-xs text-zinc-500 mt-2">Suporta CutList Bridge e Generate Report</p>
                    </div>
                )}

                {status === 'parsing' && (
                    <div className="py-20 text-center animate-pulse">
                        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-zinc-400">Analisando componentes e dimensões...</p>
                    </div>
                )}

                {status === 'review' && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 bg-zinc-900/50 border border-zinc-800 p-3 rounded-xl mb-2">
                            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                                <CheckCircle2 className="w-4 h-4 text-orange-500" />
                            </div>
                            <div>
                                <p className="text-xs text-zinc-400">Formato Detectado</p>
                                <p className="text-sm text-white font-bold">
                                    {detectedFormat === 'CutList' ? 'CutList (SketchUp) - Dimensões convertidas' : 'CSV Genérico'}
                                </p>
                            </div>
                        </div>

                        <div className="max-h-[400px] overflow-y-auto border border-zinc-800 rounded-xl">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-zinc-900 text-zinc-500 sticky top-0">
                                    <tr>
                                        <th className="p-3">Nome</th>
                                        <th className="p-3">L x A x E</th>
                                        <th className="p-3 text-center">Qtd</th>
                                        <th className="p-3">Material</th>
                                        <th className="p-3">Match SKU</th>
                                        <th className="p-3">Status</th>
                                        <th className="p-3"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-900">
                                    {items.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                                            <td className="p-3 text-white font-medium">{item.nome}</td>
                                            <td className="p-3 font-mono text-zinc-400">
                                                {item.largura}x{item.altura}x{item.espessura}
                                            </td>
                                            <td className="p-3 text-center">{item.quantidade}</td>
                                            <td className="p-3 text-zinc-500">{item.material || '-'}</td>
                                            <td className="p-3 relative">
                                                {activeSearchIdx === idx ? (
                                                    <div className="absolute inset-0 z-50 bg-zinc-950 p-1 flex flex-col border border-orange-500 rounded-lg">
                                                        <div className="flex items-center gap-2 px-2 py-1 border-b border-zinc-800">
                                                            <Search className="w-3 h-3 text-zinc-500" />
                                                            <input 
                                                                autoFocus
                                                                className="bg-transparent text-[10px] text-white outline-none w-full"
                                                                placeholder="Buscar SKU..."
                                                                value={searchQuery}
                                                                onChange={(e) => handleSearchSKU(e.target.value)}
                                                            />
                                                            <button onClick={() => setActiveSearchIdx(null)} className="text-zinc-500 hover:text-white">×</button>
                                                        </div>
                                                        <div className="flex-1 overflow-y-auto max-h-[150px]">
                                                            {searchResults.map(sku => (
                                                                <button 
                                                                    key={sku.id}
                                                                    onClick={() => selectSKU(idx, sku)}
                                                                    className="w-full text-left p-2 hover:bg-orange-600 text-[9px] border-b border-zinc-900 group"
                                                                >
                                                                    <div className="font-bold text-white group-hover:text-black">{sku.nome}</div>
                                                                    <div className="text-zinc-500 group-hover:text-black/70">{sku.codigo}</div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-between group">
                                                        {item.sku_encontrado ? (
                                                            <span className="text-orange-500 font-bold">{item.sku_encontrado}</span>
                                                        ) : (
                                                            <span className="text-zinc-700 italic">Não encontrado</span>
                                                        )}
                                                        <button 
                                                            onClick={() => {
                                                                setActiveSearchIdx(idx);
                                                                setSearchQuery('');
                                                                setSearchResults([]);
                                                            }}
                                                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-800 rounded transition-all"
                                                        >
                                                            <Search className="w-3.5 h-3.5 text-orange-500" />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                {item.status === 'encontrado' ? (
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                                ) : (
                                                    <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                                                )}
                                            </td>
                                            <td className="p-3 text-right">
                                                <button onClick={() => removeItem(idx)} className="text-zinc-600 hover:text-red-500 transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-between items-center p-4 bg-zinc-950 rounded-xl border border-zinc-900">
                            <div className="text-xs text-zinc-500">
                                <span className="text-emerald-500 font-bold">{items.filter(i => i.status === 'encontrado').length}</span> itens mapeados automaticamente.
                            </div>
                            <div className="flex gap-3">
                                <Button variant="outline" onClick={() => setStatus('idle')}>Trocar Arquivo</Button>
                                <Button className="bg-orange-600 hover:bg-orange-700" onClick={handleSave}>Confirmar Importação</Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
