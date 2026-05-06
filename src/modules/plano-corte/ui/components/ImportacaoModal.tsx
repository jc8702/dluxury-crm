'use client';

import React, { useState, useCallback } from 'react';
import { FileSpreadsheet, Ruler, Upload, X, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import { parseCSV } from '../../infrastructure/parsers/CSVParser';
import { parseSketchUpDAE } from '../../infrastructure/parsers/SketchUpParser';

interface ImportacaoModalProps {
  onImportar: (pecas: any[]) => void;
  onFechar: () => void;
}

export function ImportacaoModal({ onImportar, onFechar }: ImportacaoModalProps) {
  const [tipo, setTipo] = useState<'csv' | 'sketchup'>('csv');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleArquivo = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArquivo(file);
      setErro(null);
    }
  }, []);

  const handleImportar = useCallback(async () => {
    if (!arquivo) return;

    setProcessando(true);
    setErro(null);

    try {
      let pecas: any[] = [];

      if (tipo === 'csv') {
        pecas = await parseCSV(arquivo);
      } else {
        pecas = await parseSketchUpDAE(arquivo);
      }

      if (pecas.length === 0) {
        throw new Error('Nenhuma peça encontrada no arquivo');
      }

      onImportar(pecas);
      onFechar();
    } catch (err: any) {
      setErro(err.message || 'Erro ao processar arquivo');
    } finally {
      setProcessando(false);
    }
  }, [arquivo, tipo, onImportar, onFechar]);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="glass-elevated w-full max-w-md overflow-hidden rounded-3xl border border-border/40 shadow-2xl animate-in zoom-in duration-300">
        
        <div className="p-8 border-b border-border/40 flex items-center justify-between bg-card/40">
          <div>
            <h2 className="text-2xl font-black text-foreground tracking-tight uppercase">IMPORTAR PEÇAS</h2>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest opacity-60">Sincronize sua engenharia</p>
          </div>
          <button 
            onClick={onFechar} 
            className="p-2 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
          >
            <X size={28} />
          </button>
        </div>

        <div className="p-8 space-y-8 bg-card/20">
          {/* TIPO DE IMPORTAÇÃO */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">TIPO DE ARQUIVO</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setTipo('csv')}
                className={`h-12 rounded-xl flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest border transition-all ${
                  tipo === 'csv' 
                    ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20' 
                    : 'bg-white/5 border-border/40 text-muted-foreground hover:bg-white/10'
                }`}
              >
                <FileSpreadsheet size={16} />
                CSV / EXCEL
              </button>
              <button
                onClick={() => setTipo('sketchup')}
                className={`h-12 rounded-xl flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest border transition-all ${
                  tipo === 'sketchup' 
                    ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20' 
                    : 'bg-white/5 border-border/40 text-muted-foreground hover:bg-white/10'
                }`}
              >
                <Ruler size={16} />
                SKETCHUP
              </button>
            </div>
          </div>

          {/* UPLOAD ARQUIVO */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">SELECIONAR ARQUIVO</label>
            <div className="relative">
              <input
                type="file"
                accept={tipo === 'csv' ? '.csv,.txt' : '.dae'}
                onChange={handleArquivo}
                className="hidden"
                id="file-upload"
              />
              <label 
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center w-full py-10 bg-white/[0.02] border-2 border-dashed border-border/40 rounded-2xl cursor-pointer hover:border-primary/50 hover:bg-white/[0.04] transition-all group"
              >
                <Upload size={32} className="text-muted-foreground group-hover:text-primary transition-colors mb-3" />
                <span className="text-xs font-black text-muted-foreground group-hover:text-foreground uppercase tracking-widest transition-colors">
                  {arquivo ? arquivo.name : 'Clique para selecionar'}
                </span>
                {arquivo && (
                  <span className="text-[10px] font-bold text-success uppercase mt-2 flex items-center gap-1">
                    <CheckCircle2 size={10} />
                    {(arquivo.size / 1024).toFixed(1)} KB
                  </span>
                )}
              </label>
            </div>
          </div>

          {/* ERRO */}
          {erro && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-3 text-destructive">
              <AlertTriangle size={18} />
              <span className="text-[11px] font-black uppercase tracking-tight">{erro}</span>
            </div>
          )}

          {/* AÇÕES */}
          <div className="flex gap-4 pt-4">
            <button
              onClick={onFechar}
              className="flex-1 h-12 rounded-xl bg-white/5 border border-border/40 text-[11px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
            >
              CANCELAR
            </button>
            <button
              onClick={handleImportar}
              disabled={!arquivo || processando}
              className="flex-1 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-hover text-primary-foreground text-[11px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {processando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  PROCESSANDO
                </>
              ) : (
                'IMPORTAR AGORA'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

