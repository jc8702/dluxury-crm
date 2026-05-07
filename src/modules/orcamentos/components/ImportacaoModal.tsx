import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileCode, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

export function ImportacaoModal({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
    const [status, setStatus] = useState<'idle' | 'uploading' | 'success'>('idle');

    const handleUpload = () => {
        setStatus('uploading');
        setTimeout(() => setStatus('success'), 2000);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] bg-zinc-900 border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle className="text-xl flex items-center gap-2">
                        <Upload className="w-5 h-5 text-orange-500" /> Importar Projeto
                    </DialogTitle>
                </DialogHeader>

                <div className="py-8">
                    {status === 'idle' && (
                        <div 
                            className="border-2 border-dashed border-zinc-800 rounded-2xl p-10 flex flex-col items-center justify-center gap-4 hover:border-orange-500/50 hover:bg-orange-500/5 transition-all cursor-pointer group"
                            onClick={handleUpload}
                        >
                            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Upload className="w-8 h-8 text-zinc-500 group-hover:text-orange-500" />
                            </div>
                            <div className="text-center">
                                <p className="font-semibold">Clique ou arraste o arquivo aqui</p>
                                <p className="text-sm text-zinc-500 mt-1">Formatos suportados: .skp (SketchUp) ou .pdf técnico</p>
                            </div>
                        </div>
                    )}

                    {status === 'uploading' && (
                        <div className="flex flex-col items-center justify-center py-10 gap-4">
                            <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
                            <p className="animate-pulse">Processando BOM e identificando SKUs...</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="flex flex-col items-center justify-center py-4 gap-6 animate-in zoom-in-95 duration-300">
                            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-lg font-bold">Importação Concluída!</h3>
                                <div className="text-sm text-zinc-400 bg-zinc-950 p-4 rounded-lg border border-zinc-800 text-left space-y-2">
                                    <div className="flex justify-between"><span>Componentes detectados:</span> <span className="text-white font-bold">42</span></div>
                                    <div className="flex justify-between"><span>SKUs Engenharia mapeados:</span> <span className="text-white font-bold">3</span></div>
                                    <div className="flex justify-between"><span>Confiabilidade do Parser:</span> <span className="text-emerald-500 font-bold">98%</span></div>
                                </div>
                            </div>
                            <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => onOpenChange(false)}>
                                Aplicar ao Orçamento
                            </Button>
                        </div>
                    )}
                </div>

                <div className="flex items-start gap-2 p-3 bg-amber-900/10 border border-amber-900/20 rounded-lg text-[11px] text-amber-500">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <p>O parser utiliza Inteligência Artificial para mapear descrições de componentes do SketchUp para seu estoque. Verifique os preços e quantidades antes de enviar.</p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
