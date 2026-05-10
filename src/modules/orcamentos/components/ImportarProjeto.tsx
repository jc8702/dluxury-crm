import React, { useState } from 'react';
import { Modal, Button } from '@/design-system/components';
import { Upload, CheckCircle2, AlertCircle, FileSpreadsheet, FileText } from 'lucide-react';
import { api } from '@/lib/api';
import { PDFParser } from '../services/PDFParser';
import { ImportarCSV } from './ImportarCSV';

/**
 * ImportarProjeto - Componente Unificado
 * Suporta PDF (Promob) e CSV (SketchUp)
 */
export function ImportarProjeto({ isOpen, onClose, onAddItems, orcamentoId }: { 
    isOpen: boolean, 
    onClose: () => void, 
    onAddItems: (items: any[]) => Promise<void>,
    orcamentoId: string
}) {
    const [status, setStatus] = useState<'idle' | 'parsing' | 'uploading' | 'success'>('idle');
    const [results, setResults] = useState<any[] | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            if (file.name.endsWith('.pdf')) {
                setStatus('parsing');
                const parser = new PDFParser();
                const extractedData = await parser.extrairItensPromob(file);
                
                if (extractedData.length === 0) {
                    throw new Error('Nenhum item identificado no PDF.');
                }

                setStatus('uploading');
                const response = await api.importador.importar('PDF_JSON', { 
                    jsonData: extractedData,
                    fileName: file.name
                });
                setResults(response.data || response);
                setStatus('success');
            }
        } catch (err: any) {
            alert(err.message || 'Falha ao processar arquivo.');
            setStatus('idle');
        }
    };

    const handleConfirmarImportacao = async () => {
        if (!results) return;
        setIsAdding(true);
        try {
            console.log('[ImportarProjeto] Confirmando importação de', results.length, 'itens');
            console.log('[ImportarProjeto] Orçamento ID:', orcamentoId);

            // Chamar callback que vem do pai (importItems do hook)
            await onAddItems(results);

            // Fechar modal
            onClose();

            setStatus('idle');
            setResults(null);
            
            alert(`${results.length} itens importados com sucesso!`);
        } catch (error: any) {
            console.error('❌ [ImportarProjeto] Erro:', error);
            alert(`Erro ao importar: ${error.message}`);
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <>
            <Modal 
                isOpen={isOpen} 
                onClose={() => { setStatus('idle'); onClose(); }} 
                title="Importar Projeto"
                size="md"
            >
                <div className="py-8">
                    {(status === 'idle') && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="relative border-2 border-dashed border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:border-orange-500/50 hover:bg-orange-500/5 transition-all cursor-pointer group">
                                <input 
                                    type="file" 
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={handleFileChange}
                                    accept=".pdf"
                                />
                                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <FileText className="w-6 h-6 text-zinc-500 group-hover:text-orange-500" />
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-white text-sm">PDF (Promob)</p>
                                    <p className="text-[10px] text-zinc-500 mt-1">Extração automática de texto</p>
                                </div>
                            </div>

                            <div 
                                onClick={() => { setIsCSVModalOpen(true); onClose(); }}
                                className="border-2 border-dashed border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all cursor-pointer group"
                            >
                                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <FileSpreadsheet className="w-6 h-6 text-zinc-500 group-hover:text-emerald-500" />
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-white text-sm">CSV (SketchUp)</p>
                                    <p className="text-[10px] text-zinc-500 mt-1">CutList Bridge / Report</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {(status === 'parsing' || status === 'uploading') && (
                        <div className="flex flex-col items-center justify-center py-10 gap-4">
                            <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
                            <p className="animate-pulse text-zinc-300">
                                {status === 'parsing' ? 'Extraindo dados...' : 'Sincronizando...'}
                            </p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="flex flex-col items-center justify-center py-4 gap-6 animate-in zoom-in-95 duration-300">
                            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-lg font-bold text-white">Pronto para importar!</h3>
                                <div className="text-xs text-zinc-400 bg-zinc-950 p-4 rounded-lg border border-zinc-800 text-left space-y-2 min-w-[280px]">
                                    <div className="flex justify-between"><span>Itens:</span> <span className="text-white font-bold">{results?.length || 0}</span></div>
                                    <div className="flex justify-between"><span>Mapeados:</span> <span className="text-emerald-500 font-bold">{results?.filter((r: any) => r.match_sugerido).length || 0}</span></div>
                                </div>
                            </div>
                            <Button className="w-full bg-orange-600 h-12" onClick={handleConfirmarImportacao} disabled={isAdding}>
                                {isAdding ? 'Adicionando...' : 'Adicionar ao Orçamento'}
                            </Button>
                        </div>
                    )}
                </div>

                <div className="flex items-start gap-2 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl text-[10px] text-zinc-500">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <p>Importe listas de peças diretamente dos seus projetos 3D para economizar tempo e evitar erros de digitação.</p>
                </div>
            </Modal>

            <ImportarCSV 
                isOpen={isCSVModalOpen} 
                onClose={() => setIsCSVModalOpen(false)} 
                onAddItems={onAddItems}
                orcamentoId={orcamentoId}
            />
        </>
    );
}
