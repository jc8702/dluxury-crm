import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from '@/design-system/components';
import { 
    Calculator, FileText, Upload, Plus, Trash2, 
    ChevronDown, ChevronUp, Layers, CheckCircle2, FileDown, Search, ArrowLeft
} from 'lucide-react';
import { useOrcamento } from '../hooks/useOrcamento';
import { ListaExplodidaGrid } from '../components/ListaExplodidaGrid';
import { ImportacaoModal } from '../components/ImportacaoModal';
import { ResumoFinanceiro } from '../components/ResumoFinanceiro';
import { exportBudgetToPDF } from '../services/export-pdf';
import { api } from '@/lib/api';

export default function OrcamentoForm() {
    // Pegar ID da URL se existir (Simulando roteamento)
    const urlParams = new URLSearchParams(window.location.search);
    const orcamentoId = urlParams.get('id');

    const { 
        orcamento, loading, inicializar, setHeader, addItem, 
        importItems, removeItem, updateItemExplosion, error 
    } = useOrcamento(orcamentoId || undefined);
    
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [expandedItem, setExpandedItem] = useState<string | null>(null);
    const [clients, setClients] = useState<any[]>([]);
    const [skus, setSkus] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        api.clients.list().then(setClients).catch(console.error);

        // Busca inicial de SKUs (limitada)
        api.engineering.list().then(setSkus).catch(console.error);
    }, [orcamentoId]);

    // Busca de SKU reativa (Debounced simplificado)
    useEffect(() => {
        if (searchTerm.length > 2) {
            const timer = setTimeout(() => {
                api.engineering.list({ q: searchTerm })
                    .then(setSkus)
                    .catch(console.error);
            }, 300);
            return () => clearTimeout(timer);
        } else if (searchTerm.length === 0) {
            api.engineering.list().then(setSkus).catch(console.error);
        }
    }, [searchTerm]);

    const handleCreateDraft = async () => {
        try {
            const res = await inicializar({ 
                clienteId: null, 
                margemLucroPercentual: 30,
                validadeDias: 15
            });
            // Atualizar URL (Simulado)
            window.history.pushState({}, '', `?id=${res.id}`);
            window.location.reload(); // Forçar recarregamento para o hook pegar o ID
        } catch (err) {
            alert('Erro ao criar rascunho');
        }
    };

    const handleAddSku = async (sku: any) => {
        if (!orcamentoId) {
            alert('Crie o rascunho primeiro');
            return;
        }
        await addItem(sku.id, 1);
        setSearchTerm('');
    };

    if (loading && !orcamento) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
                <p className="text-zinc-500 font-bold animate-pulse">Sincronizando com o Servidor...</p>
            </div>
        );
    }

    if (error && !orcamento) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 gap-6 text-center">
                <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl max-w-md">
                    <p className="text-red-500 font-bold mb-2">Erro ao carregar orçamento</p>
                    <p className="text-zinc-500 text-sm">{error}</p>
                </div>
                <Button variant="outline" className="border-zinc-800" onClick={() => window.location.reload()}>
                    Tentar Novamente
                </Button>
            </div>
        );
    }

    if (!orcamentoId && !orcamento) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8">
                <div className="max-w-md w-full bg-zinc-950 border border-zinc-900 rounded-3xl p-10 text-center shadow-2xl">
                    <div className="w-20 h-20 bg-orange-600/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FileText className="w-10 h-10 text-orange-500" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-2">Novo Orçamento</h2>
                    <p className="text-zinc-500 mb-8">Inicie um novo orçamento profissional com cálculos de engenharia e BOM.</p>
                    <Button 
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold h-14 text-lg"
                        onClick={handleCreateDraft}
                    >
                        Criar Rascunho
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-8 pb-32">
            {/* Header Sticky */}
            <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-6">
                    <Button variant="ghost" size="icon" className="bg-zinc-900 border border-zinc-800 rounded-xl" onClick={() => window.history.back()}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
                            Orçamento <span className="text-orange-500">{orcamento?.numeroOrcamento || '...'}</span>
                        </h1>
                        <p className="text-zinc-500 text-sm mt-1">Status: <span className="text-orange-500 font-bold">{orcamento?.status || 'CARREGANDO'}</span></p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <Button variant="outline" className="border-zinc-800 hover:bg-zinc-900" onClick={() => exportBudgetToPDF(orcamento)}>
                        <FileDown className="w-4 h-4 mr-2" /> Exportar PDF
                    </Button>
                    <Button variant="outline" className="border-zinc-800 hover:bg-zinc-900" onClick={() => setIsImportModalOpen(true)}>
                        <Upload className="w-4 h-4 mr-2" /> Importar Projeto
                    </Button>
                    <Button className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-8 shadow-lg shadow-orange-900/20">
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Enviar para Cliente
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-8">
                {/* Coluna Esquerda: Dados Gerais */}
                <div className="col-span-12">
                    <Card className="bg-zinc-950 border-zinc-900 shadow-2xl overflow-hidden">
                        <CardHeader className="bg-zinc-900/50 border-b border-zinc-900/50 py-3">
                            <CardTitle className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2 font-black">
                                <FileText className="w-3 h-3 text-orange-500" /> Configurações Comerciais
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-4 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-zinc-600">Cliente</label>
                                    <select 
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all appearance-none"
                                        value={orcamento?.clienteId || ''}
                                        onChange={(e) => setHeader({ clienteId: e.target.value })}
                                    >
                                        <option value="">Selecione um cliente...</option>
                                        {clients.map(c => (
                                            <option key={c.id} value={c.id}>{c.nome}</option>
                                        ))}
                                    </select>
                                </div>
                                <Input 
                                    label="Margem de Lucro (%)"
                                    type="number"
                                    value={orcamento?.margemLucroPercentual || 0}
                                    onChange={(e) => setHeader({ margemLucroPercentual: parseFloat(e.target.value) || 0 })}
                                    onBlur={(e) => setHeader({ margemLucroPercentual: parseFloat(e.target.value) || 0 })}
                                    className="bg-zinc-950 border-zinc-800 focus:border-orange-500 text-white font-bold"
                                />
                                <Input 
                                    label="Taxa Financeira (%)"
                                    type="number"
                                    value={orcamento?.taxaFinanceiraPercentual || 0}
                                    onChange={(e) => setHeader({ taxaFinanceiraPercentual: parseFloat(e.target.value) || 0 })}
                                    onBlur={(e) => setHeader({ taxaFinanceiraPercentual: parseFloat(e.target.value) || 0 })}
                                    className="bg-zinc-950 border-zinc-800 focus:border-orange-500 text-white font-bold"
                                />
                                <Input 
                                    label="Validade (Dias)"
                                    type="number"
                                    value={orcamento?.validadeDias || 0}
                                    onChange={(e) => setHeader({ validadeDias: parseInt(e.target.value) || 0 })}
                                    onBlur={(e) => setHeader({ validadeDias: parseInt(e.target.value) || 0 })}
                                    className="bg-zinc-950 border-zinc-800 focus:border-orange-500 text-white font-bold"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Coluna Central: Itens do Projeto */}
                <div className="col-span-12 space-y-6">
                    <div className="flex justify-between items-center px-2">
                        <h2 className="text-xl font-black flex items-center gap-2 italic">
                            <Layers className="w-5 h-5 text-orange-500" /> ITENS DO PROJETO
                        </h2>
                        
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500">
                                <Search className="w-4 h-4" />
                            </div>
                            <input 
                                type="text"
                                placeholder="BUSCAR SKU DE ENGENHARIA..."
                                className="bg-zinc-900 border border-zinc-800 rounded-full pl-11 pr-4 py-2.5 text-xs w-96 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all font-bold placeholder:text-zinc-700"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            
                            {searchTerm && (
                                <div className="absolute top-full right-0 mt-3 w-full bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl z-[100] overflow-hidden backdrop-blur-xl bg-zinc-950/90 max-h-[400px] overflow-y-auto">
                                    {skus.length === 0 ? (
                                        <div className="p-8 text-center text-zinc-500 text-xs italic">Nenhum SKU encontrado para "{searchTerm}"</div>
                                    ) : skus.map(sku => (
                                        <button 
                                            key={`${sku.origem}-${sku.id}`}
                                            className="w-full text-left px-5 py-4 hover:bg-orange-600 transition-all flex justify-between items-center border-b border-zinc-900 group"
                                            onClick={() => {
                                                addItem(sku.id, 1);
                                                setSearchTerm('');
                                            }}
                                        >
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${sku.origem === 'MODULO' ? 'bg-orange-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                                                        {sku.origem}
                                                    </span>
                                                    <span className="text-sm font-bold text-white group-hover:text-black transition-colors">{sku.nome}</span>
                                                </div>
                                                <span className="text-[10px] text-zinc-500 group-hover:text-black/70 font-mono">{sku.codigo}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] font-bold text-zinc-600 group-hover:text-black/50 uppercase tracking-tighter">{sku.tipo}</span>
                                                <Plus className="w-4 h-4 text-orange-500 group-hover:text-black" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {!orcamento?.itens || orcamento.itens.length === 0 ? (
                        <div className="border-2 border-dashed border-zinc-900 rounded-3xl p-24 text-center bg-zinc-950/30">
                            <div className="bg-zinc-900 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-12">
                                <Layers className="w-10 h-10 text-zinc-700 -rotate-12" />
                            </div>
                            <p className="text-zinc-600 font-bold uppercase tracking-widest text-sm">O orçamento está vazio</p>
                            <p className="text-zinc-800 text-xs mt-2">Utilize a busca acima para adicionar módulos de engenharia.</p>
                        </div>
                    ) : (
                        orcamento.itens.map((item: any) => (
                            <div key={item.id} className="bg-zinc-950 border border-zinc-900 rounded-3xl overflow-hidden shadow-xl hover:border-orange-500/30 transition-all group">
                                <div className="p-6 flex items-center justify-between bg-zinc-900/20 group-hover:bg-zinc-900/40 transition-colors">
                                    <div className="flex items-center gap-6">
                                        <div className="w-12 h-12 rounded-2xl bg-orange-600/10 flex items-center justify-center text-orange-500 font-black text-xl italic shadow-inner">
                                            {item.skuEngenharia?.codigo?.slice(0, 3) || 'SKU'}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-white text-lg leading-tight uppercase italic">{item.skuEngenharia?.nome}</h3>
                                            <span className="text-[10px] uppercase text-zinc-600 font-black tracking-widest">{item.skuEngenharia?.codigo}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-12">
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] uppercase text-zinc-600 font-black tracking-widest mb-1">Qtd</span>
                                            <Input 
                                                type="number" 
                                                className="bg-zinc-900 border-zinc-800 rounded-lg h-10 w-20 text-center font-black text-orange-500" 
                                                value={item.quantidade}
                                                // onChange={(e) => updateItemQuantity(item.id, Number(e.target.value))}
                                            />
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] uppercase text-zinc-600 font-black tracking-widest mb-1 block">Custo Unitário</span>
                                            <span className="text-lg font-black text-white italic">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.custoUnitarioCalculado)}
                                            </span>
                                        </div>
                                        <div className="flex gap-3">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800"
                                                onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                                            >
                                                {expandedItem === item.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-red-950 hover:text-red-500 hover:border-red-900 transition-all"
                                                onClick={() => removeItem(item.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {expandedItem === item.id && (
                                    <div className="p-8 border-t border-zinc-900 bg-black/60 animate-in slide-in-from-top-4 duration-300">
                                        <div className="flex items-center gap-2 mb-6 text-[10px] uppercase tracking-[0.3em] font-black text-orange-500">
                                            <Calculator className="w-4 h-4" /> Explosão de Materiais Detalhada
                                        </div>
                                        <ListaExplodidaGrid 
                                            itemId={item.id} 
                                            data={item.listaExplodida} 
                                            onUpdate={(bomId, qtd) => updateItemExplosion(bomId, qtd)}
                                        />
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Rodapé com Resumo Financeiro Real-Time */}
            <ResumoFinanceiro resumo={{
                custoTotal: Number(orcamento?.valorTotalCusto || 0),
                vendaTotal: Number(orcamento?.valorTotalVenda || 0),
                margemReal: Number(orcamento?.valorTotalVenda || 0) - Number(orcamento?.valorTotalCusto || 0)
            }} />

            <ImportacaoModal 
                isOpen={isImportModalOpen} 
                onClose={() => setIsImportModalOpen(false)} 
                onAddItems={(items) => importItems(items)}
            />
        </div>
    );
}
