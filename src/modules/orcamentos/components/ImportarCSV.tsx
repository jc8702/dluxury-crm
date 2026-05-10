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

    const updateItem = (idx: number, updates: Partial<ComponenteImportado>) => {
        setItems(prev => prev.map((item, i) => i === idx ? { ...item, ...updates } : item));
    };

    const handleConfirmarImportacao = async () => {
        try {
            setStatus('saving');
            console.log('[ImportarCSV] Confirmando importação de', items.length, 'itens');
            
            // Validação básica: garantir que todos tenham nome e quantidade
            const validItems = items.filter(i => (i.nome || i.Designação) && (i.quantidade || i.Qtd) > 0);
            
            if (validItems.length === 0) {
                alert('Nenhum item válido para importar.');
                setStatus('review');
                return;
            }

            await onAddItems(validItems);
            onClose();
            
            const unmapped = items.filter(i => !i.produto_id).length;
            alert(`Sucesso! ${validItems.length} itens importados.${unmapped > 0 ? `\nNota: ${unmapped} itens estão sem SKU definido e precisarão ser vinculados manualmente no orçamento.` : ''}`);

        } catch (error: any) {
            console.error('❌ [ImportarCSV] Erro:', error);
            alert(`Erro ao importar: ${error.message}`);
        } finally {
            setStatus('review');
        }
    };

    const handleSearchSKU = async (query: string) => {
        setSearchQuery(query);
        if (query.length > 1) {
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
        updateItem(idx, {
            produto_id: sku.id,
            sku_encontrado: sku.codigo,
            status: 'encontrado'
        });
        setActiveSearchIdx(null);
        setSearchQuery('');
        setSearchResults([]);
    };

    const removeItem = (idx: number) => {
        setItems(prev => prev.filter((_, i) => i !== idx));
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Importar Projeto do SketchUp (CSV)" size="xl">
            <div className="py-2">
                {status === 'idle' && (
                    <div className="border-2 border-dashed border-zinc-800 rounded-2xl p-16 text-center hover:border-orange-500 transition-all cursor-pointer relative group bg-zinc-900/20">
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} accept=".csv" />
                        <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform border border-zinc-800 group-hover:border-orange-500/50">
                            <Upload className="w-8 h-8 text-zinc-500 group-hover:text-orange-500" />
                        </div>
                        <h3 className="text-xl text-white font-bold mb-2">Selecione o arquivo CSV</h3>
                        <p className="text-zinc-500 max-w-sm mx-auto">
                            Arraste ou clique para carregar o relatório do SketchUp (CutList Bridge ou Generate Report).
                        </p>
                        <div className="mt-8 flex items-center justify-center gap-4 text-[10px] text-zinc-600 uppercase tracking-widest font-bold">
                            <span className="flex items-center gap-1.5"><FileSpreadsheet className="w-3 h-3" /> UTF-8 ou Latin1</span>
                            <span className="w-1 h-1 rounded-full bg-zinc-800"></span>
                            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3" /> Detecção Automática</span>
                        </div>
                    </div>
                )}

                {status === 'parsing' && (
                    <div className="py-24 text-center">
                        <div className="w-12 h-12 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
                        <h3 className="text-lg text-white font-medium">Processando dados...</h3>
                        <p className="text-zinc-500 mt-2">Mapeando componentes e buscando SKUs compatíveis.</p>
                    </div>
                )}

                {status === 'review' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-[10px] text-orange-500 font-bold uppercase tracking-wider">
                                    {detectedFormat === 'CutList' ? 'SketchUp CutList' : 'CSV Genérico'}
                                </div>
                                <div className="text-xs text-zinc-500">
                                    {items.length} componentes encontrados
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-white" onClick={() => setStatus('idle')}>
                                Trocar arquivo
                            </Button>
                        </div>

                        <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-hidden">
                            <div className="max-h-[450px] overflow-y-auto">
                                <table className="w-full text-left text-[11px]">
                                    <thead className="bg-zinc-950/50 text-zinc-500 uppercase text-[9px] font-bold tracking-wider sticky top-0 z-10">
                                        <tr>
                                            <th className="p-4 border-b border-zinc-800">Designação</th>
                                            <th className="p-4 border-b border-zinc-800 text-center">Qtd</th>
                                            <th className="p-4 border-b border-zinc-800 text-center">Comp</th>
                                            <th className="p-4 border-b border-zinc-800 text-center">Larg</th>
                                            <th className="p-4 border-b border-zinc-800 text-center">Esp</th>
                                            <th className="p-4 border-b border-zinc-800">Material</th>
                                            <th className="p-4 border-b border-zinc-800 min-w-[140px]">SKU Banco</th>
                                            <th className="p-4 border-b border-zinc-800 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800/50">
                                        {items.map((item, idx) => (
                                            <tr key={idx} className="group hover:bg-white/[0.02] transition-colors">
                                                <td className="p-2 pl-4">
                                                    <input 
                                                        className="bg-transparent border-none outline-none text-white w-full focus:bg-zinc-800/50 rounded px-1 transition-all"
                                                        value={item.nome}
                                                        onChange={(e) => updateItem(idx, { nome: e.target.value })}
                                                    />
                                                </td>
                                                <td className="p-2 text-center">
                                                    <input 
                                                        type="number"
                                                        className="bg-transparent border-none outline-none text-orange-500 font-bold w-12 text-center focus:bg-zinc-800/50 rounded transition-all"
                                                        value={item.quantidade}
                                                        onChange={(e) => updateItem(idx, { quantidade: parseFloat(e.target.value) || 1 })}
                                                    />
                                                </td>
                                                <td className="p-2 text-center">
                                                    <input 
                                                        className="bg-transparent border-none outline-none text-zinc-400 w-16 text-center focus:bg-zinc-800/50 rounded transition-all"
                                                        value={item.altura || ''}
                                                        placeholder="-"
                                                        onChange={(e) => updateItem(idx, { altura: parseFloat(e.target.value) || null })}
                                                    />
                                                </td>
                                                <td className="p-2 text-center">
                                                    <input 
                                                        className="bg-transparent border-none outline-none text-zinc-400 w-16 text-center focus:bg-zinc-800/50 rounded transition-all"
                                                        value={item.largura || ''}
                                                        placeholder="-"
                                                        onChange={(e) => updateItem(idx, { largura: parseFloat(e.target.value) || null })}
                                                    />
                                                </td>
                                                <td className="p-2 text-center">
                                                    <input 
                                                        className="bg-transparent border-none outline-none text-zinc-400 w-12 text-center focus:bg-zinc-800/50 rounded transition-all"
                                                        value={item.espessura || ''}
                                                        placeholder="-"
                                                        onChange={(e) => updateItem(idx, { espessura: parseFloat(e.target.value) || null })}
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <input 
                                                        className="bg-transparent border-none outline-none text-zinc-500 w-full focus:bg-zinc-800/50 rounded px-1 transition-all italic"
                                                        value={item.material || ''}
                                                        placeholder="A definir"
                                                        onChange={(e) => updateItem(idx, { material: e.target.value })}
                                                    />
                                                </td>
                                                <td className="p-2 relative">
                                                    {activeSearchIdx === idx ? (
                                                        <div className="absolute inset-x-0 top-0 z-50 bg-zinc-950 p-2 flex flex-col border border-orange-500 shadow-2xl rounded-lg -mt-1">
                                                            <div className="flex items-center gap-2 px-2 py-1 mb-1 border-b border-zinc-800">
                                                                <Search className="w-3 h-3 text-zinc-500" />
                                                                <input 
                                                                    autoFocus
                                                                    className="bg-transparent text-[10px] text-white outline-none w-full"
                                                                    placeholder="Buscar por nome ou código..."
                                                                    value={searchQuery}
                                                                    onChange={(e) => handleSearchSKU(e.target.value)}
                                                                />
                                                            </div>
                                                            <div className="overflow-y-auto max-h-[180px] custom-scrollbar">
                                                                {searchResults.length > 0 ? searchResults.map(sku => (
                                                                    <button 
                                                                        key={sku.id}
                                                                        onClick={() => selectSKU(idx, sku)}
                                                                        className="w-full text-left p-2 hover:bg-orange-500/20 rounded-md transition-all group/btn"
                                                                    >
                                                                        <div className="font-bold text-white text-[10px]">{sku.nome}</div>
                                                                        <div className="text-zinc-500 text-[9px] flex justify-between">
                                                                            <span>{sku.codigo}</span>
                                                                            <span className="text-orange-500 opacity-0 group-hover/btn:opacity-100 font-bold">VINCULAR</span>
                                                                        </div>
                                                                    </button>
                                                                )) : searchQuery.length > 1 && (
                                                                    <div className="p-4 text-center text-zinc-600 italic text-[10px]">Nenhum SKU encontrado</div>
                                                                )}
                                                            </div>
                                                            <Button size="sm" variant="ghost" className="mt-1 h-6 text-[9px]" onClick={() => setActiveSearchIdx(null)}>Cancelar</Button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-between p-1 hover:bg-zinc-800/50 rounded-lg transition-all cursor-pointer group/sku" 
                                                             onClick={() => setActiveSearchIdx(idx)}>
                                                            <div className="flex flex-col">
                                                                {item.sku_encontrado ? (
                                                                    <span className="text-emerald-500 font-bold flex items-center gap-1">
                                                                        {item.sku_encontrado}
                                                                        <CheckCircle2 className="w-3 h-3" />
                                                                    </span>
                                                                ) : item.sku_informado ? (
                                                                    <span className="text-zinc-400 line-through opacity-50">{item.sku_informado}</span>
                                                                ) : (
                                                                    <span className="text-zinc-600 italic">Pendente</span>
                                                                )}
                                                            </div>
                                                            <Search className="w-3 h-3 text-zinc-700 group-hover/sku:text-orange-500 transition-colors" />
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-2 pr-4 text-right">
                                                    <button onClick={() => removeItem(idx)} className="p-2 text-zinc-700 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex justify-between items-center p-6 bg-zinc-950 rounded-2xl border border-zinc-900 shadow-xl">
                            <div className="flex gap-6">
                                <div className="flex flex-col">
                                    <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Mapeados</span>
                                    <span className="text-xl text-emerald-500 font-black">
                                        {items.filter(i => i.produto_id).length}
                                    </span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Pendentes</span>
                                    <span className="text-xl text-amber-500 font-black">
                                        {items.filter(i => !i.produto_id).length}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <Button variant="outline" className="px-8 border-zinc-800 text-zinc-400 hover:text-white" onClick={onClose} disabled={status === 'saving'}>
                                    Cancelar
                                </Button>
                                <Button 
                                    className="bg-orange-600 hover:bg-orange-700 px-8 font-bold text-white shadow-lg shadow-orange-900/20 disabled:opacity-50" 
                                    onClick={handleConfirmarImportacao}
                                    disabled={status === 'saving'}
                                >
                                    {status === 'saving' ? 'Importando...' : 'Adicionar ao Orçamento'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}

