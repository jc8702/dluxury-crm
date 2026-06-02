'use client';

import React, { useState, useCallback } from 'react';
import {
  FileSpreadsheet,
  Ruler,
  Upload,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { parseCSV, parsePlanoCorteCSV } from '../../infrastructure/parsers/CSVParser';
import { parseSketchUpDAE } from '../../infrastructure/parsers/SketchUpParser';
import { Modal, Button } from '../../../../components/common';

interface ImportacaoModalProps {
  onImportar: (pecas: any[]) => void;
  onFechar: () => void;
}

export function ImportacaoModal({ onImportar, onFechar }: ImportacaoModalProps) {
  const [tipo, setTipo] = useState<'csv' | 'planocorte' | 'sketchup'>('planocorte');
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
      } else if (tipo === 'planocorte') {
        pecas = await parsePlanoCorteCSV(arquivo);
      } else {
        pecas = await parseSketchUpDAE(arquivo);
      }

      if (pecas.length === 0) {
        throw new Error('Nenhuma peÃ§a encontrada no arquivo');
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
    <Modal isOpen={true} onClose={onFechar} title="Importar PeÃ§as" size="md">
      <div className="space-y-6">
        {/* TIPO DE IMPORTAÃ‡ÃƒO */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Tipo de Arquivo
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setTipo('planocorte')}
              className={`h-11 rounded-xl flex items-center justify-center gap-2 text-xs font-bold border transition-all ${
                tipo === 'planocorte'
                  ? 'bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/20'
                  : 'bg-white/5 border-border/40 text-muted-foreground hover:bg-white/10'
              }`}
            >
              <FileText size={16} />
              Plano Corte
            </button>
            <button
              onClick={() => setTipo('csv')}
              className={`h-11 rounded-xl flex items-center justify-center gap-2 text-xs font-bold border transition-all ${
                tipo === 'csv'
                  ? 'bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/20'
                  : 'bg-white/5 border-border/40 text-muted-foreground hover:bg-white/10'
              }`}
            >
              <FileSpreadsheet size={16} />
              CSV Simples
            </button>
            <button
              onClick={() => setTipo('sketchup')}
              className={`h-11 rounded-xl flex items-center justify-center gap-2 text-xs font-bold border transition-all ${
                tipo === 'sketchup'
                  ? 'bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/20'
                  : 'bg-white/5 border-border/40 text-muted-foreground hover:bg-white/10'
              }`}
            >
              <Ruler size={16} />
              SketchUp
            </button>
          </div>
        </div>

        {/* DESCRIÃ‡ÃƒO DO FORMATO */}
        {tipo === 'planocorte' && (
          <div className="p-3 rounded-xl bg-foreground/5 border border-border/40">
            <p className="text-[9px] font-bold text-muted-foreground leading-relaxed">
              Formato: planilha com colunas DesignaÃ§Ã£o, Quantidade, Comprimento, Largura,
              Espessura. Suporta tambÃ©m Nome do Material, IdentificaÃ§Ã£o, e Bordas para fio de
              fita.
            </p>
          </div>
        )}

        {/* UPLOAD ARQUIVO */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Selecionar Arquivo
          </label>
          <div className="relative">
            <input
              type="file"
              accept={tipo === 'sketchup' ? '.dae' : '.csv,.txt'}
              onChange={handleArquivo}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="flex flex-col items-center justify-center w-full py-10 bg-foreground/5 border-2 border-dashed border-border/60 rounded-2xl cursor-pointer hover:border-primary/50 hover:bg-foreground/10 transition-all group"
            >
              <Upload
                size={32}
                className="text-muted-foreground group-hover:text-primary transition-colors mb-3"
              />
              <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground uppercase tracking-widest transition-colors">
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
            <span className="text-xs font-bold tracking-tight">{erro}</span>
          </div>
        )}

        {/* AÃ‡Ã•ES */}
        <div className="flex gap-4 pt-4 border-t border-border/40">
          <Button variant="ghost" onClick={onFechar} className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={handleImportar}
            disabled={!arquivo || processando}
            className="flex-1 flex items-center justify-center gap-2"
          >
            {processando ? (
              <>
                <Loader2 className="w-4.5 h-4.5 animate-spin" />
                Processando
              </>
            ) : (
              'Importar'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
