import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/design-system/components';
import DataTable from '@/components/ui/DataTable';
import { 
    FileText, Upload, Plus, Trash2, 
    Layers, CheckCircle2, FileDown, Search, ArrowLeft, Save, Pencil
} from 'lucide-react';
import { useOrcamento } from '../hooks/useOrcamento';
import { ImportarProjeto } from '../components/ImportarProjeto';
import { ModalEnviarCliente } from '../components/ModalEnviarCliente';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { ItemCard } from '../components/ItemCard';
import ContratoDigitalModal from '@/components/contrato/ContratoDigitalModal';
import { exportBudgetToPDF } from '../services/export-pdf';

export default function OrcamentoForm() {
    const { error: toastError, success: toastSuccess } = useToast();
    // Pegar ID da URL se existir (Simulando roteamento)
    const urlParams = new URLSearchParams(window.location.search);
    const orcamentoId = urlParams.get('id');

    const { 
        orcamento, loading, inicializar, setHeader, addItem, 
        importItems, updateItem, removerItem,
        applyGlobalMargin, deletarOrcamento, error, carregar 
    } = useOrcamento(orcamentoId || undefined);
    
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isSendModalOpen, setIsSendModalOpen] = useState(false);
    const [isContractModalOpen, setIsContractModalOpen] = useState(false);
    const [isEditingAll, setIsEditingAll] = useState<boolean | undefined>(undefined);
    const [clients, setClients] = useState<any[]>([]);
    const [skus, setSkus] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [, setSelectedItems] = useState<string[]>([]);
    const [, setIsBulkBarOpen] = useState(false);
    const [orcamentosRecentes, setOrcamentosRecentes] = useState<any[]>([]);

    const [localComercial, setLocalComercial] = useState({
        margemLucroPercentual: 0,
        taxaFinanceiraPercentual: 0,
        validadeDias: 0,
        clienteId: ''
    });

    const [pagination, setPagination] = useState({
        page: 1,
        total: 0,
        pages: 1,
        limit: 10
    });
    const [searchQuery, setSearchQuery] = useState('');

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

    const fetchRecentes = useCallback(async () => {
        try {
            const res = await fetch(`/api/orcamentos-pro?page=${pagination.page}&limit=${pagination.limit}&q=${searchQuery}`);
            const result = await res.json();
            if (result.success) {
                setOrcamentosRecentes(result.data);
                setPagination(result.pagination);
            }
        } catch (err) {
            console.error('Erro ao carregar orçamentos:', err);
        }
    }, [pagination.page, pagination.limit, searchQuery]);

    useEffect(() => {
        api.clients.list().then(setClients).catch(console.error);
        api.engineering.list().then(setSkus).catch(console.error);
        
        fetchRecentes();

        // Abrir modal de importação se vier do fluxo "Criar e Importar"
        const isImporting = urlParams.get('import') === 'true';
        if (isImporting && orcamentoId) {
            setIsImportModalOpen(true);
            // Limpar o flag da URL sem reload
            const newUrl = window.location.pathname + window.location.hash;
            const cleanUrl = orcamentoId ? `${newUrl}?id=${orcamentoId}` : newUrl;
            window.history.replaceState({}, '', cleanUrl);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orcamentoId]);

    // Atalho ESC para fechar barra de ações
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSelectedItems([]);
                setIsBulkBarOpen(false);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

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
        fetchRecentes();
    };

    const handleCreateDraft = async () => {
        try {
            const res = await inicializar({ 
                clienteId: null, 
                margemLucroPercentual: 30,
                validadeDias: 15
            });
            window.location.href = `?id=${res.id}#/orcamentos`;
        } catch (_err) {
            toastError('Erro ao criar rascunho');
        }
    };

    if (loading && !orcamento) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="text-muted-foreground font-bold animate-pulse">Sincronizando com o Servidor...</p>
            </div>
        );
    }

    if (error && !orcamento) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
                <div className="bg-red-500/10 p-6 rounded-2xl mb-6">
                    <span className="text-red-500 text-5xl">⚠️</span>
                    <h2 className="text-2xl font-bold text-foreground mb-2">Erro ao carregar orçamento</h2>
                    <p className="text-muted-foreground mb-8 max-w-md">{error}</p>
                    <div className="flex gap-4">
                        <button 
                            onClick={() => window.location.href = '#/orcamentos'}
                            className="px-6 py-3 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 transition-all cursor-pointer"
                        >
                            Voltar para Lista
                        </button>
                        <button 
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover transition-all font-bold cursor-pointer"
                        >
                            Tentar Novamente
                        </button>
                    </div>
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
        } catch (_err) {
            window.location.href = `?id=${res.id}&import=true#/orcamentos`;
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Deseja realmente excluir este orçamento?')) return;
        try {
            const success = await deletarOrcamento(id);
            if (success) {
                toastSuccess('Orçamento excluído com sucesso');
                fetchRecentes();
            }
        } catch (_err) {
            toastError('Erro ao excluir orçamento');
        }
    };

    // Renderizar lista de orçamentos (utilizado tanto no estado limpo quanto no rodapé)
    const renderListaRecentes = () => (
        <Card className="bg-card border-border shadow-2xl overflow-hidden mt-12">
            <CardHeader className="bg-muted/40 border-b border-border py-4 px-6 flex flex-row items-center justify-between">
                <div className="flex items-center gap-6">
                    <CardTitle className="text-xs uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-3 font-black">
                        <FileText className="w-4 h-4 text-primary" /> Orçamentos Recentes
                    </CardTitle>
                    <div className="relative">
                        <Search className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input 
                            type="text"
                            placeholder="BUSCAR NÚMERO..."
                            className="rounded-full pl-8 pr-4 h-8 text-[10px] w-48 font-bold bg-background border-border"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            disabled={pagination.page === 1}
                            onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                            className="bg-muted border border-border text-[10px] h-8 w-8 p-0 text-foreground hover:bg-muted/80"
                        >
                            {'<'}
                        </Button>
                        <span className="text-[10px] font-bold text-muted-foreground">PÁGINA {pagination.page} DE {pagination.pages}</span>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            disabled={pagination.page === pagination.pages}
                            onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                            className="bg-muted border border-border text-[10px] h-8 w-8 p-0 text-foreground hover:bg-muted/80"
                        >
                            {'>'}
                        </Button>
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground bg-background px-3 py-1 rounded-full border border-border">
                        {pagination.total} TOTAL
                    </span>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {orcamentosRecentes.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground italic text-sm">
                        Nenhum orçamento encontrado.
                    </div>
                ) : (
                    <div className="overflow-x-auto p-4">
                        <DataTable
                            headers={['Número', 'Cliente', 'Itens', 'Total Venda', 'Status', 'Ações']}
                            data={orcamentosRecentes}
                            renderRow={(orc: any) => (
                                <>
                                    <td className="px-6 py-4 font-black text-foreground italic group-hover:text-primary transition-colors cursor-pointer" onClick={() => window.location.href = `?id=${orc.id}#/orcamentos`}>
                                        {orc.numeroOrcamento}
                                    </td>
                                    <td className="px-6 py-4 text-muted-foreground text-sm cursor-pointer" onClick={() => window.location.href = `?id=${orc.id}#/orcamentos`}>
                                        {clients.find(c => c.id === orc.clienteId)?.nome || 'Cliente não definido'}
                                    </td>
                                    <td className="px-6 py-4 text-center cursor-pointer" onClick={() => window.location.href = `?id=${orc.id}#/orcamentos`}>
                                        <span className="bg-muted text-muted-foreground text-[10px] font-black px-2 py-1 rounded border border-border">
                                            {orc.itens?.length || 0}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-foreground cursor-pointer" onClick={() => window.location.href = `?id=${orc.id}#/orcamentos`}>
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orc.valorTotalVenda)}
                                    </td>
                                    <td className="px-6 py-4 cursor-pointer" onClick={() => window.location.href = `?id=${orc.id}#/orcamentos`}>
                                        <span className={`text-[10px] font-black px-2 py-1 rounded uppercase ${
                                            orc.status === 'APROVADO' ? 'bg-green-500/20 text-green-500' : 
                                            orc.status === 'RASCUNHO' ? 'bg-muted text-muted-foreground' : 'bg-primary/20 text-primary'
                                        }`}>
                                            {orc.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="bg-muted border border-border hover:bg-muted/80 text-red-500 p-2 cursor-pointer"
                                            onClick={(e) => handleDelete(orc.id, e)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="bg-muted border border-border hover:bg-primary hover:text-primary-foreground cursor-pointer"
                                            onClick={() => {
                                                window.location.href = `?id=${orc.id}#/orcamentos`;
                                            }}
                                        >
                                            Editar
                                        </Button>
                                    </td>
                                </>
                            )}
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    );

    if (!orcamentoId && !orcamento) {
        return (
            <div className="min-h-screen bg-background text-foreground p-8">
                <div className="max-w-6xl mx-auto space-y-8">
                    <div className="flex justify-between items-end">
                        <div>
                            <h1 className="text-4xl font-black italic tracking-tighter text-foreground">
                                ORÇAMENTOS <span className="text-primary">PRO</span>
                            </h1>
                            <p className="text-muted-foreground mt-2 font-medium">Gestão de orçamentos industriais e cálculos de engenharia.</p>
                        </div>
                        <div className="flex gap-4">
                            <Button 
                                variant="outline"
                                className="border-border hover:bg-muted h-14 px-8 text-lg font-bold text-foreground cursor-pointer"
                                onClick={handleCreateDraft}
                            >
                                <Plus className="w-5 h-5 mr-2" /> Novo Vazio
                            </Button>
                            <Button 
                                className="bg-primary hover:bg-primary-hover text-primary-foreground font-black h-14 px-10 text-lg shadow-xl cursor-pointer"
                                onClick={handleCreateAndImport}
                            >
                                <Upload className="w-5 h-5 mr-2" /> Importar Projeto
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                        <Card className="bg-card border-border p-6">
                            <div className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-2">Total de Orçamentos</div>
                            <div className="text-4xl font-black italic text-foreground">{orcamentosRecentes.length}</div>
                        </Card>
                        <Card className="bg-card border-border p-6 border-l-primary border-l-4">
                            <div className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-2">Aguardando Aprovação</div>
                            <div className="text-4xl font-black italic text-primary">
                                {orcamentosRecentes.filter(o => o.status === 'RASCUNHO' || o.status === 'ENVIADO').length}
                            </div>
                        </Card>
                        <Card className="bg-card border-border p-6 border-l-green-500 border-l-4">
                            <div className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-2">Aprovados este Mês</div>
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
        <div className="min-h-screen bg-background text-foreground p-8 pb-32">
            {/* Header Sticky */}
            <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-6">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="bg-muted border border-border rounded-xl text-foreground hover:bg-muted/80 cursor-pointer" 
                        onClick={() => {
                            window.location.href = `#/orcamentos`;
                        }}
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
                            Orçamento <span className="text-primary">{orcamento?.numeroOrcamento || '...'}</span>
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="text-muted-foreground text-sm">Status:</p>
                            <Select 
                                value={orcamento?.status || 'rascunho'}
                                onValueChange={(val) => handleUpdateHeader({ status: val })}
                            >
                                <SelectTrigger className="bg-muted border-border h-8 text-xs font-bold uppercase text-primary w-[140px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="rascunho">Rascunho</SelectItem>
                                    <SelectItem value="negociacao">Negociação</SelectItem>
                                    <SelectItem value="enviado">Enviado</SelectItem>
                                    <SelectItem value="fechada">Fechado</SelectItem>
                                    <SelectItem value="perdida">Perdida</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
                <div className="flex gap-4">
                    <Button 
                        variant="outline" 
                        className="border-border hover:bg-muted text-foreground cursor-pointer" 
                        onClick={() => window.open(`/api/orcamentos/export-pdf?id=${orcamento.id}`, '_blank')}
                    >
                        <FileDown className="w-4 h-4 mr-2" /> Exportar PDF
                    </Button>
                    <Button variant="outline" className="border-border hover:bg-muted text-foreground cursor-pointer" onClick={() => setIsImportModalOpen(true)}>
                        <Upload className="w-4 h-4 mr-2" /> Importar Projeto
                    </Button>
                    <Button 
                        variant="outline"
                        className="border-border hover:bg-muted text-foreground cursor-pointer"
                        onClick={() => setIsContractModalOpen(true)}
                    >
                        <FileText className="w-4 h-4 mr-2" /> Contrato & Assinatura
                    </Button>
                    <Button 
                        variant="outline"
                        className="border-border hover:bg-muted text-foreground cursor-pointer"
                        onClick={async () => {
                            await handleUpdateHeader({ status: 'rascunho' });
                            toastSuccess('Proposta salva como rascunho com sucesso!');
                        }}
                    >
                        <Save className="w-4 h-4 mr-2" /> Salvar Proposta
                    </Button>
                    <Button 
                        className="bg-primary hover:bg-primary-hover text-primary-foreground font-bold px-8 shadow-lg cursor-pointer"
                        onClick={() => setIsSendModalOpen(true)}
                    >
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Enviar para Cliente
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-8">
                {/* Coluna Esquerda: Dados Gerais */}
                <div className="col-span-12">
                    <Card className="bg-card border-border shadow-2xl overflow-hidden">
                        <CardHeader className="bg-muted/40 border-b border-border py-3">
                            <CardTitle className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 font-black">
                                <FileText className="w-3 h-3 text-primary" /> Configurações Comerciais
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-4 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Cliente</label>
                                    <Select 
                                        value={localComercial.clienteId}
                                        onValueChange={(val) => {
                                            setLocalComercial({ ...localComercial, clienteId: val });
                                            handleUpdateHeader({ clienteId: val });
                                        }}
                                    >
                                        <SelectTrigger className="w-full h-12 bg-background border-border text-foreground font-bold">
                                            <SelectValue placeholder="Selecione um cliente..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {clients.map(c => (
                                                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Margem de Lucro (%)</label>
                                    <div className="flex gap-2">
                                        <Input 
                                            type="number"
                                            className="bg-background border-border focus:border-primary text-foreground font-black text-xl flex-1 animate-none focus:outline-none"
                                            value={localComercial.margemLucroPercentual}
                                            onChange={(e) => setLocalComercial({ ...localComercial, margemLucroPercentual: parseFloat(e.target.value) || 0 })}
                                        />
                                        <Button 
                                            className="bg-primary hover:bg-primary-hover text-primary-foreground font-black text-[10px] uppercase h-12 px-4 cursor-pointer"
                                            onClick={async () => {
                                                try {
                                                    const res = await applyGlobalMargin(localComercial.margemLucroPercentual);
                                                    toastSuccess(res.message);
                                                } catch (err: any) {
                                                    toastError('Erro', err.message);
                                                }
                                            }}
                                        >
                                            Aplicar
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Taxa Financeira (%)</label>
                                    <Input 
                                        type="number"
                                        className="bg-background border-border focus:border-primary text-foreground font-black text-xl animate-none focus:outline-none"
                                        value={localComercial.taxaFinanceiraPercentual}
                                        onChange={(e) => setLocalComercial({ ...localComercial, taxaFinanceiraPercentual: parseFloat(e.target.value) || 0 })}
                                        onBlur={() => handleUpdateHeader({ taxaFinanceiraPercentual: localComercial.taxaFinanceiraPercentual })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Validade (Dias)</label>
                                    <Input 
                                        type="number"
                                        className="bg-background border-border focus:border-primary text-foreground font-black text-xl animate-none focus:outline-none"
                                        value={localComercial.validadeDias}
                                        onChange={(e) => setLocalComercial({ ...localComercial, validadeDias: parseInt(e.target.value) || 0 })}
                                        onBlur={() => handleUpdateHeader({ validadeDias: localComercial.validadeDias })}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="col-span-12 space-y-6">
                    <div className="flex justify-between items-center px-2">
                        <div className="flex items-center gap-4">
                            <h2 className="text-xl font-black flex items-center gap-2 italic">
                                <Layers className="w-5 h-5 text-orange-500" /> ITENS DO PROJETO
                            </h2>
                            {orcamento?.itens && orcamento.itens.length > 0 && (
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsEditingAll(true)}
                                        className="border-border hover:bg-muted text-foreground cursor-pointer text-xs h-9 px-3 font-bold flex items-center gap-1.5"
                                    >
                                        <Pencil className="w-3.5 h-3.5 text-primary" /> Editar Todos
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setIsEditingAll(false);
                                            toastSuccess('Alterações enviadas para gravação!');
                                            // Forçar atualização do rodapé de recentes após salvar todos
                                            setTimeout(() => fetchRecentes(), 1200);
                                        }}
                                        className="border-border hover:bg-muted text-foreground cursor-pointer text-xs h-9 px-3 font-bold flex items-center gap-1.5 bg-primary/10 border-primary/20 hover:bg-primary/20"
                                    >
                                        <Save className="w-3.5 h-3.5 text-primary" /> Salvar Todos
                                    </Button>
                                </div>
                            )}
                        </div>
                        
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                                <Search className="w-4 h-4" />
                            </div>
                            <Input 
                                type="text"
                                placeholder="BUSCAR SKU DE ENGENHARIA..."
                                className="bg-muted border-border rounded-full pl-11 pr-4 h-11 text-xs w-96 font-bold"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            
                            {searchTerm && (
                                <div className="absolute top-full right-0 mt-3 w-full bg-card border border-border rounded-2xl shadow-2xl z-[100] overflow-hidden backdrop-blur-xl bg-card/90 max-h-[400px] overflow-y-auto">
                                    {skus.length === 0 ? (
                                        <div className="p-8 text-center text-muted-foreground text-xs italic">Nenhum SKU encontrado para "{searchTerm}"</div>
                                    ) : skus.map(sku => (
                                        <button 
                                            key={`${sku.origem}-${sku.id}`}
                                            className="w-full text-left px-5 py-4 hover:bg-primary hover:text-primary-foreground transition-all flex justify-between items-center border-b border-border group cursor-pointer"
                                            onClick={() => {
                                                addItem(sku.id, 1);
                                                setSearchTerm('');
                                            }}
                                        >
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${sku.origem === 'MODULO' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                                        {sku.origem}
                                                    </span>
                                                    <span className="text-sm font-bold text-foreground group-hover:text-primary-foreground transition-colors">{sku.nome}</span>
                                                </div>
                                                <span className="text-[10px] text-muted-foreground group-hover:text-primary-foreground/75 font-mono">{sku.codigo}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] font-bold text-muted-foreground group-hover:text-primary-foreground/75 uppercase tracking-tighter">{sku.tipo}</span>
                                                <Plus className="w-4 h-4 text-primary group-hover:text-primary-foreground" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
 
                    {!orcamento?.itens || orcamento.itens.length === 0 ? (
                        <div className="border-2 border-dashed border-border rounded-3xl p-24 text-center bg-card/30">
                            <div className="bg-muted w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-12">
                                <Layers className="w-10 h-10 text-muted-foreground -rotate-12" />
                            </div>
                            <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm">O orçamento está vazio</p>
                            <p className="text-muted-foreground/80 text-xs mt-2">Utilize a busca acima para adicionar módulos de engenharia.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {orcamento.itens.map((item: any) => (
                                <ItemCard
                                    key={item.id}
                                    item={item}
                                    onUpdate={updateItem}
                                    onDelete={removerItem}
                                    isEditingExternal={isEditingAll}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Barra de Ações Removida */}

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

            {isContractModalOpen && orcamentoId && (
                <ContratoDigitalModal
                    orcamentoId={orcamentoId}
                    numeroOrcamento={orcamento?.numeroOrcamento || ''}
                    onClose={() => setIsContractModalOpen(false)}
                    onStatusChanged={() => {
                        carregar();
                    }}
                />
            )}
        </div>
    );
}
