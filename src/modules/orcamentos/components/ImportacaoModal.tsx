import React, { useState } from 'react';
import { Modal, Button } from '@/design-system/components';
import { Upload, CheckCircle2, AlertCircle, FileDigit } from 'lucide-react';
import { api } from '@/lib/api';

export function ImportacaoModal({ isOpen, onClose, onAddItems }: { isOpen: boolean, onClose: () => void, onAddItems: (items: any[]) => Promise<void> }) {
    const [status, setStatus] = useState<'idle' | 'uploading' | 'success'>('idle');
    const [results, setResults] = useState<any[] | null>(null);
    const [isAdding, setIsAdding] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setStatus('uploading');
        
        try {
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result?.toString().split(',')[1] || '');
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const type = file.name.endsWith('.pdf') ? 'PDF' : 'SKETCHUP';
            
            const response = await api.importador.importar(type, { 
                content: base64,
                fileName: file.name
            });
            
            setResults(response);
            setStatus('success');
        } catch (err: any) {
            console.error('Erro na importação:', err);
            alert('Falha ao processar arquivo: ' + (err.message || 'Erro desconhecido'));
            setStatus('idle');
        }
    };

    const handleAdd = async () => {
        if (!results) return;
        setIsAdding(true);
        try {
            await onAddItems(results);
            onClose();
        } catch (err) {
            alert('Erro ao adicionar itens ao orçamento');
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={() => { setStatus('idle'); onClose(); }} 
            title="Importar Projeto"
            size="md"
        >
            <div className="py-8">
                {status === 'idle' && (
                    <div className="relative border-2 border-dashed border-zinc-800 rounded-2xl p-10 flex flex-col items-center justify-center gap-4 hover:border-orange-500/50 hover:bg-orange-500/5 transition-all cursor-pointer group">
                        <input 
                            type="file" 
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={handleFileChange}
                            accept=".pdf,.skp,.csv"
                        />
                        <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Upload className="w-8 h-8 text-zinc-500 group-hover:text-orange-500" />
                        </div>
                        <div className="text-center">
                            <p className="font-semibold text-white">Clique ou arraste o arquivo aqui</p>
                            <p className="text-sm text-zinc-500 mt-1">Formatos suportados: .pdf técnico ou exportação SketchUp</p>
                        </div>
                    </div>
                )}

                {status === 'uploading' && (
                    <div className="flex flex-col items-center justify-center py-10 gap-4">
                        <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
                        <p className="animate-pulse text-zinc-300">Analisando projeto com IA...</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center justify-center py-4 gap-6 animate-in zoom-in-95 duration-300">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="text-lg font-bold text-white">Importação Concluída!</h3>
                            <div className="text-sm text-zinc-400 bg-zinc-950 p-4 rounded-lg border border-zinc-800 text-left space-y-2 min-w-[300px]">
                                <div className="flex justify-between"><span>Itens detectados:</span> <span className="text-white font-bold">{results?.length || 0}</span></div>
                                <div className="flex justify-between"><span>Mapeados para o Estoque:</span> <span className="text-emerald-500 font-bold">{results?.filter((r: any) => r.match_sugerido).length || 0}</span></div>
                                <div className="flex justify-between"><span>Confiabilidade:</span> <span className="text-orange-500 font-bold">Alta</span></div>
                            </div>
                        </div>
                        <Button 
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12" 
                            onClick={handleAdd}
                            disabled={isAdding}
                        >
                            {isAdding ? 'Adicionando...' : 'Adicionar ao Orçamento'}
                        </Button>
                    </div>
                )}
            </div>

            <div className="flex items-start gap-2 p-4 bg-amber-900/10 border border-amber-900/20 rounded-xl text-[11px] text-amber-500">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>O parser utiliza extração de texto e padrões geométricos para identificar componentes. Sempre revise as quantidades finais.</p>
            </div>
        </Modal>
    );
}
