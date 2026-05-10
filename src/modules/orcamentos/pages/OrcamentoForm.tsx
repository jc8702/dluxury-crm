import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from '@/design-system/components';
import { 
    Calculator, FileText, Upload, Plus, Trash2, 
    ChevronDown, ChevronUp, Layers, CheckCircle2, FileDown, Search, ArrowLeft
} from 'lucide-react';
import { useOrcamento } from '../hooks/useOrcamento';
import { ListaExplodidaGrid } from '../components/ListaExplodidaGrid';
import { ImportarProjeto } from '../components/ImportarProjeto';
import { ResumoFinanceiro } from '../components/ResumoFinanceiro';
import { ModalEnviarCliente } from '../components/ModalEnviarCliente';
import { exportBudgetToPDF } from '../services/export-pdf';
import { api } from '@/lib/api';
import { debounce } from 'lodash';
import { SKUAutocomplete } from '@/modules/orcamentos/components/SKUAutocomplete';
import { Info } from 'lucide-react';

export default function OrcamentoForm() {
    // Pegar ID da URL se existir (Simulando roteamento)
    const urlParams = new URLSearchParams(window.location.search);
    const orcamentoId = urlParams.get('id');

    const { 
        orcamento, loading, inicializar, setHeader, addItem, 
        importItems, updateItem, removerItem, updateItemExplosion, updateItemSku, error 
    } = useOrcamento(orcamentoId || undefined);
    
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isSendModalOpen, setIsSendModalOpen] = useState(false);
    const [expandedItem, setExpandedItem] = useState<string | null>(null);
    const [clients, setClients] = useState<any[]>([]);
    const [skus, setSkus] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [orcamentosRecentes, setOrcamentosRecentes] = useState<any[]>([]);

    // Estados locais para campos comerciais (Debounce / Blur)
    const [localComercial, setLocalComercial] = useState({
        margemLucroPercentual: 0,
        taxaFinanceiraPercentual: 0,
        validadeDias: 0,
        clienteId: ''
    });

    useEffect(() => {
        if (orcamento) {
            setLocalComercial({
                margemLucroPercentual: Number(orcamento.margemLucroPercentual),
                taxaFinanceiraPercentual: Number(orcamento.taxaFinanceiraPercentual),
                validadeDias: Number(orcamento.validadeDias),
                clienteId: orcamento.clienteId || ''
            });
        }
    }, [orcamento]);

    useEffect(() => {
        api.clients.list().then(setClients).catch(console.error);
        api.engineering.list().then(setSkus).catch(console.error);
        
        // Carregar orçamentos recentes
        fetch('/api/orcamentos-pro')
            .then(res => res.json())
            .then(res => {
                if (res.success) setOrcamentosRecentes(res.data);
            })
            .catch(console.error);

        // Abrir modal de importação se vier do fluxo "Criar e Importar"
        const isImporting = urlParams.get('import') === 'true';
        if (isImporting && orcamentoId) {
            setIsImportModalOpen(true);
            // Limpar o flag da URL sem reload
            const newUrl = window.location.pathname + window.location.hash;
            const cleanUrl = orcamentoId ? `${newUrl}?id=${orcamentoId}` : newUrl;
            window.history.replaceState({}, '', cleanUrl);
        }
    }, [orcamentoId]);

    // Busca de SKU reativa (Debounced)
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

    const handleUpdateHeader = async (updates: any) => {
        await setHeader(updates);
    };

    const handleCreateDraft = async () => {
        try {
            const res = await inicializar({ 
                clienteId: null, 
                margemLucroPercentual: 30,
                validadeDias: 15
            });
            window.location.href = `?id=${res.id}#/orcamentos`;
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
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
                <div className="bg-red-500/10 p-6 rounded-2xl mb-6">
                    <span className="text-red-500 text-5xl">⚠️</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Erro ao carregar orçamento</h2>
                <p className="text-zinc-400 mb-8 max-w-md">{error}</p>
                <div className="flex gap-4">
                    <button 
                        onClick={() => window.location.href = '#/orcamentos'}
                        className="px-6 py-3 bg-zinc-800 text-white rounded-xl hover:bg-zinc-700 transition-all"
                    >
                        Voltar para Lista
                    </button>
                    <button 
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-all font-bold"
                    >
                        Tentar Novamente
                    </button>
                </div>
            </div>
        );
    }

    const handleCreateAndImport = async () => {
        try {
            const res = await inicializar({ 
                clienteId: null, 
                margemLucroPercentual: 30,
                validadeDias: 15
            });
            window.location.href = `?id=${res.id}&import=true#/orcamentos`;
        } catch (err) {
            alert('Erro ao criar rascunho');
        }
    };

    // Renderizar lista de orçamentos (utilizado tanto no estado limpo quanto no rodapé)
    const renderListaRecentes = () => (
        <Card className="bg-zinc-950 border-zinc-900 shadow-2xl overflow-hidden mt-12">
            <CardHeader className="bg-zinc-900/50 border-b border-zinc-900/50 py-4 px-6 flex flex-row items-center justify-between">
                <CardTitle className="text-xs uppercase tracking-[0.3em] text-zinc-400 flex items-center gap-3 font-black">
                    <FileText className="w-4 h-4 text-orange-500" /> Orçamentos Recentes
                </CardTitle>
                <span className="text-[10px] font-bold text-zinc-600 bg-black px-3 py-1 rounded-full border border-zinc-900">
                    {orcamentosRecentes.length} TOTAL
                </span>
            </CardHeader>
            <CardContent className="p-0">
                {orcamentosRecentes.length === 0 ? (
                    <div className="p-12 text-center text-zinc-600 italic text-sm">
                        Nenhum orçamento salvo ainda.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-zinc-900 bg-zinc-900/20">
                                    <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Número</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Cliente</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Itens</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Total Venda</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orcamentosRecentes.map((orc: any) => (
                                    <tr key={orc.id} className="border-b border-zinc-900 hover:bg-orange-600/5 transition-colors group">
                                        <td className="px-6 py-4 font-black text-white italic group-hover:text-orange-500 transition-colors">
                                            {orc.numeroOrcamento}
                                        </td>
                                        <td className="px-6 py-4 text-zinc-400 text-sm">
                                            {clients.find(c => c.id === orc.clienteId)?.nome || 'Cliente não definido'}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="bg-zinc-900 text-zinc-500 text-[10px] font-black px-2 py-1 rounded border border-zinc-800">
                                                {orc.itens?.length || 0}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-white">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orc.valorTotalVenda)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] font-black px-2 py-1 rounded uppercase ${
                                                orc.status === 'APROVADO' ? 'bg-green-500/20 text-green-500' : 
                                                orc.status === 'RASCUNHO' ? 'bg-zinc-800 text-zinc-500' : 'bg-orange-500/20 text-orange-500'
                                            }`}>
                                                {orc.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="bg-zinc-900 border border-zinc-800 hover:bg-orange-600 hover:text-white"
                                                onClick={() => {
                                                    window.location.href = `?id=${orc.id}#/orcamentos`;
                                                }}
                                            >
                                                Editar
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    );

    if (!orcamentoId && !orcamento) {
        return (
            <div className="min-h-screen bg-black text-white p-8">
                <div className="max-w-6xl mx-auto space-y-8">
                    <div className="flex justify-between items-end">
                        <div>
                            <h1 className="text-4xl font-black italic tracking-tighter text-white">
                                ORÇAMENTOS <span className="text-orange-500">PRO</span>
                            </h1>
                            <p className="text-zinc-500 mt-2 font-medium">Gestão de orçamentos industriais e cálculos de engenharia.</p>
                        </div>
                        <div className="flex gap-4">
                            <Button 
                                variant="outline"
                                className="border-zinc-800 hover:bg-zinc-900 h-14 px-8 text-lg font-bold"
                                onClick={handleCreateDraft}
                            >
                                <Plus className="w-5 h-5 mr-2" /> Novo Vazio
                            </Button>
                            <Button 
                                className="bg-orange-600 hover:bg-orange-700 text-white font-black h-14 px-10 text-lg shadow-xl shadow-orange-900/20"
                                onClick={handleCreateAndImport}
                            >
                                <Upload className="w-5 h-5 mr-2" /> Importar Projeto
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                        <Card className="bg-zinc-950 border-zinc-900 p-6">
                            <div className="text-zinc-600 text-[10px] font-black uppercase tracking-widest mb-2">Total de Orçamentos</div>
                            <div className="text-4xl font-black italic">{orcamentosRecentes.length}</div>
                        </Card>
                        <Card className="bg-zinc-950 border-zinc-900 p-6 border-l-orange-500 border-l-4">
                            <div className="text-zinc-600 text-[10px] font-black uppercase tracking-widest mb-2">Aguardando Aprovação</div>
                            <div className="text-4xl font-black italic text-orange-500">
                                {orcamentosRecentes.filter(o => o.status === 'RASCUNHO' || o.status === 'ENVIADO').length}
                            </div>
                        </Card>
                        <Card className="bg-zinc-950 border-zinc-900 p-6 border-l-green-500 border-l-4">
                            <div className="text-zinc-600 text-[10px] font-black uppercase tracking-widest mb-2">Aprovados este Mês</div>
                            <div className="text-4xl font-black italic text-green-500">
                                {orcamentosRecentes.filter(o => o.status === 'APROVADO').length}
                            </div>
                        </Card>
                    </div>

                    {renderListaRecentes()}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-8 pb-32">
            {/* Header Sticky */}
            <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-6">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="bg-zinc-900 border border-zinc-800 rounded-xl" 
                        onClick={() => {
                            window.location.href = `#/orcamentos`;
                        }}
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
                            Orçamento <span className="text-orange-500">{orcamento?.numeroOrcamento || '...'}</span>
                        </h1>
                        <p className="text-zinc-500 text-sm mt-1">Status: <span className="text-orange-500 font-bold uppercase">{orcamento?.status || 'CARREGANDO'}</span></p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <Button 
                        variant="outline" 
                        className="border-zinc-800 hover:bg-zinc-900" 
                        onClick={() => window.open(`/api/orcamentos/export-pdf?id=${orcamentoId}`, '_blank')}
                    >
                        <FileDown className="w-4 h-4 mr-2" /> Exportar PDF
                    </Button>
                    <Button variant="outline" className="border-zinc-800 hover:bg-zinc-900" onClick={() => setIsImportModalOpen(true)}>
                        <Upload className="w-4 h-4 mr-2" /> Importar Projeto
                    </Button>
                    <Button 
                        className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-8 shadow-lg shadow-orange-900/20"
                        onClick={() => setIsSendModalOpen(true)}
                    >
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
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all appearance-none font-bold"
                                        value={localComercial.clienteId}
                                        onChange={(e) => {
                                            setLocalComercial({ ...localComercial, clienteId: e.target.value });
                                            handleUpdateHeader({ clienteId: e.target.value });
                                        }}
                                    >
                                        <option value="">Selecione um cliente...</option>
                                        {clients.map(c => (
                                            <option key={c.id} value={c.id}>{c.nome}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-zinc-600">Margem de Lucro (%)</label>
                                    <Input 
                                        type="number"
                                        className="bg-zinc-950 border-zinc-800 focus:border-orange-500 text-white font-black text-xl"
                                        value={localComercial.margemLucroPercentual}
                                        onChange={(e) => setLocalComercial({ ...localComercial, margemLucroPercentual: parseFloat(e.target.value) || 0 })}
                                        onBlur={() => handleUpdateHeader({ margemLucroPercentual: localComercial.margemLucroPercentual })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-zinc-600">Taxa Financeira (%)</label>
                                    <Input 
                                        type="number"
                                        className="bg-zinc-950 border-zinc-800 focus:border-orange-500 text-white font-black text-xl"
                                        value={localComercial.taxaFinanceiraPercentual}
                                        onChange={(e) => setLocalComercial({ ...localComercial, taxaFinanceiraPercentual: parseFloat(e.target.value) || 0 })}
                                        onBlur={() => handleUpdateHeader({ taxaFinanceiraPercentual: localComercial.taxaFinanceiraPercentual })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-zinc-600">Validade (Dias)</label>
                                    <Input 
                                        type="number"
                                        className="bg-zinc-950 border-zinc-800 focus:border-orange-500 text-white font-black text-xl"
                                        value={localComercial.validadeDias}
                                        onChange={(e) => setLocalComercial({ ...localComercial, validadeDias: parseInt(e.target.value) || 0 })}
                                        onBlur={() => handleUpdateHeader({ validadeDias: localComercial.validadeDias })}
                                    />
                                </div>
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
                                <div className="p-6 flex flex-col gap-6 bg-zinc-900/20 group-hover:bg-zinc-900/40 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-6">
                                            <div className="w-12 h-12 rounded-2xl bg-orange-600/10 flex items-center justify-center text-orange-500 font-black text-xl italic shadow-inner">
                                                {item.skuEngenharia?.codigo?.slice(0, 3) || item.listaExplodida?.[0]?.componente?.codigo?.slice(0, 3) || item.material?.slice(0, 3) || 'ITM'}
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <input 
                                                    className="bg-transparent border-none text-white text-lg font-black uppercase italic outline-none focus:ring-0 w-[400px]"
                                                    value={item.nomeCustomizado || item.skuEngenharia?.nome || ''}
                                                    onChange={(e) => updateItem(item.id, { nomeCustomizado: e.target.value })}
                                                    onBlur={(e) => updateItem(item.id, { nomeCustomizado: e.target.value })}
                                                    placeholder="NOME DO ITEM"
                                                />
                                                <span className="text-[10px] uppercase text-zinc-600 font-black tracking-widest flex items-center gap-2">
                                                    {item.skuEngenharia?.codigo || item.listaExplodida?.[0]?.componente?.codigo || item.material || 'ITEM IMPORTADO / AVULSO'}
                                                    
                                                    {/* DESCRIÇÃO DO SKU SELECIONADO */}
                                                    {(item.skuEngenharia?.nome || item.listaExplodida?.[0]?.componente?.nome) && (
                                                        <span className="text-[10px] text-orange-500 font-bold italic normal-case border-l border-zinc-800 pl-2">
                                                            {item.skuEngenharia?.nome || item.listaExplodida?.[0]?.componente?.nome}
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6">
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
                                                    onClick={() => removerItem(item.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Grid de Edição Direta */}
                                    <div className="grid grid-cols-6 gap-4 p-4 bg-black/40 rounded-2xl border border-zinc-900">
                                        <div className="space-y-1">
                                            <label className="text-[9px] uppercase font-black text-zinc-600 ml-1">Qtd</label>
                                            <Input 
                                                type="number" 
                                                className="bg-zinc-900 border-zinc-800 h-10 font-black text-orange-500 text-center" 
                                                value={item.quantidade}
                                                onChange={(e) => updateItem(item.id, { quantidade: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] uppercase font-black text-zinc-600 ml-1">Largura (cm)</label>
                                            <Input 
                                                className="bg-zinc-900 border-zinc-800 h-10 font-bold text-white text-center" 
                                                value={item.largura || ''}
                                                onChange={(e) => updateItem(item.id, { largura: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] uppercase font-black text-zinc-600 ml-1">Altura (cm)</label>
                                            <Input 
                                                className="bg-zinc-900 border-zinc-800 h-10 font-bold text-white text-center" 
                                                value={item.altura || ''}
                                                onChange={(e) => updateItem(item.id, { altura: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] uppercase font-black text-zinc-600 ml-1">Esp (mm)</label>
                                            <Input 
                                                className="bg-zinc-900 border-zinc-800 h-10 font-bold text-white text-center" 
                                                value={item.espessura || ''}
                                                onChange={(e) => updateItem(item.id, { espessura: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-span-2 space-y-1">
                                            <label className="text-[9px] uppercase font-black text-zinc-600 ml-1">SKU / Material</label>
                                            <SKUAutocomplete 
                                                value={item.material || ''}
                                                onSelect={(sku) => updateItemSku(item.id, sku.id, sku.tipo)}
                                                placeholder="Busque por código ou nome..."
                                            />
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

            {/* Lista de Orçamentos Recentes (Rodapé) */}
            <div className="max-w-6xl mx-auto mt-20">
                {renderListaRecentes()}
            </div>

            <ImportarProjeto 
                isOpen={isImportModalOpen} 
                onClose={() => setIsImportModalOpen(false)} 
                onAddItems={(items) => importItems(items)}
                orcamentoId={orcamentoId || ''}
            />

            <ModalEnviarCliente 
                isOpen={isSendModalOpen}
                onClose={() => setIsSendModalOpen(false)}
                orcamento={orcamento}
                onSave={async () => {
                    await handleUpdateHeader(localComercial);
                }}
            />
        </div>
    );
}
