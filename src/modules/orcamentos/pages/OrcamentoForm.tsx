import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from '@/design-system/components';
import { 
    Calculator, FileText, Upload, Plus, Trash2, 
    ChevronDown, ChevronUp, Layers, CheckCircle2, FileDown, Search
} from 'lucide-react';
import { useOrcamento } from '../hooks/useOrcamento';
import { ListaExplodidaGrid } from '../components/ListaExplodidaGrid';
import { ImportacaoModal } from '../components/ImportacaoModal';
import { ResumoFinanceiro } from '../components/ResumoFinanceiro';
import { exportBudgetToPDF } from '../services/export-pdf';
import { api } from '@/lib/api';

export default function OrcamentoForm() {
    const { 
        header, setHeader, itens, addItem, removeItem, 
        updateItemQuantity, resumo, salvarOrcamento 
    } = useOrcamento();
    
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [expandedItem, setExpandedItem] = useState<string | null>(null);
    const [clients, setClients] = useState<any[]>([]);
    const [skus, setSkus] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        // Carregar Clientes e SKUs de Engenharia
        api.clients.list().then(setClients).catch(console.error);
        api.engineering.list().then(setSkus).catch(console.error);
    }, []);

    const handleSave = async () => {
        if (!header.clienteId) {
            alert('Por favor, selecione um cliente.');
            return;
        }
        if (itens.length === 0) {
            alert('Adicione pelo menos um item ao orçamento.');
            return;
        }

        setIsSaving(true);
        try {
            const result = await salvarOrcamento();
            alert(`Orçamento ${result.numeroOrcamento} salvo com sucesso!`);
        } catch (err: any) {
            alert('Erro ao salvar: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddSku = (sku: any) => {
        addItem(sku.id, sku.nome, sku.codigo || sku.sku);
        setSearchTerm('');
    };

    return (
        <div className="min-h-screen bg-black text-white p-8 pb-32">
            {/* Header Sticky */}
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-white flex items-center gap-3">
                        Novo Orçamento Profissional
                    </h1>
                    <p className="text-zinc-500 mt-2 text-lg">Precificação avançada baseada em BOM e Engenharia.</p>
                </div>
                <div className="flex gap-4">
                    <Button variant="outline" className="border-zinc-800 hover:bg-zinc-900" onClick={() => exportBudgetToPDF({ header, itens, resumo })}>
                        <FileDown className="w-4 h-4 mr-2" /> Exportar PDF
                    </Button>
                    <Button variant="outline" className="border-zinc-800 hover:bg-zinc-900" onClick={() => setIsImportModalOpen(true)}>
                        <Upload className="w-4 h-4 mr-2" /> Importar Projeto
                    </Button>
                    <Button 
                        className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-8 shadow-lg shadow-orange-900/20"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        <CheckCircle2 className="w-4 h-4 mr-2" /> {isSaving ? 'Salvando...' : 'Salvar Orçamento'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-8">
                {/* Coluna Esquerda: Dados Gerais */}
                <div className="col-span-12">
                    <Card className="bg-zinc-950 border-zinc-900 shadow-2xl">
                        <CardHeader className="border-b border-zinc-900/50 py-4">
                            <CardTitle className="text-sm uppercase tracking-widest text-orange-500 flex items-center gap-2">
                                <FileText className="w-4 h-4" /> Informações Gerais
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-4 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-zinc-500">Cliente</label>
                                    <select 
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all appearance-none"
                                        value={header.clienteId}
                                        onChange={(e) => setHeader({ clienteId: e.target.value })}
                                    >
                                        <option value="">Selecione um cliente...</option>
                                        {clients.map(c => (
                                            <option key={c.id} value={c.id}>{c.nome}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-zinc-500">Validade (Dias)</label>
                                    <Input 
                                        type="number" 
                                        className="bg-zinc-900 border-zinc-800" 
                                        value={header.validadeDias}
                                        onChange={(e) => setHeader({ validadeDias: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-zinc-500">Margem de Lucro (%)</label>
                                    <Input 
                                        type="number" 
                                        className="bg-zinc-900 border-zinc-800 text-orange-500 font-bold" 
                                        value={header.margemLucroPercentual}
                                        onChange={(e) => setHeader({ margemLucroPercentual: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-zinc-500">Taxa Financeira (%)</label>
                                    <Input 
                                        type="number" 
                                        className="bg-zinc-900 border-zinc-800" 
                                        value={header.taxaFinanceiraPercentual}
                                        onChange={(e) => setHeader({ taxaFinanceiraPercentual: e.target.value })}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Coluna Central: Itens do Projeto */}
                <div className="col-span-12 space-y-6">
                    <div className="flex justify-between items-center px-2">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Layers className="w-5 h-5 text-orange-500" /> Itens do Projeto
                        </h2>
                        
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                                <Search className="w-4 h-4" />
                            </div>
                            <input 
                                type="text"
                                placeholder="Buscar SKU de Engenharia..."
                                className="bg-zinc-900 border border-zinc-800 rounded-full pl-10 pr-4 py-2 text-sm w-80 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            
                                {searchTerm && (
                                    <div className="absolute top-full right-0 mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-[100] overflow-hidden">
                                        {skus.filter(s => s.nome.toLowerCase().includes(searchTerm.toLowerCase())).map(sku => (
                                            <button 
                                                key={sku.id}
                                                className="w-full text-left px-4 py-3 hover:bg-orange-600 transition-colors flex justify-between items-center border-b border-zinc-800 last:border-0"
                                                onClick={() => handleAddSku(sku)}
                                            >
                                                <div>
                                                    <div className="font-bold">{sku.nome}</div>
                                                    <div className="text-[10px] text-zinc-400 uppercase">{sku.codigo_modelo || sku.codigo || sku.sku}</div>
                                                </div>
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                        </div>
                    </div>

                    {itens.length === 0 ? (
                        <div className="border-2 border-dashed border-zinc-800 rounded-2xl p-20 text-center">
                            <div className="bg-zinc-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Layers className="w-8 h-8 text-zinc-700" />
                            </div>
                            <p className="text-zinc-500 font-medium">Nenhum item adicionado. Utilize a busca acima para adicionar SKUs.</p>
                        </div>
                    ) : (
                        itens.map((item: any) => (
                            <div key={item.id} className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden shadow-lg hover:border-zinc-700 transition-all">
                                <div className="p-5 flex items-center justify-between bg-zinc-900/30">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-orange-600/10 flex items-center justify-center text-orange-500 font-bold">#</div>
                                        <div>
                                            <h3 className="font-bold text-white leading-tight">{item.nome}</h3>
                                            <span className="text-[10px] uppercase text-zinc-500 font-bold">{item.codigo}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-8">
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] uppercase text-zinc-500 font-bold">Quantidade</span>
                                            <input 
                                                type="number" 
                                                className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 w-16 text-center font-bold" 
                                                value={item.quantidade}
                                                onChange={(e) => updateItemQuantity(item.id, Number(e.target.value))}
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="text-zinc-500 hover:text-white"
                                                onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                                            >
                                                {expandedItem === item.id ? <ChevronUp /> : <ChevronDown />}
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="text-zinc-500 hover:text-red-500"
                                                onClick={() => removeItem(item.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {expandedItem === item.id && (
                                    <div className="p-5 border-t border-zinc-900 bg-black/40">
                                        <div className="flex items-center gap-2 mb-4 text-[10px] uppercase tracking-widest font-black text-orange-500/70">
                                            <Calculator className="w-3 h-3" /> Explosão de Materiais (BOM)
                                        </div>
                                        <ListaExplodidaGrid itemId={item.id} data={item.listaExplodida} />
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Rodapé com Resumo Financeiro Real-Time */}
            <ResumoFinanceiro resumo={resumo} />

            <ImportacaoModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} />
        </div>
    );
}
