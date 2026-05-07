import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
    Calculator, FileText, Upload, Plus, Trash2, 
    ChevronDown, ChevronUp, Layers, CheckCircle2, FileDown 
} from 'lucide-react';
import { useOrcamento } from '../hooks/useOrcamento';
import { ListaExplodidaGrid } from './ListaExplodidaGrid';
import { ImportacaoModal } from './ImportacaoModal';
import { exportBudgetToPDF } from '../services/export-pdf.js';

export function OrcamentoForm() {
    const { header, setHeader, itens, addItem, removeItem, resumo } = useOrcamento();
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [expandedItem, setExpandedItem] = useState<string | null>(null);

    const handleAddSKU = () => {
        // Simulação de adicionar SKU Engenharia
        const dummySKU = {
            id: Math.random().toString(36).substr(2, 9),
            skuEngenhariaId: 'eng-coz-001',
            codigo: 'ENG-COZ-001',
            nome: 'Armário Aéreo 3 Portas',
            quantidade: 1,
            listaExplodida: [
                { id: '1', nome: 'MDF Branco 15mm', quantidadeCalculada: 2.5, quantidadeAjustada: 2.5, custoUnitario: 45, origem: 'BOM' },
                { id: '2', nome: 'Dobradiça Slide', quantidadeCalculada: 6, quantidadeAjustada: 6, custoUnitario: 8.5, origem: 'BOM' }
            ]
        };
        addItem(dummySKU);
    };

    return (
        <div className="flex flex-col gap-6 p-6 pb-32 max-w-7xl mx-auto animate-in fade-in duration-500">
            {/* Título e Ações */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Novo Orçamento Profissional</h1>
                    <p className="text-muted-foreground">Precificação avançada baseada em BOM e Engenharia.</p>
                </div>
                <div className="flex gap-3">
                    <Button 
                        variant="outline" 
                        className="border-orange-500/50 text-orange-500 hover:bg-orange-500/10"
                        onClick={() => exportBudgetToPDF({
                            numeroOrcamento: 'PRO-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-0001',
                            cliente: { nome: 'D\'Luxury Ambientes LTDA', cidade: 'Gramado', uf: 'RS' },
                            itens: itens.map(i => ({ nome: i.nome, quantidade: i.quantidade, precoVenda: (i.listaExplodida.reduce((acc, comp) => acc + (comp.custoUnitario * comp.quantidadeAjustada), 0) * (1 + header.margemLucroPercentual/100)) })),
                            resumo: resumo,
                            condicoes: 'Pagamento: 50% entrada + 50% na montagem.\nPrazo de entrega: 45 dias úteis.\nGarantia: 5 anos estrutural.'
                        })}
                    >
                        <FileDown className="w-4 h-4 mr-2" /> Exportar PDF
                    </Button>
                    <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
                        <Upload className="w-4 h-4 mr-2" /> Importar Projeto
                    </Button>
                    <Button className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-900/20">
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Salvar Orçamento
                    </Button>
                </div>
            </div>

            {/* Cabeçalho */}
            <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
                <CardHeader className="pb-3 border-b border-zinc-800">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <FileText className="w-4 h-4 text-orange-500" /> Informações Gerais
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-6">
                    <div className="space-y-2">
                        <Label>Cliente</Label>
                        <select className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:ring-orange-500">
                            <option>Selecione um cliente...</option>
                            <option>D'Luxury Ambientes LTDA</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <Label>Nº Orçamento</Label>
                        <Input disabled placeholder="PRO-20260507-0001" className="bg-zinc-950 border-zinc-800" />
                    </div>
                    <div className="space-y-2">
                        <Label>Validade (Dias)</Label>
                        <Input type="number" defaultValue={15} className="bg-zinc-950 border-zinc-800" />
                    </div>
                    <div className="space-y-2">
                        <Label>Margem de Lucro (%)</Label>
                        <Input 
                            type="number" 
                            value={header.margemLucroPercentual} 
                            onChange={(e) => setHeader({ ...header, margemLucroPercentual: Number(e.target.value) })}
                            className="bg-zinc-950 border-zinc-800 border-orange-500/50" 
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Itens do Orçamento */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Layers className="w-5 h-5 text-orange-500" /> Itens do Projeto
                    </h2>
                    <Button variant="ghost" onClick={handleAddSKU} className="text-orange-500 hover:text-orange-400">
                        <Plus className="w-4 h-4 mr-2" /> Adicionar SKU
                    </Button>
                </div>

                {itens.length === 0 ? (
                    <div className="h-40 border-2 border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center text-zinc-500">
                        <Calculator className="w-8 h-8 mb-2 opacity-20" />
                        <p>Nenhum item adicionado. Adicione manualmente ou importe um projeto.</p>
                    </div>
                ) : (
                    itens.map((item) => (
                        <Card key={item.id} className="bg-zinc-900 border-zinc-800 overflow-hidden group">
                            <div className="flex items-center justify-between p-4 bg-zinc-950/50">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-orange-600/10 flex items-center justify-center border border-orange-600/20">
                                        <span className="text-orange-500 font-bold">#</span>
                                    </div>
                                    <div>
                                        <div className="font-semibold text-white">{item.codigo}</div>
                                        <div className="text-xs text-zinc-500">{item.nome}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <div className="text-xs text-zinc-500">Quantidade</div>
                                        <Input type="number" defaultValue={item.quantidade} className="h-8 w-20 text-center bg-zinc-900" />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                                        >
                                            {expandedItem === item.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </Button>
                                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-400" onClick={() => removeItem(item.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {expandedItem === item.id && (
                                <div className="p-4 border-t border-zinc-800 animate-in slide-in-from-top-2 duration-300">
                                    <div className="mb-4 flex justify-between items-center">
                                        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Lista Explodida (BOM)</h3>
                                        <Button size="sm" variant="outline" className="h-7 text-xs">
                                            <Plus className="w-3 h-3 mr-1" /> Adicionar Componente
                                        </Button>
                                    </div>
                                    <ListaExplodidaGrid itemId={item.id} data={item.listaExplodida} />
                                </div>
                            )}
                        </Card>
                    ))
                )}
            </div>

            {/* Rodapé Fixo (Resumo) */}
            <ResumoFinanceiro resumo={resumo} />

            {/* Modais */}
            <ImportacaoModal open={isImportModalOpen} onOpenChange={setIsImportModalOpen} />
        </div>
    );
}
