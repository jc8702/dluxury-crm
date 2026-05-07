import React from 'react';
import { Button } from '@/components/ui/button';
import { Send, FileDown, Save } from 'lucide-react';

export function ResumoFinanceiro({ resumo }: { resumo: any }) {
    const format = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

    return (
        <div className="fixed bottom-0 left-0 right-0 h-24 bg-zinc-950 border-t border-zinc-800 backdrop-blur-md z-50 flex items-center px-12 shadow-2xl">
            <div className="flex-1 flex gap-12">
                <div>
                    <div className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest mb-1">Custo Total de Produção</div>
                    <div className="text-xl font-bold text-white">{format(resumo.custoTotal)}</div>
                </div>
                <div>
                    <div className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest mb-1">Margem Realizada</div>
                    <div className="text-xl font-bold text-emerald-500">{format(resumo.margemReal)}</div>
                </div>
                <div className="h-10 w-px bg-zinc-800 my-auto" />
                <div>
                    <div className="text-[10px] uppercase text-orange-500 font-black tracking-widest mb-1">VALOR FINAL DE VENDA</div>
                    <div className="text-2xl font-black text-white">{format(resumo.vendaTotal)}</div>
                </div>
            </div>

            <div className="flex gap-3">
                <Button variant="outline" className="border-zinc-700">
                    <Save className="w-4 h-4 mr-2" /> Salvar Rascunho
                </Button>
                <Button variant="outline" className="border-zinc-700">
                    <FileDown className="w-4 h-4 mr-2" /> PDF do Cliente
                </Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8">
                    <Send className="w-4 h-4 mr-2" /> Enviar Orçamento
                </Button>
            </div>
        </div>
    );
}
